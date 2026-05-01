import { nanoid } from "nanoid";
import { redactObject, type RedactMode } from "./redact.js";
import { TraceExporter } from "./exporter.js";
import type { ToolCall, TraceEvent } from "./types.js";

export interface WhoopsMiddlewareOptions {
  projectId?: string;
  endpoint?: string;
  redact?: RedactMode;
  enabled?: boolean;
}

interface LanguageModelMiddleware {
  wrapGenerate?: (args: {
    doGenerate: () => Promise<unknown>;
    params: unknown;
    model: { modelId: string };
  }) => Promise<unknown>;
  wrapStream?: (args: {
    doStream: () => Promise<{ stream: ReadableStream<unknown> }>;
    params: unknown;
    model: { modelId: string };
  }) => Promise<{ stream: ReadableStream<unknown> }>;
}

export function whoopsMiddleware(
  opts: WhoopsMiddlewareOptions = {},
): LanguageModelMiddleware {
  const projectId =
    opts.projectId ??
    (typeof process !== "undefined" ? process.env.WHOOPS_PROJECT_ID : undefined);

  const enabled = opts.enabled !== false && Boolean(projectId);
  const redactMode: RedactMode = opts.redact ?? "standard";

  if (!enabled || !projectId) {
    return {};
  }

  const exporter = new TraceExporter({ projectId, endpoint: opts.endpoint });

  return {
    wrapGenerate: async ({ doGenerate, params, model }) => {
      const traceId = nanoid();
      const spanId = nanoid();
      const startTime = Date.now();
      try {
        const result = (await doGenerate()) as Record<string, unknown>;
        exporter.enqueue(
          buildTraceEvent({
            projectId,
            traceId,
            spanId,
            startTime,
            endTime: Date.now(),
            model: model.modelId,
            params,
            result,
            redactMode,
          }),
        );
        return result;
      } catch (error) {
        exporter.enqueue(
          buildErrorEvent({
            projectId,
            traceId,
            spanId,
            startTime,
            endTime: Date.now(),
            model: model.modelId,
            params,
            error,
            redactMode,
          }),
        );
        throw error;
      }
    },
    wrapStream: async ({ doStream, params, model }) => {
      const traceId = nanoid();
      const spanId = nanoid();
      const startTime = Date.now();
      const { stream } = await doStream();

      const collected: { text: string; toolCalls: ToolCall[] } = {
        text: "",
        toolCalls: [],
      };

      const tap = new TransformStream<unknown, unknown>({
        transform(chunk, controller) {
          collectChunk(chunk, collected);
          controller.enqueue(chunk);
        },
        flush() {
          exporter.enqueue(
            buildTraceEventFromStream({
              projectId,
              traceId,
              spanId,
              startTime,
              endTime: Date.now(),
              model: model.modelId,
              params,
              collected,
              redactMode,
            }),
          );
        },
      });

      return { stream: stream.pipeThrough(tap) };
    },
  };
}

function collectChunk(
  chunk: unknown,
  collected: { text: string; toolCalls: ToolCall[] },
): void {
  if (!chunk || typeof chunk !== "object") return;
  const c = chunk as Record<string, unknown>;
  if (c.type === "text-delta" && typeof c.textDelta === "string") {
    collected.text += c.textDelta;
  } else if (c.type === "tool-call") {
    collected.toolCalls.push({
      toolCallId: String(c.toolCallId ?? ""),
      toolName: String(c.toolName ?? ""),
      args: c.args,
      startTime: Date.now(),
    });
  }
}

interface BuildEventArgs {
  projectId: string;
  traceId: string;
  spanId: string;
  startTime: number;
  endTime: number;
  model: string;
  params: unknown;
  redactMode: RedactMode;
}

function buildTraceEvent(
  args: BuildEventArgs & { result: Record<string, unknown> },
): TraceEvent {
  const { result, ...rest } = args;
  const usage = (result.usage ?? {}) as Record<string, number>;
  return {
    projectId: rest.projectId,
    traceId: rest.traceId,
    spanId: rest.spanId,
    startTime: rest.startTime,
    endTime: rest.endTime,
    model: rest.model,
    prompt: extractPrompt(rest.params, rest.redactMode),
    completion: redactObject(asString(result.text), rest.redactMode),
    toolCalls: extractToolCalls(result.toolCalls),
    inputTokens: usage.promptTokens ?? usage.inputTokens,
    outputTokens: usage.completionTokens ?? usage.outputTokens,
    finishReason: asString(result.finishReason),
    metadata: {},
  };
}

function buildTraceEventFromStream(args: BuildEventArgs & {
  collected: { text: string; toolCalls: ToolCall[] };
}): TraceEvent {
  return {
    projectId: args.projectId,
    traceId: args.traceId,
    spanId: args.spanId,
    startTime: args.startTime,
    endTime: args.endTime,
    model: args.model,
    prompt: extractPrompt(args.params, args.redactMode),
    completion: redactObject(args.collected.text, args.redactMode),
    toolCalls: args.collected.toolCalls,
    metadata: {},
  };
}

function buildErrorEvent(args: BuildEventArgs & { error: unknown }): TraceEvent {
  const err = args.error as { message?: string; name?: string };
  return {
    projectId: args.projectId,
    traceId: args.traceId,
    spanId: args.spanId,
    startTime: args.startTime,
    endTime: args.endTime,
    model: args.model,
    prompt: extractPrompt(args.params, args.redactMode),
    toolCalls: [],
    error: { message: err?.message ?? "unknown", name: err?.name },
    metadata: {},
  };
}

function extractPrompt(params: unknown, mode: RedactMode): string | undefined {
  if (!params || typeof params !== "object") return undefined;
  const p = params as Record<string, unknown>;
  const prompt = p.prompt ?? p.messages;
  if (!prompt) return undefined;
  return redactObject(JSON.stringify(prompt), mode);
}

function extractToolCalls(value: unknown): ToolCall[] {
  if (!Array.isArray(value)) return [];
  return value.map((tc) => {
    const c = tc as Record<string, unknown>;
    return {
      toolCallId: String(c.toolCallId ?? ""),
      toolName: String(c.toolName ?? ""),
      args: c.args,
      startTime: Date.now(),
    };
  });
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
