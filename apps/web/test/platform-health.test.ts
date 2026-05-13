import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../lib/store";
import type { TraceWithHits } from "../lib/types";
import { analyzePlatformHealth } from "../app/api/internal/platform-health/route";

const trace = (
  projectId: string,
  endTime: number,
  platform: string | null,
  opts: { error?: boolean } = {},
): TraceWithHits => ({
  event: {
    projectId,
    traceId: `t-${projectId}-${endTime}`,
    spanId: `s-${projectId}-${endTime}`,
    startTime: endTime - 100,
    endTime,
    model: "gpt-4o",
    toolCalls: [],
    metadata: platform ? { whoopsie_platform: platform } : {},
    error: opts.error
      ? { name: "AI_APICallError", message: "fake" }
      : undefined,
  },
  hits: [],
});

test("MemoryStore.eventStatsByPlatform: groups events + errors by platform tag", async () => {
  const s = new MemoryStore();
  const now = Date.now();
  await s.publish("p1", trace("p1", now - 1000, "lovable"));
  await s.publish("p1", trace("p1", now - 500, "lovable", { error: true }));
  await s.publish("p2", trace("p2", now - 800, "replit"));
  await s.publish("p3", trace("p3", now - 600, null));
  const stats = await s.eventStatsByPlatform(now - 10_000, now);
  assert.deepEqual(stats, {
    lovable: { events: 2, errors: 1 },
    replit: { events: 1, errors: 0 },
    untagged: { events: 1, errors: 0 },
  });
});

test("MemoryStore.eventStatsByPlatform: respects window bounds", async () => {
  const s = new MemoryStore();
  const now = Date.now();
  await s.publish("p1", trace("p1", now - 60_000, "lovable")); // out
  await s.publish("p2", trace("p2", now - 5_000, "lovable")); // in
  const stats = await s.eventStatsByPlatform(now - 10_000, now);
  assert.deepEqual(stats, { lovable: { events: 1, errors: 0 } });
});

test("MemoryStore.firstInstallStatsByPlatform: counts projects whose first trace is in window", async () => {
  const s = new MemoryStore();
  const now = Date.now();
  // p1 first install in window, 2 events → successful
  await s.publish("p1", trace("p1", now - 5_000, "lovable"));
  await s.publish("p1", trace("p1", now - 4_000, "lovable"));
  // p2 first install in window, 1 event only → not successful
  await s.publish("p2", trace("p2", now - 3_000, "lovable"));
  // p3 first install before window → not counted
  await s.publish("p3", trace("p3", now - 60_000, "replit"));
  await s.publish("p3", trace("p3", now - 5_000, "replit"));
  const stats = await s.firstInstallStatsByPlatform(now - 10_000, now);
  assert.deepEqual(stats, {
    lovable: { firstInstalls: 2, successfulInstalls: 1 },
  });
});

test("analyzePlatformHealth: success-rate alarm fires above sample-size threshold", () => {
  const rows = analyzePlatformHealth({
    eventStats: { lovable: { events: 10, errors: 0 } },
    installStats: {
      lovable: { firstInstalls: 10, successfulInstalls: 2 }, // 20% success
    },
    knownPlatforms: ["lovable", "replit", "bolt", "v0"],
  });
  const lovable = rows.find((r) => r.platform === "lovable")!;
  assert.ok(
    lovable.alarms.some((a) => /success rate 20%/.test(a)),
    `expected success-rate alarm, got: ${JSON.stringify(lovable.alarms)}`,
  );
  // Other platforms with no traffic should be present but not alarming
  const v0 = rows.find((r) => r.platform === "v0")!;
  assert.deepEqual(v0.alarms, []);
});

test("analyzePlatformHealth: sample-size guard suppresses success-rate alarm at tiny n", () => {
  const rows = analyzePlatformHealth({
    eventStats: { lovable: { events: 1, errors: 0 } },
    installStats: {
      lovable: { firstInstalls: 1, successfulInstalls: 0 }, // 0% but n=1
    },
    knownPlatforms: ["lovable", "replit", "bolt", "v0"],
  });
  const lovable = rows.find((r) => r.platform === "lovable")!;
  assert.deepEqual(
    lovable.alarms,
    [],
    "with n<5 we should NOT alarm on success rate — false-positive guard",
  );
});

test("analyzePlatformHealth: error-rate alarm fires when most events errored", () => {
  const rows = analyzePlatformHealth({
    eventStats: { replit: { events: 50, errors: 40 } }, // 80% errors
    installStats: { replit: { firstInstalls: 0, successfulInstalls: 0 } },
    knownPlatforms: ["lovable", "replit", "bolt", "v0"],
  });
  const replit = rows.find((r) => r.platform === "replit")!;
  assert.ok(
    replit.alarms.some((a) => /error rate 80%/.test(a)),
    `expected error-rate alarm, got: ${JSON.stringify(replit.alarms)}`,
  );
});

test("analyzePlatformHealth: nominal platforms produce empty alarms array", () => {
  const rows = analyzePlatformHealth({
    eventStats: { v0: { events: 50, errors: 1 } },
    installStats: { v0: { firstInstalls: 10, successfulInstalls: 9 } },
    knownPlatforms: ["lovable", "replit", "bolt", "v0"],
  });
  const v0 = rows.find((r) => r.platform === "v0")!;
  assert.deepEqual(v0.alarms, []);
});

test("analyzePlatformHealth: rows sorted alarms-first then events DESC", () => {
  const rows = analyzePlatformHealth({
    eventStats: {
      lovable: { events: 5, errors: 4 }, // below MIN_EVENTS_FOR_ERROR_RATE, no alarm
      replit: { events: 50, errors: 40 }, // alarms
      v0: { events: 100, errors: 1 }, // nominal high traffic
    },
    installStats: {
      replit: { firstInstalls: 0, successfulInstalls: 0 },
    },
    knownPlatforms: ["lovable", "replit", "bolt", "v0"],
  });
  // First row must be replit (it's the only alarmer)
  assert.equal(rows[0]!.platform, "replit");
  assert.ok(rows[0]!.alarms.length > 0);
  // Next-most-events without alarms = v0 (100 > 5 > 0)
  assert.equal(rows[1]!.platform, "v0");
});
