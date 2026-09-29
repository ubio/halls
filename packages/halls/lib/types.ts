/**
 * One way to rent one room type: a building's room type, for one length of
 * stay. It is the A3 `RoomStockOption` schema exactly, plus a stable `id`, so
 * the dataset's rows can be shown without translation.
 */
export interface RoomOption {
  id: string;
  operator: string;
  city: string;
  building: string;
  buildingUrl: string;
  roomType: string;
  roomUrl: string;
  sizeM2: number | null;
  bedType: string | null;
  bathroom: string | null;
  fromPricePerWeek: number | null;
  currency: string;
  academicYear: string;
  status: RoomStatus;
  offers: string | null;
  weeks: number | null;
  startDate: string | null;
  endDate: string | null;
  pricePerWeek: number | null;
  bookingFee: number | null;
  cashback: number | null;
  scrapedAt: string;
}

export type RoomStatus = 'available' | 'limited' | 'sold_out';

export interface Stock {
  /** 'a3' when read from the dataset; 'sample' is fictional and says so on screen. */
  source: 'a3' | 'sample';
  fetchedAt: string;
  options: RoomOption[];
}

export type BookingStatus = 'queued' | 'preparing' | 'ready' | 'failed' | 'cancelled';

export interface Booking {
  id: string;
  option_id: string;
  operator: string;
  city: string;
  building: string;
  room_type: string;
  room_url: string;
  weeks: number | null;
  start_date: string | null;
  end_date: string | null;
  price_per_week: number | null;
  currency: string;
  student_name: string;
  student_email: string;
  university: string;
  notes: string;
  status: BookingStatus;
  /** What the booking workflow reported, as JSON text; empty until it has run. */
  result: string;
  error: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Me {
  user: { email: string; name: string; role: string } | null;
  admin: boolean;
  oauthConfigured: boolean;
  mockLogin: boolean;
  /** Which A3 connections are configured; never their values. */
  a3?: { stock: boolean; booking: boolean };
}
