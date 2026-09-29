/**
 * Pages show what they had last time at once, then what the server says
 * now: coming back to a page is instant, and never stays stale for longer
 * than one request. Any write through `api` forgets everything remembered,
 * signing out included, and a request already on its way is shared rather
 * than sent twice.
 */
const remembered = new Map<string, { data: unknown; at: number }>();
/** An answer this young is shown without asking again, so a prefetch is not repeated. */
const FRESH_MS = 10_000;
const inFlight = new Map<string, Promise<unknown>>();
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const writing = (init.method ?? 'GET') !== 'GET';
  if (writing) {
    // Anything shown from memory may now be out of date.
    remembered.clear();
  }
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export function post<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: 'POST', body: JSON.stringify(body) });
}
function fetchShared<T>(path: string): Promise<T> {
  const pending = inFlight.get(path);
  if (pending) {
    return pending as Promise<T>;
  }
  const request = api<T>(path)
    .then((data) => {
      remembered.set(path, { data, at: Date.now() });
      return data;
    })
    .finally(() => inFlight.delete(path));
  inFlight.set(path, request);
  return request;
}
/** Call `show` with the remembered answer, if any, then with a fresh one unless it is only seconds old. */
export async function loadCached<T>(
  path: string,
  show: (data: T) => void,
): Promise<void> {
  const known = remembered.get(path);
  if (known) {
    show(known.data as T);
  }
  const fresh = known && Date.now() - known.at < FRESH_MS;
  if (fresh) {
    return;
  }
  show(await fetchShared<T>(path));
}
/** Start fetching before the page that needs it is on screen. */
export function prefetch(paths: string[]): void {
  for (const path of paths) {
    fetchShared(path).catch(() => null);
  }
}
