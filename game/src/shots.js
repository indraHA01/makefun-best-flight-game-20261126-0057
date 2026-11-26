// Skycourier — Aurora Isles: deterministic screenshot setups.
// ?shot=menu | flight | approach | drop poses the game for a still frame:
// the same seed, the same time of day and the same flight state every time,
// so a screenshot taken today matches one taken tomorrow. The game itself
// never reads these outside the shot query parameter.

import { STRIPS, RINGS } from './config.js';
import { placeOnStrip } from './flight.js';
import { makeMission, dropCrate } from './missions.js';
import { heightAt } from './terrain.js';

export const SHOT_NAMES = ['menu', 'flight', 'approach', 'drop'];

// Put the game in a posed state and return the frozen clock the shot uses.
export function applyShot(game, name) {
  const { plane } = game;
  if (name === 'menu') {
    game.state = 'menu';
    game.menuTime = 8; // frozen golden-hour moment behind the title
    placeOnStrip(plane, STRIPS[0]);
    return 8;
  }
  if (name === 'flight') {
    game.state = 'flying';
    game.mission = makeMission('rings');
    // On the run-in to ring 3: the next golden gate fills the frame ahead.
    const ring = RINGS[2];
    const prev = RINGS[1];
    const dx = ring.x - prev.x;
    const dz = ring.z - prev.z;
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    plane.x = ring.x - ux * 260;
    plane.z = ring.z - uz * 260;
    plane.y = ring.y + 6;
    plane.heading = Math.atan2(ux, -uz);
    plane.pitch = 0.02;
    plane.roll = 0.12;
    plane.speed = 40;
    plane.throttle = 0.72;
    plane.airborne = true;
    plane.fuel = 78;
    game.mission.ringIndex = 2;
    game.mission.ringsPassed = 2;
    game.mission.score = 240;
    game.mission.elapsed = 47;
    return 8;
  }
  if (name === 'approach') {
    game.state = 'flying';
    game.mission = makeMission('island-hop');
    // Short final for Home Strip: gear down, flaps out, runway filling the
    // frame ahead. Close enough that the threshold bars read clearly.
    plane.x = 8;
    plane.z = 430;
    plane.y = 38;
    plane.heading = 0;
    plane.pitch = -0.05;
    plane.roll = -0.03;
    plane.speed = 30;
    plane.throttle = 0.34;
    plane.gearDown = true;
    plane.flaps = true;
    plane.airborne = true;
    plane.fuel = 61;
    game.mission.elapsed = 233;
    game.mission.score = 540;
    game.mission.hopIndex = 2;
    game.mission.hopsDone = ['north', 'east'];
    return 8;
  }
  if (name === 'drop') {
    game.state = 'flying';
    game.mission = makeMission('parcel-run');
    // High over Gull Rock with a crate already away: the painted target
    // circle and its smoke column sit in the frame ahead of the plane.
    plane.x = -1250;
    plane.z = 1380;
    plane.y = 260;
    plane.heading = 0; // straight north, toward Gull Rock (-1250, 780)
    plane.pitch = 0.04;
    plane.roll = 0.18;
    plane.speed = 36;
    plane.throttle = 0.6;
    plane.airborne = true;
    plane.fuel = 44;
    game.mission.crates = 3;
    game.mission.score = 360;
    game.mission.elapsed = 141;
    const crate = dropCrate(game.mission, plane);
    if (crate) {
      // Offset to the side so the crate does not hide behind the airframe.
      crate.x = plane.x + 42;
      crate.y = plane.y - 25;
      crate.vy = -6;
    }
    return 8;
  }
  return 0;
}

export { heightAt };
