#!/usr/bin/env node
import { Command } from "commander";
import { init } from "./init.js";
import { startMcpServer } from "./mcp.js";
import { verify } from "./verify.js";

const program = new Command();

program
  .name("whoopsie")
  .description("See your AI app's failures live. https://whoopsie.dev")
  .version("0.1.0");

program
  .command("init")
  .description("Wire whoopsieMiddleware into your Next.js + AI SDK app")
  .option("--cwd <path>", "Project root", process.cwd())
  .option("--no-open", "Skip opening the browser")
  .option("--dry-run", "Print planned changes without writing files")
  .action(async (opts) => {
    await init({
      cwd: opts.cwd,
      open: opts.open,
      dryRun: opts.dryRun,
    });
  });

program
  .command("mcp")
  .description(
    "Run an MCP server over stdio so Cursor/Claude Code can read your project's failures.",
  )
  .option(
    "-p, --project-id <id>",
    "Whoopsie project id (defaults to WHOOPSIE_PROJECT_ID env var)",
  )
  .option(
    "--base-url <url>",
    "Override the whoopsie base URL (default https://whoopsie.dev)",
  )
  .action(async (opts: { projectId?: string; baseUrl?: string }) => {
    const projectId = opts.projectId ?? process.env.WHOOPSIE_PROJECT_ID;
    if (!projectId) {
      console.error(
        "no project id. Pass --project-id or set WHOOPSIE_PROJECT_ID.",
      );
      process.exit(1);
    }
    await startMcpServer({ projectId, baseUrl: opts.baseUrl });
  });

program
  .command("verify")
  .description(
    "POST a synthetic trace and confirm it round-trips through the dashboard. Use after install to prove integration works.",
  )
  .option("--cwd <path>", "Project root for reading .env.local", process.cwd())
  .option(
    "-p, --project-id <id>",
    "Override project id (defaults to WHOOPSIE_PROJECT_ID or .env.local)",
  )
  .option(
    "--base-url <url>",
    "Override the whoopsie base URL (default https://whoopsie.dev)",
  )
  .option(
    "--timeout-ms <ms>",
    "How long to wait for the trace to surface (default 15000)",
    (v) => Number(v),
  )
  .action(
    async (opts: {
      cwd: string;
      projectId?: string;
      baseUrl?: string;
      timeoutMs?: number;
    }) => {
      await verify({
        cwd: opts.cwd,
        projectId: opts.projectId,
        baseUrl: opts.baseUrl,
        timeoutMs: opts.timeoutMs,
      });
    },
  );

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
