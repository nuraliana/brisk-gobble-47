// Every pixel is drawn by hand on the canvas: the turkey, the farmer, the farmyard,
// the barn and the kitchen, the HUD and every menu. One coherent autumn palette,
// no images, no fonts loaded from anywhere — just the canvas and system fonts.
import { FARMER, FIELD, PALETTE, STAGES, TURKEY } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

const BUTTONS = {
  title: { start: { x: 490, y: 520, w: 300, h: 64, label: 'START THE ESCAPE' } },
  caught: { restart: { x: 490, y: 540, w: 300, h: 64, label: 'TRY AGAIN  (R)' } },
  escaped: { restart: { x: 490, y: 540, w: 300, h: 64, label: 'PLAY AGAIN  (R)' } },
  paused: {
    resume: { x: 490, y: 380, w: 300, h: 60, label: 'RESUME  (P)' },
    restart: { x: 490, y: 460, w: 300, h: 60, label: 'RESTART  (R)' },
  },
};

/** Which menu button (if any) the logical point x,y hits on this screen. */
export function hitButton(screen, x, y) {
  const buttons = BUTTONS[screen];
  if (!buttons) return null;
  for (const [action, rect] of Object.entries(buttons)) {
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return action;
  }
  return null;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold', font = 'Georgia, serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function shadowedText(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = 'rgba(43,29,18,0.55)';
  ctx.font = `${weight} ${size}px Georgia, serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x + 3, y + 3);
  text(ctx, str, x, y, size, color, align, weight);
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -6, -11, 0, -5);
  ctx.bezierCurveTo(6, -11, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#d7263d' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(43,29,18,0.6)';
  ctx.stroke();
  ctx.restore();
}

function drawTurkey(ctx, x, y, angle, scale, opts = {}) {
  const s = scale ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2); // art faces up; rotate to the facing angle
  ctx.scale(s, s);
  if (opts.ghost) ctx.globalAlpha = 0.55;
  // Tail fan: five feathers spread behind.
  for (let i = -2; i <= 2; i += 1) {
    const a = (-Math.PI / 2) + i * 0.42;
    const fx = Math.cos(a) * 26;
    const fy = Math.sin(a) * 26;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = i === 0 ? PALETTE.featherRed : i % 2 === 0 ? PALETTE.feather : PALETTE.featherGold;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.cream;
    ctx.beginPath();
    ctx.ellipse(0, 6, 3.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = PALETTE.turkeyBody;
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.turkeyLight;
  ctx.beginPath();
  ctx.ellipse(0, 8, 11, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wing.
  ctx.fillStyle = PALETTE.turkeyDark;
  ctx.beginPath();
  ctx.ellipse(-13, 4, 6, 11, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Neck and head.
  ctx.fillStyle = PALETTE.turkeyBody;
  ctx.fillRect(-4, -26, 8, 14);
  ctx.fillStyle = '#c98a5a';
  ctx.beginPath();
  ctx.arc(0, -30, 9, 0, Math.PI * 2);
  ctx.fill();
  // Beak and wattle.
  ctx.fillStyle = '#e8a91c';
  ctx.beginPath();
  ctx.moveTo(-4, -32);
  ctx.lineTo(4, -32);
  ctx.lineTo(0, -25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.featherRed;
  ctx.beginPath();
  ctx.ellipse(2, -24, 2.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye.
  ctx.fillStyle = '#1d1210';
  ctx.beginPath();
  ctx.arc(-3, -32, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Feet, mid-stride when moving.
  ctx.strokeStyle = '#e8a91c';
  ctx.lineWidth = 2.5;
  const stride = opts.moving ? Math.sin((opts.stride ?? 0) * 14) * 5 : 0;
  ctx.beginPath();
  ctx.moveTo(-6, 20);
  ctx.lineTo(-6 - stride, 26);
  ctx.moveTo(6, 20);
  ctx.lineTo(6 + stride, 26);
  ctx.stroke();
  ctx.restore();
}

function drawFarmer(ctx, x, y, angle, mode, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.scale(scale, scale);
  // Legs and overalls.
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.beginPath();
  ctx.ellipse(0, 6, 18, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerShirt;
  ctx.beginPath();
  ctx.ellipse(0, -4, 19, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // Arms.
  ctx.strokeStyle = PALETTE.farmerShirt;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.lineTo(-24, 8);
  ctx.moveTo(16, -6);
  ctx.lineTo(24, 8);
  ctx.stroke();
  // Head.
  ctx.fillStyle = PALETTE.farmerSkin;
  ctx.beginPath();
  ctx.arc(0, -26, 12, 0, Math.PI * 2);
  ctx.fill();
  // Moustache and eyes.
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-7, -22, 14, 3);
  ctx.fillStyle = '#1d1210';
  ctx.beginPath();
  ctx.arc(-4, -29, 1.8, 0, Math.PI * 2);
  ctx.arc(4, -29, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Straw hat.
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(0, -30, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -33, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-10, -32, 20, 2.5);
  // Pitchfork in the right hand.
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(26, 10);
  ctx.lineTo(34, -26);
  ctx.stroke();
  ctx.strokeStyle = '#c8ccd2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, -26);
  ctx.lineTo(30, -34);
  ctx.moveTo(34, -26);
  ctx.lineTo(34, -35);
  ctx.moveTo(34, -26);
  ctx.lineTo(38, -34);
  ctx.stroke();
  ctx.restore();
  // Mood mark above the head.
  if (mode === 'chase') {
    shadowedText(ctx, '!', x, y - 52, 30, '#ffdf3d');
  } else if (mode === 'suspicious' || mode === 'investigate') {
    shadowedText(ctx, '?', x, y - 52, 28, '#ffffff');
  }
}

function drawHaystack(ctx, x, y, r) {
  ctx.fillStyle = PALETTE.hayDark;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.hay;
  ctx.beginPath();
  ctx.arc(x, y - 3, r - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.hayDark;
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r - 16), y + Math.sin(a) * (r - 16));
    ctx.lineTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4));
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.hayDark;
  ctx.beginPath();
  ctx.ellipse(x, y - r + 4, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(ctx, x, y, r) {
  for (const [ox, oy, orad] of [[-r * 0.4, 4, r * 0.62], [r * 0.4, 4, r * 0.62], [0, -r * 0.3, r * 0.7]]) {
    ctx.fillStyle = PALETTE.leaf;
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, orad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.leafDark;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.arc(x + Math.cos(i * 2.4) * r * 0.5, y + Math.sin(i * 2.4) * r * 0.4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few autumn berries.
  ctx.fillStyle = PALETTE.featherRed;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(x + Math.cos(i * 1.7 + 0.6) * r * 0.55, y + Math.sin(i * 1.7 + 0.6) * r * 0.45, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCornCob(ctx, x, y, bob) {
  const lift = Math.sin(bob) * 2;
  ctx.save();
  ctx.translate(x, y + lift);
  ctx.rotate(-0.5);
  ctx.fillStyle = PALETTE.featherGold;
  rr(ctx, -6, -12, 12, 24, 6);
  ctx.fill();
  ctx.fillStyle = '#c98a1c';
  for (let row = -8; row <= 8; row += 6) {
    ctx.fillRect(-5, row, 10, 2);
  }
  ctx.fillStyle = '#7fae4e';
  ctx.beginPath();
  ctx.moveTo(-6, 12);
  ctx.lineTo(-12, 20);
  ctx.lineTo(-2, 14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 12);
  ctx.lineTo(12, 20);
  ctx.lineTo(2, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawKnife(ctx, x, y, angle, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = PALETTE.knife;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5d3517';
  ctx.fillRect(-20, -3, 9, 6);
  ctx.restore();
}

function drawFloor(ctx, stageIndex, time) {
  if (stageIndex === 0) {
    // Farmyard grass with a worn dirt path to the farmhouse door.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.dirt;
    ctx.beginPath();
    ctx.moveTo(580, 720);
    ctx.lineTo(700, 720);
    ctx.lineTo(700, 30);
    ctx.lineTo(580, 30);
    ctx.closePath();
    ctx.fill();
    // Grass tufts and fallen leaves.
    for (let i = 0; i < 90; i += 1) {
      const x = (i * 173) % 1280;
      const y = (i * 97) % 700 + 10;
      ctx.fillStyle = i % 3 === 0 ? PALETTE.grassDark : PALETTE.grassLight;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 26; i += 1) {
      const x = (i * 211 + 40) % 1280;
      const y = (i * 131 + 60) % 700 + 10;
      ctx.fillStyle = i % 2 === 0 ? PALETTE.featherGold : '#c96a1e';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(i);
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();
    }
    // Pumpkin patch, bottom right.
    for (const [x, y] of [[1150, 620], [1100, 660], [1200, 665]]) {
      ctx.fillStyle = '#d96a1e';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8520f';
      ctx.fillRect(x - 1, y - 18, 3, 6);
    }
  } else if (stageIndex === 1) {
    // Barn: wooden planks.
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.woodDark;
    for (let y = 0; y < 720; y += 46) ctx.fillRect(0, y, 1280, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < 720; y += 92) {
      for (let x = (y / 92) % 2 === 0 ? 0 : 160; x < 1280; x += 320) ctx.fillRect(x, y, 3, 46);
    }
    // Scattered straw.
    ctx.strokeStyle = PALETTE.hay;
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i += 1) {
      const x = (i * 149 + 30) % 1280;
      const y = (i * 113 + 50) % 700 + 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 14, y + 3);
      ctx.stroke();
    }
  } else {
    // Kitchen: warm checker tiles.
    for (let ty = 0; ty < 9; ty += 1) {
      for (let tx = 0; tx < 16; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.tileA : PALETTE.tileB;
        ctx.fillRect(tx * 80, ty * 80, 80, 80);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let tx = 0; tx < 16; tx += 1) ctx.fillRect(tx * 80, 0, 2, 720);
    for (let ty = 0; ty < 9; ty += 1) ctx.fillRect(0, ty * 80, 1280, 2);
  }
  void time;
}

function drawWalls(ctx, stage) {
  for (const wall of stage.walls) {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(wall.x + 3, wall.y + 3, wall.w - 6, wall.h - 6);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(wall.x + 3, wall.y + 3, wall.w - 6, 4);
  }
}

function drawExit(ctx, stageIndex) {
  // The door at the top: a lit doorway with a sign.
  ctx.fillStyle = '#3a2415';
  ctx.fillRect(560, 0, 160, 26);
  ctx.fillStyle = stageIndex === 2 ? '#ffe9a8' : '#ffd76a';
  ctx.fillRect(572, 4, 136, 22);
  ctx.fillStyle = '#2b1d12';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stageIndex === 2 ? 'FREEDOM!' : 'EXIT →', 640, 15);
  // Glowing arrow down the path.
  ctx.fillStyle = 'rgba(242,193,78,0.9)';
  ctx.beginPath();
  ctx.moveTo(640, 44);
  ctx.lineTo(628, 30);
  ctx.lineTo(636, 30);
  ctx.lineTo(636, 22);
  ctx.lineTo(644, 22);
  ctx.lineTo(644, 30);
  ctx.lineTo(652, 30);
  ctx.closePath();
  ctx.fill();
}

function drawOven(ctx, stage) {
  for (const oven of stage.ovens) {
    // Heat shimmer in front of the oven.
    const pulse = 0.35 + Math.sin(Date.now() / 240) * 0.12;
    ctx.fillStyle = `rgba(255,122,26,${pulse})`;
    ctx.fillRect(oven.x, oven.y, oven.w, oven.h);
    ctx.fillStyle = PALETTE.oven;
    ctx.fillRect(oven.x + oven.w, oven.y, 170, oven.h);
    ctx.fillStyle = '#232327';
    ctx.fillRect(oven.x + oven.w + 16, oven.y + 20, 138, 90);
    ctx.fillStyle = PALETTE.ovenGlow;
    ctx.fillRect(oven.x + oven.w + 24, oven.y + 28, 122, 74);
    ctx.fillStyle = 'rgba(255,220,120,0.85)';
    ctx.fillRect(oven.x + oven.w + 24, oven.y + 28, 122, 12);
    // HOT! on a dark plaque so it reads over the orange glow and the end-screen tint.
    ctx.fillStyle = 'rgba(43,29,18,0.78)';
    rr(ctx, oven.x + oven.w / 2 - 62, oven.y + oven.h / 2 - 26, 124, 52, 10);
    ctx.fill();
    shadowedText(ctx, 'HOT!', oven.x + oven.w / 2, oven.y + oven.h / 2, 30, '#ffffff');
    // Oven knobs and a pie on top.
    ctx.fillStyle = '#c8ccd2';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(oven.x + oven.w + 40 + i * 40, oven.y + 140, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c96a1e';
    ctx.beginPath();
    ctx.ellipse(oven.x + oven.w + 85, oven.y - 6, 40, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVisionCone(ctx, farmer) {
  const range = FARMER.visionRange;
  const half = FARMER.visionHalfAngle;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(farmer.x, farmer.y);
  ctx.arc(farmer.x, farmer.y, range, farmer.angle - half, farmer.angle + half);
  ctx.closePath();
  ctx.fillStyle = farmer.mode === 'chase' ? 'rgba(215,38,61,0.20)' : 'rgba(242,193,78,0.18)';
  ctx.fill();
  ctx.strokeStyle = farmer.mode === 'chase' ? 'rgba(215,38,61,0.5)' : 'rgba(242,193,78,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawButton(ctx, rect, hover = false) {
  ctx.fillStyle = hover ? '#ffdf6b' : PALETTE.gold;
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, rect.label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 22, PALETTE.ink);
}

function drawHud(ctx, state, best) {
  // Top bar.
  ctx.fillStyle = 'rgba(43,29,18,0.82)';
  ctx.fillRect(0, 0, FIELD.width, 52);
  text(ctx, `SCORE  ${state.score}`, 24, 27, 24, PALETTE.gold, 'left');
  text(ctx, `DIST  ${state.distanceMeters}m`, 230, 27, 24, PALETTE.cream, 'left');
  text(ctx, `BEST  ${best}`, 400, 27, 18, PALETTE.cream, 'left');
  text(ctx, STAGES[state.stageIndex].name, 640, 20, 20, '#ffffff');
  text(ctx, STAGES[state.stageIndex].sub, 640, 40, 13, PALETTE.cream, 'center', 'normal', 'Verdana, sans-serif');
  for (let i = 0; i < 3; i += 1) drawHeart(ctx, 1150 + i * 34, 27, 26, i < state.lives);
  text(ctx, 'LIVES', 1090, 27, 16, PALETTE.cream, 'right');

  // Stamina bar, bottom left.
  ctx.fillStyle = 'rgba(43,29,18,0.7)';
  rr(ctx, 18, 676, 220, 26, 8);
  ctx.fill();
  ctx.fillStyle = state.turkey.stamina < 25 ? PALETTE.danger : '#7fae4e';
  rr(ctx, 22, 680, 212 * (state.turkey.stamina / TURKEY.staminaMax), 18, 6);
  ctx.fill();
  text(ctx, 'SPRINT (SHIFT)', 128, 689, 12, '#ffffff', 'center', 'bold', 'Verdana, sans-serif');

  // Gobble cooldown, bottom right.
  const ready = state.turkey.gobbleCd <= 0;
  ctx.fillStyle = 'rgba(43,29,18,0.7)';
  rr(ctx, 1042, 676, 220, 26, 8);
  ctx.fill();
  text(
    ctx,
    ready ? 'GOBBLE READY (SPACE)' : `GOBBLE ${state.turkey.gobbleCd.toFixed(1)}s`,
    1152,
    689,
    12,
    ready ? PALETTE.gold : '#bbbbbb',
    'center',
    'bold',
    'Verdana, sans-serif',
  );

  // Hidden tag.
  if (state.turkey.hidden && state.status === 'playing') {
    ctx.fillStyle = 'rgba(63,122,52,0.9)';
    rr(ctx, 560, 60, 160, 30, 10);
    ctx.fill();
    text(ctx, 'HIDDEN IN THE HAY', 640, 76, 14, '#ffffff', 'center', 'bold', 'Verdana, sans-serif');
  }

  // Spotted banner.
  if (state.spottedT > 0 && state.status === 'playing') {
    const blink = Math.floor(state.spottedT * 8) % 2 === 0;
    if (blink) {
      ctx.fillStyle = 'rgba(215,38,61,0.92)';
      rr(ctx, 480, 96, 320, 44, 10);
      ctx.fill();
      text(ctx, 'SPOTTED!  RUN!', 640, 119, 26, '#ffffff');
    }
  }

  // Burn warning.
  if (state.burnT > 0.15 && state.status === 'playing') {
    text(ctx, 'TOO HOT! GET OFF THE OVEN!', 640, 150, 22, '#ff8c42');
  }

  // Invulnerability flicker hint.
  if (state.turkey.invuln > 0 && state.status === 'playing') {
    text(ctx, 'OUCH! Careful…', state.turkey.x, state.turkey.y - 44, 16, '#ffffff');
  }
}

function drawWorld(ctx, state, time, screen) {
  const stage = state.stage;
  drawFloor(ctx, state.stageIndex, time);
  drawExit(ctx, state.stageIndex);
  // In play the HUD bar covers the door at the top, so hang a second EXIT sign
  // just below the bar: the exit reads fully in the play shot too.
  if (screen === SCREEN_PLAY) {
    ctx.fillStyle = 'rgba(43,29,18,0.88)';
    rr(ctx, 572, 58, 136, 30, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'EXIT →', 640, 74, 17, PALETTE.gold);
  }
  drawWalls(ctx, stage);
  drawOven(ctx, stage);
  // Hides: haystacks and bushes the turkey can duck into.
  for (const hide of stage.hides) {
    if (hide.kind === 'hay') drawHaystack(ctx, hide.x, hide.y, hide.r);
    else drawBush(ctx, hide.x, hide.y, hide.r);
  }
  // Corn, still uneaten.
  for (const cob of stage.corn) {
    if (!cob.taken) drawCornCob(ctx, cob.x, cob.y, cob.bob + time);
  }
  // The sweeping kitchen knife.
  const sweeper = stage.sweeper;
  if (sweeper) {
    ctx.strokeStyle = 'rgba(200,204,210,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sweeper.minX, sweeper.y);
    ctx.lineTo(sweeper.maxX, sweeper.y);
    ctx.stroke();
    drawKnife(ctx, sweeper.x, sweeper.y, time * 6, 2.2);
  }
  // Thrown knives.
  for (const knife of state.knives) drawKnife(ctx, knife.x, knife.y, knife.angle, 1.4);
  // Farmer with his vision cone, then the turkey on top.
  drawVisionCone(ctx, state.farmer);
  drawFarmer(ctx, state.farmer.x, state.farmer.y, state.farmer.angle, state.farmer.mode);
  const blink = state.turkey.invuln > 0 && Math.floor(time * 10) % 2 === 0;
  drawTurkey(ctx, state.turkey.x, state.turkey.y, state.turkey.angle, 1, {
    moving: state.turkey.moving,
    stride: time,
    ghost: blink,
  });
}

function drawTitle(ctx, state, best, time) {
  drawWorld(ctx, state, time, SCREEN_TITLE);
  ctx.fillStyle = 'rgba(30,18,8,0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Autumn bunting, with a gap over the EXIT door so the sign reads fully.
  for (let i = 0; i < 12; i += 1) {
    const x = 60 + i * 105;
    if (x + 34 > 540 && x < 740) continue; // keep the EXIT door clear
    ctx.fillStyle = ['#c0392b', '#e8a91c', '#3f7a34'][i % 3];
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x + 34, 18);
    ctx.lineTo(x + 17, 44);
    ctx.closePath();
    ctx.fill();
  }
  shadowedText(ctx, 'FARMYARD DASH', 640, 150, 84, PALETTE.gold);
  shadowedText(ctx, "A TURKEY'S THANKSGIVING ESCAPE", 640, 215, 30, PALETTE.cream);
  text(ctx, 'The farmer wants you for dinner. Farmyard → Barn → Kitchen → FREEDOM!', 640, 262, 20, '#ffffff', 'center', 'normal', 'Verdana, sans-serif');
  // Hero turkey and farmer flanking the instructions, clear of the centred text.
  drawTurkey(ctx, 210, 470, -Math.PI / 2, 2.6, { moving: false });
  drawFarmer(ctx, 1070, 470, -Math.PI / 2, 'patrol', 2.2);
  // A carving knife on the ground by the hero turkey: the hazard, visible up front.
  drawKnife(ctx, 360, 545, -0.7, 2.4);
  text(ctx, 'WASD / ARROWS — waddle', 640, 330, 19, '#ffffff', 'center', 'normal', 'Verdana, sans-serif');
  text(ctx, 'SHIFT — sprint (watch stamina)', 640, 360, 19, '#ffffff', 'center', 'normal', 'Verdana, sans-serif');
  text(ctx, 'SPACE — gobble! Lure the farmer away', 640, 390, 19, '#ffffff', 'center', 'normal', 'Verdana, sans-serif');
  text(ctx, 'Hide in haystacks & bushes · Grab corn · Dodge knives · Mind the oven', 640, 420, 19, PALETTE.gold, 'center', 'normal', 'Verdana, sans-serif');
  drawButton(ctx, BUTTONS.title.start);
  text(ctx, 'ENTER or click to start  ·  P pause  ·  M mute', 640, 612, 16, PALETTE.cream, 'center', 'normal', 'Verdana, sans-serif');
  if (best > 0) text(ctx, `Best score so far: ${best}`, 640, 650, 18, PALETTE.gold);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(30,18,8,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  shadowedText(ctx, 'PAUSED', 640, 300, 64, PALETTE.cream);
  text(ctx, 'The farmer waits…', 640, 352, 20, PALETTE.gold, 'center', 'normal', 'Verdana, sans-serif');
  drawButton(ctx, BUTTONS.paused.resume);
  drawButton(ctx, BUTTONS.paused.restart);
}

function drawEndScreen(ctx, state, best, escaped) {
  ctx.fillStyle = escaped ? 'rgba(20,60,25,0.55)' : 'rgba(60,12,8,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  if (escaped) {
    shadowedText(ctx, 'ESCAPED!', 640, 150, 88, PALETTE.gold);
    shadowedText(ctx, 'The turkey lives to gobble another day.', 640, 215, 26, PALETTE.cream);
    drawTurkey(ctx, 640, 330, -Math.PI / 2, 2.8, { moving: false });
    text(ctx, 'No Thanksgiving dinner tonight — freedom tastes better than stuffing.', 640, 460, 20, '#ffffff', 'center', 'normal', 'Verdana, sans-serif');
  } else {
    shadowedText(ctx, 'CAUGHT!', 640, 150, 88, '#ff6b5e');
    shadowedText(ctx, 'Thanksgiving dinner is served… and it is you.', 640, 215, 26, PALETTE.cream);
    drawFarmer(ctx, 640, 330, -Math.PI / 2, 'patrol', 2.4);
    text(ctx, 'The farmer got his turkey. Hide better, sprint smarter, gobble louder.', 640, 460, 20, '#ffffff', 'center', 'normal', 'Verdana, sans-serif');
  }
  text(ctx, `SCORE  ${state.score}   ·   DISTANCE  ${state.distanceMeters}m   ·   CORN  ${state.cornEaten}`, 640, 500, 22, PALETTE.gold);
  if (state.score >= best && state.score > 0) text(ctx, 'NEW BEST SCORE!', 640, 530, 20, '#ffdf3d');
  drawButton(ctx, BUTTONS[escaped ? 'escaped' : 'caught'].restart);
  text(ctx, 'Press R or click to run again', 640, 630, 16, PALETTE.cream, 'center', 'normal', 'Verdana, sans-serif');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function draw(state, screen, best, time) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1d1210';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    if (screen === SCREEN_TITLE) {
      drawTitle(ctx, state, best, time);
    } else if (screen === SCREEN_PAUSED) {
      drawWorld(ctx, state, time, screen);
      drawHud(ctx, state, best);
      drawPaused(ctx);
    } else if (screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) {
      drawWorld(ctx, state, time, screen);
      drawEndScreen(ctx, state, best, screen === SCREEN_ESCAPED);
    } else {
      drawWorld(ctx, state, time, screen);
      drawHud(ctx, state, best);
      if (state.banner && state.banner.t > 0) {
        ctx.fillStyle = 'rgba(43,29,18,0.85)';
        rr(ctx, 340, 280, 600, 110, 14);
        ctx.fill();
        text(ctx, state.banner.title, 640, 320, 30, PALETTE.gold);
        text(ctx, state.banner.sub, 640, 355, 17, PALETTE.cream, 'center', 'normal', 'Verdana, sans-serif');
      }
    }
  }

  return { draw };
}
