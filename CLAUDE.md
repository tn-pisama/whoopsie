# whoops

The vibe-coder sibling to Pisama. TypeScript-only, Vercel-first, free forever.

See `~/.claude/plans/how-could-we-make-typed-hennessy.md` for the full design rationale.

## Anchors

- Entrypoint for users: `npx @whoops/cli init` then `whoopsMiddleware()` in their `streamText` call.
- The 60-second hero moment lives in `packages/cli/src/init.ts` and `apps/web/app/live/[projectId]/page.tsx`.
- Domain: `whoops.dev`. Reserved 2026-04-30. Not yet registered.
- npm scope: `@whoops/*`.

## Hard rules

- Vibe-coder lens. Tone is "ship fast", not "research-grade". No MAST/TRAIL vocabulary in user-facing surfaces.
- Free forever. No metering, no paid tier, no upsell copy. Conversion path is to Pisama main.
- Next.js + Vercel AI SDK only. No multi-framework support in v1.
- TypeScript only. No Python.
- Default-on PII redaction in the SDK. Privacy is load-bearing for the HN moment.
- Detectors are pure functions, sync, zero runtime deps.

## Testing

- Detector tests via `node --test`. Each detector has a `*.test.ts` next to the source.
- CLI integration tests should run `npx @whoops/cli init --dry-run` against three Vercel AI SDK starter templates.

## Reference: Pisama

Detectors are ports of `~/pisama/packages/pisama-core/src/pisama_core/detection/detectors/*.py`. Algorithm-level fidelity, simplified surface (no platform overrides, no async, no enterprise tiering).
