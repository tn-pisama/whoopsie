import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../lib/store";
import type { TraceWithHits } from "../lib/types";

const evt = (id: string): TraceWithHits => ({
  event: {
    projectId: "wh_mem",
    traceId: id,
    spanId: id,
    startTime: 0,
    endTime: 1,
    model: "test",
    toolCalls: [],
    metadata: {},
  },
  hits: [],
});

test("MemoryStore: publish + recent", async () => {
  const store = new MemoryStore();
  await store.publish("wh_mem", evt("a"));
  await store.publish("wh_mem", evt("b"));
  const r = await store.recent("wh_mem");
  assert.equal(r.length, 2);
  assert.equal(r[0]!.event.traceId, "a");
  assert.equal(r[1]!.event.traceId, "b");
});

test("MemoryStore: subscribe receives published events", async () => {
  const store = new MemoryStore();
  const seen: string[] = [];
  const unsub = await store.subscribe("wh_mem2", (p) => {
    seen.push(p.event.traceId);
  });
  await store.publish("wh_mem2", evt("x"));
  await store.publish("wh_mem2", evt("y"));
  unsub();
  await store.publish("wh_mem2", evt("z"));
  assert.deepEqual(seen, ["x", "y"]);
});

test("MemoryStore: project isolation", async () => {
  const store = new MemoryStore();
  await store.publish("wh_a", evt("1"));
  await store.publish("wh_b", evt("2"));
  const a = await store.recent("wh_a");
  const b = await store.recent("wh_b");
  assert.equal(a.length, 1);
  assert.equal(a[0]!.event.traceId, "1");
  assert.equal(b.length, 1);
  assert.equal(b[0]!.event.traceId, "2");
});
