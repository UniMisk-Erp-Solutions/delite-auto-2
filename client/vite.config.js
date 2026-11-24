import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The browser needs two PUBLIC Supabase values: the project URL and the publishable (anon) key.
// Different setups name them differently, so accept all the usual names (first one found wins):
//   - our own:               VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//   - Vercel's Supabase integration: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_URL / SUPABASE_ANON_KEY
// Only these named values are ever copied into the bundle. A secret / service-role key is refused outright.
const URL_NAMES = ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'];
const KEY_NAMES = [
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
];

const isSecret = (key) => {
  if (key.startsWith('sb_secret_')) return true;
  try {
    const part = key.split('.')[1];
    return JSON.parse(Buffer.from(part, 'base64url').toString()).role === 'service_role';
  } catch {
    return false;
  }
};

export default defineConfig(({ mode }) => {
  // files first (.env.production holds the public defaults), then real environment variables on top;
  // an EMPTY variable never blanks out a default
  const fromProcess = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v));
  const env = { ...loadEnv(mode, process.cwd(), ''), ...fromProcess };
  const pick = (names) => names.map((n) => (env[n] || '').trim()).find(Boolean) || '';
  const url = pick(URL_NAMES).replace(/\/+$/, '');
  const key = pick(KEY_NAMES);
  if (key && isSecret(key)) {
    throw new Error('A Supabase SECRET / service_role key was found where the PUBLIC key belongs. Use the publishable (anon) key in the website settings.');
  }

  return {
    plugins: [react()],
    define: {
      __SUPABASE_URL__: JSON.stringify(url),
      __SUPABASE_KEY__: JSON.stringify(key),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:4000',
        '/models': 'http://localhost:4000',
      },
    },
  };
});
