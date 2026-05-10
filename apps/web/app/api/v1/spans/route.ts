import { NextRequest, NextResponse } from "next/server";
import { runDetectors, type AgentTrace } from "@whoopsie/detectors";
import { redactObject, type RedactMode } from "@whoopsie/sdk";
import { getStore, publish } from "@/lib/bus";
import { sendFirstFailureAlerts } from "@/lib/alerts";
import {
  ipFromRequest,
  rateLimitSpansProject,
  rateLimitSpansRequest,
} from "@/lib/rate-limit";
import type { TraceEvent, ToolCall } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Server-side redaction is defense-in-depth. The SDK already redacts before
// transmission, but a direct API caller (curl, custom client, leaked SDK
// version with a bug) bypasses that. We always re-redact every event before
// it reaches the detector or Postgres, so raw PII never lands in our store.
const SERVER_REDACT_MODE: RedactMode = "standard";

// Allowlist of metadata keys that pass through unredacted. `contact` is the
// opt-in alert email and is validated/stored separately. Anything else under
// metadata is treated as free-form user content and scrubbed.
const METADATA_PASSTHROUGH_KEYS = new Set(["contact"]);

function scrubMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = METADATA_PASSTHROUGH_KEYS.has(k)
      ? v
      : redactObject(v, SERVER_REDACT_MODE);
  }
  return out;
}

function scrubEvent(event: TraceEvent): TraceEvent {
  return {
    ...event,
    prompt:
      event.prompt !== undefined
        ? redactObject(event.prompt, SERVER_REDACT_MODE)
        : undefined,
    completion:
      event.completion !== undefined
        ? redactObject(event.completion, SERVER_REDACT_MODE)
        : undefined,
    toolCalls: event.toolCalls.map(
      (tc): ToolCall => ({
        ...tc,
        args: redactObject(tc.args, SERVER_REDACT_MODE),
        result: redactObject(tc.result, SERVER_REDACT_MODE),
      }),
    ),
    error: event.error
      ? {
          ...event.error,
          message: redactObject(event.error.message, SERVER_REDACT_MODE),
        }
      : undefined,
    metadata: scrubMetadata(event.metadata ?? {}),
  };
}
// In-memory short-circuit so we don't hit the store on every event for the
// same {projectId, email} pair. Cleared on cold start; safe.
const seenContacts = new Set<string>();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Per-IP request rate limit. Drops anonymous floods before they touch
  // anything else.
  const ip = ipFromRequest(req);
  const ipGate = rateLimitSpansRequest(ip);
  if (!ipGate.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        scope: "ip",
        retryAfterSec: ipGate.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(ipGate.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = parseEvents(body);
  if (!parsed) {
    return NextResponse.json({ error: "missing events array" }, { status: 400 });
  }
  const { events, malformedCount } = parsed;
  if (events.length + malformedCount > 200) {
    return NextResponse.json(
      { error: "events array too large (max 200 per request)" },
      { status: 413 },
    );
  }

  const headerPid = req.headers.get("x-whoopsie-project-id");

  // Per-project event rate limit. Counts events not requests, so a batch
  // of 100 burns 100 budget. Limited per project_id, per minute.
  const projectIds = new Map<string, number>();
  for (const e of events) {
    const pid = e.projectId || headerPid;
    if (pid) projectIds.set(pid, (projectIds.get(pid) ?? 0) + 1);
  }
  for (const [pid, n] of projectIds) {
    const projectGate = rateLimitSpansProject(pid, n);
    if (!projectGate.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          scope: "project",
          projectId: pid,
          retryAfterSec: projectGate.retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(projectGate.retryAfterSec) },
        },
      );
    }
  }

  const detections: { traceId: string; hits: ReturnType<typeof runDetectors> }[] = [];
  const failed: { traceId: string; reason: string }[] = [];
  let persisted = 0;
  let missingProjectId = 0;

  for (const rawEvent of events) {
    const projectId = rawEvent.projectId || headerPid;
    if (!projectId) {
      missingProjectId += 1;
      failed.push({ traceId: rawEvent.traceId, reason: "missing_project_id" });
      continue;
    }

    // Defense-in-depth scrub. Everything past this point sees redacted text;
    // raw user PII never reaches detectors, the bus, alerts, or Postgres.
    // The opt-in contact email in metadata is preserved (it's a deliverable
    // address, not user data).
    const event = scrubEvent(rawEvent);

    const trace: AgentTrace = {
      traceId: event.traceId,
      startTime: event.startTime,
      endTime: event.endTime,
      model: event.model,
      prompt: event.prompt,
      completion: event.completion,
      toolCalls: event.toolCalls.map((t) => ({
        toolName: t.toolName,
        args: t.args,
        result: t.result,
        startTime: t.startTime,
      })),
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      costUsd: event.costUsd,
      finishReason: event.finishReason,
    };

    let hits: ReturnType<typeof runDetectors> = [];
    try {
      hits = runDetectors(trace);
    } catch (err) {
      console.error("[whoopsie] detector error", err);
    }

    // Persistence is the only step that determines `accepted`. If publish
    // throws, the row didn't make it to Postgres — surface the failure so
    // a retry-aware client can resend, instead of silently losing data.
    try {
      await publish(projectId, { event, hits });
      persisted += 1;
      detections.push({ traceId: event.traceId, hits });
    } catch (err) {
      console.error("[whoopsie] publish error", err);
      failed.push({ traceId: event.traceId, reason: "persist_failed" });
      // Skip downstream side-effects (contact capture, alerts) when the
      // canonical record didn't persist — they'd be ghosts otherwise.
      continue;
    }

    // Auto-capture contact email from SDK middleware metadata.
    const contact =
      typeof event.metadata?.contact === "string"
        ? event.metadata.contact.trim().toLowerCase()
        : "";
    if (contact && EMAIL_RE.test(contact)) {
      const cacheKey = `${projectId}:${contact}`;
      if (!seenContacts.has(cacheKey)) {
        seenContacts.add(cacheKey);
        try {
          const store = await getStore();
          await store.saveContact({
            projectId,
            email: contact,
            source: "sdk_middleware",
            createdAt: Date.now(),
          });
        } catch (err) {
          console.error("[whoopsie] saveContact error", err);
          seenContacts.delete(cacheKey);
        }
      }
    }

    // First-failure email alerts. No-op when RESEND_API_KEY is unset, when
    // there are no hits, or when there are no contacts awaiting alerts.
    if (hits.length > 0) {
      try {
        const store = await getStore();
        await sendFirstFailureAlerts(store, projectId, { event, hits });
      } catch (err) {
        console.error("[whoopsie] alert send error", err);
      }
    }
  }

  const submitted = events.length + malformedCount;
  const rejected = {
    malformed: malformedCount,
    missingProjectId,
    persistFailed: failed.filter((f) => f.reason === "persist_failed").length,
  };
  const body207 = { accepted: persisted, submitted, detections, failed, rejected };

  // All events failed to persist → upstream durability error.
  if (persisted === 0 && rejected.persistFailed > 0) {
    return NextResponse.json({ ...body207, error: "persist_failed" }, { status: 502 });
  }
  // Partial drops → 207 Multi-Status so retry-aware clients can act.
  if (persisted < submitted) {
    return NextResponse.json(body207, { status: 207 });
  }
  return NextResponse.json({ accepted: persisted, detections });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, x-whoopsie-project-id",
    },
  });
}

function parseEvents(
  body: unknown,
): { events: TraceEvent[]; malformedCount: number } | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { events?: unknown }).events;
  if (!Array.isArray(raw)) return null;
  const events: TraceEvent[] = [];
  let malformedCount = 0;
  for (const v of raw) {
    if (isTraceEvent(v)) events.push(v);
    else malformedCount += 1;
  }
  return { events, malformedCount };
}

function isTraceEvent(v: unknown): v is TraceEvent {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.traceId === "string" &&
    typeof e.spanId === "string" &&
    typeof e.startTime === "number" &&
    typeof e.endTime === "number" &&
    typeof e.model === "string" &&
    Array.isArray(e.toolCalls)
  );
}
