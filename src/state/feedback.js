// Anonymous in-app feedback → Supabase. URL + anon key are public (RLS lets
// anyone INSERT but nobody SELECT — only the maintainer reads it). Same project
// as the short-link store; raw PostgREST fetch, no SDK.
const SUPABASE_URL = 'https://eytahjvbhllvrlirgxfg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dGFoanZiaGxsdnJsaXJneGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzE0MDAsImV4cCI6MjA5NzQ0NzQwMH0.3NP4Xa108czFfBAJSF_hqCOW_rSVkw8V9muWxlbJl_c';
const ENDPOINT = `${SUPABASE_URL}/rest/v1/feedback`;
const HEADERS = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' };

const TYPES = ['bug', 'idea', 'other'];

// Submit feedback with auto-captured context (the current share link reproduces
// exactly what the user was looking at). Throws on failure so the UI can react.
export async function sendFeedback({ message, type }) {
  const row = {
    message: String(message || '').trim().slice(0, 4000),
    type: TYPES.includes(type) ? type : 'other',
    page_url: window.location.href.slice(0, 4000),
    app_view: new URLSearchParams(window.location.search).get('view') || 'atlas',
    user_agent: (navigator.userAgent || '').slice(0, 1000),
  };
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { ...HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify(row) });
  if (!res.ok) throw new Error(`feedback failed: ${res.status}`);
}
