// This is the line that lights up whoopsie's failure detection. The
// `observe()` helper adds zero runtime cost and streams trace metadata to
// your dashboard at https://whoopsie.dev/live/<WHOOPSIE_PROJECT_ID>
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { observe } from "@whoopsie/sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const result = streamText({
    // One-line wrap. The model behaves identically; whoopsie sees the trace.
    model: observe(openai("gpt-4o-mini"), { redact: "metadata-only" }),
    system:
      "You are a helpful assistant. Be brief — keep answers under 80 words.",
    messages,
  });

  return result.toTextStreamResponse();
}
