import type { RoomOption, RoomStatus } from '../lib/types';

/**
 * Fictional stock, shown until an A3 dataset is connected and labelled as a
 * sample on screen. Operators, buildings and prices are invented; the shape
 * is exactly what the dataset returns, so every screen can be built and
 * tested without A3.
 */
interface SampleRoom {
  roomType: string;
  sizeM2: number;
  bedType: string;
  bathroom: string;
  price: number;
  status: RoomStatus;
  cashback?: number;
  offers?: string;
}

interface SampleBuilding {
  operator: string;
  host: string;
  city: string;
  building: string;
  bookingFee: number | null;
  rooms: SampleRoom[];
}

const tenancies = [
  { weeks: 51, startDate: '2026-09-12', endDate: '2027-09-04', uplift: 0 },
  { weeks: 44, startDate: '2026-09-19', endDate: '2027-07-24', uplift: 6 },
  { weeks: 14, startDate: '2026-09-19', endDate: '2026-12-26', uplift: 19 },
];

const buildings: SampleBuilding[] = [
  {
    operator: 'Example Living',
    host: 'example-living.example.com',
    city: 'Leeds',
    building: 'Millgate House',
    bookingFee: 150,
    rooms: [
      { roomType: 'Classic En Suite', sizeM2: 13, bedType: 'Small double bed', bathroom: 'Private bathroom', price: 179, status: 'limited', cashback: 250, offers: '£250 cashback' },
      { roomType: 'Premium En Suite', sizeM2: 16, bedType: 'Double bed', bathroom: 'Private bathroom', price: 199, status: 'available' },
      { roomType: 'Studio', sizeM2: 21, bedType: 'Double bed', bathroom: 'Private bathroom', price: 265, status: 'sold_out' },
    ],
  },
  {
    operator: 'Example Living',
    host: 'example-living.example.com',
    city: 'Manchester',
    building: 'Canal Wharf',
    bookingFee: 150,
    rooms: [
      { roomType: 'Classic En Suite', sizeM2: 14, bedType: 'Small double bed', bathroom: 'Private bathroom', price: 189, status: 'available' },
      { roomType: 'Deluxe Studio', sizeM2: 24, bedType: 'Double bed', bathroom: 'Private bathroom', price: 289, status: 'limited', cashback: 300, offers: '£300 cashback' },
    ],
  },
  {
    operator: 'Sample Student Homes',
    host: 'sample-student-homes.example.com',
    city: 'Leeds',
    building: 'Northern Quarter Point',
    bookingFee: null,
    rooms: [
      { roomType: 'Ensuite', sizeM2: 12, bedType: 'Three-quarter bed', bathroom: 'En suite', price: 162, status: 'available', offers: 'Free laundry for 26/27' },
      { roomType: 'Studio', sizeM2: 19, bedType: 'Double bed', bathroom: 'En suite', price: 238, status: 'limited' },
    ],
  },
  {
    operator: 'Sample Student Homes',
    host: 'sample-student-homes.example.com',
    city: 'Edinburgh',
    building: 'Grove Court',
    bookingFee: null,
    rooms: [
      { roomType: 'Ensuite', sizeM2: 13, bedType: 'Small double bed', bathroom: 'En suite', price: 214, status: 'limited' },
      { roomType: 'Accessible Studio', sizeM2: 26, bedType: 'Double bed', bathroom: 'Accessible bathroom', price: 305, status: 'available' },
    ],
  },
];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const sampleOptions: RoomOption[] = buildings.flatMap((b) => {
  const buildingUrl = `https://${b.host}/${slug(b.city)}/${slug(b.building)}`;
  return b.rooms.flatMap((room): RoomOption[] => {
    const roomUrl = `${buildingUrl}/${slug(room.roomType)}`;
    const base = {
      operator: b.operator,
      city: b.city,
      building: b.building,
      buildingUrl,
      roomType: room.roomType,
      roomUrl,
      sizeM2: room.sizeM2,
      bedType: room.bedType,
      bathroom: room.bathroom,
      fromPricePerWeek: room.price,
      currency: 'GBP',
      academicYear: '2026-27',
      status: room.status,
      offers: room.offers ?? null,
      scrapedAt: '2026-09-29T07:00:00.000Z',
    };
    if (room.status === 'sold_out') {
      return [{ ...base, id: roomUrl + '||', weeks: null, startDate: null, endDate: null, pricePerWeek: null, bookingFee: null, cashback: null }];
    }
    return tenancies.map((t) => ({
      ...base,
      id: [roomUrl, t.weeks, t.startDate].join('|'),
      weeks: t.weeks,
      startDate: t.startDate,
      endDate: t.endDate,
      pricePerWeek: room.price + t.uplift,
      bookingFee: b.bookingFee,
      // Cashback applies only to long stays, as the operators' own terms say.
      cashback: room.cashback && t.weeks >= 36 ? room.cashback : null,
    }));
  });
});
