import { GeistMono } from "geist/font/mono";
import { InstallTabs } from "@/components/install-tabs";
import { platforms } from "@/lib/install-prompts";
import { newProjectId } from "@/lib/project-id";

export const dynamic = "force-dynamic";

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; id?: string }>;
}) {
  const params = await searchParams;
  // If they came back to this page with a project id query, reuse it; otherwise mint fresh.
  const projectId =
    typeof params.id === "string" && /^ws_[A-Za-z0-9]+$/.test(params.id)
      ? params.id
      : newProjectId();
  const initial =
    typeof params.platform === "string" ? params.platform : "lovable";

  const dashboardUrl = `https://whoopsie.dev/live/${projectId}`;
  const views = platforms.map((p) => ({
    slug: p.slug,
    name: p.name,
    blurb: p.blurb,
    prompt: p.template(projectId),
  }));

  return (
    <main className="mx-auto max-w-3xl px-6">
      <header className="flex items-center justify-between py-8">
        <a
          href="/"
          className={`${GeistMono.className} text-lg lowercase tracking-tight hover:text-coral`}
        >
          whoopsie
        </a>
        <a
          href={`/install?id=${projectId}`}
          className="font-mono text-xs text-ink-muted hover:text-ink"
        >
          new id
        </a>
      </header>

      <section className="py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Add whoopsie to your AI app.
        </h1>
        <p className="mt-4 max-w-xl text-ink-muted">
          Pick where you build. Copy the prompt. Paste it into your AI builder&apos;s
          chat. It edits the code for you. No terminal needed.
        </p>
      </section>

      <section>
        <InstallTabs
          platforms={views}
          initial={initial}
          projectId={projectId}
          dashboardUrl={dashboardUrl}
        />
      </section>

      <section className="mt-16 border-t border-line py-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Why this works
        </h2>
        <p className="mt-4 text-ink-muted">
          Lovable, Replit, Bolt, Cursor, and v0 all let you talk to an AI that
          edits your code. The prompt above tells that AI exactly what to do:
          install the SDK, find the model call, wrap it. The wrap is one line of
          TypeScript that catches loops, hallucinations, and cost spikes and
          streams them to your dashboard.
        </p>
        <p className="mt-4 text-ink-muted">
          You don&apos;t have to read the code, write the code, or run anything in
          a terminal. If your AI builder gets stuck, paste the same prompt
          again — it&apos;s self-contained.
        </p>
      </section>

      <section className="mt-4 border-t border-line py-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Bonus: see failures inside your editor
        </h2>
        <p className="mt-4 text-ink-muted">
          If you use Cursor or Claude Code, add whoopsie as an MCP server and
          your editor&apos;s AI can read your live failures. Then you can just ask{" "}
          <em>&ldquo;what did my agent break in the last hour?&rdquo;</em> in
          chat instead of switching tabs.
        </p>
        <pre className={`${GeistMono.className} mt-4 overflow-x-auto rounded-md border border-line bg-white p-4 text-[12px] leading-6 text-ink-soft`}>
{`// ~/.cursor/mcp.json
{
  "mcpServers": {
    "whoopsie": {
      "command": "npx",
      "args": ["-y", "@whoopsie/cli", "mcp"],
      "env": { "WHOOPSIE_PROJECT_ID": "${projectId}" }
    }
  }
}`}
        </pre>
        <p className="mt-2 text-xs text-ink-muted">
          Same shape works for Claude Code (
          <code className={GeistMono.className}>~/.claude/mcp_servers.json</code>
          ) and any other MCP-compatible client.
        </p>
      </section>

      <footer className="border-t border-line py-12 font-mono text-xs text-ink-muted">
        <a href="/" className="hover:text-ink">← back</a>
      </footer>
    </main>
  );
}
