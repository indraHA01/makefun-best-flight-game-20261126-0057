// Skycourier — Aurora Isles: the aircraft, drawn in chase view.
// A cream-and-teal bush plane with a spinning propeller, blinking navigation
// lights and its registration on the tail. It banks with the roll, sits just
// below the centre of the frame, and is the one thing the camera never loses.

import { COLORS } from './config.js';

export function drawPlane(ctx, plane, width, height, time) {
  const cx = width / 2;
  const cy = height * 0.62;
  const s = Math.min(width, height) / 720;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll * 0.85);
  ctx.scale(s, s);

  // Tailplane and fin, behind the wings.
  ctx.fillStyle = COLORS.planeTeal;
  ctx.beginPath();
  ctx.moveTo(-58, 52);
  ctx.lineTo(58, 52);
  ctx.lineTo(34, 66);
  ctx.lineTo(-34, 66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.planeRed;
  ctx.beginPath();
  ctx.moveTo(-6, 58);
  ctx.lineTo(10, 58);
  ctx.lineTo(4, 6);
  ctx.lineTo(-10, 26);
  ctx.closePath();
  ctx.fill();

  // Main wings: a gentle dihedral, cream with a teal tip stripe.
  ctx.fillStyle = COLORS.planeCream;
  ctx.beginPath();
  ctx.moveTo(-168, 18);
  ctx.quadraticCurveTo(-170, 2, -150, 0);
  ctx.lineTo(150, 0);
  ctx.quadraticCurveTo(170, 2, 168, 18);
  ctx.lineTo(26, 30);
  ctx.lineTo(-26, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.planeTeal;
  ctx.fillRect(-168, 8, 26, 10);
  ctx.fillRect(142, 8, 26, 10);

  // Fuselage: tapered toward the nose, teal cheatline along the side.
  ctx.fillStyle = COLORS.planeCream;
  ctx.beginPath();
  ctx.moveTo(-20, 66);
  ctx.quadraticCurveTo(-24, 10, -13, -62);
  ctx.quadraticCurveTo(0, -74, 13, -62);
  ctx.quadraticCurveTo(24, 10, 20, 66);
  ctx.quadraticCurveTo(0, 74, -20, 66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.planeTeal;
  ctx.beginPath();
  ctx.moveTo(-22, 34);
  ctx.quadraticCurveTo(-23, 8, -16, -18);
  ctx.lineTo(-10, -18);
  ctx.quadraticCurveTo(-16, 8, -15, 34);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(22, 34);
  ctx.quadraticCurveTo(23, 8, 16, -18);
  ctx.lineTo(10, -18);
  ctx.quadraticCurveTo(16, 8, 15, 34);
  ctx.closePath();
  ctx.fill();

  // Cockpit canopy: a dark blue bubble the pilot looks out of.
  ctx.fillStyle = '#16324a';
  ctx.beginPath();
  ctx.ellipse(0, -34, 11, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 210, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-3, -40, 4, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Registration on the tail, small and proud.
  ctx.fillStyle = '#20303a';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PK-SKY', 0, 58);

  // Propeller: a blurred disc and a bright spinner at the nose.
  const blur = 0.16 + Math.min(0.25, plane.speed * 0.004);
  ctx.fillStyle = `rgba(40, 40, 46, ${blur})`;
  ctx.beginPath();
  ctx.ellipse(0, -66, 5, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(40, 40, 46, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, -66, 2.5, 30, Math.sin(time * 40) * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.planeRed;
  ctx.beginPath();
  ctx.arc(0, -66, 6, 0, Math.PI * 2);
  ctx.fill();

  // Navigation lights: red left, green right, white tail, blinking softly.
  const blink = 0.55 + 0.45 * Math.sin(time * 3.2);
  ctx.fillStyle = `rgba(255, 60, 40, ${blink})`;
  ctx.beginPath();
  ctx.arc(-168, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(80, 255, 130, ${blink})`;
  ctx.beginPath();
  ctx.arc(168, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 255, 255, ${blink})`;
  ctx.beginPath();
  ctx.arc(0, 70, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
