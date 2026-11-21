// config.js — one job: every tunable number of Night Archive in one place.
// The game is "Night Archive": Wren, a night courier, slips through a sleeping
// archive house to fetch a wax seal and leave by the green door, unseen.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

export const PLAYER_RADIUS = 11;
export const PLAYER_WALK_SPEED = 3.4; // tiles per second
export const PLAYER_RUN_SPEED = 5.2; // tiles per second, loud
export const RUN_NOISE_RADIUS = 4.6; // tiles; guards inside it investigate

export const GUARD_RADIUS = 12;
export const GUARD_PATROL_SPEED = 1.7; // tiles per second
export const GUARD_CHASE_SPEED = 4.3; // tiles per second
export const GUARD_PAUSE_SECONDS = 1.6; // stop at each waypoint and look around
export const GUARD_SCAN_SWEEP = 1.9; // radians swept while paused

export const VISION_RANGE = 5.6; // tiles
export const VISION_HALF_ANGLE = 0.62; // radians (~35 degrees each side)
export const SHADOW_SPOT_RADIUS = 1.4; // tiles: guards cannot spot you in shadow

export const DETECTION_RISE_CLOSE = 62; // per second at 1.5 tiles
export const DETECTION_RISE_FAR = 20; // per second at max range
export const DETECTION_FALL = 26; // per second while unseen
export const SUSPICIOUS_AT = 35; // guard turns to look, cone goes amber
export const ALARM_AT = 100; // guard chases
export const LOSE_SIGHT_SECONDS = 2.5; // of no sight before a chasing guard gives up
export const CATCH_RADIUS = 0.55; // tiles

export const COLORS = {
  floorA: '#20242e',
  floorB: '#1c2029',
  floorLine: '#2a2f3c',
  wall: '#3d4457',
  wallTop: '#565f78',
  crate: '#6b5433',
  crateTop: '#8a6f45',
  shadow: '#0d0f16',
  exit: '#37d67a',
  exitGlow: '#1d7a44',
  seal: '#ffd166',
  player: '#e8e6df',
  playerCloak: '#7a5cff',
  guard: '#e5484d',
  guardConeCalm: 'rgba(255, 214, 90, 0.20)',
  guardConeSuspicious: 'rgba(255, 160, 40, 0.30)',
  guardConeAlarm: 'rgba(229, 72, 77, 0.34)',
  hudBg: 'rgba(10, 12, 18, 0.82)',
  text: '#e8e6df',
  textDim: '#9aa3b2',
};
