import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore, PostgresStore } from "../lib/store";

const databaseUrl = process.env.WHOOPSIE_TEST_DATABASE_URL;
const skipReason = databaseUrl ? null : "WHOOPSIE_TEST_DATABASE_URL not set";

test("MemoryStore.saveContact: creates on first insert", async () => {
  const s = new MemoryStore();
  const r = await s.saveContact({
    projectId: "ws_a",
    email: "alice@example.com",
    source: "install_page",
    createdAt: Date.now(),
  });
  assert.equal(r.created, true);
});

test("MemoryStore.saveContact: dedupes by (projectId, lowercased email)", async () => {
  const s = new MemoryStore();
  await s.saveContact({
    projectId: "ws_a",
    email: "Bob@Example.com",
    source: "install_page",
    createdAt: 1,
  });
  const dup = await s.saveContact({
    projectId: "ws_a",
    email: "bob@example.com",
    source: "dashboard_empty",
    createdAt: 2,
  });
  assert.equal(dup.created, false);
});

test("MemoryStore.saveContact: same email under a different project is fresh", async () => {
  const s = new MemoryStore();
  await s.saveContact({
    projectId: "ws_a",
    email: "shared@example.com",
    source: "install_page",
    createdAt: 1,
  });
  const r = await s.saveContact({
    projectId: "ws_b",
    email: "shared@example.com",
    source: "install_page",
    createdAt: 2,
  });
  assert.equal(r.created, true);
});

test(
  "PostgresStore.saveContact: insert + dedupe via unique index",
  { skip: skipReason ?? false },
  async () => {
    const s = await PostgresStore.connect(databaseUrl!);
    const scope = `ws_contact_${Date.now().toString(36)}`;
    try {
      const r1 = await s.saveContact({
        projectId: scope,
        email: "alice@example.com",
        source: "install_page",
        createdAt: Date.now(),
      });
      assert.equal(r1.created, true);
      const r2 = await s.saveContact({
        projectId: scope,
        email: "ALICE@example.com",
        source: "dashboard_empty",
        createdAt: Date.now(),
      });
      assert.equal(r2.created, false);
    } finally {
      const pool = (s as unknown as { pool: import("pg").Pool }).pool;
      await pool.query("DELETE FROM whoopsie_contacts WHERE project_id = $1", [scope]);
      await s.close();
    }
  },
);
