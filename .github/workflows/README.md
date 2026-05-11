# GitHub Actions workflows

## `cross-framework.yml` — currently inactive

Runs the SDK integration tests against four framework reference apps (Next.js, TanStack Start, Hono, Express) on every PR that touches `packages/sdk/**`, plus nightly cron at 06:00 UTC.

**Two layers of testing:**

1. **Mock-model test** — runs `pnpm exec tsx packages/sdk/test/integration/<framework>/<framework>.test.ts`. Uses a stubbed `LanguageModelV3`, captures POSTs to a mock whoopsie endpoint, asserts the event shape is correct. No OpenAI spend, no network egress, fast (~3s per framework).
2. **Vercel Sandbox live test** — spins up an actual Vercel Sandbox per framework, installs `@whoopsie/sdk` from npm, runs a real `streamText` call against `https://whoopsie.dev/api/v1/spans`, polls `/api/v1/traces` for the round-trip. Catches real-world SDK regressions but costs ~$0.0001 per run × 4 frameworks × runs.

The mock test is currently the load-bearing one; the Sandbox layer is a richer "is the published SDK actually working" check.

## Activate the workflow

Both layers are guarded by `if: false` so the workflow file lints but never runs. To activate:

### Mock-model layer only (free, no secrets needed)

1. Edit `.github/workflows/cross-framework.yml`
2. Find the line `if: false # ← Remove this line to activate the workflow.` near the top of the `framework-matrix` job
3. Delete that line entirely
4. Commit and push

The next PR touching `packages/sdk/**` will trigger the matrix.

### Sandbox layer (catches more, costs a bit)

1. Add repo secrets at Settings → Secrets and variables → Actions:
   - `VERCEL_TOKEN` — from https://vercel.com/account/tokens, scoped to the whoopsie team
   - `OPENAI_API_KEY` — a dedicated CI key with a small spend cap
   - `WHOOPSIE_PROJECT_ID_CI` — a project ID you'll dedicate to CI runs (mint one at https://whoopsie.dev/install, copy the value)
2. Edit `cross-framework.yml`, remove BOTH `if: false` lines (the job-level one and the Sandbox-step-level one)
3. Commit and push

### Verify activation worked

Open a PR that touches any file under `packages/sdk/`. The workflow should appear in PR checks with one job per framework. Click into any one to see the job summary table.

To do a smoke test of the regression detection: introduce a deliberate bug into `packages/sdk/src/observe.ts` (e.g. return `model` directly without wrapping) and confirm all four matrix jobs fail. Revert.

## Cost ballpark

- Mock layer: $0 (no network, no AI)
- Sandbox layer: ~$0.50/month for 4 frameworks × ~30 runs/month × $0.0001 per gpt-4o-mini call
- GitHub Actions minutes: ~30 minutes/month (mostly under free-tier)

## Maintenance

- When `@ai-sdk/provider` or `ai` ships a breaking change, the mock tests will likely fail first. Update `packages/sdk/test/integration/_shared/observe-helpers.ts` to match.
- When a new framework becomes popular among vibe-coders (e.g. SolidStart, SvelteKit), add a new directory under `packages/sdk/test/integration/<framework>/` and a matrix entry.
- See [`docs/PLATFORM_TESTING.md`](../../docs/PLATFORM_TESTING.md) for the complementary manual platform-AI test rhythm.
