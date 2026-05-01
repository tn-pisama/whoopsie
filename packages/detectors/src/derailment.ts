import type { AgentTrace, Detector, DetectionResult } from "./types.js";
import { noIssue } from "./types.js";

const NAME = "derailment";
const MIN_TOOLS = 3;

const TASK_VERBS = new Set([
  "search", "find", "fetch", "get", "list", "read", "load", "look",
  "write", "create", "build", "make", "generate", "compose",
  "edit", "update", "modify", "rewrite", "patch",
  "delete", "remove",
  "analyze", "summarize", "explain", "describe",
  "plan", "design", "compare", "verify", "check", "test",
  "send", "post", "publish", "deploy",
]);

export function detectDerailment(trace: AgentTrace): DetectionResult {
  if (trace.toolCalls.length < MIN_TOOLS) return noIssue(NAME);

  const verbs = extractFirstSentenceVerbs(trace.prompt);
  if (verbs.length === 0) return noIssue(NAME);

  const toolNames = trace.toolCalls.map((t) => t.toolName.toLowerCase());
  const toolNameBlob = toolNames.join(" ");

  const aligned = verbs.some((v) => toolNameBlob.includes(v));
  if (aligned) return noIssue(NAME);

  return {
    detector: NAME,
    detected: true,
    severity: 45,
    summary: `Tool sequence drifts from task. Asked to [${verbs.join(", ")}] but called [${toolNames.slice(0, 5).join(", ")}]`,
    fix: "Align tool selection with the task verb. Add a planning step before tool calls or constrain available tools.",
    evidence: { taskVerbs: verbs, toolNames },
  };
}

function extractFirstSentenceVerbs(prompt: string | undefined): string[] {
  if (!prompt) return [];
  const firstSentence = prompt
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .find((s) => s.length > 4);
  if (!firstSentence) return [];

  const tokens = firstSentence
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return tokens.filter((t) => TASK_VERBS.has(t));
}

export const derailmentDetector: Detector = {
  name: NAME,
  description: "Flags tool sequences that don't align with the prompt's task verbs",
  detect: detectDerailment,
};
