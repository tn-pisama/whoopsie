# Changelog

All notable changes to the whoopsie packages. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the SDK + CLI track separate version histories.

## Upgrading from `0.0.2` → today

If you're coming from the very first published SDK (`@whoopsie/sdk@0.0.2`), three things changed materially:

1. **New canonical API: `observe()`** — replaces the two-step `wrapLanguageModel({ model, middleware: whoopsieMiddleware() })` pattern. Single call, hard to misimplement. Old API still works for advanced composition.
2. **SDK is now loud by default.** On first model call you'll see `[whoopsie] enabled · project=ws_xxx… · redact=Y` in your server logs. If no events fire within 30s, a warning surfaces with diagnostic causes. Set `WHOOPSIE_SILENT=1` to suppress.
3. **`npx @whoopsie/cli verify`** is a new subcommand. Posts a synthetic trace and confirms the round-trip — useful to prove your install works independent of whether your real chat fires yet.

Migrate:

```ts
// before (0.0.2 era):
import { wrapLanguageModel } from "ai";
import { whoopsieMiddleware } from "@whoopsie/sdk";
const model = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: whoopsieMiddleware({ redact: "metadata-only" }),
});

// after (recommended):
import { observe } from "@whoopsie/sdk";
const model = observe(openai("gpt-4o"), { redact: "metadata-only" });
```

`whoopsieMiddleware` remains exported for users composing multiple middlewares — only the recommended path changed.

---

## `@whoopsie/sdk`

### `0.5.0` — 2026-05-11

**Added**
- **`reasoning` field on `TraceEvent`.** The middleware now captures chain-of-thought / reasoning content from models that expose it (o1, Claude extended thinking, Gemini thinking). The streaming path collects `reasoning-delta` chunks; the non-streaming `wrapGenerate` path filters `result.content` for `type: "reasoning"` parts. Both go through the same `redactObject(...)` pipeline as `prompt` and `completion` — under `redact: "metadata-only"` reasoning is `undefined`; under `standard` it ships with PII regex-scrubbed.

**Recommended posture change**
- The recommended `redact` mode in the install prompt, CLI patcher, landing code sample, README, and `examples/next-chatbot-starter` is now **`standard`** (PII-scrubbed full traces). Previously these all taught `metadata-only`, which dropped prompt + completion + tool args/results to `undefined` and neutered four of seven detectors (hallucination, context, derailment, repetition can't compare text they don't have). `metadata-only` is still a supported and documented opt-in for users who genuinely cannot ship any text off-machine — the SDK behavior is unchanged, only the recommendation flipped.

**Tests**
- 4 new tests in `reasoning.test.ts`: wrapStream captures `reasoning-delta`, wrapGenerate captures `type: "reasoning"` content parts, PII patterns are scrubbed in reasoning text under `standard`, reasoning is `undefined` under `metadata-only`. New `mockReasoningModel` helper in `observe-helpers.ts` emits both shapes.

### `0.4.1` — 2026-05-10

**Added**
- **Extended serverless auto-detection** for eager mode. 0.4.0 caught Cloudflare Workers (`WebSocketPair`) and Vercel Edge (`EdgeRuntime`). 0.4.1 adds:
  - `VERCEL=1` — Vercel Functions (Node runtime). Surfaced by the v0 published-app test on 2026-05-10: chat returned HTTP 200 but no trace fired, because the Vercel Node Function froze after the response before the lazy `setInterval` flush could complete.
  - `AWS_LAMBDA_FUNCTION_NAME` — AWS Lambda.
  - `NETLIFY=true` — Netlify Functions.
  - `K_SERVICE` — Google Cloud Run.

**Tests**
- 5 new tests in `serverless-detect.test.ts`: each marker enables eager mode; lazy mode is the default when no marker is set.

### `0.4.0` — 2026-05-10

**Added**
- **Eager-flush mode** for serverless / edge runtimes. Awaits the trace POST inline with the request lifecycle so the isolate stays alive until the export completes. Default lazy-flush mode (setInterval-batched) silently drops events on Cloudflare Workers, Vercel Edge Functions, Deno Deploy, and other runtimes that freeze the isolate after the response.
- **Auto-detection** of edge runtimes via `globalThis.WebSocketPair` (Workers) and `globalThis.EdgeRuntime` (Vercel Edge). When detected, eager mode is enabled by default. Override with `observe(model, { eager: false })` to opt out, or `eager: true` to force on in environments we don't detect.

**Rationale**
- The 2026-05-10 cross-platform integration test surfaced Lovable's published apps as silently dropping traces despite correct integration code. Lovable's own AI diagnosed the root cause: their apps run on Cloudflare Workers (with `nodejs_compat`), which freezes the isolate after the response returns — the lazy `setInterval` flush in the exporter never fires, and the in-memory trace buffer is GC'd with the isolate. Eager mode fixes this category of failure for Workers, Edge, and any future serverless runtime without a background event loop.

**Tests**
- 5 new tests in `eager-flush.test.ts`: eager wrapStream awaits export inline, lazy wrapStream defers until interval, wrapGenerate path eager, auto-detect on `WebSocketPair` global, explicit `eager: false` override.

### `0.3.1` — 2026-05-10

**Added**
- Peer-dependency version guard in `observe()`. If you call `observe(model, ...)` with a model whose `specificationVersion !== "v3"` (which happens when the installed `ai` / `@ai-sdk/*` packages are older than v6 / v3), the SDK logs a directional warning naming the fix command (`npm install ai@^6 @ai-sdk/openai@^2 @ai-sdk/provider@^3`) and explaining that observe() will silently no-op until upgraded. Catches the failure mode Replit's AI diagnosed during the 2026-05-10 cross-platform test: "the peer dependency expects ai@^6 but the installed version is 4.x" — previously a silent no-op (chat works, zero traces), now a loud `console.warn` at the first observe() call.

**Tests**
- 4 new tests in `observe-version-guard.test.ts`: warns on v2 model, doesn't warn on v3 model, dedupes per provider key, respects `WHOOPSIE_SILENT=1`.

### `0.3.0` — 2026-05-10

**Added**
- Misuse guardrail: calling `whoopsieMiddleware(opts)` as a function (`whoopsieMiddleware(opts)(model)` — the v0 install typo from the 2026-05-10 cross-platform test) now throws a directional error pointing at `observe()` instead of Node's cryptic "X is not a function." The middleware object remains fully readable via property access for advanced composition.
- Exporter: HTTP 207 (partial-flush) responses from the ingest API are now surfaced via console.warn with accepted/dropped counts. Previously the exporter silently dropped failed events. In `WHOOPSIE_DEBUG=1` mode, each failed event's reason is logged individually. `WHOOPSIE_SILENT=1` suppresses everything as expected.

**Changed**
- Internal: `whoopsieMiddleware()` now returns a Proxy-wrapped object. Property access (`middleware.wrapGenerate`, `middleware.specificationVersion`, etc.) is unchanged — `wrapLanguageModel` still consumes it normally. Only the function-call misuse path is intercepted.

**Tests**
- New: `misuse-guard.test.ts` (3 tests) — verifies the typo guardrail throws + advanced composition still works
- New: `exporter-207.test.ts` (3 tests) — verifies partial-flush warning, debug-mode per-event reasons, silent-mode suppression

### `0.2.0` — 2026-05-10

**Added**
- Loud-by-default diagnostics. On first model call, logs `[whoopsie] enabled · project=ws_xxx… · redact=Y`. If no events fire within 30 seconds, logs a warning with the four most common silent-failure causes (wrap missing, file not imported, env var missing, blocked egress) plus a dashboard URL.
- `WHOOPSIE_DEBUG=1` env var — also logs every flush with HTTP status, plus normally-suppressed network errors.
- `WHOOPSIE_SILENT=1` env var — suppresses all SDK logging.

**Rationale**
- The 2026-05-10 cross-platform integration test on Lovable surfaced a "silent no-op" failure: chat returned real OpenAI completions, zero traces fired, no signal to the user that anything was wrong. The diagnostics fix all three layers of that category (missing env var, wrap not invoked, network blocked).

### `0.1.0` — 2026-05-10

**Added**
- `observe(model, opts)` — single-call helper that wraps a model with whoopsie's middleware. Replaces the two-step `wrapLanguageModel + whoopsieMiddleware` pattern as the canonical install. Old pattern still works for advanced composition cases.

**Rationale**
- AI builders on v0/Lovable/Replit were observed misimplementing the two-step pattern in different ways: typoing the call as `whoopsieMiddleware(opts)(model)`, placing the wrap in files that weren't imported, and constructing their own `wrapLanguageModel` calls. The single-call API has nothing to misinterpret.

### `0.0.2` — initial public release

---

## `@whoopsie/cli`

### `0.3.0` — 2026-05-11

**Changed**
- **Patcher emits `redact: "standard"` instead of `metadata-only`.** Pairs with `@whoopsie/sdk@0.5.0` which adds reasoning capture and re-recommends the standard posture (full prompt/completion/tool args/reasoning, PII-scrubbed). The new emit:
  ```ts
  observe(${original}, { redact: "standard" })
  ```
  `metadata-only` remains a supported mode — anyone who wants the strict posture can change the one flag after the patch. `init.test.ts` updated to assert the new emit and reject the old one.

### `0.2.0` — 2026-05-10

**Fixed**
- **CLI patcher regression**: `npx @whoopsie/cli init` was still emitting the old `wrapLanguageModel + whoopsieMiddleware()` pattern even though the install page on whoopsie.dev had been updated to mandate `observe()`. The two surfaces taught contradictory patterns to users. The patcher now emits `observe(model, { redact: "metadata-only" })` and imports `observe` from `@whoopsie/sdk`.

**Tests**
- `init.test.ts` updated to assert the new `observe()` output and reject the old pattern.

### `0.1.0` — 2026-05-10

**Added**
- `whoopsie verify` subcommand. POSTs a synthetic trace to the ingest API and polls `/api/v1/traces` for the round-trip. Exits 0 on success, 1 on any failure with specific guidance per failure category (no project id, ingest 5xx, network error, or trace didn't land within timeout). SDK-independent — works even when the user's install is broken.

### `0.0.1` — initial public release

---

## `apps/web` (`whoopsie.dev`)

`whoopsie.dev` doesn't track semver, but notable user-facing changes from 2026-05-10:

- **Privacy rewrite** — plain-language version of `/privacy` (288 → 155 lines), closes three pre-existing accuracy gaps (server-side redaction now disclosed, project-ID-as-auth note added, CONTRACTS.md stale Postgres claim fixed).
- **First-failure email alerts disabled** by default (`WHOOPSIE_ALERTS_ENABLED=1` to re-enable; Resend sub-processor not yet on `/privacy`).
- **SSE polling fallback** — `/live/<id>` now reliably surfaces new traces within ~2s on Vercel's serverless runtime. The pg_notify-based bus alone wasn't reliable across Vercel function instances.
- **Spans route durability fix** — `accepted` count now reflects only persisted events. Partial-flush failures return HTTP 207 with per-event reasons; full-batch failures return 502.
- **Install prompt rewrite** — mandates `observe()`, includes "do not" lines blocking the most common AI typos, includes a verify-after-install step, has a TanStack Start framework note for Lovable.
- **Bolt scope drop** — Bolt tab now shows an "untested" badge with explanation. Cross-platform integration test ran out of starter-quota tokens mid-build on Bolt.
- **Docs**: `docs/PLATFORM_TESTING.md`, `docs/CROSS_PLATFORM_TEST_RUNBOOK.md`, `docs/PLATFORM_REMEDIATION.md`.
- **Cross-framework SDK integration tests** under `packages/sdk/test/integration/` for Next.js, TanStack Start, Hono, and Express.
- **Inactive cross-framework CI workflow** at `.github/workflows/cross-framework.yml` — ready to activate by removing the `if: false` guards and adding three GitHub Secrets.
- **2026-05-11 launch verification pass** — Vercel deployment `dpl_4654510483` (sha `a4a3658`). Full end-to-end pass documented at [`docs/LAUNCH_READINESS_2026-05-11.md`](./docs/LAUNCH_READINESS_2026-05-11.md). Caught a critical `vercel.json` regression: workspace deps weren't building first on Vercel, so every deploy since 2026-05-11 00:42 UTC had silently failed and the CDN was serving multi-week-stale HTML. Fixed by switching the buildCommand to `pnpm --filter '@whoopsie/web...' build` (three-dot syntax builds transitive deps). Bolt's `untested` badge was lifted after a clean production trace (`Ug0bt4bfSnHD8WMIaOBml`, 18/5 tokens) landed end-to-end through SDK 0.4.1 + observe() with a valid OPENAI_API_KEY.
