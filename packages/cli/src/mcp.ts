// Whoopsie MCP server. Runs over stdio. Hand it a project ID via
// --project-id or WHOOPSIE_PROJECT_ID and it exposes three tools:
//
//   get_recent_failures   list the most recent traces that fired any detector
//   get_recent_traces     list the most recent traces (with or without hits)
//   get_trace             fetch one specific trace by traceId
//
// Wire it into Cursor / Claude Code's MCP config and the AI in your editor
// can answer "what did my agent break this morning?" against real data.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const DEFAULT_BASE = "https://whoopsie.dev";

interface ToolCallArgs {
  limit?: number;
  traceId?: string;
}

interface TraceEvent {
  traceId: string;
  spanId: string;
  startTime: number;
  endTime: number;
  model: string;
  prompt?: string;
  completion?: string;
  toolCalls: { toolCallId: string; toolName: string }[];
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  finishReason?: string;
  metadata: Record<string, unknown>;
}

interface DetectionResult {
  detector: string;
  detected: boolean;
  severity: number;
  summary: string;
  fix?: string;
  evidence?: Record<string, unknown>;
}

interface TraceWithHits {
  event: TraceEvent;
  hits: DetectionResult[];
}

interface TracesResponse {
  projectId: string;
  count: number;
  events: TraceWithHits[];
}

export interface McpOptions {
  projectId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export async function startMcpServer(opts: McpOptions): Promise<void> {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const projectId = opts.projectId;

  const server = new Server(
    { name: "whoopsie", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_recent_failures",
        description:
          "List recent traces that fired at least one detector (loop, hallucination, cost spike, etc.). Use this when the user asks 'what's broken' or 'what failed today'.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Max number of failures to return (default 20, max 200).",
              default: 20,
            },
          },
        },
      },
      {
        name: "get_recent_traces",
        description:
          "List the most recent traces, regardless of whether they fired a detector. Use this when the user wants to see overall activity.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Max number of traces to return (default 20, max 200).",
              default: 20,
            },
          },
        },
      },
      {
        name: "get_trace",
        description:
          "Fetch one specific trace by its traceId. Returns full prompt, completion, tool calls, and any detector hits.",
        inputSchema: {
          type: "object",
          properties: {
            traceId: {
              type: "string",
              description: "The traceId, returned from list tools.",
            },
          },
          required: ["traceId"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as ToolCallArgs;

    switch (request.params.name) {
      case "get_recent_failures": {
        const limit = clampLimit(args.limit, 20);
        const data = await fetchTraces(fetchImpl, baseUrl, projectId, {
          limit,
          onlyFailures: true,
        });
        return { content: [{ type: "text", text: formatList(data, true) }] };
      }
      case "get_recent_traces": {
        const limit = clampLimit(args.limit, 20);
        const data = await fetchTraces(fetchImpl, baseUrl, projectId, {
          limit,
          onlyFailures: false,
        });
        return { content: [{ type: "text", text: formatList(data, false) }] };
      }
      case "get_trace": {
        const traceId = args.traceId;
        if (!traceId) {
          return {
            content: [{ type: "text", text: "error: traceId required" }],
            isError: true,
          };
        }
        const data = await fetchTraces(fetchImpl, baseUrl, projectId, {
          limit: 200,
          onlyFailures: false,
        });
        const match = data.events.find((e) => e.event.traceId === traceId);
        if (!match) {
          return {
            content: [
              {
                type: "text",
                text: `no trace ${traceId} in the recent buffer (max 200). It may have aged out.`,
              },
            ],
          };
        }
        return { content: [{ type: "text", text: formatTrace(match) }] };
      }
      default:
        return {
          content: [{ type: "text", text: `unknown tool ${request.params.name}` }],
          isError: true,
        };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function clampLimit(n: number | undefined, fallback: number): number {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 200);
}

async function fetchTraces(
  fetchImpl: typeof fetch,
  baseUrl: string,
  projectId: string,
  opts: { limit: number; onlyFailures: boolean },
): Promise<TracesResponse> {
  const url = new URL("/api/v1/traces", baseUrl);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("limit", String(opts.limit));
  if (opts.onlyFailures) url.searchParams.set("only", "failures");
  const res = await fetchImpl(url.toString(), {
    headers: { "x-whoopsie-project-id": projectId },
  });
  if (!res.ok) {
    throw new Error(`whoopsie ${baseUrl} returned ${res.status}`);
  }
  return (await res.json()) as TracesResponse;
}

function formatList(data: TracesResponse, failuresOnly: boolean): string {
  if (data.events.length === 0) {
    return failuresOnly
      ? `no failures in the last 200 traces for ${data.projectId}.`
      : `no traces for ${data.projectId} yet.`;
  }
  const lines = data.events.map((e) => {
    const ago = relativeTime(e.event.startTime);
    const tokens =
      (e.event.inputTokens ?? 0) + (e.event.outputTokens ?? 0) || "—";
    const hits =
      e.hits.length === 0
        ? "(clean)"
        : e.hits.map((h) => `${h.detector}/${h.severity}`).join(",");
    return `- ${e.event.traceId.slice(0, 8)} ${ago} ${e.event.model} ${tokens}t ${hits}`;
  });
  const header = failuresOnly
    ? `${data.events.length} recent failure(s) for ${data.projectId}:`
    : `${data.events.length} recent trace(s) for ${data.projectId}:`;
  return `${header}\n${lines.join("\n")}`;
}

function formatTrace(t: TraceWithHits): string {
  const out: string[] = [];
  out.push(`traceId: ${t.event.traceId}`);
  out.push(`when: ${new Date(t.event.startTime).toISOString()}`);
  out.push(`model: ${t.event.model}`);
  out.push(
    `tokens: in=${t.event.inputTokens ?? "?"} out=${t.event.outputTokens ?? "?"} cost=$${t.event.costUsd ?? "?"}`,
  );
  out.push(`finishReason: ${t.event.finishReason ?? "?"}`);
  if (t.event.prompt) {
    out.push(`\nprompt:\n${truncate(t.event.prompt, 1000)}`);
  }
  if (t.event.completion) {
    out.push(`\ncompletion:\n${truncate(t.event.completion, 1000)}`);
  }
  if (t.event.toolCalls.length > 0) {
    out.push(`\ntool calls (${t.event.toolCalls.length}):`);
    for (const tc of t.event.toolCalls) {
      out.push(`  - ${tc.toolName} (${tc.toolCallId})`);
    }
  }
  if (t.hits.length > 0) {
    out.push(`\ndetector hits:`);
    for (const h of t.hits) {
      out.push(`  - ${h.detector} (severity ${h.severity}): ${h.summary}`);
      if (h.fix) out.push(`    fix: ${h.fix}`);
    }
  }
  return out.join("\n");
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86_400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86_400)}d ago`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + "…";
}
