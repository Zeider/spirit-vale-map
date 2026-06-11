// Sub-zone id -> { x, y, w, h } as percentages of the TRIMMED map image.
// Derived from spiritvalemarket.com's exact tile grid (uniform 4.77x8.96% over the
// full 1719x915 world map), transformed into our trimmed crop (257,9 .. 1178x846).
// Pixel-accurate. To re-derive, re-extract market tile coords and re-run the transform.
export const hotspots = {
  'island-dungeon': { x: 14.18, y: 30.38, w: 6.96, h: 9.69 }, // Turtle Nexus 131-135
  'island': { x: 14.18, y: 40.31, w: 6.96, h: 9.69 }, // Stormreef Isle 61-65
  'water-dungeon': { x: 14.18, y: 50.35, w: 6.96, h: 9.69 }, // Sunken Depths 121-125
  'mystic-lake': { x: 34.64, y: 30.26, w: 6.96, h: 9.69 }, // Mystic Lake 31-35
  'port-town': { x: 27.59, y: 40.19, w: 6.96, h: 9.69 }, // Wayfarer's Landing (hub)
  'labyrinth-1': { x: 41.76, y: 30.26, w: 6.96, h: 9.69 }, // Forest Labyrinth 6-10
  'labyrinth-2': { x: 41.76, y: 20.33, w: 6.96, h: 9.69 }, // Forest Labyrinth 11-15
  'labyrinth-3': { x: 41.85, y: 10.16, w: 6.96, h: 9.69 }, // Forest Labyrinth 16-20
  'labyrinth-4': { x: 41.85, y: 0.23, w: 6.96, h: 9.69 }, // Forest Labyrinth 21-25
  'enchanted-forest': { x: 48.99, y: 20.33, w: 6.96, h: 9.69 }, // Fairy Glen 31-35
  'forest-field-1': { x: 48.99, y: 40.31, w: 6.96, h: 9.69 }, // Sunny Meadows 1-5
  'forest-field-2': { x: 48.99, y: 30.26, w: 6.96, h: 9.69 }, // Treant Trail 5-9
  'nevaris': { x: 48.99, y: 50.23, w: 6.96, h: 9.69 }, // Nevaris (hub)
  'desert-field-1': { x: 63.24, y: 30.26, w: 6.96, h: 9.69 }, // Windy Desert N 21-25
  'desert-field-2': { x: 63.24, y: 40.19, w: 6.96, h: 9.69 }, // Windy Desert 26-30
  'desert-field-3': { x: 63.33, y: 50.23, w: 6.96, h: 9.69 }, // Windy Desert S 26-30
  'ice-field': { x: 70.54, y: 0.35, w: 6.96, h: 9.69 }, // Starfall Tundra 131-135
  'ice-cave': { x: 70.54, y: 10.28, w: 6.96, h: 9.69 }, // Crystal Cave 66-70
  'goblin-cave': { x: 70.54, y: 30.14, w: 6.96, h: 9.69 }, // Goblin Cave 51-55
  'goblin-village': { x: 77.76, y: 20.21, w: 6.96, h: 9.69 }, // Goblin Village 56-60
  'goblin-warcamp': { x: 84.97, y: 20.21, w: 6.96, h: 9.69 }, // Goblin Warcamp 116-120
  'sanctum-inner': { x: 70.54, y: 40.19, w: 6.96, h: 9.69 }, // Sanctum of Light 76-80
  'sanctum-throne': { x: 77.76, y: 40.19, w: 6.96, h: 9.69 }, // Sanctum of Light 81-85
  'poison-cave': { x: 70.54, y: 50.23, w: 6.96, h: 9.69 }, // Underground Cavern 86-90
  'demon-s-maw': { x: 77.76, y: 60.4, w: 6.96, h: 9.69 }, // Demon's Maw 96-100
  'forge': { x: 84.88, y: 70.21, w: 6.96, h: 9.69 }, // The Forge 126-130
  'swamp': { x: 63.33, y: 60.28, w: 6.96, h: 9.69 }, // Swamp 36-40
  'cemetery': { x: 48.99, y: 60.28, w: 6.96, h: 9.69 }, // Festering Woods 21-25
  'dungeon-outside': { x: 41.85, y: 60.28, w: 6.96, h: 9.69 }, // Forgotten Depths 41-45
  'dungeon-boss': { x: 41.76, y: 70.33, w: 6.96, h: 9.69 }, // Forgotten Depths 46-50
  'dark-forest': { x: 48.99, y: 70.33, w: 6.96, h: 9.69 }, // Dark Forest 91-95
  'swamp-wilderness': { x: 63.24, y: 70.33, w: 6.96, h: 9.69 }, // Swamp Wilderness 71-75
  'night-garden': { x: 56.11, y: 80.26, w: 6.96, h: 9.69 }, // Night Garden 126-130
  'castle-library': { x: 27.33, y: 80.26, w: 6.96, h: 9.69 }, // Abyss Castle Library 111-115
  'castle-keep': { x: 34.55, y: 80.26, w: 6.96, h: 9.69 }, // Abyss Castle Keep 101-105
  'castle-crypt': { x: 41.85, y: 90.19, w: 6.96, h: 9.69 }, // Abyss Castle Crypt 106-110
};
