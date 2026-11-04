// Rules of the scaffold pipe-carrying shift (j3Site, original 6706–6796) — pure module.
// The 3D scene feeds it time, whether the player is moving, and distances; it returns events.

export const SITE = {
  STACK: { x: -8.3, z: -0.4 },   // pipe source on the left
  RACK: { x: 8.3, z: -0.2 },     // rack on the right
  REACH: 2.7,                    // hold/place radius
  HOLD_TIME: 0.6,                // bend time to pick up or put down
  RUN_DROP: 0.9,                 // carrying + running + moving longer than this drops the pipes
  GUST_FIRST: 7, GUST_MIN: 6, GUST_RANGE: 4, GUST_LEN: 2, GUST_GRACE: 0.5,
  WALK: 3.4, RUN_MUL: 1.7,
  WIN_DELAY: 0.5,
};

export function createShift(opts, rng = Math.random) {
  return {
    goal: opts.goal, limit: opts.limit || 0, maxMiss: opts.maxMiss || 0, wind: !!opts.wind,
    time: opts.limit || 0, elapsed: 0, count: 0, miss: 0,
    carry: false, run: false, runCarry: 0,
    gustT: SITE.GUST_FIRST, gust: 0,
    busy: 0, busyDo: null,
    over: null, winT: 0, rng,
  };
}

const dist = (a, x, z) => Math.hypot(a.x - x, a.z - z);
export const nearStack = (x, z) => dist(SITE.STACK, x, z) <= SITE.REACH;
export const nearRack = (x, z) => dist(SITE.RACK, x, z) <= SITE.REACH;
export const speedOf = (st, walkMul = 1) => SITE.WALK * walkMul * (st.run ? SITE.RUN_MUL : 1);

/** Player pressed 🤲 Nhấc / Đặt at (x, z). Returns an event name. */
export function hold(st, x, z) {
  if (st.over || st.busy > 0) return 'busy';
  if (!st.carry) {
    if (!nearStack(x, z)) return 'far-stack';
    st.busy = SITE.HOLD_TIME; st.busyDo = 'pick'; return 'bend';
  }
  if (!nearRack(x, z)) return 'far-rack';
  st.busy = SITE.HOLD_TIME; st.busyDo = 'place'; return 'bend';
}

export function toggleRun(st) { if (!st.over) st.run = !st.run; return st.run; }

function miss(st, ev) {
  st.miss++;
  ev.push('miss');
  if (st.maxMiss && st.miss > st.maxMiss) { st.over = 'lose'; st.loseWhy = 'Sai quá nhiều lần rồi.'; ev.push('lose'); }
}

function drop(st, ev, why) {
  st.carry = false;
  ev.push(why);
  miss(st, ev);
}

/**
 * Advance the shift by dt seconds. `moving` = the player is being moved by input this frame.
 * Returns an array of events: pick, place, drop-run, drop-gust, gust-start, gust-end, miss, lose, win, warn10.
 */
export function step(st, dt, moving) {
  const ev = [];
  if (st.over === 'lose' || st.over === 'won') return ev;
  if (st.over === 'win') { st.winT -= dt; if (st.winT <= 0) { st.over = 'won'; ev.push('win'); } return ev; }
  st.elapsed += dt;

  if (st.busy > 0) {
    st.busy -= dt;
    if (st.busy <= 0) {
      st.busy = 0;
      if (st.busyDo === 'pick') { st.carry = true; ev.push('pick'); }
      else if (st.busyDo === 'place') {
        st.carry = false; st.count++; ev.push('place');
        if (st.count >= st.goal) { st.over = 'win'; st.winT = SITE.WIN_DELAY; }
      }
      st.busyDo = null;
    }
  }

  // running while carrying
  if (st.carry && st.run && moving) {
    st.runCarry += dt;
    if (st.runCarry > SITE.RUN_DROP) { st.run = false; st.runCarry = 0; drop(st, ev, 'drop-run'); }
  } else st.runCarry = 0;

  // gusts of wind
  if (st.wind && !st.over) {
    if (st.gust > 0) {
      st.gust -= dt;
      if (st.gust <= 0) { st.gust = 0; ev.push('gust-end'); }
      else if (st.carry && moving && st.gust < SITE.GUST_LEN - SITE.GUST_GRACE) { st.gust = 0; ev.push('gust-end'); drop(st, ev, 'drop-gust'); }
    } else {
      st.gustT -= dt;
      if (st.gustT <= 0) { st.gustT = SITE.GUST_MIN + st.rng() * SITE.GUST_RANGE; st.gust = SITE.GUST_LEN; ev.push('gust-start'); }
    }
  }

  // timer
  if (st.limit && !st.over) {
    const before = st.time;
    st.time = Math.max(0, st.time - dt);
    if (before > 10 && st.time <= 10) ev.push('warn10');
    if (st.time <= 0) { st.over = 'lose'; st.loseWhy = 'Hết giờ!'; ev.push('lose'); }
  }
  return ev;
}

/** Fraction of the goal done, for quitting early or scoring. */
export const fraction = (st) => Math.max(0, Math.min(1, st.count / st.goal));
