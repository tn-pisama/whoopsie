#!/usr/bin/env -S tsx
// Admin: dump the whoopsie_tos_acceptances table as TSV.
// Read-only. Fails loud if WHOOPSIE_DATABASE_URL isn't set.
//
//   pnpm tos:list
//   WHOOPSIE_DATABASE_URL=postgres://... pnpm tos:list --since=2026-04-01
import { Pool } from "pg";

const url = process.env.WHOOPSIE_DATABASE_URL;
if (!url) {
  console.error("WHOOPSIE_DATABASE_URL is not set.");
  process.exit(1);
}

const sinceArg = process.argv.find((a) => a.startsWith("--since="));
const since = sinceArg ? sinceArg.slice(8) : null;
const csv = process.argv.includes("--csv");
const sep = csv ? "," : "\t";

const SQL = since
  ? `SELECT id, project_id, terms_version, ip, user_agent, accepted_at
     FROM whoopsie_tos_acceptances
     WHERE accepted_at >= $1
     ORDER BY accepted_at DESC`
  : `SELECT id, project_id, terms_version, ip, user_agent, accepted_at
     FROM whoopsie_tos_acceptances
     ORDER BY accepted_at DESC
     LIMIT 1000`;

interface Row {
  id: string;
  project_id: string | null;
  terms_version: string;
  ip: string | null;
  user_agent: string | null;
  accepted_at: Date;
}

function escape(s: string): string {
  if (csv && (s.includes(",") || s.includes('"') || s.includes("\n"))) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const params = since ? [since] : [];
    const res = await pool.query<Row>(SQL, params);
    const headers = ["id", "project_id", "terms_version", "ip", "user_agent", "accepted_at"];
    console.log(headers.map(escape).join(sep));
    for (const r of res.rows) {
      console.log(
        [
          r.id,
          r.project_id ?? "",
          r.terms_version,
          r.ip ?? "",
          r.user_agent ?? "",
          r.accepted_at.toISOString(),
        ]
          .map((s) => escape(String(s)))
          .join(sep),
      );
    }
    if (res.rows.length === 0) console.error("(no acceptances yet)");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
