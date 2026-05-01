// Debugger agent that gets stuck retrying the same fix. Fires loop +
// repetition periodically.
import type { Persona } from "../types.js";
import { chance, mkEvent, pick, randomModel } from "../util.js";

const BUGS = [
  ["Build is failing with TS2345 on user.ts:42", "Let me read user.ts and the type that line uses."],
  ["Tests timeout after 30s on CI", "I'll check if there's a hanging async handle in the suite."],
  ["Production deploy returns 502", "Looking at the recent deployments and the route handler code."],
];

export const debuggerAgent: Persona = {
  name: "debugger",
  projectId: "ws_synth_debug",
  description: "Diagnostic agent that occasionally retries the same fix in a loop.",
  intervalMs: 14_000,
  next() {
    const [bug, normalReply] = pick(BUGS);
    const stuck = chance(0.35);

    if (stuck) {
      // Repeated 'apply_patch' calls trying the same fix — loop fires.
      // Completion text repeats itself — repetition fires too.
      const repeatedLine = "Trying again. The build still fails on the same line.\n";
      return mkEvent({
        projectId: this.projectId,
        model: randomModel(),
        prompt: bug,
        completion: Array(5).fill(repeatedLine).join(""),
        toolNames: Array(7).fill("apply_patch"),
        toolArgs: () => ({ file: "user.ts", line: 42, patch: "// retry" }),
        inputTokens: 800,
        outputTokens: 60,
        costUsd: 0.012,
        finishReason: "tool_calls",
        durationMs: 6000,
      });
    }

    return mkEvent({
      projectId: this.projectId,
      model: randomModel(),
      prompt: bug,
      completion: normalReply,
      toolNames: ["read_file", "git_log", "apply_patch"],
      toolArgs: (n) => (n === "read_file" ? { path: "src/user.ts" } : {}),
      inputTokens: 600 + Math.floor(Math.random() * 400),
      outputTokens: 200 + Math.floor(Math.random() * 200),
      costUsd: 0.008 + Math.random() * 0.012,
      finishReason: "stop",
      durationMs: 2500 + Math.random() * 2500,
    });
  },
};
