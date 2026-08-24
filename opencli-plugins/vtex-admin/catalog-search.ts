// vtex-admin catalog-search — search a VTEX store's public catalog by keyword.
//
// Hits the Legacy Search API's public product search
// (`/api/catalog_system/pub/products/search`), documented at
// https://developers.vtex.com — no authentication, no browser session
// required. This is the first command in the vtex-admin plugin, chosen
// deliberately as the SAFEST possible starting point: Strategy.PUBLIC,
// browser: false. See ../README.md for why this command exists before any
// UI/click-based command (the Contracts Management screen investigated
// first turned out to need those, and has three independent blockers of its
// own — this command sidesteps all of them and proves the plugin's install
// path end to end).
import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import { accountBaseUrl, requireAccount, requireBoundedInt, vtexFetch } from './utils.js';

interface VtexSearchProduct {
  productId?: string;
  productName?: string;
  brand?: string;
  linkText?: string;
  categories?: string[];
  releaseDate?: string;
  link?: string;
}

cli({
  site: 'vtex-admin',
  name: 'catalog-search',
  access: 'read',
  description: 'Search a VTEX store catalog by keyword via the public Catalog System search API (no auth)',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'account', positional: true, required: true, help: 'VTEX account name (e.g. "usb2bstore")' },
    { name: 'query', positional: true, help: 'Full-text search keyword (ft=). Omit to list without a text filter.' },
    { name: 'limit', type: 'int', default: 20, help: 'Max results, 1-50 (VTEX caps pagination at 50 per request)' },
    { name: 'environment', type: 'string', default: 'vtexcommercestable.com.br', help: 'VTEX environment host suffix' },
  ],
  columns: ['productId', 'productName', 'brand', 'categories', 'releaseDate', 'link'],
  func: async (args) => {
    const account = requireAccount(args.account);
    const limit = requireBoundedInt(args.limit, 20, 50);
    const environment = String(args.environment ?? 'vtexcommercestable.com.br').trim() || 'vtexcommercestable.com.br';
    const query = args.query != null ? String(args.query).trim() : '';

    const base = accountBaseUrl(account, environment);
    const params = new URLSearchParams({ _from: '0', _to: String(Math.max(limit - 1, 0)) });
    if (query) params.set('ft', query);
    const url = `${base}/api/catalog_system/pub/products/search?${params.toString()}`;

    const body = await vtexFetch(url, 'vtex-admin catalog-search');
    const products = Array.isArray(body) ? (body as VtexSearchProduct[]) : [];
    if (!products.length) {
      throw new EmptyResultError(
        'vtex-admin catalog-search',
        query
          ? `No products matched "${query}" on account "${account}".`
          : `Account "${account}" returned no products — check the account name and environment.`,
      );
    }

    return products.slice(0, limit).map((p) => ({
      productId: String(p.productId ?? ''),
      productName: String(p.productName ?? ''),
      brand: String(p.brand ?? ''),
      categories: Array.isArray(p.categories) ? p.categories.join(', ').replace(/^\/|\/$/g, '') : '',
      releaseDate: String(p.releaseDate ?? '').slice(0, 10),
      link: String(p.link ?? (p.linkText ? `${base}/${p.linkText}/p` : '')),
    }));
  },
});
