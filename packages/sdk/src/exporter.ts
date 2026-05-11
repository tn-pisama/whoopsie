import type { TraceEvent } from "./types.js";

export interface ExporterOptions {
  endpoint?: string;
  projectId: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  fetchImpl?: typeof fetch;
}

const HOSTED_ENDPOINT = "https://whoopsie.dev/api/v1/spans";

function defaultEndpoint(): string {
  if (typeof process !== "undefined" && process.env.WHOOPSIE_INGEST_URL) {
    return process.env.WHOOPSIE_INGEST_URL;
  }
  return HOSTED_ENDPOINT;
}

export class TraceExporter {
  private buffer: TraceEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly endpoint: string;
  private readonly projectId: string;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ExporterOptions) {
    this.endpoint = opts.endpoint ?? defaultEndpoint();
    this.projectId = opts.projectId;
    this.flushIntervalMs = opts.flushIntervalMs ?? 1000;
    this.maxBatchSize = opts.maxBatchSize ?? 32;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  enqueue(event: TraceEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.maxBatchSize) {
      void this.flush();
      return;
    }
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    if (typeof (this.timer as { unref?: () => void }).unref === "function") {
      (this.timer as { unref: () => void }).unref();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      this.clearTimer();
      return;
    }
    const batch = this.buffer.splice(0, this.buffer.length);
    const silent =
      typeof process !== "undefined" && process.env.WHOOPSIE_SILENT === "1";
    const debug =
      typeof process !== "undefined" && process.env.WHOOPSIE_DEBUG === "1";
    try {
      const res = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-whoopsie-project-id": this.projectId,
        },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
      if (debug) {
        console.log(
          `[whoopsie] flushed ${batch.length} event(s) → HTTP ${res.status}`,
        );
      }
      // The ingest API returns 207 Multi-Status when only some events in the
      // batch were persisted (e.g. some were malformed, or persist_failed
      // mid-batch). Always surface this — silent partial drop is exactly the
      // failure mode we're trying not to ship. In debug mode, log each
      // failed event's reason.
      if (res.status === 207 && !silent) {
        try {
          const body = (await res
            .clone()
            .json()
            .catch(() => null)) as {
            accepted?: number;
            submitted?: number;
            failed?: Array<{ traceId: string; reason: string }>;
          } | null;
          const failed = body?.failed ?? [];
          const accepted = body?.accepted ?? "?";
          const submitted = body?.submitted ?? batch.length;
          console.warn(
            `[whoopsie] partial flush: ${accepted}/${submitted} accepted, ${failed.length} dropped`,
          );
          if (debug) {
            for (const f of failed) {
              console.warn(
                `[whoopsie]   - traceId=${f.traceId} reason=${f.reason}`,
              );
            }
          }
        } catch {
          if (debug) {
            console.warn(
              `[whoopsie] partial flush (HTTP 207) but response body could not be parsed`,
            );
          }
        }
      }
    } catch (err) {
      // Silent in production: telemetry must never break the host app. Debug
      // mode surfaces the underlying error so misconfigured network egress
      // (sandboxed runtimes, blocked outbound, etc.) shows up.
      if (debug) {
        console.warn(
          `[whoopsie] flush failed (suppressed in production):`,
          (err as Error)?.message ?? err,
        );
      }
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
