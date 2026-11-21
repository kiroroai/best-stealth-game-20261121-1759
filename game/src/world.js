// world.js — one job: turn a level map into a queryable world.
// Parses walls, crates, shadow patches, start/exit/seal positions; answers
// collision and line-of-sight questions for the player and the guards.

import { TILE, COLS, ROWS } from './config.js';

export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

export function parseWorld(level) {
  const walls = new Set();
  const crates = new Set();
  const shadows = new Set();
  let playerStart = null;
  let exitTile = null;
  let sealTile = null;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = level.map[y][x];
      const key = x + ',' + y;
      if (ch === '#') walls.add(key);
      else if (ch === 'C') crates.add(key);
      else if (ch === 'S') shadows.add(key);
      else if (ch === 'P') playerStart = tileCenter(x, y);
      else if (ch === 'E') exitTile = { x, y };
      else if (ch === 'K') sealTile = { x, y };
    }
  }
  return { walls, crates, shadows, playerStart, exitTile, sealTile, level };
}

export function isSolidTile(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const key = tx + ',' + ty;
  return world.walls.has(key) || world.crates.has(key);
}

// Circle-vs-tile collision: try the move, then slide along each axis.
export function moveCircle(world, x, y, dx, dy, radius) {
  let nx = x + dx;
  if (circleHitsSolid(world, nx, y, radius)) nx = x;
  let ny = y + dy;
  if (circleHitsSolid(world, nx, ny, radius)) ny = y;
  return { x: nx, y: ny };
}

function circleHitsSolid(world, cx, cy, radius) {
  const minTx = Math.floor((cx - radius) / TILE);
  const maxTx = Math.floor((cx + radius) / TILE);
  const minTy = Math.floor((cy - radius) / TILE);
  const maxTy = Math.floor((cy + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isSolidTile(world, tx, ty)) continue;
      const nearestX = Math.max(tx * TILE, Math.min(cx, (tx + 1) * TILE));
      const nearestY = Math.max(ty * TILE, Math.min(cy, (ty + 1) * TILE));
      const ddx = cx - nearestX;
      const ddy = cy - nearestY;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}

export function tileAtPixel(world, px, py) {
  return { tx: Math.floor(px / TILE), ty: Math.floor(py / TILE) };
}

export function isShadowTile(world, px, py) {
  const { tx, ty } = tileAtPixel(world, px, py);
  return world.shadows.has(tx + ',' + ty);
}

// Sampled line of sight: walls and crates block vision; shadow floor does not.
export function hasLineOfSight(world, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const { tx, ty } = tileAtPixel(world, x0 + dx * t, y0 + dy * t);
    if (isSolidTile(world, tx, ty)) return false;
  }
  return true;
}

export function distanceTiles(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by) / TILE;
}
