import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { Env, User } from '../server/auth';
export const ORIGIN = 'http://localhost:3007';
/** A D1 stand-in over node:sqlite, with the real migrations applied. */
export function fixture(extra: Partial<Env> = {}) {
  const db = new DatabaseSync(':memory:');
  for (const file of fs.readdirSync('db/migrations').filter((f) => f.endsWith('.sql')).sort()) {
    db.exec(fs.readFileSync('db/migrations/' + file, 'utf8'));
  }
  const adapter = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const query = {
        bind(...values: unknown[]) {
          args = values;
          return query;
        },
        async all() {
          return { results: db.prepare(sql).all(...(args as (string | number | null)[])) };
        },
        async first() {
          return (await query.all()).results[0] ?? null;
        },
        async run() {
          const result = db.prepare(sql).run(...(args as (string | number | null)[]));
          return { meta: { changes: Number(result.changes) } };
        },
      };
      return query;
    },
    batch(queries: { run(): Promise<unknown> }[]) {
      return Promise.all(queries.map((q) => q.run()));
    },
  };
  const env = { DB: adapter, APP_ORIGIN: ORIGIN, ...extra } as unknown as Env;
  function signIn(email: string, name: string, role = 'member'): User {
    db.prepare('INSERT INTO users(email,name,role,google_sub,active) VALUES(?,?,?,?,1)').run(email, name, role, 'sub:' + email);
    return { email, name, role };
  }
  return { db, env, signIn };
}
export function request(path: string, method = 'GET', body?: unknown, origin = ORIGIN): Request {
  return new Request(ORIGIN + path, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
export async function bodyOf<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
/** A fetch that answers from a list of canned replies and remembers what it was asked. */
export function fakeFetch(replies: (url: URL, init?: RequestInit) => Response) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  const doFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    calls.push({ url, init });
    return replies(url, init);
  }) as typeof fetch;
  return { doFetch, calls };
}
