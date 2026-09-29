import { HubMark } from '../brand';
import { cn } from '../utils';
import { buttonVariants } from './button';

/*
 * The way back to hub.ubio.dev from any platform. It is a plain link rather
 * than a button because it leaves the app; it opens in the same tab because
 * the Hub is only somewhere to choose the next platform from.
 */
export const HUB_URL = 'https://hub.ubio.dev';

export function HubLink({ className }: { className?: string }) {
  return (
    <a
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'hub-link', className)}
      href={HUB_URL}
      aria-label="All UBIO platforms"
      title="All UBIO platforms"
    >
      <HubMark size={15} />
    </a>
  );
}
