export { getStore } from "./store";
import { getStore } from "./store";
import type { TraceWithHits } from "./types";

export async function publish(
  projectId: string,
  payload: TraceWithHits,
): Promise<void> {
  const store = await getStore();
  await store.publish(projectId, payload);
}

export async function recent(
  projectId: string,
  n = 50,
): Promise<TraceWithHits[]> {
  const store = await getStore();
  return store.recent(projectId, n);
}

export async function subscribe(
  projectId: string,
  listener: (payload: TraceWithHits) => void,
): Promise<() => void> {
  const store = await getStore();
  return store.subscribe(projectId, listener);
}
