// Local model server. Serves the 3D car model (GLB / GLTF / OBJ+MTL) from ./models
// and tells the client what it found via GET /api/model.
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, 'models');
const PORT = process.env.PORT || 4000;
const IMAGE_EXT = /\.(png|jpe?g|webp|tga|bmp|gif|ktx2)$/i;
// Files whose name contains "parts" are the separate-parts model used by the product page.
// The landing page ignores them. The product page only ever uses these files.
const PARTS_RE = /parts/i;

const app = express();
app.use(cors());
app.use(compression());

// Recursively list every file under the models dir as POSIX-style relative paths.
function walk(dir, base = '') {
  let out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out = out.concat(walk(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}

const urlFor = (rel) => '/models/' + rel.split('/').map(encodeURIComponent).join('/');
const sizeOf = (rel) => fs.statSync(path.join(MODELS_DIR, rel)).size;

function scan(kind = 'landing', demo = false) {
  const files = walk(MODELS_DIR);
  const pool = kind === 'parts' ? files.filter((f) => PARTS_RE.test(f)) : files.filter((f) => !PARTS_RE.test(f));
  const withExt = (ext) => pool.filter((f) => f.toLowerCase().endsWith(ext));
  const pick = (list, preferred) =>
    list.find((f) => f.toLowerCase() === preferred) ?? list[0];

  // basename (lower-case) -> url, so OBJ/MTL texture paths can be repaired client-side
  const textures = {};
  for (const f of files) {
    if (IMAGE_EXT.test(f)) textures[f.split('/').pop().toLowerCase()] = urlFor(f);
  }

  const glb = pick(withExt('.glb'), 'car.glb');
  if (glb) return { model: { type: 'glb', name: glb, url: urlFor(glb), bytes: sizeOf(glb) }, textures };

  const gltf = pick(withExt('.gltf'), 'car.gltf');
  if (gltf) return { model: { type: 'gltf', name: gltf, url: urlFor(gltf), bytes: sizeOf(gltf) }, textures };

  const obj = pick(withExt('.obj'), 'car.obj');
  if (obj) {
    const stem = obj.replace(/\.obj$/i, '').toLowerCase();
    const mtls = withExt('.mtl');
    const mtl = mtls.find((f) => f.replace(/\.mtl$/i, '').toLowerCase() === stem) ?? mtls[0];
    return {
      model: {
        type: 'obj',
        name: obj,
        url: urlFor(obj),
        mtl: mtl ? urlFor(mtl) : null,
        bytes: sizeOf(obj),
      },
      textures,
    };
  }

  // The product page is independent of the landing page: it never reuses the landing model unless a
  // preview is explicitly requested with /product?demo (parts are then grouped by material).
  if (kind === 'parts' && demo) return { ...scan('landing'), fallback: true };
  return { model: null, textures };
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/model', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(scan(req.query.set === 'parts' ? 'parts' : 'landing', req.query.demo === '1'));
});

// no-cache = the browser re-validates (ETag) every time, so swapping in a new model
// is picked up immediately, and unchanged files still answer 304 with no download.
app.use(
  '/models',
  express.static(MODELS_DIR, {
    index: false,
    etag: true,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
  })
);

app.listen(PORT, () => {
  const found = scan().model;
  console.log(`[model-server] http://localhost:${PORT}`);
  console.log(
    found
      ? `[model-server] serving ${found.type.toUpperCase()}: ${found.name} (${(found.bytes / 1048576).toFixed(1)} MB)`
      : '[model-server] no model found in server/models — the site will use the built-in placeholder car'
  );
});
