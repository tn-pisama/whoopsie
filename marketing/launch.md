# Launch artifacts

Drafts for getting whoopsie in front of vibe coders. Pre-publication — edit
before posting.

Anchors used everywhere:
- live demo: https://whoopsie.dev/demo
- install: https://whoopsie.dev/install
- privacy: https://whoopsie.dev/privacy
- repo: https://github.com/tn-pisama/whoopsie
- npm: https://www.npmjs.com/package/@whoopsie/sdk

Pitch in one sentence: *"See when your AI app loops, hallucinates, or burns
tokens — paste one prompt into Lovable / Cursor / Replit and it wires
itself up."*

---

## Show HN post

**Title (80 chars max)**

`Show HN: Whoopsie – live failure detection for Vercel AI SDK apps (free)`

(70 chars; HN cuts at ~80. Alternates if the first feels off:)

- `Show HN: See when your AI app loops, hallucinates, or burns tokens`
- `Show HN: Failure observability for AI apps – paste one prompt into Lovable`

**Body (markdown, ~250 words)**

```text
Hey HN — I built whoopsie because I kept shipping AI features that were
silently broken. The chatbot would loop on a search tool. The summarizer
would burn 14k tokens on a 200-word doc. The RAG bot would invent a
co-founder. None of these throw exceptions, so my normal observability
caught nothing.

It's a Vercel AI SDK middleware (one wrap) plus a live dashboard. Seven
detectors run locally on every trace — no LLM-as-judge, no extra cost:
loop, repetition, cost-spike, completion-gap, hallucination-lite,
context-neglect, derailment. Plain-English failure descriptions
("stuck in a loop", "made something up") on top of the technical names.

Live demo: https://whoopsie.dev/demo — anyone can type a prompt, watch
their token-count metadata land in the public dashboard within a second.
Or click one of the "trigger this kind of failure" buttons to see what
each detector looks like without burning model tokens.

Install path is for vibe coders who don't run npx — paste a prompt into
Lovable / Cursor / Replit / Bolt / v0 chat and the AI wires it up. I
made the prompt deliberately injection-shaped on the first try; Lovable
correctly refused. The version live now is conversational, points at
the public npm + GitHub URLs, and tells the AI to skip the install if
there's no streamText call to wrap.

It's pre-alpha and I'm a single maintainer; I documented the data
handling at /privacy plainly (default-on PII redaction, metadata-only
mode that ships zero prompt text, 7-day hard delete, Neon Postgres in
iad1). MIT, free forever for the hosted dashboard, monetization is via
the enterprise sibling (pisama.ai).

Roast away. Especially curious whether anyone has thoughts on the
heuristic detectors vs an LLM-judge approach.
```

**Posting checklist**
- [ ] @whoopsie/* npm scope claimed (✅ done)
- [ ] GitHub repo public (✅ tn-pisama/whoopsie)
- [ ] Demo working, dashboard reachable
- [ ] Privacy page reflects current behavior
- [ ] First HN comment ready to post within ~5 minutes (the pre-canned reply
      to "what's different from Langfuse / Helicone / OTel?" — see below)

**Pre-canned HN reply**

Inevitable comparison question. Reply within 5 minutes of someone asking:

```text
Fair question. Three differences I'd flag:

1. Langfuse / Helicone are span stores; whoopsie is a span store + seven
   detectors that run on every trace. The detectors are the product. They
   catch shapes you'd otherwise have to write a SQL query to find — same
   tool repeated 6x, completion stopped after 3 chars on a question, 14k
   tokens in one call.

2. The install path is for people who don't run npx. The /install page
   gives you a prompt to paste into Lovable / Cursor / Replit and the
   AI wires it up.

3. Plain-English. "Made something up" / "Stuck in a loop" instead of
   "hallucination_lite firing on overlap < 0.4". The dashboard is for
   people debugging their first AI feature, not eval engineers.

I'd happily integrate as an OTel exporter so you can fan traces to
Langfuse for storage AND whoopsie for detection — that's a planned
exporter, not done yet. Patches welcome.
```

---

## Twitter / X thread

**Tweet 1 (hook)**

```
launched whoopsie.dev today

it catches when your AI app loops, hallucinates, or burns through tokens

one wrap on your Vercel AI SDK call. seven detectors. live dashboard.
free forever.

most fun part: paste a prompt into Lovable or Cursor and your AI builder
wires it up for you. no terminal needed.

(thread ↓)
```

**Tweet 2 (the demo)**

```
the demo IS whoopsie watching whoopsie:

https://whoopsie.dev/demo

type any prompt. claude haiku replies. the trace metadata lands in the
public dashboard within a second. you can also click "trigger a loop"
or "trigger a hallucination" to watch each detector fire without burning
tokens.

[link card]
```

**Tweet 3 (the install path)**

```
install for vibe coders:

1. open whoopsie.dev/install, pick lovable / cursor / replit / bolt / v0
2. copy the prompt (already has your project id baked in)
3. paste it into your AI builder's chat
4. it edits the code, you watch the dashboard

works because the prompt reads like a normal user request, not prompt
injection. trust signals up front: npm link, github link, MIT license,
"if anything looks off, push back".
```

**Tweet 4 (privacy)**

```
the privacy story is on /privacy and it's plain:

- PII redaction in the SDK before bytes leave your machine
- metadata-only mode ships zero prompt text — only token counts and
  detector verdicts
- 7-day hard delete on traces, no retention upsell
- Neon postgres iad1, no analytics, no third-party trackers

pre-alpha. single maintainer. side projects only.
```

**Tweet 5 (CTA)**

```
free forever for the hosted dashboard. monetization is the enterprise
sibling at pisama.ai (50-detector multi-agent platform), not whoopsie.

mit-licensed sdk, mit detectors. fork it.

repo: https://github.com/tn-pisama/whoopsie
demo: https://whoopsie.dev/demo

if you ship an AI feature this week, install it. tell me what fires.
```

---

## Lee Robinson DM (X)

**Subject / opener (under 280 chars)**

```
Hey Lee — built a Vercel AI SDK middleware that catches when an agent
loops, hallucinates, or burns tokens. One wrap, live dashboard, free.

Demo: https://whoopsie.dev/demo (anyone can type a prompt, the trace
metadata lands in the public dashboard).

Would love your eyes on the install flow.
```

**Follow-up if he responds**

```
The angle that might be most interesting to you: the install path is for
non-coders.

Paste this prompt into Lovable: [link to /install?platform=lovable]

It tells the platform's AI exactly what to install + wrap. Lovable
correctly refused the first injection-shaped version of the prompt (good
sign — they're defended). Current version reads as a normal user request
and gets installed cleanly when there's actually AI SDK code to wrap.

Would love a "made with whoopsie" Vercel AI SDK template if it ever
makes sense.
```

**Why him specifically**: he runs DevRel for the platform whoopsie is
built on, his ecosystem reach is largest in the vibe-coder demo, and a
"works with Vercel AI SDK" tweet from him does more than 100 generic
launches.

---

## "Made with whoopsie" Vercel template (deferred)

A 1-click-deployable Next.js + AI SDK + whoopsie starter that lands at
vercel.com/templates. Probably the highest-leverage distribution thing
once whoopsie has more usage signal — Vercel reviews submissions and
prefers templates with real adoption.

Plan when ready:
- new GitHub repo `whoopsie-dev/next-chatbot-starter`
- next.js app router, ai sdk v6, @whoopsie/sdk pre-wired in metadata-only
- README walks through what each part does
- "Deploy to Vercel" button at top
- submit at https://vercel.com/templates/submit

---

## Posting order (when you're ready)

1. Confirm everything in the "Posting checklist" above is green
2. Tweet thread (Tuesday or Wednesday morning, US time)
3. Show HN ~30 min after the tweet thread (ride the early pickup)
4. Lee DM after the HN post is at least 5 points deep (gives him
   something to point at instead of a cold DM)
5. Watch /privacy + /install for traffic. The synth at scripts/smoke.sh
   can stand in for "is the prod still healthy" if you don't trust the
   uptime monitor.
