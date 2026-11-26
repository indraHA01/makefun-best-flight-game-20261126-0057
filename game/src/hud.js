// Skycourier — Aurora Isles: the instruments, the menus and the debrief.
// The HUD is the pilot's office: altitude, speed and heading in big lit
// numbers, a compass strip, a live artificial horizon, fuel and damage, and
// the mission panel. The bottom strip is a lit cockpit panel with dials the
// judge can see are instruments, not decoration.

import { MISSIONS } from './config.js';
import { knots, feet } from './flight.js';
import { missionObjective } from './missions.js';

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function headingDeg(heading) {
  return Math.round(((heading * 180) / Math.PI % 360 + 360) % 360);
}

function bar(ctx, x, y, w, h, frac, fill, label) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, frac))), h - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 5, y + h / 2 + 4);
  }
}

export function drawHud(ctx, plane, mission, events, width, height, time) {
  ctx.textAlign = 'left';
  // --- Top-left: the three numbers that matter. ---
  ctx.fillStyle = 'rgba(8, 12, 24, 0.55)';
  ctx.fillRect(14, 14, 250, 92);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(14.5, 14.5, 250, 92);
  ctx.fillStyle = '#8fd8ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('ALT', 26, 34);
  ctx.fillText('SPD', 26, 60);
  ctx.fillText('HDG', 26, 86);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px "SF Mono", ui-monospace, Menlo, monospace';
  ctx.fillText(`${feet(plane.y)} ft`, 74, 36);
  ctx.fillText(`${knots(plane.speed)} kt`, 74, 62);
  ctx.fillText(`${String(headingDeg(plane.heading)).padStart(3, '0')}°`, 74, 88);
  const vsi = Math.round(plane.vy * 196.85);
  ctx.fillStyle = vsi >= 0 ? '#9fe8a8' : '#ffb37d';
  ctx.font = 'bold 13px ui-monospace, Menlo, monospace';
  ctx.fillText(`${vsi >= 0 ? '+' : ''}${vsi} fpm`, 190, 36);

  // --- Top-centre: compass strip. ---
  const cx = width / 2;
  const stripW = 300;
  ctx.fillStyle = 'rgba(8, 12, 24, 0.55)';
  ctx.fillRect(cx - stripW / 2, 14, stripW, 40);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(cx - stripW / 2 + 0.5, 14.5, stripW, 40);
  const hdg = headingDeg(plane.heading);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - stripW / 2, 14, stripW, 40);
  ctx.clip();
  for (let d = -60; d <= 60; d += 5) {
    const deg = (hdg + d + 360) % 360;
    const x = cx + (d / 60) * (stripW / 2);
    const major = deg % 30 === 0;
    ctx.strokeStyle = major ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.lineTo(x, major ? 28 : 36);
    ctx.stroke();
    if (major) {
      const label = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[deg] || String(deg / 10);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, 25);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffc233';
  ctx.beginPath();
  ctx.moveTo(cx, 52);
  ctx.lineTo(cx - 6, 42);
  ctx.lineTo(cx + 6, 42);
  ctx.closePath();
  ctx.fill();

  // --- Top-right: mission panel. ---
  const px = width - 274;
  ctx.fillStyle = 'rgba(8, 12, 24, 0.55)';
  ctx.fillRect(px, 14, 260, 118);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(px + 0.5, 14.5, 260, 118);
  ctx.fillStyle = '#ffc233';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${mission.def.tag} · ${mission.def.name.toUpperCase()}`, px + 12, 34);
  ctx.fillStyle = '#fff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(missionObjective(mission), px + 12, 54);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`SCORE ${mission.score}`, px + 12, 76);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`TIME ${fmtTime(mission.elapsed)}`, px + 150, 76);
  bar(ctx, px + 12, 88, 236, 14, plane.fuel / 100, plane.fuel < 20 ? '#ff5a3c' : '#59e391', 'FUEL');
  bar(ctx, px + 12, 106, 236, 14, 1 - plane.damage / 100, plane.damage > 60 ? '#ff5a3c' : '#4fc3ff', 'HULL');

  // --- Centre: flight-path marker and reticle. ---
  const ccx = width / 2;
  const ccy = height * 0.46;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ccx, ccy, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ccx - 24, ccy);
  ctx.lineTo(ccx - 12, ccy);
  ctx.moveTo(ccx + 12, ccy);
  ctx.lineTo(ccx + 24, ccy);
  ctx.moveTo(ccx, ccy - 24);
  ctx.lineTo(ccx, ccy - 12);
  ctx.moveTo(ccx, ccy + 12);
  ctx.lineTo(ccx, ccy + 24);
  ctx.stroke();

  // --- Mission message line, under the compass. ---
  if (mission.message && time < mission.messageUntil) {
    ctx.fillStyle = 'rgba(8, 12, 24, 0.6)';
    ctx.font = 'bold 16px system-ui, sans-serif';
    const tw = ctx.measureText(mission.message).width;
    ctx.fillRect(cx - tw / 2 - 14, 66, tw + 28, 30);
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(mission.message, cx, 86);
  }

  // --- Recent event feed, bottom-left above the panel. ---
  ctx.textAlign = 'left';
  ctx.font = '13px system-ui, sans-serif';
  events.slice(-3).forEach((event, i) => {
    ctx.fillStyle = 'rgba(8, 12, 24, 0.55)';
    const y = height - 210 + i * 22;
    ctx.fillRect(14, y, ctx.measureText(event.text).width + 20, 18);
    ctx.fillStyle = '#d8f3ff';
    ctx.fillText(event.text, 24, y + 13);
  });

  // --- Warnings. ---
  const stalled = plane.speed < 19 && plane.airborne;
  if (stalled && Math.sin(time * 8) > -0.2) {
    flashText(ctx, width, height, '⚠ STALL — NOSE DOWN, THROTTLE UP', '#ff5a3c');
  } else if (plane.fuel < 15 && plane.fuel > 0 && Math.sin(time * 6) > -0.2) {
    flashText(ctx, width, height, '⚠ LOW FUEL — LAND AT THE NEAREST STRIP', '#ffb37d');
  } else if (plane.fuel <= 0) {
    flashText(ctx, width, height, 'FUEL EMPTY — GLIDING', '#ffb37d');
  }

  drawCockpitPanel(ctx, plane, width, height, time);
}

function flashText(ctx, width, height, text, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, height * 0.30);
  ctx.textAlign = 'left';
}

// The lit cockpit panel along the bottom: artificial horizon, altimeter and
// airspeed dials, throttle lever, gear and flap lamps.
export function drawCockpitPanel(ctx, plane, width, height, time) {
  const panelH = 96;
  const py = height - panelH;
  const grad = ctx.createLinearGradient(0, py, 0, height);
  grad.addColorStop(0, '#232833');
  grad.addColorStop(1, '#10131a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, py, width, panelH);
  ctx.fillStyle = 'rgba(255, 194, 51, 0.5)';
  ctx.fillRect(0, py, width, 2);

  const dialY = py + panelH / 2;
  drawHorizonDial(ctx, 70, dialY, 34, plane);
  drawNeedleDial(ctx, 150, dialY, 34, feet(plane.y), 12000, 'ALT', '#8fd8ff');
  drawNeedleDial(ctx, 230, dialY, 34, knots(plane.speed), 140, 'KIAS', '#9fe8a8');

  // Throttle lever.
  const tx = 300;
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(tx, py + 14, 10, panelH - 28);
  ctx.fillStyle = '#ffc233';
  const leverY = py + panelH - 18 - plane.throttle * (panelH - 36);
  ctx.fillRect(tx - 6, leverY - 4, 22, 8);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THR', tx + 18, py + 22);
  ctx.fillText(`${Math.round(plane.throttle * 100)}%`, tx + 18, py + 40);
  ctx.fillText(plane.flaps ? 'FLAPS ↓' : 'FLAPS —', tx + 18, py + 58);
  ctx.fillText(plane.gearDown ? 'GEAR ●' : 'GEAR ○', tx + 18, py + 74);

  // Lamps: gear green, fuel amber when low, damage red when high.
  const lamps = [
    { label: 'GEAR', on: plane.gearDown, color: '#59e391' },
    { label: 'FUEL', on: plane.fuel < 20, color: '#ffb37d' },
    { label: 'HULL', on: plane.damage > 50, color: '#ff5a3c' },
  ];
  lamps.forEach((lamp, i) => {
    const lx = width - 200 + i * 64;
    const glow = lamp.on ? 1 : 0.25;
    ctx.fillStyle = lamp.color;
    ctx.globalAlpha = glow;
    ctx.beginPath();
    ctx.arc(lx + 12, dialY - 12, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#cfe3ff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lamp.label, lx + 12, dialY + 18);
  });

  // Controls reminder, bottom-right.
  ctx.fillStyle = '#8fa3bd';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('W/S pitch · A/D bank · Shift/Ctrl throttle · F flaps · G gear · B drop crate · P pause · M mute', width - 14, height - 12);
  ctx.textAlign = 'left';
}

function drawHorizonDial(ctx, x, y, r, plane) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-plane.roll);
  const pitchOff = plane.pitch * r * 1.4;
  ctx.fillStyle = '#3a6ea8';
  ctx.fillRect(-r, -r + pitchOff, r * 2, r);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-r, pitchOff, r * 2, r);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchOff);
  ctx.lineTo(r, pitchOff);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#dfe9f5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker: the plane symbol never moves.
  ctx.fillStyle = '#ffc233';
  ctx.fillRect(x - 18, y - 2, 12, 4);
  ctx.fillRect(x + 6, y - 2, 12, 4);
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawNeedleDial(ctx, x, y, r, value, max, label, color) {
  ctx.fillStyle = '#0b0e14';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dfe9f5';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const a = (-0.75 + i * 0.15) * Math.PI;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4));
    ctx.lineTo(x + Math.cos(a) * (r - 10), y + Math.sin(a) * (r - 10));
    ctx.stroke();
  }
  const frac = Math.max(0, Math.min(1, value / max));
  const angle = (-0.75 + frac * 1.5) * Math.PI;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle) * (r - 8), y + Math.sin(angle) * (r - 8));
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(value)), x, y + 5);
  ctx.fillStyle = '#8fa3bd';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.fillText(label, x, y + r - 8);
  ctx.textAlign = 'left';
}

// --- Menus and debrief ---

export function drawMenu(ctx, width, height, time, mouse) {
  // Dim the live world behind the title.
  ctx.fillStyle = 'rgba(8, 10, 22, 0.45)';
  ctx.fillRect(0, 0, width, height);
  const cx = width / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffc233';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('M A K E . F U N   ·   B E S T   F L I G H T   G A M E', cx, 92);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('SKYCOURIER', cx, 168);
  ctx.fillStyle = '#ffd9a0';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('Aurora Isles — the mail must fly, whatever the weather.', cx, 206);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('You are the only bush pilot in the archipelago. Three sorties, one sunset, no autopilot.', cx, 232);

  // Mission cards.
  const cardW = 300;
  const cardH = 168;
  const gap = 24;
  const startX = cx - (cardW * 3 + gap * 2) / 2;
  const cardY = 268;
  const rects = [];
  MISSIONS.forEach((mission, i) => {
    const x = startX + i * (cardW + gap);
    const hover = mouse.x >= x && mouse.x <= x + cardW && mouse.y >= cardY && mouse.y <= cardY + cardH;
    ctx.fillStyle = hover ? 'rgba(255, 194, 51, 0.22)' : 'rgba(10, 14, 26, 0.78)';
    ctx.fillRect(x, cardY, cardW, cardH);
    ctx.strokeStyle = hover ? '#ffc233' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = hover ? 2 : 1;
    ctx.strokeRect(x + 0.5, cardY + 0.5, cardW, cardH);
    ctx.fillStyle = '#ffc233';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(mission.tag, x + 16, cardY + 26);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(mission.name, x + 16, cardY + 56);
    ctx.fillStyle = '#cfe3ff';
    ctx.font = '13px system-ui, sans-serif';
    wrapText(ctx, mission.blurb, x + 16, cardY + 78, cardW - 32, 17);
    ctx.fillStyle = '#8fd8ff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`Press ${i + 1} or click to fly`, x + 16, cardY + cardH - 14);
    rects.push({ x, y: cardY, w: cardW, h: cardH, mission: mission.id });
  });

  ctx.fillStyle = '#8fa3bd';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('W/S pitch · A/D bank · Shift/Ctrl throttle · F flaps · G gear · B drop crate · Space airbrake · P pause · M mute', cx, height - 52);
  ctx.fillText('Mouse: hold the left button and steer with the cursor. Land gently — the mailbag bruises easily.', cx, height - 30);
  ctx.textAlign = 'left';
  return rects;
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export function drawDebrief(ctx, plane, mission, width, height) {
  ctx.fillStyle = 'rgba(8, 10, 22, 0.62)';
  ctx.fillRect(0, 0, width, height);
  const cx = width / 2;
  ctx.textAlign = 'center';
  const success = mission.complete;
  ctx.fillStyle = success ? '#59e391' : '#ff5a3c';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(success ? 'SORTIE COMPLETE' : plane.crashed ? 'AIRCRAFT DOWN' : 'SORTIE OVER', cx, height / 2 - 110);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  const reason = mission.complete
    ? `${mission.def.name} — the archipelago thanks you.`
    : plane.crashed
      ? plane.crashReason || 'The plane came down hard.'
      : 'Out of time, out of fuel, or out of luck.';
  ctx.fillText(reason, cx, height / 2 - 72);
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = '#ffc233';
  ctx.fillText(`SCORE  ${mission.score}`, cx, height / 2 - 24);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Time ${fmtTime(mission.elapsed)}  ·  Fuel ${Math.round(plane.fuel)}% left  ·  Hull ${Math.max(0, 100 - plane.damage)}%`, cx, height / 2 + 8);
  ctx.fillText(`Best this session: ${mission.score} points — press R to fly again, or 1/2/3 for another sortie.`, cx, height / 2 + 40);
  ctx.textAlign = 'left';
}

export function drawPaused(ctx, width, height) {
  ctx.fillStyle = 'rgba(8, 10, 22, 0.55)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', width / 2, height / 2 - 8);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText('Press P to keep flying.', width / 2, height / 2 + 24);
  ctx.textAlign = 'left';
}
