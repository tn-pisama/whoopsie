// Daily TTL cleanup. Deletes trace events older than 7 days. Contacts are
// retained indefinitely (people opt in for "we email you maybe twice a year").
//
// Triggered by Vercel Cron. The cron config in apps/web/vercel.json schedules
// this; Vercel automatically attaches `Authorization: Bearer <CRON_SECRET>`
// when CRON_SECRET is set on the project. Direct curl from outside is rejected.
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/bus";
import { PostgresStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 7;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const store = await getStore();
  if (!(store instanceof PostgresStore)) {
    return NextResponse.json({
      ok: true,
      skipped: "memory store has no TTL",
    });
  }

  // Direct DELETE via the store's pool. Public store API doesn't expose this
  // because TTL is a maintenance concern, not a normal request path.
  const pool = (store as unknown as { pool: import("pg").Pool }).pool;
  const res = await pool.query<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM whoopsie_traces
       WHERE created_at < now() - ($1 || ' days')::interval
       RETURNING 1
     )
     SELECT count(*)::text FROM deleted`,
    [String(RETENTION_DAYS)],
  );

  return NextResponse.json({
    ok: true,
    deleted: Number(res.rows[0]?.count ?? "0"),
    retainedDays: RETENTION_DAYS,
  });
}
