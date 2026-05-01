import { EventEmitter } from "node:events";
import type { TraceWithHits } from "./types.js";

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
  recent(n: number = this.cap): T[] {
    return this.items.slice(-n);
  }
}

interface ProjectChannel {
  buffer: RingBuffer<TraceWithHits>;
  emitter: EventEmitter;
}

const globalKey = "__whoops_bus__";
const g = globalThis as unknown as Record<string, Map<string, ProjectChannel>>;
if (!g[globalKey]) {
  g[globalKey] = new Map<string, ProjectChannel>();
}
const channels = g[globalKey];

function channelFor(projectId: string): ProjectChannel {
  let ch = channels.get(projectId);
  if (!ch) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    ch = { buffer: new RingBuffer(RING_CAPACITY), emitter };
    channels.set(projectId, ch);
  }
  return ch;
}

export function publish(projectId: string, payload: TraceWithHits): void {
  const ch = channelFor(projectId);
  ch.buffer.push(payload);
  ch.emitter.emit("trace", payload);
}

export function recent(projectId: string, n = 50): TraceWithHits[] {
  return channelFor(projectId).buffer.recent(n);
}

export function subscribe(
  projectId: string,
  listener: (payload: TraceWithHits) => void,
): () => void {
  const ch = channelFor(projectId);
  ch.emitter.on("trace", listener);
  return () => {
    ch.emitter.off("trace", listener);
  };
}
