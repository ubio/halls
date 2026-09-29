'use client';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@oss-os/ui/components/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@oss-os/ui/components/sheet';
import type { RoomGroup } from '@/components/rooms-view';
import { formatDate, formatMoney, formatWhen, roomStatusLabel, roomStatusTone } from '@/lib/format';
import type { RoomOption } from '@/lib/types';

interface Props {
  group: RoomGroup;
  onClose: () => void;
  onBook: (option: RoomOption) => void;
}

/** One room type: what it is, every length of stay it is offered for, and a way to book each. */
export function RoomSheet({ group, onClose, onBook }: Props) {
  const room = group.first;
  const stays = group.options.filter((o) => o.weeks !== null);
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
              </dd>
            </div>
          </dl>
          {room.offers && <p className="room-offer">{room.offers}</p>}
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
          <div className="room-sheet-foot">
            <a className="text-link" href={room.roomUrl} target="_blank" rel="noopener noreferrer">
              See it on {room.operator}'s site <ArrowUpRight size={13} />
            </a>
            {room.scrapedAt && <small className="muted">Read by A3 {formatWhen(room.scrapedAt)}</small>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
