// Summarizer that's been told to "be thorough". Sometimes runs away with
// huge token counts. Fires cost + completion (runaway).
import type { Persona } from "../types.js";
import { chance, mkEvent, pick, randomModel } from "../util.js";

const TASKS = [
  "Summarize this 80-page deposition transcript",
  "Write detailed release notes for v3.0.0",
  "Generate a comprehensive RFC from this design doc",
  "Translate this legal contract into plain English",
];

export const runawaySummarizer: Persona = {
  name: "runaway-summarizer",
  projectId: "ws_synth_summarize",
  description: "Long-form generator that occasionally explodes in cost and length.",
  intervalMs: 30_000,
  next() {
    const task = pick(TASKS);
    const explode = chance(0.4);

    if (explode) {
      // 12k input + 5k output, $0.85 — fires cost (high tokens + high cost)
      // and completion (runaway).
      return mkEvent({
        projectId: this.projectId,
        model: "claude-opus-4-7",
        prompt: task,
        completion:
          "Section 1: " + "lorem ipsum dolor sit amet ".repeat(20) +
          "\n\nSection 2: " + "consectetur adipiscing elit ".repeat(20) +
          "\n\nSection 3: " + "sed do eiusmod tempor incididunt ".repeat(20),
        inputTokens: 12_000,
        outputTokens: 5_400,
        costUsd: 0.85,
        finishReason: "length",
        durationMs: 14_000,
      });
    }

    return mkEvent({
      projectId: this.projectId,
      model: pick(["claude-sonnet-4-6", "gpt-4o"]),
      prompt: task,
      completion:
        "Summary:\n- Key change: refactored auth to OIDC.\n- Breaking: legacy tokens expire 2026-06-01.\n- Action: rotate clients.",
      inputTokens: 1500 + Math.floor(Math.random() * 1000),
      outputTokens: 300 + Math.floor(Math.random() * 200),
      costUsd: 0.025 + Math.random() * 0.04,
      finishReason: "stop",
      durationMs: 4000 + Math.random() * 4000,
    });
  },
};
