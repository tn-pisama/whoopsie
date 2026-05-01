// A normal solo dev's chat app. Mostly short Q&A, no detector hits.
import type { Persona } from "../types.js";
import { mkEvent, pick, randomModel } from "../util.js";

const QA = [
  ["What's a good place to learn TypeScript?", "Try totaltypescript.com or the official docs at typescriptlang.org/docs."],
  ["How do I center a div?", "Use flexbox: `display: flex; justify-content: center; align-items: center;`"],
  ["What does `Pick<T, K>` do in TS?", "It constructs a new type by selecting the listed keys K from T."],
  ["Best way to debounce in React?", "Use `useDeferredValue` for input or write a `useDebounce` hook with `setTimeout` inside `useEffect`."],
  ["Difference between `let` and `const`?", "`const` prevents reassignment of the binding; the value can still mutate."],
  ["How do I handle aborts in `fetch`?", "Pass an AbortController's signal: `fetch(url, { signal })`. Catch `AbortError` separately."],
];

export const wellBehaved: Persona = {
  name: "well-behaved",
  projectId: "ws_synth_clean",
  description: "Normal Q&A chat app. No detector hits.",
  intervalMs: 12_000,
  next() {
    const [q, a] = pick(QA);
    return mkEvent({
      projectId: this.projectId,
      model: randomModel(),
      prompt: q,
      completion: a,
      inputTokens: Math.floor(40 + Math.random() * 80),
      outputTokens: Math.floor(20 + Math.random() * 80),
      costUsd: 0.0006 + Math.random() * 0.002,
      finishReason: "stop",
      durationMs: 600 + Math.random() * 1400,
    });
  },
};
