"use client";

import { useState } from "react";
import { GeistMono } from "geist/font/mono";

const PROJECT_ID = "ws_demo_public";

interface FailureSpec {
  detector: string;
  title: string;
  blurb: string;
  build: () => unknown;
}

function nanoid8(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const FAILURES: FailureSpec[] = [
  {
    detector: "loop",
    title: "Loop",
    blurb: "6x web_search in a row.",
    build: () => {
      const start = Date.now();
      return {
        projectId: PROJECT_ID,
        traceId: `demo-loop-${nanoid8()}`,
        spanId: nanoid8(),
        startTime: start,
        endTime: start + 4500,
        model: "claude-haiku-4-5",
        prompt: "search for the latest bun release notes",
        completion: "Searching...",
        toolCalls: Array.from({ length: 6 }, (_, i) => ({
          toolCallId: nanoid8(),
          toolName: "web_search",
          startTime: start + i * 100,
        })),
        inputTokens: 60,
        outputTokens: 6,
        finishReason: "tool_calls",
        metadata: { source: "demo_failure_button" },
      };
    },
  },
  {
    detector: "repetition",
    title: "Repetition",
    blurb: "Reply text loops on itself.",
    build: () => {
      const start = Date.now();
      const line = "I cannot help with that request at this time.\n";
      return {
        projectId: PROJECT_ID,
        traceId: `demo-rep-${nanoid8()}`,
        spanId: nanoid8(),
        startTime: start,
        endTime: start + 1200,
        model: "claude-haiku-4-5",
        prompt: "Help me write a bash one-liner.",
        completion: line.repeat(6),
        toolCalls: [],
        inputTokens: 12,
        outputTokens: 60,
        finishReason: "stop",
        metadata: { source: "demo_failure_button" },
      };
    },
  },
  {
    detector: "cost",
    title: "Cost spike",
    blurb: "14k tokens, $0.78 in one call.",
    build: () => {
      const start = Date.now();
      return {
        projectId: PROJECT_ID,
        traceId: `demo-cost-${nanoid8()}`,
        spanId: nanoid8(),
        startTime: start,
        endTime: start + 9000,
        model: "claude-opus-4-7",
        prompt: "Summarize this giant pile of text...",
        completion: "Long output here...",
        toolCalls: [],
        inputTokens: 9000,
        outputTokens: 5000,
        costUsd: 0.78,
        finishReason: "length",
        metadata: { source: "demo_failure_button" },
      };
    },
  },
  {
    detector: "completion",
    title: "Premature stop",
    blurb: "Stopped after 3 chars on a real question.",
    build: () => {
      const start = Date.now();
      return {
        projectId: PROJECT_ID,
        traceId: `demo-prem-${nanoid8()}`,
        spanId: nanoid8(),
        startTime: start,
        endTime: start + 380,
        model: "claude-haiku-4-5",
        prompt: "What's the capital of Finland?",
        completion: "Hi.",
        toolCalls: [],
        inputTokens: 8,
        outputTokens: 2,
        finishReason: "stop",
        metadata: { source: "demo_failure_button" },
      };
    },
  },
  {
    detector: "hallucination",
    title: "Hallucination",
    blurb: "Names entities not in the sources.",
    build: () => {
      const start = Date.now();
      return {
        projectId: PROJECT_ID,
        traceId: `demo-hall-${nanoid8()}`,
        spanId: nanoid8(),
        startTime: start,
        endTime: start + 2200,
        model: "claude-haiku-4-5",
        prompt:
          "Sources: Acme Robotics is a Pittsburgh startup founded in 2024 by Sara Patel. Acme builds household cleaning robots. Acme raised a $4M seed round in March 2025 led by Initialized Capital.\n\nWho founded Acme and who led the seed?",
        completion:
          "Acme Robotics was founded by Sara Patel and Marcus Bellamy. The seed round was co-led by Initialized Capital and General Catalyst, with participation from Reid Hoffman and Marc Andreessen.",
        toolCalls: [
          { toolCallId: nanoid8(), toolName: "vector_search", startTime: start },
          { toolCallId: nanoid8(), toolName: "rerank", startTime: start + 200 },
        ],
        inputTokens: 320,
        outputTokens: 80,
        finishReason: "stop",
        metadata: { source: "demo_failure_button" },
      };
    },
  },
  {
    detector: "context",
    title: "Context ignored",
    blurb: "Reply doesn't reflect the user's context.",
    build: () => {
      const start = Date.now();
      return {
        projectId: PROJECT_ID,
        traceId: `demo-ctx-${nanoid8()}`,
        spanId: nanoid8(),
        startTime: start,
        endTime: start + 1800,
        model: "claude-haiku-4-5",
        prompt:
          "Context: The user is vegetarian, allergic to peanuts, prefers Italian, lives in Brooklyn.\n\nSuggest a takeout order for tonight.",
        completion:
          "Try Pad Thai with extra peanuts from Lemongrass Thai. They have a great spicy pork option too.",
        toolCalls: [],
        inputTokens: 50,
        outputTokens: 50,
        finishReason: "stop",
        metadata: { source: "demo_failure_button" },
      };
    },
  },
  {
    detector: "derailment",
    title: "Derailment",
    blurb: "Asked to write a haiku, ran SQL queries.",
    build: () => {
      const start = Date.now();
      return {
        projectId: PROJECT_ID,
        traceId: `demo-der-${nanoid8()}`,
        spanId: nanoid8(),
        startTime: start,
        endTime: start + 3500,
        model: "claude-haiku-4-5",
        prompt: "Write a haiku about autumn leaves.",
        completion: "Let me check the database first.",
        toolCalls: Array.from({ length: 6 }, (_, i) => ({
          toolCallId: nanoid8(),
          toolName: "execute_sql",
          startTime: start + i * 50,
        })),
        inputTokens: 60,
        outputTokens: 8,
        finishReason: "tool_calls",
        metadata: { source: "demo_failure_button" },
      };
    },
  },
];

export function DemoFailureButtons() {
  const [posting, setPosting] = useState<string | null>(null);
  const [last, setLast] = useState<{ name: string; hits: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fire = async (spec: FailureSpec) => {
    setPosting(spec.detector);
    setError(null);
    try {
      const res = await fetch("/api/v1/spans", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-whoopsie-project-id": PROJECT_ID,
        },
        body: JSON.stringify({ events: [spec.build()] }),
      });
      const data = (await res.json()) as {
        detections?: { hits?: { detector: string }[] }[];
      };
      const hits = (data.detections ?? []).flatMap((d) =>
        (d.hits ?? []).map((h) => h.detector),
      );
      setLast({ name: spec.title, hits });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPosting(null);
    }
  };

  return (
    <div>
      <p className="text-sm text-ink-muted">
        These don&apos;t call the model — they post canned trace events to{" "}
        <code className={GeistMono.className}>/api/v1/spans</code> so you can
        watch each detector fire on the live tail without burning tokens.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {FAILURES.map((f) => (
          <button
            key={f.detector}
            type="button"
            onClick={() => fire(f)}
            disabled={posting !== null}
            className="rounded-md border border-line bg-white p-3 text-left transition hover:border-coral disabled:opacity-50"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-ink">{f.title}</span>
              <span className={`${GeistMono.className} text-[10px] uppercase text-ink-muted`}>
                {f.detector}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">{f.blurb}</p>
          </button>
        ))}
      </div>
      {last && (
        <div className="mt-4 rounded-md border border-line bg-coral-soft/30 p-3 text-sm text-ink-soft">
          fired <span className="font-medium">{last.name}</span> →{" "}
          <span className={GeistMono.className}>
            [{last.hits.length === 0 ? "no detector hits" : last.hits.join(", ")}]
          </span>{" "}
          (now visible on the live tail)
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-md border border-coral/40 bg-coral-soft/40 p-3 text-sm text-coral">
          {error}
        </div>
      )}
    </div>
  );
}
