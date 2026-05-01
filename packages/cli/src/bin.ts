#!/usr/bin/env node
import { Command } from "commander";
import { init } from "./init.js";

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

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
