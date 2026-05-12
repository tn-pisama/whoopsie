# Cross-Platform Integration Test Runbook

The script for a fresh-session Playwright run that verifies whoopsie's install path works on Lovable, Replit, Bolt, and v0.

This runbook exists because the previous test (2026-05-10) ran *before* most of the SDK + CLI + install-prompt fixes shipped. Re-running it converts "likely fixed" status to "confirmed working."

## Why a new session

The previous session's transcript has a leaked OpenAI key in it. The harness blocks automated browser actions for the rest of the conversation because of that. A fresh session is required.

## Pre-session prep (user, manual)

1. **In Chrome, log into all three platforms**:
   - https://v0.app — Sign in with Google or email
   - https://lovable.dev — Log in
   - https://replit.com — Log in
2. **Set `OPENAI_API_KEY` in each platform's secrets UI** (do this yourself, not via the agent):
   - v0: Vars panel → add `OPENAI_API_KEY`
   - Lovable: Cloud tab → Secrets → add `OPENAI_API_KEY`
   - Replit: Secrets pane (padlock icon) → add `OPENAI_API_KEY`
3. **Note current `@whoopsie/sdk` + `@whoopsie/cli` versions on npm** (check `package.json` or `npm view @whoopsie/sdk version`):
   - SDK: 0.3.0 (adds misuse guardrail + exporter 207 handling on top of 0.2.0's diagnostics)
   - CLI: 0.2.0 (patcher now emits `observe()` — earlier 0.1.0 still emitted the old pattern, which was the source of the test-vs-install-page contradiction)
4. **Get a fresh project ID**:
   - Visit https://whoopsie.dev/install in your browser. Note the `ws_xxx` ID in the URL.
   - That's the ID for this test session. Use the same one for all four platforms.

## Session kickoff

In a fresh session, paste this:

> Run the cross-platform integration test per `docs/CROSS_PLATFORM_TEST_RUNBOOK.md`. Project ID for this run: `ws_<paste-from-install-page>`. I've already set `OPENAI_API_KEY` in Lovable/Replit/Bolt/v0 secrets. Use Claude in Chrome MCP — my current Chrome session has all four platforms logged in. Test platforms in this order: Lovable, Replit, Bolt, v0. Report results in the format described in the runbook.

## Per-platform test flow

For each platform (v0, Lovable, Replit) in order, the agent should:

### 1. Navigate

Open the platform's home and start a new project:
- v0: `https://v0.app` → click chat input
- Lovable: `https://lovable.dev` → click chat input
- Replit: `https://replit.com/~` → "Create something new"

### 2. Paste the install prompt

The prompt comes from `https://whoopsie.dev/install?platform=<slug>&id=<projectId>`. Capture the exact prompt text the page renders for that platform.

Paste it into the platform's chat. Press Enter / Submit.

### 3. Watch the AI work

The AI will spend 1–10 minutes thinking and writing code. During this:
- Capture the AI's response verbatim. Especially: did it refuse? Did it use `observe()`? Did it ask for env vars?
- If the platform asks for `OPENAI_API_KEY` or `WHOOPSIE_PROJECT_ID` in a secrets UI, note this (you've already set these manually before the session).
- If the platform's starter-quota credits run out, capture exactly when and at what step.

### 4. Inspect the generated route file

This is the critical assertion. Open the platform's code view. Find the file the AI wrote the wrap into. Should be:
- v0: `app/api/chat/route.ts`
- Lovable: `src/routes/api/chat.ts` (TanStack Start convention — the new install prompt mentions this)
- Replit: Variable. Could be `app/api/chat/route.ts` if Replit Agent chose Next.js, or `src/index.ts` for Express. Whatever it chose, that file should contain the wrap.

**Pass criteria for the wrap**:
- Imports `{ observe }` from `"@whoopsie/sdk"`
- Calls `observe(<model-expr>, { redact: "metadata-only" })` somewhere
- The wrapped model is the one being passed to `streamText` or `generateText`
- Does NOT import `wrapLanguageModel` from `"ai"`
- Does NOT call `whoopsieMiddleware(...)` directly

Capture the file contents verbatim. Diff against the wrong-but-plausible patterns:
- `whoopsieMiddleware(opts)(model)` — the v0 typo from last run
- `wrapLanguageModel({ ... })` somewhere — means AI ignored the prompt
- The wrap exists in a file that's never imported by the chat route — means the AI did work but in the wrong place

### 5. Trigger a chat in preview

Open the platform's preview/deploy URL. Send a chat message: "Say hi in one short sentence."

### 6. Check `/live/<projectId>` for trace landing

In a new tab, open `https://whoopsie.dev/live/<projectId>`. The trace should appear within ~5 seconds. Pass if it appears, fail if not.

### 7. Check server logs for SDK diagnostics

The new SDK 0.3.0 logs (these were added in 0.2.0; 0.3.0 also adds partial-flush warnings):
- `[whoopsie] enabled · project=ws_xxx… · redact=metadata-only` — proves SDK is loaded with the right env var
- After 30s without events: `[whoopsie] No events fired in 30s. Common causes…` — proves the wrap isn't actually getting invoked

How to find platform server logs:
- v0: bottom panel terminal in the IDE view
- Lovable: project deploy view or its Logs tab
- Replit: console pane in the workspace

Capture which logs appear. Absent `[whoopsie] enabled` log means env var isn't reaching runtime. Present `No events fired` warning means the wrap isn't on the right code path.

### 8. Run `npx @whoopsie/cli verify` if a terminal is available

- v0: no obvious terminal — skip
- Lovable: no obvious terminal — skip
- Replit: console pane has a terminal. Run `npx -y @whoopsie/cli@0.2.0 verify`. Capture output.

If the platform offers a terminal, this is the cleanest test: `verify` does a synthetic round-trip and confirms ingestion works independent of the user's code.

## What to record per platform

Update the results log in `docs/PLATFORM_TESTING.md` with:

| Column | Value |
|---|---|
| Date | Today |
| SDK | `npm view @whoopsie/sdk version` |
| CLI | `npm view @whoopsie/cli version` |
| Platform | v0 / Lovable / Replit |
| AI accepted | ✓ / ✗ / partial |
| `observe()` used | ✓ / ✗ — quote the exact line |
| Env var | ✓ / ✗ — was `[whoopsie] enabled` in logs? |
| `verify` | exit code, or `n/a` if no terminal |
| Trace landed | ✓ / ✗ — time to first trace |
| Notes | Anything unusual: paywalls, AI quirks, specific error text |

## Expected results (going in)

Based on what we know post-fixes (commit `a20bbf1`):

- **v0**: high confidence pass. The new prompt's "do not write your own `wrapLanguageModel` pattern" should prevent the typo that caused last run's 500. Additionally, SDK 0.3.0's misuse guardrail throws a directional error at runtime if v0's AI still constructs `whoopsieMiddleware(opts)(model)` — so even if the prompt is ignored, the failure is loud and self-explaining instead of cryptic. Risk: v0's preview iframe may have its own network egress quirk we haven't seen.
- **Lovable**: medium confidence. Now includes a TanStack Start framework note in the prompt. Risk: Lovable's AI may still place the wrap in the wrong TanStack route file (the prompt tells it to search for `streamText` first, but AI agents skim). If trace doesn't land, check Lovable's server logs for the SDK 0.3.0 30s warning — that's the diagnostic.
- **Replit**: low confidence. Last run hung with no diagnostic. With SDK 0.3.0 + CLI 0.2.0, server logs should now tell us immediately whether the middleware loaded. If `[whoopsie] enabled` appears but no event fires, the wrap is in the wrong file. If it doesn't appear, env var or import chain. Replit also has a terminal — run `npx -y @whoopsie/cli@0.2.0 verify` to isolate the layer.

## What to do on failures

See `docs/PLATFORM_REMEDIATION.md` for per-platform debug paths and fix templates. The most likely categories:

1. **AI ignored "do not" lines in prompt** → sharpen prompt, possibly add a one-liner example that's literally copy-pasteable
2. **Wrap in wrong file** → enhance prompt with "search for `streamText` BEFORE editing"
3. **Env var not in runtime** → platform-specific debug (Replit needs workflow restart; Lovable needs Cloud secrets propagation; v0 needs Vars-to-runtime sync)
4. **Trace lands but takes >30s** → SSE polling fallback already handles this, but verify
5. **`verify` succeeds but real chat doesn't** → wrap is in a file not imported by the actual route

## Done criteria

Each platform either:
- Passes all 7 assertions in the per-platform flow → mark high-confidence in `docs/PLATFORM_TESTING.md`
- Fails with a specific, debugged root cause → file an issue or open a PR with the fix; mark "needs work"

Total session time estimate: 60–90 minutes for v0 + Lovable + Replit.
