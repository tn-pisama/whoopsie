// This is the line that lights up whoopsie's failure detection. The
// `wrapLanguageModel` + `whoopsieMiddleware` pair adds zero runtime cost
// and streams trace metadata to your dashboard at
// https://whoopsie.dev/live/<WHOOPSIE_PROJECT_ID>
import { openai } from "@ai-sdk/openai";
import { streamText, wrapLanguageModel } from "ai";
import { whoopsieMiddleware } from "@whoopsie/sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const model = wrapLanguageModel({
    model: openai("gpt-4o-mini"),
    middleware: whoopsieMiddleware(),
  });

  const result = streamText({
    model,
    system:
      "You are a helpful assistant. Be brief — keep answers under 80 words.",
    messages,
  });

  return result.toTextStreamResponse();
}
