import { bookingConnected, stockConnected } from './a3';
import { json, type Env, type User } from './auth';
import { cancelBooking, createBooking, getBooking, listBookings, parseDraft, prepareBooking } from './bookings';
import { loadStock } from './stock';

/** Everything behind sign-in. `routes.ts` has already checked the session and the origin. */
export async function apiRoutes(request: Request, env: Env, user: User, path: string, doFetch: typeof fetch = fetch): Promise<Response> {
  const method = request.method;
  if (path === '/api/me' && method === 'GET') {
    return json({
      user,
      admin: user.role === 'admin',
      oauthConfigured: true,
      mockLogin: false,
      a3: { stock: stockConnected(env), booking: bookingConnected(env) },
    });
  }
  if (path === '/api/stock' && method === 'GET') {
    try {
      return json(await loadStock(env, doFetch));
    } catch (error) {
      console.error('stock read failed', error instanceof Error ? error.message : error);
      return json({ error: 'The A3 dataset could not be read just now. Try again shortly.' }, 502);
    }
  }
  if (path === '/api/bookings' && method === 'GET') {
    return json({ bookings: await listBookings(env) });
  }
  if (path === '/api/bookings' && method === 'POST') {
    const draft = parseDraft(await request.json().catch(() => null));
    if (typeof draft === 'string') return json({ error: draft }, 400);
    const stock = await loadStock(env, doFetch);
    const option = stock.options.find((o) => o.id === draft.optionId);
    if (!option) return json({ error: 'That room is no longer in the stock. Reload and choose again.' }, 409);
    if (option.status === 'sold_out' || option.pricePerWeek === null) {
      return json({ error: 'That room is sold out.' }, 409);
    }
    const booking = await createBooking(env, user, option, draft);
    return json({ booking }, 201);
  }
  const match = /^\/api\/bookings\/([0-9a-f-]{36})(?:\/(prepare|cancel))?$/.exec(path);
  if (match) {
    const booking = await getBooking(env, match[1]);
    if (!booking) return json({ error: 'That booking is not here.' }, 404);
    if (!match[2] && method === 'GET') return json({ booking });
    if (match[2] === 'prepare' && method === 'POST') {
      if (!bookingConnected(env)) return json({ error: 'The A3 booking workflow is not connected yet.' }, 409);
      return json({ booking: await prepareBooking(env, booking, doFetch) });
    }
    if (match[2] === 'cancel' && method === 'POST') {
      const outcome = await cancelBooking(env, user, booking);
      return typeof outcome === 'string' ? json({ error: outcome }, 403) : json({ booking: outcome });
    }
  }
  return json({ error: 'Not found' }, 404);
}
