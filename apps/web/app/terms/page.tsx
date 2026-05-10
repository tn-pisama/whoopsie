import { GeistMono } from "geist/font/mono";

export const metadata = {
  title: "Terms of service — whoopsie",
  description:
    "Plain-language terms for using whoopsie.dev: free use, no warranty, side projects only, no SLA.",
};

const LAST_UPDATED = "2026-05-01";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20">
      <header className="flex items-center justify-between py-8">
        <a
          href="/"
          className={`${GeistMono.className} text-lg lowercase tracking-tight hover:text-coral`}
        >
          whoopsie
        </a>
        <nav className="flex items-center gap-6 font-mono text-xs text-ink-muted">
          <a href="/install" className="hover:text-ink">install</a>
          <a href="/privacy" className="hover:text-ink">privacy</a>
          <a href="/status" className="hover:text-ink">status</a>
          <a href="https://github.com/tn-pisama/whoopsie" className="hover:text-ink">github</a>
        </nav>
      </header>

      <section className="py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Terms of service.
        </h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Plain language. Last updated {LAST_UPDATED}.
        </p>
      </section>

      <section className="space-y-10 border-t border-line py-10">
        <Block heading="1. What you're agreeing to">
          <p>
            By using whoopsie.dev, the @whoopsie/* npm packages, or anything
            else hosted at whoopsie.dev (collectively, &ldquo;whoopsie&rdquo;),
            you agree to these terms and to the{" "}
            <a
              href="/privacy"
              className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
            >
              privacy policy
            </a>
            . If you don&apos;t agree, don&apos;t use it.
          </p>
        </Block>

        <Block heading="2. Free, but as-is">
          <p>
            Whoopsie is free for everyone. There is no SLA, no uptime guarantee,
            and no support beyond best-effort responses to GitHub issues.
            It&apos;s a single-maintainer pre-alpha project. Use it on side
            projects, not anything where downtime or data loss would matter.
          </p>
          <p className="mt-3">
            We may change, throttle, or take down any part of whoopsie at any
            time, with or without notice. We may also stop running it entirely.
            The npm packages are MIT-licensed, so the code keeps working even
            if the hosted dashboard is gone.
          </p>
        </Block>

        <Block heading="3. Acceptable use">
          <p>You agree not to:</p>
          <ul className="ml-5 mt-2 list-disc space-y-1 text-sm text-ink-soft">
            <li>Send traces with content you don&apos;t have permission to share with us (the SDK redacts common PII; <strong>you remain responsible</strong> for what your prompts contain).</li>
            <li>Use whoopsie to harass, deceive, or surveil anyone.</li>
            <li>Reverse-engineer, scrape, or attempt to circumvent the rate limits or auth gates.</li>
            <li>Resell access to the hosted dashboard.</li>
            <li>Use whoopsie in any way that violates US export controls or applicable law.</li>
          </ul>
          <p className="mt-3">
            Rate limits in effect at any time are reported on the{" "}
            <a
              href="/status"
              className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
            >
              status page
            </a>
            . If you exceed them, you&apos;ll get HTTP 429.
          </p>
        </Block>

        <Block heading="4. Your data">
          <p>
            What we collect, where it goes, and how to delete it is documented
            at{" "}
            <a
              href="/privacy"
              className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
            >
              /privacy
            </a>
            .
          </p>
          <p className="mt-3">
            You retain ownership of everything you send. By sending it, you
            grant us a non-exclusive license to process it for the purposes
            described in the privacy policy and to keep aggregate, anonymized
            usage statistics.
          </p>
        </Block>

        <Block heading="5. No warranty, no liability">
          <p>
            Whoopsie is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; with no warranties of any kind, express or
            implied, including merchantability, fitness for a particular
            purpose, and non-infringement.
          </p>
          <p className="mt-3">
            To the maximum extent permitted by law, the maintainer&apos;s
            total liability for any claim arising out of your use of whoopsie
            is capped at zero dollars (whoopsie is free; you didn&apos;t pay
            anything). We are not liable for indirect, consequential, or
            punitive damages.
          </p>
        </Block>

        <Block heading="6. Changes to these terms">
          <p>
            We may update these terms by replacing this page. Material changes
            (anything affecting your data or your obligations) will be flagged
            in a banner on the landing page for at least 14 days before they
            take effect. The &ldquo;last updated&rdquo; date at the top of this
            page reflects the most recent change.
          </p>
          <p className="mt-3">
            If you don&apos;t agree to a change, stop using whoopsie before
            the new terms take effect. Continued use after the change is
            deemed acceptance.
          </p>
        </Block>

        <Block heading="7. Termination">
          <p>
            You can stop using whoopsie at any time. We can terminate your
            access to the hosted dashboard at any time if you violate these
            terms or if we decide to wind the service down. The MIT-licensed
            npm packages survive termination.
          </p>
        </Block>

        <Block heading="8. Governing law and disputes">
          <p>
            These terms are governed by the laws of the State of California,
            United States, without regard to conflict-of-laws rules. Any
            dispute that can&apos;t be resolved by talking it out (start at{" "}
            <a
              href="mailto:hi@whoopsie.dev"
              className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
            >
              hi@whoopsie.dev
            </a>
            ) goes to the state or federal courts in San Francisco County,
            California.
          </p>
        </Block>

        <Block heading="9. Contact">
          <p>
            Maintainer:{" "}
            <a
              href="https://x.com/tnikulainen"
              className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
            >
              Tuomo Nikulainen
            </a>
            . Email:{" "}
            <a
              href="mailto:hi@whoopsie.dev"
              className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
            >
              hi@whoopsie.dev
            </a>
            . Issues:{" "}
            <a
              href="https://github.com/tn-pisama/whoopsie/issues"
              className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
            >
              github.com/tn-pisama/whoopsie/issues
            </a>
            .
          </p>
        </Block>
      </section>

      <footer className="border-t border-line py-12 font-mono text-xs text-ink-muted">
        <p>Last updated: {LAST_UPDATED}.</p>
        <p className="mt-2">
          <a href="/" className="hover:text-ink">← back to whoopsie</a>
        </p>
      </footer>
    </main>
  );
}

function Block({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
      <div className="mt-3 space-y-2 text-ink-soft">{children}</div>
    </section>
  );
}
