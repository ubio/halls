import type { Booking, RoomOption } from '../lib/types';
import { a3Headers, bookingInvokeUrl } from './a3';
import type { Env, User } from './auth';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface BookingDraft {
  optionId: string;
  studentName: string;
  studentEmail: string;
  university: string;
  notes: string;
}

/** The request body, checked; a string describing the first problem otherwise. */
export function parseDraft(body: unknown): BookingDraft | string {
  if (!body || typeof body !== 'object') return 'Send the booking as JSON.';
  const b = body as Record<string, unknown>;
  const field = (key: string, max: number) => (typeof b[key] === 'string' ? (b[key] as string).trim().slice(0, max) : '');
  const draft: BookingDraft = {
    optionId: field('optionId', 600),
    studentName: field('studentName', 120),
    studentEmail: field('studentEmail', 200).toLowerCase(),
    university: field('university', 120),
    notes: field('notes', 1000),
  };
  if (!draft.optionId) return 'Choose a room and length of stay.';
  if (!draft.studentName) return "Enter the student's name.";
  if (!EMAIL.test(draft.studentEmail)) return "Enter the student's email address.";
  return draft;
}

export async function listBookings(env: Env): Promise<Booking[]> {
  const { results } = await env.DB.prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500').all<Booking>();
  return results;
}

export async function getBooking(env: Env, id: string): Promise<Booking | null> {
  return env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first<Booking>();
}

/** Record the request against the room exactly as it is offered now. */
export async function createBooking(env: Env, user: User, option: RoomOption, draft: BookingDraft): Promise<Booking> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO bookings(id,option_id,operator,city,building,room_type,room_url,weeks,start_date,end_date,price_per_week,currency,
      student_name,student_email,university,notes,status,created_by,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'queued',?,?,?)`,
  )
    .bind(
      id,
      option.id,
      option.operator,
      option.city,
      option.building,
      option.roomType,
      option.roomUrl,
      option.weeks,
      option.startDate,
      option.endDate,
      option.pricePerWeek,
      option.currency,
      draft.studentName,
      draft.studentEmail,
      draft.university,
      draft.notes,
      user.email,
      now,
      now,
    )
    .run();
  return (await getBooking(env, id))!;
}

/**
 * Move a booking from one status to another only if nobody else has moved it
 * since it was read: the version check stops two people preparing the same
 * booking twice.
 */
async function transition(env: Env, booking: Booking, status: Booking['status'], extra: { result?: string; error?: string } = {}) {
  const outcome = await env.DB.prepare(
    'UPDATE bookings SET status=?,result=?,error=?,updated_at=?,version=version+1 WHERE id=? AND version=?',
  )
    .bind(status, extra.result ?? booking.result, extra.error ?? '', new Date().toISOString(), booking.id, booking.version)
    .run();
  return (outcome.meta?.changes ?? 0) > 0;
}

/**
 * Ask A3 to fill in the operator's booking form for this student, up to and
 * not including the final submit. A3's invoke call waits for the run to
 * finish (up to five minutes) and returns the workflow's output, which is
 * kept as the booking's result. With no booking workflow connected the
 * booking simply stays queued.
 */
export async function prepareBooking(env: Env, booking: Booking, doFetch: typeof fetch = fetch): Promise<Booking> {
  const url = bookingInvokeUrl(env, booking.room_url);
  if (!url) return booking;
  if (!['queued', 'failed'].includes(booking.status)) return booking;
  if (!(await transition(env, booking, 'preparing'))) return (await getBooking(env, booking.id))!;
  const preparing = (await getBooking(env, booking.id))!;
  const input = {
    roomUrl: booking.room_url,
    roomType: booking.room_type,
    weeks: booking.weeks,
    startDate: booking.start_date,
    endDate: booking.end_date,
    student: { name: booking.student_name, email: booking.student_email, university: booking.university },
    // The workflow must stop before anything is submitted; said again in every call.
    stopBeforeSubmit: true,
  };
  try {
    const response = await doFetch(url, { method: 'POST', headers: a3Headers(env), body: JSON.stringify(input) });
    const text = await response.text();
    if (!response.ok) {
      const code = /"(CONCURRENCY_LIMIT_EXCEEDED|WORKFLOW_INVOKE_FAILED|WORKFLOW_INVOKE_TIMEOUT)"/.exec(text)?.[1];
      await transition(env, preparing, 'failed', { error: code ?? `A3 answered ${response.status}` });
    } else {
      await transition(env, preparing, 'ready', { result: text.slice(0, 20_000) });
    }
  } catch (error) {
    await transition(env, preparing, 'failed', { error: error instanceof Error ? error.message : 'A3 could not be reached' });
  }
  return (await getBooking(env, booking.id))!;
}

/** The person who asked for it, or an administrator, can cancel a booking that is not mid-run. */
export async function cancelBooking(env: Env, user: User, booking: Booking): Promise<Booking | string> {
  if (booking.created_by !== user.email && user.role !== 'admin') return 'Only the person who made this booking can cancel it.';
  if (booking.status === 'preparing') return 'Wait for A3 to finish before cancelling.';
  if (booking.status === 'cancelled') return booking;
  if (!(await transition(env, booking, 'cancelled'))) return 'Somebody else changed this booking. Reload and try again.';
  return (await getBooking(env, booking.id))!;
}
