import { GeistMono } from "geist/font/mono";

export const metadata = {
  title: "Privacy & data handling — whoopsie",
  description:
    "What whoopsie stores, what it redacts, how long it keeps it, and how to send nothing but metadata.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20">
      <header className="flex items-center justify-between py-8">
        <a
          href="/"
          className={`${GeistMono.className} text-lg lowercase tracking-tight hover:text-coral`}
        >
          whoopsie
        </a>
        <nav className="flex items-center gap-6 font-mono text-xs text-ink-muted">
          <a href="/install" className="hover:text-ink">install</a>
          <a href="https://github.com/tn-pisama/whoopsie" className="hover:text-ink">github</a>
        </nav>
      </header>

      <section className="py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          What whoopsie sees, and what it doesn&apos;t.
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          Plain answers, no marketing. Whoopsie&apos;s middleware sits inside your
          app and forwards trace events about your AI calls to{" "}
          <code className={GeistMono.className}>whoopsie.dev</code>. That&apos;s
          a real privacy choice. Here&apos;s exactly what it does, and how to
          dial it down.
        </p>
      </section>

      <section className="space-y-10 border-t border-line py-10">
        <Block heading="What whoopsie stores by default">
          <p>For every call to{" "}
            <code className={GeistMono.className}>streamText</code>{" "}
            or{" "}
            <code className={GeistMono.className}>generateText</code>:
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-1 text-sm text-ink-soft">
            <li>The model name (e.g. <code>gpt-4o</code>).</li>
            <li>The prompt and completion text, with PII redacted (see below).</li>
            <li>Tool call names + arguments (with PII redacted).</li>
            <li>Input + output token counts and provider-reported cost, if available.</li>
            <li>Finish reason, duration, and error info.</li>
            <li>An anonymous project ID you control.</li>
          </ul>
          <p className="mt-3">
            That&apos;s it. We don&apos;t see your API keys, your environment,
            your file system, your customers, your database, or anything else
            in the request that isn&apos;t the model call itself.
          </p>
        </Block>

        <Block heading="What gets redacted before it leaves your machine">
          <p>
            The SDK runs a regex pack on prompts, completions, and tool args
            before any HTTP. Default mode (
            <code className={GeistMono.className}>standard</code>) replaces:
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-1 text-sm text-ink-soft">
            <li>Email addresses → <code>[email]</code></li>
            <li>Phone numbers → <code>[phone]</code></li>
            <li>Credit-card-shaped numbers → <code>[card]</code></li>
            <li>JWTs → <code>[jwt]</code></li>
            <li>OpenAI/Anthropic/AWS/GitHub/Slack-shaped API keys → <code>[openai-key]</code> etc.</li>
          </ul>
          <p className="mt-3">
            Redaction happens in the client SDK, before the network call.
            Whoopsie servers never see the raw values for these patterns. The
            regex source lives at{" "}
            <a
              href="https://github.com/tn-pisama/whoopsie/blob/main/packages/sdk/src/redact.ts"
              className="underline decoration-coral underline-offset-2"
            >
              packages/sdk/src/redact.ts
            </a>
            .
          </p>
        </Block>

        <Block heading="Send nothing but metadata">
          <p>
            If you&apos;re building anything where the prompt or completion is
            sensitive — health, legal, internal docs, customer messages — use
            metadata-only mode. Whoopsie still detects loops, cost spikes, and
            tool patterns, just without the text.
          </p>
          <pre className={`${GeistMono.className} mt-4 overflow-x-auto rounded-md border border-line bg-white p-4 text-[12.5px] leading-6 text-ink-soft`}>
{`import { wrapLanguageModel } from "ai";
import { whoopsieMiddleware } from "@whoopsie/sdk";

const model = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: whoopsieMiddleware({ redact: "metadata-only" }),
});`}
          </pre>
          <p className="mt-3">
            In this mode the SDK ships token counts, finish reasons, tool
            names, and detector verdicts. Zero prompt text. Zero completion
            text. Zero tool arguments.
          </p>
          <p className="mt-3">
            Other modes:{" "}
            <code className={GeistMono.className}>aggressive</code> (extends
            standard with names, IPs, URLs, SSN-shaped numbers),{" "}
            <code className={GeistMono.className}>off</code> (no redaction
            — only sensible if you&apos;ve already vetted the inputs upstream).
          </p>
        </Block>

        <Block heading="Retention">
          <p>
            Trace events are deleted automatically 7 days after they&apos;re
            received. The cleanup runs daily at 5:00 UTC via a Vercel cron
            against{" "}
            <code className={GeistMono.className}>/api/internal/cleanup</code>.
            There&apos;s no UI to extend retention. There&apos;s no billing
            tier where retention gets longer. If you want longer history, run
            the dashboard yourself — the SDK and detectors are MIT-licensed.
          </p>
          <p className="mt-3">
            Contact emails (if you opt in to the email-capture form) are
            retained until you ask us to delete them. Email{" "}
            <a
              href="mailto:hi@whoopsie.dev"
              className="underline decoration-coral underline-offset-2"
            >
              hi@whoopsie.dev
            </a>{" "}
            and we&apos;ll remove them.
          </p>
        </Block>

        <Block heading="TOS acceptance log">
          <p>
            When you check &ldquo;I agree&rdquo; on{" "}
            <a
              href="/install"
              className="underline decoration-coral underline-offset-2"
            >
              /install
            </a>{" "}
            we record a single row to{" "}
            <code className={GeistMono.className}>whoopsie_tos_acceptances</code>{" "}
            with: timestamp, your IP, your user-agent string, the project ID
            you were viewing (if any), and a version string identifying which
            text of the terms you saw. This is the audit trail for{" "}
            <a
              href="/terms"
              className="underline decoration-coral underline-offset-2"
            >
              /terms
            </a>
            ; without it we couldn&apos;t prove what you agreed to.
          </p>
          <p className="mt-3">
            Acceptance rows are kept for the lifetime of the project. Email{" "}
            <a
              href="mailto:hi@whoopsie.dev"
              className="underline decoration-coral underline-offset-2"
            >
              hi@whoopsie.dev
            </a>{" "}
            with your IP or project ID and we&apos;ll delete your row.
          </p>
        </Block>

        <Block heading="Where it lives">
          <p>
            Trace events are stored in a single Neon Postgres database in the
            US East 1 (<code>iad1</code>) region. The database is provisioned
            via Vercel&apos;s Neon Marketplace integration. Connection strings
            are encrypted in Vercel&apos;s env-var store; the database is not
            publicly reachable.
          </p>
          <p className="mt-3">
            The dashboard is a Next.js app on Vercel Functions, region{" "}
            <code>iad1</code>. No analytics, no third-party trackers, no
            tag manager.
          </p>
        </Block>

        <Block heading="Who's behind this">
          <p>
            Whoopsie is built by{" "}
            <a
              href="https://x.com/tnikulainen"
              className="underline decoration-coral underline-offset-2"
            >
              Tuomo Nikulainen
            </a>
            . Single maintainer, not a company yet. The product is the
            vibe-coder cut of{" "}
            <a
              href="https://pisama.ai"
              className="underline decoration-coral underline-offset-2"
            >
              Pisama
            </a>
            , a multi-agent failure detection platform with the same author.
          </p>
          <p className="mt-3">
            If you&apos;re security-sensitive: this is a new project. The
            packages were first published on 2026-05-01. Download counts will
            be low for a while. Treat it accordingly — try metadata-only mode
            first, run on a side project before production, and read the
            source. If something looks off, open an issue at{" "}
            <a
              href="https://github.com/tn-pisama/whoopsie/issues"
              className="underline decoration-coral underline-offset-2"
            >
              github.com/tn-pisama/whoopsie/issues
            </a>
            .
          </p>
        </Block>

        <Block heading="Local-only mode (planned)">
          <p>
            <code className={GeistMono.className}>WHOOPSIE_LOCAL=1</code> will
            run an offline dashboard against a local SQLite store, with
            nothing leaving your laptop. Tracking issue:{" "}
            <a
              href="https://github.com/tn-pisama/whoopsie/issues"
              className="underline decoration-coral underline-offset-2"
            >
              file one
            </a>{" "}
            if you want it sooner.
          </p>
        </Block>
      </section>

      <footer className="border-t border-line py-12 font-mono text-xs text-ink-muted">
        <p>Last updated: 2026-05-01.</p>
        <p className="mt-2">
          <a href="/" className="hover:text-ink">← back to whoopsie</a>
        </p>
      </footer>
    </main>
  );
}

function Block({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
      <div className="mt-3 space-y-2 text-ink-soft">{children}</div>
    </section>
  );
}
