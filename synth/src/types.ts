export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args?: unknown;
  startTime: number;
}

export interface TraceEvent {
  projectId: string;
  traceId: string;
  spanId: string;
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
  metadata: Record<string, unknown>;
}

export interface Persona {
  name: string;
  projectId: string;
  description: string;
  /** Mean delay between events in ms; agent will jitter ±50%. */
  intervalMs: number;
  /** Generate the next event for this persona. */
  next(): TraceEvent;
}
