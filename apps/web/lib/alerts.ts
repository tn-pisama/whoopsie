// Send-on-first-failure email alerts. Currently the only alert kind is
// `first_failure`: a contact's first detector hit on their project.
//
// Disabled by default: requires WHOOPSIE_ALERTS_ENABLED=1 AND BREVO_API_KEY
// to be set. (See lib/mail.ts for the underlying transactional client.)
// The feature was disabled when we declined to disclose the mail provider
// as a sub-processor on /privacy — that disclosure has since landed.

import type { Store } from "./store";
import type { TraceWithHits } from "./types";
import { detectorCopy } from "./detector-copy";
import { isMailConfigured, sendTransactional } from "./mail";

const REPLY_TO = process.env.WHOOPSIE_REPLY_TO ?? "hi@whoopsie.dev";
const KIND = "first_failure";

async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const result = await sendTransactional({
    to: opts.to,
    replyTo: REPLY_TO,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    fromName: "Whoopsie Alerts",
  });
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

function buildEmail(
  projectId: string,
  trace: TraceWithHits,
): { subject: string; text: string; html: string } {
  const dashboard = `https://whoopsie.dev/live/${projectId}`;
  const hits = trace.hits;
  const primary = hits[0];
  if (!primary) {
    return {
      subject: "whoopsie caught a failure in your AI app",
      text: `Open the dashboard: ${dashboard}`,
      html: `<p>Open the dashboard: <a href="${dashboard}">${dashboard}</a></p>`,
    };
  }
  const copy = detectorCopy(primary.detector);
  const subject = `whoopsie: ${copy.title.toLowerCase()} on ${trace.event.model || "your model"}`;
  const summaryLine = primary.summary;
  const fixLine = primary.fix ?? "Open the dashboard for full evidence.";
  const allHits =
    hits.length > 1
      ? hits.map((h) => `- ${detectorCopy(h.detector).title} (${h.detector})`).join("\n")
      : "";

  const text = [
    `whoopsie just caught your first detector hit.`,
    ``,
    `What it caught: ${copy.title}`,
    `${copy.blurb}`,
    ``,
    `Detail: ${summaryLine}`,
    fixLine,
    allHits ? `\nOther detectors that fired:\n${allHits}` : ``,
    ``,
    `Full trace + fix suggestion: ${dashboard}`,
    ``,
    `(You only get one of these — the first failure on your project. Reply STOP if you want us to remove your email.)`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:#0e0f0d;font-size:15px;line-height:1.55;max-width:560px;margin:0 auto;padding:24px;">
  <tr><td>
    <p style="margin:0 0 16px;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:13px;color:#6b6c66;">whoopsie.dev</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:-0.01em;">whoopsie just caught your first detector hit.</h1>
    <p style="margin:0 0 24px;color:#2a2b27;">${escape(copy.title)} — ${escape(copy.blurb)}</p>

    <table cellpadding="0" cellspacing="0" border="0" style="background:#fff;border:1px solid #e5e3dc;border-radius:6px;width:100%;margin-bottom:24px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0 0 6px;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:11px;text-transform:uppercase;color:#6b6c66;">${escape(primary.detector)} · severity ${primary.severity}</p>
        <p style="margin:0 0 8px;color:#2a2b27;">${escape(summaryLine)}</p>
        <p style="margin:0;color:#6b6c66;font-size:14px;">→ ${escape(fixLine)}</p>
      </td></tr>
    </table>

    <p style="margin:0 0 24px;">
      <a href="${dashboard}" style="display:inline-block;background:#0e0f0d;color:#fafaf8;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:13px;text-decoration:none;padding:10px 18px;border-radius:6px;">Open your live dashboard →</a>
    </p>

    <p style="margin:24px 0 0;color:#6b6c66;font-size:13px;">You only get one of these — the first failure on your project. Reply STOP and we'll remove your email.</p>
  </td></tr>
</table>`.trim();

  return { subject, text, html };
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface AlertResult {
  attempted: number;
  sent: number;
  failed: number;
  skippedNoKey: boolean;
  skippedDisabled: boolean;
}

/**
 * On a trace that fired ≥1 detector, email everyone subscribed to the
 * project who hasn't been alerted yet for the `first_failure` kind. Records
 * the alert atomically before sending so a transient API failure doesn't
 * cause re-sends — better to miss one alert than spam someone.
 */
export async function sendFirstFailureAlerts(
  store: Store,
  projectId: string,
  trace: TraceWithHits,
): Promise<AlertResult> {
  const result: AlertResult = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skippedNoKey: false,
    skippedDisabled: false,
  };
  if (trace.hits.length === 0) return result;

  if (process.env.WHOOPSIE_ALERTS_ENABLED !== "1") {
    result.skippedDisabled = true;
    return result;
  }

  if (!isMailConfigured()) {
    result.skippedNoKey = true;
    return result;
  }

  let recipients: { email: string; source: string }[];
  try {
    recipients = await store.contactsAwaitingAlert(projectId, KIND);
  } catch (err) {
    console.error("[whoopsie] contactsAwaitingAlert failed:", err);
    return result;
  }
  if (recipients.length === 0) return result;

  const { subject, text, html } = buildEmail(projectId, trace);

  for (const recipient of recipients) {
    result.attempted++;
    let recorded: { recorded: boolean };
    try {
      recorded = await store.recordAlert({
        projectId,
        email: recipient.email,
        kind: KIND,
      });
    } catch (err) {
      console.error("[whoopsie] recordAlert failed:", err);
      result.failed++;
      continue;
    }
    if (!recorded.recorded) continue; // raced; another instance got there first
    const send = await sendEmail({ to: recipient.email, subject, text, html });
    if (send.ok) result.sent++;
    else {
      result.failed++;
      console.warn(
        `[whoopsie] alert send failed for ${recipient.email}: ${send.error}`,
      );
    }
  }
  return result;
}
