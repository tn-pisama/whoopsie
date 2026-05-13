# Cross-Platform Install Testing

Manual checklist for verifying that the install prompts on `whoopsie.dev/install` actually produce working integrations on each AI builder. Part of the four-layer drift-detection plan (`docs/` plans, 2026-05-13).

## When to run

| Trigger | Cadence | Owner |
|---|---|---|
| Before every SDK / CLI release | once, per release | release engineer |
| Quarterly drift check | every 90 days (next: **2026-08-13**) | maintainer, calendar reminder |
| Ad hoc — Layer 2 alarm fired | within 48h | whoever the digest emailed |
| Ad hoc — Layer 5 changelog watcher flagged a platform | within 1 week | maintainer |

The quarterly check exists because Layer 2's passive telemetry (the `/api/internal/platform-health` cron) catches *volume / error-rate* drift, but not *structural* drift (e.g. the platform's AI now emits a wrap that compiles + traces but instruments a dead model path). Only a human pasting the prompt into the platform's UI catches that.

When the Layer 2 cron sends an alarm digest, the recipient's first action is to run the affected platform's section of this checklist. The digest mail's body links here.

## Why manual

AI builders change behavior weekly. Scripted regression CI against their UIs is flaky and expensive. A 30-minute manual pass per platform is the cheapest way to catch "the AI started writing the wrap wrong again."

## What "working" means

Per platform:

1. **AI accepts** — no low-adoption refusal, no "I'd rather recommend Langfuse" deflection
2. **AI uses `observe()`** — generated route file imports `{ observe } from "@whoopsie/sdk"` and wraps the model with `observe(model, opts)`. Does *not* import `wrapLanguageModel` from `"ai"`.
3. **Env var reaches runtime** — `WHOOPSIE_PROJECT_ID` is visible to the server-side route handler
4. **`whoopsie verify` exits 0** — round-trip via `npx @whoopsie/cli verify` works
5. **Real chat fires a trace** — sending a chat message lands a trace on `/live/<id>` within ~2s
6. **SDK diagnostic logs appear** — server logs show `[whoopsie] enabled · project=ws_xxxxxxxx…`

## Per-platform steps

For each platform listed below, do the full flow. Record results in the log table at the bottom.

### v0 (https://v0.app)

1. Log in. Create a new project: `What do you want to create?` → paste the v0 platform prompt from `https://whoopsie.dev/install?platform=v0`.
2. Wait for v0 to install deps and create the chat page. v0 will prompt for `WHOOPSIE_PROJECT_ID` — paste the value from the install page.
3. v0 also needs `OPENAI_API_KEY`. Set it in v0's Vars panel.
4. Open the preview in its own tab (top-right external-link icon). Open the preview's `/api/chat/route.ts` from the file tree and confirm: imports `observe`, no `wrapLanguageModel`, model wrapped with `observe(...)`.
5. Send a chat message. Assistant replies?
6. Check `https://whoopsie.dev/live/<project-id>` — does the trace appear within ~5s?
7. Open the preview's server logs (v0 → bottom panel terminal). Does `[whoopsie] enabled` appear?

### Lovable (https://lovable.dev)

**Note**: Lovable runs TanStack Start, not Next.js. The Lovable-specific prompt includes a framework note that should steer the AI toward `src/routes/api/chat.ts` instead of `app/api/chat/route.ts`.

1. Log in. From the home `Build something Lovable` chat, paste the Lovable platform prompt.
2. Wait for Lovable to scaffold the project. Lovable will request `OPENAI_API_KEY` and `WHOOPSIE_PROJECT_ID` in its Secrets UI — fill both.
3. Open the preview in its own tab.
4. **Critical check**: navigate to the project's code view. Find the file Lovable wrote the wrap into. Confirm it uses `observe()` *and* that the file is actually the one being executed at the chat endpoint (not a dead file sitting unimported in `src/`).
5. Send a chat message in the preview. Real OpenAI response?
6. Check `/live/<project-id>` — trace landed?
7. **If trace didn't land**: Lovable's runtime logs are at the project's deploy view. Look for `[whoopsie] enabled` or the 30s `No events fired` warning.

### Replit (https://replit.com)

1. Log in. New project: `Create something new` → paste the Replit platform prompt.
2. Replit Agent should generate a plan. Confirm and let it execute.
3. Replit asks for `OPENAI_API_KEY` via the Secrets pane (padlock icon). Fill it. Also confirm `WHOOPSIE_PROJECT_ID` is set there.
4. Wait for Replit to finish the workflow. The preview should auto-load.
5. Inspect `app/api/chat/route.ts` (or wherever Replit Agent placed the route). Confirm `observe()` is used.
6. Open the preview in its own tab. Send a chat. Does Replit's server respond?
7. Replit's server logs are visible in the console pane. Look for `[whoopsie] enabled`.
8. Check `/live/<project-id>`.

### Bolt (currently marked **untested**)

Skipped from regular rotation. If/when Bolt is brought back into scope:

1. Bolt's starter quota paywalls mid-build. Need a paid Bolt account to run the full test.
2. Bolt's WebContainer outbound egress is unverified. If `whoopsie verify` fails with a network error, that's the likely cause.

## Results log

Update this table each run. Commit alongside any prompt or SDK changes that triggered the test.

| Date | Tester | SHA | SDK | CLI | Platform | AI accepted | observe() used | Env var | verify | Trace landed | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-05-10 | 0.2.0 | 0.1.0 | v0 | ✓ (with 0.1.0 prompt) | ✗ (typo'd wrap) | ✓ | n/a | ✗ HTTP 500 | Pre-0.1.0 SDK test. Fix shipped after; re-test pending. |
| 2026-05-10 | 0.0.2 | n/a | Lovable | ✓ | unverified | ✓ | n/a | ✗ silent | Chat returned real completion; zero traces. TanStack Start framework. Lovable-specific prompt added in 0.2.0 release. |
| 2026-05-10 | 0.0.2 | n/a | Replit | ✓ planning | unverified | partial | n/a | ✗ hang | Chat never returned a response. Root cause undiagnosed. |
| 2026-05-10 | 0.0.2 | n/a | Bolt | ✓ | partial | n/a | n/a | ✗ paywall | Stopped at token paywall mid-build. |
| 2026-05-10 | 0.3.0 | 0.2.0 | Lovable | **✓** (migration from old wrap) | **✓** (`observe(openai("gpt-4o-mini"), { redact: "metadata-only" })` at correct streamText line in `src/routes/api/chat.ts`) | ✓ (per Lovable AI) | not run (no terminal) | **✗ silent (no trace)** | **Critical finding:** even with perfect AI execution + correct code in the correct file, traces don't fire on Lovable. Chat returns real OpenAI completion ("2 + 2 equals 4."). Same silent no-op as first test. Suggests env var not propagating to runtime OR `ai` version mismatch OR Lovable preview egress blocked. Needs server-log access (UI doesn't expose them) or runtime probe to isolate. |
| 2026-05-10 | 0.3.0 | 0.2.0 | v0 | **✓** (migration from typo'd wrap) | **✓** (`Line 11: Changed whoopsieMiddleware({...})(openai(...)) to observe(openai("gpt-4o-mini"), { redact: "metadata-only" })`) | ✓ (already set in Vars) | not run | not tested | v0 hit "Maximum context limit reached" before testing. Sandbox subsequently died (410). Migration code is correct; runtime untested. **Sub-finding:** install prompt may be too long for v0's starter-quota context window. |
| 2026-05-10 | 0.3.0 | 0.2.0 | Replit | **✓** (Replit AI proactively diagnosed `ai@^6` peer-dep mismatch in its earlier response — "if whoopsieMiddleware throws at runtime, that's the likely cause") | pending build | ✓ | not run | not tested | **Major finding:** Replit AI identified the root cause of the original "hang" was a peer dependency mismatch (`ai@4.x` installed, `@whoopsie/sdk` needs `ai@^6`). This explains the silent failures and is fixable in our SDK by checking the `ai` version at `observe()` construction. Workflow rebuild took longer than the test window. |

## What to do if a platform regresses

1. Capture the AI's response verbatim (paste into a fresh GitHub issue).
2. Inspect the generated route file. Is `observe()` actually used? Is the wrap in a file that's imported by the chat route?
3. Check server logs for `[whoopsie] enabled`. If absent → middleware not loaded (env var missing, file not imported). If present → middleware loaded but events not flushing (network egress, exporter error). Set `WHOOPSIE_DEBUG=1` for more detail.
4. If the AI is consistently misimplementing the wrap, update `apps/web/lib/install-prompts.ts` with sharper "do not" language. Re-test.
5. If the framework's `streamText` middleware integration changed upstream (AI SDK release), update `packages/sdk/` and the cross-framework integration tests.

## Cadence

See the "When to run" table at the top of this doc. The four triggers (release, quarterly, Layer-2 alarm, Layer-5 changelog flag) compose into the union "regular basis" that keeps installs working across platform drift.
