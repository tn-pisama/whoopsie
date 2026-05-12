# Platform Remediation Playbooks

When the cross-platform test (see `CROSS_PLATFORM_TEST_RUNBOOK.md`) finds a broken integration, this doc has the per-platform debug paths and fix templates.

## Common to all platforms

### Check the SDK diagnostics first

The `@whoopsie/sdk` 0.2.0 release added loud-by-default logging; 0.3.0 added partial-flush warnings + a misuse guardrail. **Always check server logs before any other debug step.** Three possible states:

| Log seen | Meaning | Next step |
|---|---|---|
| `[whoopsie] enabled · project=ws_xxx… · redact=metadata-only` | SDK loaded with env var, redact mode resolved | Move to "is the wrap actually invoked?" |
| No `[whoopsie] enabled` log at all | `WHOOPSIE_PROJECT_ID` env var didn't reach the runtime, OR the file with the wrap isn't imported | Check env var injection + file import chain |
| `[whoopsie] enabled` + `[whoopsie] No events fired in 30s` warning | SDK loaded but the wrap isn't on the code path that handles chat requests | The wrap is in a dead file; or it's wrapping a different model than the one used in `streamText` |

### Run `npx @whoopsie/cli verify` (any platform with a terminal)

If the platform offers a terminal (Replit, occasionally others), run `npx -y @whoopsie/cli@0.2.0 verify`. It's an SDK-independent round-trip check.

Outcome tells you which layer is broken:

| `verify` result | Interpretation |
|---|---|
| Exit 0, real chat also fires traces | Working — all green |
| Exit 0, real chat fires no traces | Network + ingest are fine; the user's app code is the gap (wrong wrap, wrong file) |
| Exit 1: "Could not reach …" | Network egress to whoopsie.dev/api/v1/spans blocked in the platform's runtime |
| Exit 1: "Trace didn't appear within 15s" | POST succeeds, but project ID isn't matching what whoopsie expects — likely env var mismatch |
| Exit 1: "no project id" | `WHOOPSIE_PROJECT_ID` isn't set or readable in the shell |

### Set `WHOOPSIE_DEBUG=1` for verbose mode

If the integration is silently failing and the 30s warning isn't conclusive, set `WHOOPSIE_DEBUG=1` as a second env var on the platform. The SDK will then log every flush attempt with HTTP status and any suppressed network errors. Especially useful for sandboxed runtimes where outbound network has quirks.

---

## v0 (https://v0.app)

### Most likely failure modes

#### Mode 0 (new in SDK 0.3.0): Misuse guardrail fires with a directional error

If the AI wrote `whoopsieMiddleware(opts)(model)` — the v0 typo from the 2026-05-10 test — the SDK 0.3.0 misuse guardrail catches it at the first call and throws:

```
TypeError: [whoopsie] Don't call whoopsieMiddleware(opts) as a function.
Use observe(model, opts) from @whoopsie/sdk instead — single call,
no wrapLanguageModel ceremony. See https://whoopsie.dev/install
```

**Detection**: 500 response from `/api/chat`. v0 console shows the TypeError above.

**Fix**: Update v0's route to use `observe()` per the message. The chat input takes "Please replace the whoopsieMiddleware wrap with `observe(openai('gpt-4o-mini'), { redact: 'metadata-only' })` from `@whoopsie/sdk`. Remove the `wrapLanguageModel` import."

#### Mode 1: AI still ignores prompt and writes `whoopsieMiddleware(...)(model)` despite the "do not" lines

The 2026-05-10 failure pre-Mode 0 fix. Now caught at runtime by the guardrail above, but if the user doesn't see logs, they may still file this as a generic "chat broken" report.

**Detection**: Inspect `app/api/chat/route.ts` in v0's code view. If the wrap reads as `whoopsieMiddleware({...})(openai(...))`, this is it. SDK 0.3.0 will throw on first request with the message above.

**Fix template**:
1. Update `apps/web/lib/install-prompts.ts`: make the "do not" lines louder, possibly with a literal counter-example showing what NOT to write. Something like:
   ```
   Common mistake AI agents make: writing `whoopsieMiddleware(opts)(openai("..."))`. That throws at runtime because the middleware is an object, not a function. ALWAYS use `observe(model, opts)`.
   ```
2. Bump SDK + redeploy install page
3. Re-test v0

#### Mode 2: Preview iframe egress blocked

**Detection**: Set `WHOOPSIE_DEBUG=1`. Look for `[whoopsie] flush failed (suppressed in production):` in v0's terminal pane.

**Fix template**: v0 runs previews on `*.vusercontent.net` — outbound HTTP should be open. If it's not, document the workaround (use `WHOOPSIE_INGEST_URL` to point at a proxy, or run integration tests against the deployed-to-Vercel version of the app rather than v0's preview).

#### Mode 3: `OPENAI_API_KEY` set in Vars panel but doesn't reach runtime on first chat

v0 has sometimes shown this — the secret takes effect after a build, not instantly.

**Detection**: Chat returns generic error or no response. v0 logs show `OPENAI_API_KEY is not set`.

**Fix**: Trigger a rebuild by pressing Save or restarting the dev server in v0. Re-test.

---

## Lovable (https://lovable.dev)

### Most likely failure modes

#### Mode 1: AI places the wrap in the wrong TanStack Start file

The 2026-05-10 silent-no-op. Lovable's AI wrote the wrap but the file wasn't the actual chat route. New install prompt includes `LOVABLE_FRAMEWORK_NOTE` pointing to `src/routes/api/chat.ts` and asking the AI to "search for `streamText` first." But agents skim.

**Detection**: Lovable's chat returns real OpenAI completions. Whoopsie dashboard stays at "0 events." Lovable server logs show NO `[whoopsie] enabled` line.

**Fix template**:
1. Inspect Lovable's project source. Search for all usages of `streamText` or `generateText`. The wrap must be at the exact line where the model is passed to `streamText`.
2. If the wrap is in a separate file (e.g. `src/lib/observability.ts`) that's never imported by the chat route, that's the bug. Have Lovable's AI move the wrap to the route file.
3. Long-term fix: update `LOVABLE_FRAMEWORK_NOTE` in `apps/web/lib/install-prompts.ts` to explicitly say "DO NOT create a separate observability file. Edit the streamText line in-place."

#### Mode 2: TanStack Start middleware contract incompatible with `LanguageModelV3`

Possible if TanStack ships a release that changes how server-route middleware works. The SDK integration tests in `packages/sdk/test/integration/tanstack-start/` should catch this — but they use a mock model, not the full TanStack runtime.

**Detection**: `[whoopsie] enabled` appears in Lovable logs, but `[whoopsie] No events fired in 30s` follows. The wrap is loaded but `streamText` isn't invoking the middleware.

**Fix template**:
1. Reproduce locally by running the TanStack reference app at `packages/sdk/test/integration/tanstack-start/` against the latest `@ai-sdk/*` versions
2. If the integration is broken, patch the SDK to adapt — most likely a small change in how `observe()` constructs the middleware to match the new contract
3. Release a new SDK minor with the fix; update Lovable install prompt if guidance changes

#### Mode 3: Lovable's preview egress to whoopsie.dev blocked

Lovable preview iframes serve from `id-preview--<id>.lovable.app`. Should have open egress. Verify with `WHOOPSIE_DEBUG=1`.

---

## Replit (https://replit.com)

### Most likely failure modes

#### Mode 1: Replit Agent's plan needs explicit approval

Replit Agent in Plan mode generates a plan and waits for "Continue" before executing. If the user doesn't notice the approval prompt, the install never runs.

**Detection**: Replit chat shows a plan with steps but the workflow never started.

**Fix**: User must click "Continue" or "Approve plan." Document this in install prompt or Lovable banner.

#### Mode 2: Workflow doesn't pick up new env vars

Replit's workflow can cache env vars from a previous boot. After setting `WHOOPSIE_PROJECT_ID` in Secrets, the running workflow may still have the old env.

**Detection**: `[whoopsie] enabled` log shows the WRONG project ID, or doesn't appear at all.

**Fix**: In Replit's console pane, run `kill 1` (Replit's "restart everything" command) then `pnpm dev` or whatever the workflow runs. Re-test.

#### Mode 3: Replit Agent's AI wrote a fragile route shape

Replit Agent sometimes generates Express routes, sometimes Next.js routes, depending on what existed. If it scaffolded Express but the install prompt's `observe()` example used Next.js-shape, the AI may have struggled to adapt.

**Detection**: Chat hangs or returns nothing. Logs show no errors but also no `streamText` activity.

**Fix template**:
1. Inspect the generated route file. Confirm it's actually being hit (add a `console.log("route hit")` at the top, restart, send a chat, check if the log appears).
2. If the route is hit but `streamText` doesn't fire, the `observe()` wrap may be on a different model than the one passed to `streamText`. Inspect closely.
3. If the route isn't hit, the URL the chat UI is POSTing to doesn't match the route's path. Fix the routing.

#### Mode 4: Replit's `kill 1` race condition

After `kill 1`, the workflow takes ~5s to come back. If the user sends a chat too early, they'll get "service unavailable." Re-try after 10s.

---

---

## When to update this doc

- New platform-specific failure mode discovered → add to that platform's section
- Common cause fixed in SDK → mark "Fixed in 0.x.y" next to the failure mode
- Pattern recognized across multiple platforms → consider promoting to "Common to all platforms"

---

## When to escalate to product changes

If a single failure mode keeps recurring across re-tests, the right fix may be in the SDK or install prompt, not in remediation. Examples of patterns worth promoting:

- "AI writes `whoopsieMiddleware(opts)(model)` consistently" → make `whoopsieMiddleware` throw a helpful error when called as a function, since the AI is going to misuse it that way
- "Wrap ends up in a dead file consistently" → add a CLI command `@whoopsie/cli check` that scans the user's repo for `streamText` calls and verifies they're wrapped
- "Env var doesn't reach runtime on platform X consistently" → add a platform-specific note to the install prompt
