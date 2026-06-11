// Sub-zone id -> { x, y, w, h } as percentages of the map image.
// FIRST-PASS coordinates authored from the map; refine visually with the
// in-app calibrator (open the app with ?calibrate). Stored as data so a tile
// can later become an SVG polygon without touching components.
export const hotspots = {
  // left island cluster
  'island-dungeon': { x: 4, y: 18, w: 10, h: 11 },   // Turtle Nexus 131-135
  'island': { x: 3, y: 33, w: 10, h: 11 },           // Stormreef Isle 61-65
  'water-dungeon': { x: 4, y: 45, w: 10, h: 11 },     // Sunken Depths 121-125
  // forest labyrinth + early game (center-left)
  'labyrinth-1': { x: 29, y: 4, w: 8, h: 9 },         // Forest Labyrinth 6-10
  'labyrinth-2': { x: 29, y: 13, w: 8, h: 9 },        // Forest Labyrinth 11-15
  'labyrinth-3': { x: 37, y: 4, w: 8, h: 9 },         // Forest Labyrinth 16-20
  'labyrinth-4': { x: 37, y: 13, w: 8, h: 9 },        // Forest Labyrinth 21-25
  'enchanted-forest': { x: 45, y: 13, w: 8, h: 9 },   // Fairy Glen 31-35
  'mystic-lake': { x: 27, y: 26, w: 8, h: 10 },       // Mystic Lake 31-35
  'forest-field-1': { x: 33, y: 41, w: 8, h: 9 },     // Sunny Meadows 1-5
  'forest-field-2': { x: 41, y: 33, w: 8, h: 9 },     // Treant Trail 5-9
  'port-town': { x: 24, y: 41, w: 8, h: 8 },          // Wayfarer's Landing (hub)
  'nevaris': { x: 42, y: 42, w: 7, h: 8 },            // Nevaris (hub)
  // center
  'swamp': { x: 49, y: 27, w: 8, h: 9 },              // Swamp 36-40
  'dungeon-outside': { x: 49, y: 36, w: 8, h: 8 },    // Forgotten Depths 41-45
  'dungeon-boss': { x: 49, y: 44, w: 8, h: 8 },       // Forgotten Depths 46-50
  'cemetery': { x: 49, y: 52, w: 8, h: 9 },           // Festering Woods 21-25
  // bottom-left abyss castle cluster
  'castle-library': { x: 28, y: 74, w: 8, h: 9 },     // Abyss Castle Library 111-115
  'castle-keep': { x: 36, y: 74, w: 8, h: 9 },        // Abyss Castle Keep 101-105
  'castle-crypt': { x: 36, y: 83, w: 8, h: 9 },       // Abyss Castle Crypt 106-110
  // bottom-center
  'dark-forest': { x: 53, y: 57, w: 8, h: 9 },        // Dark Forest 91-95
  'swamp-wilderness': { x: 53, y: 65, w: 8, h: 9 },   // Swamp Wilderness 71-75
  'night-garden': { x: 52, y: 74, w: 8, h: 9 },       // Night Garden 126-130
  // top-right
  'ice-cave': { x: 57, y: 4, w: 8, h: 9 },            // Crystal Cave 66-70
  'ice-field': { x: 66, y: 3, w: 8, h: 9 },           // Starfall Tundra 131-135
  'goblin-cave': { x: 73, y: 9, w: 8, h: 9 },         // Goblin Cave 51-55
  'goblin-village': { x: 73, y: 18, w: 8, h: 9 },     // Goblin Village 56-60
  'goblin-warcamp': { x: 85, y: 19, w: 9, h: 9 },     // Goblin Warcamp 116-120
  // desert (center-right)
  'desert-field-1': { x: 60, y: 27, w: 8, h: 9 },     // Windy Desert 21-25
  'desert-field-2': { x: 60, y: 36, w: 8, h: 9 },     // Windy Desert 26-30
  'desert-field-3': { x: 68, y: 31, w: 8, h: 9 },     // Windy Desert 26-30
  // right
  'poison-cave': { x: 74, y: 44, w: 8, h: 9 },        // Underground Cavern 86-90
  'sanctum-inner': { x: 80, y: 38, w: 8, h: 9 },      // Sanctum of Light 76-80
  'sanctum-throne': { x: 88, y: 38, w: 8, h: 9 },     // Sanctum of Light 81-85
  'demon-s-maw': { x: 72, y: 56, w: 9, h: 10 },       // Demon's Maw 96-100
  'forge': { x: 80, y: 66, w: 10, h: 10 },            // The Forge 126-130
};
