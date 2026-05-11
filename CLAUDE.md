# whoopsie

The vibe-coder sibling to Pisama. TypeScript-only, Vercel-first.

See `~/.claude/plans/how-could-we-make-typed-hennessy.md` for the full design rationale.

## Anchors

- Entrypoint for users: `npx @whoopsie/cli init` then `whoopsieMiddleware()` in their `streamText` call.
- The 60-second hero moment lives in `packages/cli/src/init.ts` and `apps/web/app/live/[projectId]/page.tsx`.
- Domain: `whoopsie.dev`. **Registered** via Cloudflare Registrar 2026-04-30 ($12.20/yr).
- npm scope: `@whoopsie/*`. Reserved-pending — run `npm org create whoopsie` to claim. See REGISTRATION.md.

## Lessons

- Never trust `dig` to check domain availability — domains can be registered without DNS records. Use RDAP against the registry's authoritative endpoint: `curl -sI https://pubapi.registry.google/rdap/domain/<name>.dev` returns 200 for registered, 404 for available. We lost `whoops.dev` to this confusion mid-session.

## Hard rules

- Vibe-coder lens. Tone is "ship fast", not "research-grade". No MAST/TRAIL vocabulary in user-facing surfaces.
- No metering, no paid tier, no upsell copy. Conversion path is to Pisama main (do NOT link to pisama.ai from the landing yet — internal note).
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

## Subagent gotcha

`general-purpose` agents will enter `EnterPlanMode` on their own for any non-trivial task and stall waiting for approval. To get them to execute, the prompt must lead with explicit anti-plan instructions: "EXECUTE NOW. DO NOT use EnterPlanMode. DO NOT write a plan file. Begin file edits in your first tool call." Confirmed to work. If you don't include those instructions, expect the agent to stall — and you cannot send approval from inside another agent because `SendMessage` is not surfaced to nested callers.
