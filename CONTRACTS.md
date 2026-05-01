# Wire contracts

These shapes are shared across the SDK, the ingest endpoint, the SSE stream, and the dashboard. Don't change them without updating every consumer.

## SDK → ingest

```http
POST /api/v1/spans
Content-Type: application/json
X-Whoopsie-Project-Id: wh_<nanoid>

{
  "events": [TraceEvent, ...]
}
```

`TraceEvent` is defined in `packages/sdk/src/types.ts` and re-exported. Required fields: `projectId`, `traceId`, `spanId`, `startTime`, `endTime`, `model`, `toolCalls[]`, `metadata`. Optional: `prompt`, `completion`, `inputTokens`, `outputTokens`, `costUsd`, `finishReason`, `error`, `parentSpanId`.

Response: `{ "accepted": <n>, "detections": [{ traceId, hits: [DetectionResult] }] }`.

## Ingest → dashboard (SSE)

```http
GET /api/sse/<projectId>
Accept: text/event-stream
```

Events:

```
event: hello
data: {"projectId":"ws_xxx","recent":[<TraceWithHits>, ...]}

event: trace
data: {"event": <TraceEvent>, "hits": [<DetectionResult>, ...]}

event: heartbeat
data: {"t":<timestamp>}
```

`TraceWithHits = { event: TraceEvent; hits: DetectionResult[] }`.

The dashboard renders newest-first. Recent buffer cap: 200 events per project.

## Detector result

```ts
type DetectionResult = {
  detector: string;        // e.g. "loop"
  detected: boolean;
  severity: number;        // 0-100
  summary: string;         // one-line human-readable
  fix?: string;            // remediation hint
  evidence?: Record<string, unknown>;
};
```

Detectors run synchronously inside the POST /api/v1/spans handler. If a detector throws, the ingest still 200s and the failure is logged but not surfaced.

## Detector → trace shape

Detectors consume `AgentTrace` (in `packages/detectors/src/types.ts`). The ingest builds an `AgentTrace` from each `TraceEvent` by mapping `toolCalls` 1:1 and copying `prompt`/`completion`/tokens.

## Storage (v0)

In-memory only. `Map<projectId, RingBuffer<TraceWithHits>>` plus a Node `EventEmitter` per project. Rebuilds on server restart. Production move: Neon Postgres + LISTEN/NOTIFY (see plan).

## Auth (v0)

None. `WHOOPSIE_PROJECT_ID` is the entire identity. Anyone with the ID can read the project's stream. Acceptable for local dev and HN-launch trust posture; magic-link comes in v0.2.
