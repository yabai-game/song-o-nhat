// Bento factory conveyor-belt shift rules (j3Bento in the original, spec §4.6 / §18) — pure module.
// Trays spawn at x = 0 and ride along [0, BELT_LEN]. When a tray is inside the yellow work zone
// [ZONE0, ZONE1], the player must press the matching side-dish button (karaage / sausage / veg).

export const BENTO = {
  BELT_LEN: 37.2,     // 4 conveyor segments × 9.3 m
  ZONE0: 21.0,        // work zone start along the belt
  ZONE1: 24.0,        // work zone end (3.0 m wide, matching original 0.6..3.6)
  LOOKAHEAD: 2.5,     // show icon before entering ZONE0
  SPEED0: 1.5,        // default belt speed (m/s)
  SPEED_ADD: 0.07,    // belt speed increase per completed tray
  SPEED_MAX: 2.6,     // belt speed cap
  SPAWN_BASE: 2.5,    // seconds between trays at SPEED0 = 1.5
  SPAWN_DIST: 3.75,   // constant spacing between trays (2.5 × 1.5 m)
  LOCK_GOOD: 0.12,    // lock time after a correct pick (s)
  LOCK_BAD: 0.25,     // lock time after a wrong pick (s)
};

export const ITEMS = {
  karaage: { id: 'karaage', icon: '🍗', jp: '唐揚げ', vi: 'Gà rán' },
  sausage: { id: 'sausage', icon: '🌭', jp: 'ウインナー', vi: 'Xúc xích' },
  veg:     { id: 'veg',     icon: '🥦', jp: '野菜',       vi: 'Rau' },
};
export const ITEM_KEYS = ['karaage', 'sausage', 'veg'];

function makeTray(st, x, rand) {
  const i = Math.floor(rand() * ITEM_KEYS.length) % ITEM_KEYS.length;
  const j = (i + 1 + (Math.floor(rand() * 2) % 2)) % ITEM_KEYS.length;
  return { id: ++st.seq, x, need: ITEM_KEYS[i], other: ITEM_KEYS[j], done: false, missed: false };
}

/** Spawn interval (s) for a given belt speed so tray spacing stays SPAWN_DIST (3.75 m). */
export const spawnInterval = (speed) => BENTO.SPAWN_BASE / (speed / BENTO.SPEED0);

/**
 * Create a bento shift state.
 * opts: { goal, speed (default 1.5), maxMiss (0 = none), prefill (default true) }
 */
export function createBento(opts = {}, rand = Math.random) {
  const speed = opts.speed || BENTO.SPEED0;
  const st = {
    goal: opts.goal || 8,
    maxMiss: opts.maxMiss || 0,
    speed,
    count: 0,
    miss: 0,
    lock: 0,
    spawnT: spawnInterval(speed),
    over: false,
    result: null,
    loseWhy: '',
    seq: 0,
    trays: [],
    winPending: false,
    losePending: false,
  };
  if (opts.prefill !== false) {
    // Pre-populate trays along the upstream half of the belt, before ZONE0 (as in original j3Bento)
    for (let x = 1.0; x <= BENTO.ZONE0 - 4.5; x += BENTO.SPAWN_DIST) {
      st.trays.push(makeTray(st, x, rand));
    }
  }
  return st;
}

/** The unfinished tray currently inside [ZONE0, ZONE1] closest to the exit (largest x), or null. */
export function activeTray(st) {
  let best = null;
  for (const t of st.trays) {
    if (!t.done && !t.missed && t.x >= BENTO.ZONE0 && t.x <= BENTO.ZONE1) {
      if (!best || t.x > best.x) best = t;
    }
  }
  return best;
}

/**
 * Player presses an item button ('karaage' | 'sausage' | 'veg').
 * Returns 'good' | 'bad' | 'early' | 'locked'.
 */
export function act(st, item) {
  if (st.over || st.lock > 0) return 'locked';
  const t = activeTray(st);
  if (!t) return 'early';
  if (t.need === item) {
    t.done = true;
    st.count++;
    st.speed = Math.min(BENTO.SPEED_MAX, Math.round((st.speed + BENTO.SPEED_ADD) * 1000) / 1000);
    st.lock = BENTO.LOCK_GOOD;
    if (st.count >= st.goal) {
      st.over = true;
      st.result = 'win';
      st.winPending = true;
    }
    return 'good';
  }
  st.miss++;
  st.lock = BENTO.LOCK_BAD;
  if (st.maxMiss && st.miss > st.maxMiss) {
    st.over = true;
    st.result = 'lose';
    st.loseWhy = 'Sai quá nhiều lần rồi.';
    st.losePending = true;
  }
  return 'bad';
}

/**
 * Advance belt and timers by dt seconds.
 * Returns array of event strings: 'spawn', 'miss_pass', 'win', 'lose'.
 */
export function step(st, dt, rand = Math.random) {
  const ev = [];
  if (st.winPending) { st.winPending = false; ev.push('win'); return ev; }
  if (st.losePending) { st.losePending = false; ev.push('lose'); return ev; }
  if (st.over) return ev;

  if (st.lock > 0) st.lock = Math.max(0, st.lock - dt);

  const dx = st.speed * dt;
  for (const t of st.trays) {
    t.x += dx;
    if (!t.done && !t.missed && t.x > BENTO.ZONE1) {
      t.missed = true;
      st.miss++;
      ev.push('miss_pass');
      if (st.maxMiss && st.miss > st.maxMiss && !st.over) {
        st.over = true;
        st.result = 'lose';
        st.loseWhy = 'Sai quá nhiều lần rồi.';
        ev.push('lose');
      }
    }
  }
  // Remove trays that have ridden off the end of the belt
  for (let i = st.trays.length - 1; i >= 0; i--) {
    if (st.trays[i].x > BENTO.BELT_LEN) st.trays.splice(i, 1);
  }

  if (!st.over) {
    st.spawnT -= dt;
    while (st.spawnT <= 0) {
      const overshoot = -st.spawnT;
      const nt = makeTray(st, overshoot * st.speed, rand);
      st.trays.push(nt);
      ev.push('spawn');
      st.spawnT += spawnInterval(st.speed);
    }
  }
  return ev;
}

/** Completed fraction 0..1 (for shiftEnd). */
export const bentoFraction = (st) => Math.max(0, Math.min(1, st.count / Math.max(1, st.goal)));
