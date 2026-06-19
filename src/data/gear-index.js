import data from './gear.json';

export const items = data.items;
export const slots = data.slots;
export const gearDataFetched = data.fetched;

export const gearByName = {};
for (const it of Object.values(items)) if (!(it.name in gearByName)) gearByName[it.name] = it;

export const cards = data.cards || {};
export const cardByName = cards;
export const artifacts = data.artifacts || [];

export const gems = data.gems || {};
export const gemBySlug = gems;
export const gemByName = {};
for (const g of Object.values(gems)) if (!(g.name in gemByName)) gemByName[g.name] = g;

export const artifactBySlug = {};
for (const a of artifacts) artifactBySlug[a.slug] = a;
