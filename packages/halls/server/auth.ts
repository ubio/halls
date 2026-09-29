import { base64url } from 'jose';
import {
  createPKCE,
  digest,
  googleAuthorizationURL,
  exchangeGoogleCode,
  verifyGoogleIdentityToken,
} from '@oss-os/auth';
import { allowedDomains, type GoogleIdentity, type WorkspaceUser } from '@oss-os/users';
import { D1UserDirectory } from '@oss-os/users/database';
export type User = WorkspaceUser;
export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  APP_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DEV_MOCK_LOGIN?: string;
  /** The A3 service-account key. Never sent to the browser. */
  HALLS_A3_TOKEN?: string;
  /** `org/project` in A3, e.g. `ubio/student-accommodation-iq`. */
  HALLS_A3_PROJECT?: string;
  /** The dataset Halls reads rooms from; empty shows the sample stock. */
  HALLS_A3_DATASET?: string;
  /** The workflow that prepares a booking; empty leaves bookings queued. */
  HALLS_A3_BOOKING_WORKFLOW?: string;
  /** Comma-separated addresses that administer Halls. */
  HALLS_ADMINS?: string;
}
/**
 * Who administers Halls: they can cancel anybody's booking. Everyone else at
 * UBIO can browse rooms, prepare bookings and cancel their own. The list is
 * the HALLS_ADMINS setting (comma-separated addresses), kept out of the
 * source because this repository is public.
 */
export function adminEmails(env: Env): string[] {
  return (env.HALLS_ADMINS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
const WEEK_MS = 7 * 86_400_000;
/**
 * `__Host-` binds the cookie to this origin and requires Secure, which a
 * browser refuses over plain http. Localhost development drops the prefix and
 * the flag together, exactly as Beacon and Tide do; production keeps both.
 */
function secure(env: Env): boolean {
  return Boolean(env.APP_ORIGIN?.startsWith('https:'));
}
export function cookieName(env: Env, purpose: 'session' | 'oauth'): string {
  return (secure(env) ? '__Host-' : '') + 'halls_' + purpose;
}
export function cookie(env: Env, purpose: 'session' | 'oauth', value: string, maxAge: number): string {
  const flags = secure(env) ? '; Secure' : '';
  return `${cookieName(env, purpose)}=${value}; HttpOnly${flags}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}
export function readCookie(request: Request, name: string): string | undefined {
  const pattern = new RegExp('(?:^|; )' + name.replace(/[-_]/g, '\\$&') + '=([^;]+)');
  return request.headers.get('Cookie')?.match(pattern)?.[1];
}
/**
 * Local sign-in without Google, on the exact terms Beacon allows it: only
 * when the variable is set, only over plain http on localhost, and only when
 * the configured origin is that same localhost.
 */
export function mockAllowed(request: Request, env: Env): boolean {
  if (env.DEV_MOCK_LOGIN !== 'true') return false;
  const url = new URL(request.url);
  const local = url.hostname === 'localhost' && url.protocol === 'http:';
  return local && env.APP_ORIGIN === url.origin;
}
export function oauthConfigured(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.APP_ORIGIN);
}
export async function currentUser(request: Request, env: Env): Promise<User | null> {
  const token = readCookie(request, cookieName(env, 'session'));
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT u.email,u.name,u.role FROM sessions s JOIN users u ON u.email=s.email WHERE s.id=? AND s.expires>? AND u.active=1',
  )
    .bind(await digest(token), Date.now())
    .first<WorkspaceUser>();
  if (!row) return null;
  if (!allowedDomains.includes(row.email.split('@')[1])) return null;
  return row;
}
async function startSession(env: Env, email: string): Promise<Response> {
  const token = base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),
    env.DB.prepare('INSERT INTO sessions(id,email,expires) VALUES(?,?,?)').bind(
      await digest(token),
      email,
      Date.now() + WEEK_MS,
    ),
  ]);
  const headers = new Headers({
    Location: env.APP_ORIGIN + '/',
    'Cache-Control': 'no-store',
  });
  headers.append('Set-Cookie', cookie(env, 'session', token, 604_800));
  headers.append('Set-Cookie', cookie(env, 'oauth', '', 0));
  return new Response(null, { status: 302, headers });
}
/** Anybody with a verified UBIO Workspace account is in, as in Orbit. */
export async function admit(env: Env, identity: GoogleIdentity): Promise<void> {
  const role = adminEmails(env).includes(identity.email.toLowerCase()) ? 'admin' : 'member';
  await new D1UserDirectory(env.DB).registerVerifiedIdentity(identity, role);
}
export async function mockLogin(request: Request, env: Env): Promise<Response> {
  if (!mockAllowed(request, env)) return new Response('Not found', { status: 404 });
  const url = new URL(request.url);
  const sameOrigin = request.headers.get('Origin') === url.origin;
  if (request.method !== 'POST' || !sameOrigin) return new Response('Forbidden', { status: 403 });
  const developer: GoogleIdentity = {
    sub: 'localhost-mock:developer@ub.io',
    email: 'developer@ub.io',
    name: 'Local developer',
    hd: 'ub.io',
  };
  // The local developer administers, so every screen is reachable.
  await new D1UserDirectory(env.DB).registerVerifiedIdentity(developer, 'admin');
  return startSession(env, developer.email);
}
export async function oauthStart(env: Env): Promise<Response> {
  if (!oauthConfigured(env)) {
    return json({ error: 'Google sign-in is awaiting OAuth client configuration.' }, 503);
  }
  const state = crypto.randomUUID();
  const { verifier, challenge } = await createPKCE();
  const nonce = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM oauth_states WHERE expires<?').bind(Date.now()),
    env.DB.prepare('INSERT INTO oauth_states(id,verifier,nonce,expires) VALUES(?,?,?,?)').bind(
      await digest(state),
      verifier,
      nonce,
      Date.now() + 600_000,
    ),
  ]);
  const target = googleAuthorizationURL({
    clientId: env.GOOGLE_CLIENT_ID!,
    redirectUri: env.APP_ORIGIN + '/auth/callback',
    state,
    nonce,
    challenge,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie(env, 'oauth', state, 600),
    },
  });
}
export async function oauthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const pendingState = readCookie(request, cookieName(env, 'oauth'));
  if (!state || !pendingState || state !== pendingState) {
    return json({ error: 'Sign-in expired. Please start again.' }, 400);
  }
  const pending = await env.DB.prepare('DELETE FROM oauth_states WHERE id=? AND expires>? RETURNING verifier,nonce')
    .bind(await digest(state), Date.now())
    .first<{ verifier: string; nonce: string }>();
  const code = url.searchParams.get('code');
  if (!pending || !code) {
    return json({ error: 'Sign-in expired or cancelled. Please start again.' }, 400);
  }
  let identity: GoogleIdentity;
  try {
    const tokens = await exchangeGoogleCode({
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      code,
      redirectUri: env.APP_ORIGIN + '/auth/callback',
      verifier: pending.verifier,
    });
    identity = await verifyGoogleIdentityToken(tokens.id_token, env.GOOGLE_CLIENT_ID!, pending.nonce);
  } catch {
    return json({ error: 'Sign-in failed. Use a verified ub.io or ubio.ai Google Workspace account.' }, 403);
  }
  try {
    await admit(env, identity);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Account access denied.' }, 403);
  }
  return startSession(env, identity.email);
}
export async function logout(request: Request, env: Env): Promise<Response> {
  const token = readCookie(request, cookieName(env, 'session'));
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(await digest(token)).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(env, 'session', '', 0) });
}
