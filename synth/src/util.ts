import { nanoid } from "nanoid";
import { Resolver } from "node:dns/promises";
import { Agent, type Dispatcher } from "undici";
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

// Some macOS resolvers cache NXDOMAIN aggressively after a domain registration.
// Cache resolved IPs per host so we degrade gracefully without round-tripping
// to a public resolver on every request.
const ipCache = new Map<string, { ip: string; expiresAt: number }>();
const fallbackResolver = new Resolver();
fallbackResolver.setServers(["1.1.1.1", "8.8.8.8"]);

const dispatcherCache = new Map<string, Dispatcher>();

async function resolveHost(host: string): Promise<string> {
  const now = Date.now();
  const cached = ipCache.get(host);
  if (cached && cached.expiresAt > now) return cached.ip;
  const ips = await fallbackResolver.resolve4(host);
  const ip = ips[0]!;
  ipCache.set(host, { ip, expiresAt: now + 60_000 });
  return ip;
}

async function dispatcherFor(host: string): Promise<Dispatcher> {
  const cached = dispatcherCache.get(host);
  if (cached) return cached;
  const ip = await resolveHost(host);
  // Pin connections to the resolved IP. SNI keeps the right TLS cert.
  const agent = new Agent({
    connect: {
      lookup(
        _hostname: string,
        _options: unknown,
        callback: (
          err: NodeJS.ErrnoException | null,
          addresses: { address: string; family: number }[],
        ) => void,
      ) {
        callback(null, [{ address: ip, family: 4 }]);
      },
    },
  });
  dispatcherCache.set(host, agent);
  return agent;
}

export async function postEvent(
  event: TraceEvent,
  endpoint = process.env.WHOOPSIE_INGEST_URL ?? DEFAULT_INGEST,
): Promise<{ ok: boolean; status: number; hits: string[] }> {
  const url = new URL(endpoint);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-whoopsie-project-id": event.projectId,
  };
  const body = JSON.stringify({ events: [event] });

  const tryFetch = async (
    init: RequestInit & { dispatcher?: Dispatcher },
  ): Promise<Response> => fetch(endpoint, { method: "POST", headers, body, ...init });

  let res: Response;
  try {
    res = await tryFetch({});
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (!/fetch failed|ENOTFOUND|getaddrinfo/.test(msg)) {
      return { ok: false, status: 0, hits: [] };
    }
    try {
      const dispatcher = await dispatcherFor(url.hostname);
      res = await tryFetch({ dispatcher });
    } catch {
      return { ok: false, status: 0, hits: [] };
    }
  }

  let hits: string[] = [];
  if (res.ok) {
    try {
      const j = (await res.json()) as {
        detections?: { hits?: { detector: string }[] }[];
      };
      hits = (j.detections ?? []).flatMap((d) =>
        (d.hits ?? []).map((h) => h.detector),
      );
    } catch {
      // ignore body parse errors
    }
  }
  return { ok: res.ok, status: res.status, hits };
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
