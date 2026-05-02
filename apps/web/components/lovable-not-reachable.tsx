"use client";

// Honest, dismissable disclosure. Lovable's supply-chain defenses are
// strong enough that they will currently refuse to install whoopsie
// (low adoption + recent publish + new domain). Other AI builders are
// more permissive, but we shouldn't pretend the Lovable path works
// today when it provably doesn't.

import { useEffect, useState } from "react";

const STORAGE_KEY = "whoopsie:lovable-disclosure-dismissed";

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
      <p className="font-medium text-ink">Heads-up about Lovable specifically</p>
      <p className="mt-2">
        Lovable will currently <strong>refuse</strong> to install whoopsie. Their
        AI checks for adoption signal before installing new packages, and
        whoopsie is a few days old. That&apos;s the right call — it&apos;s the
        same defense we&apos;d want against an actual supply-chain attack.
      </p>
      <p className="mt-2">
        Until whoopsie has a few independent users, the Lovable tab here is
        aspirational. <strong>Replit, Bolt, Cursor, and v0 all currently work</strong>{" "}
        because they expose terminals and let you do the install yourself
        instead of asking the AI to take the trust risk. The terminal path
        below also works.
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
