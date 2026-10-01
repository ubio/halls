import type { BuildingDetails, Media, NearbyUniversity, OfferDetails, OptionDetails, PaymentPlan, RoomDetails, TenancyDetails } from '../lib/types';

/**
 * The optional detail groups A3 reads from room and building pages. Each is
 * checked as strictly as the core fields: links must be https, lists are
 * capped, and anything of the wrong type is dropped rather than shown. A
 * group with nothing usable in it becomes null, so the UI can simply ask
 * whether it exists.
 */

const MAX_LIST = 40;
const MAX_TEXT = 4000;

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  return null;
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function https(value: unknown): string | null {
  const v = text(value, 2000);
  if (!v) return null;
  try {
    return new URL(v).protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
}

function list<T>(value: unknown, each: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    const parsed = each(item);
    if (parsed !== null) out.push(parsed);
    if (out.length >= MAX_LIST) break;
  }
  return out;
}

/** A list of labels, from strings or from objects with a name, label or title. */
function labels(value: unknown): string[] {
  return list(value, (item) => {
    const o = obj(item);
    return text(o ? (o.name ?? o.label ?? o.title ?? o.type) : item, 120);
  });
}

function media(value: unknown): Media[] {
  return list(value, (item) => {
    const o = obj(item);
    const url = https(o ? (o.url ?? o.src) : item);
    return url ? { url, caption: o ? text(o.caption ?? o.alt ?? o.title, 200) : null } : null;
  });
}

/** Kitchen, bathroom and similar fields arrive as text or as { type, features }. */
function summary(value: unknown): string | null {
  const o = obj(value);
  if (!o) return text(value, 300);
  const parts = [text(o.type, 80), text(o.size, 80), ...labels(o.features)].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function emptyToNull<T extends object>(group: T): T | null {
  const used = Object.values(group).some((v) => (Array.isArray(v) ? v.length > 0 : v !== null));
  return used ? group : null;
}

export function parseRoom(value: unknown): RoomDetails | null {
  const r = obj(value);
  if (!r) return null;
  return emptyToNull({
    description: text(r.description),
    images: media(r.images),
    floorPlanUrl: https(r.floorPlanUrl),
    virtualTourUrl: https(r.virtualTourUrl),
    features: labels(r.features),
    floorLevels: labels(r.floorLevels),
    view: text(r.view, 200),
    accessible: bool(r.accessible),
    flatSize: text(r.flatSize, 120),
    kitchen: summary(r.kitchen),
    roomsLeft: num(r.roomsLeft),
  });
}

function university(item: unknown): NearbyUniversity | null {
  const o = obj(item);
  const name = text(o ? o.name : item, 160);
  if (!name) return null;
  return {
    name,
    distance: o ? text(o.distance, 60) : null,
    walkMinutes: o ? num(o.walkMinutes) : null,
    cycleMinutes: o ? num(o.cycleMinutes) : null,
    transitMinutes: o ? num(o.transitMinutes) : null,
  };
}

export function parseBuilding(value: unknown): BuildingDetails | null {
  const b = obj(value);
  if (!b) return null;
  const lat = num(b.latitude);
  const lng = num(b.longitude);
  const onMap = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return emptyToNull({
    description: text(b.description),
    images: media(b.images),
    address: text(b.address, 300),
    postcode: text(b.postcode, 12),
    latitude: onMap ? lat : null,
    longitude: onMap ? lng : null,
    amenities: labels(b.amenities),
    billsIncluded: labels(b.billsIncluded),
    receptionHours: text(b.receptionHours ?? b.security, 200),
    nearbyUniversities: list(b.nearbyUniversities, university),
    nearbyTransport: labels(b.nearbyTransport),
    rating: num(b.rating),
    reviewCount: num(b.reviewCount),
  });
}

function plan(item: unknown): PaymentPlan | null {
  const o = obj(item);
  if (!o) {
    const label = text(item, 160);
    return label ? { label, instalments: null, amountPerInstalment: null } : null;
  }
  const instalments = num(o.instalments);
  const label = text(o.schedule ?? o.label ?? o.name, 160) ?? (instalments ? `${instalments} instalments` : null);
  return label ? { label, instalments, amountPerInstalment: num(o.amountPerInstalment) } : null;
}

export function parseTenancy(value: unknown): TenancyDetails | null {
  const t = obj(value);
  if (!t) return null;
  return emptyToNull({
    contractType: text(t.contractType, 120),
    moveInDate: text(t.moveInDate, 40),
    moveOutDate: text(t.moveOutDate, 40),
    depositAmount: num(t.depositAmount),
    reservationFee: num(t.reservationFee),
    paymentPlans: list(t.paymentPlans, plan),
    guarantorRequired: bool(t.guarantorRequired),
    guarantorScheme: text(t.guarantorScheme, 200),
    cancellationPolicy: text(t.cancellationPolicy, 1000),
    eligibility: text(t.eligibility, 200),
    bookingUrl: https(t.bookingUrl),
  });
}

export function parseOffer(value: unknown): OfferDetails | null {
  const o = obj(value);
  if (!o) return null;
  return emptyToNull({
    title: text(o.title, 200),
    amount: num(o.amount),
    terms: text(o.terms, 1000),
    expiresAt: text(o.expiresAt, 40),
    code: text(o.code, 60),
  });
}

/**
 * All four groups from one dataset row. A3 may name a group plainly
 * (`room`) or with a suffix (`roomDetails`); `building` is also the
 * building's name in the core fields, so an object there is the details
 * group and a string is the name.
 */
export function parseDetails(row: Record<string, unknown>): OptionDetails | null {
  const pick = (plain: string) => row[plain + 'Details'] ?? (obj(row[plain]) ? row[plain] : undefined);
  const details: OptionDetails = {
    room: parseRoom(pick('room')),
    building: parseBuilding(pick('building')),
    tenancy: parseTenancy(pick('tenancy')),
    offer: parseOffer(pick('offer')),
  };
  return emptyToNull(details);
}

/** The building's name when `building` carries the details group instead of the name. */
export function buildingName(row: Record<string, unknown>): string | null {
  const b = obj(row.building);
  return b ? text(b.name ?? b.title, 160) : null;
}
