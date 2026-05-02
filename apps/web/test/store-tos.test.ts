import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore, PostgresStore } from "../lib/store";

const databaseUrl = process.env.WHOOPSIE_TEST_DATABASE_URL;
const skipReason = databaseUrl ? null : "WHOOPSIE_TEST_DATABASE_URL not set";

test("MemoryStore.recordTosAcceptance: adds a row", async () => {
  const s = new MemoryStore();
  await s.recordTosAcceptance({
    projectId: "ws_a",
    termsVersion: "2026-05-01",
    ip: "203.0.113.5",
    userAgent: "test/1.0",
  });
  const rows = s.listTosAcceptances();
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.projectId, "ws_a");
  assert.equal(rows[0]!.termsVersion, "2026-05-01");
  assert.ok((rows[0]!.acceptedAt ?? 0) > 0);
});

test("MemoryStore.recordTosAcceptance: multiple acceptances per project allowed", async () => {
  const s = new MemoryStore();
  await s.recordTosAcceptance({ projectId: "ws_a", termsVersion: "v1" });
  await s.recordTosAcceptance({ projectId: "ws_a", termsVersion: "v1" });
  assert.equal(s.listTosAcceptances().length, 2);
});

test(
  "PostgresStore.recordTosAcceptance: insert + select",
  { skip: skipReason ?? false },
  async () => {
    const s = await PostgresStore.connect(databaseUrl!);
    const scope = `ws_tos_${Date.now().toString(36)}`;
    try {
      await s.recordTosAcceptance({
        projectId: scope,
        termsVersion: "2026-05-01",
        ip: "203.0.113.5",
        userAgent: "test/1.0",
      });
      const pool = (s as unknown as { pool: import("pg").Pool }).pool;
      const r = await pool.query<{
        project_id: string;
        terms_version: string;
        ip: string;
        user_agent: string;
      }>(
        "SELECT project_id, terms_version, ip, user_agent FROM whoopsie_tos_acceptances WHERE project_id = $1",
        [scope],
      );
      assert.equal(r.rows.length, 1);
      assert.equal(r.rows[0]!.terms_version, "2026-05-01");
      assert.equal(r.rows[0]!.ip, "203.0.113.5");
      assert.equal(r.rows[0]!.user_agent, "test/1.0");
    } finally {
      const pool = (s as unknown as { pool: import("pg").Pool }).pool;
      await pool.query(
        "DELETE FROM whoopsie_tos_acceptances WHERE project_id = $1",
        [scope],
      );
      await s.close();
    }
  },
);
