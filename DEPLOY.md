# Deploying Delite (prototype): Supabase backend + Vercel frontend

```
 Browser ──► Vercel            static site (client/dist)
    │
    └──────► Supabase          Postgres  ─ products, catalog_search() RPC, newsletter_signups
                               Storage   ─ public bucket "models": delite.glb, innova-parts.glb
```

The Express server in `server/` is only for local development. In production Supabase does its job
(model files from Storage, catalogue from Postgres), so nothing else has to run.

Prototype notes: only the `/shop` catalogue and the footer newsletter form read/write the database. The
landing grid and the 3D explorer's part → product map still use `client/src/data/products.js`. There is no
login, cart persistence or checkout yet.

## 1. Supabase (once, about 10 minutes)

1. Create a project at https://supabase.com/dashboard (pick a region near your customers, e.g. Mumbai).
2. Create the tables, function and storage bucket. Pick **one** way:
   - **CLI** (from this folder):
     ```bash
     npx supabase login
     npx supabase link --project-ref <your-project-ref>
     npx supabase db push --include-seed
     ```
   - **Dashboard:** open *SQL Editor*, paste `supabase/migrations/20260101000000_init.sql`, run it, then paste
     `supabase/seed.sql` and run that too.
3. Put the products and the 3D models (about 62 MB, from `server/models`) into your project:
   ```bash
   cp .env.example .env        # then fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Project Settings -> API)
   npm run seed:push           # upserts the 30 sample products (skip if you ran seed.sql already)
   npm run models:upload       # uploads delite.glb and innova-parts.glb to the public "models" bucket
   ```
   (Windows PowerShell: `Copy-Item .env.example .env`.) The secret key (`sb_secret_...`, or the legacy
   `service_role` key) lives only in your local, git-ignored `.env` and is never used by the website.
4. Copy two values from *Project Settings -> API*: the **Project URL** and the **publishable key**
   (`sb_publishable_...`; the legacy `anon` key works too).

Free plan check: each GLB is under the 50 MB per-file limit. If you ever replace a model with a bigger one,
raise the limit under *Storage -> Settings*.

## 2. Vercel

1. Push this repo to GitHub (done), then in Vercel choose **Add New -> Project** and import it.
2. Leave the settings as detected. `vercel.json` already sets: install `npm install`, build `npm run build`,
   output `client/dist`, and rewrites every path to `index.html` so `/product` and `/shop` work on refresh.
   (Root Directory stays the repo root.)
3. Add these Environment Variables (Production, Preview and Development):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | the Project URL, e.g. `https://abcd1234.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | the publishable (or anon) key. Do **not** add the secret key here |

4. Deploy. After changing a variable, redeploy (Vite bakes them in at build time).

Or from the terminal: `npx vercel` then `npx vercel --prod` (set the two variables first with `npx vercel env add`).

## 3. Check it

- `/` shows the 3D car after the model downloads (first visit ~33 MB; later visits come from cache).
- `/product` loads `innova-parts.glb` and the hover cards work.
- `/shop` lists 30 products. In the browser Network tab you should see a call to `.../rest/v1/rpc/catalog_search`.
- The footer email form adds a row to *Table Editor -> newsletter_signups*.

If the 3D car shows the grey placeholder, the model URL is wrong or the upload step was skipped: open
`https://<ref>.supabase.co/storage/v1/object/public/models/delite.glb` directly; it should download.

## Day-to-day

| I want to... | Do this |
| --- | --- |
| Run everything locally with no cloud | Leave the `VITE_*` variables empty and run `npm run dev` |
| Run locally against Supabase | Copy `client/.env.example` to `client/.env.local`, fill it in, `npm run dev -w client` |
| Add or change products | Edit `client/src/data/products.js`, then `npm run seed:push` (upserts by id; `npm run seed:generate` rewrites `supabase/seed.sql` if you prefer the SQL editor) |
| Replace a 3D model | Put the file in `server/models`, `npm run models:upload` (hard refresh; CDN caches for 1 hour) |
| Make it production-grade later | Add Supabase Auth, an `orders` table with per-user RLS, and move `products.js` content fully to the DB |

## Security notes

- The anon key is public by design. What it can do is limited by `supabase/migrations`: read products, add a
  newsletter email, nothing else (no reads of the email list, no product writes).
- Never put the `service_role` key in a `VITE_` variable, in Vercel, or in git. `.env` is git-ignored.
