"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "whoopsie:tos-accepted";

export function TermsGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setAccepted(window.localStorage.getItem(STORAGE_KEY) === "v1");
    } catch {
      setAccepted(false);
    }
  }, []);

  if (accepted === null) {
    // Avoid flashing the gate during hydration. Render the gated content
    // collapsed so the layout is stable.
    return (
      <div aria-hidden="true" className="opacity-0 pointer-events-none">
        {children}
      </div>
    );
  }

  if (accepted) return <>{children}</>;

  return (
    <div className="rounded-md border border-line bg-coral-soft/30 p-5">
      <p className="text-sm text-ink-soft">
        Before you copy the prompt: by using whoopsie you agree to the{" "}
        <a
          href="/terms"
          className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
        >
          terms of service
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
        >
          privacy policy
        </a>
        . Whoopsie is free, pre-alpha, single-maintainer; for side projects, not
        production-critical systems. There&apos;s no SLA and we may change or
        shut things down at any time.
      </p>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line accent-coral"
          onChange={(e) => {
            if (e.target.checked) {
              try {
                window.localStorage.setItem(STORAGE_KEY, "v1");
              } catch {
                // ignore storage failures
              }
              setAccepted(true);
            }
          }}
        />
        <span>
          I&apos;ve read and agree to the{" "}
          <a
            href="/terms"
            className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
          >
            terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
          >
            privacy policy
          </a>
          .
        </span>
      </label>
    </div>
  );
}
