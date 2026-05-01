"use client";

import { useState } from "react";
import { GeistMono } from "geist/font/mono";

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre
        className={`${GeistMono.className} max-h-[420px] overflow-auto rounded-md border border-line bg-white p-4 pr-24 text-[12.5px] leading-6 text-ink-soft`}
      >
        {text}
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            // ignore
          }
        }}
        className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5 font-mono text-xs text-ink-soft transition hover:border-coral hover:text-coral"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
