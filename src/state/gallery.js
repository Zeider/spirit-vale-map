import { supabase } from './supabaseClient.js';
import { sanitizeBuild } from './build-url.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const genId = (n = 8) => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHABET[b % 62]).join('');

const rowToBuild = (r) => ({ ...r, build: sanitizeBuild(r.payload) });

export async function createBuild({ name, description, role, content, visibility, build }) {
  const base = { name, description: description || null, base_class: build.baseClass, advanced_class: build.advancedClass || null,
    role: role || [], content: content || [], visibility: visibility || 'private', payload: build };
  for (let i = 0; i < 2; i++) {
    const id = genId();
    const { error } = await supabase.from('builds').insert({ id, ...base });
    if (!error) return { id };
    if (error.code !== '23505') throw error; // 23505 = unique_violation (id collision) -> retry
  }
  throw new Error('createBuild: id collisions');
}

export async function updateBuild(id, fields) {
  const { error } = await supabase.from('builds').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteBuild(id) {
  const { error } = await supabase.from('builds').delete().eq('id', id);
  if (error) throw error;
}

export async function listMyBuilds() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('builds').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToBuild);
}
