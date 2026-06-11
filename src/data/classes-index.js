import data from './classes.json';

export const classes = data.classes;
export const skills = data.skills;
export const gameDataFetched = data.fetched;

export const classBySlug = Object.fromEntries(classes.map((c) => [c.slug, c]));
export const skillById = skills;
export const baseClasses = classes.filter((c) => c.type === 'base');

export function advancedFor(slug) {
  const c = classBySlug[slug];
  return (c?.advancedClasses || []).map((s) => classBySlug[s]).filter(Boolean);
}
