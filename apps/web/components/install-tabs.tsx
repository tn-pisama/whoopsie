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
              "px-4 py-2 -mb-px border-b-2 text-sm font-medium transition " +
              (active === p.slug
                ? "border-coral text-ink"
                : "border-transparent text-ink-muted hover:text-ink")
            }
          >
            {p.name}
          </button>
        ))}
      </div>

      <p className="mt-6 text-ink-muted">{platform.blurb}</p>

      <div className="mt-6">
        <TermsGate>
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
