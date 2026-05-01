import { NextRequest } from "next/server";
import { recent, subscribe } from "@/lib/bus";
import type { TraceWithHits } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;
const ENCODER = new TextEncoder();

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId } = await ctx.params;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        const payload =
          `event: ${event}\n` +
          `data: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(ENCODER.encode(payload));
        } catch {
          // controller closed
        }
      };

      const recentBuffer = await recent(projectId, 50);
      send("hello", { projectId, recent: recentBuffer });

      const onTrace = (payload: TraceWithHits): void => {
        send("trace", payload);
      };
      const unsubscribe = await subscribe(projectId, onTrace);

      const heartbeat = setInterval(() => {
        send("heartbeat", { t: Date.now() });
      }, HEARTBEAT_MS);

      const close = (): void => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      _req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
