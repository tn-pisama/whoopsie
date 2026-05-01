export interface ToolEvent {
  toolName: string;
  args?: unknown;
  result?: unknown;
  startTime: number;
}

export interface AgentTrace {
  traceId: string;
  startTime: number;
  endTime?: number;
  model?: string;
  prompt?: string;
  completion?: string;
  toolCalls: ToolEvent[];
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export interface DetectionResult {
  detector: string;
  detected: boolean;
  severity: number;
  summary: string;
  fix?: string;
  evidence?: Record<string, unknown>;
}

export interface Detector {
  name: string;
  description: string;
  detect(trace: AgentTrace): DetectionResult;
}

export const noIssue = (detector: string): DetectionResult => ({
  detector,
  detected: false,
  severity: 0,
  summary: "no issue detected",
});
