import { GeistMono } from "geist/font/mono";

const PLATFORMS = [
  { slug: "lovable", name: "Lovable" },
  { slug: "replit", name: "Replit" },
  { slug: "bolt", name: "Bolt" },
  { slug: "cursor", name: "Cursor" },
  { slug: "v0", name: "v0" },
] as const;

const ADVANCED_SAMPLE = `import { wrapLanguageModel, streamText } from "ai";
import { whoopsieMiddleware } from "@whoopsie/sdk";

const model = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: whoopsieMiddleware(),
});

await streamText({ model, prompt: "..." });`;

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6">
      <header className="flex items-center justify-between py-8">
        <span className={`${GeistMono.className} text-lg lowercase tracking-tight`}>
          whoopsie
        </span>
        <nav className="flex items-center gap-6 font-mono text-xs text-ink-muted">
          <a href="/install" className="hover:text-ink">
            install
          </a>
          <a href="https://github.com/tn-pisama/whoopsie" className="hover:text-ink">
            github
          </a>
        </nav>
      </header>

      <section className="py-20 sm:py-28">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          See when your AI app
          <br />
          breaks itself.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">
          Your chatbot loops. Your agent burns through tokens. Your RAG bot makes
          things up. Whoopsie catches it live and shows you what happened. Free
          forever.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="/install"
            className={`${GeistMono.className} inline-flex items-center rounded-md bg-ink px-5 py-2.5 text-sm text-paper transition hover:bg-coral`}
          >
            get the prompt →
          </a>
          <span className="text-sm text-ink-muted">no terminal, no signup</span>
        </div>
        <p className="mt-3 font-mono text-xs text-ink-muted">
          Works in {" "}
          {PLATFORMS.map((p, i) => (
            <span key={p.slug}>
              <a href={`/install?platform=${p.slug}`} className="hover:text-coral">
                {p.name}
              </a>
              {i < PLATFORMS.length - 1 ? ", " : ""}
            </span>
          ))}
          .
        </p>
      </section>

      <section className="mt-8 rounded-md border border-line bg-coral-soft/30 px-4 py-3 text-sm text-ink-soft">
        <span className={`${GeistMono.className} text-coral`}>pre-alpha</span>{" "}
        — first published 2026-05-01. Use it on a side project, not anything
        production-critical. The data-handling story is at{" "}
        <a href="/privacy" className="underline decoration-coral underline-offset-2 hover:text-ink">
          /privacy
        </a>
        ; metadata-only mode ships zero prompt or completion text.
      </section>

      <section className="grid gap-10 border-t border-line py-16 sm:grid-cols-3">
        <Feature
          title="Catches what's going wrong"
          body="Loops. Repetition. Hallucinations. Cost spikes. Tasks the agent ignored. Seven kinds of failure, all live."
        />
        <Feature
          title="No code, no terminal"
          body="Copy a prompt. Paste it into your AI builder's chat. Your AI edits the code for you. You watch the dashboard."
        />
        <Feature
          title="Send only metadata if you want"
          body={
            <>
              Default mode redacts emails, phones, cards, JWTs, and provider API keys in the SDK before they leave your app. Metadata-only mode ships token counts and detector verdicts only — zero prompt or completion text.{" "}
              <a href="/privacy" className="underline decoration-coral underline-offset-2 hover:text-ink">
                What we store →
              </a>
            </>
          }
        />
      </section>

      <section className="border-t border-line py-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-8 space-y-6">
          <Step
            n={1}
            title="Pick where you build"
            body="Lovable, Replit, Bolt, Cursor, v0 — all supported. We give you a prompt tailored to that tool."
          />
          <Step
            n={2}
            title="Paste the prompt"
            body="Open your AI builder's chat. Paste. Send. The AI installs whoopsie and wires it up. Takes about a minute."
          />
          <Step
            n={3}
            title="Watch your live dashboard"
            body="The first time someone uses your app, every chat call shows up. Failures get a red tag with what went wrong, in plain English."
          />
        </ol>

        <div className="mt-10">
          <a
            href="/install"
            className={`${GeistMono.className} inline-flex items-center rounded-md border border-line bg-white px-4 py-2 text-sm text-ink-soft hover:border-coral hover:text-coral`}
          >
            get the prompt →
          </a>
        </div>
      </section>

      <section className="border-t border-line py-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          What we catch
        </h2>
        <p className="mt-4 max-w-xl text-ink-muted">
          Each one runs locally on your traces. No second LLM call, no extra cost.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            ["loop", "Your agent kept calling the same tool over and over."],
            ["repetition", "Your bot's reply repeated the same line."],
            ["cost-spike", "A single call burned a lot of tokens or dollars."],
            ["completion-gap", "Stopped early or ran on forever."],
            ["hallucination-lite", "Said something that wasn't in its sources."],
            ["context-neglect", "Ignored the user's settings or context."],
            ["derailment", "Did the wrong thing for the task it was given."],
          ].map(([name, plain]) => (
            <li key={name} className="rounded-md border border-line bg-white p-4">
              <div className={`${GeistMono.className} text-xs uppercase text-coral`}>
                {name}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{plain}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line py-16">
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink-muted transition hover:text-ink">
            For developers (the actual code)
            <span className="ml-2 text-xs">▸</span>
          </summary>
          <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-2 font-mono text-xs text-ink-muted">
              <span>app/api/chat/route.ts</span>
              <span>typescript</span>
            </div>
            <pre className={`${GeistMono.className} overflow-x-auto px-4 py-4 text-sm leading-6`}>
              <code>{ADVANCED_SAMPLE}</code>
            </pre>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            That&apos;s the entire wrap. Vercel AI SDK v6, runs in any Next.js app
            (or anywhere you call <code className={GeistMono.className}>streamText</code>).
            If you&apos;re comfortable in a terminal,{" "}
            <code className={GeistMono.className}>npx @whoopsie/cli init</code>{" "}
            does the wrap for you.
          </p>
        </details>
      </section>

      <footer className="border-t border-line py-12 font-mono text-xs text-ink-muted">
        <p>MIT-licensed SDK. Hosted dashboard free forever.</p>
        <p className="mt-2">No accounts. No metering. No upsell. Pre-alpha.</p>
        <p className="mt-3">
          <a href="/privacy" className="hover:text-ink">privacy</a>
          {" · "}
          <a href="https://github.com/tn-pisama/whoopsie" className="hover:text-ink">github</a>
          {" · "}
          <a href="https://www.npmjs.com/package/@whoopsie/sdk" className="hover:text-ink">npm</a>
        </p>
      </footer>
    </main>
  );
}

function Feature({
  title,
  body,
}: {
  title: string;
  body: string | React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-2 text-sm text-ink-muted">{body}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-6">
      <span className="font-mono text-sm text-coral">0{n}</span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-ink-muted">{body}</p>
      </div>
    </li>
  );
}
