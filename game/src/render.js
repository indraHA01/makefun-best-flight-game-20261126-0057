// Skycourier — Aurora Isles: the world renderer.
// A true 3D projection (chase camera behind the plane) drawn with plain
// canvas 2D: a painter-sorted terrain mesh, the sea, the golden-hour sky with
// aurora bands, the runway, the rings, the drop targets and the clouds.
// No image assets, no library: every pixel is computed from the terrain.

import { COLORS, STRIPS, RINGS, RING_RADIUS, DROP_TARGETS } from './config.js';
import { heightAt, groundColor, stripAt } from './terrain.js';
import { mulberry32 } from './noise.js';

const FOV = 1.22; // about 70 degrees
const CELL = 30; // terrain mesh cell size in metres
const VIEW = 460; // how far the mesh reaches around the plane

// Fixed cloud field, seeded so the sky never changes between runs.
const cloudRand = mulberry32(777);
export const CLOUDS = [];
for (let i = 0; i < 16; i++) {
  CLOUDS.push({
    x: (cloudRand() - 0.5) * 5200,
    z: (cloudRand() - 0.5) * 5200,
    y: 170 + cloudRand() * 130,
    r: 50 + cloudRand() * 70,
  });
}

// The chase camera: behind the plane and above it, looking where it flies,
// rolling a little with the bank so the horizon leans into the turn.
export function makeCamera(plane, width, height) {
  const pitch = plane.pitch * 0.7;
  const roll = plane.roll * 0.45;
  const heading = plane.heading;
  const fx = Math.sin(heading) * Math.cos(pitch);
  const fz = -Math.cos(heading) * Math.cos(pitch);
  const fy = Math.sin(pitch);
  const cam = {
    x: plane.x - fx * 15,
    y: plane.y + 4.5 - fy * 15,
    z: plane.z - fz * 15,
    heading,
    pitch,
    roll,
    f: (height / 2) / Math.tan(FOV / 2),
    width,
    height,
  };
  // Basis: right and up, rolled by the bank. Positive roll = bank right,
  // which tilts the camera's up vector toward the right wing.
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const rx = Math.cos(heading);
  const rz = Math.sin(heading);
  cam.right = [rx * cosR, -sinR, rz * cosR];
  cam.up = [rx * sinR, cosR, rz * sinR];
  cam.fwd = [fx, fy, fz];
  return cam;
}

// Project a world point to screen space. Returns null when behind the lens.
export function project(cam, x, y, z) {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const dz = z - cam.z;
  const cx = dx * cam.right[0] + dy * cam.right[1] + dz * cam.right[2];
  const cy = dx * cam.up[0] + dy * cam.up[1] + dz * cam.up[2];
  const cz = dx * cam.fwd[0] + dy * cam.fwd[1] + dz * cam.fwd[2];
  if (cz < 1.2) return null;
  return {
    x: cam.width / 2 + (cx / cz) * cam.f,
    y: cam.height / 2 - (cy / cz) * cam.f,
    dist: cz,
  };
}

// Screen y of the horizon at the centre of the frame.
export function horizonY(cam) {
  return cam.height / 2 - Math.tan(cam.pitch) * Math.cos(cam.roll) * cam.f;
}

function horizonSlope(cam) {
  return -Math.tan(cam.roll);
}

export function drawSky(ctx, cam, time) {
  const { width: W, height: H } = cam;
  const hy = horizonY(cam);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(0.45, COLORS.skyMid);
  grad.addColorStop(0.72, COLORS.skyLow);
  grad.addColorStop(1, '#2a1e3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // The sun: low in the west, a warm disc with a wide glow.
  const sunDir = [Math.sin(4.4) * 0.98, 0.17, -Math.cos(4.4) * 0.98];
  const sun = project(cam, cam.x + sunDir[0] * 4000, cam.y + sunDir[1] * 4000, cam.z + sunDir[2] * 4000);
  if (sun) {
    const glow = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 260);
    glow.addColorStop(0, 'rgba(255, 214, 130, 0.85)');
    glow.addColorStop(0.25, 'rgba(255, 179, 71, 0.35)');
    glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sun.x - 260, sun.y - 260, 520, 520);
    ctx.fillStyle = COLORS.sunCore;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Aurora bands: two slow green-teal ribbons high in the sky.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let band = 0; band < 2; band++) {
    const baseY = hy * (0.28 + band * 0.16);
    const amp = 26 + band * 12;
    const gradA = ctx.createLinearGradient(0, baseY - 60, 0, baseY + 60);
    gradA.addColorStop(0, 'rgba(92, 242, 184, 0)');
    gradA.addColorStop(0.5, band === 0 ? 'rgba(92, 242, 184, 0.30)' : 'rgba(126, 200, 255, 0.24)');
    gradA.addColorStop(1, 'rgba(92, 242, 184, 0)');
    ctx.strokeStyle = gradA;
    ctx.lineWidth = 46;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 16) {
      const y = baseY + Math.sin(x * 0.004 + time * 0.11 + band * 2.1) * amp
        + Math.sin(x * 0.0013 - time * 0.05 + band) * 18;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSea(ctx, cam, time) {
  const { width: W, height: H } = cam;
  const hy = horizonY(cam);
  const slope = horizonSlope(cam);
  // The sea is the half-plane below the horizon line.
  const yLeft = hy - (0 - W / 2) * slope;
  const yRight = hy - (W - W / 2) * slope;
  const grad = ctx.createLinearGradient(0, Math.min(yLeft, yRight), 0, H);
  grad.addColorStop(0, COLORS.seaShallow);
  grad.addColorStop(0.25, '#1d5a74');
  grad.addColorStop(1, COLORS.seaDeep);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, yLeft);
  ctx.lineTo(W, yRight);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Sun glint: a shimmering band on the water under the sun.
  const sunX = W * 0.72;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffcf7d';
  for (let i = 0; i < 26; i++) {
    const yy = hy + 12 + i * i * 0.55 + ((time * 7 + i * 37) % 9);
    const ww = 8 + i * 7 + Math.sin(time * 1.3 + i * 2.4) * 6;
    ctx.fillRect(sunX - ww / 2, yy, ww, 2.5);
  }
  ctx.restore();
}

// The terrain mesh: axis-aligned quads around the plane, painter-sorted so
// far ground is drawn first and near ground covers it.
export function drawTerrain(ctx, cam, plane) {
  const x0 = Math.floor((plane.x - VIEW) / CELL) * CELL;
  const x1 = plane.x + VIEW;
  const z0 = Math.floor((plane.z - VIEW) / CELL) * CELL;
  const z1 = plane.z + VIEW;
  const quads = [];
  for (let x = x0; x < x1; x += CELL) {
    for (let z = z0; z < z1; z += CELL) {
      const h00 = heightAt(x, z);
      const h10 = heightAt(x + CELL, z);
      const h01 = heightAt(x, z + CELL);
      const h11 = heightAt(x + CELL, z + CELL);
      const cx = x + CELL / 2;
      const cz = z + CELL / 2;
      const ch = (h00 + h10 + h01 + h11) / 4;
      const dx = cx - cam.x;
      const dz = cz - cam.z;
      const dist = dx * dx + dz * dz;
      quads.push({ x, z, h00, h10, h01, h11, ch, dist });
    }
  }
  quads.sort((a, b) => b.dist - a.dist);
  // Trees: a deterministic sprinkle on grassy ground, never on a strip.
  // Hashed from the cell coordinates so the forest never moves between runs.
  const trees = [];
  for (const q of quads) {
    if (q.dist > 320 * 320 || q.ch < 3 || q.ch > 26) continue;
    const hash = fract(Math.sin(q.x * 12.9898 + q.z * 78.233) * 43758.5453);
    if (hash > 0.32) continue;
    const tx = q.x + 6 + hash * 18;
    const tz = q.z + 6 + fract(hash * 91.7) * 18;
    if (stripAt(tx, tz)) continue;
    trees.push({ x: tx, z: tz, h: heightAt(tx, tz), dist: q.dist });
  }
  trees.sort((a, b) => b.dist - a.dist);
  for (const q of quads) {
    const p00 = project(cam, q.x, q.h00, q.z);
    const p10 = project(cam, q.x + CELL, q.h10, q.z);
    const p11 = project(cam, q.x + CELL, q.h11, q.z + CELL);
    const p01 = project(cam, q.x, q.h01, q.z + CELL);
    if (!p00 || !p10 || !p11 || !p01) continue;
    const slope = Math.abs(q.h10 - q.h00) + Math.abs(q.h01 - q.h00);
    ctx.fillStyle = groundColor(q.x + CELL / 2, q.z + CELL / 2, q.ch, slope / CELL);
    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();
    ctx.fill();
    // Distance haze: far ground fades toward the evening sky.
    const d = Math.sqrt(q.dist);
    if (d > 320) {
      ctx.fillStyle = `rgba(122, 74, 125, ${Math.min(0.5, (d - 320) / 900)})`;
      ctx.fill();
    }
  }
  // The forest, far trees first so near ones overlap them.
  for (const tree of trees) {
    const p = project(cam, tree.x, tree.h, tree.z);
    if (!p) continue;
    const hPx = Math.max(2, (8 * cam.f) / Math.max(p.dist, 1));
    const wPx = hPx * 0.45;
    ctx.fillStyle = '#5d3a17';
    ctx.fillRect(p.x - wPx * 0.08, p.y - hPx * 0.3, wPx * 0.16, hPx * 0.3);
    ctx.fillStyle = '#2a4a22';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - hPx);
    ctx.lineTo(p.x - wPx, p.y - hPx * 0.25);
    ctx.lineTo(p.x + wPx, p.y - hPx * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3f6b2f';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - hPx * 0.8);
    ctx.lineTo(p.x - wPx * 0.7, p.y - hPx * 0.2);
    ctx.lineTo(p.x + wPx * 0.7, p.y - hPx * 0.2);
    ctx.closePath();
    ctx.fill();
  }
}

function fract(v) {
  return v - Math.floor(v);
}

// The runway: dark asphalt, white centreline dashes, threshold bars, edge
// lights and a windsock that shows the evening breeze.
export function drawRunways(ctx, cam, time) {
  for (const strip of STRIPS) {
    const sin = Math.sin(strip.heading);
    const cos = Math.cos(strip.heading);
    const half = strip.length / 2;
    // Inverse of stripCoords: dx = along*sin + across*cos,
    // dz = -along*cos + across*sin.
    const corner = (across, along) => [
      strip.x + along * sin + across * cos,
      strip.z - along * cos + across * sin,
    ];
    const corners = [
      corner(-13, -half),
      corner(13, -half),
      corner(13, half),
      corner(-13, half),
    ];
    const pts = corners.map(([x, z]) => project(cam, x, strip.elev + 0.4, z));
    if (pts.some((p) => !p)) continue;
    ctx.fillStyle = COLORS.runway;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    // Centreline dashes.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    for (let a = -half + 30; a < half - 20; a += 40) {
      const d1 = project(cam, strip.x + sin * a, strip.elev + 0.5, strip.z - cos * a);
      const d2 = project(cam, strip.x + sin * (a + 16), strip.elev + 0.5, strip.z - cos * (a + 16));
      if (!d1 || !d2) continue;
      ctx.beginPath();
      ctx.moveTo(d1.x, d1.y);
      ctx.lineTo(d2.x, d2.y);
      ctx.stroke();
    }
    // Threshold bars at both ends.
    ctx.lineWidth = 3;
    for (const end of [-half + 8, half - 8]) {
      const t1 = project(cam, strip.x + sin * end - cos * 8, strip.elev + 0.5, strip.z - cos * end - sin * 8);
      const t2 = project(cam, strip.x + sin * end + cos * 8, strip.elev + 0.5, strip.z - cos * end + sin * 8);
      if (!t1 || !t2) continue;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.stroke();
    }
    // Edge lights: warm dots down both sides.
    for (let a = -half + 10; a <= half - 10; a += 40) {
      for (const side of [-13, 13]) {
        const p = project(cam, strip.x + sin * a + cos * side, strip.elev + 1, strip.z - cos * a + sin * side);
        if (!p) continue;
        const tw = 0.6 + 0.4 * Math.sin(time * 2 + a);
        ctx.fillStyle = `rgba(255, 190, 90, ${tw})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Windsock beside the strip: pole and an orange cone in the breeze.
    const wx = strip.x + cos * 26;
    const wz = strip.z + sin * 26;
    const base = project(cam, wx, strip.elev + 0.5, wz);
    const top = project(cam, wx, strip.elev + 9, wz);
    if (base && top) {
      ctx.strokeStyle = '#d8d8d8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
      const wave = Math.sin(time * 1.4) * 0.15;
      const sockEnd = project(cam, wx + 9, strip.elev + 9 - Math.abs(wave) * 2, wz + 3);
      if (sockEnd) {
        ctx.fillStyle = '#ff7a2f';
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(sockEnd.x, sockEnd.y + 3);
        ctx.lineTo(sockEnd.x, sockEnd.y - 3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

// Golden rings: a glowing circle the pilot threads, green once passed.
export function drawRings(ctx, cam, mission, time) {
  const rings = mission && mission.def.id === 'rings' ? RINGS : [];
  rings.forEach((ring, i) => {
    const done = mission.ringIndex > i;
    const active = mission.ringIndex === i;
    const centre = project(cam, ring.x, ring.y, ring.z);
    if (!centre) return;
    // Ring plane faces along the course (toward the next ring).
    const next = RINGS[Math.min(RINGS.length - 1, i + 1)];
    const prev = RINGS[Math.max(0, i - 1)];
    let nx = next.x - prev.x;
    let nz = next.z - prev.z;
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl;
    nz /= nl;
    // Basis in the ring plane: up is world-up minus its along-course part.
    const ux = 0;
    const uy = 1;
    const uz = 0;
    const vx = -nz;
    const vy = 0;
    const vz = nx;
    const pts = [];
    for (let k = 0; k <= 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const px = ring.x + (ux * Math.cos(a) + vx * Math.sin(a)) * RING_RADIUS;
      const py = ring.y + (uy * Math.cos(a) + vy * Math.sin(a)) * RING_RADIUS;
      const pz = ring.z + (uz * Math.cos(a) + vz * Math.sin(a)) * RING_RADIUS;
      const p = project(cam, px, py, pz);
      if (p) pts.push(p);
    }
    if (pts.length < 8) return;
    const pulse = active ? 0.7 + 0.3 * Math.sin(time * 4) : 1;
    ctx.save();
    ctx.globalAlpha = done ? 0.85 : 0.95 * pulse;
    ctx.strokeStyle = done ? COLORS.ringDone : COLORS.ringGold;
    ctx.lineWidth = active ? 6 : 4;
    ctx.shadowColor = done ? COLORS.ringDone : COLORS.ringGold;
    ctx.shadowBlur = active ? 18 : 8;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    // Ring number, floating just above the gate.
    if (!done) {
      const ringScreenR = (RING_RADIUS * cam.f) / Math.max(centre.dist, 1);
      ctx.fillStyle = active ? '#fff' : 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), centre.x, centre.y - ringScreenR - 10);
    }
  });
}

// Drop targets: a painted circle on the ground with a smoke column to find.
export function drawTargets(ctx, cam, mission, time) {
  if (!mission || mission.def.id !== 'parcel-run') return;
  for (const target of DROP_TARGETS) {
    const gy = heightAt(target.x, target.z);
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const p = project(cam, target.x + Math.cos(a) * target.radius, gy + 0.6, target.z + Math.sin(a) * target.radius);
      if (p) pts.push(p);
    }
    if (pts.length < 8) continue;
    const scored = mission.drops.some((d) => d.targetId === target.id && d.scored);
    ctx.fillStyle = scored ? 'rgba(89, 227, 145, 0.30)' : 'rgba(255, 194, 51, 0.28)';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = scored ? COLORS.ringDone : COLORS.ringGold;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Smoke column: puffs that rise and drift with the breeze.
    for (let i = 0; i < 5; i++) {
      const rise = ((time * 6 + i * 9) % 45);
      const px = target.x + rise * 0.25;
      const py = gy + 4 + rise;
      const p = project(cam, px, py, target.z);
      if (!p) continue;
      const size = (8 + rise * 1.1) * (cam.f / Math.max(p.dist, 1)) * 0.3;
      ctx.fillStyle = `rgba(235, 235, 235, ${Math.max(0, 0.55 - rise * 0.011)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2, size), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Falling crates: a small brown box with a dark cross, plus its shadow.
export function drawCrates(ctx, cam, mission) {
  if (!mission) return;
  for (const crate of mission.drops) {
    const p = project(cam, crate.x, crate.y, crate.z);
    if (p) {
      const size = Math.max(3, 420 / Math.max(p.dist, 1));
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      ctx.strokeStyle = '#5d3a17';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
      ctx.beginPath();
      ctx.moveTo(p.x - size / 2, p.y);
      ctx.lineTo(p.x + size / 2, p.y);
      ctx.stroke();
    }
    if (!crate.landed) {
      const gy = heightAt(crate.x, crate.z);
      const shadow = project(cam, crate.x, gy + 0.6, crate.z);
      if (shadow) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(shadow.x, shadow.y, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Clouds: soft white puffs at fixed world positions, drawn last so they
// drift over the terrain and under the plane.
export function drawClouds(ctx, cam, time) {
  for (const cloud of CLOUDS) {
    const p = project(cam, cloud.x, cloud.y, cloud.z);
    if (!p || p.dist < 60) continue;
    const scale = cam.f / p.dist;
    const r = cloud.r * scale * 0.9;
    if (r < 2) continue;
    const drift = Math.sin(time * 0.05 + cloud.x) * 4 * scale;
    ctx.fillStyle = 'rgba(255, 244, 230, 0.82)';
    for (const [ox, oy, s] of [[-0.9, 0.1, 0.7], [0, -0.15, 1], [0.9, 0.1, 0.65], [0.4, 0.25, 0.55]]) {
      ctx.beginPath();
      ctx.ellipse(p.x + ox * r + drift, p.y + oy * r, r * s, r * s * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// The plane's shadow on the ground below it: the one cue that tells the
// pilot exactly how high they are on final approach.
export function drawPlaneShadow(ctx, cam, plane) {
  const ground = heightAt(plane.x, plane.z);
  const p = project(cam, plane.x, ground + 0.7, plane.z);
  if (!p || plane.y - ground < 2) return;
  const heightFactor = Math.max(0.15, 1 - (plane.y - ground) / 220);
  const rx = 26 * heightFactor * (cam.f / Math.max(p.dist, 1)) * 0.35;
  ctx.fillStyle = `rgba(0, 0, 0, ${0.32 * heightFactor})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, Math.max(3, rx), Math.max(1.5, rx * 0.35), 0, 0, Math.PI * 2);
  ctx.fill();
}

export { stripAt };
