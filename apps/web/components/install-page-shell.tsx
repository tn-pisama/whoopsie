"use client";

import { useEffect, useState } from "react";
import { GeistMono } from "geist/font/mono";
import { InstallTabs } from "./install-tabs";
import { LovableNotReachable } from "./lovable-not-reachable";

interface PlatformView {
  slug: string;
  name: string;
  blurb: string;
}

const STORAGE_KEY = "whoopsie:project-id";
const ID_RE = /^ws_[A-Za-z0-9]+$/;

export function InstallPageShell({
  initial,
  serverProjectId,
  platforms,
  buildPrompt,
}: {
  initial: string;
  serverProjectId: string;
  platforms: PlatformView[];
  buildPrompt: (slug: string, projectId: string) => string;
}) {
  const [projectId, setProjectId] = useState<string>(serverProjectId);

  // Promote a stable ID per browser. If localStorage has one, use it
  // and rewrite the URL so reloads + sharing keep the same value. This
  // removes the "rotating IDs across retries" injection-probe signal.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && ID_RE.test(stored)) {
        if (stored !== serverProjectId) {
          setProjectId(stored);
          const url = new URL(window.location.href);
          url.searchParams.set("id", stored);
          window.history.replaceState(null, "", url.toString());
        }
      } else {
        window.localStorage.setItem(STORAGE_KEY, serverProjectId);
      }
    } catch {
      // ignore storage failures
    }
  }, [serverProjectId]);

  const dashboardUrl = `https://whoopsie.dev/live/${projectId}`;

  const views = platforms.map((p) => ({
    slug: p.slug,
    name: p.name,
    blurb: p.blurb,
    prompt: buildPrompt(p.slug, projectId),
  }));

  return (
    <>
      <section>
        <InstallTabs
          platforms={views}
          initial={initial}
          projectId={projectId}
          dashboardUrl={dashboardUrl}
        />
      </section>

      <LovableNotReachable />

      <section className="mt-12 border-t border-line py-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Or: skip the AI builder, install via terminal
        </h2>
        <p className="mt-3 text-ink-muted">
          If your AI builder refuses (some defended ones will, see above) or
          you just want to wire it yourself, the npm path works the same:
        </p>
        <pre
          className={`${GeistMono.className} mt-4 overflow-x-auto rounded-md border border-line bg-white p-4 text-[12.5px] leading-6 text-ink-soft`}
        >
{`# in your Next.js + AI SDK project
npx -y @whoopsie/cli init

# or manually:
pnpm add @whoopsie/sdk
# then wrap your model:
#   import { wrapLanguageModel } from "ai";
#   import { whoopsieMiddleware } from "@whoopsie/sdk";
#   const model = wrapLanguageModel({
#     model: openai("gpt-4o"),
#     middleware: whoopsieMiddleware({ redact: "metadata-only" }),
#   });`}
        </pre>
        <p className="mt-3 text-xs text-ink-muted">
          Set{" "}
          <code className={GeistMono.className}>WHOOPSIE_PROJECT_ID={projectId}</code>{" "}
          in your{" "}
          <code className={GeistMono.className}>.env.local</code>.
        </p>
      </section>

      <section className="mt-12 border-t border-line py-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Why this works (when it works)
        </h2>
        <p className="mt-4 text-ink-muted">
          Lovable, Replit, Bolt, Cursor, and v0 all let you talk to an AI that
          edits your code. The prompt above tells that AI exactly what to do:
          install the SDK, find the model call, wrap it. The wrap is one line of
          TypeScript that catches loops, hallucinations, and cost spikes and
          streams them to your dashboard.
        </p>
        <p className="mt-4 text-ink-muted">
          Some AI builders (Lovable in particular) defend against installing
          new packages with low adoption — that&apos;s a feature, not a bug.
          If yours refuses, the terminal path above still works.
        </p>
      </section>
    </>
  );
}
