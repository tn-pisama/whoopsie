// Research agent that searches before answering. Occasionally gets stuck
// retrying the same query when the search returns nothing useful.
import type { Persona } from "../types.js";
import { chance, mkEvent, pick, randomModel } from "../util.js";

const QUERIES = [
  "What's new in Bun 1.x stable?",
  "Latest news on the EU AI Act",
  "Compare Tigris vs R2 for blob storage",
  "Best practices for OpenAI structured outputs",
  "Recent benchmark results for Claude Sonnet 4.6",
  "Vercel Fluid Compute pricing model 2026",
];

const NORMAL_TOOLS = ["web_search", "fetch_page", "summarize_text"];

export const researchBot: Persona = {
  name: "research-bot",
  projectId: "ws_synth_research",
  description: "Search-then-answer agent. Periodically loops on the same query.",
  intervalMs: 8_000,
  next() {
    const q = pick(QUERIES);
    const looping = chance(0.18);

    if (looping) {
      // Stuck retrying the same search 6x — fires loop detector.
      return mkEvent({
        projectId: this.projectId,
        model: randomModel(),
        prompt: q,
        completion: "Searching for more sources...",
        toolNames: Array(6).fill("web_search"),
        toolArgs: () => ({ query: q }),
        inputTokens: 60 + Math.floor(Math.random() * 40),
        outputTokens: 8,
        costUsd: 0.001,
        finishReason: "tool_calls",
        durationMs: 4500,
      });
    }

    return mkEvent({
      projectId: this.projectId,
      model: randomModel(),
      prompt: q,
      completion:
        "Based on the most recent posts, the consensus is that " +
        pick([
          "the new release improved cold-start performance roughly 30%.",
          "the change is opt-in behind a feature flag for now.",
          "production teams should wait one minor version before adopting.",
        ]),
      toolNames: [pick(NORMAL_TOOLS), pick(NORMAL_TOOLS), "summarize_text"],
      toolArgs: (n) => (n === "web_search" ? { query: q } : { url: "https://example.com" }),
      inputTokens: 250 + Math.floor(Math.random() * 200),
      outputTokens: 80 + Math.floor(Math.random() * 80),
      costUsd: 0.003 + Math.random() * 0.004,
      finishReason: "stop",
      durationMs: 1500 + Math.random() * 2500,
    });
  },
};
