# Registration runbook

Both `whoops.dev` and the `@whoops/*` npm scope are unregistered as of 2026-04-30. This file walks through claiming them. The agent cannot do this for you — domain registrars and npm both require human auth.

## Verify availability before paying

```bash
# Domain — should print no NS / no A record. If it has NS records, someone took it.
dig +short whoops.dev NS @1.1.1.1
dig +short whoops.dev A @1.1.1.1

# npm scope — 404 means open
npm view @whoops/sdk
npm view @whoops/cli
npm view @whoops/detectors
```

If any of those resolve to a registered name, fall through to one of the alternates I checked: `flake.dev`, `yikes.dev`, `derp.dev`, `borks.dev`, `borkly.dev`, `whoopsbot.dev`. None had a public-facing site at the time of writing.

## Domain: whoops.dev

The `.dev` TLD is run by Google Registry. It is HSTS-preloaded — every host gets HTTPS for free, no http allowed.

**Recommended registrar: Cloudflare Registrar** (at-cost, no markup, free WHOIS privacy, DNSSEC included).

1. Sign in at https://dash.cloudflare.com → Domain Registration → Register Domains.
2. Search `whoops.dev`. Cost is the wholesale `.dev` price (currently around $13/year).
3. Add to cart, complete payment.
4. Cloudflare automatically uses Cloudflare DNS for the new domain.

**Fallback registrar: Namecheap** if you already have an account there (`https://www.namecheap.com/domains/registration/results/?domain=whoops.dev`). Pay the markup.

### Pointing at Vercel

After registering, in Vercel:

1. Project → Settings → Domains → Add `whoops.dev` and `www.whoops.dev`.
2. Vercel will print two records:
   - `whoops.dev` → A record `76.76.21.21`
   - `www.whoops.dev` → CNAME `cname.vercel-dns.com`
3. In Cloudflare DNS:
   - Add the A record for the apex
   - Add the CNAME for `www`
   - Both **proxy off** ("DNS only" / grey cloud) — Vercel handles TLS itself, Cloudflare proxy will conflict with their certificate provisioning.

Vercel auto-provisions a TLS cert via Let's Encrypt within ~60 seconds.

### Catch-all subdomains we'll likely want later

- `ingest.whoops.dev` — when we split ingest off the main app
- `api.whoops.dev` — public API
- `docs.whoops.dev` — docs site

Skip these until we need them.

## npm: @whoops scope

```bash
# 1. Make sure you're logged in as the right user.
npm whoami

# 2. Create the org. The org NAME is the scope, lowercase.
npm org create whoops

# That's it. The scope is now reserved. No payment needed for public packages.
```

The org membership defaults to "Free" tier, which allows unlimited public packages but no private packages. That's all we need.

### First publish

Each package's `package.json` already has `"name": "@whoops/<thing>"` and `"license": "MIT"`. Publish all three:

```bash
nvm use   # Node 22
pnpm install
pnpm build
pnpm release
```

The `release` script at the root `package.json` runs `pnpm -r publish --access public --no-git-checks`. The `--access public` flag is **required** the first time — npm defaults scoped packages to private which the free org tier disallows.

### Trusted Publishing (recommended once you ship)

Once the packages exist on npm, set up [Trusted Publishing via GitHub OIDC](https://docs.npmjs.com/trusted-publishers) so future releases don't need an npm token:

1. Push the repo to `github.com/whoops-dev/whoops`.
2. In npm: each package → Settings → Trusted Publishers → Add a GitHub Actions publisher.
3. Add a `.github/workflows/release.yml` that runs on tag push.

(I haven't written that workflow yet — it's a follow-on.)

## GitHub org

Claim `https://github.com/whoops-dev` (the obvious org name) before someone else does.

1. https://github.com/account/organizations/new → Free plan.
2. Move the repo from the user's personal namespace to the org.
3. Update the repo URL in:
   - `package.json` `repository.url` in each `packages/*` and `apps/*`
   - `README.md` clone instructions
   - The Vercel project's connected repo

## Social handles to grab early

These don't matter for the product but go fast:

- Twitter/X: `@whoopsdev`
- Bluesky: `@whoops.dev` (the domain doubles as the handle once you set the DNS verification record)
- GitHub: `whoops-dev` (org)

## Cost summary

| Item | One-time | Recurring |
|---|---|---|
| `whoops.dev` (Cloudflare Registrar) | ~$13 | ~$13/yr |
| `@whoops` npm scope | $0 | $0 (free tier, public only) |
| `whoops-dev` GitHub org | $0 | $0 (free plan) |
| Cloudflare DNS | $0 | $0 |
| Vercel project | $0 | $0 (Hobby tier sufficient until first paying customer) |

Total to claim everything: about $13.

## After registration

Re-run the check and update `README.md`:

```bash
# Confirm registered
dig +short whoops.dev NS @1.1.1.1   # expect Cloudflare nameservers
npm view @whoops/sdk version         # expect 0.0.1 once you've published

# Edit README — remove the "domain whoops.dev and npm @whoops scope are still
# unregistered" line from the honest gaps section.
```
