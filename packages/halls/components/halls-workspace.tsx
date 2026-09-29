'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, LoaderCircle, LockKeyhole, Menu } from 'lucide-react';
import { SidebarProvider, useSidebar } from '@oss-os/ui/components/sidebar';
import { Button } from '@oss-os/ui/components/button';
import { GoogleMark } from '@oss-os/ui/brand';
import { HallsMark } from '@/components/halls-mark';
import { HallsSidebar } from '@/components/halls-sidebar';
import { RoomsView } from '@/components/rooms-view';
import { BookingsView } from '@/components/bookings-view';
import { BookingForm } from '@/components/booking-form';
import { api, loadCached } from '@/lib/api';
import { goTo, NAVIGATED, pageNames, parsePath, type HallsRoute } from '@/lib/navigation';
import type { Booking, Me, RoomOption, Stock } from '@/lib/types';

let signedIn: Me | null = null;

function NavToggle() {
  const { toggleSidebar } = useSidebar();
  return (
    <Button variant="ghost" size="icon-sm" className="nav-toggle" aria-label="Open navigation" onClick={toggleSidebar}>
      <Menu />
    </Button>
  );
}

function Loading({ error }: { error: string }) {
  return (
    <main className="session-loading" aria-busy={!error}>
      <HallsMark />
      <h1>
        UBIO <span>Halls</span>
      </h1>
      {error ? (
        <>
          <p className="error" role="alert">
            {error}
          </p>
          <Button onClick={() => location.reload()}>Try again</Button>
        </>
      ) : (
        <output>
          <LoaderCircle className="animate-spin" size={18} /> Opening Halls…
        </output>
      )}
    </main>
  );
}

function Login({ me, error }: { me: Me; error: string }) {
  return (
    <div className="login-page">
      <div className="login-art">
        <div className="brand">
          <HallsMark />
          UBIO<span>Halls</span>
        </div>
        <div className="login-tagline">
          <h1>
            Every student room,
            <br />
            live from the source.
          </h1>
          <p>
            Rooms, prices and availability read by A3 from each operator,
            <br />
            and bookings prepared in minutes, not days.
          </p>
        </div>
        <small>UBIO · Automation for a connected world</small>
      </div>
      <main className="login-content">
        <div className="login-card">
          <span className="login-symbol">
            <HallsMark />
          </span>
          <h1>Sign in to Halls</h1>
          <p>Use your UBIO Google account.</p>
          <Button className="google-login" disabled={!me.oauthConfigured} onClick={() => location.assign('/auth/google')}>
            <GoogleMark />
            Continue with Google
            <ArrowUpRight size={17} />
          </Button>
          {me.mockLogin && (
            <form method="post" action="/auth/mock">
              <Button type="submit" variant="outline" className="mock-login">
                Continue as local developer
              </Button>
            </form>
          )}
          {!me.oauthConfigured && !me.mockLogin && <p className="notice">Google sign-in is being configured.</p>}
          <div className="login-policy">
            <LockKeyhole size={16} />
            <span>
              Available to <strong>ub.io</strong> and <strong>ubio.ai</strong> accounts.
            </span>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default function HallsWorkspace() {
  const [me, setMe] = useState<Me | null>(signedIn);
  const [stock, setStock] = useState<Stock | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');
  const [route, setRoute] = useState<HallsRoute>({ section: 'rooms' });
  /** The tenancy option being booked, or null while the form is closed. */
  const [booking, setBooking] = useState<RoomOption | null>(null);

  const reloadStock = useCallback(() => {
    loadCached<Stock>('/api/stock', setStock).catch((e: Error) => setError(e.message));
  }, []);
  const reloadBookings = useCallback(() => {
    loadCached<{ bookings: Booking[] }>('/api/bookings', (data) => setBookings(data.bookings)).catch((e: Error) =>
      setError(e.message),
    );
  }, []);

  useEffect(() => {
    const problem = new URLSearchParams(location.search).get('auth_error');
    api<Me>('/api/me')
      .then((loaded) => {
        if (problem) setError(problem.slice(0, 500));
        signedIn = loaded;
        setMe(loaded);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!me?.user) return;
    reloadStock();
    reloadBookings();
  }, [me?.user, reloadStock, reloadBookings]);
  useEffect(() => {
    const update = () => {
      setRoute(parsePath(location.pathname));
      window.scrollTo(0, 0);
    };
    update();
    addEventListener(NAVIGATED, update);
    addEventListener('popstate', update);
    return () => {
      removeEventListener(NAVIGATED, update);
      removeEventListener('popstate', update);
    };
  }, []);

  async function signOut() {
    try {
      await api('/api/logout', { method: 'POST' });
      signedIn = null;
      setMe((m) => (m ? { ...m, user: null } : m));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!me) return <Loading error={error} />;
  if (!me.user) return <Login me={me} error={error} />;
  const title = pageNames[route.section] ?? 'Halls';
  const content = (() => {
    if (route.notFound) return <p className="notice">That page is not here.</p>;
    if (route.section === 'bookings') {
      return <BookingsView me={me} bookings={bookings} onChanged={reloadBookings} />;
    }
    return <RoomsView stock={stock} onBook={setBooking} />;
  })();
  return (
    <SidebarProvider style={{ '--sidebar-width': 'var(--oss-sidebar-width)' } as React.CSSProperties}>
      <HallsSidebar me={me} route={route} stock={stock} bookings={bookings} onSignOut={signOut} />
      <main className="workarea">
        <header className="topbar">
          <NavToggle />
          <nav aria-label="Breadcrumb" className="halls-breadcrumbs">
            <a
              href="/rooms"
              onClick={(e) => {
                e.preventDefault();
                goTo('/rooms');
              }}
            >
              Halls
            </a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>
        </header>
        <div className="page-content">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {content}
        </div>
      </main>
      {booking && (
        <BookingForm
          option={booking}
          onClose={() => setBooking(null)}
          onSaved={() => {
            setBooking(null);
            reloadBookings();
            goTo('/bookings');
          }}
        />
      )}
    </SidebarProvider>
  );
}
