export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args?: unknown;
  result?: unknown;
  startTime: number;
  endTime?: number;
}

export interface TraceEvent {
  projectId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime: number;
  model: string;
  prompt?: string;
  completion?: string;
  /**
   * Reasoning / chain-of-thought content emitted by models that expose it
   * (o1, Claude extended thinking, Gemini thinking, etc.). Goes through the
   * same redact pipeline as `prompt` / `completion`.
   */
  reasoning?: string;
  toolCalls: ToolCall[];
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  finishReason?: string;
  error?: { message: string; name?: string };
  metadata: Record<string, unknown>;
}

export interface DetectionResult {
  detector: string;
  detected: boolean;
  severity: number;
  summary: string;
  fix?: string;
  evidence?: Record<string, unknown>;
}

export interface TraceWithHits {
  event: TraceEvent;
  hits: DetectionResult[];
}
