## @whoopsie/synth

Synthetic agents that mimic real users hitting the whoopsie ingest. Each persona is one project ID worth of believable AI-agent traffic — some clean, some failing in the way the matching detector is designed to catch.

Useful for: live demo data on the dashboard, smoke-testing a deploy, comparing detector behavior against realistic traces.

## Personas

| Persona | Project ID | Description | Detector(s) it triggers |
|---|---|---|---|
| `well-behaved` | `ws_synth_clean` | Normal Q&A chat app | none |
| `code-reviewer` | `ws_synth_review` | PR review assistant | none |
| `research-bot` | `ws_synth_research` | Search-then-answer agent | `loop` (~18% of calls) |
| `debugger` | `ws_synth_debug` | Diagnostic agent that retries the same fix | `loop` + `repetition` (+ sometimes `derailment` cascade) |
| `runaway-summarizer` | `ws_synth_summarize` | "Be thorough" generator that explodes in length | `cost` + `completion` + `repetition` |
| `hallucinating-rag` | `ws_synth_rag` | RAG bot that occasionally invents details | `hallucination` |
| `derailed-planner` | `ws_synth_derail` | Creative-writing prompt + DB-only toolkit | `derailment` (+ `loop` cascade) |
| `context-ignorer` | `ws_synth_context` | Personalized assistant that ignores its context | `context` |

Failure rates are deliberate per persona; running `--once` is a coin toss for the failure mode but running steady-state guarantees coverage within ~10 ticks.

## Run

```bash
# steady-state: every persona on its own jittered loop, until ^C
pnpm synth

# single tick per persona (smoke test)
pnpm synth:once

# only one persona
pnpm --filter @whoopsie/synth start --only=runaway-summarizer

# point at a different ingest (local dev, staging, fork)
WHOOPSIE_INGEST_URL=http://localhost:3000/api/v1/spans \
WHOOPSIE_DASHBOARD_BASE=http://localhost:3000/live \
pnpm synth
```

Default target is `https://whoopsie.dev/api/v1/spans`. Open each persona's dashboard URL in a browser tab to watch the events stream in via SSE.

## Output

```
06:30:37 ✓ runaway-summarizer      152ms [repetition,cost,completion]
06:30:37 ✓ debugger                154ms 
06:30:37 ✓ well-behaved            164ms 
```

`✓` = HTTP 200, `✗ (n)` = error with status `n`. Bracketed list shows which detectors fired on that event. Empty brackets = clean event.

## Notes

- No auth needed against the public ingest — project IDs are the entire identity in v0.
- Each persona uses a stable project ID, so events accumulate in the same dashboard between runs (subject to the 200-event ring buffer in MemoryStore, or hard 7-day retention with `WHOOPSIE_DATABASE_URL` set).
- The "Personas" table reflects which detectors a persona is *designed* to trip; cascading hits are realistic side effects (a tool-loop event also lowers tool diversity, etc.) and we leave them in.
- Costs are made-up but plausible for the 2026 model lineup. Token counts are realistic for the prompt/completion shape.
