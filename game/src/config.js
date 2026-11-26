// Skycourier — Aurora Isles: tuning constants, the archipelago and the missions.
// All distances in metres, all speeds in metres per second, headings in radians
// (0 = north, -z). Every number here was picked for a golden-hour bush-plane feel.

export const GAME_TITLE = 'SKYCOURIER';
export const GAME_SUBTITLE = 'Aurora Isles';
export const WORLD_SEED = 20261126;

export const PHYS = {
  maxSpeed: 58, // m/s at full throttle, level flight
  minSpeed: 10, // below this the wing stops flying
  stallSpeed: 19, // below this the nose drops and the sink grows
  accel: 0.55, // how fast speed chases its target
  climbFactor: 0.92, // fraction of speed turned into climb by pitch
  turnFactor: 0.62, // turn authority from bank angle
  maxPitch: 0.62, // about 35 degrees
  maxRoll: 1.05, // about 60 degrees
  pitchRate: 1.9,
  rollRate: 2.6,
  fuelBurnBase: 0.1, // units per second at idle
  fuelBurnThrottle: 0.42, // extra units per second at full throttle
  fuelCapacity: 100,
  crashVy: -6.5, // vertical speed that turns a touchdown into a crash
  hardVy: -3.8, // vertical speed that damages a landing
  runwayHalfWidth: 13,
  maxLandSpeed: 46,
};

// Islands: gaussian bumps rising out of the sea. Peak height in metres.
export const ISLANDS = [
  { x: 0, z: 0, r: 950, peak: 64, name: 'Home Isle' },
  { x: -180, z: -1750, r: 720, peak: 58, name: 'North Isle' },
  { x: 1500, z: 520, r: 640, peak: 56, name: 'East Isle' },
  { x: -1250, z: 780, r: 380, peak: 52, name: 'Gull Rock' },
  { x: 900, z: -1350, r: 300, peak: 38, name: 'Puffin Rock' },
];

// Airstrips: flat ground carved into the islands. heading 0 = north.
export const STRIPS = [
  { id: 'home', name: 'Home Strip', x: 0, z: 0, heading: 0, length: 520, elev: 6 },
  { id: 'north', name: 'North Strip', x: -180, z: -1750, heading: 0.5, length: 420, elev: 8 },
  { id: 'east', name: 'East Strip', x: 1500, z: 520, heading: 1.5708, length: 420, elev: 7 },
];

// Golden training rings: a slalom course around Home Isle.
export const RINGS = [
  { x: 0, z: -420, y: 95 },
  { x: 320, z: -620, y: 120 },
  { x: 620, z: -380, y: 105 },
  { x: 560, z: 60, y: 140 },
  { x: 240, z: 420, y: 100 },
  { x: -220, z: 480, y: 125 },
  { x: -540, z: 180, y: 95 },
  { x: -420, z: -320, y: 130 },
];
export const RING_RADIUS = 15;

// Parcel drop targets: a painted circle on the ground plus a smoke column.
export const DROP_TARGETS = [
  { id: 'gull', name: 'Gull Rock', x: -1250, z: 780, radius: 26 },
  { id: 'meadow', name: 'North Meadow', x: 120, z: -1560, radius: 26 },
  { id: 'beach', name: 'East Beach', x: 1620, z: 340, radius: 26 },
];

// The three missions. Each has its own goal, scoring and flavour.
export const MISSIONS = [
  {
    id: 'rings',
    name: 'Ring Training',
    tag: 'SLALOM',
    blurb: 'Thread all 8 golden rings over Home Isle. Smooth turns beat fast ones — every ring you miss costs the clock.',
    goal: 'Fly through all 8 rings in order.',
    par: 150,
  },
  {
    id: 'island-hop',
    name: 'Island Hop',
    tag: 'COURIER',
    blurb: 'Carry the mailbag home: land at North Strip, then East Strip, then back on Home Strip. Three gentle touchdowns win the day.',
    goal: 'Land at North, then East, then Home.',
    par: 420,
  },
  {
    id: 'parcel-run',
    name: 'Parcel Run',
    tag: 'SUPPLY DROP',
    blurb: 'Three island outposts are waiting on supplies. Drop one crate on each painted circle — press B over the smoke. Fuel is tight, so plan the route.',
    goal: 'Drop a crate on all 3 target circles.',
    par: 360,
  },
];

export const COLORS = {
  skyTop: '#1b2a52',
  skyMid: '#7a4a7d',
  skyLow: '#ff9a52',
  seaDeep: '#123a5c',
  seaShallow: '#2a7d8f',
  sunCore: '#fff3c4',
  sunGlow: '#ffb347',
  auroraA: '#5cf2b8',
  auroraB: '#7ec8ff',
  sand: '#d9c08a',
  grassLow: '#5d8a3c',
  grassHigh: '#3f6b2f',
  rock: '#7a6a58',
  snow: '#e8ecf2',
  runway: '#33373d',
  ringGold: '#ffc233',
  ringDone: '#59e391',
  planeCream: '#f4ead2',
  planeTeal: '#1f7a6d',
  planeRed: '#c8442c',
};
