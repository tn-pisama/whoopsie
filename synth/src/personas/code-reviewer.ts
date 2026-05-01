// PR-review agent. Reads diffs, suggests changes. Mostly clean.
import type { Persona } from "../types.js";
import { mkEvent, pick, randomModel } from "../util.js";

const PRS = [
  ["Refactor auth middleware to use OIDC", "Looks good. Suggested: rename `verifyIdToken` to `verifyAccessToken` since you switched from id_token to access_token."],
  ["Add rate limiter to /api/chat", "Use a token bucket per IP. Consider 60 req/min and a Retry-After header on 429."],
  ["Move from npm to pnpm workspace", "Drop the `install` script — pnpm runs it automatically. Pin pnpm version in `packageManager` field."],
  ["Add Sentry to backend", "Wrap the Next.js Route Handlers with `withSentry`. Don't forget to set `SENTRY_RELEASE` in CI."],
];

const TOOLS = ["read_file", "list_files", "git_diff", "suggest_edit", "comment_thread"];

export const codeReviewer: Persona = {
  name: "code-reviewer",
  projectId: "ws_synth_review",
  description: "PR review assistant. No detector hits.",
  intervalMs: 22_000,
  next() {
    const [pr, summary] = pick(PRS);
    const toolCount = 3 + Math.floor(Math.random() * 4);
    // Sample without consecutive duplicates so we never accidentally fire
    // the loop detector on the clean baseline.
    const toolNames: string[] = [];
    while (toolNames.length < toolCount) {
      const t = pick(TOOLS);
      if (toolNames[toolNames.length - 1] !== t) toolNames.push(t);
    }
    return mkEvent({
      projectId: this.projectId,
      model: randomModel(),
      prompt: `Review the PR: ${pr}`,
      completion: summary,
      toolNames,
      toolArgs: (n) =>
        n === "read_file" ? { path: "src/auth.ts" } : n === "git_diff" ? { range: "HEAD..origin/main" } : { line: 42 },
      inputTokens: 1200 + Math.floor(Math.random() * 800),
      outputTokens: 220 + Math.floor(Math.random() * 200),
      costUsd: 0.018 + Math.random() * 0.02,
      finishReason: "stop",
      durationMs: 4000 + Math.random() * 4000,
    });
  },
};
