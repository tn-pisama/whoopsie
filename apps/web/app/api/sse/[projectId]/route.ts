import { NextRequest } from "next/server";
import { recent, subscribe } from "@/lib/bus";
import type { TraceWithHits } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;
// Polling fallback: pg_notify isn't reliable on Vercel's serverless runtime
// because the LISTEN client can be dropped silently when Neon idles or the
// function instance is recycled. Polling every POLL_MS guarantees we catch
// any trace within bounded latency, with traceId-based dedupe to avoid
// double-emitting events that arrive on both the listener and the poll.
const POLL_MS = 2_000;
const SEEN_CAP = 1_000;
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

      // Seen-set is a bounded FIFO of traceIds we've already emitted on this
      // connection. Entries older than the cap get dropped — fine because by
      // then the dashboard has already received them.
      const seen: string[] = [];
      const seenSet = new Set<string>();
      const markSeen = (traceId: string): boolean => {
        if (seenSet.has(traceId)) return false;
        seenSet.add(traceId);
        seen.push(traceId);
        if (seen.length > SEEN_CAP) {
          const dropped = seen.shift();
          if (dropped) seenSet.delete(dropped);
        }
        return true;
      };

      const recentBuffer = await recent(projectId, 50);
      for (const t of recentBuffer) markSeen(t.event.traceId);
      send("hello", { projectId, recent: recentBuffer });

      const onTrace = (payload: TraceWithHits): void => {
        if (markSeen(payload.event.traceId)) {
          send("trace", payload);
        }
      };
      const unsubscribe = await subscribe(projectId, onTrace);

      const heartbeat = setInterval(() => {
        send("heartbeat", { t: Date.now() });
      }, HEARTBEAT_MS);

      const poll = setInterval(() => {
        void (async () => {
          try {
            const rows = await recent(projectId, 50);
            for (const row of rows) {
              if (markSeen(row.event.traceId)) {
                send("trace", row);
              }
            }
          } catch (err) {
            console.error("[whoopsie] sse poll failed", err);
          }
        })();
      }, POLL_MS);

      const close = (): void => {
        clearInterval(heartbeat);
        clearInterval(poll);
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
