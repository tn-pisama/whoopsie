import { GeistMono } from "geist/font/mono";
import { ContactLink } from "@/components/contact-link";

export const metadata = {
  title: "Privacy — whoopsie",
  description:
    "What whoopsie collects, where it goes, how long it stays, and how to delete it.",
};

const LAST_UPDATED = "2026-05-13";

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
          <a href="/terms" className="hover:text-ink">terms</a>
          <a href="https://github.com/tn-pisama/whoopsie" className="hover:text-ink">github</a>
        </nav>
      </header>

      <section className="py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Privacy, in plain English.
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          Whoopsie watches your AI app for failures. To do that, our SDK sends
          us a record of each model call. We strip common PII before it leaves
          your machine, strip it again on our server, and delete everything
          after 7 days. That&apos;s the short version.
        </p>
      </section>

      <section className="space-y-10 border-t border-line py-10">
        <Block heading="What we collect">
          <p>
            For each AI request the SDK is wrapped around: your prompt, the
            model&apos;s response, tool calls (name, arguments, result),
            reasoning / chain-of-thought text when the model emits it (o1,
            Claude extended thinking, Gemini thinking), and metadata like
            model name, token counts, cost, finish reason, and timing. Your
            project ID travels with each event so the dashboard knows where
            to display it.
          </p>
          <p className="mt-3">
            Common PII patterns — emails, phone numbers, SSNs, credit-card
            numbers, JWTs, and OpenAI/Anthropic/AWS/GitHub/Slack-shaped API
            keys — are replaced with placeholders before the SDK sends
            anything. The full pattern list is in{" "}
            <a
              href="https://github.com/tn-pisama/whoopsie/blob/main/packages/sdk/src/redact.ts"
              className="underline decoration-coral underline-offset-2"
            >
              packages/sdk/src/redact.ts
            </a>
            . If your prompts can contain anything you wouldn&apos;t want us
            to see, use{" "}
            <code className={GeistMono.className}>redact: &quot;metadata-only&quot;</code>{" "}
            in the SDK options — token counts and detector verdicts only, zero
            text.
          </p>
          <p className="mt-3">
            If your install came from one of the AI builder paths on{" "}
            <a href="/install" className="underline decoration-coral underline-offset-2">/install</a>
            {" "}(Lovable, Replit, Bolt, v0), the install prompt sets a{" "}
            <code className={GeistMono.className}>WHOOPSIE_PLATFORM</code> env
            var with that slug (e.g. {" "}
            <code className={GeistMono.className}>lovable</code>). The SDK
            attaches it as <code className={GeistMono.className}>metadata.whoopsie_platform</code>
            {" "}on each trace so we can monitor whether installs from a given
            platform start silently breaking after the platform changes its AI
            builder. The slug is install-source metadata at the same disclosure
            level as the model name — it contains no user-content text. You can
            unset the env var to drop the tag.
          </p>
          <p className="mt-3">
            If you opt in to the contact-email field on{" "}
            <a href="/install" className="underline decoration-coral underline-offset-2">/install</a>
            , we keep the email so we can reach you about your project. That&apos;s
            the only piece of personal data we intentionally retain.
          </p>
        </Block>

        <Block heading="Where it goes">
          <p>
            Trace events are stored in a single Neon Postgres database (us-east-1),
            provisioned through Vercel&apos;s Marketplace integration. The
            dashboard runs on Vercel Functions in the same region. No
            third-party analytics, no tag manager.
          </p>
          <p className="mt-3">
            Even if a request reaches our server with PII somehow still
            attached — for example, a custom client that bypasses the SDK —
            the ingest endpoint runs the same redaction patterns again before
            anything is written to Postgres. We treat the SDK as a
            convenience, not a trust boundary.
          </p>
          <p className="mt-3">
            Your project ID is the only auth on the ingest API in v0. It&apos;s
            not a secret in the cryptographic sense, but anyone who knows it
            can post events tagged as your project. Treat it like a
            low-sensitivity credential — don&apos;t paste it into public chat
            or commit it to a public repo.
          </p>
          <p className="mt-3">
            Trace events are deleted 7 days after we receive them. The cleanup
            is a daily cron job; there&apos;s no UI to extend retention and no
            paid tier where it gets longer.
          </p>
        </Block>

        <Block heading="Delete or contact">
          <p>
            <ContactLink kind="hi">Send a message</ContactLink> with your
            project ID and we&apos;ll delete your traces, your contact email,
            and your terms-acceptance row. Security reports go to{" "}
            <ContactLink kind="security">security@whoopsie.dev</ContactLink>;
            see{" "}
            <a
              href="https://github.com/tn-pisama/whoopsie/blob/main/SECURITY.md"
              className="underline decoration-coral underline-offset-2"
            >
              SECURITY.md
            </a>
            .
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            Both forms relay through{" "}
            <a
              href="https://www.brevo.com"
              className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
            >
              Brevo
            </a>{" "}
            (our email delivery sub-processor) to the maintainer&apos;s mailbox.
            If the relay is down, the form falls back to opening your mail
            client with the message preserved.
          </p>
        </Block>
      </section>

      <footer className="border-t border-line py-12 font-mono text-xs text-ink-muted">
        <p>Last updated: {LAST_UPDATED}.</p>
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
