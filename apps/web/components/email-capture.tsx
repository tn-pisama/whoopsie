"use client";

import { useState } from "react";
import { GeistMono } from "geist/font/mono";

type Status = "idle" | "submitting" | "saved" | "duplicate" | "error";

export function EmailCapture({
  projectId,
  source,
  copy = "Optional — drop your email if you want a heads-up when whoopsie ships paid alerts or breaks.",
  ctaSaved = "thanks. we'll only email you if it's worth it.",
}: {
  projectId: string;
  source: "install_page" | "dashboard_empty" | "dashboard_first_event";
  copy?: string;
  ctaSaved?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "submitting") return;
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, email, source }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        created?: boolean;
        error?: string;
      };
      if (!res.ok || data.error) {
        setStatus("error");
        setErrorMsg(data.error ?? `error ${res.status}`);
        return;
      }
      setStatus(data.created === false ? "duplicate" : "saved");
    } catch {
      setStatus("error");
      setErrorMsg("network error");
    }
  };

  if (status === "saved" || status === "duplicate") {
    return (
      <p className="text-sm text-ink-muted">
        {status === "saved" ? ctaSaved : "already have your email — thanks."}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-xs text-ink-muted">{copy}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "submitting"}
          className={`${GeistMono.className} flex-1 min-w-[180px] rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-coral focus:outline-none`}
        />
        <button
          type="submit"
          disabled={status === "submitting" || email.length === 0}
          className={`${GeistMono.className} inline-flex items-center rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-ink-soft transition hover:border-coral hover:text-coral disabled:opacity-50`}
        >
          {status === "submitting" ? "saving…" : "save"}
        </button>
      </div>
      {status === "error" && errorMsg && (
        <p className="text-xs text-coral">{errorMsg}</p>
      )}
      <p className={`${GeistMono.className} text-[10px] text-ink-muted`}>
        opt-in only. reply STOP and we delete you.
      </p>
    </form>
  );
}
