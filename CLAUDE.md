# whoops

The vibe-coder sibling to Pisama. TypeScript-only, Vercel-first, free forever.

See `~/.claude/plans/how-could-we-make-typed-hennessy.md` for the full design rationale.

## Anchors

- Entrypoint for users: `npx @whoops/cli init` then `whoopsMiddleware()` in their `streamText` call.
- The 60-second hero moment lives in `packages/cli/src/init.ts` and `apps/web/app/live/[projectId]/page.tsx`.
- Domain: `whoops.dev`. Available, not yet registered.
- npm scope: `@whoops/*`. Available, not yet registered.

## Hard rules

- Vibe-coder lens. Tone is "ship fast", not "research-grade". No MAST/TRAIL vocabulary in user-facing surfaces.
- Free forever. No metering, no paid tier, no upsell copy. Conversion path is to Pisama main (do NOT link to pisama.ai from the landing yet — internal note).
- Next.js + Vercel AI SDK only. No multi-framework support in v1.
- TypeScript only. No Python.
- Default-on PII redaction in the SDK. Privacy is load-bearing for the HN moment.
- Detectors are pure functions, sync, zero runtime deps.

## Local dev loop

```bash
nvm use            # Node 22 (.nvmrc)
pnpm install
pnpm build
pnpm start         # boots apps/web on :3000
pnpm smoke         # end-to-end test against the running server
```

`pnpm test` runs the 30 detector tests via `tsx --test`.

## Wire contracts

`CONTRACTS.md` is the source of truth for the SDK ↔ ingest ↔ SSE ↔ dashboard wire format. Don't change a shape without updating every consumer.

## Reference: Pisama

Detectors are ports of `~/pisama/packages/pisama-core/src/pisama_core/detection/detectors/*.py`. Algorithm-level fidelity, simplified surface (no platform overrides, no async, no enterprise tiering). Hallucination and derailment are deliberately weaker than the Pisama versions — vibe-coder pack accepts heuristic precision.
