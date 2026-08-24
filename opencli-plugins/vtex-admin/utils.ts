// Shared helpers for the vtex-admin adapters.
//
// VTEX is multi-tenant: every command takes an explicit `account` argument
// (no hardcoded account name), so any command here works against any VTEX
// account the operator names — this is the "works for any account" property
// the whole vtex-admin plugin is built around. Session-based adapters (once
// added) reuse the browser's login for that account; PUBLIC-strategy ones
// like catalog-search don't even need a session.
import { ArgumentError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

const UA = 'opencli-vtex-admin-adapter (+https://github.com/VTEX-US-SE/vtex-se-toolkit)';

// VTEX account names: lowercase letters/numbers/hyphens, 1-63 chars.
const ACCOUNT_NAME = /^[a-z0-9-]{1,63}$/i;

export function requireAccount(value: unknown): string {
  const s = String(value ?? '').trim();
  if (!s) {
    throw new ArgumentError('vtex-admin account is required (e.g. "usb2bstore")');
  }
  if (!ACCOUNT_NAME.test(s)) {
    throw new ArgumentError(
      `vtex-admin account "${value}" is not a valid VTEX account name`,
      'Account names are 1-63 chars of lowercase letters, numbers, and hyphens.',
    );
  }
  return s;
}

export function requireString(value: unknown, label: string): string {
  const s = String(value ?? '').trim();
  if (!s) throw new ArgumentError(`vtex-admin ${label} cannot be empty`);
  return s;
}

export function requireBoundedInt(value: unknown, defaultValue: number, maxValue: number, label = 'limit'): number {
  const raw = value ?? defaultValue;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ArgumentError(`vtex-admin ${label} must be a positive integer`);
  }
  if (n > maxValue) {
    throw new ArgumentError(`vtex-admin ${label} must be <= ${maxValue}`);
  }
  return n;
}

/** Builds the account's storefront-API base URL. `environment` defaults to the standard stable environment. */
export function accountBaseUrl(account: string, environment = 'vtexcommercestable.com.br'): string {
  return `https://${account}.${environment}`;
}

export async function vtexFetch(url: string, label: string): Promise<unknown> {
  let resp: Response;
  try {
    resp = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  } catch (err) {
    throw new CommandExecutionError(
      `${label} request failed: ${(err as Error)?.message ?? err}`,
      'Check that the account name is correct and the host is reachable from this network.',
    );
  }
  if (resp.status === 404) {
    throw new EmptyResultError(label, `VTEX returned 404 for ${url}.`);
  }
  if (resp.status === 403 || resp.status === 401) {
    throw new CommandExecutionError(
      `${label} returned HTTP ${resp.status} (unauthorized/forbidden)`,
      'This endpoint may require an authenticated session or API credentials — not every VTEX Admin resource is public. See vtex-admin PUBLIC-vs-session-strategy notes in this plugin\'s README before assuming the account name is wrong.',
    );
  }
  if (resp.status === 429) {
    throw new CommandExecutionError(
      `${label} returned HTTP 429 (rate limited)`,
      'VTEX throttles bursts on public endpoints; wait a few seconds and retry.',
    );
  }
  // VTEX's search API legitimately returns 206 (Partial Content) for paginated results.
  if (!resp.ok && resp.status !== 206) {
    throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
  }
  let body: unknown;
  try {
    body = await resp.json();
  } catch (err) {
    throw new CommandExecutionError(`${label} returned malformed JSON: ${(err as Error)?.message ?? err}`);
  }
  return body;
}
