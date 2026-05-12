// Shared transactional-email client. Used by:
//   - app/api/v1/message/route.ts — the in-page contact modal relay
//   - lib/alerts.ts                — first-failure email alerts (currently
//     gated behind WHOOPSIE_ALERTS_ENABLED=1; off by default)
//
// We send via Brevo (formerly Sendinblue). Picked over Resend because the
// maintainer already has a Brevo account configured for Pisama's signup
// emails, so this reuses an existing trust + DNS-verified sender domain
// (pisama.ai) instead of standing up a new vendor relationship.
//
// FROM address defaults to `alerts@pisama.ai` (the maintainer's already-
// verified Brevo sender) with a display name making it clear which surface
// the message came from. Recipient sees "Whoopsie Contact <alerts@pisama.ai>"
// in their inbox, which is correct: whoopsie.dev and pisama.ai share a
// maintainer.

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const FROM_EMAIL = process.env.WHOOPSIE_FROM_EMAIL ?? "alerts@pisama.ai";
const FROM_NAME = process.env.WHOOPSIE_FROM_NAME ?? "Whoopsie";

export interface MailSendOpts {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** When set, replies to the sent message route to this address. */
  replyTo?: string;
  /** Override the From display name for this send. */
  fromName?: string;
}

export interface MailSendResult {
  ok: boolean;
  /** Provider-side message id when delivery accepted (Brevo's `messageId`). */
  id?: string;
  /** Concise error string for logs + diagnostics. Never echoed to clients. */
  error?: string;
  /** HTTP status returned by the provider, for callers that want to map
   *  upstream non-2xx to a specific user-facing response (e.g. 502). */
  status?: number;
}

/**
 * `null` when the mail relay isn't configured. The caller should respond
 * with HTTP 503 + a `fallbackTo` hint so the UI can degrade to `mailto:`.
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

interface BrevoSuccess {
  messageId?: string;
}

interface BrevoError {
  code?: string;
  message?: string;
}

export async function sendTransactional(
  opts: MailSendOpts,
): Promise<MailSendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "BREVO_API_KEY not set" };
  }

  const payload: Record<string, unknown> = {
    sender: { name: opts.fromName ?? FROM_NAME, email: FROM_EMAIL },
    to: [{ email: opts.to }],
    subject: opts.subject,
    textContent: opts.text,
  };
  if (opts.html) payload.htmlContent = opts.html;
  if (opts.replyTo) payload.replyTo = { email: opts.replyTo };

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as
      | BrevoSuccess
      | BrevoError;
    if (!res.ok) {
      const err = data as BrevoError;
      return {
        ok: false,
        status: res.status,
        error: err.message ?? `brevo ${res.status}`,
      };
    }
    return { ok: true, id: (data as BrevoSuccess).messageId, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
