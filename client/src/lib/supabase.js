// Tiny Supabase client (plain fetch, no SDK, so the bundle stays small). Everything here is optional:
// when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set the site runs on the local model server
// and the built-in sample catalogue, exactly like before.
//
// The anon key is PUBLIC by design (it ships in every browser). What it may do is decided by the row-level
// security policies in supabase/migrations. Never put the service-role key in a VITE_ variable.
const trim = (s) => (s || '').trim().replace(/\/+$/, '');

const URL_ = trim(import.meta.env.VITE_SUPABASE_URL);
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const SUPABASE_ON = !!(URL_ && KEY);

// Where the 3D models live. Default: the public "models" bucket of the Supabase project.
// Override with VITE_MODELS_URL (any CDN / bucket that serves delite.glb and innova-parts.glb with CORS).
export const MODELS_BASE =
  trim(import.meta.env.VITE_MODELS_URL) || (URL_ ? `${URL_}/storage/v1/object/public/models` : '');

const headers = (extra) => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, ...extra });

async function fail(res) {
  let msg = '';
  try {
    msg = (await res.json()).message || '';
  } catch {
    /* not json */
  }
  const err = new Error(msg || `Supabase answered ${res.status}`);
  err.status = res.status;
  return err;
}

// Call a Postgres function:  rpc('catalog_search', { p_q: 'seat' })
export async function rpc(fn, args = {}, signal) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(args),
    signal,
  });
  if (!res.ok) throw await fail(res);
  return res.json();
}

// Insert one row (nothing is read back, so the table only needs an INSERT policy).
export async function insert(table, row) {
  const res = await fetch(`${URL_}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw await fail(res);
}
