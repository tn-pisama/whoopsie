# Next.js + AI SDK + whoopsie chatbot

A minimal chatbot starter. ~80 lines of `app/api/chat/route.ts`,
~120 lines of UI. Already wired with [whoopsie](https://whoopsie.dev)
so you can see when the bot loops, hallucinates, or burns tokens
without writing any observability code yourself.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftn-pisama%2Fwhoopsie%2Ftree%2Fmain%2Fexamples%2Fnext-chatbot-starter&env=OPENAI_API_KEY,WHOOPSIE_PROJECT_ID,NEXT_PUBLIC_WHOOPSIE_PROJECT_ID&envDescription=OpenAI%20key%20%2B%20a%20whoopsie%20project%20id%20%28get%20one%20at%20https%3A%2F%2Fwhoopsie.dev%2Finstall%29&project-name=whoopsie-chatbot)

## What's in here

- `app/api/chat/route.ts` — streams `gpt-4o-mini` via the Vercel AI SDK,
  wrapped in `whoopsieMiddleware()` so every call's metadata flows to your
  dashboard.
- `app/page.tsx` — minimal client-side chat UI. Streams tokens as they
  arrive.
- `.env.example` — three variables. OpenAI key, your whoopsie project id,
  and the public-side mirror so the UI can link to your dashboard.

## Local

```bash
cp .env.example .env.local
# fill in the three values
pnpm install   # or npm install / yarn install
pnpm dev
```

Open http://localhost:3000, type a message. The reply streams in. Open
your dashboard at `https://whoopsie.dev/live/$WHOOPSIE_PROJECT_ID` in
another tab and watch trace metadata appear.

## What whoopsie catches

Out of the box, with zero extra code:

| Detector | What it means |
|---|---|
| `loop` | Your agent kept calling the same tool over and over. |
| `repetition` | The reply text repeats the same line. |
| `cost` | A single call burned a lot of tokens or money. |
| `completion` | Stopped too early on a real question, or ran past 4k tokens. |
| `hallucination` | Said something not in the sources you gave it. |
| `context` | Reply doesn't reflect any keywords from a `Context:` block. |
| `derailment` | Tools called don't match the task verb in the prompt. |

## Privacy

The wrap defaults to `redact: "standard"` — emails, phone numbers, API
keys, JWTs, and a few other PII patterns get stripped before bytes leave
your app. If your prompts contain anything you'd rather not have in
whoopsie's database, swap to metadata-only:

```ts
middleware: whoopsieMiddleware({ redact: "metadata-only" })
```

That ships only token counts, finish reasons, tool names, and detector
verdicts. Zero prompt or completion text.

Full data-handling story: https://whoopsie.dev/privacy

## License

MIT, like whoopsie itself.
