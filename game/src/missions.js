// Skycourier — Aurora Isles: the three missions and the score.
// Missions are small state machines over the plane: rings to thread, strips to
// land on, crates to drop. Each one reports its objective line, its progress
// and the points it has earned so far.

import { MISSIONS, RINGS, RING_RADIUS, STRIPS, DROP_TARGETS } from './config.js';
import { angleDiff } from './flight.js';
import { heightAt } from './terrain.js';

export function makeMission(missionId) {
  const def = MISSIONS.find((m) => m.id === missionId) || MISSIONS[0];
  const state = {
    def,
    startedAt: 0,
    elapsed: 0,
    score: 0,
    complete: false,
    failed: false,
    message: '',
    messageUntil: 0,
    // Rings
    ringIndex: 0,
    ringsPassed: 0,
    // Island hop
    hopIndex: 0,
    hopOrder: ['north', 'east', 'home'],
    hopsDone: [],
    // Parcel run
    crates: 3,
    drops: [],
    cratesLanded: 0,
  };
  return state;
}

export function missionObjective(mission) {
  if (mission.def.id === 'rings') {
    return `Ring ${Math.min(mission.ringIndex + 1, RINGS.length)} of ${RINGS.length}`;
  }
  if (mission.def.id === 'island-hop') {
    const next = mission.hopOrder[mission.hopIndex];
    const strip = STRIPS.find((s) => s.id === next);
    return next ? `Land at ${strip.name} (${mission.hopIndex + 1}/3)` : 'All strips visited';
  }
  const done = mission.drops.filter((d) => d.scored).length;
  return `Crates on target: ${done}/3  ·  ${mission.crates} left`;
}

function say(mission, text, now, seconds = 3) {
  mission.message = text;
  mission.messageUntil = now + seconds;
}

// Ring pass: the plane flies within the ring's disc (3D distance to the ring
// centre under its radius plus a small margin). Rings sit far apart, so this
// can only trigger at the ring itself, never on the way to the next one.
function ringPassed(plane, ring) {
  const dx = plane.x - ring.x;
  const dz = plane.z - ring.z;
  const dy = plane.y - ring.y;
  return Math.sqrt(dx * dx + dz * dz + dy * dy) < RING_RADIUS + 4;
}

export function updateMission(mission, plane, dt, events) {
  mission.elapsed += dt;
  if (mission.complete || mission.failed) return;

  if (mission.def.id === 'rings') {
    if (mission.ringIndex < RINGS.length) {
      const ring = RINGS[mission.ringIndex];
      if (ringPassed(plane, ring)) {
        mission.ringIndex++;
        mission.ringsPassed++;
        const bonus = 100 + Math.max(0, 40 - Math.round(mission.elapsed));
        mission.score += bonus;
        events.push({ type: 'ring', text: `Ring ${mission.ringsPassed} — +${bonus}` });
        say(mission, `Ring ${mission.ringsPassed} of ${RINGS.length}!`, plane.time);
        if (mission.ringIndex >= RINGS.length) {
          mission.complete = true;
          const timeBonus = Math.max(0, (mission.def.par - mission.elapsed) * 4);
          mission.score += Math.round(timeBonus);
          events.push({ type: 'complete', text: `Course clear — time bonus +${Math.round(timeBonus)}` });
        }
      }
    }
  }

  if (mission.def.id === 'island-hop') {
    if (!plane.landed) mission._countedLanding = false;
    if (plane.landed && !mission._countedLanding) {
      mission._countedLanding = true;
      const want = mission.hopOrder[mission.hopIndex];
      if (plane.landedStrip === want) {
        const smooth = Math.max(0, 200 + Math.round(plane.touchdownVy * 40));
        const points = 250 + smooth;
        mission.score += points;
        mission.hopsDone.push(want);
        mission.hopIndex++;
        events.push({ type: 'land', text: `Down at ${STRIPS.find((s) => s.id === want).name} — +${points}` });
        say(mission, `Landed — ${mission.hopsDone.length} of 3 strips.`, plane.time, 4);
        if (mission.hopIndex >= mission.hopOrder.length) {
          mission.complete = true;
          const fuelBonus = Math.round(plane.fuel * 2);
          mission.score += fuelBonus;
          events.push({ type: 'complete', text: `Mail delivered — fuel bonus +${fuelBonus}` });
        }
      } else {
        say(mission, 'Wrong strip — the mailbag goes to the next one on the list.', plane.time, 4);
      }
    }
    if (plane.crashed) mission.failed = true;
  }

  if (mission.def.id === 'parcel-run') {
    for (const crate of mission.drops) {
      if (crate.landed || crate.done) continue;
      crate.vy -= 9.8 * dt;
      crate.y += crate.vy * dt;
      // The crate is a draggy box, not a dart: its forward speed bleeds off
      // quickly, so it lands near where the pilot let it go, not a hundred
      // metres past the smoke.
      const drag = Math.max(0, 1 - 0.8 * dt);
      crate.vx *= drag;
      crate.vz *= drag;
      crate.x += crate.vx * dt;
      crate.z += crate.vz * dt;
      const ground = heightAt(crate.x, crate.z);
      if (crate.y <= ground + 0.5) {
        crate.y = ground + 0.5;
        crate.landed = true;
        const target = DROP_TARGETS.find((t) => t.id === crate.targetId);
        const dist = Math.hypot(crate.x - target.x, crate.z - target.z);
        if (dist <= target.radius) {
          const points = 300 + Math.max(0, Math.round((target.radius - dist) * 6));
          mission.score += points;
          crate.scored = true;
          events.push({ type: 'drop', text: `On target at ${target.name} — +${points}` });
          say(mission, `Direct hit at ${target.name}!`, plane.time);
        } else {
          events.push({ type: 'drop', text: `Crate missed ${target.name} by ${Math.round(dist)} m` });
          say(mission, `Missed ${target.name} by ${Math.round(dist)} m.`, plane.time);
        }
        mission.cratesLanded++;
        if (mission.cratesLanded >= 3) {
          mission.complete = true;
          const fuelBonus = Math.round(plane.fuel * 2);
          mission.score += fuelBonus;
          events.push({ type: 'complete', text: `All outposts supplied — fuel bonus +${fuelBonus}` });
        }
      }
    }
    if (plane.crashed) mission.failed = true;
  }

  if (mission.def.id === 'rings' && plane.crashed) mission.failed = true;
}

// Drop a crate from the plane. Returns the crate or null.
export function dropCrate(mission, plane) {
  if (mission.def.id !== 'parcel-run' || mission.crates <= 0 || mission.complete) return null;
  mission.crates--;
  // Aim at the nearest un-supplied target.
  let best = null;
  let bestDist = Infinity;
  for (const target of DROP_TARGETS) {
    if (mission.drops.some((d) => d.targetId === target.id && d.scored)) continue;
    const dist = Math.hypot(plane.x - target.x, plane.z - target.z);
    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }
  const crate = {
    x: plane.x,
    y: plane.y - 1,
    z: plane.z,
    vx: Math.sin(plane.heading) * plane.speed * 0.9,
    vz: -Math.cos(plane.heading) * plane.speed * 0.9,
    vy: plane.vy * 0.5,
    groundY: 0,
    targetId: best ? best.id : DROP_TARGETS[0].id,
    landed: false,
    scored: false,
    done: false,
  };
  mission.drops.push(crate);
  return crate;
}

export { angleDiff };
