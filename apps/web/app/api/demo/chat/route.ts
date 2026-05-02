import { NextRequest } from "next/server";
import { gateway } from "@ai-sdk/gateway";
import { streamText, wrapLanguageModel } from "ai";
import { whoopsieMiddleware } from "@whoopsie/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEMO_PROJECT_ID = "ws_demo_public";
const RATE_LIMIT = 10; // messages per IP per hour
const MAX_OUTPUT_TOKENS = 200;
const SYSTEM_PROMPT =
  "You are the whoopsie.dev demo assistant. Keep replies under 80 words. Be straightforward, no preamble. If asked about whoopsie itself: it's an open-source AI failure observability tool for Vercel AI SDK apps; users wrap their model with `wrapLanguageModel({ model, middleware: whoopsieMiddleware() })` and watch failures live at whoopsie.dev/live/<projectId>.";

interface RateBucket {
  count: number;
  resetAt: number;
}
const rateMap = new Map<string, RateBucket>();

function rateLimit(ip: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const bucket = rateMap.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { allowed: true };
  }
  if (bucket.count >= RATE_LIMIT) {
    return { allowed: false, resetIn: Math.ceil((bucket.resetAt - now) / 60_000) };
  }
  bucket.count++;
  return { allowed: true };
}

export async function POST(req: NextRequest): Promise<Response> {
  // Resolve client IP for rate limiting. Vercel forwards via x-forwarded-for.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = rateLimit(ip);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: `slow down — try again in ~${rl.resetIn ?? 60} minutes`,
      }),
      { status: 429, headers: { "content-type": "application/json" } },
    );
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = (await req.json()) as { message?: unknown; history?: unknown };
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const message =
    typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 1000) {
    return new Response(
      JSON.stringify({ error: "message must be 1-1000 chars" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const history: { role: "user" | "assistant"; content: string }[] =
    Array.isArray(body.history)
      ? (body.history as { role: string; content: string }[])
          .filter(
            (m) =>
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          )
          .slice(-10)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: String(m.content).slice(0, 2000),
          }))
      : [];

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: message },
  ];

  // Wrap the gateway model with whoopsie middleware. We post to whoopsie.dev's
  // own ingest, with the demo project ID, in metadata-only mode — every visitor
  // adds activity to the public dashboard at /live/ws_demo_public without
  // their actual prompts/completions ever being persisted.
  const wrapped = wrapLanguageModel({
    model: gateway("anthropic/claude-haiku-4-5"),
    middleware: whoopsieMiddleware({
      projectId: DEMO_PROJECT_ID,
      redact: "metadata-only",
    }),
  });

  const result = streamText({
    model: wrapped,
    messages,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  return result.toTextStreamResponse();
}
