import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_SOURCES = new Set([
  "install_page",
  "dashboard_empty",
  "dashboard_first_event",
  "sdk_middleware",
  "manual",
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { projectId, email, source } = parseBody(body);
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (!ALLOWED_SOURCES.has(source)) {
    return NextResponse.json({ error: "invalid source" }, { status: 400 });
  }

  try {
    const store = await getStore();
    const result = await store.saveContact({
      projectId,
      email,
      source,
      createdAt: Date.now(),
    });
    return NextResponse.json({ ok: true, created: result.created });
  } catch (err) {
    console.error("[whoopsie] contact save error", err);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
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

function parseBody(b: unknown): { projectId: string; email: string; source: string } {
  if (!b || typeof b !== "object") return { projectId: "", email: "", source: "" };
  const o = b as Record<string, unknown>;
  return {
    projectId: typeof o.projectId === "string" ? o.projectId.trim() : "",
    email: typeof o.email === "string" ? o.email.trim() : "",
    source: typeof o.source === "string" ? o.source.trim() : "manual",
  };
}
