// Integration test — requires WHOOPS_TEST_DATABASE_URL pointing at a
// Postgres database. Skips silently when the env var is unset.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PostgresStore } from "../lib/store";
import type { TraceWithHits } from "../lib/types";

const databaseUrl = process.env.WHOOPS_TEST_DATABASE_URL;

const skipReason = databaseUrl ? null : "WHOOPS_TEST_DATABASE_URL not set";

const evt = (id: string, projectId = "wh_pg_test"): TraceWithHits => ({
  event: {
    projectId,
    traceId: id,
    spanId: id,
    startTime: Date.now(),
    endTime: Date.now() + 1,
    model: "test",
    toolCalls: [],
    metadata: {},
  },
  hits: [],
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withStore(
  fn: (store: PostgresStore, scope: string) => Promise<void>,
): Promise<void> {
  const store = await PostgresStore.connect(databaseUrl!);
  // Use a unique project ID per test run so concurrent runs don't collide.
  const scope = `wh_test_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  try {
    await fn(store, scope);
  } finally {
    // Clean up rows for this scope to keep the test DB tidy.
    try {
      const pool = (store as unknown as { pool: import("pg").Pool }).pool;
      await pool.query("DELETE FROM whoops_traces WHERE project_id = $1", [
        scope,
      ]);
    } catch {
      // ignore
    }
    await store.close();
  }
}

test(
  "PostgresStore: publish + recent persists across query",
  { skip: skipReason ?? false },
  async () => {
    await withStore(async (store, scope) => {
      await store.publish(scope, evt("a", scope));
      await store.publish(scope, evt("b", scope));
      const r = await store.recent(scope);
      assert.equal(r.length, 2);
      // Recent returns chronological (oldest -> newest)
      const ids = r.map((x) => x.event.traceId);
      assert.deepEqual(ids, ["a", "b"]);
    });
  },
);

test(
  "PostgresStore: subscribe receives notifications via LISTEN/NOTIFY",
  { skip: skipReason ?? false },
  async () => {
    await withStore(async (store, scope) => {
      const seen: string[] = [];
      const unsub = await store.subscribe(scope, (p) => {
        seen.push(p.event.traceId);
      });
      // Give the LISTEN time to settle on the dedicated client.
      await sleep(120);
      await store.publish(scope, evt("p1", scope));
      await store.publish(scope, evt("p2", scope));
      // Allow notifications to round-trip.
      await sleep(300);
      unsub();
      await store.publish(scope, evt("p3", scope));
      await sleep(150);
      assert.ok(
        seen.includes("p1") && seen.includes("p2"),
        `expected p1 and p2 to be received, got ${JSON.stringify(seen)}`,
      );
      assert.ok(!seen.includes("p3"), "should not receive after unsubscribe");
    });
  },
);

test(
  "PostgresStore: project isolation",
  { skip: skipReason ?? false },
  async () => {
    await withStore(async (store, scope) => {
      const otherScope = `${scope}_other`;
      await store.publish(scope, evt("x", scope));
      await store.publish(otherScope, evt("y", otherScope));
      const r1 = await store.recent(scope);
      const r2 = await store.recent(otherScope);
      assert.equal(r1.length, 1);
      assert.equal(r1[0]!.event.traceId, "x");
      assert.equal(r2.length, 1);
      assert.equal(r2[0]!.event.traceId, "y");
      // tidy up
      const pool = (store as unknown as { pool: import("pg").Pool }).pool;
      await pool.query("DELETE FROM whoops_traces WHERE project_id = $1", [
        otherScope,
      ]);
    });
  },
);
