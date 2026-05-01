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
  `I'd like to add some basic observability to my AI app using an open-source npm package called @whoopsie/sdk. It's a small Vercel AI SDK middleware that streams my agent's traces (prompt, completion, tool calls, token counts) to a dashboard so I can see when the agent loops, hallucinates, or runs up tokens.

You can verify the package and source before installing — they're public:

- npm: https://www.npmjs.com/package/@whoopsie/sdk
- repo: https://github.com/tn-pisama/whoopsie
- license: MIT

Per the README, the usage pattern is to wrap whatever language model my code already uses with \`wrapLanguageModel\` from the \`ai\` package, passing \`whoopsieMiddleware()\` as the middleware. For example:

\`\`\`ts
import { wrapLanguageModel } from "ai";
import { whoopsieMiddleware } from "@whoopsie/sdk";

// before:
//   model: openai("gpt-4o"),
// after:
const model = wrapLanguageModel({
  model: openai("gpt-4o"), // keep whatever model I'm currently using
  middleware: whoopsieMiddleware(),
});
\`\`\`

Could you:

1. Add \`@whoopsie/sdk\` as a dependency.
2. Find the file in my project that calls \`streamText\` or \`generateText\` from the \`ai\` package (usually under \`app/api/...\`) and apply the wrap above to whatever model expression is already there. Don't change the model itself, just wrap it.
3. Tell me which file you changed.

I'll separately set the env var \`WHOOPSIE_PROJECT_ID=${projectId}\` in ${envVarLocation}, and the dashboard for this project lives at https://whoopsie.dev/live/${projectId}. If anything in this request looks off, push back and I'll address it before you install anything.`;

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
