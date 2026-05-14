# GitHub Actions workflows

## `cross-framework.yml` — mock-model layer ACTIVE (Layer 3, 2026-05-13)

Runs the SDK integration tests against four framework reference apps (Next.js, TanStack Start, Hono, Express) on every PR that touches `packages/sdk/**`, plus nightly cron at 06:00 UTC, plus `workflow_dispatch`.

**Two layers of testing:**

1. **Mock-model test** — *ACTIVE.* Runs `pnpm exec tsx packages/sdk/test/integration/<framework>/<framework>.test.ts`. Uses a stubbed `LanguageModelV3`, captures POSTs to a mock whoopsie endpoint, asserts the event shape is correct. No OpenAI spend, no network egress, fast (~3s per framework). Catches `ai@6 → ai@7` dep drift, `@ai-sdk/openai` V2/V3 spec changes, `convertToModelMessages` signature drift, and SDK regressions (return-without-wrapping, dropped events, exporter shape changes).
2. **Vercel Sandbox live test** — *still gated by `if: false`.* Spins up an actual Vercel Sandbox per framework, installs `@whoopsie/sdk` from npm, runs a real `streamText` call against `https://whoopsie.dev/api/v1/spans`, polls `/api/v1/traces` for the round-trip. Catches real-world SDK regressions but costs ~$0.0001 per run × 4 frameworks × runs.

## Activate the Sandbox layer

The mock-model layer doesn't require secrets — it's running already on every trigger above. To also activate the Sandbox layer:

1. Add repo secrets at Settings → Secrets and variables → Actions:
   - `VERCEL_TOKEN` — from https://vercel.com/account/tokens, scoped to the whoopsie team
   - `OPENAI_API_KEY` — a dedicated CI key with a small spend cap
   - `WHOOPSIE_PROJECT_ID_CI` — a project ID dedicated to CI runs (mint one at https://whoopsie.dev/install, copy the value)
2. Edit `cross-framework.yml`, remove the remaining `if: false` line on the "Vercel Sandbox, live trace" step
3. Commit and push

## Verify activation worked

Mock layer is already active on `main`. To verify:

```bash
# Trigger an immediate run via the GH CLI (skip the nightly wait):
gh workflow run cross-framework.yml --ref main
gh run list --workflow=cross-framework.yml --limit 1
```

To smoke-test regression detection, introduce a deliberate bug into `packages/sdk/src/observe.ts` (e.g. return `model` directly without wrapping) on a branch, push, open a PR; all four matrix jobs should fail. Revert.

## Cost ballpark

- Mock layer: $0 (no network, no AI)
- Sandbox layer: ~$0.50/month for 4 frameworks × ~30 runs/month × $0.0001 per gpt-4o-mini call
- GitHub Actions minutes: ~30 minutes/month (mostly under the bundled-minutes allowance)

## Maintenance

- When `@ai-sdk/provider` or `ai` ships a breaking change, the mock tests will likely fail first. Update `packages/sdk/test/integration/_shared/observe-helpers.ts` to match.
- When a new framework becomes popular among vibe-coders (e.g. SolidStart, SvelteKit), add a new directory under `packages/sdk/test/integration/<framework>/` and a matrix entry.
- See [`docs/PLATFORM_TESTING.md`](../../docs/PLATFORM_TESTING.md) for the complementary manual platform-AI test rhythm.
