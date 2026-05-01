// Orchestrator. Runs every persona in parallel until interrupted.
// Usage:
//   pnpm --filter @whoopsie/synth start                    -> runs against prod (https://whoopsie.dev)
//   WHOOPSIE_INGEST_URL=http://localhost:3000/api/v1/spans pnpm --filter @whoopsie/synth start
//   pnpm --filter @whoopsie/synth once                     -> single tick per persona, then exit
import { personas } from "./personas/index.js";
import { jitter, postEvent } from "./util.js";

const argv = process.argv.slice(2);
const onceFlag = argv.includes("--once");
const onlyFlag = argv.find((a) => a.startsWith("--only="))?.slice(7);

const endpoint =
  process.env.WHOOPSIE_INGEST_URL ?? "https://whoopsie.dev/api/v1/spans";
const dashboardBase =
  process.env.WHOOPSIE_DASHBOARD_BASE ?? "https://whoopsie.dev/live";

const filtered = onlyFlag
  ? personas.filter((p) => p.name === onlyFlag)
  : personas;

if (filtered.length === 0) {
  console.error(`no persona matched "--only=${onlyFlag}"`);
  process.exit(1);
}

console.log(`whoopsie synth: ${filtered.length} persona${filtered.length === 1 ? "" : "s"} → ${endpoint}`);
console.log("");
for (const p of filtered) {
  console.log(`  • ${p.name.padEnd(22)} ${dashboardBase}/${p.projectId}`);
}
console.log("");
if (!onceFlag) {
  console.log("Ctrl+C to stop. Running until interrupted.\n");
}

let stopped = false;
process.on("SIGINT", () => {
  console.log("\nstopping...");
  stopped = true;
});
process.on("SIGTERM", () => {
  stopped = true;
});

async function tick(persona: (typeof filtered)[number]): Promise<void> {
  const ev = persona.next();
  const t0 = Date.now();
  const res = await postEvent(ev, endpoint);
  const ms = Date.now() - t0;
  const hits = res.hits.length > 0 ? `[${res.hits.join(",")}]` : "";
  const status = res.ok ? "✓" : `✗ (${res.status})`;
  console.log(
    `${new Date().toISOString().slice(11, 19)} ${status} ${persona.name.padEnd(22)} ${ms.toString().padStart(4)}ms ${hits}`,
  );
}

async function loop(persona: (typeof filtered)[number]): Promise<void> {
  while (!stopped) {
    try {
      await tick(persona);
    } catch (err) {
      console.error(`${persona.name} error:`, err);
    }
    if (stopped) break;
    await new Promise((r) => setTimeout(r, jitter(persona.intervalMs)));
  }
}

if (onceFlag) {
  await Promise.all(filtered.map((p) => tick(p).catch(console.error)));
  process.exit(0);
} else {
  await Promise.all(filtered.map((p) => loop(p)));
  process.exit(0);
}
