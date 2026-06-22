import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

const toUser = (session) => {
  const u = session?.user;
  if (!u) return null;
  const m = u.user_metadata || {};
  return { id: u.id, name: m.full_name || m.name || m.user_name || 'Player', avatarUrl: m.avatar_url || null };
};

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(toUser(data.session)); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(toUser(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  const signInWithDiscord = () =>
    supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.href } });
  const signOut = () => supabase.auth.signOut();
  return { user, loading, signInWithDiscord, signOut };
}
