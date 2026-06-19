// All current-game map tiles (from spiritvalemarket's tile grid), coords
// transformed into our trimmed crop. `zoneId` links each tile to its
// base44-sourced sub-zone in zones.json (same id as tile id); null = hub.
export const mapTiles = [
  { id: 'forest-field-1', name: "Sunny Meadows 1", minLevel: 1, maxLevel: 5, isHub: false, x: 48.99, y: 40.31, w: 6.96, h: 9.69, zoneId: 'forest-field-1' },
  { id: 'sunny-meadows-2-6', name: "Sunny Meadows 2", minLevel: 6, maxLevel: 10, isHub: false, x: 41.85, y: 40.19, w: 6.96, h: 9.69, zoneId: 'sunny-meadows-2-6' },
  { id: 'forest-field-1-11', name: "Forest Field 1", minLevel: 11, maxLevel: 15, isHub: false, x: 56.11, y: 40.31, w: 6.96, h: 9.69, zoneId: 'forest-field-1-11' },
  { id: 'forest-field-2-16', name: "Forest Field 2", minLevel: 16, maxLevel: 20, isHub: false, x: 56.11, y: 50.35, w: 6.96, h: 9.69, zoneId: 'forest-field-2-16' },
  { id: 'nevaris-sewers-16', name: "Nevaris Sewers", minLevel: 16, maxLevel: 20, isHub: false, x: 34.71, y: 60.28, w: 6.96, h: 9.69, zoneId: 'nevaris-sewers-16' },
  { id: 'forest-field-2', name: "Treant Trail", minLevel: 16, maxLevel: 20, isHub: false, x: 48.99, y: 30.26, w: 6.96, h: 9.69, zoneId: 'forest-field-2' },
  { id: 'bunny-woods-21', name: "Bunny Woods", minLevel: 21, maxLevel: 25, isHub: false, x: 41.85, y: 50.23, w: 6.96, h: 9.69, zoneId: 'bunny-woods-21' },
  { id: 'cemetery', name: "Festering Woods 1", minLevel: 21, maxLevel: 25, isHub: false, x: 48.99, y: 60.28, w: 6.96, h: 9.69, zoneId: 'cemetery' },
  { id: 'festering-woods-2-26', name: "Festering Woods 2", minLevel: 26, maxLevel: 30, isHub: false, x: 56.11, y: 60.4, w: 6.96, h: 9.69, zoneId: 'festering-woods-2-26' },
  { id: 'lake-field-26', name: "Lake Field", minLevel: 26, maxLevel: 30, isHub: false, x: 34.71, y: 40.31, w: 6.96, h: 9.69, zoneId: 'lake-field-26' },
  { id: 'desert-field-2', name: "Windy Desert", minLevel: 26, maxLevel: 30, isHub: false, x: 63.24, y: 40.19, w: 6.96, h: 9.69, zoneId: 'desert-field-2' },
  { id: 'enchanted-forest', name: "Fairy Glen", minLevel: 31, maxLevel: 35, isHub: false, x: 48.99, y: 20.33, w: 6.96, h: 9.69, zoneId: 'enchanted-forest' },
  { id: 'mystic-lake', name: "Mystic Lake 1", minLevel: 31, maxLevel: 35, isHub: false, x: 34.64, y: 30.26, w: 6.96, h: 9.69, zoneId: 'mystic-lake' },
  { id: 'desert-field-1', name: "Windy Desert North", minLevel: 31, maxLevel: 35, isHub: false, x: 63.24, y: 30.26, w: 6.96, h: 9.69, zoneId: 'desert-field-1' },
  { id: 'desert-field-3', name: "Windy Desert South", minLevel: 31, maxLevel: 35, isHub: false, x: 63.33, y: 50.23, w: 6.96, h: 9.69, zoneId: 'desert-field-3' },
  { id: 'mystic-lake-2-36', name: "Mystic Lake 2", minLevel: 36, maxLevel: 40, isHub: false, x: 34.64, y: 20.33, w: 6.96, h: 9.69, zoneId: 'mystic-lake-2-36' },
  { id: 'swamp', name: "Swamp", minLevel: 36, maxLevel: 40, isHub: false, x: 63.33, y: 60.28, w: 6.96, h: 9.69, zoneId: 'swamp' },
  { id: 'dungeon-outside', name: "Forgotten Depths 1", minLevel: 41, maxLevel: 45, isHub: false, x: 41.85, y: 60.28, w: 6.96, h: 9.69, zoneId: 'dungeon-outside' },
  { id: 'goblin-field-41', name: "Goblin Field", minLevel: 41, maxLevel: 45, isHub: false, x: 63.24, y: 20.21, w: 6.96, h: 9.69, zoneId: 'goblin-field-41' },
  { id: 'dungeon-boss', name: "Forgotten Depths 2", minLevel: 46, maxLevel: 50, isHub: false, x: 41.76, y: 70.33, w: 6.96, h: 9.69, zoneId: 'dungeon-boss' },
  { id: 'goblin-village', name: "Goblin Village", minLevel: 46, maxLevel: 50, isHub: false, x: 77.76, y: 20.21, w: 6.96, h: 9.69, zoneId: 'goblin-village' },
  { id: 'goblin-cave', name: "Goblin Cave 1", minLevel: 51, maxLevel: 55, isHub: false, x: 70.54, y: 30.14, w: 6.96, h: 9.69, zoneId: 'goblin-cave' },
  { id: 'goblin-cave-2-56', name: "Goblin Cave 2", minLevel: 56, maxLevel: 60, isHub: false, x: 77.76, y: 30.26, w: 6.96, h: 9.69, zoneId: 'goblin-cave-2-56' },
  { id: 'island', name: "Stormreef Isle", minLevel: 61, maxLevel: 65, isHub: false, x: 14.18, y: 40.31, w: 6.96, h: 9.69, zoneId: 'island' },
  { id: 'ice-cave', name: "Crystal Cave", minLevel: 71, maxLevel: 75, isHub: false, x: 70.54, y: 10.28, w: 6.96, h: 9.69, zoneId: 'ice-cave' },
  { id: 'swamp-wilderness', name: "Swamp Wilderness", minLevel: 66, maxLevel: 70, isHub: false, x: 63.24, y: 70.33, w: 6.96, h: 9.69, zoneId: 'swamp-wilderness' },
  { id: 'sanctum-inner', name: "Sanctum of Light", minLevel: 76, maxLevel: 80, isHub: false, x: 70.54, y: 40.19, w: 6.96, h: 9.69, zoneId: 'sanctum-inner' },
  { id: 'sanctum-throne', name: "Sanctum of Light", minLevel: 81, maxLevel: 85, isHub: false, x: 77.76, y: 40.19, w: 6.96, h: 9.69, zoneId: 'sanctum-throne' },
  { id: 'poison-cave', name: "Underground Cavern", minLevel: 86, maxLevel: 90, isHub: false, x: 70.54, y: 50.23, w: 6.96, h: 9.69, zoneId: 'poison-cave' },
  { id: 'dark-forest', name: "Dark Forest", minLevel: 91, maxLevel: 95, isHub: false, x: 48.99, y: 70.33, w: 6.96, h: 9.69, zoneId: 'dark-forest' },
  { id: 'demon-s-maw', name: "Demon's Maw", minLevel: 96, maxLevel: 100, isHub: false, x: 77.76, y: 60.4, w: 6.96, h: 9.69, zoneId: 'demon-s-maw' },
  { id: 'water-dungeon', name: "Sunken Depths", minLevel: 101, maxLevel: 105, isHub: false, x: 14.18, y: 50.35, w: 6.96, h: 9.69, zoneId: 'water-dungeon' },
  { id: 'abyss-castle-dungeon-106', name: "Abyss Castle Dungeon", minLevel: 106, maxLevel: 110, isHub: false, x: 41.76, y: 80.26, w: 6.96, h: 9.69, zoneId: 'abyss-castle-dungeon-106' },
  { id: 'castle-keep', name: "Abyss Castle Keep", minLevel: 111, maxLevel: 115, isHub: false, x: 34.55, y: 80.26, w: 6.96, h: 9.69, zoneId: 'castle-keep' },
  { id: 'castle-crypt', name: "Abyss Castle Crypt", minLevel: 116, maxLevel: 120, isHub: false, x: 41.85, y: 90.19, w: 6.96, h: 9.69, zoneId: 'castle-crypt' },
  { id: 'castle-library', name: "Abyss Castle Library", minLevel: 121, maxLevel: 125, isHub: false, x: 27.33, y: 80.26, w: 6.96, h: 9.69, zoneId: 'castle-library' },
  { id: 'goblin-warcamp', name: "Goblin Warcamp", minLevel: 121, maxLevel: 125, isHub: false, x: 84.97, y: 20.21, w: 6.96, h: 9.69, zoneId: 'goblin-warcamp' },
  { id: 'night-garden', name: "Night Garden", minLevel: 126, maxLevel: 130, isHub: false, x: 56.11, y: 80.26, w: 6.96, h: 9.69, zoneId: 'night-garden' },
  { id: 'forge', name: "The Forge", minLevel: 126, maxLevel: 130, isHub: false, x: 84.88, y: 70.21, w: 6.96, h: 9.69, zoneId: 'forge' },
  { id: 'ice-field', name: "Starfall Tundra", minLevel: 131, maxLevel: 135, isHub: false, x: 70.54, y: 0.35, w: 6.96, h: 9.69, zoneId: 'ice-field' },
  { id: 'island-dungeon', name: "Turtle Nexus", minLevel: 131, maxLevel: 135, isHub: false, x: 14.18, y: 30.38, w: 6.96, h: 9.69, zoneId: 'island-dungeon' },
  { id: 'labyrinth-1', name: "Forest Labyrinth", minLevel: 6, maxLevel: 10, isHub: false, x: 41.76, y: 30.26, w: 6.96, h: 9.69, zoneId: 'labyrinth-1' },
  { id: 'labyrinth-2', name: "Forest Labyrinth", minLevel: 11, maxLevel: 15, isHub: false, x: 41.76, y: 20.33, w: 6.96, h: 9.69, zoneId: 'labyrinth-2' },
  { id: 'labyrinth-3', name: "Forest Labyrinth", minLevel: 16, maxLevel: 20, isHub: false, x: 41.85, y: 10.16, w: 6.96, h: 9.69, zoneId: 'labyrinth-3' },
  { id: 'labyrinth-4', name: "Forest Labyrinth", minLevel: 21, maxLevel: 25, isHub: false, x: 41.85, y: 0.23, w: 6.96, h: 9.69, zoneId: 'labyrinth-4' },
  { id: 'nevaris', name: "Nevaris", minLevel: 0, maxLevel: 0, isHub: true, x: 48.99, y: 50.23, w: 6.96, h: 9.69, zoneId: null },
  { id: 'the-echoing-spire-0', name: "The Echoing Spire", minLevel: 0, maxLevel: 0, isHub: true, x: 20.21, y: 80.26, w: 6.96, h: 9.69, zoneId: null },
  { id: 'port-town', name: "Wayfarer's Landing", minLevel: 0, maxLevel: 0, isHub: true, x: 27.59, y: 40.19, w: 6.96, h: 9.69, zoneId: null },
];

export const tileById = Object.fromEntries(mapTiles.map((t) => [t.id, t]));
export const keepKnownTileIds = (ids) => ids.filter((id) => tileById[id]);

const tileByNameLevel = Object.fromEntries(mapTiles.map((t) => [`${t.name}|${t.minLevel}`, t]));
const tileByName = {};
for (const t of mapTiles) if (!(t.name in tileByName)) tileByName[t.name] = t;

// Resolve a catalog drop-zone (name + minLevel) to a map tile. Exact name+level
// first, then name-only (handles version-shifted level bands). null if unknown.
export function resolveTile(zoneName, minLevel) {
  return tileByNameLevel[`${zoneName}|${minLevel}`] || tileByName[zoneName] || null;
}
