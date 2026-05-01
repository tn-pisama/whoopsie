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
    try {
      await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-whoopsie-project-id": this.projectId,
        },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
    } catch {
      // Silent failure: telemetry must never break the host app.
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
