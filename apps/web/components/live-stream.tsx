"use client";

import { useEffect, useMemo, useState } from "react";
import { GeistMono } from "geist/font/mono";
import type { TraceWithHits } from "@/lib/types";
import {
  formatDuration,
  formatRelativeTime,
  formatTokens,
  severityTone,
  truncate,
} from "@/lib/format";
import { detectorCopy } from "@/lib/detector-copy";
import { PulseDot } from "./pulse-dot";

type Status = "connecting" | "live" | "reconnecting" | "error";
const UI_CAP = 50;

export function LiveStream({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<TraceWithHits[]>([]);
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    const es = new EventSource(`/api/sse/${projectId}`);

    es.addEventListener("hello", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as {
          recent: TraceWithHits[];
        };
        setEvents(data.recent.slice(-UI_CAP).reverse());
        setStatus("live");
      } catch {
        // ignore
      }
    });

    es.addEventListener("trace", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as TraceWithHits;
        setEvents((prev) => [data, ...prev].slice(0, UI_CAP));
      } catch {
        // ignore
      }
    });

    es.addEventListener("heartbeat", () => {
      setStatus("live");
    });

    es.onopen = () => setStatus("live");
    es.onerror = () => {
      setStatus(es.readyState === EventSource.CLOSED ? "error" : "reconnecting");
    };

    return () => {
      es.close();
    };
  }, [projectId]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <Header projectId={projectId} status={status} count={events.length} />
      {events.length === 0 ? (
        <EmptyState projectId={projectId} status={status} />
      ) : (
        <ul className="mt-8 space-y-3">
          {events.map((e) => (
            <EventRow key={`${e.event.traceId}:${e.event.spanId}`} item={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Header({
  projectId,
  status,
  count,
}: {
  projectId: string;
  status: Status;
  count: number;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-coral pb-4">
      <div className="flex items-baseline justify-between">
        <span
          className={`${GeistMono.className} text-lg lowercase tracking-tight`}
        >
          whoopsie
        </span>
        <span className="flex items-center gap-2 font-mono text-xs text-ink-muted">
          <PulseDot />
          {status === "live" && `live · ${count} event${count === 1 ? "" : "s"}`}
          {status === "connecting" && "connecting…"}
          {status === "reconnecting" && "reconnecting…"}
          {status === "error" && "disconnected"}
        </span>
      </div>
      <span className={`${GeistMono.className} text-xs text-ink-muted`}>
        project: {projectId}
      </span>
    </header>
  );
}

function EmptyState({
  projectId,
  status,
}: {
  projectId: string;
  status: Status;
}) {
  return (
    <div className="mt-24 flex flex-col items-center gap-6 text-center">
      <PulseDot className="h-3 w-3" />
      <h1 className="text-2xl font-semibold tracking-tight">
        Waiting for your first event…
      </h1>
      <p className="max-w-md text-ink-muted">
        Open your app and send a chat message. The first call will land here
        within a second.
      </p>
      <div className="rounded-md border border-line bg-white px-4 py-3 font-mono text-xs text-ink-soft">
        <span className="text-ink-muted">WHOOPSIE_PROJECT_ID=</span>
        {projectId}
      </div>
      <a
        href={`/install?id=${projectId}`}
        className="font-mono text-xs text-ink-muted hover:text-coral"
      >
        haven&apos;t installed yet? get the prompt →
      </a>
      {status !== "live" && status !== "connecting" && (
        <p className="font-mono text-xs text-ink-muted">
          stream status: {status}
        </p>
      )}
    </div>
  );
}

function EventRow({ item }: { item: TraceWithHits }) {
  const { event, hits } = item;
  const duration = event.endTime - event.startTime;
  const totalTokens =
    (event.inputTokens ?? 0) + (event.outputTokens ?? 0) || undefined;

  return (
    <li className="rounded-md border border-line bg-white">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 text-sm">
          <span className={`${GeistMono.className} font-medium`}>
            {event.model || "unknown-model"}
          </span>
          <span className="text-ink-muted">
            {formatRelativeTime(event.startTime)}
          </span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink-muted">{formatDuration(duration)}</span>
          {totalTokens != null && (
            <>
              <span className="text-ink-muted">·</span>
              <span className="text-ink-muted">
                {formatTokens(totalTokens)} tok
              </span>
            </>
          )}
          {event.finishReason && (
            <span className={`${GeistMono.className} ml-auto text-xs text-ink-muted`}>
              {event.finishReason}
            </span>
          )}
          {hits.length > 0 && (
            <span className="ml-2 flex flex-wrap gap-1">
              {hits.map((h) => (
                <Hit key={h.detector} hit={h} />
              ))}
            </span>
          )}
        </summary>
        <EventDetail item={item} />
      </details>
    </li>
  );
}

function Hit({ hit }: { hit: { detector: string; severity: number } }) {
  const tone = severityTone(hit.severity);
  const cls =
    tone === "high"
      ? "border-coral text-coral bg-coral-soft"
      : tone === "medium"
      ? "border-coral text-coral"
      : "border-line text-ink-muted";
  const copy = detectorCopy(hit.detector);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] ${cls}`}
      title={`${hit.detector} (severity ${hit.severity})`}
    >
      {copy.title}
      <span className={`${GeistMono.className} text-[9px] opacity-60`}>
        {hit.detector}
      </span>
    </span>
  );
}

function EventDetail({ item }: { item: TraceWithHits }) {
  const { event, hits } = item;
  const promptText = useMemo(() => truncate(event.prompt, 800), [event.prompt]);
  const completionText = useMemo(
    () => truncate(event.completion, 800),
    [event.completion],
  );

  return (
    <div className="space-y-4 border-t border-line px-4 py-4 text-sm">
      {hits.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-mono text-xs uppercase text-ink-muted">
            detections
          </h3>
          {hits.map((h) => {
            const copy = detectorCopy(h.detector);
            return (
              <div
                key={h.detector}
                className="rounded-md border border-coral/40 bg-coral-soft/40 p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{copy.title}</p>
                    <p className="text-xs text-ink-muted">{copy.blurb}</p>
                  </div>
                  <span className={`${GeistMono.className} text-xs text-ink-muted whitespace-nowrap`}>
                    {h.detector} · sev {h.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{h.summary}</p>
                {h.fix && (
                  <p className="mt-2 text-sm text-ink-muted">→ {h.fix}</p>
                )}
                {h.evidence && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">
                      raw evidence
                    </summary>
                    <pre className={`${GeistMono.className} mt-2 max-h-48 overflow-auto rounded bg-paper p-2 text-[11px] leading-5`}>
                      {JSON.stringify(h.evidence, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
      {event.prompt && (
        <Section label="prompt">
          <pre className={`${GeistMono.className} whitespace-pre-wrap text-[12px] leading-5`}>{promptText}</pre>
        </Section>
      )}
      {event.completion && (
        <Section label="completion">
          <pre className={`${GeistMono.className} whitespace-pre-wrap text-[12px] leading-5`}>{completionText}</pre>
        </Section>
      )}
      {event.toolCalls.length > 0 && (
        <Section label={`tool calls (${event.toolCalls.length})`}>
          <ul className="space-y-1 font-mono text-xs">
            {event.toolCalls.map((tc) => (
              <li key={tc.toolCallId} className="text-ink-soft">
                {tc.toolName}
                {tc.args ? (
                  <span className="text-ink-muted">
                    {" "}
                    {truncate(JSON.stringify(tc.args), 120)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {event.error && (
        <Section label="error">
          <pre className={`${GeistMono.className} text-[12px] text-coral`}>{event.error.name ? `${event.error.name}: ` : ""}{event.error.message}</pre>
        </Section>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-mono text-xs uppercase text-ink-muted">{label}</h3>
      <div className="mt-1 rounded-md border border-line bg-paper p-3">
        {children}
      </div>
    </div>
  );
}
