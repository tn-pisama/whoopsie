## @whoopsie/web

The whoopsie.dev dashboard. Single Next.js 16 app, App Router, Cache Components.

Critical route: `app/live/[projectId]/page.tsx` — the page the CLI opens after `npx whoopsie init`. Subscribes to SSE at `/api/sse/[projectId]` and renders trace events plus detector hits as they arrive.

The 60-second hero moment lives here.
