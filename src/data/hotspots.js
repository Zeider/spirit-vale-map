// Sub-zone id -> { x, y, w, h } as percentages of the map image.
// Measured against a 5% grid over the painted tiles. The market map uses some
// newer level numbers / extra tiles than our v0.13.1 data, so a few center
// zones map to the nearest tile. Refine exactly with the in-app calibrator
// (open the app with ?calibrate). Stored as data so a tile can later become SVG.
export const hotspots = {
  // left island cluster
  'island-dungeon': { x: 6, y: 31, w: 9, h: 10 },    // Turtle Nexus 131-135
  'island': { x: 6, y: 44, w: 9, h: 9 },             // Stormreef Isle 61-65
  'water-dungeon': { x: 6, y: 54, w: 9, h: 9 },       // Sunken Depths 121-125
  // center-left
  'mystic-lake': { x: 18, y: 33, w: 8, h: 9 },        // Mystic Lake 31-35
  'port-town': { x: 20, y: 44, w: 8, h: 7 },          // Wayfarer's Landing (hub)
  // forest labyrinth column (top center)
  'labyrinth-1': { x: 42, y: 3, w: 8, h: 9 },         // Forest Labyrinth 6-10
  'labyrinth-2': { x: 42, y: 14, w: 8, h: 9 },        // Forest Labyrinth 11-15
  'labyrinth-3': { x: 42, y: 25, w: 8, h: 9 },        // Forest Labyrinth 16-20
  'labyrinth-4': { x: 42, y: 35, w: 8, h: 8 },        // Forest Labyrinth 21-25
  'enchanted-forest': { x: 49, y: 26, w: 8, h: 9 },   // Fairy Glen 31-35
  // center cluster (version-mismatched tiles — approximate)
  'forest-field-1': { x: 42, y: 44, w: 8, h: 8 },     // Sunny Meadows 1-5
  'forest-field-2': { x: 50, y: 52, w: 8, h: 8 },     // Treant Trail 5-9
  'nevaris': { x: 36, y: 52, w: 7, h: 7 },            // Nevaris (hub)
  // desert column (center-right)
  'desert-field-1': { x: 60, y: 34, w: 7, h: 9 },     // Windy Desert N 21-25
  'desert-field-2': { x: 60, y: 44, w: 7, h: 9 },     // Windy Desert 26-30
  'desert-field-3': { x: 60, y: 54, w: 7, h: 9 },     // Windy Desert S 26-30
  // top-right snow / goblins
  'ice-field': { x: 62, y: 2, w: 9, h: 10 },          // Starfall Tundra 131-135
  'ice-cave': { x: 68, y: 13, w: 8, h: 10 },          // Crystal Cave 66-70
  'goblin-cave': { x: 68, y: 34, w: 8, h: 9 },        // Goblin Cave 51-55
  'goblin-village': { x: 76, y: 22, w: 8, h: 9 },     // Goblin Village 56-60
  'goblin-warcamp': { x: 85, y: 22, w: 8, h: 9 },     // Goblin Warcamp 116-120
  // right / sanctum
  'sanctum-inner': { x: 68, y: 44, w: 8, h: 8 },      // Sanctum of Light 76-80
  'sanctum-throne': { x: 76, y: 44, w: 8, h: 8 },     // Sanctum of Light 81-85
  'poison-cave': { x: 68, y: 54, w: 8, h: 9 },        // Underground Cavern 86-90
  'demon-s-maw': { x: 78, y: 63, w: 9, h: 9 },        // Demon's Maw 96-100
  'forge': { x: 82, y: 73, w: 9, h: 9 },              // The Forge 126-130
  // center / bottom-center
  'swamp': { x: 64, y: 64, w: 7, h: 8 },              // Swamp 36-40
  'cemetery': { x: 50, y: 64, w: 7, h: 8 },           // Festering Woods 21-25
  'dungeon-outside': { x: 42, y: 64, w: 8, h: 8 },    // Forgotten Depths 41-45
  'dungeon-boss': { x: 42, y: 74, w: 8, h: 7 },       // Forgotten Depths 46-50
  'dark-forest': { x: 50, y: 73, w: 7, h: 8 },        // Dark Forest 91-95
  'swamp-wilderness': { x: 64, y: 73, w: 7, h: 8 },   // Swamp Wilderness 71-75
  'night-garden': { x: 56, y: 82, w: 7, h: 8 },       // Night Garden 126-130
  // bottom-left abyss castle cluster
  'castle-library': { x: 26, y: 78, w: 8, h: 9 },     // Abyss Castle Library 111-115
  'castle-keep': { x: 34, y: 78, w: 8, h: 9 },        // Abyss Castle Keep 101-105
  'castle-crypt': { x: 42, y: 78, w: 8, h: 9 },       // Abyss Castle Crypt 106-110
};
