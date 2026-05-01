import { nanoid } from "nanoid";
import type { TraceEvent, ToolCall } from "./types.js";

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function chance(p: number): boolean {
  return Math.random() < p;
}

export function jitter(ms: number, ratio = 0.5): number {
  const delta = ms * ratio;
  return Math.max(250, Math.floor(ms - delta + Math.random() * 2 * delta));
}

interface MkEventOpts {
  projectId: string;
  model: string;
  prompt?: string;
  completion?: string;
  toolNames?: string[];
  toolArgs?: (toolName: string, i: number) => unknown;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  finishReason?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export function mkEvent(opts: MkEventOpts): TraceEvent {
  const start = Date.now();
  const duration = opts.durationMs ?? 200 + Math.floor(Math.random() * 1500);
  const toolCalls: ToolCall[] =
    opts.toolNames?.map((name, i) => ({
      toolCallId: nanoid(8),
      toolName: name,
      args: opts.toolArgs?.(name, i),
      startTime: start + Math.floor((duration / Math.max(1, opts.toolNames!.length)) * i),
    })) ?? [];

  return {
    projectId: opts.projectId,
    traceId: nanoid(),
    spanId: nanoid(),
    startTime: start,
    endTime: start + duration,
    model: opts.model,
    prompt: opts.prompt,
    completion: opts.completion,
    toolCalls,
    inputTokens: opts.inputTokens,
    outputTokens: opts.outputTokens,
    costUsd: opts.costUsd,
    finishReason: opts.finishReason ?? "stop",
    metadata: opts.metadata ?? {},
  };
}

const DEFAULT_INGEST = "https://whoopsie.dev/api/v1/spans";

export async function postEvent(
  event: TraceEvent,
  endpoint = process.env.WHOOPSIE_INGEST_URL ?? DEFAULT_INGEST,
): Promise<{ ok: boolean; status: number; hits: string[] }> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-whoopsie-project-id": event.projectId,
      },
      body: JSON.stringify({ events: [event] }),
    });
    let hits: string[] = [];
    if (res.ok) {
      const body = (await res.json()) as {
        detections?: { hits?: { detector: string }[] }[];
      };
      hits = (body.detections ?? []).flatMap((d) =>
        (d.hits ?? []).map((h) => h.detector),
      );
    }
    return { ok: res.ok, status: res.status, hits };
  } catch {
    return { ok: false, status: 0, hits: [] };
  }
}

const MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-haiku-4-5-20251001",
  "gpt-4o",
  "gpt-4o-mini",
] as const;

export function randomModel(): string {
  return pick(MODELS);
}
