// Upserts the sample catalogue (client/src/data/products.js) into the products table of your Supabase
// project over its REST API, so you do not need the SQL editor.   npm run seed:push
// Safe to re-run: rows are matched by id.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadSupabaseEnv, root } from './_env.mjs';

const { url, headers } = loadSupabaseEnv();
const { PRODUCTS } = await import(pathToFileURL(path.join(root, 'client/src/data/products.js')).href);

// every row needs the same keys for a bulk insert
const rows = PRODUCTS.map((p, i) => ({
  id: p.id,
  name: p.name,
  cat: p.cat,
  art: p.art ?? null,
  image: p.image ?? null,
  price: p.price,
  mrp: p.mrp,
  rating: p.rating,
  reviews: p.reviews,
  badge: p.badge ?? null,
  sort_order: i,
}));

const res = await fetch(`${url}/rest/v1/products?on_conflict=id`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify(rows),
});
if (!res.ok) {
  console.error(`FAILED ${res.status} ${await res.text()}`);
  console.error('(Did you run supabase/migrations first?)');
  process.exit(1);
}

const count = await fetch(`${url}/rest/v1/products?select=id`, { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } });
console.log(`products upserted: ${rows.length}. Rows now in the table: ${count.headers.get('content-range')?.split('/')[1] ?? '?'}`);
