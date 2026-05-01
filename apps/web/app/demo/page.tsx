import { GeistMono } from "geist/font/mono";
import { DemoChat } from "@/components/demo-chat";
import { DemoFailureButtons } from "@/components/demo-failure-buttons";
import { LiveStream } from "@/components/live-stream";

export const dynamic = "force-dynamic";

const DEMO_PROJECT_ID = "ws_demo_public";

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pb-20">
      <header className="flex items-center justify-between py-8">
        <a
          href="/"
          className={`${GeistMono.className} text-lg lowercase tracking-tight hover:text-coral`}
        >
          whoopsie
        </a>
        <nav className="flex items-center gap-6 font-mono text-xs text-ink-muted">
          <a href="/install" className="hover:text-ink">install</a>
          <a href="/privacy" className="hover:text-ink">privacy</a>
          <a href="https://github.com/tn-pisama/whoopsie" className="hover:text-ink">github</a>
        </nav>
      </header>

      <section className="py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Try whoopsie. Watch your trace land live.
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          A real chat, calling{" "}
          <code className={GeistMono.className}>claude-haiku-4-5</code> through
          the Vercel AI Gateway, wrapped in{" "}
          <code className={GeistMono.className}>@whoopsie/sdk</code> in
          metadata-only mode. Every visitor adds activity to the same public
          dashboard at{" "}
          <a
            href={`/live/${DEMO_PROJECT_ID}`}
            className="underline decoration-coral underline-offset-2 hover:text-coral"
          >
            /live/{DEMO_PROJECT_ID}
          </a>
          . The buttons below it post canned failure events so you can see
          what each detector looks like without burning model tokens.
        </p>
      </section>

      <section className="space-y-12">
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
            chat
          </h2>
          <DemoChat />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
            trigger a specific failure
          </h2>
          <DemoFailureButtons />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
            live tail
          </h2>
          <div className="rounded-lg border border-line bg-paper">
            <LiveStream projectId={DEMO_PROJECT_ID} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Open in a separate tab if you want a bigger view:{" "}
            <a
              href={`/live/${DEMO_PROJECT_ID}`}
              className="underline decoration-coral underline-offset-2 hover:text-coral"
            >
              /live/{DEMO_PROJECT_ID}
            </a>
          </p>
        </div>
      </section>

      <section className="mt-16 border-t border-line py-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Want this in your own app?
        </h2>
        <p className="mt-3 max-w-2xl text-ink-muted">
          The chat above is one wrapped{" "}
          <code className={GeistMono.className}>streamText</code> call.
          That&apos;s it. <a href="/install" className="underline decoration-coral underline-offset-2 hover:text-ink">Get the install prompt for your AI builder →</a>
        </p>
      </section>

      <footer className="border-t border-line py-12 font-mono text-xs text-ink-muted">
        <p>
          Demo rate limit: 10 chat messages per IP per hour. The dashboard at{" "}
          <code>/live/{DEMO_PROJECT_ID}</code> is public — anything you type
          in metadata-only mode (token counts, detector hits) is visible to
          anyone watching.
        </p>
        <p className="mt-2">
          <a href="/" className="hover:text-ink">← back</a>
        </p>
      </footer>
    </main>
  );
}
