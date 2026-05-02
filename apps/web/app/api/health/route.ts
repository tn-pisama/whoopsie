import { NextResponse } from "next/server";
import { getStore, MemoryStore, PostgresStore } from "@/lib/store";
import { RATE_LIMIT_CONFIG } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthReport {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  store: "memory" | "postgres" | "unknown";
  storeReachable: boolean;
  recentTraceCount: number | null;
  oldestTraceAgeMin: number | null;
  rateLimits: typeof RATE_LIMIT_CONFIG;
  notes: string[];
}

export async function GET(): Promise<NextResponse> {
  const notes: string[] = [];
  let storeKind: HealthReport["store"] = "unknown";
  let storeReachable = false;
  let recentTraceCount: number | null = null;
  let oldestTraceAgeMin: number | null = null;

  try {
    const store = await getStore();
    if (store instanceof MemoryStore) {
      storeKind = "memory";
      storeReachable = true;
      notes.push(
        "running on MemoryStore — restart loses state. set WHOOPSIE_DATABASE_URL for persistence.",
      );
    } else if (store instanceof PostgresStore) {
      storeKind = "postgres";
      const pool = (store as unknown as { pool: import("pg").Pool }).pool;
      try {
        const res = await pool.query<{
          n: string;
          oldest_at: Date | null;
        }>(
          `SELECT count(*)::text AS n,
                  min(created_at) AS oldest_at
             FROM whoopsie_traces
            WHERE created_at > now() - interval '1 hour'`,
        );
        storeReachable = true;
        recentTraceCount = Number(res.rows[0]?.n ?? "0");
        if (res.rows[0]?.oldest_at) {
          oldestTraceAgeMin = Math.round(
            (Date.now() - res.rows[0].oldest_at.getTime()) / 60_000,
          );
        }
      } catch (err) {
        storeReachable = false;
        notes.push(`postgres query failed: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    notes.push(`store init failed: ${(err as Error).message}`);
  }

  const status: HealthReport["status"] = !storeReachable
    ? "down"
    : storeKind === "memory"
    ? "degraded"
    : "ok";

  const report: HealthReport = {
    status,
    timestamp: new Date().toISOString(),
    store: storeKind,
    storeReachable,
    recentTraceCount,
    oldestTraceAgeMin,
    rateLimits: RATE_LIMIT_CONFIG,
    notes,
  };

  // Always 200 — clients should read .status, not the HTTP code.
  return NextResponse.json(report);
}
