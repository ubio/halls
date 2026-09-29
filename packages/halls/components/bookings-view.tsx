'use client';
import { useState } from 'react';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import { Button } from '@oss-os/ui/components/button';
import { post } from '@/lib/api';
import { bookingStatusLabel, bookingStatusTone, formatDate, formatMoney, formatWhen } from '@/lib/format';
import { goTo } from '@/lib/navigation';
import type { Booking, Me } from '@/lib/types';

interface Props {
  me: Me;
  bookings: Booking[] | null;
  onChanged: () => void;
}

export function BookingsView({ me, bookings, onChanged }: Props) {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const connected = Boolean(me.a3?.booking);

  async function act(booking: Booking, action: 'prepare' | 'cancel') {
    setBusy(booking.id + action);
    setMessage('');
    try {
      await post(`/api/bookings/${booking.id}/${action}`, {});
    } catch (err) {
      setMessage((err as Error).message);
    }
    setBusy('');
    onChanged();
  }

  if (!bookings) return <p className="muted">Loading bookings…</p>;
  const open = bookings.filter((b) => b.status !== 'cancelled');
  const ready = bookings.filter((b) => b.status === 'ready').length;
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">STUDENT ACCOMMODATION</p>
          <h1>Bookings</h1>
          <p>
            {open.length} open · {ready} ready to submit
          </p>
        </div>
      </div>
      {!connected && (
        <p className="notice">
          The A3 booking workflow is not connected yet, so bookings stay queued. When it is, A3 fills in the operator's
          booking form and stops before submitting. Halls never submits or pays for a booking itself.
        </p>
      )}
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>No bookings yet. Choose a room and a length of stay to request one.</p>
          <Button variant="outline" size="sm" onClick={() => goTo('/rooms')}>
            Browse rooms
          </Button>
        </div>
      ) : (
        <div className="record-table">
          <table className="halls-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Room</th>
                <th>Stay</th>
                <th className="num">Rent</th>
                <th>Status</th>
                <th>Requested</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const mine = b.created_by === me.user?.email || me.admin;
                const canPrepare = connected && (b.status === 'queued' || b.status === 'failed');
                const canCancel = mine && b.status !== 'cancelled' && b.status !== 'preparing';
                return (
                  <tr key={b.id}>
                    <td>
                      <strong className="cell-main">{b.student_name}</strong>
                      <small>{b.student_email}</small>
                    </td>
                    <td>
                      <a className="cell-link" href={b.room_url} target="_blank" rel="noopener noreferrer">
                        {b.room_type} <ArrowUpRight size={12} />
                      </a>
                      <small>
                        {b.building}, {b.city} · {b.operator}
                      </small>
                    </td>
                    <td>
                      <strong className="cell-main">{b.weeks} weeks</strong>
                      <small>
                        {formatDate(b.start_date)} – {formatDate(b.end_date)}
                      </small>
                    </td>
                    <td className="num">{formatMoney(b.price_per_week, b.currency)}/wk</td>
                    <td>
                      <span className={'status-pill ' + bookingStatusTone[b.status]}>{bookingStatusLabel[b.status]}</span>
                      {b.error && <small className="error-text">{b.error}</small>}
                    </td>
                    <td>
                      <span className="cell-main">{formatWhen(b.created_at)}</span>
                      <small>{b.created_by}</small>
                    </td>
                    <td className="row-actions">
                      {canPrepare && (
                        <Button size="sm" disabled={Boolean(busy)} onClick={() => act(b, 'prepare')}>
                          {busy === b.id + 'prepare' ? <LoaderCircle className="animate-spin" size={14} /> : null}
                          Prepare with A3
                        </Button>
                      )}
                      {canCancel && (
                        <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => act(b, 'cancel')}>
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
