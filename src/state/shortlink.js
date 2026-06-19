// Supabase-backed short links. The URL + anon key are intentionally public —
// security is enforced by Row Level Security (anon may insert a share and read
// any share by id; shares are immutable). See the `shared_builds` table.
const SUPABASE_URL = 'https://eytahjvbhllvrlirgxfg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dGFoanZiaGxsdnJsaXJneGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzE0MDAsImV4cCI6MjA5NzQ0NzQwMH0.3NP4Xa108czFfBAJSF_hqCOW_rSVkw8V9muWxlbJl_c';
const ENDPOINT = `${SUPABASE_URL}/rest/v1/shared_builds`;
const HEADERS = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' };

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// 8-char base62 id from a CSPRNG. 62^8 ≈ 2.2e14, so collisions are negligible.
export function genId(len = 8) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (const b of bytes) s += ALPHABET[b % 62];
  return s;
}

// Store a payload, return its short id. Retries on the (astronomically rare) id
// collision. Throws on any other failure so callers can fall back to the long URL.
export async function saveShare(payload) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = genId();
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ id, payload }),
    });
    if (res.ok) return id;
    if (res.status === 409) continue; // duplicate id — try another
    throw new Error(`share save failed: ${res.status}`);
  }
  throw new Error('share save failed: repeated id collisions');
}

// Fetch a shared payload by id; null if it doesn't exist.
export async function loadShare(id) {
  const res = await fetch(`${ENDPOINT}?id=eq.${encodeURIComponent(id)}&select=payload`, { headers: HEADERS });
  if (!res.ok) throw new Error(`share load failed: ${res.status}`);
  const rows = await res.json();
  return rows[0]?.payload ?? null;
}
