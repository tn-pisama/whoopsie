#!/usr/bin/env node
import { Command } from "commander";
import { init } from "./init.js";
import { startMcpServer } from "./mcp.js";

const program = new Command();

program
  .name("whoopsie")
  .description("See your AI app's failures live. https://whoopsie.dev")
  .version("0.0.1");

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

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
