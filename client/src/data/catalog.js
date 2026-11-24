import { PRODUCTS } from './products.js';
import { SUPABASE_ON, rpc } from '../lib/supabase.js';

// The catalogue query. Filtering, sorting and paging happen where the data lives: in Postgres (Supabase)
// when it is configured, so 10,000+ products stay one small request per page. Without Supabase it filters
// the in-memory sample list. Both return this very same shape, so the page code never has to change.
export const PAGE_SIZE = 12;

export const SORTS = [
  { id: 'popular', label: 'Most popular' },
  { id: 'rating', label: 'Top rated' },
  { id: 'discount', label: 'Biggest discount' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
];

const off = (p) => 1 - p.price / p.mrp;
const SORT_FN = {
  popular: (a, b) => b.reviews - a.reviews,
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  discount: (a, b) => off(b) - off(a),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
};

// Hosted: ONE Supabase RPC (supabase/migrations: catalog_search) answers with the same shape.
// If it is not configured, or the request fails, the built-in sample catalogue answers instead.
export async function fetchProducts(args = {}) {
  if (SUPABASE_ON) {
    const { q = '', cat = 'all', sort = 'popular', page = 1, size = PAGE_SIZE } = args;
    try {
      return await rpc('catalog_search', { p_q: q, p_cat: cat, p_sort: sort, p_page: page, p_size: size });
    } catch (err) {
      console.warn('[catalog] Supabase unavailable, using the sample catalogue:', err);
    }
  }
  return localProducts(args);
}

async function localProducts({ q = '', cat = 'all', sort = 'popular', page = 1, size = PAGE_SIZE } = {}) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matching = PRODUCTS.filter((p) => words.every((w) => (p.name + ' ' + p.cat).toLowerCase().includes(w)));

  // facet counts ignore the chosen category, so the chips always show what each one would give
  const facets = { all: matching.length };
  for (const p of matching) facets[p.cat] = (facets[p.cat] || 0) + 1;

  const rows = (cat === 'all' ? matching : matching.filter((p) => p.cat === cat)).slice().sort(SORT_FN[sort] || SORT_FN.popular);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const at = Math.min(Math.max(1, page), pages);
  return { items: rows.slice((at - 1) * size, at * size), total: rows.length, pages, page: at, facets };
}
