"use client";

import { useState } from "react";
import { GeistMono } from "geist/font/mono";
import { CopyBlock } from "./copy-block";
import { EmailCapture } from "./email-capture";
import { TermsGate } from "./terms-gate";

interface PlatformView {
  slug: string;
  name: string;
  blurb: string;
  prompt: string;
  untested?: boolean;
}

export function InstallTabs({
  platforms,
  initial,
  projectId,
  dashboardUrl,
}: {
  platforms: PlatformView[];
  initial: string;
  projectId: string;
  dashboardUrl: string;
}) {
  const [active, setActive] = useState(
    platforms.find((p) => p.slug === initial)?.slug ?? platforms[0]!.slug,
  );
  const platform =
    platforms.find((p) => p.slug === active) ?? platforms[0]!;

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-2 border-b border-line">
        {platforms.map((p) => (
          <button
            key={p.slug}
            type="button"
            role="tab"
            aria-selected={active === p.slug}
            onClick={() => setActive(p.slug)}
            className={
              "px-4 py-2 -mb-px border-b-2 text-sm font-medium transition flex items-center gap-2 " +
              (active === p.slug
                ? "border-coral text-ink"
                : "border-transparent text-ink-muted hover:text-ink")
            }
          >
            {p.name}
            {p.untested && (
              <span
                className="rounded bg-ink-muted/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted"
                title="Not verified end-to-end with the current SDK/CLI/prompts. Use with caution."
              >
                untested
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-6 text-ink-muted">{platform.blurb}</p>

      {platform.untested && (
        <div className="mt-4 rounded-md border border-ink-muted/30 bg-ink-muted/5 p-4 text-sm text-ink-soft">
          <p>
            <strong className="font-medium text-ink">Untested.</strong> The
            cross-platform integration test didn&apos;t finish on {platform.name}{" "}
            within free-tier limits, so this prompt isn&apos;t verified
            end-to-end yet. The wrap pattern itself is solid — your bigger risk
            is whether {platform.name}&apos;s runtime can reach{" "}
            <code className="font-mono">whoopsie.dev/api/v1/spans</code>. After
            install, run <code className="font-mono">npx @whoopsie/cli verify</code>{" "}
            and check the dashboard. If you hit issues, please{" "}
            <a
              href="https://github.com/tn-pisama/whoopsie/issues"
              className="underline decoration-coral underline-offset-2"
            >
              file one
            </a>
            .
          </p>
        </div>
      )}

      <div className="mt-6">
        <TermsGate projectId={projectId}>
          <CopyBlock text={platform.prompt} />

          <div className="mt-8 rounded-md border border-line bg-white p-4">
            <p className="font-mono text-xs uppercase text-ink-muted">
              your live dashboard
            </p>
            <a
              href={dashboardUrl}
              className={`${GeistMono.className} mt-2 block break-all text-sm text-ink hover:text-coral`}
            >
              {dashboardUrl}
            </a>
            <p className="mt-3 text-sm text-ink-muted">
              Open this in another tab. Once {platform.name} confirms whoopsie is
              wired up and you hit your chat, the first event lands here.
            </p>
            <p className="mt-2 font-mono text-xs text-ink-muted">
              project id: {projectId}
            </p>
            <div className="mt-5 border-t border-line pt-4">
              <EmailCapture projectId={projectId} source="install_page" />
            </div>
          </div>
        </TermsGate>
      </div>
    </div>
  );
}
