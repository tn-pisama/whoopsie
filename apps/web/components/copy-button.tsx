"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          // clipboard refused; ignore
        }
      }}
      className="inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5 font-mono text-xs text-ink-soft transition hover:border-coral hover:text-coral"
      aria-label={label ?? "Copy"}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
