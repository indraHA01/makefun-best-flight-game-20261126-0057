// Skycourier — Aurora Isles: keyboard and mouse.
// W/S (or Up/Down) pitch the nose, A/D (or Left/Right) bank the wings,
// Shift/Ctrl work the throttle, F flaps, G gear, B drops a crate, Space is
// the airbrake. The mouse steers gently too: hold the left button and the
// plane follows the cursor. Clicks on menu buttons are reported as {x, y}.

export function makeInput() {
  return {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mouseSteer: false,
    clicks: [], // {x, y} in canvas pixels, consumed by the menu each frame
    pressed: new Set(), // keys pressed since last frame (edge-triggered)
  };
}

const KEYMAP = {
  KeyW: 'pitchUp',
  ArrowUp: 'pitchUp',
  KeyS: 'pitchDown',
  ArrowDown: 'pitchDown',
  KeyA: 'rollLeft',
  ArrowLeft: 'rollLeft',
  KeyD: 'rollRight',
  ArrowRight: 'rollRight',
  ShiftLeft: 'throttleUp',
  ShiftRight: 'throttleUp',
  ControlLeft: 'throttleDown',
  ControlRight: 'throttleDown',
  KeyF: 'flaps',
  KeyG: 'gear',
  KeyB: 'drop',
  Space: 'brake',
  KeyP: 'pause',
  KeyM: 'mute',
  KeyR: 'restart',
  Enter: 'confirm',
  Digit1: 'mission1',
  Digit2: 'mission2',
  Digit3: 'mission3',
};

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    const action = KEYMAP[event.code];
    if (!action) return;
    if (!event.repeat) input.pressed.add(action);
    input.keys.add(action);
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
    input.mouseDown = true;
    input.clicks.push({ x: input.mouseX, y: input.mouseY });
  });
  window.addEventListener('pointerup', () => {
    input.mouseDown = false;
  });
}

// Flight controls for this frame: -1..1 stick deflections plus switches.
export function readFlightInput(input, canvas) {
  let pitch = 0;
  let roll = 0;
  if (input.keys.has('pitchUp')) pitch += 1;
  if (input.keys.has('pitchDown')) pitch -= 1;
  if (input.keys.has('rollLeft')) roll -= 1;
  if (input.keys.has('rollRight')) roll += 1;
  // Mouse steer: holding the button banks and pitches toward the cursor.
  if (input.mouseDown && input.mouseSteer) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    roll += clamp((input.mouseX - cx) / (cx * 0.8), -1, 1);
    pitch += clamp((cy - input.mouseY) / (cy * 0.8), -1, 1);
  }
  return {
    pitch: clamp(pitch, -1, 1),
    roll: clamp(roll, -1, 1),
    throttleUp: input.keys.has('throttleUp'),
    throttleDown: input.keys.has('throttleDown'),
    flaps: input.keys.has('flaps'),
    gear: input.keys.has('gear'),
    brake: input.keys.has('brake'),
  };
}

// Edge-triggered keys: true once per press, then cleared by endFrame.
export function wasPressed(input, action) {
  return input.pressed.has(action);
}

export function endFrameInput(input) {
  input.pressed.clear();
  input.clicks.length = 0;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
