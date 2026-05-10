# whoopsie

**See your AI app's failures live. Free forever.**

`whoopsie` is a Vercel AI SDK middleware that catches loops, hallucinations, cost spikes, and broken completions in your Next.js agent and surfaces them in a live dashboard. No signup wall, no Postgres to run — paste in one line and watch your first agent fail in real time.

## Status (2026-04-30)

Pre-alpha. Local pipeline works end-to-end. 53 tests pass: 38 detectors + 5 SDK runtime + 4 CLI patcher + 6 storage (memory and Postgres).

| Surface | State |
|---|---|
| `@whoopsie/sdk` (AI SDK middleware + OTEL exporter + PII redaction) | Builds. **Runtime-tested** against AI SDK v6 `streamText` and `generateText` via `MockLanguageModelV3`. |
| `@whoopsie/detectors` (7 detectors, 38 tests) | All tests pass. Hallucination + derailment hardened with regression tests against realistic vibe-coder prompts. |
| `@whoopsie/cli` (`npx whoopsie init` with ts-morph patcher) | **Field-tested** against a tmp Next.js + AI SDK fixture. Idempotent, dry-run safe, reuses existing project IDs. |
| `apps/web` (landing + live dashboard + ingest API + SSE) | Builds and runs. End-to-end smoke green on both backends. |
| Storage | `MemoryStore` (default) or `PostgresStore` with LISTEN/NOTIFY (set `WHOOPSIE_DATABASE_URL`). Both backends covered by integration tests. |
| GitHub Actions release workflow | `.github/workflows/release.yml` ready; uses npm Trusted Publishing (no token secret), runs on `v*` tags. |
| Vercel Marketplace listing | Not started. |
| GitHub PR comment bot | Not started. |
| Domain `whoopsie.dev` | Available. **User-action only** — see [REGISTRATION.md](./REGISTRATION.md). |
| npm `@whoopsie/*` scope | Available. **User-action only** — see [REGISTRATION.md](./REGISTRATION.md). |

## 60-second quickstart (target experience)

```bash
cd my-next-ai-app
npx @whoopsie/cli init
```

The CLI:

1. Detects `ai` + `next` in your `package.json`.
2. Wraps your first `streamText` / `generateText` call with `observe()`.
3. Writes `WHOOPSIE_PROJECT_ID` to `.env.local`.
4. Opens `https://whoopsie.dev/live/<your-project-id>`.

Run your dev server, hit your chat route once. The first failure shows up in the dashboard within a second.

## Run it locally now

```bash
cd ~/whoopsie
nvm use   # or use Node 22+
pnpm install
pnpm test    # runs the full suite (53 tests, ~3s)
pnpm build
pnpm start   # boots @whoopsie/web on http://localhost:3000
# in another terminal:
BASE=http://localhost:3000 pnpm smoke
# open http://localhost:3000/live/ws_smoketest
```

The smoke script POSTs three events (clean, loop, cost-spike) to the local ingest. The dashboard at `/live/ws_smoketest` will show all three with detector chips on the loop and cost ones.

### With Postgres (production-like setup)

```bash
createdb whoopsie_test    # or use any reachable Postgres
WHOOPSIE_DATABASE_URL="postgres://localhost:5432/whoopsie_test" pnpm start
```

The store auto-creates `whoopsie_traces` and a partial index on first run. SSE fan-out goes through Postgres LISTEN/NOTIFY so multi-instance deploys work without an in-process bus.

To run the integration tests against Postgres:

```bash
WHOOPSIE_TEST_DATABASE_URL="postgres://localhost:5432/whoopsie_test" pnpm test
```

## What gets caught (v1)

Seven detectors ship in v1, all running locally in TypeScript. No LLM-as-judge, no embeddings, no per-trace cost.

- **loop** — infinite loops, retry storms, A→B→A→B cycles, low tool diversity
- **repetition** — completion text that loops on itself (line-level + n-gram)
- **cost** — token / cost spikes ($0.50 or 8k tokens default), missing model attribution
- **completion** — premature stops on questions, runaway 4k+ token outputs
- **hallucination** — overlap-only against a `Sources:` block in the prompt (heuristic, low precision; honest about it)
- **context** — completions that ignore all key tokens from a `Context:` / `<context>` block
- **derailment** — tool sequences that don't align with the prompt's task verbs

Persona drift, multi-agent coordination, and embedding-grade grounding are out of v1. Those live in [Pisama](https://github.com/tn-pisama/pisama), the enterprise sibling product.

## Privacy posture

PII redaction runs in the SDK before bytes leave the machine, and again on the ingest server before anything is written to Postgres. Defaults catch emails, phones, SSNs, credit-card-shaped numbers, JWTs, and OpenAI/Anthropic/AWS/GitHub/Slack-shaped keys.

```ts
observe(model, { redact: "metadata-only" });
```

`metadata-only` ships span shape, token counts, and detector verdicts with zero prompt or completion text. Use it when you cannot send any prompt content off-machine.

Hosted ingest has a 7-day rolling delete and no retention upsell.

## Repo layout

```
apps/
  web/              # Next.js 16 app: landing, /live/[projectId] dashboard, /api routes
  ingest/           # placeholder; routes live in apps/web for v0
packages/
  sdk/              # @whoopsie/sdk — AI SDK middleware + OTEL exporter + PII redaction
  detectors/        # @whoopsie/detectors — 7 detectors, 30 tests
  cli/              # @whoopsie/cli — `npx @whoopsie/cli init`
  ui/               # placeholder for shared shadcn components
scripts/
  smoke.sh          # end-to-end smoke test (POST + SSE handshake)
```

## What this is not

- Not a rewrite of Pisama. Pisama keeps the enterprise platform with its 50+ detectors, multi-tenancy, and FastAPI backend.
- Not multi-tenant. One anonymous project ID per `init`. No accounts in v0.
- Not paid. No metering, no seat limits, no "upgrade for retention".
- Not multi-framework. Next.js + Vercel AI SDK only in v1.
- Not a Sentry / PostHog / Langfuse replacement. It catches one specific class of bug: AI agent failures.

## Honest known gaps

1. **Domain `whoopsie.dev` and npm `@whoopsie/*` scope are unregistered.** User-action only — the agent cannot register on your behalf. Walkthrough in [REGISTRATION.md](./REGISTRATION.md). Total cost about $13/year for the domain; npm scope and GitHub org are free.
2. **Hallucination and derailment are still heuristic.** Hardened with stoplists and regression tests, but they will never match an LLM-judge for precision. Honest about this in code comments and detector descriptions.
3. **No magic-link auth, no multi-tenancy, no rate limiting.** Anyone with a project ID can read its stream. Acceptable for v0 / HN-launch trust posture; magic-link comes in v0.2.
4. **No Vercel Marketplace listing yet.** That's the wedge per the plan, but it requires the npm scope to be claimed first.
5. **GitHub PR comment bot not built.** Post-v1 distribution surface, see plan.

## Releasing

Tag and push:

```bash
git tag v0.0.1
git push origin v0.0.1
```

`.github/workflows/release.yml` runs typecheck → test → build → `pnpm -r publish --access public --provenance`. Uses npm [Trusted Publishing via OIDC](https://docs.npmjs.com/trusted-publishers) — no `NPM_TOKEN` secret to manage. Configure each package's trusted publisher in npm's UI before the first tag push.

## License

MIT for `@whoopsie/sdk`, `@whoopsie/detectors`, and `@whoopsie/cli`. Hosted dashboard is closed source.
