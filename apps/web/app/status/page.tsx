import { GeistMono } from "geist/font/mono";

export const dynamic = "force-dynamic";
export const revalidate = 30;

interface HealthReport {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  store: string;
  storeReachable: boolean;
  recentTraceCount: number | null;
  oldestTraceAgeMin: number | null;
  rateLimits: {
    spansPerIpPerMin: number;
    spansPerProjectPerMin: number;
    contactPerIpPerMin: number;
  };
  notes: string[];
}

async function fetchHealth(): Promise<HealthReport | null> {
  try {
    // Server-side fetch back to ourselves. We use the public URL so the
    // status page works the same in dev (localhost) and prod.
    const url =
      process.env.NEXT_PUBLIC_BASE_URL ?? "https://whoopsie.dev";
    const res = await fetch(`${url}/api/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HealthReport;
  } catch {
    return null;
  }
}

export default async function StatusPage() {
  const h = await fetchHealth();

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
          <a href="/terms" className="hover:text-ink">terms</a>
          <a href="https://github.com/tn-pisama/whoopsie" className="hover:text-ink">github</a>
        </nav>
      </header>

      <section className="py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Status
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Live snapshot from{" "}
          <a
            href="/api/health"
            className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
          >
            /api/health
          </a>
          . Refreshes when you reload the page.
        </p>
      </section>

      {!h ? (
        <Banner status="down" label="Couldn't reach /api/health" />
      ) : (
        <>
          <Banner
            status={h.status}
            label={
              h.status === "ok"
                ? "All systems normal."
                : h.status === "degraded"
                ? "Running, but degraded."
                : "Something's wrong."
            }
          />
          <section className="mt-8 space-y-2 rounded-md border border-line bg-white p-5">
            <Row k="store backend" v={h.store} />
            <Row k="store reachable" v={h.storeReachable ? "yes" : "no"} />
            <Row
              k="recent traces (last hour)"
              v={
                h.recentTraceCount === null
                  ? "—"
                  : String(h.recentTraceCount)
              }
            />
            <Row
              k="oldest in window"
              v={
                h.oldestTraceAgeMin === null
                  ? "—"
                  : `${h.oldestTraceAgeMin} min ago`
              }
            />
            <Row k="reported at" v={new Date(h.timestamp).toLocaleString()} />
          </section>

          <section className="mt-6 space-y-2 rounded-md border border-line bg-white p-5">
            <h2 className={`${GeistMono.className} text-xs uppercase text-ink-muted`}>
              rate limits in effect
            </h2>
            <Row k="POST /api/v1/spans (per IP)" v={`${h.rateLimits.spansPerIpPerMin}/min`} />
            <Row k="POST /api/v1/spans (per project)" v={`${h.rateLimits.spansPerProjectPerMin} events/min`} />
            <Row k="POST /api/v1/contact (per IP)" v={`${h.rateLimits.contactPerIpPerMin}/min`} />
          </section>

          {h.notes.length > 0 && (
            <section className="mt-6 rounded-md border border-line bg-coral-soft/30 p-5">
              <h2 className={`${GeistMono.className} text-xs uppercase text-ink-muted`}>
                notes
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {h.notes.map((n, i) => (
                  <li key={i}>· {n}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <footer className="mt-16 border-t border-line py-12 font-mono text-xs text-ink-muted">
        <p>
          No SLA — pre-alpha, single-maintainer. If something looks broken
          and isn&apos;t reflected here, open an issue at{" "}
          <a
            href="https://github.com/tn-pisama/whoopsie/issues"
            className="underline decoration-coral/40 underline-offset-2 hover:text-coral"
          >
            github.com/tn-pisama/whoopsie/issues
          </a>
          .
        </p>
        <p className="mt-2">
          <a href="/" className="hover:text-ink">← back</a>
        </p>
      </footer>
    </main>
  );
}

function Banner({
  status,
  label,
}: {
  status: "ok" | "degraded" | "down";
  label: string;
}) {
  const dotClass =
    status === "ok"
      ? "bg-coral"
      : status === "degraded"
      ? "bg-coral opacity-50"
      : "bg-coral animate-pulse";
  const labelClass =
    status === "ok"
      ? "text-ink"
      : status === "degraded"
      ? "text-ink-soft"
      : "text-coral";
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-white px-5 py-4">
      <span
        className={`inline-block h-3 w-3 rounded-full ${dotClass}`}
        aria-hidden="true"
      />
      <span className={`text-base font-medium ${labelClass}`}>{label}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-ink-muted">{k}</span>
      <span className={`${GeistMono.className} text-ink`}>{v}</span>
    </div>
  );
}
