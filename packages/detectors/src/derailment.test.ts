import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDerailment } from "./derailment.js";
import type { AgentTrace } from "./types.js";

const trace = (prompt: string, tools: string[]): AgentTrace => ({
  traceId: "t",
  startTime: 0,
  toolCalls: tools.map((t, i) => ({ toolName: t, startTime: i })),
  prompt,
});

test("aligned tools, no flag", () => {
  const r = detectDerailment(
    trace("Search for and summarize recent posts about Bun.", [
      "web_search",
      "web_search",
      "summarize",
      "write_file",
    ]),
  );
  assert.equal(r.detected, false);
});

test("flags drifting tools", () => {
  const r = detectDerailment(
    trace("Write a haiku about autumn leaves.", [
      "execute_sql",
      "execute_sql",
      "execute_sql",
      "execute_sql",
    ]),
  );
  assert.equal(r.detected, true);
  assert.match(r.summary, /drifts/i);
});

test("too few tools, no flag", () => {
  const r = detectDerailment(
    trace("Write a haiku about autumn leaves.", ["execute_sql"]),
  );
  assert.equal(r.detected, false);
});

test("no clear task verb in prompt, no flag", () => {
  const r = detectDerailment(
    trace("Hi there!", ["a", "b", "c", "d"]),
  );
  assert.equal(r.detected, false);
});
