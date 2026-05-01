## @whoopsie/sdk

```bash
pnpm add @whoopsie/sdk
```

```ts
import { wrapLanguageModel, streamText } from "ai";
import { whoopsieMiddleware } from "@whoopsie/sdk";
import { openai } from "@ai-sdk/openai";

const model = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: whoopsieMiddleware(),
});

const result = await streamText({ model, prompt: "..." });
```

Set `WHOOPSIE_PROJECT_ID` in `.env.local`. Get yours from `npx whoopsie init` (or sign up at https://whoopsie.dev).

### Privacy

PII is redacted in the SDK before bytes leave the machine. Default mode is `standard` (emails, phones, cards, JWTs, provider API keys). Pass `redact: 'aggressive'` for more, `'metadata-only'` for token counts and detector verdicts only, or `'off'` to disable.

```ts
whoopsieMiddleware({ redact: "metadata-only" });
```

### License

MIT
