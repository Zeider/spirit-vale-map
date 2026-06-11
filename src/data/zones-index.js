import data from './zones.json';

export const gameVersion = data.gameVersion;
export const regions = data.regions;

export const subZoneById = {};
for (const r of regions) {
  for (const s of r.subZones) {
    subZoneById[s.id] = Object.assign(s, { regionName: r.name });
  }
}
export const subZones = Object.values(subZoneById);

// Validate an array of ids against known sub-zones (used for URL route hydration).
export function keepKnownIds(ids) {
  return ids.filter((id) => subZoneById[id]);
}
