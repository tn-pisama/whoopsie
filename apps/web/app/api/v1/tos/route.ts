// Audit log for TOS acceptance. Best-effort — the user-facing checkbox
// gates UX via localStorage, this endpoint records the acceptance for
// audit purposes only. Failures are silent so a transient DB hiccup
// doesn't break the install flow.

import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/bus";
import { ipFromRequest, rateLimitContact } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID_RE = /^ws_[A-Za-z0-9_-]+$/;
const VERSION_RE = /^[A-Za-z0-9._-]{1,32}$/;

interface RequestBody {
  projectId?: unknown;
  termsVersion?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Reuse the contact endpoint's per-IP limit — same threat model
  // (anonymous floods filling the table).
  const gate = rateLimitContact(ipFromRequest(req));
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: gate.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const projectId =
    typeof body.projectId === "string" && PROJECT_ID_RE.test(body.projectId)
      ? body.projectId
      : undefined;
  const termsVersion =
    typeof body.termsVersion === "string" && VERSION_RE.test(body.termsVersion)
      ? body.termsVersion
      : "unknown";

  const ua = req.headers.get("user-agent")?.slice(0, 512) ?? undefined;
  const ip = ipFromRequest(req);

  try {
    const store = await getStore();
    await store.recordTosAcceptance({
      projectId,
      termsVersion,
      ip,
      userAgent: ua,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whoopsie] tos record failed", err);
    // Still 200: don't fail the install flow on audit-log hiccups.
    return NextResponse.json({ ok: true, persisted: false });
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
