'use client';
import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarRange, PoundSterling, Search, Tag } from 'lucide-react';
import { Button } from '@oss-os/ui/components/button';
import { Input } from '@oss-os/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@oss-os/ui/components/native-select';
import { RoomSheet } from '@/components/room-sheet';
import { formatMoney, formatWhen, median, roomStatusLabel, roomStatusTone } from '@/lib/format';
import { NAVIGATED } from '@/lib/navigation';
import type { RoomOption, RoomStatus, Stock } from '@/lib/types';

/** One room type in one building, with every length of stay it is offered for. */
export interface RoomGroup {
  key: string;
  first: RoomOption;
  options: RoomOption[];
  /** The cheapest weekly price among the stays still on sale. */
  from: number | null;
  status: RoomStatus;
}

const statusRank: Record<RoomStatus, number> = { available: 0, limited: 1, sold_out: 2 };
const PAGE = 100;

/**
 * Rows are grouped by building and room type, not by room page: Unite lists
 * every room type on its building page, so the page alone does not identify
 * a room.
 */
export function groupRooms(options: RoomOption[]): RoomGroup[] {
  const groups = new Map<string, RoomOption[]>();
  for (const o of options) {
    const key = o.buildingUrl + '#' + o.roomType;
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const onSale = list.filter((o) => o.status !== 'sold_out' && o.pricePerWeek !== null);
    const prices = onSale.map((o) => o.pricePerWeek as number);
    const status = list.reduce<RoomStatus>((best, o) => (statusRank[o.status] < statusRank[best] ? o.status : best), 'sold_out');
    return {
      key,
      first: list[0],
      options: [...list].sort((a, b) => (b.weeks ?? 0) - (a.weeks ?? 0)),
      from: prices.length ? Math.min(...prices) : list[0].fromPricePerWeek,
      status,
    };
  });
}

function readOperatorParam(): string {
  if (typeof location === 'undefined') return '';
  return new URLSearchParams(location.search).get('operator') ?? '';
}

interface Props {
  stock: Stock | null;
  onBook: (option: RoomOption) => void;
}

export function RoomsView({ stock, onBook }: Props) {
  const [query, setQuery] = useState('');
  const [operator, setOperator] = useState(readOperatorParam);
  const [city, setCity] = useState('');
  const [showSoldOut, setShowSoldOut] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<'price' | 'price-desc' | 'city'>('price');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<RoomGroup | null>(null);

  // The sidebar's operator links change the query string without a reload.
  useEffect(() => {
    const follow = () => setOperator(readOperatorParam());
    addEventListener(NAVIGATED, follow);
    addEventListener('popstate', follow);
    return () => {
      removeEventListener(NAVIGATED, follow);
      removeEventListener('popstate', follow);
    };
  }, []);

  const groups = useMemo(() => groupRooms(stock?.options ?? []), [stock]);
  const operators = useMemo(() => [...new Set(groups.map((g) => g.first.operator))].sort(), [groups]);
  const cities = useMemo(
    () => [...new Set(groups.filter((g) => !operator || g.first.operator === operator).map((g) => g.first.city))].sort(),
    [groups, operator],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cap = Number(maxPrice) || Infinity;
    const list = groups.filter((g) => {
      const o = g.first;
      if (operator && o.operator !== operator) return false;
      if (city && o.city !== city) return false;
      if (!showSoldOut && g.status === 'sold_out') return false;
      if (g.from !== null && g.from > cap) return false;
      if (q && ![o.roomType, o.building, o.city, o.operator, o.offers ?? ''].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'city') return a.first.city.localeCompare(b.first.city) || a.first.building.localeCompare(b.first.building);
      const pa = a.from ?? Infinity;
      const pb = b.from ?? Infinity;
      return sort === 'price' ? pa - pb : pb - pa;
    });
  }, [groups, query, operator, city, showSoldOut, maxPrice, sort]);

  if (!stock) return <p className="muted">Loading rooms…</p>;

  const onSale = shown.filter((g) => g.status !== 'sold_out');
  const buildings = new Set(shown.map((g) => g.first.buildingUrl)).size;
  const stays = shown.reduce((n, g) => n + g.options.filter((o) => o.status !== 'sold_out').length, 0);
  const typical = median(onSale.map((g) => g.from).filter((p): p is number => p !== null));

  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">STUDENT ACCOMMODATION · 2026-27</p>
          <h1>Rooms</h1>
          <p>
            {groups.length} room types from {operators.length} operator{operators.length === 1 ? '' : 's'} ·{' '}
            {stock.source === 'a3' ? `read from A3 ${formatWhen(stock.fetchedAt)}` : 'sample stock'}
          </p>
        </div>
      </div>
      {stock.source === 'sample' && (
        <p className="notice">
          This is fictional sample stock. Connect the A3 dataset (<code>HALLS_A3_DATASET</code>) to show live rooms from
          each operator.
        </p>
      )}
      <div className="metric-grid">
        <div className="metric">
          <span>
            Buildings <span className="metric-icon"><Building2 size={14} /></span>
          </span>
          <strong>{buildings}</strong>
          <small>matching these filters</small>
        </div>
        <div className="metric">
          <span>
            Room types on sale <span className="metric-icon"><Tag size={14} /></span>
          </span>
          <strong>{onSale.length}</strong>
          <small>of {shown.length} shown</small>
        </div>
        <div className="metric">
          <span>
            Stays to book <span className="metric-icon"><CalendarRange size={14} /></span>
          </span>
          <strong>{stays}</strong>
          <small>room and tenancy length</small>
        </div>
        <div className="metric">
          <span>
            Typical rent <span className="metric-icon"><PoundSterling size={14} /></span>
          </span>
          <strong>{formatMoney(typical)}</strong>
          <small>median weekly, from price</small>
        </div>
      </div>
      <div className="toolbar halls-toolbar">
        <label className="halls-search">
          <Search size={15} aria-hidden="true" />
          <Input
            aria-label="Search rooms"
            placeholder="Search room, building, city or offer"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>
        <NativeSelect aria-label="Operator" value={operator} onChange={(e) => { setOperator(e.target.value); setCity(''); }}>
          <NativeSelectOption value="">All operators</NativeSelectOption>
          {operators.map((o) => (
            <NativeSelectOption key={o} value={o}>
              {o}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="City" value={city} onChange={(e) => setCity(e.target.value)}>
          <NativeSelectOption value="">All cities</NativeSelectOption>
          {cities.map((c) => (
            <NativeSelectOption key={c} value={c}>
              {c}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Highest weekly rent" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
          <NativeSelectOption value="">Any rent</NativeSelectOption>
          {[150, 175, 200, 250, 300, 400].map((p) => (
            <NativeSelectOption key={p} value={String(p)}>
              Up to £{p}/wk
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <NativeSelectOption value="price">Cheapest first</NativeSelectOption>
          <NativeSelectOption value="price-desc">Dearest first</NativeSelectOption>
          <NativeSelectOption value="city">By city</NativeSelectOption>
        </NativeSelect>
        <label className="halls-check">
          <input type="checkbox" checked={showSoldOut} onChange={(e) => setShowSoldOut(e.target.checked)} />
          Show sold out
        </label>
      </div>
      {shown.length === 0 ? (
        <div className="empty-state">
          <p>No rooms match these filters.</p>
        </div>
      ) : (
        <div className="record-table">
          <table className="halls-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Building</th>
                <th>Operator</th>
                <th className="num">From</th>
                <th>Stays</th>
                <th>Offer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, limit).map((g) => (
                <tr key={g.key}>
                  <td>
                    <button className="row-link" onClick={() => setOpen(g)}>
                      <strong>{g.first.roomType}</strong>
                      <small>
                        {[g.first.sizeM2 ? `${g.first.sizeM2} m²` : null, g.first.bedType].filter(Boolean).join(' · ') || '—'}
                      </small>
                    </button>
                  </td>
                  <td>
                    <strong className="cell-main">{g.first.building}</strong>
                    <small>{g.first.city}</small>
                  </td>
                  <td>{g.first.operator}</td>
                  <td className="num">
                    <strong className="cell-main">{formatMoney(g.from, g.first.currency)}</strong>
                    <small>per week</small>
                  </td>
                  <td>
                    {g.status === 'sold_out'
                      ? '—'
                      : g.options
                          .filter((o) => o.weeks !== null && o.status !== 'sold_out')
                          .map((o) => o.weeks)
                          .join(', ') + ' wks'}
                  </td>
                  <td className="offer-cell">{g.first.offers ?? ''}</td>
                  <td>
                    <span className={'status-pill ' + roomStatusTone[g.status]}>{roomStatusLabel[g.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {shown.length > limit && (
        <div className="show-more">
          <Button variant="outline" size="sm" onClick={() => setLimit(limit + PAGE)}>
            Show {Math.min(PAGE, shown.length - limit)} more of {shown.length - limit}
          </Button>
        </div>
      )}
      {open && (
        <RoomSheet
          group={open}
          onClose={() => setOpen(null)}
          onBook={(option) => {
            setOpen(null);
            onBook(option);
          }}
        />
      )}
    </>
  );
}
