"use client";

// Cross-platform install-verification disclosure. AI builders on every platform
// we tested (v0, Lovable, Replit, Bolt) accepted the install prompt but a
// meaningful fraction wrote the middleware wrap incorrectly — sometimes failing
// loudly (500s) and sometimes silently (chat works, zero traces fire). The
// shipped install prompt now uses the single-call `observe()` helper to
// minimize that failure surface, but verification on the user side is still
// the only thing that proves the install actually worked.

import { useEffect, useState } from "react";

const STORAGE_KEY = "whoopsie:install-verify-dismissed-v2";

export function LovableNotReachable() {
  const [dismissed, setDismissed] = useState<boolean>(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setDismissed(true);
    } catch {
      // ignore
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="mt-8 rounded-md border border-coral/40 bg-coral-soft/30 p-5 text-sm text-ink-soft">
      <p className="font-medium text-ink">After install, verify a trace lands</p>
      <p className="mt-2">
        AI builders sometimes accept the install prompt confidently and then
        write the wrap incorrectly — silently. The cure is one quick check:
        send <strong>one chat message</strong> in your running app and confirm a
        trace appears on your live dashboard within ~2 seconds. If nothing
        lands, the AI rewrote the wrap into something that doesn&apos;t
        invoke whoopsie&apos;s middleware. Re-paste the prompt and ask it to
        use the <code className="font-mono">observe()</code> helper exactly as
        written.
      </p>
      <p className="mt-2">
        Lovable is a special case: it builds on TanStack Start (React 19 + Vite),
        not Next.js. The integration code path is different, and our tests have
        shown it&apos;s the most likely platform to silently no-op. Verify
        carefully there.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, "1");
          } catch {
            // ignore
          }
          setDismissed(true);
        }}
        className="mt-3 font-mono text-xs text-ink-muted hover:text-coral"
      >
        got it, dismiss →
      </button>
    </div>
  );
}
