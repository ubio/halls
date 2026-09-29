import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { apiRoutes } from '../server/api';
import { route } from '../server/routes';
import { forgetStock } from '../server/stock';
import { sampleOptions } from '../server/sample-stock';
import type { Booking } from '../lib/types';
import { bodyOf, fakeFetch, fixture, ORIGIN, request } from './fixture';

const page = () => new Response('page');
const onSale = sampleOptions.find((o) => o.status !== 'sold_out' && o.pricePerWeek !== null)!;
const soldOut = sampleOptions.find((o) => o.status === 'sold_out')!;
const student = { studentName: 'Test Student', studentEmail: 'student@example.com', university: 'Example University', notes: '' };

const a3 = {
  HALLS_A3_TOKEN: 'test-key',
  HALLS_A3_PROJECT: 'ubio/student-accommodation-iq',
  HALLS_A3_BOOKING_WORKFLOW: 'prepare-booking',
};

beforeEach(() => forgetStock());

async function book(env: ReturnType<typeof fixture>['env'], user: { email: string; name: string; role: string }, optionId = onSale.id) {
  const response = await apiRoutes(request('/api/bookings', 'POST', { optionId, ...student }), env, user, '/api/bookings');
  return { response, body: await bodyOf<{ booking: Booking; error?: string }>(response) };
}

test('nothing behind sign-in is reachable signed out', async () => {
  const { env } = fixture();
  const stock = await route(request('/api/stock'), env, page);
  assert.equal(stock.status, 401);
  const me = await bodyOf<{ user: null }>(await route(request('/api/me'), env, page));
  assert.equal(me.user, null);
});

test('a write from another origin is refused before anything else', async () => {
  const { env } = fixture();
  const response = await route(request('/api/bookings', 'POST', { optionId: onSale.id, ...student }, 'https://evil.example'), env, page);
  assert.equal(response.status, 403);
});

test('mock login is refused unless it is exactly localhost with the flag set', async () => {
  const { env } = fixture();
  const response = await route(request('/auth/mock', 'POST'), env, page);
  assert.equal(response.status, 404);
});

test('stock is the labelled sample until an A3 dataset is connected', async () => {
  const { env, signIn } = fixture();
  const user = signIn('member@ub.io', 'Member');
  const body = await bodyOf<{ source: string; options: unknown[] }>(await apiRoutes(request('/api/stock'), env, user, '/api/stock'));
  assert.equal(body.source, 'sample');
  assert.equal(body.options.length, sampleOptions.length);
});

test('me reports which A3 connections exist, never the key', async () => {
  const { env, signIn } = fixture(a3);
  const user = signIn('member@ub.io', 'Member');
  const response = await apiRoutes(request('/api/me'), env, user, '/api/me');
  const text = await response.text();
  assert.ok(!text.includes('test-key'));
  assert.deepEqual(JSON.parse(text).a3, { stock: false, booking: true });
});

test('a booking records the room as offered and starts queued', async () => {
  const { env, signIn } = fixture();
  const user = signIn('member@ub.io', 'Member');
  const { response, body } = await book(env, user);
  assert.equal(response.status, 201);
  assert.equal(body.booking.status, 'queued');
  assert.equal(body.booking.price_per_week, onSale.pricePerWeek);
  assert.equal(body.booking.weeks, onSale.weeks);
  assert.equal(body.booking.created_by, 'member@ub.io');
});

test('a booking needs a real room, a name and an email, and not a sold-out room', async () => {
  const { env, signIn } = fixture();
  const user = signIn('member@ub.io', 'Member');
  const missing = await apiRoutes(request('/api/bookings', 'POST', { optionId: 'nope', ...student }), env, user, '/api/bookings');
  assert.equal(missing.status, 409);
  const noEmail = await apiRoutes(
    request('/api/bookings', 'POST', { ...student, optionId: onSale.id, studentEmail: 'not-an-email' }),
    env,
    user,
    '/api/bookings',
  );
  assert.equal(noEmail.status, 400);
  const { response } = await book(env, user, soldOut.id);
  assert.equal(response.status, 409);
});

test('only the person who asked, or an administrator, can cancel', async () => {
  const { env, signIn } = fixture();
  const owner = signIn('owner@ub.io', 'Owner');
  const other = signIn('other@ub.io', 'Other');
  const admin = signIn('admin@ub.io', 'Admin', 'admin');
  const { body } = await book(env, owner);
  const path = `/api/bookings/${body.booking.id}/cancel`;
  assert.equal((await apiRoutes(request(path, 'POST', {}), env, other, path)).status, 403);
  const cancelled = await bodyOf<{ booking: Booking }>(await apiRoutes(request(path, 'POST', {}), env, admin, path));
  assert.equal(cancelled.booking.status, 'cancelled');
});

test('preparing is refused while no booking workflow is connected', async () => {
  const { env, signIn } = fixture();
  const user = signIn('member@ub.io', 'Member');
  const { body } = await book(env, user);
  const path = `/api/bookings/${body.booking.id}/prepare`;
  assert.equal((await apiRoutes(request(path, 'POST', {}), env, user, path)).status, 409);
});

test('preparing invokes the A3 workflow on the operator site and keeps its output', async () => {
  const { env, signIn } = fixture(a3);
  const user = signIn('member@ub.io', 'Member');
  const { body } = await book(env, user);
  const { doFetch, calls } = fakeFetch(() => Response.json({ reachedStep: 'review', submitted: false }));
  const path = `/api/bookings/${body.booking.id}/prepare`;
  const result = await bodyOf<{ booking: Booking }>(await apiRoutes(request(path, 'POST', {}), env, user, path, doFetch));
  assert.equal(result.booking.status, 'ready');
  assert.match(result.booking.result, /reachedStep/);
  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.equal(call.url.origin, 'https://api.athree.dev');
  assert.equal(call.url.pathname, '/ubio/student-accommodation-iq/prepare-booking');
  assert.equal(call.url.searchParams.get('site'), new URL(onSale.roomUrl).hostname.replace(/^www\./, '').replace(/\./g, '-'));
  assert.equal((call.init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
  const sent = JSON.parse(String(call.init?.body));
  assert.equal(sent.stopBeforeSubmit, true);
  assert.equal(sent.student.email, student.studentEmail);
});

test('an A3 failure is recorded on the booking and it can be tried again', async () => {
  const { env, signIn } = fixture(a3);
  const user = signIn('member@ub.io', 'Member');
  const { body } = await book(env, user);
  const path = `/api/bookings/${body.booking.id}/prepare`;
  const busy = fakeFetch(() => Response.json({ error: 'CONCURRENCY_LIMIT_EXCEEDED' }, { status: 429 }));
  const failed = await bodyOf<{ booking: Booking }>(await apiRoutes(request(path, 'POST', {}), env, user, path, busy.doFetch));
  assert.equal(failed.booking.status, 'failed');
  assert.equal(failed.booking.error, 'CONCURRENCY_LIMIT_EXCEEDED');
  const ok = fakeFetch(() => Response.json({ reachedStep: 'review' }));
  const retried = await bodyOf<{ booking: Booking }>(await apiRoutes(request(path, 'POST', {}), env, user, path, ok.doFetch));
  assert.equal(retried.booking.status, 'ready');
  assert.equal(retried.booking.error, '');
});

test('a cancelled booking is never sent to A3', async () => {
  const { env, signIn } = fixture(a3);
  const user = signIn('member@ub.io', 'Member');
  const { body } = await book(env, user);
  const cancel = `/api/bookings/${body.booking.id}/cancel`;
  await apiRoutes(request(cancel, 'POST', {}), env, user, cancel);
  const { doFetch, calls } = fakeFetch(() => Response.json({}));
  const prepare = `/api/bookings/${body.booking.id}/prepare`;
  const result = await bodyOf<{ booking: Booking }>(await apiRoutes(request(prepare, 'POST', {}), env, user, prepare, doFetch));
  assert.equal(result.booking.status, 'cancelled');
  assert.equal(calls.length, 0);
});

test('the origin constant is the one the fixture serves', () => {
  assert.equal(ORIGIN, 'http://localhost:3007');
});
