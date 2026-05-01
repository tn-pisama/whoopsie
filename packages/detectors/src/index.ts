export type {
  AgentTrace,
  Detector,
  DetectionResult,
  ToolEvent,
} from "./types.js";
export { noIssue } from "./types.js";
export {
  detectLoop,
  loopDetector,
  checkConsecutive,
  detectCycle,
  checkDiversity,
} from "./loop.js";

import { loopDetector } from "./loop.js";
import type { AgentTrace, Detector, DetectionResult } from "./types.js";

export const v1Detectors: Detector[] = [loopDetector];

export function runDetectors(
  trace: AgentTrace,
  detectors: Detector[] = v1Detectors,
): DetectionResult[] {
  return detectors.map((d) => d.detect(trace)).filter((r) => r.detected);
}
