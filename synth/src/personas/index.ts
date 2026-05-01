import type { Persona } from "../types.js";
import { wellBehaved } from "./well-behaved.js";
import { researchBot } from "./research-bot.js";
import { codeReviewer } from "./code-reviewer.js";
import { debuggerAgent } from "./debugger.js";
import { runawaySummarizer } from "./runaway-summarizer.js";
import { hallucinatingRag } from "./hallucinating-rag.js";
import { derailedPlanner } from "./derailed-planner.js";
import { contextIgnorer } from "./context-ignorer.js";

export const personas: Persona[] = [
  wellBehaved,
  researchBot,
  codeReviewer,
  debuggerAgent,
  runawaySummarizer,
  hallucinatingRag,
  derailedPlanner,
  contextIgnorer,
];
