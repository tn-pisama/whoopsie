import { nanoid } from "nanoid";
import type { LanguageModelV3Middleware } from "@ai-sdk/provider";
import { redactObject, type RedactMode } from "./redact.js";
import { TraceExporter } from "./exporter.js";
import type { ToolCall, TraceEvent } from "./types.js";

export interface WhoopsieMiddlewareOptions {
  projectId?: string;
  endpoint?: string;
  redact?: RedactMode;
  enabled?: boolean;
  exporter?: TraceExporter;
  /**
   * Optional contact email. Embedded into each TraceEvent's `metadata.contact`
   * so the dashboard can ping you when whoopsie ships paid alerts. Opt-in.
   */
  contact?: string;
}

interface ModelLike {
  modelId?: string;
  provider?: string;
}

interface ParamsLike {
  prompt?: unknown;
  messages?: unknown;
}

interface UsageLike {
  inputTokens?: { total?: number };
  outputTokens?: { total?: number };
}

interface ContentPartLike {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  input?: string;
}

interface GenerateResultLike {
  content?: ContentPartLike[];
  finishReason?: string;
  usage?: UsageLike;
}

interface StreamPartLike {
  type: string;
  delta?: string;
  toolCallId?: string;
  toolName?: string;
  input?: string;
  finishReason?: string;
  usage?: UsageLike;
}

interface MiddlewareWrapGenerateArgs {
  doGenerate: () => PromiseLike<GenerateResultLike>;
  doStream: () => PromiseLike<{ stream: ReadableStream<StreamPartLike> }>;
  params: ParamsLike;
  model: ModelLike;
}

interface MiddlewareWrapStreamArgs {
  doGenerate: () => PromiseLike<GenerateResultLike>;
  doStream: () => PromiseLike<{ stream: ReadableStream<StreamPartLike> }>;
  params: ParamsLike;
  model: ModelLike;
}

export interface WhoopsieLanguageModelMiddleware {
  readonly specificationVersion: "v3";
  wrapGenerate: (
    args: MiddlewareWrapGenerateArgs,
  ) => Promise<GenerateResultLike>;
  wrapStream: (
    args: MiddlewareWrapStreamArgs,
  ) => Promise<{ stream: ReadableStream<StreamPartLike> }>;
}

export function whoopsieMiddleware(
  opts: WhoopsieMiddlewareOptions = {},
): LanguageModelV3Middleware {
  const inner: WhoopsieLanguageModelMiddleware = buildMiddleware(opts);
  return inner as unknown as LanguageModelV3Middleware;
}

function buildMiddleware(
  opts: WhoopsieMiddlewareOptions = {},
): WhoopsieLanguageModelMiddleware {
  const projectId =
    opts.projectId ??
    (typeof process !== "undefined" ? process.env.WHOOPSIE_PROJECT_ID : undefined);

  const enabled = opts.enabled !== false && Boolean(projectId);
  const redactMode: RedactMode = opts.redact ?? "standard";

  const noopGenerate = async ({ doGenerate }: MiddlewareWrapGenerateArgs) =>
    doGenerate();
  const noopStream = async ({ doStream }: MiddlewareWrapStreamArgs) =>
    doStream();

  if (!enabled || !projectId) {
    return {
      specificationVersion: "v3",
      wrapGenerate: noopGenerate,
      wrapStream: noopStream,
    };
  }

  const exporter =
    opts.exporter ?? new TraceExporter({ projectId, endpoint: opts.endpoint });
  const baseMetadata: Record<string, unknown> = {};
  if (opts.contact && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(opts.contact)) {
    baseMetadata.contact = opts.contact;
  }

  return {
    specificationVersion: "v3",

    async wrapGenerate({ doGenerate, params, model }) {
      const traceId = nanoid();
      const spanId = nanoid();
      const startTime = Date.now();
      try {
        const result = await doGenerate();
        exporter.enqueue(
          buildFromGenerate({
            projectId,
            traceId,
            spanId,
            startTime,
            endTime: Date.now(),
            model,
            params,
            result,
            redactMode,
            metadata: baseMetadata,
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
            model,
            params,
            error,
            redactMode,
            metadata: baseMetadata,
          }),
        );
        throw error;
      }
    },

    async wrapStream({ doStream, params, model }) {
      const traceId = nanoid();
      const spanId = nanoid();
      const startTime = Date.now();

      let upstream: { stream: ReadableStream<StreamPartLike> };
      try {
        upstream = await doStream();
      } catch (error) {
        exporter.enqueue(
          buildErrorEvent({
            projectId,
            traceId,
            spanId,
            startTime,
            endTime: Date.now(),
            model,
            params,
            error,
            redactMode,
            metadata: baseMetadata,
          }),
        );
        throw error;
      }

      const collected: StreamCollector = {
        text: "",
        toolCalls: [],
        usage: undefined,
        finishReason: undefined,
      };

      const tap = new TransformStream<StreamPartLike, StreamPartLike>({
        transform(chunk, controller) {
          collectChunk(chunk, collected);
          controller.enqueue(chunk);
        },
        flush() {
          exporter.enqueue(
            buildFromStream({
              projectId,
              traceId,
              spanId,
              startTime,
              endTime: Date.now(),
              model,
              params,
              collected,
              redactMode,
              metadata: baseMetadata,
            }),
          );
        },
      });

      return { stream: upstream.stream.pipeThrough(tap) };
    },
  };
}

interface StreamCollector {
  text: string;
  toolCalls: ToolCall[];
  usage: UsageLike | undefined;
  finishReason: string | undefined;
}

function collectChunk(chunk: StreamPartLike, c: StreamCollector): void {
  if (chunk.type === "text-delta" && typeof chunk.delta === "string") {
    c.text += chunk.delta;
    return;
  }
  if (chunk.type === "tool-call") {
    c.toolCalls.push({
      toolCallId: String(chunk.toolCallId ?? ""),
      toolName: String(chunk.toolName ?? ""),
      args: parseJson(chunk.input),
      startTime: Date.now(),
    });
    return;
  }
  if (chunk.type === "finish") {
    if (typeof chunk.finishReason === "string") c.finishReason = chunk.finishReason;
    if (chunk.usage) c.usage = chunk.usage;
  }
}

function parseJson(s: string | undefined): unknown {
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

interface BuildArgs {
  projectId: string;
  traceId: string;
  spanId: string;
  startTime: number;
  endTime: number;
  model: ModelLike;
  params: ParamsLike;
  redactMode: RedactMode;
  metadata: Record<string, unknown>;
}

function buildFromGenerate(
  args: BuildArgs & { result: GenerateResultLike },
): TraceEvent {
  const { result, model, ...rest } = args;
  const text = (result.content ?? [])
    .filter((c): c is ContentPartLike & { text: string } => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("");
  const toolCalls: ToolCall[] = (result.content ?? [])
    .filter((c) => c.type === "tool-call")
    .map((c) => ({
      toolCallId: String(c.toolCallId ?? ""),
      toolName: String(c.toolName ?? ""),
      args: parseJson(c.input),
      startTime: rest.startTime,
    }));

  return {
    projectId: rest.projectId,
    traceId: rest.traceId,
    spanId: rest.spanId,
    startTime: rest.startTime,
    endTime: rest.endTime,
    model: model.modelId ?? "",
    prompt: extractPromptStr(rest.params, rest.redactMode),
    completion: text ? redactObject(text, rest.redactMode) : undefined,
    toolCalls,
    inputTokens: result.usage?.inputTokens?.total,
    outputTokens: result.usage?.outputTokens?.total,
    finishReason: result.finishReason,
    metadata: { ...rest.metadata },
  };
}

function buildFromStream(
  args: BuildArgs & { collected: StreamCollector },
): TraceEvent {
  const { collected, model, ...rest } = args;
  return {
    projectId: rest.projectId,
    traceId: rest.traceId,
    spanId: rest.spanId,
    startTime: rest.startTime,
    endTime: rest.endTime,
    model: model.modelId ?? "",
    prompt: extractPromptStr(rest.params, rest.redactMode),
    completion: collected.text
      ? redactObject(collected.text, rest.redactMode)
      : undefined,
    toolCalls: collected.toolCalls,
    inputTokens: collected.usage?.inputTokens?.total,
    outputTokens: collected.usage?.outputTokens?.total,
    finishReason: collected.finishReason,
    metadata: { ...rest.metadata },
  };
}

function buildErrorEvent(args: BuildArgs & { error: unknown }): TraceEvent {
  const err = args.error as { message?: string; name?: string };
  return {
    projectId: args.projectId,
    traceId: args.traceId,
    spanId: args.spanId,
    startTime: args.startTime,
    endTime: args.endTime,
    model: args.model.modelId ?? "",
    prompt: extractPromptStr(args.params, args.redactMode),
    toolCalls: [],
    error: { message: err?.message ?? "unknown", name: err?.name },
    metadata: { ...args.metadata },
  };
}

function extractPromptStr(
  params: ParamsLike,
  mode: RedactMode,
): string | undefined {
  const value = params.prompt ?? params.messages;
  if (value == null) return undefined;
  return redactObject(JSON.stringify(value), mode);
}
