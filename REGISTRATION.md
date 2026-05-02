# Registration runbook

Status as of 2026-04-30:

- ✅ Domain `whoopsie.dev` registered via Cloudflare Registrar ($12.20/yr).
- ✅ DNS pointed at Vercel (A `@` → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`, both proxy off).
- ✅ Vercel TLS cert provisioned (cert id `cert_0xLfjbE1RecTRqiblqlOmeCD`, autoRenew, expires 90 days).
- ✅ Live at https://whoopsie.dev/ and https://www.whoopsie.dev/. Smoke-tested in prod: POST `/api/v1/spans` accepted a 5x `web_search` loop event, loop detector fired severity=50.
- ⏳ npm `@whoopsie/*` scope unclaimed — see step 1 below.
- ⏳ GitHub `whoopsie-dev` org unclaimed — see step 3 below.
- ⏳ **Neon Postgres for prod persistence** — see step 4 below. Without this, prod runs on `MemoryStore` and contact emails / traces vanish on cold start.

## 1. Claim the npm scope (free, ~1 minute)

```bash
npm whoami                    # confirm you're logged in as the right user
npm org create whoopsie       # creates the @whoopsie scope under the Free org tier
```

The Free org tier allows unlimited public packages and zero private packages, which is all `whoopsie` needs.

Verify:

```bash
curl -fsSL https://registry.npmjs.org/-/org/whoopsie | python3 -m json.tool | head
```

After the scope exists, the first publish from this repo:

```bash
nvm use && pnpm install && pnpm build
pnpm release   # runs `pnpm -r --filter ./packages/* publish --access public --no-git-checks`
```

`--access public` is required the first time scoped packages publish — npm defaults scoped to private which the Free tier disallows.

### Trusted Publishing (do once, then no NPM_TOKEN secret needed)

`.github/workflows/release.yml` is already wired for [npm Trusted Publishing via GitHub OIDC](https://docs.npmjs.com/trusted-publishers). After you push the repo to GitHub:

1. For each of the three packages (`@whoopsie/sdk`, `@whoopsie/cli`, `@whoopsie/detectors`):
   - npm UI → package → Settings → Trusted Publishers → Add a GitHub Actions publisher.
   - Repo: `whoopsie-dev/whoopsie`
   - Workflow filename: `release.yml`
   - Environment: leave blank
2. Future releases happen via `git tag v0.0.x && git push --tags` — the workflow does typecheck → test → build → publish with provenance attestation.

## 2. Point the domain at Vercel

In Vercel:

1. Project `whoopsie` → Settings → Domains → Add `whoopsie.dev` and `www.whoopsie.dev`.
2. Vercel prints two records:
   - `whoopsie.dev` → A record `76.76.21.21`
   - `www.whoopsie.dev` → CNAME `cname.vercel-dns.com`

In Cloudflare → DNS:

- Add the A record at apex (`whoopsie.dev`)
- Add the CNAME at `www`
- **Both proxy off** — grey cloud / "DNS only". Vercel handles TLS itself; the Cloudflare proxy will conflict with Vercel's certificate provisioning.

Vercel auto-provisions a Let's Encrypt cert within ~60 seconds.

`.dev` is HSTS-preloaded by Google Registry — every host gets HTTPS for free, no http allowed. Nothing extra to configure.

### API-driven setup if you'd rather not click

If you have a Cloudflare API token with `Zone:DNS:Edit` permission:

```bash
ZONE_ID=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=whoopsie.dev" | jq -r '.result[0].id')

# Apex A record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"A","name":"whoopsie.dev","content":"76.76.21.21","proxied":false,"ttl":1}'

# www CNAME
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"CNAME","name":"www","content":"cname.vercel-dns.com","proxied":false,"ttl":1}'
```

Don't paste the token into a shell history file. Use `read -s` or scope the token to the API key store.

## 3. Claim the GitHub org

`https://github.com/account/organizations/new` → Free plan, name `whoopsie-dev`.

Then push this repo:

```bash
cd ~/whoopsie
git remote add origin git@github.com:whoopsie-dev/whoopsie.git
git push -u origin main
```

After the push, in each `packages/*/package.json`, the `repository.url` field should already point at `https://github.com/whoopsie-dev/whoopsie` (the rename swept this earlier). Verify:

```bash
grep -r "repository" ~/whoopsie/packages/*/package.json
```

## 4. Wire Neon Postgres in prod (~3 minutes)

Why it matters: prod is currently on `MemoryStore`. Every cold start of the Vercel Function loses recent traces and any contact emails captured. Wiring Postgres flips both into persistent storage automatically — `apps/web/lib/store.ts` already reads `WHOOPSIE_DATABASE_URL` and switches to `PostgresStore` (with LISTEN/NOTIFY for cross-instance fan-out).

**Path A — Vercel Marketplace (recommended, free tier):**

1. https://vercel.com/marketplace/neon → Add to Project → pick the `whoopsie` project.
2. Authorize Neon (one-click if you have a Neon account, signup is free).
3. Vercel auto-injects `DATABASE_URL` (and a few others) as env vars.
4. Add an alias so our code finds it:
   ```bash
   vercel env add WHOOPSIE_DATABASE_URL production
   # paste the value of DATABASE_URL when prompted
   ```
   (or in Vercel UI: Project → Settings → Environment Variables → Add → name `WHOOPSIE_DATABASE_URL`, value = the Neon connection string from the Neon integration page.)
5. Redeploy: `vercel deploy --prod --yes`. The migration in `store.ts` auto-runs on first connection and creates `whoopsie_traces` + `whoopsie_contacts`.

**Path B — Neon directly:**

1. https://console.neon.tech → New Project → free tier.
2. Copy the connection string from the Neon dashboard (look for "pooled" connection, with `?sslmode=require`).
3. `vercel env add WHOOPSIE_DATABASE_URL production` and paste.
4. Redeploy.

**Verify after deploy:**

```bash
# fire one event
curl -s -X POST https://whoopsie.dev/api/v1/contact \
  -H "content-type: application/json" \
  -d '{"projectId":"ws_test","email":"you@yourdomain.com","source":"manual"}'

# pull the env locally and dump contacts
vercel env pull .env.local
WHOOPSIE_DATABASE_URL=$(grep WHOOPSIE_DATABASE_URL .env.local | cut -d= -f2- | tr -d '"') \
  pnpm contacts:list
```

You should see a single row with the project_id + email you posted.

## 5. Wire Resend for email alerts (~3 minutes, optional)

Without Resend, the dashboard is passive — users have to keep a tab open to see failures. With Resend, anyone who's left an email gets a one-time *"whoopsie just caught your first detector hit"* email when their first failure lands.

The code path is already shipped (`apps/web/lib/alerts.ts`, integrated in `/api/v1/spans`). It's gated on `RESEND_API_KEY`. If the env var isn't set, alert sends are a clean no-op — no errors, no test failures.

**Setup (Resend free tier — 3,000 emails/month):**

1. https://resend.com/signup → free tier.
2. **Add and verify `whoopsie.dev` as a sending domain.** Resend will give you 3 DNS records (TXT for SPF, TXT for DKIM, MX for return path). Add them in Cloudflare → DNS, all proxy off / DNS only. Verification takes 5–60s.
3. Generate an API key: Resend → API Keys → Create. Scope: full access (or "send-only" if available). Copy the value.
4. Set the env var on Vercel:
   ```bash
   vercel env add RESEND_API_KEY production
   # paste the key when prompted
   ```
5. Optional: customise `WHOOPSIE_FROM_EMAIL` (default `alerts@whoopsie.dev`) and `WHOOPSIE_REPLY_TO` (default `hi@whoopsie.dev`) the same way.
6. Redeploy. The alert pipeline picks up the new env var on next cold start.

**Verify after deploy:**

```bash
# Capture an email against a test project
PROJ="ws_alerttest_$(date +%s)"
curl -s -X POST https://whoopsie.dev/api/v1/contact \
  -H "content-type: application/json" \
  -d "{\"projectId\":\"$PROJ\",\"email\":\"you@yourdomain.com\",\"source\":\"manual\"}"

# Fire a loop event for the same project
NOW=$(python3 -c 'import time; print(int(time.time()*1000))')
curl -s -X POST https://whoopsie.dev/api/v1/spans \
  -H "content-type: application/json" \
  -H "x-whoopsie-project-id: $PROJ" \
  -d "{\"events\":[{\"projectId\":\"$PROJ\",\"traceId\":\"a1\",\"spanId\":\"a1\",\"startTime\":$NOW,\"endTime\":$((NOW+200)),\"model\":\"gpt-4o\",\"toolCalls\":[$(for i in $(seq 1 6); do printf '{\"toolCallId\":\"x%d\",\"toolName\":\"web_search\",\"startTime\":%d}' $i $NOW; [ $i -lt 6 ] && printf ','; done)],\"finishReason\":\"tool_calls\",\"metadata\":{}}]}"

# Check your inbox. Subject should match: "whoopsie: stuck in a loop on gpt-4o"
```

The alert table dedupes per `(project_id, email, "first_failure")`, so even if the same project keeps failing you only get one email. Reply STOP and we delete you.

## 6. Subdomains for later

- `ingest.whoopsie.dev` — when we split ingest off the main app
- `api.whoopsie.dev` — public API
- `docs.whoopsie.dev` — docs site

Skip these until needed.

## 5. Social handles

These don't matter for the product but go fast:

- Twitter/X: `@whoopsiedev`
- Bluesky: `@whoopsie.dev` (the domain itself doubles as the handle once you set the DNS verification record)

## Cost summary

| Item | One-time | Recurring |
|---|---|---|
| `whoopsie.dev` (Cloudflare Registrar) | $12.20 ✅ paid | $12.20/yr |
| `@whoopsie` npm scope | $0 | $0 (free tier, public only) |
| `whoopsie-dev` GitHub org | $0 | $0 (free plan) |
| Cloudflare DNS | $0 | $0 |
| Vercel project | $0 | $0 (Hobby tier sufficient until first paying customer) |

Total recurring: $12.20/yr.

## Lesson learned

I originally used `dig` to check domain availability and reported `whoops.dev` as available because it had no NS / no A records. That was wrong — a domain can be registered without any DNS records published. Someone registered `whoops.dev` between session start and the moment we tried to buy it. The right check is RDAP against the registry's authoritative endpoint:

```bash
curl -sI https://pubapi.registry.google/rdap/domain/<name>.dev
# 200 = registered
# 404 = available
```

This is reflected in CLAUDE.md.
