## @whoops/sdk

```bash
pnpm add @whoops/sdk
```

```ts
import { wrapLanguageModel, streamText } from "ai";
import { whoopsMiddleware } from "@whoops/sdk";
import { openai } from "@ai-sdk/openai";

const model = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: whoopsMiddleware(),
});

const result = await streamText({ model, prompt: "..." });
```

Set `WHOOPS_PROJECT_ID` in `.env.local`. Get yours from `npx whoops init` (or sign up at https://whoops.dev).

### Privacy

PII is redacted in the SDK before bytes leave the machine. Default mode is `standard` (emails, phones, cards, JWTs, provider API keys). Pass `redact: 'aggressive'` for more, `'metadata-only'` for token counts and detector verdicts only, or `'off'` to disable.

```ts
whoopsMiddleware({ redact: "metadata-only" });
```

### License

MIT
