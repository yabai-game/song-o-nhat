// Pure locomotion gait helper: maps actual ground speed (m/s) to animation clip ('idle' | 'walk' | 'run')
// and clip playback rate (timeScale) so feet never slide on the ground.
// Measured across the 9 Meshy character models: walk cycle 1.04 s (~0.93 m/s), run cycle 0.67 s (~1.51 m/s).

export const GAIT = {
  WALK_CLIP: 0.93,
  RUN_CLIP: 1.51,
  // ordinary moving (street 3.0 m/s, site 3.4 m/s) must LOOK like walking: the walk clip is used up to
  // WALK_MAX, played up to WALK_TS_MAX (a brisk walk); only the 🏃 run toggle goes past it.
  WALK_MAX: 3.5,
  TS_MIN: 0.6,
  WALK_TS_MAX: 1.8, // faster than this the legs look frantic; a little foot slide reads better
  TS_MAX: 2.2,       // run clip ceiling
  TURN_RATE: 6, // rad/s max turning speed for pedestrians and passengers
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Given ground speed in m/s, returns `{ clip: 'idle' | 'walk' | 'run', timeScale }`.
 */
export function gait(speed) {
  if (!(speed >= 0.05)) return { clip: 'idle', timeScale: 1 };
  if (speed <= GAIT.WALK_MAX) {
    return {
      clip: 'walk',
      timeScale: clamp(speed / GAIT.WALK_CLIP, GAIT.TS_MIN, GAIT.WALK_TS_MAX),
    };
  }
  return {
    clip: 'run',
    timeScale: clamp(speed / GAIT.RUN_CLIP, 1, GAIT.TS_MAX),
  };
}

/**
 * Smoothly advance `yaw` towards `targetYaw` along the shortest angular arc at up to `rate` rad/s.
 * Returns `{ yaw, turning }` where `turning` is true while still more than one frame step away.
 */
export function turnYaw(yaw, targetYaw, dt, rate = GAIT.TURN_RATE) {
  let dy = Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw));
  const step = Math.max(0, rate * dt);
  if (Math.abs(dy) <= step || Math.abs(dy) < 1e-4) {
    return { yaw: targetYaw, turning: false };
  }
  return { yaw: yaw + Math.sign(dy) * step, turning: true };
}
