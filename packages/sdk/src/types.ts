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
  toolCalls: ToolCall[];
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  finishReason?: string;
  error?: { message: string; name?: string };
  metadata: Record<string, unknown>;
}
