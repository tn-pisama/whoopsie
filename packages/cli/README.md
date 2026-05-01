## @whoopsie/cli

Two subcommands.

### `whoopsie init`

```bash
npx @whoopsie/cli init
```

Run inside your Next.js + Vercel AI SDK project. The CLI:

1. Detects `ai` + `next` in `package.json`.
2. AST-patches the first `streamText` / `generateText` call site to wrap the model in `whoopsieMiddleware()`.
3. Writes `WHOOPSIE_PROJECT_ID` to `.env.local`.
4. Opens https://whoopsie.dev/live/<projectId>.

Hit your chat route once. The first failure your agent throws will show up live.

Flags:

- `--cwd <path>` — project root (default: cwd)
- `--no-open` — skip browser open
- `--dry-run` — print planned changes, don't write

### `whoopsie mcp`

Runs an MCP server over stdio so Cursor / Claude Code / any MCP client can read your project's failures inline in your editor. Three tools:

- `get_recent_failures(limit?)` — recent traces that fired any detector
- `get_recent_traces(limit?)` — recent traces, regardless of failure status
- `get_trace(traceId)` — full prompt, completion, tool calls, detector hits for one trace

#### Cursor

In `~/.cursor/mcp.json` (or your project's `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "whoopsie": {
      "command": "npx",
      "args": ["-y", "@whoopsie/cli", "mcp"],
      "env": { "WHOOPSIE_PROJECT_ID": "ws_yourprojectid" }
    }
  }
}
```

Then in Cursor's chat: *"what did my AI agent break in the last hour?"* — the AI will call `get_recent_failures` and answer with real data from your `whoopsie.dev` dashboard.

#### Claude Code

```bash
claude mcp add whoopsie -e WHOOPSIE_PROJECT_ID=ws_yourprojectid -- npx -y @whoopsie/cli mcp
```

Or add to `~/.claude/mcp_servers.json` directly:

```json
{
  "whoopsie": {
    "command": "npx",
    "args": ["-y", "@whoopsie/cli", "mcp"],
    "env": { "WHOOPSIE_PROJECT_ID": "ws_yourprojectid" }
  }
}
```

Flags:

- `-p, --project-id <id>` — overrides the `WHOOPSIE_PROJECT_ID` env var
- `--base-url <url>` — point at a self-hosted whoopsie (default `https://whoopsie.dev`)
