#!/usr/bin/env -S tsx
// Admin: dump the whoopsie_contacts table as TSV.
// Read-only. Fails loud if WHOOPSIE_DATABASE_URL isn't set.
//
// Usage:
//   pnpm contacts:list
//   WHOOPSIE_DATABASE_URL=postgres://... pnpm contacts:list
//   WHOOPSIE_DATABASE_URL=postgres://... pnpm contacts:list --csv
import { Pool } from "pg";

const url = process.env.WHOOPSIE_DATABASE_URL;
if (!url) {
  console.error(
    "WHOOPSIE_DATABASE_URL is not set. This script reads from a real database.",
  );
  console.error(
    "Set it via `vercel env pull` or export it from your shell first.",
  );
  process.exit(1);
}

const csv = process.argv.includes("--csv");
const sep = csv ? "," : "\t";

const SQL = `
  SELECT
    c.project_id,
    c.email,
    c.source,
    c.created_at,
    c.opted_in_at,
    c.unsubscribed_at,
    (SELECT max(created_at) FROM whoopsie_traces t WHERE t.project_id = c.project_id) AS last_event_at,
    (SELECT count(*)        FROM whoopsie_traces t WHERE t.project_id = c.project_id) AS event_count
  FROM whoopsie_contacts c
  ORDER BY c.created_at DESC
`;

interface Row {
  project_id: string;
  email: string;
  source: string;
  created_at: Date;
  opted_in_at: Date;
  unsubscribed_at: Date | null;
  last_event_at: Date | null;
  event_count: string;
}

function escapeField(s: string): string {
  if (csv && (s.includes(",") || s.includes('"') || s.includes("\n"))) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const res = await pool.query<Row>(SQL);
    const headers = [
      "project_id",
      "email",
      "source",
      "created_at",
      "last_event_at",
      "event_count",
      "unsubscribed",
    ];
    console.log(headers.map(escapeField).join(sep));
    for (const r of res.rows) {
      console.log(
        [
          r.project_id,
          r.email,
          r.source,
          r.created_at.toISOString(),
          r.last_event_at ? r.last_event_at.toISOString() : "",
          r.event_count,
          r.unsubscribed_at ? r.unsubscribed_at.toISOString() : "",
        ]
          .map((s) => escapeField(String(s)))
          .join(sep),
      );
    }
    if (res.rows.length === 0) {
      console.error("(no contacts yet)");
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
