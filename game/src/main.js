// Skycourier — Aurora Isles: bootstrap, game loop and state machine.
// States: menu → flying ⇄ paused → debrief. The world renders behind the
// menu (a slow orbit over Home Isle), the loop is fixed-step at 60 Hz, and
// every frame ends by draining the input queues so a key press never fires
// twice. A ?shot= query poses the game for a screenshot; a ?selftest=1 query
// writes the result into the document title for the harness to read.

import { STRIPS, MISSIONS } from './config.js';
import { makePlane, placeOnStrip, stepFlight } from './flight.js';
import { makeMission, updateMission, dropCrate } from './missions.js';
import { makeInput, attachInput, readFlightInput, wasPressed, endFrameInput } from './input.js';
import { makeAudio, ensureAudio, updateAudio, playChime, playThud, playCrash, playClick, toggleMute } from './audio.js';
import {
  makeCamera, drawSky, drawSea, drawTerrain, drawRunways,
  drawRings, drawTargets, drawCrates, drawClouds, drawPlaneShadow,
} from './render.js';
import { drawPlane } from './plane.js';
import { drawHud, drawMenu, drawDebrief, drawPaused } from './hud.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const selftest = params.get('selftest') === '1';

const game = {
  state: 'menu',
  plane: makePlane(),
  mission: makeMission('rings'),
  missionIndex: 0,
  input: makeInput(),
  audio: makeAudio(),
  events: [],
  menuRects: [],
  menuTime: 0,
  time: 0,
  best: 0,
  shot: shotName,
  shotClock: 0,
};

attachInput(game.input, canvas);
placeOnStrip(game.plane, STRIPS[0]);

function startMission(index) {
  game.missionIndex = index;
  game.mission = makeMission(MISSIONS[index].id);
  game.plane = makePlane();
  placeOnStrip(game.plane, STRIPS[0]);
  game.events = [];
  game.state = 'flying';
  ensureAudio(game.audio);
  playClick(game.audio);
}

function backToMenu() {
  game.state = 'menu';
  game.plane = makePlane();
  placeOnStrip(game.plane, STRIPS[0]);
  game.mission = makeMission(MISSIONS[game.missionIndex].id);
  game.events = [];
}

// Menu orbit: the camera drifts slowly over Home Isle behind the title.
function menuPlane(time) {
  const p = game.plane;
  const a = time * 0.045;
  p.x = Math.sin(a) * 420;
  p.z = Math.cos(a) * 420;
  p.y = 150 + Math.sin(time * 0.11) * 12;
  p.heading = a + Math.PI / 2 + Math.PI;
  p.pitch = 0.02;
  p.roll = 0.22;
  p.speed = 34;
  p.throttle = 0.55;
  p.airborne = true;
  return p;
}

function handleMenuInput() {
  const input = game.input;
  if (wasPressed(input, 'mission1')) startMission(0);
  else if (wasPressed(input, 'mission2')) startMission(1);
  else if (wasPressed(input, 'mission3')) startMission(2);
  else if (wasPressed(input, 'confirm')) startMission(game.missionIndex);
  for (const click of input.clicks) {
    for (const rect of game.menuRects) {
      if (click.x >= rect.x && click.x <= rect.x + rect.w && click.y >= rect.y && click.y <= rect.y + rect.h) {
        startMission(MISSIONS.findIndex((m) => m.id === rect.mission));
      }
    }
  }
}

function handleFlyingInput(dt) {
  const input = game.input;
  const plane = game.plane;
  if (wasPressed(input, 'pause')) {
    game.state = 'paused';
    return;
  }
  if (wasPressed(input, 'mute')) toggleMute(game.audio);
  if (wasPressed(input, 'flaps')) plane.flaps = !plane.flaps;
  if (wasPressed(input, 'gear')) plane.gearDown = !plane.gearDown;
  if (wasPressed(input, 'drop')) {
    const crate = dropCrate(game.mission, plane);
    if (crate) {
      game.events.push({ type: 'drop', text: `Crate away over ${crate.targetId} — watch the smoke` });
      playClick(game.audio);
    }
  }
  if (wasPressed(input, 'restart')) {
    startMission(game.missionIndex);
    return;
  }
  const flight = readFlightInput(input, canvas);
  if (flight.brake) plane.speed = Math.max(8, plane.speed - 14 * dt);
  stepFlight(plane, flight, dt);
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'ring' || event.type === 'drop') playChime(game.audio);
    if (event.type === 'land') playThud(game.audio);
    if (event.type === 'complete') playChime(game.audio);
  }
}

function update(dt) {
  const input = game.input;
  game.time += dt;
  if (game.shot) game.shotClock += dt;

  if (game.state === 'menu') {
    if (!game.shot) game.menuTime += dt; // a posed shot freezes the orbit
    handleMenuInput();
    menuPlane(game.menuTime);
  } else if (game.state === 'flying') {
    handleFlyingInput(dt);
    const events = [];
    updateMission(game.mission, game.plane, dt, events);
    handleEvents(events);
    game.events.push(...events);
    if (game.events.length > 6) game.events.splice(0, game.events.length - 6);
    if (game.plane.crashed) {
      playCrash(game.audio);
      game.state = 'debrief';
    } else if (game.mission.complete) {
      game.best = Math.max(game.best, game.mission.score);
      game.state = 'debrief';
    }
  } else if (game.state === 'paused') {
    if (wasPressed(input, 'pause')) game.state = 'flying';
  } else if (game.state === 'debrief') {
    if (wasPressed(input, 'restart')) startMission(game.missionIndex);
    else if (wasPressed(input, 'mission1')) startMission(0);
    else if (wasPressed(input, 'mission2')) startMission(1);
    else if (wasPressed(input, 'mission3')) startMission(2);
    else if (wasPressed(input, 'confirm')) backToMenu();
  }
  updateAudio(game.audio, game.plane);
}

function render() {
  const W = canvas.width;
  const H = canvas.height;
  const time = game.shot ? 8 : game.time;
  const plane = game.state === 'menu' ? menuPlane(game.shot ? 8 : game.menuTime) : game.plane;
  const cam = makeCamera(plane, W, H);

  drawSky(ctx, cam, time);
  drawSea(ctx, cam, time);
  drawTerrain(ctx, cam, plane);
  drawRunways(ctx, cam, time);
  drawTargets(ctx, cam, game.mission, time);
  drawRings(ctx, cam, game.mission, time);
  drawCrates(ctx, cam, game.mission);
  drawPlaneShadow(ctx, cam, plane);
  drawClouds(ctx, cam, time);
  drawPlane(ctx, plane, W, H, time);

  if (game.state === 'menu') {
    game.menuRects = drawMenu(ctx, W, H, time, game.input);
  } else if (game.state === 'flying' || game.state === 'paused') {
    drawHud(ctx, game.plane, game.mission, game.events, W, H, time);
    if (game.state === 'paused') drawPaused(ctx, W, H);
  } else if (game.state === 'debrief') {
    drawHud(ctx, game.plane, game.mission, game.events, W, H, time);
    drawDebrief(ctx, game.plane, game.mission, W, H);
  }

  // Screen-reader status line: the game narrates itself, quietly.
  const status = game.state === 'flying'
    ? `Flying ${game.mission.def.name}. Altitude ${Math.round(game.plane.y * 3.28)} feet, speed ${Math.round(game.plane.speed * 1.94)} knots, score ${game.mission.score}.`
    : game.state === 'menu'
      ? 'Skycourier Aurora Isles. Choose a mission to fly.'
      : game.state === 'paused'
        ? 'Paused.'
        : game.mission.complete ? 'Sortie complete.' : 'Aircraft down.';
  if (statusEl.textContent !== status) statusEl.textContent = status;
}

// Fixed-step loop: 60 Hz physics, render every animation frame.
let last = performance.now();
let accumulator = 0;
function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  accumulator += elapsed;
  while (accumulator >= 1 / 60) {
    update(1 / 60);
    accumulator -= 1 / 60;
  }
  render();
  endFrameInput(game.input);
  if (selftest) document.title = 'SKYCOURIER OK';
  window.__shotReady = true;
  requestAnimationFrame(frame);
}

// A posed screenshot freezes the clock at golden hour and never advances the
// menu orbit, so the frame is identical on every capture.
if (shotName) {
  applyShot(game, shotName);
  game.menuTime = 8;
}
canvas.addEventListener('pointerdown', () => ensureAudio(game.audio), { once: true });
window.addEventListener('keydown', () => ensureAudio(game.audio), { once: true });
requestAnimationFrame(frame);
