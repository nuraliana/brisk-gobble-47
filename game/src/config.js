// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on screen size.
export const FIELD = { width: 1280, height: 720 };

// The simulation's fixed step, in seconds: 60 updates a second whatever the display rate.
export const STEP = 1 / 60;

export const BEST_KEY = 'farmyard-dash-best';

export const TURKEY = {
  radius: 18,
  walkSpeed: 205,
  sprintSpeed: 335,
  staminaMax: 100,
  staminaDrain: 34,
  staminaRegen: 20,
  invulnerable: 1.6,
  gobbleCooldown: 3,
  gobbleRadius: 330,
};

export const FARMER = {
  radius: 22,
  patrolSpeed: 92,
  chaseSpeed: 218,
  searchSpeed: 125,
  visionRange: 285,
  visionHalfAngle: 0.66, // radians, about 38 degrees each side
  catchRadius: 30,
  loseSightSeconds: 2.2,
  suspiciousSeconds: 0.75,
  searchSeconds: 2.6,
  throwCooldown: 2.4,
  throwSpeed: 420,
};

export const KNIFE = { radius: 10, speed: 430, spin: 9 };

export const STAGES = [
  { name: '1 · THE FARMYARD', sub: 'Sneak past the farmer to the farmhouse door', knives: false, oven: false },
  { name: '2 · THE BARN', sub: 'He throws knives now — hay is your friend', knives: true, oven: false },
  { name: '3 · THE KITCHEN', sub: 'The oven is lit. Run for the back door!', knives: true, oven: true },
];

export const LIVES = 3;
export const CORN_POINTS = 50;
export const STAGE_POINTS = 500;
export const ESCAPE_POINTS = 1000;

// Coherent autumn palette: orange, brown, gold, deep green.
export const PALETTE = {
  grass: '#5d8a3c',
  grassDark: '#4c7330',
  grassLight: '#6f9c48',
  dirt: '#b98a4e',
  dirtDark: '#9c7139',
  wood: '#8a5a2b',
  woodDark: '#6e451f',
  woodLight: '#a9743a',
  hay: '#e3b93e',
  hayDark: '#c99f2a',
  leaf: '#3f7a34',
  leafDark: '#2e5c26',
  turkeyBody: '#7a4a21',
  turkeyDark: '#5d3517',
  turkeyLight: '#9c6234',
  feather: '#b4762f',
  featherRed: '#c0392b',
  featherGold: '#e8a91c',
  farmerShirt: '#3b6ea5',
  farmerOveralls: '#2f5d8a',
  farmerSkin: '#e8b98a',
  farmerHat: '#d9a441',
  tileA: '#e8dcc8',
  tileB: '#c9b18a',
  oven: '#3a3a3f',
  ovenGlow: '#ff7a1a',
  knife: '#d7dde3',
  danger: '#d7263d',
  gold: '#f2c14e',
  cream: '#fff3d6',
  ink: '#2b1d12',
};
