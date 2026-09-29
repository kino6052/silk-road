/** Muted, earthy palettes for procedural pixel art (index → RGB). */
export type Rgb = readonly [number, number, number];

/** Map terrain. */
export const PALETTE: readonly Rgb[] = [
  [22, 38, 58], // 0 deep sea
  [30, 50, 72], // 1 sea ripple
  [72, 74, 66], // 2 foreign land
  [158, 136, 96], // 3 arid
  [98, 112, 78], // 4 continental
  [84, 108, 80], // 5 temperate
  [86, 116, 74], // 6 subtropical
  [132, 122, 86], // 7 mediterranean
  [120, 110, 100], // 8 highland
  [30, 30, 28], // 9 country border
  [64, 66, 56], // 10 region border
];

export const CLIMATE_TILE = {
  arid: 3,
  continental: 4,
  temperate: 5,
  subtropical: 6,
  mediterranean: 7,
  highland: 8,
} as const;

/** Vignette scenes. */
export const SCENE_PALETTE: readonly Rgb[] = [
  [150, 176, 196], // 0 day sky high
  [168, 190, 204], // 1
  [186, 202, 208], // 2
  [204, 212, 206], // 3 day sky horizon
  [20, 24, 44], // 4 night sky high
  [34, 38, 62], // 5 night sky low
  [214, 208, 170], // 6 star
  [236, 214, 150], // 7 sun
  [210, 210, 196], // 8 moon
  [150, 140, 120], // 9 smog
  [150, 128, 96], // 10 arid hill
  [92, 110, 82], // 11 green hill
  [112, 106, 102], // 12 highland hill
  [196, 172, 124], // 13 sand
  [108, 130, 86], // 14 grass
  [120, 98, 76], // 15 dirt
  [168, 160, 88], // 16 field
  [60, 90, 116], // 17 water
  [70, 66, 70], // 18 building
  [226, 196, 118], // 19 lit window
  [150, 60, 48], // 20 truck
  [206, 134, 52], // 21 crane
  [58, 58, 60], // 22 road
  [176, 150, 120], // 23 market stall
  [96, 72, 56], // 24 rail
  [88, 84, 90], // 25 building at dusk
];

export const SCENE = {
  smog: 9,
  sand: 13,
  grass: 14,
  field: 16,
  water: 17,
  building: 18,
  window: 19,
  truck: 20,
  crane: 21,
  road: 22,
  stall: 23,
  rail: 24,
} as const;

/** Character sprites; index 0 is transparent. */
export const SPRITE_PALETTE: readonly Rgb[] = [
  [0, 0, 0], // 0 transparent
  [226, 190, 160], // 1 light skin
  [196, 150, 112], // 2 medium skin
  [150, 104, 72], // 3 deep skin
  [34, 30, 28], // 4 black hair
  [92, 64, 44], // 5 brown hair
  [186, 184, 178], // 6 grey hair
  [224, 170, 40], // 7 hard hat
  [128, 70, 72], // 8 headscarf
  [44, 70, 60], // 9 embroidered cap
  [70, 92, 128], // 10 transport blue
  [196, 116, 52], // 11 builder vest
  [128, 110, 84], // 12 everyday clothes
  [48, 52, 64], // 13 official suit
  [60, 56, 58], // 14 trousers
  [36, 32, 30], // 15 shoes
  [20, 18, 18], // 16 eyes
];

export const SPRITE = {
  transparent: 0,
  skin: [1, 2, 3],
  hair: [4, 5],
  grey: 6,
  hardHat: 7,
  scarf: 8,
  cap: 9,
  clothes: { transport: 10, builders: 11, locals: 12, officials: 13 },
  trousers: 14,
  shoes: 15,
  eyes: 16,
} as const;
