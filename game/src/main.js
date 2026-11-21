// main.js — one job: run Night Archive.
// Owns the game loop, the title/playing/caught/win states, level loading,
// the win/lose rules, and the deterministic ?shot= staging used for screenshots.

import { TILE, VIEW_W, VIEW_H } from './config.js';
import { LEVELS } from './levels.js';
import { parseWorld, tileCenter } from './world.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import {
  drawWorld, drawHUD, drawTitle, drawLevelComplete, drawCaught, drawWin,
} from './render.js';

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot'); // start | patrol | cone | exit | level2 — staged stills

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.ctx = this.canvas.getContext('2d');
    this.audio = new AudioSys();
    this.input = new Input(this.canvas, () => this.audio.ensure());
    this.levelIndex = 0;
    this.state = 'title';
    this.elapsed = 0;
    this.time = 0;
    this.frozen = false;
    this.hintUntil = 0;
    this.loadLevel(0);
    if (SHOT) this.stageShot(SHOT);
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.canvas.addEventListener('mousedown', () => {
      if (this.state === 'title') this.startGame();
    });
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.world = parseWorld(this.level);
    this.player = new Player(this.world.playerStart);
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.sealTaken = false;
  }

  startGame() {
    this.state = 'playing';
    this.elapsed = 0;
    this.audio.ensure();
  }

  restartLevel() {
    this.loadLevel(this.levelIndex);
    this.state = 'playing';
    this.elapsed = 0;
  }

  restartAll() {
    this.loadLevel(0);
    this.state = 'playing';
    this.elapsed = 0;
  }

  onKey(e) {
    if (e.code === 'KeyM') {
      const muted = this.audio.toggleMute();
      this.mutedNote = muted;
      return;
    }
    if (e.code === 'Enter') {
      if (this.state === 'title') this.startGame();
      else if (this.state === 'levelComplete') this.nextLevel();
      return;
    }
    if (e.code === 'KeyR') {
      if (this.state === 'caught' || this.state === 'win') this.restartAll();
      else if (this.state === 'levelComplete') this.nextLevel();
      else if (this.state === 'playing') this.restartLevel();
    }
  }

  nextLevel() {
    if (this.levelIndex + 1 < LEVELS.length) {
      this.loadLevel(this.levelIndex + 1);
      this.state = 'playing';
    } else {
      this.state = 'win';
    }
  }

  // Stage a fixed, readable scene for a screenshot: real render of the real
  // game, with the player and guards placed and the simulation frozen.
  stageShot(shot) {
    document.title = 'Night Archive — shot ' + shot;
    this.state = 'playing';
    this.frozen = true;
    this.time = 1.25;
    const put = (guardIndex, tx, ty, dir, detection, state) => {
      const g = this.guards[guardIndex];
      const c = tileCenter(tx, ty);
      g.x = c.x;
      g.y = c.y;
      g.dir = dir;
      g.detection = detection;
      g.state = state;
      g.pauseTimer = 0;
    };
    if (shot === 'start') {
      this.elapsed = 0;
    } else if (shot === 'patrol') {
      const c = tileCenter(10, 8);
      this.player.x = c.x;
      this.player.y = c.y;
      this.player.facing = Math.PI;
      put(0, 5, 8, 0, 42, 'suspicious');
      this.elapsed = 47;
    } else if (shot === 'cone') {
      const c = tileCenter(3, 9);
      this.player.x = c.x;
      this.player.y = c.y;
      this.player.facing = 0;
      put(0, 6, 8, Math.PI * 0.85, 58, 'suspicious');
      this.elapsed = 83;
    } else if (shot === 'exit') {
      this.player.hasSeal = true;
      this.sealTaken = true;
      const c = tileCenter(22, 3);
      this.player.x = c.x;
      this.player.y = c.y;
      this.player.facing = Math.PI / 4;
      put(2, 28, 10, Math.PI / 2, 0, 'patrol');
      this.elapsed = 132;
    } else if (shot === 'level2') {
      this.loadLevel(1);
      this.state = 'playing';
      this.frozen = true;
      this.time = 1.25;
      const c = tileCenter(10, 7);
      this.player.x = c.x;
      this.player.y = c.y;
      this.player.facing = 0;
      const g = this.guards[0];
      const gc = tileCenter(14, 7);
      g.x = gc.x;
      g.y = gc.y;
      g.dir = Math.PI;
      g.detection = 22;
      g.state = 'patrol';
      this.elapsed = 96;
    }
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.elapsed += dt;

    const click = this.input.takeClick();
    if (click) this.player.clickTarget = { x: click.x, y: click.y };

    this.player.update(dt, this.input, this.world, (x, y, running, alternate) => {
      this.audio.footstep(running, alternate);
      if (running) {
        for (const g of this.guards) g.hearNoise(x, y, this.player.noiseRadiusTiles());
      }
    });

    for (const g of this.guards) g.update(dt, this.world, this.player, this.audio);

    // Pick up the wax seal.
    if (!this.sealTaken && this.player.atTile(this.world, this.world.sealTile)) {
      this.sealTaken = true;
      this.player.hasSeal = true;
      this.audio.pickupChime();
    }

    // Reach the exit with the seal: level clear (or the whole game won).
    if (this.player.atTile(this.world, this.world.exitTile)) {
      if (this.player.hasSeal) {
        this.audio.levelClear();
        this.state = this.levelIndex + 1 < LEVELS.length ? 'levelComplete' : 'win';
      } else if (this.time > this.hintUntil) {
        this.hintUntil = this.time + 2.5;
      }
    }

    for (const g of this.guards) {
      if (g.catches(this.player)) {
        this.state = 'caught';
        this.audio.caughtSound();
        break;
      }
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.frozen) {
      this.time += dt;
      this.update(dt);
    }

    drawWorld(this.ctx, this.world, this.player, this.guards, this.time, this.sealTaken);
    drawHUD(
      this.ctx, this.level.name, this.player, this.guards,
      this.elapsed, this.levelIndex, LEVELS.length,
    );

    if (this.state === 'title') drawTitle(this.ctx);
    else if (this.state === 'levelComplete') drawLevelComplete(this.ctx, this.level.name, this.elapsed);
    else if (this.state === 'caught') drawCaught(this.ctx);
    else if (this.state === 'win') drawWin(this.ctx, this.elapsed);

    if (this.state === 'playing' && !this.player.hasSeal
      && this.player.atTile(this.world, this.world.exitTile)) {
      this.ctx.save();
      this.ctx.fillStyle = '#ffd166';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Locked — fetch the wax seal first', this.player.x, this.player.y - 26);
      this.ctx.restore();
    }

    requestAnimationFrame((t) => this.frame(t));
  }
}

new Game();
