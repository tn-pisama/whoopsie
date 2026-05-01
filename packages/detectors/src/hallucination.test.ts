import { test } from "node:test";
import assert from "node:assert/strict";
import { detectHallucination } from "./hallucination.js";
import type { AgentTrace } from "./types.js";

const trace = (prompt: string, completion: string): AgentTrace => ({
  traceId: "t",
  startTime: 0,
  toolCalls: [],
  prompt,
  completion,
});

test("no sources block, no flag", () => {
  const r = detectHallucination(
    trace(
      "Tell me about Geoffrey Hinton.",
      "Geoffrey Hinton won the Turing Award in 2018 with Yoshua Bengio and Yann LeCun.",
    ),
  );
  assert.equal(r.detected, false);
});

test("flags claim absent from sources", () => {
  const r = detectHallucination(
    trace(
      "Sources: Bart Smith was the founder of Acme Corp in 1992. Acme makes paint.\n\nQ: who started Acme?",
      "According to records, Bart Smith founded Acme Corp. The company was advised by Albert Einstein.",
    ),
  );
  assert.equal(r.detected, true);
  assert.match(r.summary, /Albert Einstein/);
});

test("supported claim does not flag", () => {
  const r = detectHallucination(
    trace(
      "<sources>Bart Smith founded Acme Corp in 1992. Acme makes paint.</sources>\nWho started Acme?",
      "Bart Smith founded Acme Corp.",
    ),
  );
  assert.equal(r.detected, false);
});

test("short completion is ignored", () => {
  const r = detectHallucination(
    trace("Sources: Hello world.\nWhat is in the sources?", "Hello."),
  );
  assert.equal(r.detected, false);
});
