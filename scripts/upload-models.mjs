// Uploads the 3D models in server/models to the public "models" bucket of your Supabase project.
//   npm run models:upload
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from the repo-root .env or the environment).
// The service-role key is a secret: it is only ever used here, never in the browser, never on Vercel.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// tiny .env reader so no extra dependency (or Node flag) is needed
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !m[1].startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill them in.');
  process.exit(1);
}

const dir = path.join(root, 'server/models');
const files = fs.readdirSync(dir).filter((f) => /\.(glb|gltf|bin|png|jpe?g|webp)$/i.test(f));
if (!files.length) {
  console.error(`No model files in ${dir}`);
  process.exit(1);
}

const TYPES = { '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.png': 'image/png', '.webp': 'image/webp' };

for (const f of files) {
  const body = fs.readFileSync(path.join(dir, f));
  const ext = path.extname(f).toLowerCase();
  process.stdout.write(`uploading ${f} (${(body.length / 1048576).toFixed(1)} MB) ... `);
  const res = await fetch(`${url}/storage/v1/object/models/${encodeURIComponent(f)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': TYPES[ext] || 'image/jpeg',
      'x-upsert': 'true', // replace if it is already there
      'cache-control': 'max-age=3600',
    },
    body,
  });
  if (!res.ok) {
    console.log('FAILED');
    console.error(`  ${res.status} ${await res.text()}`);
    console.error('  (Did you run the migration first? The "models" bucket is created by supabase/migrations.)');
    process.exit(1);
  }
  console.log('ok');
}
console.log(`\nDone. Public URL base: ${url}/storage/v1/object/public/models/`);
