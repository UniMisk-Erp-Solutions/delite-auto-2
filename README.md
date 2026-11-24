# Delite — 3D scroll e-commerce site

React + three.js (react-three-fiber). One real 3D car (the Innova GLB) travels through the first six
sections of the landing page as you scroll, then slides away so the product sections get the full width.
A second page, the **3D explorer**, lets you orbit a see-through Innova and hover its parts to shop them.

## Pages

| URL | What |
| --- | --- |
| `/` | Landing page: 3D scroll story, then the shop sections |
| `/product` | 3D explorer: ghost-glass body, 25 shoppable parts (hover to preview, click to pin the card) |
| `/shop` | Catalogue: search, categories, sort, pagination (built to take thousands of products) |

## Run it on a new computer

Requirements: **Node.js 18 or newer** (tested on 24) and npm. Nothing else.

```bash
npm install
npm run dev
```

Open http://localhost:5173. (`npm run dev` starts the model server on :4000 and the site on :5173
together; the site forwards `/api` and `/models` to the model server.)

Open the site over `localhost`; a 33 MB model loads on first visit, so give it a few seconds.

### Deploy (Vercel + Supabase)

The site is set up as a static frontend on **Vercel** with **Supabase** as backend and database
(Postgres for the catalogue and newsletter, Storage for the 3D models). Step by step: **[DEPLOY.md](DEPLOY.md)**.
In short: run `supabase/migrations` + `supabase/seed.sql`, `npm run models:upload`, import the repo in Vercel and
set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. With those variables empty the site runs fully local as above.

### Production build (self-hosted alternative)

```bash
npm run build          # creates client/dist  (the static site)
npm start              # model server on :4000 (PORT env var changes it)
```

Host `client/dist` on any static host **and** run the model server, then route `/api/*` and `/models/*`
to the model server (reverse proxy, e.g. nginx). To try the production build locally:
`npm run build`, then `npm start` in one terminal and `npm run preview -w client` in another.

## The 3D models (`server/models`)

| File | Used by |
| --- | --- |
| `delite.glb` | Landing page (the joined Innova). **Do not replace casually**: the camera poses, hotspots and the baked environment are tuned to it |
| `innova-parts.glb` | `/product` (25 named part groups + `ghost_body`). Any file whose name contains `parts` is used by `/product` |

`backups/delite_good_0211.glb` is a safe copy of the landing model.

## The hero environment (twilight desert, floor, shadow, reflection)

Rendered in Blender Cycles and shown by `client/src/three/Floor.jsx`:

- `client/public/floor/hero-sky.jpg` — backdrop (sky, stars, dunes, rock, haze), wrapped on a dome
- `client/public/floor/hero-floor-light.jpg` / `hero-floor-shadow.jpg` — studio pool of light and the car's shadow
- the wet-floor reflection of the car is live (no file)

You only need Blender to **change** them. Re-bake (Blender 5.1, from the project folder):

```bash
GLB=server/models/delite.glb MODE=pano  SAMPLES=320 PANO_W=4096 OUT=client/public/floor "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --python tools/bake_hero_world.py
GLB=server/models/delite.glb MODE=floor SAMPLES=320 RES_X=2560  OUT=client/public/floor "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --python tools/bake_hero_world.py
```

`MODE=preview NOCAR=1 OUT=exports/preview.png` renders a quick look from the hero camera. Re-bake if the
car model, the hero camera (`KEYS[0]` in `client/src/config.js`) or the page background colour changes.
The other scripts in `tools/` prepare the models: `auto_prepare_parts.py` splits the Innova into the 25 parts
(`STAGE=export OUT=... blender -b copy.blend --python tools/auto_prepare_parts.py`), always on a **copy** of your .blend.

## Page flow (landing)

| # | Section | 3D car |
| --- | --- | --- |
| 1 | Hero: hook, two CTAs | side view |
| 2 | **Find your fit**: vehicle picker, remembered for next visit | front view |
| 3 | Shop by category (6 cards) | top view |
| 4 | **Step inside**: interior products | camera flies into the cabin |
| 5 | **Smart GPS** special offer + countdown | push-in on the dash screen |
| 6 | Trending accessories (filter tabs, prices in ₹, add to cart) | slides off right, then 3D switches **off** |
| 7 | Success in numbers | – |
| 8 | **Testimonials** (auto-sliding) | – |
| 9 | Services banner | – |
| 10 | Shop by brand (two seamless marquees) | – |
| 11 | Footer | – |

## Content you will replace

| What | Where |
| --- | --- |
| Site name | `BRAND` in `client/src/config.js`, footer in `client/src/sections/Shop.jsx`, title in `client/index.html` |
| Products, prices (₹), badges | `client/src/data/products.js` (set `image: '/products/x.jpg'` for a real photo, otherwise built-in vector art is used) |
| Parts of the 3D explorer → products | `client/src/product/parts.js` |
| Catalogue data source | `client/src/data/catalog.js` (Supabase `catalog_search` RPC when configured, otherwise the in-memory sample list) |
| Database, seed, model bucket | `supabase/` (`migrations/`, `seed.sql` generated by `npm run seed:generate`) |
| Vehicles for the picker | `client/src/data/vehicles.js` |
| Reviews (**sample text**, replace with real ones) | `client/src/data/reviews.js` |
| Brand marquee | `client/src/data/brands.js` (logos in `client/public/brands`) |
| 3D camera poses / timing | `client/src/config.js` (`KEYS`, `HOLD`) |

Preview a section directly: `/?section=4`. Model fixes: `/?flip=1`, `/?up=z`, `/?double=1`.

## Performance notes
- The canvas renders only while something moves, drops resolution during fast scrolling and restores it
  when you stop, and the whole 3D scene is switched off once you pass the story.
- The hero reflection renders the car a second time, only while the hero is on screen.
- Brand marquees use transform-only animation (GPU) and honour reduced-motion.
