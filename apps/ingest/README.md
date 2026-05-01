## @whoopsie/ingest

Vercel Functions that accept OTEL spans from `@whoopsie/sdk` and fan them out to the dashboard SSE stream.

- `api/v1/spans/route.ts` — POST endpoint that the SDK exporter calls.
- Persists to Neon Postgres, partitioned by `project_id`.
- Triggers SSE broadcast via Postgres LISTEN/NOTIFY.
- Runs detectors from `@whoopsie/detectors` synchronously on each batch and persists hits.

Region: Fluid Compute, closest-to-user.
