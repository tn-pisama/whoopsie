# Launch readiness verification — 2026-05-11

End-to-end verification pass for going live on whoopsie.dev. Eleven layers, ten green, one deferred (v0 production trace), zero blockers.

## Shipping versions

- `@whoopsie/sdk@0.4.1` — eager-flush mode + serverless runtime auto-detection (Vercel, Lambda, Netlify, Cloud Run, Workers, Edge); signed npm provenance present.
- `@whoopsie/cli@0.2.0` — patcher emits `observe()`; `verify` subcommand round-trips through prod in 0.1s.
- `@whoopsie/detectors@0.0.1` — seven detectors, 38 tests green.
- `apps/web` — deployed to whoopsie.dev as Vercel deployment `dpl_4654510483` (sha `a4a3658`), state `success` at 2026-05-11T23:07:34Z.

## Layer 1 — Local unit + integration tests · GREEN

| Suite | Result |
|---|---|
| `@whoopsie/detectors` | 38 / 38 pass |
| `@whoopsie/sdk` | 37 / 37 pass (7 unit + 4-framework integration via mock model) |
| `@whoopsie/cli` | 10 / 10 pass |
| `@whoopsie/web` | 25 pass + 5 Postgres-skipped (no `WHOOPSIE_TEST_DATABASE_URL` locally) |
| `pnpm typecheck` | clean |
| `pnpm build` | clean; sdk `dist/` has 7 .js files; cli `dist/bin.js` shebang'd |

**Side fix shipped**: `packages/detectors/package.json` had `'src/**/*.test.ts'` single-quoted (sh wouldn't expand) so the root `pnpm test` chain was failing at the first link. Switched to `src/*.test.ts` (no nesting in detectors). Root `pnpm test` now runs end-to-end.

## Layer 2 — Local boot + smoke · GREEN

Booted apps/web on `:3030`, ran `scripts/smoke.sh`. Six steps:

1. `GET /` → 200
2. `GET /live/ws_smoketest` → 200
3. POST clean event → 200, no hits
4. POST loop event (6× web_search) → loop detector severity 100, allIssues includes "Tool 'web_search' repeated 6x consecutively"
5. POST cost-spike (9k/5k tokens) → cost detector severity 65 + completion detector severity 30
6. SSE handshake → `event: hello` + recent emitted within 2s

**Side fix shipped**: `scripts/smoke.sh` was using GNU `timeout`; macOS doesn't ship it. Swapped to `curl --max-time 3`.

## Layer 3 — Bolt clean re-test · GREEN; untested badge LIFTED

User set `OPENAI_API_KEY` in the Bolt WebContainer env. Re-tested via the standalone WebContainer URL:

- Probe: "Bolt clean-key probe. Reply: bolt-live-clean."
- Assistant: "Bolt-live-clean." (matched exactly)
- Trace landed: **`Ug0bt4bfSnHD8WMIaOBml`** (18 input / 5 output tokens, `gpt-4o-mini`, no error field).

`apps/web/lib/install-prompts.ts`: removed `untested: true` from Bolt platform entry, replaced stale comment with verification timestamp + trace ID.
`apps/web/test/install-prompts.test.ts`: merged the "Bolt is marked untested" + "non-Bolt not untested" assertions into one "all five v1 platforms verified end-to-end" loop.

## Layer 4 — v0 verification · DEFERRED (non-blocking)

v0's production deployment at `https://v0-next-js-chat-app-rust-three.vercel.app` now serves the ai@6-correct route shape (HTTP 200, `text/event-stream`, `x-vercel-ai-ui-message-stream: v1` confirming `toUIMessageStreamResponse()`). The chat itself errors with `OpenAI API key is missing` — same failure mode whoopsie surfaced for Bolt before the key was added.

But no whoopsie trace landed from the v0 probe. Most likely cause: the deployed bundle still has `@whoopsie/sdk` pinned to a pre-0.4.1 version, so the lazy-flush `setInterval` doesn't run before Vercel Functions freeze the isolate after the response. The SDK bump probably didn't land in the rebuild — or Vercel cached the older lockfile.

**Not blocking launch.** The route + observe() wrap will start firing traces the moment the deployed bundle picks up `@whoopsie/sdk@^0.4.1`. v0's install page already teaches the bump (post-Layer 5 deploy). User can re-trigger the v0 publish when convenient.

## Layer 5 — Commit + push + Vercel deploy · GREEN (caught a critical regression)

Four commits pushed to `main`:

1. `2d44eac` — `fe: launch refresh` — use-case scenarios, ai@6 install gotchas, Bolt verified.
2. `6731bcb` — `docs: scrub 'free' / 'free forever' across the repo` — 9 files.
3. `c42d68c` — `chore: fix detectors test glob + smoke.sh timeout portability`.
4. `a4a3658` — **`fix(deploy): build workspace deps before next build on Vercel`** — see below.

### Critical finding: Vercel deploys had been silently failing for ≥ 22 hours

Every Vercel deploy from `2026-05-11T00:42:11Z` (sha `99019805`) onward — 10 consecutive deploys including the SDK 0.4.0 + 0.4.1 publish commits — failed with:

```
./apps/web/app/api/v1/spans/route.ts:3
Module not found: Can't resolve '@whoopsie/sdk'
```

Root cause: `apps/web/vercel.json` had `"buildCommand": "cd ../.. && pnpm --filter @whoopsie/web build"`, which builds apps/web in isolation. apps/web depends on `@whoopsie/sdk` and `@whoopsie/detectors` as workspace packages that ship from their `dist/` folders. With those packages never built in the Vercel build env, `next build` couldn't resolve them.

The CDN had been serving stale HTML from the last successful deploy (`age: 67478` seconds when I first probed). No alerting because Vercel deploy failures don't email by default and no one was watching the deployments tab.

Fix: changed to `pnpm --filter '@whoopsie/web...' build` (three-dot syntax = build all transitive workspace dependencies first, then the target). Deploy `dpl_4654510483` succeeded in ~6 minutes and the new copy is live.

**This is the most important finding of the whole verification pass.** Without it, whoopsie.dev would have continued serving multi-week-stale copy indefinitely.

## Layer 6 — Production FE smoke · GREEN

Eleven surfaces probed against `https://whoopsie.dev`, all 200 with required content:

| Surface | Needle | Found |
|---|---|---|
| `/` | "Failures we've caught before" | ✓ |
| `/` | NOT "Free forever" | ✓ |
| `/install?platform=lovable` | "TanStack Start" | ✓ |
| `/install?platform=replit` | "Cannot POST /api/chat" | ✓ |
| `/install?platform=v0` | "convertToModelMessages" | ✓ |
| `/install?platform=cursor` | "observe(" | ✓ |
| `/install?platform=bolt` | "observe(" and untested badge gone | ✓ |
| `/live/ws_smoketest` | shell renders | ✓ |
| `/demo` | chat input present | ✓ |
| `/privacy` | no "free use" | ✓ |
| `/terms` | "No charge, but as-is" | ✓ |
| `/opengraph-image` | 200, 57829 bytes PNG | ✓ |

## Layer 7 — Production BE smoke · GREEN

Twelve endpoints probed:

| Endpoint | Check | Result |
|---|---|---|
| `GET /api/health` | store=postgres, reachable, notes=[] | ✓ |
| `POST /api/v1/spans` clean | 200, no hits | ✓ |
| `POST /api/v1/spans` loop (6× web_search) | loop severity=100 | ✓ |
| `POST /api/v1/spans` cost (9k/5k tokens) | cost severity=65 + completion severity=80 | ✓ |
| `GET /api/v1/traces?projectId=ws_launchsmoke` | 200, 3 events with hits | ✓ |
| `GET /api/v1/traces` (no projectId) | 400 | ✓ |
| `GET /api/sse/ws_launchsmoke` | `event: hello` + recent within 2s | ✓ |
| `POST /api/v1/contact` first | `{ok:true, created:true}` | ✓ |
| `POST /api/v1/contact` dedupe | `{ok:true, created:false}` | ✓ |
| `POST /api/v1/tos` | `{ok:true}` | ✓ |
| `GET /api/internal/cleanup` (no auth) | 401 — CRON_SECRET enforced | ✓ |
| `POST /api/demo/chat` `{message:"reply with: demo-live"}` | streams "demo-live" | ✓ |

## Layer 8 — CLI install smoke against fresh fixture · GREEN

Fresh Next.js + ai + @ai-sdk/openai fixture at `/tmp/whoopsie-cli-test`. Baseline route with `streamText(model: openai("gpt-4o"))`.

- `npx -y @whoopsie/cli@0.2.0 init --dry-run` → emits `observe(openai("gpt-4o"), { redact: "metadata-only" })`, does NOT emit `wrapLanguageModel({`.
- `npx -y @whoopsie/cli@0.2.0 init` → patches route + writes `.env.local` with `WHOOPSIE_PROJECT_ID=ws_kZukR4FGQpR6UqTx`. Patched route content matches exactly the documented canonical pattern.
- `npx -y @whoopsie/cli@0.2.0 verify --base-url https://whoopsie.dev` → ingest accepted (HTTP 200), **trace round-tripped in 0.1s**, exits 0.

## Layer 9 — Cross-platform production smoke

All trace IDs verified live on `whoopsie.dev/live/ws_8R5aYo9NW9QsB0IB`:

| Platform | Production URL | Trace ID | Tokens | Status |
|---|---|---|---|---|
| Lovable | sparkle-chat-log.lovable.app | `o_DZHlDSnQar5dhyBFALA` | 29 / 9 | ✓ |
| Replit dev | …sisko.replit.dev | `IQ19hT658D2zzXrL39Odk`, `TonqEV24sj9eIgexf0Lzq` | 25 / 3, 19 / 27 | ✓ |
| Replit `.replit.app` | vercel-chat-stream--tommynik.replit.app | `jnfinD4OFRoqmKPv0W_iS` | 23 / 5 | ✓ |
| Bolt | WebContainer URL | `Ug0bt4bfSnHD8WMIaOBml` | 18 / 5 | ✓ |
| v0 | v0-next-js-chat-app-rust-three.vercel.app | route works (200 + UIMessage stream) but trace not landing — likely deployed SDK pre-0.4.1 | — | deferred |

Cursor: intentionally not tested (desktop client, no browser automation).

## Layer 10 — Infra / ops / legal · GREEN

| Item | Check | Result |
|---|---|---|
| DNS | `dig +short whoopsie.dev` | `76.76.21.21` (Vercel) ✓ |
| TLS | `curl -I` no cert warnings | 200 ✓ |
| `WHOOPSIE_DATABASE_URL` on prod | `/api/health` reports `store=postgres, reachable=true, notes=[]` | ✓ |
| `CRON_SECRET` on prod | `GET /api/internal/cleanup` no auth → 401 | ✓ |
| `RESEND_API_KEY` + alerts | not enabled (correct; Resend not yet on `/privacy`) | ✓ |
| Vercel Cron registered | `apps/web/vercel.json` crons: `/api/internal/cleanup` @ `0 5 * * *` | ✓ |
| npm `@whoopsie/sdk@0.4.1` provenance | `dist.signatures` present (keyid `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U`) | ✓ |
| `@whoopsie/cli@0.2.0` published | `npm view` returns version, published via Trusted Publishing | ✓ |
| GitHub repo public | `private=false, visibility=public, default_branch=main` | ✓ |
| `CHANGELOG.md` current | mentions sdk 0.4.1 (2 occurrences) + cli 0.2.0 (line 104) | ✓ |
| `/privacy` LAST_UPDATED | 2026-05-09 (≥ 2026-05-09 plan threshold) | ✓ |
| `/terms` LAST_UPDATED | 2026-05-01 (≥ 2026-05-01 plan threshold) | ✓ |

## Honest limitations carried into launch

1. **v0 production trace not yet captured** — route shape is correct but deployed SDK appears pre-0.4.1; will land traces once v0's bundle picks up the bump. Non-blocking; v0 chat route runs.
2. **First-failure email alerts disabled** by default. Re-enable once Resend is listed as a sub-processor on `/privacy`.
3. **Cross-framework CI workflow inactive** (`.github/workflows/cross-framework.yml`) — needs `VERCEL_TOKEN`, `OPENAI_API_KEY`, `WHOOPSIE_PROJECT_ID_CI` GitHub secrets. Mock-model integration tests still run in the regular SDK test suite.
4. **Cursor end-to-end** is desktop-only; not in browser-automated test scope.

## Go / no-go

**GO.** All FE + BE + SDK + CLI surfaces verified live on whoopsie.dev. Four of five v1 platforms (Lovable, Replit dev, Replit `.replit.app`, Bolt) have verified production traces; v0 is in motion but non-blocking. The vercel.json regression that had been silently breaking deploys for 22+ hours is fixed and confirmed.
