import { currentUser, json, logout, mockAllowed, mockLogin, oauthCallback, oauthConfigured, oauthStart, type Env } from './auth';
import { apiRoutes } from './api';

/**
 * Everything the Worker answers itself; `page` draws the app for any other
 * address. Kept apart from the Worker entry so tests can reach the sign-in
 * and origin rules without the framework.
 */
export async function route(
  request: Request,
  env: Env,
  page: () => Promise<Response> | Response,
  doFetch: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === '/health') return json({ ok: true, app: 'UBIO Halls' });
  if (path === '/auth/google') return oauthStart(env);
  if (path === '/auth/mock') return mockLogin(request, env);
  if (path === '/auth/callback') {
    const result = await oauthCallback(request, env);
    if (result.status < 400) return result;
    const problem = (await result.json()) as { error: string };
    return new Response(null, {
      status: 303,
      headers: {
        Location: env.APP_ORIGIN + '/?auth_error=' + encodeURIComponent(problem.error),
        'Cache-Control': 'no-store',
      },
    });
  }
  if (!path.startsWith('/api/')) return page();
  const reading = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (!reading && request.headers.get('Origin') !== url.origin) {
    return json({ error: 'Request origin rejected' }, 403);
  }
  const user = await currentUser(request, env);
  if (path === '/api/me' && !user) {
    return json({ user: null, admin: false, oauthConfigured: oauthConfigured(env), mockLogin: mockAllowed(request, env) });
  }
  if (!user) return json({ error: 'Sign in to continue' }, 401);
  if (path === '/api/logout' && request.method === 'POST') return logout(request, env);
  return apiRoutes(request, env, user, path, doFetch);
}
