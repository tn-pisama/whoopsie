## @whoopsie/sdk

```bash
pnpm add @whoopsie/sdk
```

```ts
import { observe } from "@whoopsie/sdk";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const model = observe(openai("gpt-4o"), { redact: "metadata-only" });

const result = await streamText({ model, prompt: "..." });
```

Set `WHOOPSIE_PROJECT_ID` in `.env.local`. Get yours from `npx whoopsie init` (or sign up at https://whoopsie.dev).

`observe(model, opts)` is the canonical entry point. It returns the model with whoopsie's middleware attached — one function call, no `wrapLanguageModel` ceremony.

### Advanced

If you need direct access to the middleware (e.g. you're composing multiple middlewares), import `whoopsieMiddleware` and pass it to `wrapLanguageModel` yourself:

```ts
import { wrapLanguageModel } from "ai";
import { whoopsieMiddleware } from "@whoopsie/sdk";

const model = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: [whoopsieMiddleware(), yourOtherMiddleware],
});
```

### Privacy

PII is redacted in the SDK before bytes leave the machine. Default mode is `standard` (emails, phones, SSNs, cards, JWTs, OpenAI/Anthropic/AWS/GitHub/Slack-shaped API keys). Pass `redact: 'aggressive'` for more, `'metadata-only'` for token counts and detector verdicts only, or `'off'` to disable. The ingest server re-runs the same redaction patterns before writing to storage — defense in depth.

```ts
observe(model, { redact: "metadata-only" });
```

### Diagnostics

The SDK is loud by default about whether it's wired correctly. On first model call, you'll see:

```
[whoopsie] enabled · project=ws_abc123… · redact=metadata-only
```

If no events fire within 30 seconds, the SDK logs a warning with the most common causes (wrong wrap, file not imported, missing env var, blocked egress) and a link to verify on your dashboard. This catches silent integration failures that previously looked identical to working integration.

Env vars to tune verbosity:

- `WHOOPSIE_DEBUG=1` — also logs every flush with HTTP status. Useful when integration is silently failing and you want to see what's happening.
- `WHOOPSIE_SILENT=1` — suppresses all SDK logging. Use in noise-sensitive production environments after you've verified the integration works.

### License

MIT
