import { NextRequest, NextResponse } from "next/server";
import { runDetectors, type AgentTrace } from "@whoops/detectors";
import { publish } from "@/lib/bus";
import type { TraceEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const events = parseEvents(body);
  if (!events) {
    return NextResponse.json({ error: "missing events array" }, { status: 400 });
  }

  const headerPid = req.headers.get("x-whoops-project-id");
  const detections: { traceId: string; hits: ReturnType<typeof runDetectors> }[] = [];

  for (const event of events) {
    const projectId = event.projectId || headerPid;
    if (!projectId) continue;

    const trace: AgentTrace = {
      traceId: event.traceId,
      startTime: event.startTime,
      endTime: event.endTime,
      model: event.model,
      prompt: event.prompt,
      completion: event.completion,
      toolCalls: event.toolCalls.map((t) => ({
        toolName: t.toolName,
        args: t.args,
        result: t.result,
        startTime: t.startTime,
      })),
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      costUsd: event.costUsd,
      finishReason: event.finishReason,
    };

    let hits: ReturnType<typeof runDetectors> = [];
    try {
      hits = runDetectors(trace);
    } catch (err) {
      console.error("[whoops] detector error", err);
    }

    try {
      await publish(projectId, { event, hits });
    } catch (err) {
      console.error("[whoops] publish error", err);
    }
    detections.push({ traceId: event.traceId, hits });
  }

  return NextResponse.json({ accepted: events.length, detections });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, x-whoops-project-id",
    },
  });
}

function parseEvents(body: unknown): TraceEvent[] | null {
  if (!body || typeof body !== "object") return null;
  const events = (body as { events?: unknown }).events;
  if (!Array.isArray(events)) return null;
  return events.filter(isTraceEvent);
}

function isTraceEvent(v: unknown): v is TraceEvent {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.traceId === "string" &&
    typeof e.spanId === "string" &&
    typeof e.startTime === "number" &&
    typeof e.endTime === "number" &&
    typeof e.model === "string" &&
    Array.isArray(e.toolCalls)
  );
}
