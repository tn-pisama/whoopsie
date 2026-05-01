## @whoops/detectors

TypeScript-native failure detectors for AI agent traces. Pure functions, zero runtime dependencies, no LLM calls.

```ts
import { runDetectors, v1Detectors } from "@whoops/detectors";

const hits = runDetectors({
  traceId: "t1",
  startTime: 0,
  toolCalls: [
    { toolName: "search", startTime: 0 },
    { toolName: "search", startTime: 1 },
    { toolName: "search", startTime: 2 },
    { toolName: "search", startTime: 3 },
    { toolName: "search", startTime: 4 },
  ],
});
// hits[0]: { detector: "loop", detected: true, severity: 50, ... }
```

### Algorithms

The v1 pack ports a subset of the [Pisama](https://pisama.ai) detector library to TypeScript. Same algorithms, simplified to drop platform overrides and async.

- **loop** — consecutive repetition, cyclic patterns (A→B→A→B), low tool diversity
- (more shipping in v1)

### Adding a detector

```ts
import type { Detector } from "@whoops/detectors";

export const myDetector: Detector = {
  name: "my_detector",
  description: "what it catches",
  detect(trace) {
    // return { detector, detected, severity, summary, fix?, evidence? }
  },
};
```

### License

MIT
