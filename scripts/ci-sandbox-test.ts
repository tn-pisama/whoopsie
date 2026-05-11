#!/usr/bin/env tsx
// Vercel Sandbox-backed integration test driver.
//
// For a given framework, spin up an isolated Sandbox, install the published
// @whoopsie/sdk, scaffold the framework's reference route, run a real
// streamText call against the sandbox's URL, poll whoopsie's /api/v1/traces
// for the round-trip, exit 0/1.
//
// CURRENTLY A SCAFFOLD. The mock-model layer in
// packages/sdk/test/integration/<framework>/<framework>.test.ts is fully
// implemented and exercised by `pnpm test`. This driver is for the live
// Sandbox layer in CI, which is gated behind GitHub Secrets and not
// activated by default. The implementation below is a working skeleton —
// fill in the Sandbox API calls (or call out to `vercel sandbox` CLI) when
// the workflow is activated.

import { parseArgs } from "node:util";

interface DriverOptions {
  framework: string;
  baseUrl: string;
  projectId: string;
  openaiApiKey: string;
  vercelToken: string;
  timeoutMs: number;
}

const SUPPORTED_FRAMEWORKS = ["nextjs", "tanstack-start", "hono", "express"];

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      framework: { type: "string" },
      "base-url": { type: "string" },
      "timeout-ms": { type: "string" },
    },
  });

  const framework = String(values.framework ?? "");
  if (!SUPPORTED_FRAMEWORKS.includes(framework)) {
    fail(
      `--framework must be one of: ${SUPPORTED_FRAMEWORKS.join(", ")} (got ${framework})`,
    );
  }
  const opts: DriverOptions = {
    framework,
    baseUrl: (values["base-url"] as string) ?? "https://whoopsie.dev",
    projectId: required("WHOOPSIE_PROJECT_ID"),
    openaiApiKey: required("OPENAI_API_KEY"),
    vercelToken: required("VERCEL_TOKEN"),
    timeoutMs: Number(values["timeout-ms"]) || 60_000,
  };

  log(`Spinning up Vercel Sandbox for ${opts.framework}...`);
  const sandbox = await provisionSandbox(opts);
  try {
    log(`Sandbox ready at ${sandbox.url}`);

    log(`Installing @whoopsie/sdk + framework deps in sandbox...`);
    await sandbox.installDeps([
      "@whoopsie/sdk",
      "@ai-sdk/openai",
      "ai",
      ...frameworkDeps(opts.framework),
    ]);

    log(`Copying framework reference route into sandbox...`);
    await sandbox.copyFiles(
      `packages/sdk/test/integration/${opts.framework}/src/`,
    );

    log(`Booting framework dev server in sandbox...`);
    await sandbox.startServer(frameworkStartCmd(opts.framework));

    log(`Sending synthetic chat to sandbox URL...`);
    const traceId = `ci-${opts.framework}-${Date.now()}`;
    await sandbox.fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: traceId }] }],
      }),
    });

    log(`Polling whoopsie /api/v1/traces for trace round-trip...`);
    const landed = await pollForTrace(
      opts.baseUrl,
      opts.projectId,
      traceId,
      opts.timeoutMs,
    );

    if (!landed) {
      fail(`Trace did not surface within ${opts.timeoutMs}ms`);
    }
    log(`✓ ${opts.framework}: trace landed end-to-end via published SDK.`);
  } finally {
    log(`Tearing down sandbox...`);
    await sandbox.destroy();
  }
}

// ---------- Vercel Sandbox shim ----------
// Replace this stub with real Sandbox API calls when activating the live CI
// layer. The Vercel Sandbox API is documented at
// https://vercel.com/docs/sandbox — exact method names may evolve. This shim
// lets the rest of the script be reviewed/typechecked without a live API.

interface Sandbox {
  url: string;
  installDeps(deps: string[]): Promise<void>;
  copyFiles(localPath: string): Promise<void>;
  startServer(cmd: string): Promise<void>;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  destroy(): Promise<void>;
}

async function provisionSandbox(opts: DriverOptions): Promise<Sandbox> {
  // STUB. Replace with real Sandbox provisioning when CI is activated.
  throw new Error(
    "ci-sandbox-test driver is a scaffold. Implement provisionSandbox() " +
      "against the Vercel Sandbox API to activate the live CI layer.",
  );
  // Suppress unused-arg warnings for the scaffold-state lint.
  void opts;
}

function frameworkDeps(framework: string): string[] {
  switch (framework) {
    case "nextjs":
      return ["next", "react", "react-dom"];
    case "tanstack-start":
      return [
        "@tanstack/react-start",
        "@tanstack/react-router",
        "react",
        "react-dom",
        "vinxi",
      ];
    case "hono":
      return ["hono"];
    case "express":
      return ["express"];
    default:
      return [];
  }
}

function frameworkStartCmd(framework: string): string {
  switch (framework) {
    case "nextjs":
      return "pnpm next dev";
    case "tanstack-start":
      return "pnpm vinxi dev";
    case "hono":
      return "pnpm tsx src/index.ts";
    case "express":
      return "pnpm tsx src/index.ts";
    default:
      return "pnpm dev";
  }
}

// ---------- Trace polling ----------

async function pollForTrace(
  baseUrl: string,
  projectId: string,
  traceMarker: string,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const url = `${baseUrl}/api/v1/traces?projectId=${encodeURIComponent(projectId)}&limit=50`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          events?: Array<{ event?: { prompt?: string; traceId?: string } }>;
        };
        if (
          (data.events ?? []).some(
            (e) =>
              e?.event?.prompt?.includes(traceMarker) ||
              e?.event?.traceId === traceMarker,
          )
        ) {
          return true;
        }
      }
    } catch {
      // transient
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

// ---------- Util ----------

function required(name: string): string {
  const v = process.env[name];
  if (!v) fail(`Missing required env var ${name}`);
  return v;
}

function log(msg: string): void {
  process.stderr.write(`[ci-sandbox] ${msg}\n`);
}

function fail(msg: string): never {
  process.stderr.write(`[ci-sandbox] FAIL: ${msg}\n`);
  process.exit(1);
}

main().catch((err) => {
  fail((err as Error).message ?? String(err));
});
