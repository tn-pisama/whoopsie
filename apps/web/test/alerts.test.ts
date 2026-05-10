import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../lib/store";
import type { TraceWithHits } from "../lib/types";
import { sendFirstFailureAlerts } from "../lib/alerts";

const trace = (hits: TraceWithHits["hits"]): TraceWithHits => ({
  event: {
    projectId: "ws_a",
    traceId: "t",
    spanId: "s",
    startTime: 0,
    endTime: 1,
    model: "gpt-4o",
    toolCalls: [],
    metadata: {},
  },
  hits,
});

const loopHit = {
  detector: "loop",
  detected: true,
  severity: 80,
  summary: "Tool 'web_search' repeated 6x",
  fix: "Stop the loop.",
};

test("MemoryStore.contactsAwaitingAlert returns contacts that have no alert yet", async () => {
  const s = new MemoryStore();
  await s.saveContact({
    projectId: "ws_a",
    email: "alice@example.com",
    source: "install_page",
    createdAt: 0,
  });
  await s.saveContact({
    projectId: "ws_a",
    email: "bob@example.com",
    source: "install_page",
    createdAt: 0,
  });
  const before = await s.contactsAwaitingAlert("ws_a", "first_failure");
  assert.equal(before.length, 2);
  await s.recordAlert({
    projectId: "ws_a",
    email: "alice@example.com",
    kind: "first_failure",
  });
  const after = await s.contactsAwaitingAlert("ws_a", "first_failure");
  assert.deepEqual(
    after.map((c) => c.email).sort(),
    ["bob@example.com"],
  );
});

test("MemoryStore.recordAlert is idempotent and case-insensitive", async () => {
  const s = new MemoryStore();
  const r1 = await s.recordAlert({
    projectId: "ws_a",
    email: "Alice@example.com",
    kind: "first_failure",
  });
  assert.equal(r1.recorded, true);
  const r2 = await s.recordAlert({
    projectId: "ws_a",
    email: "alice@example.com",
    kind: "first_failure",
  });
  assert.equal(r2.recorded, false);
});

test("sendFirstFailureAlerts skips quietly when feature flag off", async () => {
  const originalFlag = process.env.WHOOPSIE_ALERTS_ENABLED;
  const originalKey = process.env.RESEND_API_KEY;
  delete process.env.WHOOPSIE_ALERTS_ENABLED;
  process.env.RESEND_API_KEY = "test_key"; // even with key set, flag-off wins
  try {
    const s = new MemoryStore();
    await s.saveContact({
      projectId: "ws_a",
      email: "alice@example.com",
      source: "install_page",
      createdAt: 0,
    });
    const r = await sendFirstFailureAlerts(s, "ws_a", trace([loopHit]));
    assert.equal(r.skippedDisabled, true);
    assert.equal(r.attempted, 0);
    assert.equal(r.sent, 0);
  } finally {
    if (originalFlag !== undefined) process.env.WHOOPSIE_ALERTS_ENABLED = originalFlag;
    if (originalKey !== undefined) process.env.RESEND_API_KEY = originalKey;
    else delete process.env.RESEND_API_KEY;
  }
});

test("sendFirstFailureAlerts skips quietly when RESEND_API_KEY unset", async () => {
  const originalFlag = process.env.WHOOPSIE_ALERTS_ENABLED;
  const originalKey = process.env.RESEND_API_KEY;
  process.env.WHOOPSIE_ALERTS_ENABLED = "1";
  delete process.env.RESEND_API_KEY;
  try {
    const s = new MemoryStore();
    await s.saveContact({
      projectId: "ws_a",
      email: "alice@example.com",
      source: "install_page",
      createdAt: 0,
    });
    const r = await sendFirstFailureAlerts(s, "ws_a", trace([loopHit]));
    assert.equal(r.skippedNoKey, true);
    assert.equal(r.attempted, 0);
    assert.equal(r.sent, 0);
  } finally {
    if (originalFlag !== undefined) process.env.WHOOPSIE_ALERTS_ENABLED = originalFlag;
    else delete process.env.WHOOPSIE_ALERTS_ENABLED;
    if (originalKey !== undefined) process.env.RESEND_API_KEY = originalKey;
  }
});

test("sendFirstFailureAlerts is a no-op when there are no hits", async () => {
  process.env.WHOOPSIE_ALERTS_ENABLED = "1";
  process.env.RESEND_API_KEY = "test_key";
  try {
    const s = new MemoryStore();
    await s.saveContact({
      projectId: "ws_a",
      email: "alice@example.com",
      source: "install_page",
      createdAt: 0,
    });
    const r = await sendFirstFailureAlerts(s, "ws_a", trace([]));
    assert.equal(r.attempted, 0);
    assert.equal(r.sent, 0);
  } finally {
    delete process.env.WHOOPSIE_ALERTS_ENABLED;
    delete process.env.RESEND_API_KEY;
  }
});

test("sendFirstFailureAlerts records the alert (dedupes future runs) even if Resend fails", async () => {
  process.env.WHOOPSIE_ALERTS_ENABLED = "1";
  process.env.RESEND_API_KEY = "test_key_that_will_404";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ error: { message: "fake failure" } }),
      { status: 401, headers: { "content-type": "application/json" } },
    )) as typeof fetch;
  try {
    const s = new MemoryStore();
    await s.saveContact({
      projectId: "ws_a",
      email: "alice@example.com",
      source: "install_page",
      createdAt: 0,
    });
    const r1 = await sendFirstFailureAlerts(s, "ws_a", trace([loopHit]));
    assert.equal(r1.attempted, 1);
    assert.equal(r1.sent, 0);
    assert.equal(r1.failed, 1);
    const r2 = await sendFirstFailureAlerts(s, "ws_a", trace([loopHit]));
    assert.equal(r2.attempted, 0);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.WHOOPSIE_ALERTS_ENABLED;
    delete process.env.RESEND_API_KEY;
  }
});

test("sendFirstFailureAlerts: happy-path Resend mock", async () => {
  process.env.WHOOPSIE_ALERTS_ENABLED = "1";
  process.env.RESEND_API_KEY = "test_key_ok";
  const calls: { url: string; body: { to?: string[]; subject?: string } }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: unknown, init?: { body?: string }) => {
    calls.push({
      url: String(input),
      body: JSON.parse(init?.body ?? "{}"),
    });
    return new Response(JSON.stringify({ id: "email_abc" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    const s = new MemoryStore();
    await s.saveContact({
      projectId: "ws_a",
      email: "alice@example.com",
      source: "install_page",
      createdAt: 0,
    });
    const r = await sendFirstFailureAlerts(s, "ws_a", trace([loopHit]));
    assert.equal(r.attempted, 1);
    assert.equal(r.sent, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, "https://api.resend.com/emails");
    assert.deepEqual(calls[0]!.body.to, ["alice@example.com"]);
    assert.match(calls[0]!.body.subject ?? "", /loop/i);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.WHOOPSIE_ALERTS_ENABLED;
    delete process.env.RESEND_API_KEY;
  }
});
