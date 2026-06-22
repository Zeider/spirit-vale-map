import { createClient } from '@supabase/supabase-js';

// Public, RLS-protected (same project as the short-link store).
const SUPABASE_URL = 'https://eytahjvbhllvrlirgxfg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dGFoanZiaGxsdnJsaXJneGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzE0MDAsImV4cCI6MjA5NzQ0NzQwMH0.3NP4Xa108czFfBAJSF_hqCOW_rSVkw8V9muWxlbJl_c';

// detectSessionInUrl:false — we exchange the OAuth ?code= explicitly in
// useOAuthCallback so it can't race the app's URL rewriting.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
});
