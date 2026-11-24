import { MODELS_BASE } from './lib/supabase.js';

// Where the 3D models come from.
//   hosted (Vercel + Supabase): fixed file names in the public Supabase Storage bucket "models"
//   local dev:                  the Express model server scans server/models and answers GET /api/model
// Both return the same manifest shape: { model: { type, name, url, bytes }, textures, fallback? }.
//
// `bytes` is only the progress-bar fallback when the CDN hides the file size (compressed transfer).
const FILES = {
  landing: { name: 'delite.glb', bytes: 33669088 },
  parts: { name: 'innova-parts.glb', bytes: 28132724 },
};

export async function getManifest(set = 'landing', { signal, demo = false } = {}) {
  if (MODELS_BASE) {
    // /product?demo previews the layout with the landing car when no parts model exists
    const f = demo ? FILES.landing : FILES[set] || FILES.landing;
    return {
      model: { type: 'glb', name: f.name, url: `${MODELS_BASE}/${encodeURIComponent(f.name)}`, bytes: f.bytes },
      textures: {},
      ...(demo && set === 'parts' ? { fallback: true } : {}),
    };
  }
  const qs = set === 'parts' ? `?set=parts${demo ? '&demo=1' : ''}` : '';
  const res = await fetch(`/api/model${qs}`, { signal });
  if (!res.ok) throw new Error(`model server answered ${res.status}`);
  return res.json();
}
