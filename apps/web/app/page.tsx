import { GeistMono } from "geist/font/mono";

const PLATFORMS = [
  { slug: "lovable", name: "Lovable" },
  { slug: "replit", name: "Replit" },
  { slug: "bolt", name: "Bolt" },
  { slug: "cursor", name: "Cursor" },
  { slug: "v0", name: "v0" },
] as const;

const ADVANCED_SAMPLE = `import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { observe } from "@whoopsie/sdk";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: observe(openai("gpt-4o"), { redact: "standard" }),
    messages: convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}`;

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
          things up. Whoopsie catches it live and shows you what happened.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="/install"
            className={`${GeistMono.className} inline-flex items-center rounded-md bg-ink px-5 py-2.5 text-sm text-paper transition hover:bg-coral`}
          >
            get the prompt →
          </a>
          <a
            href="/demo"
            className={`${GeistMono.className} inline-flex items-center rounded-md border border-line bg-white px-5 py-2.5 text-sm text-ink-soft transition hover:border-coral hover:text-coral`}
          >
            try the demo →
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
        ; PII is scrubbed in the SDK before any bytes leave your app.
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
          title="PII scrubbed before bytes leave your app"
          body={
            <>
              Default <code className={`${GeistMono.className} text-[12px]`}>standard</code> mode ships prompt, completion, tool args, and model reasoning text — with emails, phones, SSNs, card numbers, JWTs, and provider API keys replaced in the SDK before egress. Switch to{" "}
              <code className={`${GeistMono.className} text-[12px]`}>metadata-only</code> if you can&apos;t send any text off-machine.{" "}
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
          Failures we&apos;ve caught before
        </h2>
        <p className="mt-4 max-w-xl text-ink-muted">
          AI failures don&apos;t throw exceptions. They return a response that looks fine — until your OpenAI bill arrives or a screenshot shows up on Twitter. Six ways your app can break silently, and the detector that catches each one before your users do.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            {
              tag: "cost",
              headline:
                "Your Lovable app went viral overnight. The OpenAI bill was $400 by morning.",
              body: "An agent quietly looped on a tool call, 9k tokens per turn, for twelve hours. The cost detector flags the first call that crosses $0.50 or 8k tokens — you’d have seen it before the bill arrived.",
            },
            {
              tag: "hallucination",
              headline:
                "Customer-support bot invented a product feature that doesn’t exist.",
              body: "Your RAG retrieved nothing useful, so the bot made something up to sound helpful. The hallucination detector compares response claims against the Sources block in the prompt and flags the gap.",
            },
            {
              tag: "loop",
              headline:
                "Web-search agent kept calling search → search → search and never answered.",
              body: "Six identical tool calls in a row. The loop detector flags tool repetition, low tool diversity, and A→B→A→B cycles before your user gives up and refreshes.",
            },
            {
              tag: "repetition",
              headline:
                "Chatbot kept ending every turn with “Is there anything else?” even after the user said no.",
              body: "Same line three times in five turns. The repetition detector catches line-level and n-gram repeats in the completion text.",
            },
            {
              tag: "context",
              headline:
                "RAG bot ignored the user’s “vegetarian only” filter and recommended chicken parm.",
              body: "Response used zero key tokens from the user’s context block. The context detector flags it before the user notices and DMs you.",
            },
            {
              tag: "completion",
              headline:
                "Your summarizer stopped at the 4k token cap mid-sentence and your users never saw the end.",
              body: "Finish reason was length, not stop. The completion detector catches premature stops on questions and runaway 4k+ token outputs.",
            },
          ].map((s) => (
            <li
              key={s.tag}
              className="rounded-md border border-line bg-white p-5"
            >
              <div
                className={`${GeistMono.className} text-xs uppercase text-coral`}
              >
                {s.tag}
              </div>
              <h3 className="mt-2 font-semibold leading-snug text-ink">
                {s.headline}
              </h3>
              <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-xl text-sm text-ink-muted">
          A seventh detector —{" "}
          <span className={`${GeistMono.className} text-coral`}>derailment</span>{" "}
          — catches when an agent&apos;s tool sequence doesn&apos;t match the task it was given. All seven ship in v1, run locally on every trace, and add zero per-call cost.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="/install"
            className={`${GeistMono.className} inline-flex items-center rounded-md bg-ink px-5 py-2.5 text-sm text-paper transition hover:bg-coral`}
          >
            get your install prompt →
          </a>
          <span className="text-sm text-ink-muted">
            Paste into Lovable, Replit, Bolt, Cursor, or v0. 60 seconds.
          </span>
        </div>
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
        <p>MIT-licensed SDK. Hosted dashboard at no charge.</p>
        <p className="mt-2">No accounts. No metering. No upsell. Pre-alpha.</p>
        <p className="mt-3">
          <a href="/demo" className="hover:text-ink">demo</a>
          {" · "}
          <a href="/status" className="hover:text-ink">status</a>
          {" · "}
          <a href="/terms" className="hover:text-ink">terms</a>
          {" · "}
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
