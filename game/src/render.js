// render.js — one job: draw everything the player sees.
// Top-down night archive: checkerboard floor, shadow patches, crates, walls,
// vision cones raycast against walls (so light stops where sight stops),
// guards, Wren, the seal, the exit, the HUD and the title/win/lose screens.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, VISION_RANGE, VISION_HALF_ANGLE, COLORS } from './config.js';
import { tileCenter, isSolidTile, isShadowTile } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Raycast a vision cone against walls and crates: the cone's edge follows the
// first solid tile along each sampled ray, so the light matches the sight.
export function conePolygon(world, gx, gy, dir) {
  const points = [{ x: gx, y: gy }];
  const rays = 26;
  const maxDist = VISION_RANGE * TILE;
  for (let i = 0; i <= rays; i++) {
    const a = dir - VISION_HALF_ANGLE + (2 * VISION_HALF_ANGLE * i) / rays;
    let d = maxDist;
    for (let step = 8; step < maxDist; step += 8) {
      const px = gx + Math.cos(a) * step;
      const py = gy + Math.sin(a) * step;
      if (isSolidTile(world, Math.floor(px / TILE), Math.floor(py / TILE))) {
        d = step;
        break;
      }
    }
    points.push({ x: gx + Math.cos(a) * d, y: gy + Math.sin(a) * d });
  }
  return points;
}

function drawCone(ctx, world, guard) {
  const color =
    guard.coneColor() === 'alarm'
      ? COLORS.guardConeAlarm
      : guard.coneColor() === 'suspicious'
        ? COLORS.guardConeSuspicious
        : COLORS.guardConeCalm;
  const poly = conePolygon(world, guard.x, guard.y, guard.dir);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawFloor(ctx, world) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const key = tx + ',' + ty;
      const x = tx * TILE;
      const y = ty * TILE;
      if (world.walls.has(key)) continue;
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (world.shadows.has(key)) {
        ctx.fillStyle = COLORS.shadow;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(122, 92, 255, 0.10)';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      }
      if (world.crates.has(key)) continue;
      ctx.strokeStyle = COLORS.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawWallsAndCrates(ctx, world) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const key = tx + ',' + ty;
      const x = tx * TILE;
      const y = ty * TILE;
      if (world.walls.has(key)) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x, y + 6, TILE, 3);
      } else if (world.crates.has(key)) {
        ctx.fillStyle = COLORS.crate;
        roundRect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 4);
        ctx.fill();
        ctx.fillStyle = COLORS.crateTop;
        ctx.fillRect(x + 3, y + 3, TILE - 6, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      }
    }
  }
}

function drawExit(ctx, world, hasSeal, time) {
  const c = tileCenter(world.exitTile.x, world.exitTile.y);
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.save();
  ctx.globalAlpha = hasSeal ? 0.55 + 0.35 * pulse : 0.3;
  ctx.fillStyle = COLORS.exit;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = hasSeal ? COLORS.exit : '#5a7a64';
  roundRect(ctx, c.x - 11, c.y - 13, 22, 26, 4);
  ctx.fill();
  ctx.fillStyle = '#0d1f14';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hasSeal ? '→' : '🔒', c.x, c.y + 1);
  ctx.fillStyle = hasSeal ? COLORS.exit : COLORS.textDim;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('EXIT', c.x, c.y - 24);
}

function drawSeal(ctx, world, time) {
  const c = tileCenter(world.sealTile.x, world.sealTile.y);
  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.3 * pulse;
  ctx.fillStyle = COLORS.seal;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.seal;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a4d00';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', c.x, c.y + 0.5);
  ctx.fillStyle = COLORS.seal;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('SEAL', c.x, c.y - 22);
}

function drawGuard(ctx, guard, time) {
  // Detection ring above the guard: only drawn once the meter starts filling.
  const meter = guard.detection / 100;
  if (meter > 0.02) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 24, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = meter >= 1 ? '#ff3b30' : meter >= 0.35 ? '#ffa028' : '#ffd65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 24, 9, -Math.PI / 2, -Math.PI / 2 + meter * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a0d0e';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.dir) * 5, guard.y + Math.sin(guard.dir) * 5, 5, 0, Math.PI * 2);
  ctx.fill();
  // Little cap brim pointing where the guard looks.
  ctx.strokeStyle = '#ffd65a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(guard.x + Math.cos(guard.dir) * 12, guard.y + Math.sin(guard.dir) * 12);
  ctx.lineTo(guard.x + Math.cos(guard.dir) * 17, guard.y + Math.sin(guard.dir) * 17);
  ctx.stroke();

  if (guard.state === 'alarm') {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 34);
  } else if (guard.state === 'suspicious' || guard.state === 'investigate') {
    ctx.fillStyle = '#ffa028';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 34);
  }
}

function drawPlayer(ctx, player, world, time) {
  const hidden = isShadowTile(world, player.x, player.y);
  if (hidden) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = COLORS.playerCloak;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.playerCloak;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', player.x, player.y - 22);
  }
  // Cloak body.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
  ctx.fill();
  // Face / hood.
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 3, player.y + Math.sin(player.facing) * 3, 3, 0, Math.PI * 2);
  ctx.fill();
  if (player.clickTarget) {
    ctx.strokeStyle = 'rgba(232,230,223,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.clickTarget.x, player.clickTarget.y, 6 + 2 * Math.sin(time * 6), 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawWorld(ctx, world, player, guards, time, sealTaken) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, world);
  drawWallsAndCrates(ctx, world);
  drawExit(ctx, world, player.hasSeal, time);
  if (!sealTaken) drawSeal(ctx, world, time);
  for (const g of guards) drawCone(ctx, world, g);
  for (const g of guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, player, world, time);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

export function drawHUD(ctx, levelName, player, guards, elapsed, levelIndex, levelCount) {
  const maxDetection = guards.reduce((m, g) => Math.max(m, g.detection), 0);
  ctx.save();
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(levelName + '  ·  ' + (levelIndex + 1) + '/' + levelCount, 12, 18);
  ctx.fillText(player.hasSeal ? '⬢ SEAL ✓' : '⬢ SEAL …', 330, 18);
  ctx.fillText('⏱ ' + formatTime(elapsed), 450, 18);

  // Detection meter.
  const bx = 560;
  const bw = 180;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('DETECTION', bx, 18);
  ctx.fillStyle = '#11141b';
  roundRect(ctx, bx + 78, 9, bw, 14, 7);
  ctx.fill();
  const frac = maxDetection / 100;
  ctx.fillStyle = frac >= 1 ? '#ff3b30' : frac >= 0.35 ? '#ffa028' : '#37d67a';
  if (frac > 0) {
    roundRect(ctx, bx + 78, 9, Math.max(8, bw * frac), 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.textDim;
  ctx.textAlign = 'right';
  ctx.fillText('M mute · R restart', VIEW_W - 12, 18);
  ctx.restore();
}

function overlayPanel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 15, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = accent || COLORS.text;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 84);
  ctx.fillStyle = COLORS.text;
  ctx.font = '16px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 34 + i * 26);
  });
  ctx.restore();
}

export function drawTitle(ctx) {
  overlayPanel(
    ctx,
    'NIGHT ARCHIVE',
    [
      'You are Wren, a night courier. Fetch the wax seal,',
      'then slip out the green door — unseen.',
      '',
      'WASD / arrows to move · Shift to run (loud!) · Click to walk there',
      'Crates block a guard’s sight. Dark shadow patches hide you.',
      'A guard’s cone fills as it spots you — break sight to cool down.',
      '',
      'Press Enter or click to begin',
    ],
    COLORS.playerCloak,
  );
}

export function drawLevelComplete(ctx, levelName, elapsed) {
  overlayPanel(
    ctx,
    'LEVEL CLEAR',
    [levelName + ' — out clean in ' + formatTime(elapsed) + '.', '', 'Press Enter for the next level'],
    COLORS.exit,
  );
}

export function drawCaught(ctx) {
  overlayPanel(
    ctx,
    'CAUGHT!',
    ['A guard laid a hand on your shoulder. The archive keeps its seal.', '', 'Press R to try again'],
    '#ff3b30',
  );
}

export function drawWin(ctx, elapsed) {
  overlayPanel(
    ctx,
    'CLEAN GETAWAY',
    [
      'Both floors crossed, seal in hand, no alarm raised that mattered.',
      'Total time ' + formatTime(elapsed) + '.',
      '',
      'Press R to play again',
    ],
    COLORS.seal,
  );
}
