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
- **Bolt scope drop** — Bolt tab now shows an "untested" badge with explanation. Cross-platform integration test ran out of free-tier tokens mid-build on Bolt.
- **Docs**: `docs/PLATFORM_TESTING.md`, `docs/CROSS_PLATFORM_TEST_RUNBOOK.md`, `docs/PLATFORM_REMEDIATION.md`.
- **Cross-framework SDK integration tests** under `packages/sdk/test/integration/` for Next.js, TanStack Start, Hono, and Express.
- **Inactive cross-framework CI workflow** at `.github/workflows/cross-framework.yml` — ready to activate by removing the `if: false` guards and adding three GitHub Secrets.
