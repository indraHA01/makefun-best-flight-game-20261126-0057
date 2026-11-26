// Skycourier — Aurora Isles: deterministic randomness.
// One seeded generator drives the terrain, the clouds and the menu drift, so the
// same seed always paints the same archipelago. Nothing here touches Math.random
// during play, which keeps screenshots reproducible.

// Mulberry32: a small, fast, seedable PRNG with a clean period.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D value noise: a lattice of random heights, smoothly interpolated, with two
// octaves so hills read at both the island scale and the field scale.
export function makeNoise2D(seed) {
  const rand = mulberry32(seed);
  const size = 64;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();

  function lattice(ix, iz) {
    const x = ((ix % size) + size) % size;
    const z = ((iz % size) + size) % size;
    return grid[z * size + x];
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function sample(x, z, cell) {
    const gx = x / cell;
    const gz = z / cell;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = smooth(gx - ix);
    const fz = smooth(gz - iz);
    const a = lattice(ix, iz);
    const b = lattice(ix + 1, iz);
    const c = lattice(ix, iz + 1);
    const d = lattice(ix + 1, iz + 1);
    return (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz) * 2 - 1;
  }

  // Returns roughly -1..1: broad rolling hills plus finer bumps.
  return function noise2D(x, z) {
    return sample(x, z, 420) * 0.72 + sample(x, z, 130) * 0.28;
  };
}

// Pick n items from an array with a seeded shuffle (Fisher-Yates).
export function seededShuffle(items, seed) {
  const rand = mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
