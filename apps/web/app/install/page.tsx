import { GeistMono } from "geist/font/mono";
import { InstallPageShell } from "@/components/install-page-shell";
import { platforms } from "@/lib/install-prompts";
import { newProjectId } from "@/lib/project-id";

export const dynamic = "force-dynamic";

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; id?: string }>;
}) {
  const params = await searchParams;
  // If they came back to this page with a project id query, reuse it.
  // Otherwise mint a fresh one — but the InstallPageShell client component
  // will then check localStorage and override with a stable per-browser id
  // if one exists. This way the same browser keeps the same id across
  // visits, which removes the "rotating ids across retries" defense
  // signal that AI builders interpret as injection-probe behavior.
  const serverProjectId =
    typeof params.id === "string" && /^ws_[A-Za-z0-9]+$/.test(params.id)
      ? params.id
      : newProjectId();
  // Fall back to lovable for any unknown or removed slug (e.g. legacy
  // /install?platform=cursor URLs after Cursor was dropped 2026-05-12).
  const requested =
    typeof params.platform === "string" ? params.platform : null;
  const initial =
    requested && platforms.some((p) => p.slug === requested)
      ? requested
      : "lovable";

  const platformsForServerId = platforms.map((p) => ({
    slug: p.slug,
    name: p.name,
    blurb: p.blurb,
    prompt: p.template(serverProjectId),
    untested: p.untested,
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
        <nav className="flex items-center gap-6 font-mono text-xs text-ink-muted">
          <a href="/demo" className="hover:text-ink">demo</a>
          <a href="/privacy" className="hover:text-ink">privacy</a>
          <a href="/terms" className="hover:text-ink">terms</a>
        </nav>
      </header>

      <section className="py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Add whoopsie to your AI app.
        </h1>
        <p className="mt-4 max-w-xl text-ink-muted">
          Pick where you build. Copy the prompt. Paste it into your AI builder&apos;s
          chat. It edits the code for you. No terminal needed (if you have one,
          there&apos;s a faster path further down).
        </p>
        <p className="mt-3 max-w-xl text-sm text-ink-muted">
          The prompt defaults to <span className="font-mono">standard</span> mode:
          full prompts, completions, tool args, and reasoning text — with emails,
          phone numbers, SSNs, card-shaped numbers, JWTs, and provider API keys
          regex-scrubbed before egress, then scrubbed again server-side. Need
          zero text off-machine? Flip to <span className="font-mono">redact:&nbsp;&quot;metadata-only&quot;</span>.
          Full data-handling story:{" "}
          <a href="/privacy" className="underline decoration-coral underline-offset-2 hover:text-ink">
            /privacy
          </a>
          .
        </p>
      </section>

      <InstallPageShell
        initial={initial}
        serverProjectId={serverProjectId}
        platformsForServerId={platformsForServerId}
      />

      <footer className="border-t border-line py-12 font-mono text-xs text-ink-muted">
        <a href="/" className="hover:text-ink">← back</a>
      </footer>
    </main>
  );
}
