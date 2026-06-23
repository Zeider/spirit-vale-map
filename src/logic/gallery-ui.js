export const ROLES = ['DPS', 'Tank', 'Support', 'Hybrid'];
export const CONTENT = ['Leveling', 'Endgame', 'Boss'];

export const CLASS_COLORS = {
  acolyte: '#7cb2fc', knight: '#ffd25a', mage: '#b78cff', rogue: '#7cfc9b',
  scout: '#5ad1c4', summoner: '#ff9d5c', warrior: '#ff7c7c',
};
export const classColor = (slug) => CLASS_COLORS[slug] || '#8ea0bf';

export function relativeTime(iso, now = Date.now()) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7); if (w < 52) return `${w}w`;
  return `${Math.floor(w / 52)}y`;
}

export function filterSortBuilds(rows, { sort = 'newest', classFilter = '', role = [], content = [], search = '' } = {}) {
  const q = search.trim().toLowerCase();
  const out = (rows || []).filter((r) => {
    if (classFilter && r.base_class !== classFilter) return false;
    if (role.length && !role.some((x) => (r.role || []).includes(x))) return false;
    if (content.length && !content.some((x) => (r.content || []).includes(x))) return false;
    if (q && !`${r.name} ${r.description || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
  out.sort(sort === 'most-liked'
    ? (a, b) => b.like_count - a.like_count || Date.parse(b.created_at) - Date.parse(a.created_at)
    : (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return out;
}
