// Skycourier — Aurora Isles: the archipelago itself.
// heightAt(x, z) is the single source of truth for terrain: the renderer, the
// flight model and the landing checks all ask this one function, so the ground
// you see is always the ground you can hit.

import { ISLANDS, STRIPS, COLORS, WORLD_SEED } from './config.js';
import { makeNoise2D } from './noise.js';

const noise2D = makeNoise2D(WORLD_SEED);

// Distance from (x, z) to the centreline of a strip, and along it.
// Heading h flies toward (sin h, -cos h); right of the heading is
// (cos h, sin h). So along = displacement · forward, across = displacement
// · right. (An earlier version had the dx terms flipped, which rotated the
// north and east strips off their headings; heading 0 masked it.)
function stripCoords(strip, x, z) {
  const dx = x - strip.x;
  const dz = z - strip.z;
  const sin = Math.sin(strip.heading);
  const cos = Math.cos(strip.heading);
  const along = dx * sin - dz * cos;
  const across = dx * cos + dz * sin;
  return { along, across };
}

// Raw island height before the strips are carved flat.
function rawHeight(x, z) {
  let h = 0;
  let mask = 0;
  for (const island of ISLANDS) {
    const dx = (x - island.x) / island.r;
    const dz = (z - island.z) / island.r;
    const d2 = dx * dx + dz * dz;
    if (d2 > 4) continue;
    const bump = Math.exp(-d2 * 1.6);
    // Noise roughens the slopes but never the beach ring.
    const rough = 0.6 + 0.4 * noise2D(x, z);
    h += island.peak * bump * rough;
    mask = Math.max(mask, bump);
  }
  // Below the waterline the seabed falls away gently so the shore reads.
  if (h < 0.5) return Math.max(h - 6 * (1 - mask), -8);
  return h;
}

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  // Carve each strip flat: blend to the strip elevation near its centreline.
  for (const strip of STRIPS) {
    const { along, across } = stripCoords(strip, x, z);
    const half = strip.length / 2;
    if (Math.abs(along) > half + 90 || Math.abs(across) > 110) continue;
    const edge = Math.max(Math.abs(along) / (half + 90), Math.abs(across) / 110);
    const flat = 1 - Math.min(1, Math.max(0, (edge - 0.45) / 0.55));
    const w = flat * flat * (3 - 2 * flat);
    h = h * (1 - w) + strip.elev * w;
  }
  return h;
}

// Is this point on a strip's paved surface?
export function stripAt(x, z) {
  for (const strip of STRIPS) {
    const { along, across } = stripCoords(strip, x, z);
    if (Math.abs(along) <= strip.length / 2 && Math.abs(across) <= 13) return strip;
  }
  return null;
}

// Is this point on open water (below the shoreline)?
export function isWater(x, z) {
  return heightAt(x, z) < 0.4;
}

// Ground colour for a terrain quad, by height and slope, with a little noise
// so neighbouring fields do not read as one flat sheet.
export function groundColor(x, z, h, slope) {
  const n = noise2D(x * 1.7 + 31, z * 1.7 - 17) * 0.5 + 0.5;
  let r;
  let g;
  let b;
  if (h < 2.5) {
    [r, g, b] = [217, 192, 138]; // sand
  } else if (h < 26) {
    const t = (h - 2.5) / 23.5;
    r = 93 + (63 - 93) * t + (n - 0.5) * 22;
    g = 138 + (107 - 138) * t + (n - 0.5) * 22;
    b = 60 + (47 - 60) * t + (n - 0.5) * 14;
  } else if (h < 52) {
    const t = (h - 26) / 26;
    r = 122 + (90 - 122) * t;
    g = 106 + (84 - 106) * t;
    b = 88 + (66 - 88) * t;
  } else {
    [r, g, b] = [232, 236, 242]; // snow on the high peaks
  }
  // Slope shading: steeper faces fall a little darker.
  const shade = 1 - Math.min(0.28, slope * 0.5);
  return `rgb(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(b * shade)})`;
}

export { COLORS };
