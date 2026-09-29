import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { datasetItemsUrl, stockConnected } from '../server/a3';
import type { Env } from '../server/auth';
import { forgetStock, loadStock, optionsFromItem, parseOption, readDataset } from '../server/stock';
import { fakeFetch } from './fixture';

const row = {
  operator: 'Example Living',
  city: 'Leeds',
  building: 'Millgate House',
  buildingUrl: 'https://example-living.example.com/leeds/millgate-house',
  roomType: 'Classic En Suite',
  roomUrl: 'https://example-living.example.com/leeds/millgate-house/classic-en-suite',
  sizeM2: 13,
  bedType: 'Small double bed',
  bathroom: 'Private bathroom',
  fromPricePerWeek: 179,
  currency: 'GBP',
  academicYear: '2026-27',
  status: 'limited',
  offers: '£250 cashback',
  weeks: 51,
  startDate: '2026-09-12',
  endDate: '2027-09-04',
  pricePerWeek: 179,
  bookingFee: 150,
  cashback: 250,
  scrapedAt: '2026-09-29T07:00:00.000Z',
};

const connected = {
  HALLS_A3_TOKEN: 'test-key',
  HALLS_A3_PROJECT: 'ubio/student-accommodation-iq',
  HALLS_A3_DATASET: 'uk-student-rooms',
} as unknown as Env;

beforeEach(() => forgetStock());

test('a well-formed row is kept, with a stable id from its room, stay and start', () => {
  const option = parseOption(row)!;
  assert.equal(option.id, `${row.roomUrl}|51|2026-09-12`);
  assert.equal(option.pricePerWeek, 179);
});

test('a row without what identifies it, or with a non-https link, is dropped', () => {
  assert.equal(parseOption({ ...row, building: '' }), null);
  assert.equal(parseOption({ ...row, roomUrl: 'http://example.com/room' }), null);
  assert.equal(parseOption({ ...row, roomUrl: 'javascript:alert(1)' }), null);
  assert.equal(parseOption({ ...row, status: 'maybe' }), null);
});

test('malformed optional fields become null rather than wrong', () => {
  const option = parseOption({ ...row, startDate: '12/09/2026', pricePerWeek: '179', cashback: Number.NaN })!;
  assert.equal(option.startDate, null);
  assert.equal(option.pricePerWeek, null);
  assert.equal(option.cashback, null);
});

test('an item may carry its rows as { stock }, a bare array or one row', () => {
  assert.equal(optionsFromItem({ details: { stock: [row, row] } }).length, 2);
  assert.equal(optionsFromItem({ details: [row] }).length, 1);
  assert.equal(optionsFromItem({ details: row }).length, 1);
  assert.equal(optionsFromItem({ details: null }).length, 0);
});

test('the dataset is read page by page and repeated rows are counted once', async () => {
  const second = { ...row, weeks: 44, startDate: '2026-09-19' };
  const { doFetch, calls } = fakeFetch((url) =>
    url.searchParams.get('cursor')
      ? Response.json({ items: [{ details: { stock: [second, row] } }] })
      : Response.json({ items: [{ details: { stock: [row] } }], nextCursor: 'page-2' }),
  );
  const options = await readDataset(connected, doFetch);
  assert.equal(options.length, 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.toString().split('?')[0], 'https://api.athree.dev/ubio/student-accommodation-iq/datasets/uk-student-rooms/items');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
});

test('a failing dataset read is an error, not an empty stock', async () => {
  const { doFetch } = fakeFetch(() => new Response('nope', { status: 500 }));
  await assert.rejects(() => readDataset(connected, doFetch), /500/);
});

test('settings that are not plain slugs leave the dataset unconnected', () => {
  assert.equal(stockConnected({ ...connected, HALLS_A3_PROJECT: 'evil.example/x' } as Env), false);
  assert.equal(datasetItemsUrl({ ...connected, HALLS_A3_DATASET: '../admin' } as Env), null);
  assert.equal(stockConnected({ ...connected, HALLS_A3_TOKEN: '' } as Env), false);
});

test('one read serves for a few minutes, then the dataset is asked again', async () => {
  const { doFetch, calls } = fakeFetch(() => Response.json({ items: [{ details: { stock: [row] } }] }));
  const start = Date.parse('2026-09-29T10:00:00Z');
  await loadStock(connected, doFetch, start);
  await loadStock(connected, doFetch, start + 60_000);
  assert.equal(calls.length, 1);
  const later = await loadStock(connected, doFetch, start + 6 * 60_000);
  assert.equal(calls.length, 2);
  assert.equal(later.source, 'a3');
});
