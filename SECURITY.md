# Security

## Reporting a vulnerability

If you find a vulnerability in `@whoopsie/sdk`, `@whoopsie/cli`, `@whoopsie/detectors`, or anything hosted at `whoopsie.dev`, **do not open a public GitHub issue.**

Instead, email the maintainer directly:

- **Address:** `security@whoopsie.dev`
- **Backup:** `tuomo@pisama.ai` (the underlying entity behind whoopsie — see "Maintainer" below)

Please include:

- A short description of the issue (what you observed, what you expected).
- Reproduction steps or a proof of concept.
- Any relevant package version(s) or commit hash(es).
- Your name / handle if you'd like credit, or "anonymous" if not.

I read security mail same-day. Expect an acknowledgement within 24 hours and a substantive response (fix in progress, tracking issue, or "this isn't a vuln, here's why") within 5 business days.

## Scope

In scope:

- Code execution, privilege escalation, or sandbox escape via the published packages.
- Auth bypass on `/api/internal/cleanup` or other authenticated routes.
- Data-handling violations vs. what's documented at https://whoopsie.dev/privacy (e.g. PII redaction missing a known pattern, retention longer than stated).
- Trace-event injection that lets one project read or affect another project's data.
- Anything that would let an attacker fill the Neon database past the rate limits.

Out of scope:

- Heuristic false positives in the detectors. Those are documented as low-precision; tighten the threshold via a PR.
- Rate-limit bypasses below the per-instance ceiling. Documented limitation, see `apps/web/lib/rate-limit.ts`.
- Reports based purely on running automated security scanners against `whoopsie.dev` without context.
- Issues in third-party services we depend on (Neon, Vercel, Resend, Cloudflare). Report those upstream.

## Disclosure

I'd prefer coordinated disclosure with a 30-day private window before publication. If the vulnerability is being actively exploited or there's clear public risk, I'll publish faster — give me a heads-up.

If your report leads to a fix, I'll credit you in the commit message and the GitHub release notes (unless you've asked to be anonymous).

## Supported versions

Pre-alpha. The latest published version of each package on npm is the supported version. Older versions are not patched. Pin versions in your lockfile if you need stability.

| Package | Latest |
|---|---|
| `@whoopsie/sdk` | 0.0.2 |
| `@whoopsie/cli` | 0.0.1 |
| `@whoopsie/detectors` | 0.0.1 |

## Maintainer

Whoopsie is maintained by Tuomo Nikulainen as the vibe-coder cut of [Pisama](https://pisama.ai), a multi-agent failure detection platform. The same data-handling and security posture applies to both products.

If you need a verifiable identity for security correspondence (e.g. for a coordinated disclosure with a CNA), reply to a mail from `security@whoopsie.dev` and I'll respond from `tuomo@pisama.ai` to confirm. Both addresses route to me.

## Why this file is short

Whoopsie is one developer + ~hour-old packages. A 2,000-word security policy would be theater. If your security workflow requires a more formal document (vendor questionnaire, DPA, etc.), email me — I can scope something specific to your situation.
