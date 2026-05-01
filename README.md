# whoops

**See your AI app's failures live. Free forever.**

`whoops` is a Vercel AI SDK middleware that catches loops, hallucinations, cost spikes, and broken completions in your Next.js agent and surfaces them in a live dashboard. No signup wall, no Postgres to run — paste in one line and watch your first agent fail in real time.

## Status (2026-04-30)

Pre-alpha scaffold, but the local pipeline works end-to-end. You can boot it on `localhost:3030`, POST a fake trace event, and watch the detector hits land in the dashboard via SSE.

| Surface | State |
|---|---|
| `@whoops/sdk` (AI SDK middleware + OTEL exporter + PII redaction) | Builds. Not yet wired against a live `streamText` call. |
| `@whoops/detectors` (7 detectors, 30 tests) | All tests pass. Used by the ingest endpoint. |
| `@whoops/cli` (`npx whoops init` with ts-morph patcher) | Builds. Not yet end-to-end tested against a real Next.js app. |
| `apps/web` (landing + live dashboard + ingest API + SSE) | Builds and runs. End-to-end smoke test green: POST event → detector fires → SSE pushes hit → dashboard renders. |
| Vercel Marketplace listing | Not started. |
| GitHub PR comment bot | Not started. |
| Hosted infra (Neon, prod ingest, magic-link auth) | Not started; v0 uses in-memory bus. |
| Domain `whoops.dev` | Available, **not yet registered**. |
| npm `@whoops/*` scope | Available, **not yet registered**. |

## 60-second quickstart (target experience)

```bash
cd my-next-ai-app
npx @whoops/cli init
```

The CLI:

1. Detects `ai` + `next` in your `package.json`.
2. Wraps your first `streamText` / `generateText` call with `whoopsMiddleware()`.
3. Writes `WHOOPS_PROJECT_ID` to `.env.local`.
4. Opens `https://whoops.dev/live/<your-project-id>`.

Run your dev server, hit your chat route once. The first failure shows up in the dashboard within a second.

## Run it locally now

```bash
cd ~/whoops
nvm use   # or use Node 22+
pnpm install
pnpm build
pnpm start   # boots @whoops/web on http://localhost:3000
# in another terminal:
BASE=http://localhost:3000 pnpm smoke
# open http://localhost:3000/live/wh_smoketest
```

The smoke script POSTs three events (clean, loop, cost-spike) to the local ingest. The dashboard at `/live/wh_smoketest` will show all three with detector chips on the loop and cost ones.

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

PII redaction runs in the SDK before bytes leave the machine. Defaults catch emails, phones, credit-card-shaped numbers, JWTs, and OpenAI/Anthropic/AWS/Slack-shaped keys.

```ts
whoopsMiddleware({ redact: "metadata-only" });
```

`metadata-only` ships span shape, token counts, and detector verdicts with zero prompt or completion text. Use it when you cannot send any prompt content off-machine.

`WHOOPS_LOCAL=1` (planned for v0.2) will run an offline dashboard against a local SQLite store, with nothing leaving your laptop.

Hosted ingest has a 7-day rolling delete and no retention upsell.

## Repo layout

```
apps/
  web/              # Next.js 16 app: landing, /live/[projectId] dashboard, /api routes
  ingest/           # placeholder; routes live in apps/web for v0
packages/
  sdk/              # @whoops/sdk — AI SDK middleware + OTEL exporter + PII redaction
  detectors/        # @whoops/detectors — 7 detectors, 30 tests
  cli/              # @whoops/cli — `npx @whoops/cli init`
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

1. The CLI's ts-morph patcher has been written but not run against a real Next.js project. It compiles; field-testing is the next step.
2. The hallucination and derailment detectors are heuristic; expect false positives. Documented in code.
3. Storage is in-memory (`Map<projectId, RingBuffer>`). Restart the dashboard and you lose state. Production pivot to Neon Postgres + LISTEN/NOTIFY is in the plan.
4. SSE survives across the client side, but on serverless deploys (Vercel Functions) the in-memory bus only fans out within a single instance. Multi-instance fan-out needs Redis or Postgres LISTEN/NOTIFY.
5. The SDK's middleware shape mirrors `experimental_wrapLanguageModel` but has not been runtime-tested against `streamText`. Type compatibility with AI SDK v6 is asserted, not verified.

## License

MIT for `@whoops/sdk`, `@whoops/detectors`, and `@whoops/cli`. Hosted dashboard is closed source.
