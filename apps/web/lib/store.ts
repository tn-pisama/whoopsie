import { EventEmitter } from "node:events";
import type { TraceWithHits } from "./types";
import type { Pool, PoolClient } from "pg";

export interface ContactRecord {
  projectId: string;
  email: string;
  source: string;
  createdAt: number;
}

export interface AlertRecord {
  projectId: string;
  email: string;
  kind: string; // e.g. "first_failure"
}

export interface TosAcceptance {
  projectId?: string;
  termsVersion: string;
  ip?: string;
  userAgent?: string;
  acceptedAt?: number;
}

export interface ContactWithAlerts {
  email: string;
  source: string;
}

export interface Store {
  publish(projectId: string, payload: TraceWithHits): Promise<void>;
  recent(projectId: string, n?: number): Promise<TraceWithHits[]>;
  subscribe(
    projectId: string,
    listener: (payload: TraceWithHits) => void,
  ): Promise<() => void>;
  saveContact(record: ContactRecord): Promise<{ created: boolean }>;
  /**
   * Returns contacts for a project that have NOT yet received an alert of
   * `kind`. Used by the alert pipeline to figure out who to email.
   */
  contactsAwaitingAlert(
    projectId: string,
    kind: string,
  ): Promise<ContactWithAlerts[]>;
  /**
   * Atomically marks an alert as sent. Returns false if a row for
   * (projectId, email, kind) already existed (race-safe dedupe).
   */
  recordAlert(record: AlertRecord): Promise<{ recorded: boolean }>;
  /**
   * Records a TOS acceptance for audit purposes. Always inserts a new row
   * (multiple acceptances per project_id are allowed — same user across
   * browsers/devices, version updates, etc.). No-ops cleanly if storage
   * fails so the user-facing checkbox never gets stuck.
   */
  recordTosAcceptance(record: TosAcceptance): Promise<void>;
  close?(): Promise<void>;
}

const RING_CAPACITY = 200;

class RingBuffer<T> {
  private items: T[] = [];
  constructor(private readonly cap: number) {}
  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.cap) {
      this.items.splice(0, this.items.length - this.cap);
    }
  }
  recent(n = this.cap): T[] {
    return this.items.slice(-n);
  }
}

interface MemoryChannel {
  buffer: RingBuffer<TraceWithHits>;
  emitter: EventEmitter;
}

export class MemoryStore implements Store {
  private channels = new Map<string, MemoryChannel>();
  private contacts = new Map<string, ContactRecord>();
  private alerts = new Set<string>();
  private tosAcceptances: TosAcceptance[] = [];

  private channelFor(projectId: string): MemoryChannel {
    let ch = this.channels.get(projectId);
    if (!ch) {
      const emitter = new EventEmitter();
      emitter.setMaxListeners(0);
      ch = { buffer: new RingBuffer(RING_CAPACITY), emitter };
      this.channels.set(projectId, ch);
    }
    return ch;
  }

  async publish(projectId: string, payload: TraceWithHits): Promise<void> {
    const ch = this.channelFor(projectId);
    ch.buffer.push(payload);
    ch.emitter.emit("trace", payload);
  }

  async recent(projectId: string, n = RING_CAPACITY): Promise<TraceWithHits[]> {
    return this.channelFor(projectId).buffer.recent(n);
  }

  async subscribe(
    projectId: string,
    listener: (payload: TraceWithHits) => void,
  ): Promise<() => void> {
    const ch = this.channelFor(projectId);
    ch.emitter.on("trace", listener);
    return () => {
      ch.emitter.off("trace", listener);
    };
  }

  async saveContact(record: ContactRecord): Promise<{ created: boolean }> {
    const key = `${record.projectId}:${record.email.toLowerCase()}`;
    if (this.contacts.has(key)) return { created: false };
    this.contacts.set(key, record);
    return { created: true };
  }

  async contactsAwaitingAlert(
    projectId: string,
    kind: string,
  ): Promise<ContactWithAlerts[]> {
    const out: ContactWithAlerts[] = [];
    for (const [key, contact] of this.contacts) {
      if (!key.startsWith(`${projectId}:`)) continue;
      const alertKey = `${projectId}:${contact.email.toLowerCase()}:${kind}`;
      if (this.alerts.has(alertKey)) continue;
      out.push({ email: contact.email, source: contact.source });
    }
    return out;
  }

  async recordAlert(record: AlertRecord): Promise<{ recorded: boolean }> {
    const key = `${record.projectId}:${record.email.toLowerCase()}:${record.kind}`;
    if (this.alerts.has(key)) return { recorded: false };
    this.alerts.add(key);
    return { recorded: true };
  }

  async recordTosAcceptance(record: TosAcceptance): Promise<void> {
    this.tosAcceptances.push({
      ...record,
      acceptedAt: record.acceptedAt ?? Date.now(),
    });
  }

  // Used by tests + admin scripts that drive MemoryStore directly.
  listContacts(): ContactRecord[] {
    return Array.from(this.contacts.values());
  }
  listTosAcceptances(): TosAcceptance[] {
    return [...this.tosAcceptances];
  }
}

const NOTIFY_CHANNEL = "whoopsie_traces";

const MIGRATION = `
  CREATE TABLE IF NOT EXISTS whoopsie_traces (
    id BIGSERIAL PRIMARY KEY,
    project_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS whoopsie_traces_proj_time_idx
    ON whoopsie_traces (project_id, id DESC);

  CREATE TABLE IF NOT EXISTS whoopsie_contacts (
    id BIGSERIAL PRIMARY KEY,
    project_id TEXT NOT NULL,
    email TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    opted_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribed_at TIMESTAMPTZ
  );
  CREATE UNIQUE INDEX IF NOT EXISTS whoopsie_contacts_proj_email_idx
    ON whoopsie_contacts (project_id, lower(email));

  CREATE TABLE IF NOT EXISTS whoopsie_email_alerts (
    id BIGSERIAL PRIMARY KEY,
    project_id TEXT NOT NULL,
    email TEXT NOT NULL,
    kind TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS whoopsie_email_alerts_proj_email_kind_idx
    ON whoopsie_email_alerts (project_id, lower(email), kind);

  CREATE TABLE IF NOT EXISTS whoopsie_tos_acceptances (
    id BIGSERIAL PRIMARY KEY,
    project_id TEXT,
    terms_version TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS whoopsie_tos_proj_idx
    ON whoopsie_tos_acceptances (project_id);
  CREATE INDEX IF NOT EXISTS whoopsie_tos_at_idx
    ON whoopsie_tos_acceptances (accepted_at DESC);
`;

interface PgNotifyPayload {
  projectId: string;
  id: number;
}

export class PostgresStore implements Store {
  private pool: Pool;
  private migrationPromise: Promise<void> | null = null;
  private listenerClient: PoolClient | null = null;
  private listenerInstalled = false;
  private projectListeners = new Map<
    string,
    Set<(payload: TraceWithHits) => void>
  >();
  private pendingFetches = new Map<number, Promise<TraceWithHits | null>>();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  static async connect(databaseUrl: string): Promise<PostgresStore> {
    const { default: pgDefault, Pool } = await import("pg");
    const PoolCtor = (Pool ?? pgDefault.Pool) as typeof pgDefault.Pool;
    const pool = new PoolCtor({ connectionString: databaseUrl, max: 8 });
    const store = new PostgresStore(pool);
    await store.migrate();
    return store;
  }

  private migrate(): Promise<void> {
    if (!this.migrationPromise) {
      this.migrationPromise = this.pool.query(MIGRATION).then(() => undefined);
    }
    return this.migrationPromise;
  }

  async publish(projectId: string, payload: TraceWithHits): Promise<void> {
    await this.migrate();
    const insert = await this.pool.query<{ id: string }>(
      "INSERT INTO whoopsie_traces (project_id, payload) VALUES ($1, $2) RETURNING id",
      [projectId, payload],
    );
    const id = Number(insert.rows[0]!.id);
    const notice: PgNotifyPayload = { projectId, id };
    await this.pool.query("SELECT pg_notify($1, $2)", [
      NOTIFY_CHANNEL,
      JSON.stringify(notice),
    ]);
  }

  async recent(projectId: string, n = 50): Promise<TraceWithHits[]> {
    await this.migrate();
    const res = await this.pool.query<{ payload: TraceWithHits }>(
      "SELECT payload FROM whoopsie_traces WHERE project_id = $1 ORDER BY id DESC LIMIT $2",
      [projectId, n],
    );
    // Return chronological order (oldest -> newest) to match MemoryStore.
    return res.rows.map((r) => r.payload).reverse();
  }

  async subscribe(
    projectId: string,
    listener: (payload: TraceWithHits) => void,
  ): Promise<() => void> {
    await this.migrate();
    await this.ensureListener();

    let listeners = this.projectListeners.get(projectId);
    if (!listeners) {
      listeners = new Set();
      this.projectListeners.set(projectId, listeners);
    }
    listeners.add(listener);

    return () => {
      const set = this.projectListeners.get(projectId);
      if (!set) return;
      set.delete(listener);
      if (set.size === 0) this.projectListeners.delete(projectId);
    };
  }

  async saveContact(record: ContactRecord): Promise<{ created: boolean }> {
    await this.migrate();
    const res = await this.pool.query<{ id: string }>(
      `INSERT INTO whoopsie_contacts (project_id, email, source)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, lower(email)) DO NOTHING
       RETURNING id`,
      [record.projectId, record.email, record.source],
    );
    return { created: res.rows.length > 0 };
  }

  async contactsAwaitingAlert(
    projectId: string,
    kind: string,
  ): Promise<ContactWithAlerts[]> {
    await this.migrate();
    const res = await this.pool.query<ContactWithAlerts>(
      `SELECT c.email, c.source
       FROM whoopsie_contacts c
       LEFT JOIN whoopsie_email_alerts a
         ON a.project_id = c.project_id
        AND lower(a.email) = lower(c.email)
        AND a.kind = $2
       WHERE c.project_id = $1
         AND c.unsubscribed_at IS NULL
         AND a.id IS NULL`,
      [projectId, kind],
    );
    return res.rows;
  }

  async recordAlert(record: AlertRecord): Promise<{ recorded: boolean }> {
    await this.migrate();
    const res = await this.pool.query<{ id: string }>(
      `INSERT INTO whoopsie_email_alerts (project_id, email, kind)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, lower(email), kind) DO NOTHING
       RETURNING id`,
      [record.projectId, record.email, record.kind],
    );
    return { recorded: res.rows.length > 0 };
  }

  async recordTosAcceptance(record: TosAcceptance): Promise<void> {
    await this.migrate();
    await this.pool.query(
      `INSERT INTO whoopsie_tos_acceptances
         (project_id, terms_version, ip, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [
        record.projectId ?? null,
        record.termsVersion,
        record.ip ?? null,
        record.userAgent ?? null,
      ],
    );
  }

  async close(): Promise<void> {
    if (this.listenerClient) {
      try {
        await this.listenerClient.query(`UNLISTEN ${NOTIFY_CHANNEL}`);
      } catch {
        // ignore
      }
      this.listenerClient.release();
      this.listenerClient = null;
    }
    await this.pool.end();
  }

  private async ensureListener(): Promise<void> {
    if (this.listenerInstalled) return;
    this.listenerInstalled = true;
    const client = await this.pool.connect();
    this.listenerClient = client;
    client.on("notification", (msg) => {
      if (msg.channel !== NOTIFY_CHANNEL || !msg.payload) return;
      let parsed: PgNotifyPayload;
      try {
        parsed = JSON.parse(msg.payload) as PgNotifyPayload;
      } catch {
        return;
      }
      const set = this.projectListeners.get(parsed.projectId);
      if (!set || set.size === 0) return;
      void this.fetchAndDispatch(parsed.id, set);
    });
    client.on("error", () => {
      this.listenerInstalled = false;
      this.listenerClient = null;
    });
    await client.query(`LISTEN ${NOTIFY_CHANNEL}`);
  }

  private fetchAndDispatch(
    id: number,
    listeners: Set<(payload: TraceWithHits) => void>,
  ): Promise<void> {
    let pending = this.pendingFetches.get(id);
    if (!pending) {
      pending = this.pool
        .query<{ payload: TraceWithHits }>(
          "SELECT payload FROM whoopsie_traces WHERE id = $1",
          [id],
        )
        .then((r) => r.rows[0]?.payload ?? null)
        .finally(() => {
          this.pendingFetches.delete(id);
        });
      this.pendingFetches.set(id, pending);
    }
    return pending.then((payload) => {
      if (!payload) return;
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch {
          // listener errors don't break the stream
        }
      }
    });
  }
}

let storeSingleton: Store | null = null;
let storePromise: Promise<Store> | null = null;

export async function getStore(): Promise<Store> {
  if (storeSingleton) return storeSingleton;
  if (!storePromise) {
    storePromise = createStore().then((s) => {
      storeSingleton = s;
      return s;
    });
  }
  return storePromise;
}

async function createStore(): Promise<Store> {
  const url = process.env.WHOOPSIE_DATABASE_URL;
  if (!url) return new MemoryStore();
  return PostgresStore.connect(url);
}

export function resetStoreForTests(): void {
  storeSingleton = null;
  storePromise = null;
}
