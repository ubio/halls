/** Halls's hexagon: a block of rooms, lit windows in UBIO violet. */
export function HallsMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M16 33V17.5L24 13l8 4.5V33Z" stroke="var(--primary)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M20.5 20.5h2M25.5 20.5h2M20.5 25h2M25.5 25h2" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M22.5 33v-3.5h3V33" stroke="var(--primary)" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
