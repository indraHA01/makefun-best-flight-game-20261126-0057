// Skycourier — Aurora Isles: the flight model.
// An arcade model with real bones: speed chases the throttle, the wing stalls
// below stall speed, bank turns the nose, and the ground is always waiting.
// Units: metres, seconds, radians. Heading 0 = north (-z).

import { PHYS } from './config.js';
import { heightAt, stripAt, isWater } from './terrain.js';

export function makePlane() {
  return {
    x: 0,
    y: 8,
    z: 240, // parked at the south end of Home Strip, facing north
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    vy: 0,
    throttle: 0,
    fuel: PHYS.fuelCapacity,
    damage: 0,
    gearDown: true,
    flaps: false,
    airborne: false,
    crashed: false,
    landed: false,
    landedStrip: null,
    crashReason: '',
    touchdownVy: 0,
    touchdownSpeed: 0,
    time: 0,
  };
}

// Place the plane at the start of a strip, facing down its heading.
export function placeOnStrip(plane, strip, along = null) {
  const start = along === null ? strip.length / 2 - 40 : along;
  const sin = Math.sin(strip.heading);
  const cos = Math.cos(strip.heading);
  plane.x = strip.x - sin * start;
  plane.z = strip.z - cos * start;
  plane.y = strip.elev + 2;
  plane.heading = strip.heading;
  plane.pitch = 0;
  plane.roll = 0;
  plane.speed = 0;
  plane.vy = 0;
  plane.throttle = 0;
  plane.fuel = PHYS.fuelCapacity;
  plane.damage = 0;
  plane.gearDown = true;
  plane.flaps = false;
  plane.airborne = false;
  plane.crashed = false;
  plane.landed = false;
  plane.landedStrip = null;
  plane.crashReason = '';
}

// One physics step. input: {pitch, roll, throttleUp, throttleDown, flaps, gear}.
export function stepFlight(plane, input, dt) {
  if (plane.crashed) return;
  plane.time += dt;

  // On the ground after a landing: roll along the strip, refuel, and lift off
  // again when the pilot pulls up with enough speed (island-hop needs this).
  if (plane.landed) {
    if (input.throttleUp) plane.throttle += 0.7 * dt;
    if (input.throttleDown) plane.throttle -= 0.9 * dt;
    plane.throttle = Math.max(0, Math.min(1, plane.throttle));
    const targetSpeed = plane.throttle * 42;
    plane.speed += (targetSpeed - plane.speed) * 0.6 * dt;
    plane.x += Math.sin(plane.heading) * plane.speed * dt;
    plane.z += -Math.cos(plane.heading) * plane.speed * dt;
    plane.y = heightAt(plane.x, plane.z) + 1.6;
    plane.fuel = Math.min(PHYS.fuelCapacity, plane.fuel + 6 * dt); // ground crew refuels
    if (plane.speed > 28 && input.pitch > 0.15) {
      plane.landed = false;
      plane.airborne = true;
      plane.pitch = 0.12;
    }
    return;
  }

  // Throttle lever.
  if (input.throttleUp) plane.throttle += 0.7 * dt;
  if (input.throttleDown) plane.throttle -= 0.9 * dt;
  plane.throttle = Math.max(0, Math.min(1, plane.throttle));
  if (plane.fuel <= 0) plane.throttle = 0;

  // Attitude chases the stick, with authority that grows with airspeed.
  const authority = Math.min(1, plane.speed / 24 + 0.25);
  const pitchTarget = input.pitch * PHYS.maxPitch * authority;
  const rollTarget = input.roll * PHYS.maxRoll * authority;
  plane.pitch += clamp(pitchTarget - plane.pitch, -PHYS.pitchRate * dt, PHYS.pitchRate * dt);
  plane.roll += clamp(rollTarget - plane.roll, -PHYS.rollRate * dt, PHYS.rollRate * dt);
  if (!input.roll) plane.roll *= Math.max(0, 1 - 1.4 * dt); // wings level themselves

  // Turn: bank pulls the nose around, faster when slow. Banking right
  // (positive roll) turns the nose to the right (heading increases).
  const turnRate = Math.tan(plane.roll) * 9.81 / Math.max(plane.speed, 12) * PHYS.turnFactor;
  plane.heading += turnRate * dt;

  // Speed chases the throttle; diving adds speed, climbing costs it.
  let targetSpeed = 12 + plane.throttle * (PHYS.maxSpeed - 12);
  targetSpeed += -Math.sin(plane.pitch) * 16;
  plane.speed += (targetSpeed - plane.speed) * PHYS.accel * dt;
  plane.speed = Math.max(0, plane.speed);

  // Climb and sink. Flaps add lift, so the wing keeps flying slower with
  // them out; below the (flap-adjusted) stall speed the nose drops.
  const stallSpeed = plane.flaps ? PHYS.stallSpeed - 4 : PHYS.stallSpeed;
  const stalled = plane.speed < stallSpeed && plane.airborne;
  let vy = plane.speed * Math.sin(plane.pitch) * PHYS.climbFactor;
  if (stalled) {
    vy -= (stallSpeed - plane.speed) * 0.9;
    plane.pitch -= 0.5 * dt; // the nose drops on its own
  }
  if (!plane.airborne && plane.speed < 22) vy = 0; // still rolling on the strip
  plane.vy = vy;

  const forwardX = Math.sin(plane.heading) * Math.cos(plane.pitch);
  const forwardZ = -Math.cos(plane.heading) * Math.cos(plane.pitch);
  plane.x += forwardX * plane.speed * dt;
  plane.z += forwardZ * plane.speed * dt;
  plane.y += vy * dt;

  if (plane.speed > 24 && plane.y > heightAt(plane.x, plane.z) + 2) plane.airborne = true;

  // Fuel: the throttle drinks, the glide sips.
  plane.fuel -= (PHYS.fuelBurnBase + plane.throttle * PHYS.fuelBurnThrottle) * dt;
  if (plane.fuel < 0) plane.fuel = 0;

  // The ground arrives. Over open water the surface is the sea itself,
  // not the seabed eight metres below it.
  const ground = heightAt(plane.x, plane.z);
  const surface = isWater(plane.x, plane.z) ? 0.5 : ground;
  if (plane.y <= surface + 1.6) {
    plane.y = surface + 1.6;
    resolveTouchdown(plane, ground);
  }
}

function resolveTouchdown(plane, ground) {
  const strip = stripAt(plane.x, plane.z);
  const onWater = isWater(plane.x, plane.z);
  const vy = plane.vy;
  const speed = plane.speed;
  plane.touchdownVy = vy;
  plane.touchdownSpeed = speed;

  if (onWater) {
    plane.crashed = true;
    plane.crashReason = 'Ditched in the sea';
    plane.damage = 100;
    return;
  }

  const aligned = strip
    ? Math.abs(angleDiff(plane.heading, strip.heading)) < 0.35 ||
      Math.abs(angleDiff(plane.heading, strip.heading + Math.PI)) < 0.35
    : false;

  if (strip && aligned && vy > PHYS.crashVy && speed < PHYS.maxLandSpeed && plane.gearDown) {
    // A landing. Hard ones still cost airframe.
    plane.landed = true;
    plane.landedStrip = strip.id;
    plane.speed = Math.max(0, speed - 6);
    if (vy < PHYS.hardVy) {
      plane.damage += Math.round((-vy - 3.8) * 12);
      plane.crashReason = 'Hard landing';
    }
    if (plane.damage >= 100) {
      plane.crashed = true;
      plane.landed = false;
      plane.crashReason = 'Airframe broke up on landing';
    }
    return;
  }

  // Anything else touching the ground at speed is a crash.
  if (plane.airborne || speed > 8) {
    plane.crashed = true;
    plane.damage = 100;
    plane.crashReason = strip && !aligned
      ? 'Landed across the strip'
      : vy < PHYS.crashVy
        ? 'Came down too hard'
        : 'Hit the ground';
    return;
  }

  // Slow taxi-speed contact: just roll to a stop on the grass.
  plane.speed = Math.max(0, speed - 10);
  plane.y = ground + 1.6;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Knots and feet, for the instruments the pilot actually reads.
export function knots(ms) {
  return Math.round(ms * 1.94384);
}
export function feet(m) {
  return Math.round(m * 3.28084);
}
