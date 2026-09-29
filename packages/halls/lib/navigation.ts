export const pageNames: Record<string, string> = {
  rooms: 'Rooms',
  bookings: 'Bookings',
};
export interface HallsRoute {
  section: string;
  notFound?: boolean;
}
export function parsePath(pathname: string): HallsRoute {
  const parts = pathname.split('/').filter(Boolean);
  const section = parts[0] || 'rooms';
  if (!Object.hasOwn(pageNames, section) || parts.length > 1) return { section: 'rooms', notFound: true };
  return { section };
}
export const NAVIGATED = 'halls:navigated';
export function goTo(path: string, replace = false) {
  if (!path.startsWith('/') || path.startsWith('//')) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
  window.dispatchEvent(new Event(NAVIGATED));
}
