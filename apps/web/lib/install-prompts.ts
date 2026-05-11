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
  frameworkNote?: string,
) =>
  `I'd like to add lightweight observability to a side-project AI app I'm working on. Heads-up before you start: the package is brand-new and low-adoption — first published 2026-05-01 — so this is for a non-critical project, not anything in production. If my code doesn't actually have an AI SDK call to instrument yet, please tell me and skip the install.${frameworkNote ? `\n\n${frameworkNote}` : ""}

The package is @whoopsie/sdk. It's a Vercel AI SDK middleware that streams trace metadata about my agent's calls to a dashboard so I can see when the agent loops, hallucinates, or burns through tokens. Public refs:

- npm: https://www.npmjs.com/package/@whoopsie/sdk
- repo: https://github.com/tn-pisama/whoopsie
- privacy / data handling: https://whoopsie.dev/privacy
- license: MIT

For first install I want the safest default — metadata-only mode, where the SDK ships token counts, finish reasons, tool names, and detector verdicts but zero prompt or completion text.

**Use the \`observe()\` helper. It's a single function call — do not write your own \`wrapLanguageModel\` pattern.** This matters because past installs failed silently when AI agents reconstructed the wrap incorrectly. The correct usage is exactly:

\`\`\`ts
import { observe } from "@whoopsie/sdk";

// before:
//   model: openai("gpt-4o"),
// after — wrap whatever model is currently there:
const model = observe(openai("gpt-4o"), { redact: "metadata-only" });
\`\`\`

That's it. Do not import \`wrapLanguageModel\` from "ai". Do not call \`whoopsieMiddleware(...)\` directly. Do not pass the middleware as an option — \`observe(model, opts)\` returns the wrapped model.

Could you:

1. First: **find the existing \`streamText\` or \`generateText\` call by searching the repo for those exact strings**. Don't guess at file paths. If you don't find one, tell me and skip the install — there's nothing to instrument.
2. Edit \`observe(<existing-model-expression>, { redact: "metadata-only" })\` **directly at the line where the model is passed to streamText/generateText**. Do not create a new file. Do not put the wrap in a separate \`observability.ts\` or \`lib/\` module. The wrap must be on the model expression that the actual streamText call uses, or it does nothing.
3. Tell me which file you changed and the exact line you changed.

I'll separately set \`WHOOPSIE_PROJECT_ID=${projectId}\` in ${envVarLocation}; the dashboard lives at https://whoopsie.dev/live/${projectId}.

To verify the install is wired correctly (independent of whether your AI call actually fires yet), tell me to run \`npx @whoopsie/cli verify\` in a terminal. It posts a synthetic trace and confirms the round-trip — if it passes but real chats don't produce traces, the gap is in the code wrap. If it fails, the gap is in env vars or network egress. Either way it tells me where to look.

If you'd rather wait until the package has more adoption, suggest a more established alternative (Langfuse, Helicone, Sentry AI, OpenTelemetry) and I'll consider it.`;

const LOVABLE_FRAMEWORK_NOTE =
  "Important framework note: this project runs on **TanStack Start (React 19 + Vite)**, not Next.js. The streamText / generateText call is in a TanStack server file route (typically `src/routes/api/chat.ts` or similar), not `app/api/chat/route.ts`. Find the actual file by searching the repo for `streamText` or `generateText` — that's where the wrap goes. The @whoopsie/sdk `observe()` helper works identically on TanStack Start since it operates on the Vercel AI SDK's model object, which is framework-agnostic.";

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
        LOVABLE_FRAMEWORK_NOTE,
      ),
  },
  {
    slug: "replit",
    name: "Replit",
    blurb:
      "Open your Replit project, ask Replit Agent in the chat, paste the prompt below.",
    whereToPaste: "the Replit Agent chat",
    envVarLocation: "the Secrets pane (left sidebar, padlock icon)",
    template: (id) =>
      baseInstructions(
        id,
        "the Replit Secrets pane (left sidebar, padlock icon)",
      ),
  },
  {
    slug: "bolt",
    name: "Bolt",
    blurb:
      "In your Bolt project, paste the prompt below into the chat with bolt.new's AI.",
    whereToPaste: "the bolt.new chat",
    envVarLocation: "the .env file at the project root",
    // Marked untested: the cross-platform integration test on 2026-05-10
    // ran out of Bolt free-tier tokens before reaching the trace-landing
    // step. Untested means we don't know if the AI accepts the prompt
    // cleanly or whether Bolt's WebContainer can reach whoopsie.dev/api/v1.
    // Re-enable once verified end-to-end.
    untested: true,
    template: (id) => baseInstructions(id, "the .env file at the project root"),
  },
  {
    slug: "cursor",
    name: "Cursor",
    blurb:
      "Open Cursor in your project, hit ⌘+L to open the chat, paste the prompt below.",
    whereToPaste: "Cursor's chat panel (⌘+L)",
    envVarLocation: "your `.env.local` file",
    template: (id) => baseInstructions(id, "your `.env.local` file"),
  },
  {
    slug: "v0",
    name: "v0",
    blurb: "On v0.dev, paste the prompt below into the chat with v0.",
    whereToPaste: "the v0.dev chat",
    envVarLocation: "the Vars panel in the v0 chat sidebar",
    template: (id) =>
      baseInstructions(id, "the Vars panel in the v0 chat sidebar"),
  },
];

export function getPlatform(slug: string): PlatformPrompt | undefined {
  return platforms.find((p) => p.slug === slug);
}
