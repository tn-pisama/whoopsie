// POST /api/v1/message — the modal contact-form endpoint.
//
// Users on /privacy and /terms can click an in-page button instead of a
// `mailto:` link. The button opens a modal where they type their email +
// message; submit posts here, we relay through Brevo to either
// hi@whoopsie.dev (general / deletion / disputes) or security@whoopsie.dev
// (vuln disclosure). Both addresses forward to tuomo@pisama.ai via the
// Cloudflare Email Routing setup on the zone.
//
// The user's email goes in Reply-To so a single "reply" from the
// maintainer's mailbox lands back with them — no thread tracking needed.

import { NextRequest, NextResponse } from "next/server";
import { ipFromRequest, rateLimitMessage } from "@/lib/rate-limit";
import { isMailConfigured, sendTransactional } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_BODY = 10;
const MAX_BODY = 5000;
const RECIPIENTS: Record<string, string> = {
  hi: "hi@whoopsie.dev",
  security: "security@whoopsie.dev",
};

interface MessageBody {
  to?: string;
  from?: string;
  body?: string;
  projectId?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = ipFromRequest(req);
  const gate = rateLimitMessage(ip);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: gate.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { to, from, body, projectId } = (parsed ?? {}) as MessageBody;

  if (!to || !RECIPIENTS[to]) {
    return NextResponse.json({ error: "invalid recipient" }, { status: 400 });
  }
  if (!from || !EMAIL_RE.test(from)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (!body || typeof body !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  const trimmed = body.trim();
  if (trimmed.length < MIN_BODY) {
    return NextResponse.json(
      { error: `message must be at least ${MIN_BODY} chars` },
      { status: 400 },
    );
  }
  if (trimmed.length > MAX_BODY) {
    return NextResponse.json(
      { error: `message must be at most ${MAX_BODY} chars` },
      { status: 400 },
    );
  }

  if (!isMailConfigured()) {
    // Honest 503 so the modal can fall back to opening `mailto:` with the
    // typed message pre-filled. Better than swallowing the user's message.
    return NextResponse.json(
      { error: "mail relay not configured", fallbackTo: RECIPIENTS[to] },
      { status: 503 },
    );
  }

  const recipient = RECIPIENTS[to];
  const subject =
    to === "security"
      ? "[whoopsie security] message via /privacy"
      : projectId
        ? `[whoopsie contact] message re: ${projectId}`
        : "[whoopsie contact] message via /privacy or /terms";

  const text = [
    `From: ${from}`,
    projectId ? `Project ID: ${projectId}` : null,
    `IP: ${ip}`,
    "",
    trimmed,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendTransactional({
    to: recipient,
    replyTo: from,
    subject,
    text,
    fromName: to === "security" ? "Whoopsie Security" : "Whoopsie Contact",
  });
  if (!result.ok) {
    console.error("[whoopsie] message relay failed:", result.error);
    return NextResponse.json(
      { error: "relay failed", fallbackTo: recipient },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
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
