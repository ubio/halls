export function OrbitMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M24 3 42 13.5v21L24 45 6 34.5v-21Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="m15 29 9 5 9-5V19l-9-5-9 5Z" stroke="currentColor" strokeWidth="3" />
      <circle cx="33" cy="19" r="4" fill="var(--primary)" stroke="var(--sidebar)" strokeWidth="2" />
    </svg>
  );
}

export function BeaconMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 128 128" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M64 7.3 113.2 35.7v56.6L64 120.7 14.8 92.3V35.7L64 7.3Z"
        stroke="var(--primary)"
        strokeWidth="7.2"
        strokeLinejoin="round"
      />
      <path
        d="M31 65h15l10-21 16 40 10-19h15"
        stroke="var(--primary)"
        strokeWidth="7.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/*
 * Google's own mark, in the single-path monochrome form, so the sign-in button
 * carries the real letterform in the button's colour rather than a typed "G".
 */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.3 2.9-7.4ZM12 22c2.7 0 5-1 6.7-2.4l-3.3-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.9-1.8-5.7-4.1H2.9v2.6A10.1 10.1 0 0 0 12 22ZM6.3 13.9a6 6 0 0 1 0-3.8V7.5H2.9a10 10 0 0 0 0 9l3.4-2.6ZM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10.1 10.1 0 0 0-9.1 5.5l3.4 2.6C7.1 7.8 9.4 6 12 6Z"
      />
    </svg>
  );
}

/*
 * The Hub's hexagon with four dots, one for each platform, drawn in the
 * current colour so it sits among the sidebar's other icons.
 */
export function HubMark({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M24 5 40 14.5v19L24 43 8 33.5v-19Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <circle cx="18.5" cy="19" r="3.5" fill="currentColor" />
      <circle cx="29.5" cy="19" r="3.5" fill="currentColor" />
      <circle cx="18.5" cy="29" r="3.5" fill="currentColor" />
      <circle cx="29.5" cy="29" r="3.5" fill="currentColor" />
    </svg>
  );
}
