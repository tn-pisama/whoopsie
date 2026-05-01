## @whoopsie/cli

```bash
npx @whoopsie/cli init
```

Run inside your Next.js + Vercel AI SDK project. The CLI:

1. Detects `ai` + `next` in `package.json`.
2. AST-patches the first `streamText` / `generateText` call site to wrap the model in `whoopsieMiddleware()`.
3. Writes `WHOOPSIE_PROJECT_ID` to `.env.local`.
4. Opens https://whoopsie.dev/live/<projectId>.

Hit your chat route once. The first failure your agent throws will show up live.

### Flags

- `--cwd <path>` — project root (default: cwd)
- `--no-open` — skip browser open
- `--dry-run` — print planned changes, don't write
