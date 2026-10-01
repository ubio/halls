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
  /** Richer detail from the room and building pages; null when A3 found none. */
  details: OptionDetails | null;
}

/** Every part is optional: a site that lacks one leaves it null. */
export interface OptionDetails {
  room: RoomDetails | null;
  building: BuildingDetails | null;
  tenancy: TenancyDetails | null;
  offer: OfferDetails | null;
}

export interface Media {
  url: string;
  caption: string | null;
}

export interface RoomDetails {
  description: string | null;
  images: Media[];
  floorPlanUrl: string | null;
  virtualTourUrl: string | null;
  features: string[];
  floorLevels: string[];
  view: string | null;
  accessible: boolean | null;
  flatSize: string | null;
  kitchen: string | null;
  roomsLeft: number | null;
}

export interface NearbyUniversity {
  name: string;
  distance: string | null;
  walkMinutes: number | null;
  cycleMinutes: number | null;
  transitMinutes: number | null;
}

export interface BuildingDetails {
  description: string | null;
  images: Media[];
  address: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  billsIncluded: string[];
  receptionHours: string | null;
  nearbyUniversities: NearbyUniversity[];
  nearbyTransport: string[];
  rating: number | null;
  reviewCount: number | null;
}

export interface PaymentPlan {
  label: string;
  instalments: number | null;
  amountPerInstalment: number | null;
}

export interface TenancyDetails {
  contractType: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  depositAmount: number | null;
  reservationFee: number | null;
  paymentPlans: PaymentPlan[];
  guarantorRequired: boolean | null;
  guarantorScheme: string | null;
  cancellationPolicy: string | null;
  eligibility: string | null;
  bookingUrl: string | null;
}

export interface OfferDetails {
  title: string | null;
  amount: number | null;
  terms: string | null;
  expiresAt: string | null;
  code: string | null;
}

export type RoomStatus = 'available' | 'limited' | 'sold_out';

export interface Stock {
  /** 'a3' when read from the dataset; 'sample' is fictional and says so on screen. */
  source: 'a3' | 'sample';
  fetchedAt: string;
  options: RoomOption[];
  /** How the last A3 read went, in counts only: enough to see where rows were lost. */
  read?: StockRead;
}

export interface StockRead {
  pages: number;
  items: number;
  itemsWithDetails: number;
  rowsSeen: number;
  rowsKept: number;
  /** Top-level keys of the first page and of the first item's details, to spot a changed shape. */
  pageKeys: string[];
  itemKeys: string[];
  detailKeys: string[];
  /** When the list carries no details: what the single-item and filter endpoints return for one item. */
  probe?: { getStatus: number; getDetailKeys: string[]; filterStatus: number; filterDetailKeys: string[] };
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
