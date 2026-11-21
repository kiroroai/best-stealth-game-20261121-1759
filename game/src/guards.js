// guards.js — one job: guard patrol AI, vision cones and the detection meter.
// A guard patrols waypoints, pauses to scan, grows suspicious when it glimpses
// you, chases on full alarm, investigates noises, and gives up when it loses
// you — so patience and breaking line of sight always buy a second chance.

import {
  TILE, VISION_RANGE, VISION_HALF_ANGLE, SHADOW_SPOT_RADIUS,
  GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_PAUSE_SECONDS, GUARD_SCAN_SWEEP,
  DETECTION_RISE_CLOSE, DETECTION_RISE_FAR, DETECTION_FALL,
  SUSPICIOUS_AT, ALARM_AT, LOSE_SIGHT_SECONDS, CATCH_RADIUS,
} from './config.js';
import { tileCenter, hasLineOfSight, isShadowTile, moveCircle, distanceTiles } from './world.js';

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(def) {
    const start = tileCenter(def.waypoints[0].x, def.waypoints[0].y);
    this.x = start.x;
    this.y = start.y;
    this.waypoints = def.waypoints.map((w) => tileCenter(w.x, w.y));
    this.waypointIndex = 1 % this.waypoints.length;
    this.dir = 0;
    this.pauseTimer = 0;
    this.scanBase = 0;
    this.scanPhase = 0;
    this.state = 'patrol'; // patrol | suspicious | alarm | investigate | return
    this.detection = 0;
    this.lastSeen = null;
    this.investigateTarget = null;
    this.loseSightTimer = 0;
    this.stepTimer = 0;
    this.moving = false;
  }

  // True when the player is inside the cone, in range, in line of sight,
  // and not hidden in a shadow patch (unless the guard is right on top).
  canSee(world, player) {
    const distTiles = distanceTiles(this.x, this.y, player.x, player.y);
    if (distTiles > VISION_RANGE) return false;
    const toPlayer = angleTo(this.x, this.y, player.x, player.y);
    if (Math.abs(angleDiff(toPlayer, this.dir)) > VISION_HALF_ANGLE) return false;
    if (!hasLineOfSight(world, this.x, this.y, player.x, player.y)) return false;
    if (isShadowTile(world, player.x, player.y) && distTiles > SHADOW_SPOT_RADIUS) return false;
    return true;
  }

  hearNoise(nx, ny, radiusTiles) {
    if (this.state === 'alarm') return;
    if (distanceTiles(this.x, this.y, nx, ny) > radiusTiles) return;
    this.investigateTarget = { x: nx, y: ny };
    if (this.state === 'patrol' || this.state === 'return') this.state = 'investigate';
    if (this.detection < SUSPICIOUS_AT) this.detection = SUSPICIOUS_AT;
  }

  update(dt, world, player, audio) {
    this._playerX = player.x;
    this._playerY = player.y;
    const sees = this.canSee(world, player);
    const distTiles = distanceTiles(this.x, this.y, player.x, player.y);

    if (sees) {
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
      const closeness = 1 - Math.min(1, distTiles / VISION_RANGE);
      const rise = DETECTION_RISE_FAR + (DETECTION_RISE_CLOSE - DETECTION_RISE_FAR) * closeness;
      this.detection = Math.min(ALARM_AT, this.detection + rise * dt);
      if (this.detection >= ALARM_AT) {
        if (this.state !== 'alarm' && audio) audio.alertSting();
        this.state = 'alarm';
      } else if (this.detection >= SUSPICIOUS_AT && this.state === 'patrol') {
        this.state = 'suspicious';
      }
    } else {
      this.detection = Math.max(0, this.detection - DETECTION_FALL * dt);
      if (this.state === 'alarm') {
        this.loseSightTimer += dt;
        if (this.loseSightTimer > LOSE_SIGHT_SECONDS) {
          this.state = this.lastSeen ? 'investigate' : 'return';
          this.investigateTarget = this.lastSeen;
        }
      } else if (this.state === 'suspicious' && this.detection < SUSPICIOUS_AT) {
        this.state = this.lastSeen ? 'investigate' : 'return';
        this.investigateTarget = this.lastSeen;
      }
    }

    if (this.state === 'alarm') {
      this.chase(dt, world, player, audio);
    } else if (this.state === 'investigate' && this.investigateTarget) {
      this.walkToward(dt, world, this.investigateTarget, GUARD_PATROL_SPEED * 1.35, audio);
      if (Math.hypot(this.investigateTarget.x - this.x, this.investigateTarget.y - this.y) < TILE * 0.4) {
        this.state = 'return';
        this.investigateTarget = null;
      }
    } else if (this.state === 'return') {
      const home = this.waypoints[this.waypointIndex];
      this.walkToward(dt, world, home, GUARD_PATROL_SPEED, audio);
      if (Math.hypot(home.x - this.x, home.y - this.y) < TILE * 0.3) this.state = 'patrol';
    } else {
      this.patrol(dt, world, audio);
    }

    // A suspicious guard turns to face what it glimpsed.
    if ((this.state === 'suspicious' || this.state === 'alarm') && this.lastSeen) {
      this.dir = angleTo(this.x, this.y, this.lastSeen.x, this.lastSeen.y);
    }
  }

  patrol(dt, world, audio) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.scanPhase += dt;
      this.dir = this.scanBase + Math.sin(this.scanPhase * 1.4) * GUARD_SCAN_SWEEP * 0.5;
      this.moving = false;
      return;
    }
    const target = this.waypoints[this.waypointIndex];
    const arrived = this.walkToward(dt, world, target, GUARD_PATROL_SPEED, audio);
    if (arrived) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      this.pauseTimer = GUARD_PAUSE_SECONDS;
      this.scanBase = this.dir;
      this.scanPhase = 0;
    }
  }

  chase(dt, world, player, audio) {
    this.walkToward(dt, world, { x: player.x, y: player.y }, GUARD_CHASE_SPEED, audio);
    this.dir = angleTo(this.x, this.y, player.x, player.y);
  }

  // Walk toward a point; returns true when arrived. Footsteps tick softly.
  walkToward(dt, world, target, speedTiles, audio) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const step = speedTiles * TILE * dt;
    const moved = moveCircle(world, this.x, this.y, (dx / dist) * step, (dy / dist) * step, 12);
    this.moving = moved.x !== this.x || moved.y !== this.y;
    this.x = moved.x;
    this.y = moved.y;
    this.dir = Math.atan2(dy, dx);
    this.stepTimer -= dt;
    if (this.moving && this.stepTimer <= 0) {
      this.stepTimer = 0.55;
      if (audio) audio.guardStep(this.x, this.y, this._playerX, this._playerY);
    }
    return dist <= step + 2;
  }

  catches(player) {
    return this.state === 'alarm'
      && distanceTiles(this.x, this.y, player.x, player.y) < CATCH_RADIUS;
  }

  coneColor() {
    if (this.state === 'alarm') return 'alarm';
    if (this.detection >= SUSPICIOUS_AT) return 'suspicious';
    return 'calm';
  }
}
