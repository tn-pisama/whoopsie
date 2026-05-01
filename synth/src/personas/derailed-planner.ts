// Agent that gets a creative-writing task but its toolkit is database tools.
// On a meaningful slice of calls, the agent ignores the task and runs queries.
// Fires derailment.
import type { Persona } from "../types.js";
import { chance, mkEvent, pick, randomModel } from "../util.js";

const TASKS = [
  ["Write a haiku about autumn leaves.", "Crimson leaves descend / morning sun on quiet fields / breath turns to cold mist"],
  ["Compose a short poem about waiting.", "Stillness bends the chair / one hand on a quiet phone / the kettle remembers"],
  ["Draft a thank-you note to a teacher.", "Dear Ms. Lin, thank you for the patient questions you asked when I had no answers; I think of them often."],
];

export const derailedPlanner: Persona = {
  name: "derailed-planner",
  projectId: "ws_synth_derail",
  description: "Creative-writing prompts answered by an agent stuck on its DB toolkit.",
  intervalMs: 16_000,
  next() {
    const [prompt, faithful] = pick(TASKS);
    const derailed = chance(0.4);

    if (derailed) {
      // 6 db_query calls, no write/compose tool — fires derailment (≥5 tool
      // threshold + verb mismatch + no universal tool used).
      return mkEvent({
        projectId: this.projectId,
        model: randomModel(),
        prompt,
        completion: "Let me check the database first.",
        toolNames: Array(6).fill("execute_sql"),
        toolArgs: () => ({ query: "SELECT * FROM poems LIMIT 1" }),
        inputTokens: 60,
        outputTokens: 20,
        costUsd: 0.001,
        finishReason: "tool_calls",
        durationMs: 3500,
      });
    }

    return mkEvent({
      projectId: this.projectId,
      model: randomModel(),
      prompt,
      completion: faithful,
      toolNames: ["compose_text"],
      inputTokens: 60 + Math.floor(Math.random() * 40),
      outputTokens: 80 + Math.floor(Math.random() * 60),
      costUsd: 0.002 + Math.random() * 0.003,
      finishReason: "stop",
      durationMs: 1500 + Math.random() * 2000,
    });
  },
};
