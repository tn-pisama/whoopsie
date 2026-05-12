"use client";

// In-page contact modal. Opened from /privacy + /terms instead of a bare
// `mailto:` link — vibe-coders on mobile often have no configured mail app
// and the link does nothing. The modal posts to /api/v1/message which
// relays through Resend to hi@whoopsie.dev or security@whoopsie.dev (both
// forwarded to tuomo@pisama.ai by Cloudflare Email Routing).
//
// Graceful failure: if the relay returns 503 (no RESEND_API_KEY set) or
// 502 (Resend itself errored), the modal falls back to opening
// `mailto:<recipient>?subject=...&body=...` with the typed content
// preserved. The user never loses what they wrote.

import { useEffect, useRef, useState } from "react";
import { GeistMono } from "geist/font/mono";

type Kind = "hi" | "security";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  /** Optional project ID — pre-filled from /privacy when the user lands on a
   *  per-project deletion request flow. Goes in the message body so the
   *  maintainer can ack quickly. */
  projectId?: string;
}

const HEADINGS: Record<Kind, { title: string; subtitle: string }> = {
  hi: {
    title: "Send a message to hi@whoopsie.dev",
    subtitle:
      "Goes straight to the maintainer's inbox. Replies usually within 24 hours.",
  },
  security: {
    title: "Report a security issue",
    subtitle:
      "Goes to security@whoopsie.dev — read same-day, acknowledged within 24h. Don't include exploit details an attacker could use mid-flight; we'll set up a private channel if needed.",
  },
};

const RECIPIENT: Record<Kind, string> = {
  hi: "hi@whoopsie.dev",
  security: "security@whoopsie.dev",
};

const MIN_BODY = 10;
const MAX_BODY = 5000;

export function ContactModal({
  open,
  onClose,
  kind,
  projectId,
}: ContactModalProps): React.JSX.Element | null {
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [pid, setPid] = useState(projectId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok" }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && emailRef.current) {
      emailRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function reset() {
    setEmail("");
    setBody("");
    setPid(projectId ?? "");
    setStatus({ kind: "idle" });
    setSubmitting(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/v1/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: kind,
          from: email.trim(),
          body: body.trim(),
          projectId: pid.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        retryAfterSec?: number;
        fallbackTo?: string;
      };
      if (res.ok) {
        setStatus({ kind: "ok" });
        setSubmitting(false);
        return;
      }
      if (res.status === 429) {
        setStatus({
          kind: "error",
          msg: `Slow down — try again in ${data.retryAfterSec ?? 60}s.`,
        });
        setSubmitting(false);
        return;
      }
      // 502 / 503: fall back to mailto so we don't lose the user's message.
      if ((res.status === 503 || res.status === 502) && data.fallbackTo) {
        const subject =
          kind === "security"
            ? "Security report"
            : pid
              ? `Re: ${pid}`
              : "Message via whoopsie.dev";
        const mailto =
          `mailto:${data.fallbackTo}` +
          `?subject=${encodeURIComponent(subject)}` +
          `&body=${encodeURIComponent(body.trim())}`;
        window.location.href = mailto;
        setStatus({
          kind: "error",
          msg:
            "Relay's temporarily down — opened your mail app with the message preserved.",
        });
        setSubmitting(false);
        return;
      }
      setStatus({
        kind: "error",
        msg: data.error ?? `Send failed (HTTP ${res.status}).`,
      });
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", msg: `Network error: ${m}` });
    } finally {
      setSubmitting(false);
    }
  }

  const heading = HEADINGS[kind];
  const recipient = RECIPIENT[kind];

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              {heading.title}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">{heading.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mt-1 -mr-1 rounded p-1 text-ink-muted hover:bg-coral-soft/40 hover:text-coral"
          >
            ×
          </button>
        </div>

        {status.kind === "ok" ? (
          <div className="mt-6 rounded-md border border-coral/40 bg-coral-soft/30 p-4 text-sm text-ink-soft">
            <p>
              Got it — sent to{" "}
              <code className={`${GeistMono.className} text-xs`}>{recipient}</code>.
              We&apos;ll reply to the address you provided. If you don&apos;t
              hear back within 24h, you can also email directly.
            </p>
            <button
              type="button"
              onClick={close}
              className={`${GeistMono.className} mt-4 inline-flex items-center rounded-md bg-ink px-4 py-2 text-sm text-paper hover:bg-coral`}
            >
              close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-ink">Your email</span>
              <input
                ref={emailRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm placeholder:text-ink-muted/60 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              />
            </label>

            {kind === "hi" && (
              <label className="block text-sm">
                <span className="font-medium text-ink">
                  Project ID{" "}
                  <span className="font-normal text-ink-muted">
                    (optional, speeds up deletion / lookup)
                  </span>
                </span>
                <input
                  type="text"
                  value={pid}
                  onChange={(e) => setPid(e.target.value)}
                  placeholder="ws_..."
                  className={`${GeistMono.className} mt-1 w-full rounded-md border border-line px-3 py-2 text-[12px] placeholder:text-ink-muted/60 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral`}
                />
              </label>
            )}

            <label className="block text-sm">
              <span className="font-medium text-ink">Message</span>
              <textarea
                required
                minLength={MIN_BODY}
                maxLength={MAX_BODY}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder={
                  kind === "security"
                    ? "Short description + repro steps. Versions or commit hashes if you have them."
                    : "What can we help with?"
                }
                className="mt-1 w-full resize-y rounded-md border border-line px-3 py-2 text-sm placeholder:text-ink-muted/60 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              />
              <span className="mt-1 block text-right text-[11px] text-ink-muted">
                {body.length}/{MAX_BODY}
              </span>
            </label>

            {status.kind === "error" && (
              <p className="text-sm text-coral">{status.msg}</p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={close}
                className="rounded-md px-4 py-2 text-sm text-ink-muted hover:text-ink"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={submitting || body.trim().length < MIN_BODY}
                className={`${GeistMono.className} inline-flex items-center rounded-md bg-ink px-4 py-2 text-sm text-paper transition hover:bg-coral disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {submitting ? "sending…" : "send →"}
              </button>
            </div>

            <p className="text-[11px] text-ink-muted">
              Sent via Resend (our email delivery provider). Your message and
              email address travel through their servers. See{" "}
              <a href="/privacy" className="underline hover:text-coral">
                /privacy
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
