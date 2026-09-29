import type { BookingStatus, RoomStatus } from './types';

const money = new Map<string, Intl.NumberFormat>();

/** £184, whole pounds: weekly rents are quoted that way on every operator's site. */
export function formatMoney(value: number | null, currency = 'GBP'): string {
  if (value === null) return '—';
  let format = money.get(currency);
  if (!format) {
    format = new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 });
    money.set(currency, format);
  }
  return format.format(value);
}

/** 26 Sep 2026, from an ISO date, without a timezone shifting the day. */
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const roomStatusLabel: Record<RoomStatus, string> = {
  available: 'Available',
  limited: 'Limited',
  sold_out: 'Sold out',
};

/** The shared status-pill tone for each room state. */
export const roomStatusTone: Record<RoomStatus, string> = {
  available: 'success',
  limited: 'warn',
  sold_out: '',
};

export const bookingStatusLabel: Record<BookingStatus, string> = {
  queued: 'Queued',
  preparing: 'A3 preparing',
  ready: 'Ready to submit',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const bookingStatusTone: Record<BookingStatus, string> = {
  queued: '',
  preparing: 'warn',
  ready: 'success',
  failed: 'bad',
  cancelled: '',
};

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
