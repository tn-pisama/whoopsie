# whoops

**See your AI app's failures live. Free forever.**

`whoops` is a Vercel AI SDK middleware that catches loops, hallucinations, cost spikes, and broken completions in your Next.js agent and surfaces them in a live dashboard. No signup wall, no Postgres to run, no MAST taxonomy — just paste in one line and watch your first agent fail in real time.

## 60-second quickstart

```bash
cd my-next-ai-app
npx @whoops/cli init
```

That's it. The CLI:

1. Detects `ai` + `next` in your `package.json`.
2. Wraps your first `streamText` / `generateText` call with `whoopsMiddleware()`.
3. Writes `WHOOPS_PROJECT_ID` to `.env.local`.
4. Opens https://whoops.dev/live/<your-project-id>.

Run your dev server, hit your chat route once. Your first failure shows up in the dashboard within a second.

## What gets caught (v1)

Seven detectors ship in v1, all running locally in TypeScript. No LLM-as-judge, no embeddings, no per-trace cost.

- **loop** — infinite loops, retry storms, A→B→A→B cycles, low tool diversity
- **repetition** — completion text that loops on itself
- **cost-spike** — token usage that explodes vs. baseline
- **completion-gap** — premature or runaway completions
- **hallucination-lite** — claim/context overlap (no LLM judge)
- **context-neglect** — injected context not reflected in the response
- **derailment** — tool sequence drifts from the stated task

Persona drift, multi-agent coordination, and embedding-grade grounding are out of v1. They live in [Pisama](https://pisama.ai), the enterprise sibling.

## Privacy posture

PII redaction runs in the SDK before bytes leave the machine. Defaults catch emails, phones, credit-card-shaped numbers, JWTs, and OpenAI/Anthropic/AWS/Slack-shaped keys.

```ts
whoopsMiddleware({ redact: "metadata-only" });
```

`metadata-only` ships span shape, token counts, and detector verdicts with zero prompt or completion text. Use it when you cannot send any prompt content off-machine.

Local-only mode coming in v0.2 — set `WHOOPS_LOCAL=1` and the dashboard runs at `localhost:5173` against a local SQLite store. Nothing leaves your laptop.

Trace data has a 7-day rolling delete on the hosted ingest. No retention upsell.

## Repo layout

```
apps/
  web/              # Next.js 16 dashboard at whoops.dev
  ingest/           # Vercel Functions, OTEL span ingest, SSE fan-out
packages/
  sdk/              # @whoops/sdk — AI SDK middleware
  detectors/        # @whoops/detectors — TS-native detector library
  cli/              # @whoops/cli — `npx @whoops/cli init`
  ui/               # shared shadcn components
```

## What this is not

- Not a rewrite of Pisama. Pisama keeps the 50-detector enterprise platform.
- Not multi-tenant. One anonymous project ID per `init`.
- Not paid. No metering, no seat limits, no "upgrade for retention".
- Not multi-framework. Next.js + Vercel AI SDK only in v1.
- Not a replacement for Sentry, PostHog, or Langfuse. It catches one specific class of bug: AI agent failures.

## License

MIT for `@whoops/sdk` and `@whoops/detectors`. Hosted dashboard is closed source.

## Status

Pre-alpha scaffold. Domain `whoops.dev` reserved 2026-04-30. First public install target: 2-week sprint to ship `npx @whoops/cli init` + the live dashboard.
