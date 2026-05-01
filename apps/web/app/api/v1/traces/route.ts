import { NextRequest, NextResponse } from "next/server";
import { recent } from "@/lib/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;

// Read endpoint for the MCP server (and anyone else who wants polled access
// instead of the SSE stream). Same trust model as SSE: knowing the project_id
// is sufficient auth in v0.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const projectId =
    url.searchParams.get("projectId") ??
    req.headers.get("x-whoopsie-project-id");
  const onlyFailures = url.searchParams.get("only") === "failures";
  const rawLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : 50;

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const buffer = await recent(projectId, MAX_LIMIT);
  // Newest first.
  const reversed = buffer.slice().reverse();
  const filtered = onlyFailures
    ? reversed.filter((e) => e.hits.length > 0)
    : reversed;
  const sliced = filtered.slice(0, limit);

  return NextResponse.json({
    projectId,
    count: sliced.length,
    events: sliced,
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "x-whoopsie-project-id",
    },
  });
}
