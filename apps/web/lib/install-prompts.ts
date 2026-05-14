// Per-platform install prompts. Each is a single message you can paste into
// the platform's AI chat. The shape is deliberately conversational so it
// doesn't read as prompt injection — the AI is invited to verify the package
// on npm and GitHub before installing, and is asked to integrate the README's
// usage pattern, not follow rigid scripted steps.
//
// {projectId} is replaced server-side before render.

export interface PlatformPrompt {
  slug: string;
  name: string;
  blurb: string;
  /** Where in the platform UI the user pastes this prompt. */
  whereToPaste: string;
  /** Where the env var lives on this platform. */
  envVarLocation: string;
  /**
   * Optional framework hint inserted into the prompt. Used when a platform
   * runs a non-Next.js framework (Lovable → TanStack Start, etc.) so the AI
   * knows the file conventions ahead of time instead of guessing.
   */
  frameworkNote?: string;
  /**
   * If true, this platform hasn't been verified end-to-end with the current
   * SDK/CLI/prompts. Surface a visible "untested" badge on the install page
   * so users aren't surprised when it doesn't work cleanly.
   */
  untested?: boolean;
  template: (projectId: string) => string;
}

const baseInstructions = (
  projectId: string,
  envVarLocation: string,
  platformSlug: string,
  frameworkNote?: string,
) =>
  `I'd like to add lightweight observability to a side-project AI app I'm working on. Heads-up before you start: the package is brand-new and low-adoption — first published 2026-05-01 — so this is for a non-critical project, not anything in production. If my code doesn't actually have an AI SDK call to instrument yet, please tell me and skip the install.${frameworkNote ? `\n\n${frameworkNote}` : ""}

The package is @whoopsie/sdk. It's a Vercel AI SDK middleware that streams trace metadata about my agent's calls to a dashboard so I can see when the agent loops, hallucinates, or burns through tokens. Public refs:

- npm: https://www.npmjs.com/package/@whoopsie/sdk
- repo: https://github.com/tn-pisama/whoopsie
- privacy / data handling: https://whoopsie.dev/privacy
- license: MIT

For first install I want full traces with PII scrubbed — \`standard\` mode. The SDK ships my prompt, the model's completion, tool args/results, and reasoning text (when the model emits it: o1, Claude extended thinking, Gemini thinking). Before any of that leaves my app, the SDK replaces common PII patterns — emails, phone numbers, SSNs, card-shaped numbers, JWTs, and OpenAI/Anthropic/AWS/GitHub/Slack-shaped API keys — with placeholders like \`[email]\`. The server then re-runs the same scrub before persisting. Token counts, model name, finish reason, timing, and detector verdicts also come along. If my prompts may contain anything that can't leave the box at all, I'll switch to \`redact: "metadata-only"\` instead — that ships token counts and detector verdicts and nothing else.

**Use the \`observe()\` helper. It's a single function call — do not write your own \`wrapLanguageModel\` pattern.** This matters because past installs failed silently when AI agents reconstructed the wrap incorrectly. The correct usage is exactly:

\`\`\`ts
import { observe } from "@whoopsie/sdk";

// before:
//   model: openai("gpt-4o"),
// after — wrap whatever model is currently there:
const model = observe(openai("gpt-4o"), { redact: "standard" });
\`\`\`

That's it. Do not import \`wrapLanguageModel\` from "ai". Do not call \`whoopsieMiddleware(...)\` directly. Do not pass the middleware as an option — \`observe(model, opts)\` returns the wrapped model.

**Vercel AI SDK v6 gotchas (very common ai@5 → ai@6 mistakes):**

- The chat route must end with \`return result.toUIMessageStreamResponse()\` — \`toDataStreamResponse()\` was removed in v6.
- \`convertToModelMessages\` is **async** in \`ai@6.0.x\` — it returns \`Promise<ModelMessage[]>\`, not \`ModelMessage[]\`. Await it before passing into \`streamText\`:
  \`\`\`ts
  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({ model, messages: modelMessages });
  \`\`\`
  If you skip the \`await\`, TypeScript errors with \`Type 'Promise<ModelMessage[]>' is missing the following properties from type 'ModelMessage[]'\`. The React \`useChat\` hook posts UIMessages with \`parts\` arrays; \`streamText\` only accepts ModelMessages, so the conversion is required.
- \`@whoopsie/sdk\` ≥ 0.5 wraps a \`LanguageModelV3\` (the spec shipped by \`ai@6\`). If your project still has \`@ai-sdk/openai@^2\` (or any provider on the V2 spec), \`next build\` errors with \`Type '"v2"' is not assignable to type '"v3"'\` on the \`observe()\` call site. Fix by upgrading the provider: \`pnpm add @ai-sdk/openai@^3\` (or the equivalent for npm/yarn/bun, and the matching v3 release for \`@ai-sdk/anthropic\`, \`@ai-sdk/google\`, etc.). Verified 2026-05-12 against a fresh Next.js 16 + ai@6.0.180 + @ai-sdk/openai@3.0.63 install.
- On the React side, \`useChat\` no longer returns \`{ input, handleInputChange, handleSubmit }\`. Use \`{ messages, sendMessage, status } = useChat()\` and manage the input string yourself with \`useState\`. Call \`sendMessage({ text: input })\` on submit.
- The eager-flush serverless mode auto-detects Vercel (\`VERCEL=1\`), AWS Lambda, Netlify, Cloud Run, Cloudflare Workers, and Vercel Edge. You do not need to configure it; just confirm the install logs print \`[whoopsie] enabled · project=ws_…\` on first request.

Could you:

1. First: **find the existing \`streamText\` or \`generateText\` call by searching the repo for those exact strings**. Don't guess at file paths. If you don't find one, tell me and skip the install — there's nothing to instrument.
2. Edit \`observe(<existing-model-expression>, { redact: "standard" })\` **directly at the line where the model is passed to streamText/generateText**. Do not create a new file. Do not put the wrap in a separate \`observability.ts\` or \`lib/\` module. The wrap must be on the model expression that the actual streamText call uses, or it does nothing.
3. If the route or client is still on the ai@5 API (any of: \`toDataStreamResponse()\`, no \`convertToModelMessages\` call on the messages, \`handleInputChange\`/\`handleSubmit\` from \`useChat\`), migrate it to ai@6 per the gotchas above as part of the same change.
4. Tell me which file you changed and the exact line you changed.

I'll separately set two env vars in ${envVarLocation}: \`WHOOPSIE_PROJECT_ID=${projectId}\` (which dashboard your traces land on) and \`WHOOPSIE_PLATFORM=${platformSlug}\` (lets whoopsie tag this install as coming from ${platformSlug} so we can spot when their AI builder's behavior changes and the install starts silently breaking — the slug is non-sensitive metadata, same level as the model name, and is disclosed on /privacy). The dashboard lives at https://whoopsie.dev/live/${projectId}.

To verify the install is wired correctly (independent of whether your AI call actually fires yet), tell me to run \`npx @whoopsie/cli verify\` in a terminal. It posts a synthetic trace and confirms the round-trip — if it passes but real chats don't produce traces, the gap is in the code wrap. If it fails, the gap is in env vars or network egress. Either way it tells me where to look.

If you'd rather wait until the package has more adoption, suggest a more established alternative (Langfuse, Helicone, Sentry AI, OpenTelemetry) and I'll consider it.`;

const LOVABLE_FRAMEWORK_NOTE =
  "Important framework note: this project runs on **TanStack Start (React 19 + Vite)**, not Next.js. The streamText / generateText call is in a TanStack server file route (typically `src/routes/api/chat.ts` or similar), not `app/api/chat/route.ts`. Find the actual file by searching the repo for `streamText` or `generateText` — that's where the wrap goes. The @whoopsie/sdk `observe()` helper works identically on TanStack Start since it operates on the Vercel AI SDK's model object, which is framework-agnostic.";

const REPLIT_FRAMEWORK_NOTE =
  "Important Replit gotchas (verified end-to-end 2026-05-10): (1) The `.replit` config sometimes routes `/api/*` to a separate Express server on port 8080 instead of the Next.js dev server. If a public POST to `/api/chat` returns an Express-style 404 (`Cannot POST /api/chat`) while `/` returns a Next.js page, the proxy needs to be reconfigured so Next.js owns `/api/*` — otherwise the chat route and the observe() wrap never execute. (2) When you click **Publish** to deploy to `.replit.app`, the dev Workspace Secrets do **not** carry over to the Autoscale Deployment automatically. Open the deployment's Manage tab and add `OPENAI_API_KEY` and `WHOOPSIE_PROJECT_ID` (any other `process.env.*` the chat route reads) to the deployment-side secrets before testing the published URL, or `/api/chat` will return HTTP 500. (3) If the build fails at `next build` with a TypeScript error on `useChat({ api: \"/api/chat\" })`, drop the `api` option — it doesn't exist in `@ai-sdk/react` v3 (which ships with ai@6); the default is `/api/chat` already.";

export const platforms: PlatformPrompt[] = [
  {
    slug: "lovable",
    name: "Lovable",
    blurb:
      "Open your Lovable project, click the chat with the AI, paste the prompt below.",
    whereToPaste: "the chat with the Lovable AI",
    envVarLocation: "Lovable's Cloud tab → Secrets (click + next to Preview in the editor)",
    frameworkNote: LOVABLE_FRAMEWORK_NOTE,
    template: (id) =>
      baseInstructions(
        id,
        "Lovable's Cloud tab → Secrets (click + next to Preview in the editor)",
        "lovable",
        LOVABLE_FRAMEWORK_NOTE,
      ),
  },
  {
    slug: "replit",
    name: "Replit",
    blurb:
      "Open your Replit project, ask Replit Agent in the chat, paste the prompt below.",
    whereToPaste: "the Replit Agent chat",
    envVarLocation: "the Secrets pane (left sidebar, padlock icon); for a published .replit.app deployment, also add the same secrets to the deployment's Manage tab",
    frameworkNote: REPLIT_FRAMEWORK_NOTE,
    template: (id) =>
      baseInstructions(
        id,
        "the Replit Secrets pane (left sidebar, padlock icon); for a published .replit.app deployment, also add the same secrets to the deployment's Manage tab",
        "replit",
        REPLIT_FRAMEWORK_NOTE,
      ),
  },
  {
    slug: "bolt",
    name: "Bolt",
    blurb:
      "In your Bolt project, paste the prompt below into the chat with bolt.new's AI.",
    whereToPaste: "the bolt.new chat",
    envVarLocation: "the .env file at the project root",
    // Verified end-to-end 2026-05-11: Bolt's AI installs @whoopsie/sdk@^0.4.1
    // with the canonical observe() pattern, the WebContainer reaches
    // whoopsie.dev/api/v1/spans, and a clean trace lands (e.g.
    // Ug0bt4bfSnHD8WMIaOBml, 18/5 tokens, no error). Once OPENAI_API_KEY is
    // in .env the chat returns real gpt-4o-mini responses.
    template: (id) =>
      baseInstructions(id, "the .env file at the project root", "bolt"),
  },
  {
    slug: "v0",
    name: "v0",
    blurb: "On v0.app, paste the prompt below into the chat with v0.",
    whereToPaste: "the v0.app chat",
    envVarLocation: "the Vars panel in the v0 chat sidebar",
    template: (id) =>
      baseInstructions(id, "the Vars panel in the v0 chat sidebar", "v0"),
  },
];

export function getPlatform(slug: string): PlatformPrompt | undefined {
  return platforms.find((p) => p.slug === slug);
}
