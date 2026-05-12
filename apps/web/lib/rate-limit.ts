// Per-Vercel-instance fixed-window rate limiter. Two flavors:
//
//   ipBucket   limits *requests* per IP per window
//   projectBucket  limits *events* per project_id per window
//
// In-memory only — multi-instance Vercel Functions enforce the ceiling
// per-instance, which is good-enough for v0 abuse mitigation. If anyone
// finds a way around it (edge cache + multi-region cold starts), the
// per-project DB column on whoopsie_traces still backstops Neon storage
// via the daily TTL cleanup at /api/internal/cleanup.

interface Bucket {
  count: number;
  windowStartMs: number;
}

const WINDOW_MS = 60_000; // 1 minute fixed window

function check(
  store: Map<string, Bucket>,
  key: string,
  limit: number,
  cost = 1,
): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();
  let b = store.get(key);
  if (!b || now - b.windowStartMs >= WINDOW_MS) {
    b = { count: 0, windowStartMs: now };
    store.set(key, b);
  }
  if (b.count + cost > limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((b.windowStartMs + WINDOW_MS - now) / 1000),
    );
    return { allowed: false, retryAfterSec, remaining: 0 };
  }
  b.count += cost;
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: Math.max(0, limit - b.count),
  };
}

const ipStore = new Map<string, Bucket>();
const projectStore = new Map<string, Bucket>();

const SPANS_PER_IP_PER_MIN = parseInt(
  process.env.WHOOPSIE_SPANS_PER_IP_PER_MIN ?? "100",
  10,
);
const SPANS_PER_PROJECT_PER_MIN = parseInt(
  process.env.WHOOPSIE_SPANS_PER_PROJECT_PER_MIN ?? "1000",
  10,
);
const CONTACT_PER_IP_PER_MIN = parseInt(
  process.env.WHOOPSIE_CONTACT_PER_IP_PER_MIN ?? "30",
  10,
);
// Contact-form messages relay to Brevo and into our inbox. Lower ceiling
// than the contact-email opt-in (which only writes a Postgres row) because
// every accepted message is one outbound Brevo send + one inbound email
// for us to read.
const MESSAGE_PER_IP_PER_MIN = parseInt(
  process.env.WHOOPSIE_MESSAGE_PER_IP_PER_MIN ?? "5",
  10,
);

export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitSpansRequest(
  ip: string,
): ReturnType<typeof check> {
  return check(ipStore, `spans:${ip}`, SPANS_PER_IP_PER_MIN);
}

export function rateLimitSpansProject(
  projectId: string,
  events: number,
): ReturnType<typeof check> {
  return check(
    projectStore,
    `spans:${projectId}`,
    SPANS_PER_PROJECT_PER_MIN,
    events,
  );
}

export function rateLimitContact(ip: string): ReturnType<typeof check> {
  return check(ipStore, `contact:${ip}`, CONTACT_PER_IP_PER_MIN);
}

export function rateLimitMessage(ip: string): ReturnType<typeof check> {
  return check(ipStore, `message:${ip}`, MESSAGE_PER_IP_PER_MIN);
}

// Test hook — clears the in-memory state. Don't call from production code.
export function _resetRateLimitForTests(): void {
  ipStore.clear();
  projectStore.clear();
}

// Limits exposed for the health endpoint + diagnostic logging.
export const RATE_LIMIT_CONFIG = {
  spansPerIpPerMin: SPANS_PER_IP_PER_MIN,
  spansPerProjectPerMin: SPANS_PER_PROJECT_PER_MIN,
  contactPerIpPerMin: CONTACT_PER_IP_PER_MIN,
  messagePerIpPerMin: MESSAGE_PER_IP_PER_MIN,
};
