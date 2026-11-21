// player.js — one job: Wren the courier — movement, noise and pickups.
// Walk with WASD/arrows, hold Shift to run (fast but loud: running footsteps
// carry and guards investigate the noise), or click a floor tile to walk there.

import { TILE, PLAYER_RADIUS, PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, RUN_NOISE_RADIUS } from './config.js';
import { moveCircle, distanceTiles } from './world.js';

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.radius = PLAYER_RADIUS;
    this.facing = 0;
    this.moving = false;
    this.running = false;
    this.hasSeal = false;
    this.clickTarget = null;
    this.stepTimer = 0;
    this.stepAlternate = false;
  }

  update(dt, input, world, onNoise) {
    let mx = 0;
    let my = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) my -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) my += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;

    if (mx !== 0 || my !== 0) this.clickTarget = null;
    else if (this.clickTarget) {
      const dx = this.clickTarget.x - this.x;
      const dy = this.clickTarget.y - this.y;
      if (Math.hypot(dx, dy) < 6) this.clickTarget = null;
      else {
        mx = dx / Math.hypot(dx, dy);
        my = dy / Math.hypot(dx, dy);
      }
    }

    const len = Math.hypot(mx, my);
    this.moving = len > 0;
    if (!this.moving) return;

    this.running = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = (this.running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED) * TILE;
    const nx = (mx / len) * speed * dt;
    const ny = (my / len) * speed * dt;
    const moved = moveCircle(world, this.x, this.y, nx, ny, this.radius);
    this.x = moved.x;
    this.y = moved.y;
    this.facing = Math.atan2(ny, nx);

    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = this.running ? 0.26 : 0.42;
      this.stepAlternate = !this.stepAlternate;
      if (onNoise) onNoise(this.x, this.y, this.running, this.stepAlternate);
    }
  }

  // Running footsteps are heard by guards within the noise radius.
  noiseRadiusTiles() {
    return this.running ? RUN_NOISE_RADIUS : 0;
  }

  atTile(world, tile) {
    return tile && distanceTiles(this.x, this.y, (tile.x + 0.5) * TILE, (tile.y + 0.5) * TILE) < 0.7;
  }
}
