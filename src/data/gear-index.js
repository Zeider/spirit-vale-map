import data from './gear.json';

export const items = data.items;
export const slots = data.slots;
export const gearDataFetched = data.fetched;

export const gearByName = {};
for (const it of Object.values(items)) if (!(it.name in gearByName)) gearByName[it.name] = it;

export const cards = data.cards || {};
export const cardByName = cards;
