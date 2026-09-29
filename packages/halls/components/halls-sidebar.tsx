'use client';
import { ArrowUpRight, BedDouble, ClipboardList, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarNavigationButton,
} from '@oss-os/ui/components/sidebar';
import { Button } from '@oss-os/ui/components/button';
import { HubLink } from '@oss-os/ui/components/hub-link';
import { HallsMark } from '@/components/halls-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { goTo, type HallsRoute } from '@/lib/navigation';
import type { Booking, Me, Stock } from '@/lib/types';

/** UBIO's own apps, one click away. */
const apps = [
  ['A3', 'https://app.athree.dev'],
  ['Orbit', 'https://orbit.ubio.dev'],
  ['Lens', 'https://lens.ubio.dev'],
] as const;

interface SidebarProps {
  me: Me;
  route: HallsRoute;
  stock: Stock | null;
  bookings: Booking[] | null;
  onSignOut: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** The sidebar, drawn as Orbit, Lens and Tide draw theirs. Operators come from the stock itself. */
export function HallsSidebar({ me, route, stock, bookings, onSignOut }: SidebarProps) {
  const buildings = new Map<string, Set<string>>();
  for (const o of stock?.options ?? []) {
    const set = buildings.get(o.operator) ?? new Set<string>();
    set.add(o.buildingUrl);
    buildings.set(o.operator, set);
  }
  const operators = [...buildings.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const open = bookings?.filter((b) => b.status !== 'cancelled').length ?? 0;
  return (
    <Sidebar className="oss-sidebar">
      <SidebarHeader>
        <button className="brand" onClick={() => goTo('/rooms')}>
          <HallsMark />
          UBIO<span>Halls</span>
        </button>
        <div className="workspace-card">
          <span className="workspace-dot" />
          Student accommodation<small>{stock?.source === 'a3' ? 'Live from A3' : 'Sample stock'}</small>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="nav-group">
          <p className="nav-label">Halls</p>
          <SidebarMenuItem>
            <SidebarNavigationButton isActive={route.section === 'rooms'} onClick={() => goTo('/rooms')}>
              <BedDouble />
              <span>Rooms</span>
            </SidebarNavigationButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarNavigationButton isActive={route.section === 'bookings'} onClick={() => goTo('/bookings')}>
              <ClipboardList />
              <span>Bookings</span>
              {open ? <small className="nav-count">{open}</small> : null}
            </SidebarNavigationButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {operators.length > 0 && (
          <SidebarMenu className="nav-group">
            <p className="nav-label">Operators</p>
            {operators.map(([name, set]) => (
              <SidebarMenuItem key={name}>
                <SidebarNavigationButton onClick={() => goTo('/rooms?operator=' + encodeURIComponent(name))}>
                  <span className="operator-dot" aria-hidden="true" />
                  <span>{name}</span>
                  <small className="nav-count">{set.size}</small>
                </SidebarNavigationButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
        <SidebarMenu className="nav-group">
          <p className="nav-label">UBIO apps</p>
          {apps.map(([name, url]) => (
            <SidebarMenuItem key={name}>
              <SidebarNavigationButton render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
                <ArrowUpRight />
                <span>{name}</span>
              </SidebarNavigationButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {me.user && (
          <div className="user-block">
            <span className="avatar">{initials(me.user.name)}</span>
            <span>
              <strong>{me.user.name}</strong>
              <small>{me.admin ? 'Administrator' : 'Team member'}</small>
            </span>
            <HubLink />
            <ThemeToggle />
            <Button size="icon-sm" variant="ghost" aria-label="Sign out" onClick={onSignOut}>
              <LogOut size={15} />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
