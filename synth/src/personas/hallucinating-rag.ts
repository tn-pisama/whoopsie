// RAG bot that mostly answers from sources but occasionally invents
// names/places. Fires hallucination on the inventive ones.
import type { Persona } from "../types.js";
import { chance, mkEvent, randomModel } from "../util.js";

const SOURCE_DOC =
  "Acme Robotics is a Pittsburgh startup founded in 2024 by Sara Patel. The company builds household cleaning robots. Acme raised a $4M seed round in March 2025 led by Initialized Capital.";

const QUESTION = "Who founded Acme Robotics, when, and who led the seed round?";

const FAITHFUL =
  "Acme Robotics was founded in 2024 by Sara Patel. The seed round in March 2025 was led by Initialized Capital.";

const INVENTED =
  "Acme Robotics was founded in 2024 by Sara Patel and Marcus Bellamy in Pittsburgh. The seed round in March 2025 was co-led by Initialized Capital and General Catalyst, with participation from Reid Hoffman and Marc Andreessen. The company has since opened offices in Lisbon and Boulder.";

export const hallucinatingRag: Persona = {
  name: "hallucinating-rag",
  projectId: "ws_synth_rag",
  description: "RAG bot that occasionally invents details not in the sources.",
  intervalMs: 18_000,
  next() {
    const inventing = chance(0.35);
    const prompt = `Sources: ${SOURCE_DOC}\n\nQ: ${QUESTION}`;
    return mkEvent({
      projectId: this.projectId,
      model: randomModel(),
      prompt,
      completion: inventing ? INVENTED : FAITHFUL,
      toolNames: ["vector_search", "rerank"],
      inputTokens: 320 + Math.floor(Math.random() * 80),
      outputTokens: inventing ? 130 : 60,
      costUsd: 0.005 + Math.random() * 0.004,
      finishReason: "stop",
      durationMs: 2200 + Math.random() * 2000,
    });
  },
};
