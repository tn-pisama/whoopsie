// Daily platform-health cron. Pulls per-platform event + first-install
// stats over the last 24h, runs them through the alarm rules, and emails
// the operator inbox when any platform looks like it's drifting.
//
// Triggered by Vercel Cron (config in apps/web/vercel.json). Vercel attaches
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set on the
// project; direct curl from outside is rejected.
//
// Layer 2 of the platform-compatibility drift detection plan (2026-05-13).
// Designed to fire when a platform's AI builder silently regresses — e.g.
// Lovable's AI starts emitting structurally-valid wraps that don't actually
// run, and new-install success rate collapses without the chat returning
// any error code we'd otherwise notice.
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/bus";
import type {
  PlatformEventStats,
  PlatformInstallStats,
  Store,
} from "@/lib/store";
import { sendHealthDigest, type HealthDigestRow } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 24 * 60 * 60 * 1000;

// Alarm thresholds. Overridable via env var so we can dial them without
// shipping code while drift behavior stabilizes.
const MIN_SUCCESS_RATE = Number(
  process.env.WHOOPSIE_HEALTH_MIN_SUCCESS_RATE ?? "0.5",
);
const MIN_FIRST_INSTALLS = Number(
  process.env.WHOOPSIE_HEALTH_MIN_FIRST_INSTALLS ?? "5",
);
const MAX_ERROR_RATE = Number(
  process.env.WHOOPSIE_HEALTH_MAX_ERROR_RATE ?? "0.5",
);
const MIN_EVENTS_FOR_ERROR_RATE = Number(
  process.env.WHOOPSIE_HEALTH_MIN_EVENTS_FOR_ERROR_RATE ?? "20",
);

const KNOWN_PLATFORMS = ["lovable", "replit", "bolt", "v0"] as const;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const untilMs = Date.now();
  const sinceMs = untilMs - WINDOW_MS;

  const store: Store = await getStore();
  const [events, installs] = await Promise.all([
    store.eventStatsByPlatform(sinceMs, untilMs),
    store.firstInstallStatsByPlatform(sinceMs, untilMs),
  ]);

  const rows = analyzePlatformHealth({
    eventStats: events,
    installStats: installs,
    knownPlatforms: KNOWN_PLATFORMS,
  });

  // Send digest only when there's something to act on (or when explicitly
  // requested for daily confirmation that the cron is alive).
  const wantDaily = req.nextUrl.searchParams.get("digest") === "daily";
  const breaches = rows.filter((r) => r.alarms.length > 0);
  let mailStatus: { ok: boolean; status?: number; error?: string } = {
    ok: true,
  };
  if (breaches.length > 0 || wantDaily) {
    mailStatus = await sendHealthDigest({
      rows,
      windowSinceMs: sinceMs,
      windowUntilMs: untilMs,
    });
  }

  return NextResponse.json({
    ok: true,
    window: { sinceMs, untilMs },
    rows,
    breaches: breaches.length,
    mail: mailStatus,
  });
}

interface AnalyzeArgs {
  eventStats: Record<string, PlatformEventStats>;
  installStats: Record<string, PlatformInstallStats>;
  knownPlatforms: readonly string[];
}

export function analyzePlatformHealth(args: AnalyzeArgs): HealthDigestRow[] {
  // Union of platforms that appear in either query, plus always-present
  // known platforms so a complete zero-traffic platform is visible in the
  // digest (not silently absent).
  const allPlatforms = new Set<string>(args.knownPlatforms);
  for (const k of Object.keys(args.eventStats)) allPlatforms.add(k);
  for (const k of Object.keys(args.installStats)) allPlatforms.add(k);

  const rows: HealthDigestRow[] = [];
  for (const platform of allPlatforms) {
    const ev = args.eventStats[platform] ?? { events: 0, errors: 0 };
    const inst = args.installStats[platform] ?? {
      firstInstalls: 0,
      successfulInstalls: 0,
    };
    const alarms: string[] = [];

    // Success-rate alarm: new installs landed but ≥half never produced a
    // second event. Gated on sample size so an early-week test of 1 install
    // that didn't follow up doesn't page anyone.
    if (inst.firstInstalls >= MIN_FIRST_INSTALLS) {
      const successRate = inst.successfulInstalls / inst.firstInstalls;
      if (successRate < MIN_SUCCESS_RATE) {
        alarms.push(
          `new-install success rate ${Math.round(successRate * 100)}% (${inst.successfulInstalls}/${inst.firstInstalls}) below ${Math.round(MIN_SUCCESS_RATE * 100)}%`,
        );
      }
    }

    // Error-rate alarm: ≥X events on this platform but most of them errored.
    // Catches "the wrap fires but every call hits OpenAI 401 / 5xx" failure
    // modes that the success-rate signal won't see (those installs ARE
    // sending traces, they're just all error rows).
    if (ev.events >= MIN_EVENTS_FOR_ERROR_RATE) {
      const errorRate = ev.errors / ev.events;
      if (errorRate > MAX_ERROR_RATE) {
        alarms.push(
          `error rate ${Math.round(errorRate * 100)}% (${ev.errors}/${ev.events}) above ${Math.round(MAX_ERROR_RATE * 100)}%`,
        );
      }
    }

    rows.push({
      platform,
      events: ev.events,
      errors: ev.errors,
      firstInstalls: inst.firstInstalls,
      successfulInstalls: inst.successfulInstalls,
      alarms,
    });
  }

  // Sort: alarms-first, then by events DESC so the digest's first lines are
  // always the ones the operator needs to act on.
  rows.sort((a, b) => {
    if (a.alarms.length !== b.alarms.length) {
      return b.alarms.length - a.alarms.length;
    }
    return b.events - a.events;
  });
  return rows;
}
