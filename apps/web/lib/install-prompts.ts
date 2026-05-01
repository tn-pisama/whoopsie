// Per-platform install prompts. Each is a single message you can paste into
// the platform's AI chat. {projectId} is replaced server-side before render.

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

const baseInstructions = (projectId: string, envVarLocation: string) => `Add "whoopsie" failure observability to my AI app.

What it does: catches when my chatbot loops, hallucinates, or burns through tokens, and shows the failures live at https://whoopsie.dev/live/${projectId}

Steps to follow exactly:

1. Add the dependency: \`@whoopsie/sdk\`.

2. Find the file in my project that calls \`streamText\` or \`generateText\` from the \`ai\` package. It's usually \`app/api/chat/route.ts\`. If there are multiple, pick the main chat one.

3. At the top of that file, make sure these two imports exist (add the second one):

   \`\`\`ts
   import { wrapLanguageModel } from "ai";
   import { whoopsieMiddleware } from "@whoopsie/sdk";
   \`\`\`

4. Find the line that passes a model. It looks something like \`model: openai("gpt-4o")\` or \`model: anthropic("claude-sonnet-4-6")\`. Wrap the existing model expression with \`wrapLanguageModel\`:

   \`\`\`ts
   model: wrapLanguageModel({
     model: <whatever was there before>,
     middleware: whoopsieMiddleware(),
   })
   \`\`\`

5. Add this environment variable to ${envVarLocation}:

   \`\`\`
   WHOOPSIE_PROJECT_ID=${projectId}
   \`\`\`

6. After you've made the changes, reply to me with one sentence:
   "Whoopsie is wired up. Open your live dashboard at https://whoopsie.dev/live/${projectId} and hit your chat once."

Do not skip step 5 (the env var) or step 6 (the confirmation message).`;

export const platforms: PlatformPrompt[] = [
  {
    slug: "lovable",
    name: "Lovable",
    blurb:
      "Open your Lovable project, click the chat with the AI, paste the prompt below.",
    whereToPaste: "the chat with the Lovable AI",
    envVarLocation: "Lovable → Project Settings → Environment Variables",
    template: (id) => baseInstructions(id, "Lovable → Project Settings → Environment Variables"),
  },
  {
    slug: "replit",
    name: "Replit",
    blurb:
      "Open your Replit project, ask Replit Agent in the chat, paste the prompt below.",
    whereToPaste: "the Replit Agent chat",
    envVarLocation: "the Secrets pane (left sidebar, padlock icon)",
    template: (id) => baseInstructions(id, "the Replit Secrets pane (left sidebar, padlock icon)"),
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
    blurb:
      "On v0.dev, paste the prompt below into the chat with v0.",
    whereToPaste: "the v0.dev chat",
    envVarLocation:
      "v0 → Project Settings → Environment Variables (or hardcode it for now if v0 won't let you set env vars yet)",
    template: (id) =>
      baseInstructions(
        id,
        "v0 → Project Settings → Environment Variables (or hardcode it temporarily)",
      ),
  },
];

export function getPlatform(slug: string): PlatformPrompt | undefined {
  return platforms.find((p) => p.slug === slug);
}
