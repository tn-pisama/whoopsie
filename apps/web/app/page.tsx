import { GeistMono } from "geist/font/mono";
import { CopyButton } from "@/components/copy-button";

const INSTALL = "npx @whoops/cli init";

const CODE_SAMPLE = `import { wrapLanguageModel, streamText } from "ai";
import { whoopsMiddleware } from "@whoops/sdk";

const model = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: whoopsMiddleware(),
});

await streamText({ model, prompt: "..." });`;

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6">
      <header className="flex items-center justify-between py-8">
        <span className={`${GeistMono.className} text-lg lowercase tracking-tight`}>
          whoops
        </span>
        <nav className="flex items-center gap-6 font-mono text-xs text-ink-muted">
          <a href="https://github.com/whoops-dev/whoops" className="hover:text-ink">
            github
          </a>
          <a href="https://www.npmjs.com/package/@whoops/sdk" className="hover:text-ink">
            npm
          </a>
        </nav>
      </header>

      <section className="py-20 sm:py-28">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          See your AI app&apos;s failures live.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">
          Vercel AI SDK middleware. Catches loops, hallucinations, and cost spikes
          in your Next.js agent and surfaces them in a live dashboard. Free
          forever.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <code
            className={`${GeistMono.className} flex items-center rounded-md border border-line bg-white px-4 py-2 text-sm text-ink`}
          >
            <span className="mr-2 text-coral">$</span>
            {INSTALL}
          </code>
          <CopyButton text={INSTALL} label="Copy install command" />
        </div>
        <p className="mt-3 font-mono text-xs text-ink-muted">
          Works inside any Next.js + Vercel AI SDK project. First failure visible within seconds.
        </p>
      </section>

      <section className="grid gap-10 border-t border-line py-16 sm:grid-cols-3">
        <Feature
          title="60-second install"
          body="One CLI command wraps your model and opens the dashboard. No signup."
        />
        <Feature
          title="7 detectors"
          body="loop, repetition, cost-spike, completion-gap, hallucination-lite, context-neglect, derailment."
        />
        <Feature
          title="Privacy-first"
          body="PII redaction in the SDK before bytes leave the machine. Toggleable, default-on."
        />
      </section>

      <section className="border-t border-line py-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-8 space-y-6">
          <Step
            n={1}
            title="Install"
            body="`npx @whoops/cli init` detects your Next.js + AI SDK setup and patches the first streamText call."
          />
          <Step
            n={2}
            title="Run"
            body="Hit your chat route once. The middleware streams trace events to the live dashboard via SSE."
          />
          <Step
            n={3}
            title="See"
            body="Your first detector hit lands in the dashboard within a second. Click any event for full evidence."
          />
        </ol>

        <div className="mt-10 overflow-hidden rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-2 font-mono text-xs text-ink-muted">
            <span>app/api/chat/route.ts</span>
            <span>typescript</span>
          </div>
          <pre className={`${GeistMono.className} overflow-x-auto px-4 py-4 text-sm leading-6`}>
            <code>{CODE_SAMPLE}</code>
          </pre>
        </div>
      </section>

      <footer className="border-t border-line py-12 font-mono text-xs text-ink-muted">
        <p>MIT-licensed SDK. Hosted dashboard free forever.</p>
        <p className="mt-2">Pre-alpha. Domain reserved 2026-04-30.</p>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
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
