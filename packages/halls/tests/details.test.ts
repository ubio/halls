import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDetails } from '../server/details';
import { parseOption } from '../server/stock';

const core = {
  operator: 'Example Living',
  city: 'Leeds',
  building: 'Millgate House',
  buildingUrl: 'https://example-living.example.com/leeds/millgate-house',
  roomType: 'Classic En Suite',
  roomUrl: 'https://example-living.example.com/leeds/millgate-house/classic-en-suite',
  status: 'available',
  weeks: 51,
  startDate: '2026-09-12',
  pricePerWeek: 179,
};

test('the detail groups are read, with only https images kept', () => {
  const details = parseDetails({
    room: {
      description: 'Bright room',
      images: [{ url: 'https://cdn.example.com/a.jpg', caption: 'Bedroom' }, { url: 'http://insecure.example.com/b.jpg' }, 'javascript:alert(1)'],
      virtualTourUrl: 'https://tour.example.com/1',
      features: ['Desk', { name: 'Wardrobe' }, 42],
      kitchen: { type: 'Shared', features: ['Oven', 'Dishwasher'] },
    },
    building: {
      amenities: ['Gym'],
      billsIncluded: ['Wi-Fi', 'Gas'],
      nearbyUniversities: [{ name: 'Example University', walkMinutes: 12, cycleMinutes: '4' }, { distance: 'no name' }],
      latitude: 53.8,
      longitude: -1.55,
    },
    tenancy: { depositAmount: 0, guarantorRequired: true, paymentPlans: [{ instalments: 3 }, 'Pay in full'] },
    offer: { title: '£250 cashback', amount: 250 },
  })!;
  assert.deepEqual(details.room!.images, [{ url: 'https://cdn.example.com/a.jpg', caption: 'Bedroom' }]);
  assert.deepEqual(details.room!.features, ['Desk', 'Wardrobe', '42']);
  assert.equal(details.room!.kitchen, 'Shared · Oven · Dishwasher');
  assert.deepEqual(details.building!.billsIncluded, ['Wi-Fi', 'Gas']);
  assert.equal(details.building!.nearbyUniversities.length, 1);
  assert.equal(details.building!.nearbyUniversities[0].cycleMinutes, 4);
  assert.equal(details.tenancy!.depositAmount, 0);
  assert.deepEqual(details.tenancy!.paymentPlans.map((p) => p.label), ['3 instalments', 'Pay in full']);
  assert.equal(details.offer!.amount, 250);
});

test('groups may be named with a Details suffix, and empty groups become null', () => {
  const details = parseDetails({ roomDetails: { features: ['Desk'] }, tenancyDetails: {}, offer: 'not an object' })!;
  assert.deepEqual(details.room!.features, ['Desk']);
  assert.equal(details.tenancy, null);
  assert.equal(details.offer, null);
  assert.equal(parseDetails({ room: {}, building: 'Millgate House' }), null);
});

test('a row whose building field is the details group still keeps its building name', () => {
  const option = parseOption({ ...core, building: { name: 'Millgate House', amenities: ['Gym'] } })!;
  assert.equal(option.building, 'Millgate House');
  assert.deepEqual(option.details!.building!.amenities, ['Gym']);
  const unnamed = parseOption({ ...core, building: { amenities: ['Gym'] } })!;
  assert.equal(unnamed.building, 'Millgate House');
});

test('a row without any detail groups parses exactly as before', () => {
  const option = parseOption(core)!;
  assert.equal(option.details, null);
  assert.equal(option.building, 'Millgate House');
});

test('coordinates outside the world are dropped', () => {
  const details = parseDetails({ building: { latitude: 200, longitude: 0, postcode: 'LS1 1AA' } })!;
  assert.equal(details.building!.latitude, null);
  assert.equal(details.building!.postcode, 'LS1 1AA');
});
