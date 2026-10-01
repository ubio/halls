import type { RoomOption, RoomStatus, Stock, StockRead } from '../lib/types';
import { a3Headers, datasetItemsUrl } from './a3';
import type { Env } from './auth';
import { sampleOptions } from './sample-stock';

/** A3 pages at most 100 items; 60 pages is 6,000 room pages, well past both operators today. */
const PAGE_LIMIT = 100;
const MAX_PAGES = 60;
/** The dataset refreshes daily, so one read serves every visitor for a few minutes. */
const CACHE_MS = 5 * 60_000;

let cached: { at: number; key: string; stock: Stock } | null = null;

const statuses: readonly RoomStatus[] = ['available', 'limited', 'sold_out'];

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isoDate(value: unknown): string | null {
  const v = text(value);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function httpsUrl(value: unknown): string | null {
  const v = text(value);
  if (!v) return null;
  try {
    return new URL(v).protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
}

/**
 * One dataset row, checked field by field. A row missing what identifies it
 * (operator, building, room, a real https link) is dropped rather than shown
 * half-empty; anything optional that is malformed becomes null.
 */
export function parseOption(raw: unknown): RoomOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const operator = text(r.operator);
  const city = text(r.city);
  const building = text(r.building);
  const roomType = text(r.roomType);
  const roomUrl = httpsUrl(r.roomUrl);
  const buildingUrl = httpsUrl(r.buildingUrl) ?? roomUrl;
  const status = statuses.find((s) => s === r.status);
  if (!operator || !city || !building || !roomType || !roomUrl || !buildingUrl || !status) return null;
  const weeks = number(r.weeks);
  const startDate = isoDate(r.startDate);
  return {
    id: text(r.id) ?? [roomUrl, weeks ?? '', startDate ?? ''].join('|'),
    operator,
    city,
    building,
    buildingUrl,
    roomType,
    roomUrl,
    sizeM2: number(r.sizeM2),
    bedType: text(r.bedType),
    bathroom: text(r.bathroom),
    fromPricePerWeek: number(r.fromPricePerWeek),
    currency: text(r.currency) ?? 'GBP',
    academicYear: text(r.academicYear) ?? '',
    status,
    offers: text(r.offers),
    weeks,
    startDate,
    endDate: isoDate(r.endDate),
    pricePerWeek: number(r.pricePerWeek),
    bookingFee: number(r.bookingFee),
    cashback: number(r.cashback),
    scrapedAt: text(r.scrapedAt) ?? '',
  };
}

/**
 * The rows inside one dataset item. The item workflow returns every tenancy
 * option on one room page, as `{ stock: [...] }`; a bare array or a single
 * row is accepted too, so a small change in the workflow's output does not
 * empty the app.
 */
export function optionsFromItem(item: unknown): RoomOption[] {
  return rowsOfItem(item).map(parseOption).filter((o): o is RoomOption => o !== null);
}

function rowsOfItem(item: unknown): unknown[] {
  if (!item || typeof item !== 'object') return [];
  const details = (item as { details?: unknown }).details;
  if (Array.isArray(details)) return details;
  if (details && typeof details === 'object' && Array.isArray((details as { stock?: unknown }).stock)) {
    return (details as { stock: unknown[] }).stock;
  }
  return details ? [details] : [];
}

/** Every room option in the dataset, read page by page with the service-account key. */
export async function readDataset(
  env: Env,
  doFetch: typeof fetch = fetch,
): Promise<{ options: RoomOption[]; read: StockRead }> {
  const read: StockRead = { pages: 0, items: 0, itemsWithDetails: 0, rowsSeen: 0, rowsKept: 0, pageKeys: [], itemKeys: [], detailKeys: [] };
  const base = datasetItemsUrl(env);
  if (!base) return { options: [], read };
  const seen = new Map<string, RoomOption>();
  let cursor: string | null = null;
  let firstId = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(base);
    url.searchParams.set('limit', String(PAGE_LIMIT));
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await doFetch(url, { headers: a3Headers(env) });
    if (!response.ok) throw new Error(`A3 dataset answered ${response.status}`);
    const body = (await response.json()) as { items?: unknown; nextCursor?: unknown };
    read.pages++;
    if (page === 0 && body && typeof body === 'object') read.pageKeys = Object.keys(body).slice(0, 20);
    for (const item of Array.isArray(body.items) ? body.items : []) {
      read.items++;
      if (!firstId) firstId = String((item as { id?: unknown } | null)?.id ?? '');
      if (!read.itemKeys.length && item && typeof item === 'object') read.itemKeys = Object.keys(item).slice(0, 20);
      const details = (item as { details?: unknown } | null)?.details;
      if (details) {
        read.itemsWithDetails++;
        if (!read.detailKeys.length && typeof details === 'object') read.detailKeys = Object.keys(details).slice(0, 20);
      }
      const rows = rowsOfItem(item);
      read.rowsSeen += rows.length;
      for (const option of rows.map(parseOption)) {
        if (!option) continue;
        read.rowsKept++;
        seen.set(option.id, option);
      }
    }
    cursor = typeof body.nextCursor === 'string' && body.nextCursor ? body.nextCursor : null;
    if (!cursor) break;
  }
  if (read.items > 0 && read.itemsWithDetails === 0 && firstId) read.probe = await probeDetails(base, firstId, env, doFetch);
  return { options: [...seen.values()], read };
}

/** Diagnostic: does A3 return an item's details anywhere other than the list? Counts and key names only. */
async function probeDetails(base: string, id: string, env: Env, doFetch: typeof fetch) {
  const keysOf = (body: unknown): string[] => {
    const item = (body as { items?: unknown[] })?.items?.[0] ?? (body as { item?: unknown })?.item ?? body;
    const details = (item as { details?: unknown } | null)?.details;
    return details && typeof details === 'object' ? Object.keys(details).slice(0, 10) : [];
  };
  const one = await doFetch(base + '/' + encodeURIComponent(id), { headers: a3Headers(env) });
  const oneBody = one.ok ? await one.json().catch(() => null) : null;
  const filter = await doFetch(base, {
    method: 'POST',
    headers: a3Headers(env),
    body: JSON.stringify({ where: [{ field: 'item.id', op: 'eq', value: id }], limit: 1 }),
  });
  const filterBody = filter.ok ? await filter.json().catch(() => null) : null;
  return { getStatus: one.status, getDetailKeys: keysOf(oneBody), filterStatus: filter.status, filterDetailKeys: keysOf(filterBody) };
}

/** The stock to show: the A3 dataset when connected, otherwise the fictional sample. */
export async function loadStock(env: Env, doFetch: typeof fetch = fetch, now = Date.now()): Promise<Stock> {
  const key = datasetItemsUrl(env) ?? 'sample';
  if (cached && cached.key === key && now - cached.at < CACHE_MS) return cached.stock;
  const stock: Stock =
    key === 'sample'
      ? { source: 'sample', fetchedAt: new Date(now).toISOString(), options: sampleOptions }
      : { source: 'a3', fetchedAt: new Date(now).toISOString(), ...(await readDataset(env, doFetch)) };
  cached = { at: now, key, stock };
  return stock;
}

/** Tests start from nothing remembered. */
export function forgetStock() {
  cached = null;
}
