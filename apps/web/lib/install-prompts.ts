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
  template: (projectId: string) => string;
}

const baseInstructions = (projectId: string, envVarLocation: string) =>
  `I'd like to add lightweight observability to a side-project AI app I'm working on. Heads-up before you start: the package is brand-new and low-adoption — first published 2026-05-01 — so this is for a non-critical project, not anything in production. If my code doesn't actually have an AI SDK call to instrument yet, please tell me and skip the install.

The package is @whoopsie/sdk. It's a Vercel AI SDK middleware that streams trace metadata about my agent's calls to a dashboard so I can see when the agent loops, hallucinates, or burns through tokens. Public refs:

- npm: https://www.npmjs.com/package/@whoopsie/sdk
- repo: https://github.com/tn-pisama/whoopsie
- privacy / data handling: https://whoopsie.dev/privacy
- license: MIT

For first install I want the safest default — metadata-only mode, where the SDK ships token counts, finish reasons, tool names, and detector verdicts but zero prompt or completion text. Per the README:

\`\`\`ts
import { wrapLanguageModel } from "ai";
import { whoopsieMiddleware } from "@whoopsie/sdk";

// before:
//   model: openai("gpt-4o"),
// after — wrap whatever model is currently there:
const model = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: whoopsieMiddleware({ redact: "metadata-only" }),
});
\`\`\`

Could you:

1. First: check whether my project actually has a \`streamText\` or \`generateText\` call from the \`ai\` package (usually under \`app/api/...\`). If there's no such call yet, just tell me and don't install anything.
2. If there is one: add \`@whoopsie/sdk\` as a dependency and apply the wrap above to whatever model expression is already there. Keep the existing model; only wrap it.
3. Tell me which file you changed.

I'll separately set \`WHOOPSIE_PROJECT_ID=${projectId}\` in ${envVarLocation}; the dashboard lives at https://whoopsie.dev/live/${projectId}. If you'd rather wait until the package has more adoption, suggest a more established alternative (Langfuse, Helicone, Sentry AI, OpenTelemetry) and I'll consider it.`;

export const platforms: PlatformPrompt[] = [
  {
    slug: "lovable",
    name: "Lovable",
    blurb:
      "Open your Lovable project, click the chat with the AI, paste the prompt below.",
    whereToPaste: "the chat with the Lovable AI",
    envVarLocation: "Lovable's Cloud tab → Secrets (click + next to Preview in the editor)",
    template: (id) =>
      baseInstructions(
        id,
        "Lovable's Cloud tab → Secrets (click + next to Preview in the editor)",
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
