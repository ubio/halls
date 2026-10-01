'use client';
import { ArrowUpRight, Check, MapPin, Star } from 'lucide-react';
import { Button } from '@oss-os/ui/components/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@oss-os/ui/components/sheet';
import type { RoomGroup } from '@/components/rooms-view';
import { formatDate, formatMoney, formatWhen, groupDetails, photosOf, roomStatusLabel, roomStatusTone } from '@/lib/format';
import type { BuildingDetails, OptionDetails, RoomOption, TenancyDetails } from '@/lib/types';

interface Props {
  group: RoomGroup;
  onClose: () => void;
  onBook: (option: RoomOption) => void;
}

function Chips({ items, tick = false }: { items: string[]; tick?: boolean }) {
  return (
    <ul className="chip-list">
      {items.map((item) => (
        <li key={item} className="chip">
          {tick && <Check size={12} aria-hidden="true" />}
          {item}
        </li>
      ))}
    </ul>
  );
}

function Gallery({ details, alt }: { details: OptionDetails; alt: string }) {
  const photos = photosOf(details).slice(0, 12);
  if (!photos.length) return null;
  return (
    <ul className="gallery" aria-label="Photos">
      {photos.map((photo, i) => (
        <li key={photo.url} className="gallery-item">
          <a href={photo.url} target="_blank" rel="noopener noreferrer">
            <img src={photo.url} alt={photo.caption ?? `${alt}, photo ${i + 1}`} loading="lazy" referrerPolicy="no-referrer" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  const shown = rows.filter((r): r is [string, string] => Boolean(r[1]));
  if (!shown.length) return null;
  return (
    <dl className="room-facts">
      {shown.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Tenancy({ tenancy, currency }: { tenancy: TenancyDetails; currency: string }) {
  const guarantor =
    tenancy.guarantorRequired === null ? null : tenancy.guarantorRequired ? (tenancy.guarantorScheme ?? 'Required') : 'Not required';
  return (
    <section className="sheet-section" aria-labelledby="tenancy-heading">
      <h3 id="tenancy-heading" className="room-sheet-heading">
        Tenancy
      </h3>
      <Facts
        rows={[
          ['Deposit', tenancy.depositAmount !== null ? formatMoney(tenancy.depositAmount, currency) : null],
          ['Reservation fee', tenancy.reservationFee !== null ? formatMoney(tenancy.reservationFee, currency) : null],
          ['Guarantor', guarantor],
          ['Contract', tenancy.contractType],
          ['Who can book', tenancy.eligibility],
        ]}
      />
      {tenancy.paymentPlans.length > 0 && (
        <>
          <p className="sheet-label">Ways to pay</p>
          <Chips
            items={tenancy.paymentPlans.map((p) =>
              p.amountPerInstalment !== null ? `${p.label} (${formatMoney(p.amountPerInstalment, currency)} each)` : p.label,
            )}
          />
        </>
      )}
      {tenancy.cancellationPolicy && <p className="sheet-note">{tenancy.cancellationPolicy}</p>}
    </section>
  );
}

function Building({ building, name }: { building: BuildingDetails; name: string }) {
  const map =
    building.latitude !== null && building.longitude !== null
      ? `https://www.openstreetmap.org/?mlat=${building.latitude}&mlon=${building.longitude}#map=17/${building.latitude}/${building.longitude}`
      : null;
  const where = [building.address, building.postcode].filter(Boolean).join(', ');
  return (
    <section className="sheet-section" aria-labelledby="building-heading">
      <h3 id="building-heading" className="room-sheet-heading">
        {name}
      </h3>
      {(where || building.rating !== null) && (
        <p className="building-line">
          {where && (
            <span>
              <MapPin size={13} aria-hidden="true" /> {where}
              {map && (
                <>
                  {' · '}
                  <a className="text-link" href={map} target="_blank" rel="noopener noreferrer">
                    Map
                  </a>
                </>
              )}
            </span>
          )}
          {building.rating !== null && (
            <span>
              <Star size={13} aria-hidden="true" /> {building.rating}
              {building.reviewCount !== null ? ` from ${building.reviewCount} reviews` : ''}
            </span>
          )}
        </p>
      )}
      {building.description && <p className="sheet-text">{building.description}</p>}
      {building.amenities.length > 0 && <Chips items={building.amenities} />}
      {building.receptionHours && <p className="sheet-note">{building.receptionHours}</p>}
      {building.nearbyUniversities.length > 0 && (
        <>
          <p className="sheet-label">Nearby universities</p>
          <div className="uni-table-wrap">
            <table className="uni-table">
              <thead>
                <tr>
                  <th>University</th>
                  <th className="num">Walk</th>
                  <th className="num">Cycle</th>
                  <th className="num">Transit</th>
                </tr>
              </thead>
              <tbody>
                {building.nearbyUniversities.map((u) => (
                  <tr key={u.name}>
                    <td>
                      {u.name}
                      {u.distance && <small>{u.distance}</small>}
                    </td>
                    <td className="num">{u.walkMinutes !== null ? `${u.walkMinutes} min` : '—'}</td>
                    <td className="num">{u.cycleMinutes !== null ? `${u.cycleMinutes} min` : '—'}</td>
                    <td className="num">{u.transitMinutes !== null ? `${u.transitMinutes} min` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {building.nearbyTransport.length > 0 && <p className="sheet-note">Transport: {building.nearbyTransport.join(', ')}</p>}
    </section>
  );
}

/** One room type: photos, what it is, every length of stay with a way to book each, then the tenancy and the building. */
export function RoomSheet({ group, onClose, onBook }: Props) {
  const room = group.first;
  const stays = group.options.filter((o) => o.weeks !== null);
  const details = groupDetails(group.options);
  const r = details.room;
  const offer = details.offer;
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="room-sheet">
        <SheetHeader>
          <p className="eyebrow">{room.operator.toUpperCase()}</p>
          <SheetTitle>{room.roomType}</SheetTitle>
          <SheetDescription>
            {room.building}, {room.city} · {room.academicYear}
          </SheetDescription>
        </SheetHeader>
        <div className="room-sheet-body">
          <Gallery details={details} alt={`${room.roomType} at ${room.building}`} />
          {(r?.virtualTourUrl || r?.floorPlanUrl) && (
            <div className="sheet-links">
              {r.virtualTourUrl && (
                <a className="text-link" href={r.virtualTourUrl} target="_blank" rel="noopener noreferrer">
                  360° tour <ArrowUpRight size={13} />
                </a>
              )}
              {r.floorPlanUrl && (
                <a className="text-link" href={r.floorPlanUrl} target="_blank" rel="noopener noreferrer">
                  Floor plan <ArrowUpRight size={13} />
                </a>
              )}
            </div>
          )}
          <dl className="room-facts">
            <div>
              <dt>Size</dt>
              <dd>{room.sizeM2 ? `${room.sizeM2} m²` : '—'}</dd>
            </div>
            <div>
              <dt>Bed</dt>
              <dd>{room.bedType ?? '—'}</dd>
            </div>
            <div>
              <dt>Bathroom</dt>
              <dd>{room.bathroom ?? '—'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={'status-pill ' + roomStatusTone[group.status]}>{roomStatusLabel[group.status]}</span>
                {r?.roomsLeft ? <small className="rooms-left">{r.roomsLeft} left</small> : null}
              </dd>
            </div>
          </dl>
          {offer ? (
            <div className="room-offer">
              <strong>{offer.title ?? room.offers ?? 'Offer'}</strong>
              {offer.terms && <span>{offer.terms}</span>}
              {(offer.code || offer.expiresAt) && (
                <span>{[offer.code ? `Code ${offer.code}` : null, offer.expiresAt ? `Ends ${offer.expiresAt}` : null].filter(Boolean).join(' · ')}</span>
              )}
            </div>
          ) : (
            room.offers && <p className="room-offer">{room.offers}</p>
          )}
          {r && (r.description || r.features.length > 0 || r.view || r.flatSize || r.kitchen) && (
            <section className="sheet-section" aria-labelledby="room-heading">
              <h3 id="room-heading" className="room-sheet-heading">
                The room
              </h3>
              {r.description && <p className="sheet-text">{r.description}</p>}
              <Facts
                rows={[
                  ['Flat', r.flatSize],
                  ['Kitchen', r.kitchen],
                  ['View', r.view],
                  ['Floors', r.floorLevels.length ? r.floorLevels.join(', ') : null],
                  ['Accessible', r.accessible === null ? null : r.accessible ? 'Yes' : 'No'],
                ]}
              />
              {r.features.length > 0 && <Chips items={r.features} />}
            </section>
          )}
          {details.building && details.building.billsIncluded.length > 0 && (
            <section className="sheet-section" aria-labelledby="bills-heading">
              <h3 id="bills-heading" className="room-sheet-heading">
                Bills included
              </h3>
              <Chips items={details.building.billsIncluded} tick />
            </section>
          )}
          <h3 className="room-sheet-heading">Lengths of stay</h3>
          {stays.length === 0 ? (
            <p className="muted">Sold out for {room.academicYear || 'this year'}.</p>
          ) : (
            <ul className="stay-list">
              {stays.map((o) => {
                const soldOut = o.status === 'sold_out' || o.pricePerWeek === null;
                const total = o.pricePerWeek !== null && o.weeks !== null ? o.pricePerWeek * o.weeks : null;
                return (
                  <li key={o.id} className="stay">
                    <div className="stay-main">
                      <strong>{o.weeks} weeks</strong>
                      <small>
                        {formatDate(o.startDate)} – {formatDate(o.endDate)}
                      </small>
                    </div>
                    <div className="stay-price">
                      <strong>{formatMoney(o.pricePerWeek, o.currency)}/wk</strong>
                      <small>
                        {formatMoney(total, o.currency)} in total
                        {o.bookingFee ? ` · ${formatMoney(o.bookingFee, o.currency)} fee` : ''}
                        {o.cashback ? ` · ${formatMoney(o.cashback, o.currency)} cashback` : ''}
                      </small>
                    </div>
                    <Button size="sm" disabled={soldOut} onClick={() => onBook(o)}>
                      {soldOut ? 'Sold out' : 'Book'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {details.tenancy && <Tenancy tenancy={details.tenancy} currency={room.currency} />}
          {details.building && <Building building={details.building} name={room.building} />}
          <div className="room-sheet-foot">
            <a className="text-link" href={details.tenancy?.bookingUrl ?? room.roomUrl} target="_blank" rel="noopener noreferrer">
              See it on {room.operator}'s site <ArrowUpRight size={13} />
            </a>
            {room.scrapedAt && <small className="muted">Read by A3 {formatWhen(room.scrapedAt)}</small>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
