// Pure rules for the lotus-root harvest shift (j3Lotus in docs/ORIGINAL_SPEC.md).
// No DOM, no Three.js, no timers — imported directly by unit tests and by work/lotus_shift.js.

export const LOTUS = {
  GROUND_Y: -0.14,     // mud depth: player stands 0.14 m lower than the bund
  REACH: 2.3,          // max distance (m) to work on the nearest unfinished lotus spot
  HIDE_CAM_DIST: 3.2,  // hide lotus leaf instances closer than 3.2 m to the camera
  WALK: 3.4,           // base walking speed in the mud paddy (m/s), scaled by opts.walk
  BOUNDS: { x0: -10.5, x1: 10.5, z0: -3.8, z1: 5.2 },
  SPOTS: [
    [-2.2, 2],
    [2.4, 2.2],
    [-6, 4.2],
    [6.4, 3.4],
    [-1, -1.6],
    [4, -1.8],
    [-5.2, -2],
    [8.6, -0.5],
  ],
};

export const STEPS = {
  dig:     { id: 'dig',     icon: '⛏️', label: 'Đào',      jp: '掘る', tipJp: '掘る (horu)',   vi: 'Đào lớp bùn phía trên',          time: 0.8 },
  wash:    { id: 'wash',    icon: '💦', label: 'Xịt nước', jp: '洗う', tipJp: '洗う (arau)',   vi: 'Xịt nước để lộ củ sen',          time: 1.1 },
  pull:    { id: 'pull',    icon: '🪴', label: 'Nhổ',      jp: '抜く', tipJp: '抜く (nuku)',   vi: 'Nhổ củ sen lên, nhẹ tay kẻo gãy', time: 0.7 },
  collect: { id: 'collect', icon: '🧺', label: 'Nhặt',     jp: '拾う', tipJp: '拾う (hirou)',  vi: 'Nhặt củ sen vào giỏ',            time: 0.5 },
};

export const STEP_KEYS = ['dig', 'wash', 'pull', 'collect'];

export function createLotus(opts = {}) {
  const goal = opts.goal || 2;
  const limit = opts.limit || 0;
  return {
    goal,
    limit,
    maxMiss: opts.maxMiss || 0,
    walk: opts.walk || 1,
    rain: !!opts.rain,
    time: limit,
    count: 0,
    miss: 0,
    busy: 0,
    busyStep: null,
    busySpot: -1,
    over: false,
    result: null,
    loseWhy: '',
    warned: false,
    spots: LOTUS.SPOTS.map(([x, z], id) => ({ id, x, z, state: 0 })),
  };
}

/** Nearest unfinished spot (state < 4) within maxDist of (x, z), or null if none is in reach. */
export function nearestSpot(st, x, z, maxDist = LOTUS.REACH) {
  let best = null, bestD = Infinity;
  for (const sp of st.spots) {
    if (sp.state >= 4) continue;
    const d = Math.hypot(sp.x - x, sp.z - z);
    if (d <= maxDist && d < bestD) { best = sp; bestD = d; }
  }
  return best;
}

/**
 * Perform step `id` ('dig' | 'wash' | 'pull' | 'collect') at player position (x, z).
 * Returns:
 *  - 'busy' if the shift is over, player is still in the middle of an action, or id is unknown
 *  - 'far'  if no unfinished spot is within REACH (2.3 m) — does NOT count as a miss
 *  - 'bad'  if the step does not match the spot's current state — increments miss, keeps state unchanged
 *  - 'good' if the step matches — starts action timer, advances spot state (+1 root on collect)
 */
export function act(st, id, x, z) {
  if (st.over || st.busy > 0 || !STEPS[id]) return 'busy';
  const sp = nearestSpot(st, x, z, LOTUS.REACH);
  if (!sp) return 'far';
  const wantKey = STEP_KEYS[sp.state];
  if (id !== wantKey) {
    st.miss++;
    if (st.maxMiss && st.miss > st.maxMiss) {
      st.over = true;
      st.result = 'lose';
      st.loseWhy = 'Sai quá nhiều lần rồi.';
    }
    return 'bad';
  }
  const stepDef = STEPS[id];
  st.busy = stepDef.time;
  st.busyStep = id;
  st.busySpot = sp.id;
  sp.state++;
  if (sp.state >= 4) {
    st.count++;
    if (st.count >= st.goal) {
      st.over = true;
      st.result = 'win';
    }
  }
  return 'good';
}

/** Advance action timer and shift countdown by dt seconds. Returns array of events ('ready', 'warn10', 'lose'). */
export function step(st, dt) {
  const ev = [];
  if (st.busy > 0) {
    st.busy = Math.max(0, st.busy - dt);
    if (st.busy === 0) {
      st.busyStep = null;
      st.busySpot = -1;
      ev.push('ready');
    }
  }
  if (st.over || dt <= 0) return ev;
  if (st.limit > 0) {
    st.time -= dt;
    if (st.time <= 10 && !st.warned) {
      st.warned = true;
      ev.push('warn10');
    }
    if (st.time <= 0) {
      st.time = 0;
      st.over = true;
      st.result = 'lose';
      st.loseWhy = 'Hết giờ!';
      ev.push('lose');
    }
  }
  return ev;
}

export function lotusFraction(st) {
  return Math.min(1, st.count / Math.max(1, st.goal));
}
