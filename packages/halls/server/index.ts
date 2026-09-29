import handler from 'vinext/server/fetch-handler';
import type { Env } from './auth';
import { route } from './routes';
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const response = await route(request, env, () => handler.fetch(request, env, ctx));
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (new URL(request.url).protocol === 'https:') {
      headers.set('Strict-Transport-Security', 'max-age=31536000');
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
} satisfies ExportedHandler<Env>;
