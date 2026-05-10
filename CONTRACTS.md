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

## Storage

Postgres (Neon, us-east-1) via the Vercel Marketplace integration. Connection string lives in `DATABASE_URL`.

- Table `whoopsie_traces (id bigserial, project_id text, payload jsonb, created_at timestamptz)` with index on `(project_id, id desc)`.
- LISTEN/NOTIFY on channel `whoopsie_traces` drives the SSE bus.
- 7-day TTL via daily Vercel Cron at `/api/internal/cleanup`.
- Defense-in-depth: every event is re-redacted on the server before INSERT (see `apps/web/app/api/v1/spans/route.ts:scrubEvent`), so direct callers bypassing the SDK can't poison the store.

`apps/web/lib/store.ts` also ships an in-memory implementation as the dev-only fallback when `DATABASE_URL` is unset.

## Auth

None. `WHOOPSIE_PROJECT_ID` is the entire identity — anyone who knows it can post events and read the project's stream. Acceptable for v0; rate limits are per-IP and per-project. Authenticated tier is on the roadmap.
