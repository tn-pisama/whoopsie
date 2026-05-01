// Agent given a Context: block but its replies sometimes ignore the contents
// entirely. Fires context-neglect.
import type { Persona } from "../types.js";
import { chance, mkEvent, randomModel } from "../util.js";

const CONTEXTS = [
  {
    block: "User profile: Mira Solano, vegetarian, allergic to peanuts, prefers Italian cuisine, lives in Brooklyn.",
    question: "Suggest a takeout order for tonight.",
    faithful: "Try Frankie's 457 in Brooklyn — their eggplant parm is solid and they're peanut-free in the kitchen. Skip the Pad Thai places.",
    ignored: "How about a Pad Thai with extra peanuts from Lemongrass Thai? They have a great spicy pork option too.",
  },
  {
    block: "Project: react-flow rebuild, deadline May 14, blocked on a perf regression in canvas zoom.",
    question: "What should I work on next?",
    faithful: "The canvas zoom regression is the bottleneck — fix the dirty-rect culling there before May 14. Everything else can slip.",
    ignored: "Consider rewriting the API layer in Rust and migrating to a microservice architecture. Also evaluate GraphQL.",
  },
];

export const contextIgnorer: Persona = {
  name: "context-ignorer",
  projectId: "ws_synth_context",
  description: "Personalized assistant that occasionally ignores the user's context.",
  intervalMs: 20_000,
  next() {
    const c = CONTEXTS[Math.floor(Math.random() * CONTEXTS.length)]!;
    const ignoring = chance(0.4);
    const prompt = `Context: ${c.block}\n\n${c.question}`;
    return mkEvent({
      projectId: this.projectId,
      model: randomModel(),
      prompt,
      completion: ignoring ? c.ignored : c.faithful,
      inputTokens: 120 + Math.floor(Math.random() * 80),
      outputTokens: 60 + Math.floor(Math.random() * 80),
      costUsd: 0.002 + Math.random() * 0.003,
      finishReason: "stop",
      durationMs: 1600 + Math.random() * 1800,
    });
  },
};
