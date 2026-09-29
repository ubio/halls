import type { Env } from './auth';

/** A3's API. Fixed here so a setting can never point Halls's key at another host. */
export const A3_BASE = 'https://api.athree.dev';

/** `org/project`, or null when it is missing or not two plain slugs. */
export function a3Project(env: Env): string | null {
  const project = env.HALLS_A3_PROJECT?.trim() ?? '';
  return /^[a-z0-9-]+\/[a-z0-9-]+$/.test(project) ? project : null;
}

function slug(value: string | undefined): string | null {
  const v = value?.trim() ?? '';
  return /^[a-z0-9-]+$/.test(v) ? v : null;
}

export function stockConnected(env: Env): boolean {
  return Boolean(env.HALLS_A3_TOKEN && a3Project(env) && slug(env.HALLS_A3_DATASET));
}

export function bookingConnected(env: Env): boolean {
  return Boolean(env.HALLS_A3_TOKEN && a3Project(env) && slug(env.HALLS_A3_BOOKING_WORKFLOW));
}

/** The dataset's items address, or null when stock is not connected. */
export function datasetItemsUrl(env: Env): string | null {
  const project = a3Project(env);
  const dataset = slug(env.HALLS_A3_DATASET);
  if (!env.HALLS_A3_TOKEN || !project || !dataset) return null;
  return `${A3_BASE}/${project}/datasets/${dataset}/items`;
}

/**
 * The invoke address for the booking workflow on one operator's site. A3
 * names a site after its host (`www.unitestudents.com` → `unitestudents-com`).
 */
export function bookingInvokeUrl(env: Env, roomUrl: string): string | null {
  const project = a3Project(env);
  const workflow = slug(env.HALLS_A3_BOOKING_WORKFLOW);
  if (!env.HALLS_A3_TOKEN || !project || !workflow) return null;
  let host: string;
  try {
    host = new URL(roomUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  const site = host.replace(/\./g, '-');
  return `${A3_BASE}/${project}/${workflow}?site=${encodeURIComponent(site)}`;
}

export function a3Headers(env: Env): Record<string, string> {
  return { Authorization: 'Bearer ' + env.HALLS_A3_TOKEN, 'Content-Type': 'application/json' };
}
