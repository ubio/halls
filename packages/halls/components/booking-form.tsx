'use client';
import { useState } from 'react';
import { Button } from '@oss-os/ui/components/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@oss-os/ui/components/dialog';
import { Input } from '@oss-os/ui/components/input';
import { Textarea } from '@oss-os/ui/components/textarea';
import { post } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import type { RoomOption } from '@/lib/types';

interface Props {
  option: RoomOption;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Ask for a booking. It is recorded against the room exactly as offered now;
 * A3 then fills in the operator's own booking form, and stops before submit.
 */
export function BookingForm({ option, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState({ studentName: '', studentEmail: '', university: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const set = (field: keyof typeof draft) => (e: { target: { value: string } }) => setDraft({ ...draft, [field]: e.target.value });

  async function save(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await post('/api/bookings', { optionId: option.id, ...draft });
      onSaved();
    } catch (err) {
      setMessage((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="halls-dialog">
        <DialogHeader>
          <DialogTitle>Book {option.roomType}</DialogTitle>
          <DialogDescription>
            {option.building}, {option.city} · {option.weeks} weeks from {formatDate(option.startDate)} ·{' '}
            {formatMoney(option.pricePerWeek, option.currency)}/wk
          </DialogDescription>
        </DialogHeader>
        <form className="form-grid" onSubmit={save}>
          <label className="field field-full">
            <span id="booking-name-label">Student's full name</span>
            <Input required maxLength={120} autoComplete="off" value={draft.studentName} aria-labelledby="booking-name-label" onChange={set('studentName')} />
          </label>
          <label className="field">
            <span id="booking-email-label">Student's email</span>
            <Input required type="email" maxLength={200} autoComplete="off" value={draft.studentEmail} aria-labelledby="booking-email-label" onChange={set('studentEmail')} />
          </label>
          <label className="field">
            <span id="booking-university-label">University</span>
            <Input maxLength={120} value={draft.university} aria-labelledby="booking-university-label" onChange={set('university')} />
          </label>
          <label className="field field-full">
            <span id="booking-notes-label">Notes for the booking</span>
            <Textarea maxLength={1000} value={draft.notes} aria-labelledby="booking-notes-label" onChange={set('notes')} placeholder="Floor preference, accessibility needs, a friend to live near" />
          </label>
          <p className="muted field-full booking-note">
            A3 fills in {option.operator}'s booking form with these details and stops before submitting. Nothing is
            booked or paid until the student confirms.
          </p>
          {message && (
            <p className="error field-full" role="alert">
              {message}
            </p>
          )}
          <div className="form-actions field-full">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Request booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
