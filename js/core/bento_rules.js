// Bento factory conveyor-belt shift rules (j3Bento in the original, spec §4.6 / §18) — pure module.
// Trays spawn at x = 0 and ride along [0, BELT_LEN]. When a tray is inside the yellow work zone
// [ZONE0, ZONE1], the player must place 1–3 side dishes in left-to-right order, or press 🚫 Loại 不良
// if the tray is defective.

export const BENTO = {
  BELT_LEN: 37.2,     // 4 conveyor segments × 9.3 m
  ZONE0: 21.0,        // work zone start along the belt
  ZONE1: 24.0,        // work zone end (3.0 m wide, matching original 0.6..3.6)
  LOOKAHEAD: 2.5,     // show icon before entering ZONE0
  SPEED0: 1.5,        // default belt speed (m/s)
  SPEED_ADD: 0.09,    // belt speed increase per completed tray (raised from 0.07 -> 0.09 in TASK-S10)
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

export const DEFECTS = {
  hair:   { id: 'hair',   icon: '💇', jp: '異物（髪の毛）', vi: 'Có sợi tóc trong khay' },
  lid:    { id: 'lid',    icon: '📐', jp: '容器不良',       vi: 'Khay bị lệch vành' },
  norice: { id: 'norice', icon: '🍚', jp: 'ご飯なし',       vi: 'Khay thiếu phần cơm' },
};
export const DEFECT_KEYS = ['hair', 'lid', 'norice'];

function makeTray(st, x, rand) {
  const i = Math.floor(rand() * ITEM_KEYS.length) % ITEM_KEYS.length;
  const j = (i + 1 + (Math.floor(rand() * 2) % 2)) % ITEM_KEYS.length;
  const [minItems, maxItems] = st.multi || [1, 1];
  const order = [ITEM_KEYS[i]];
  if (maxItems > 1) {
    const span = Math.max(0, maxItems - minItems);
    const len = minItems + (span > 0 ? Math.floor(rand() * (span + 1)) % (span + 1) : 0);
    for (let k = 1; k < len; k++) {
      const next = ITEM_KEYS[(ITEM_KEYS.indexOf(order[k - 1]) + 1 + (Math.floor(rand() * 2) % 2)) % ITEM_KEYS.length];
      order.push(next);
    }
  }
  let defect = null;
  if (st.defectRate > 0) {
    const roll = rand();
    if (!st.lastDefect && roll < st.defectRate) {
      defect = DEFECT_KEYS[Math.floor(rand() * DEFECT_KEYS.length) % DEFECT_KEYS.length];
      st.lastDefect = true;
    } else {
      st.lastDefect = false;
    }
  }
  return {
    id: ++st.seq,
    x,
    need: order[0],
    order,
    placed: [],
    stepIdx: 0,
    defect,
    other: ITEM_KEYS[j],
    done: false,
    rejected: false,
    missed: false,
  };
}

/** Spawn interval (s) for a given belt speed so tray spacing stays SPAWN_DIST (3.75 m). */
export const spawnInterval = (speed) => BENTO.SPAWN_BASE / (speed / BENTO.SPEED0);

/**
 * Create a bento shift state.
 * opts: { goal, speed (default 1.5), maxMiss (0 = none), multi ([min, max] items), defect (0..1 rate), prefill (default true) }
 */
export function createBento(opts = {}, rand = Math.random) {
  const speed = opts.speed || BENTO.SPEED0;
  const multi = Array.isArray(opts.multi) ? opts.multi : opts.multi ? [1, opts.multi] : [1, 1];
  const defectRate = typeof opts.defect === 'number' ? opts.defect : opts.defect ? 0.125 : 0;
  const st = {
    goal: opts.goal || 8,
    maxMiss: opts.maxMiss || 0,
    speed,
    multi,
    defectRate,
    lastDefect: false,
    count: 0,
    rejected: 0,
    miss: 0,
    streak: 0,
    maxStreak: 0,
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

function addMiss(st) {
  st.miss++;
  st.streak = 0;
  st.lock = BENTO.LOCK_BAD;
  if (st.maxMiss && st.miss > st.maxMiss) {
    st.over = true;
    st.result = 'lose';
    st.loseWhy = 'Sai quá nhiều lần rồi.';
    st.losePending = true;
  }
}

/**
 * Player presses an item button ('karaage' | 'sausage' | 'veg') or 'reject' (🚫 Loại 不良).
 * Returns 'good' | 'step' | 'rejected' | 'bad' | 'bad_defect' | 'bad_reject' | 'early' | 'locked'.
 */
export function act(st, item) {
  if (st.over || st.lock > 0) return 'locked';
  const t = activeTray(st);
  if (!t) return 'early';

  if (item === 'reject') {
    if (t.defect) {
      t.done = true;
      t.rejected = true;
      st.rejected++;
      st.streak++;
      if (st.streak > st.maxStreak) st.maxStreak = st.streak;
      st.lock = BENTO.LOCK_GOOD;
      return 'rejected';
    }
    addMiss(st);
    return 'bad_reject';
  }

  if (t.defect) {
    t.missed = true;
    addMiss(st);
    return 'bad_defect';
  }

  const order = t.order || [t.need];
  const idx = t.stepIdx || 0;
  const want = order[idx];

  if (want === item) {
    if (!t.placed) t.placed = [];
    t.placed.push(item);
    const nextIdx = idx + 1;
    t.stepIdx = nextIdx;
    st.lock = BENTO.LOCK_GOOD;
    if (nextIdx < order.length) {
      t.need = order[nextIdx];
      return 'step';
    }
    t.done = true;
    st.count++;
    st.streak++;
    if (st.streak > st.maxStreak) st.maxStreak = st.streak;
    st.speed = Math.min(BENTO.SPEED_MAX, Math.round((st.speed + BENTO.SPEED_ADD) * 1000) / 1000);
    if (st.count >= st.goal) {
      st.over = true;
      st.result = 'win';
      st.winPending = true;
    }
    return 'good';
  }

  addMiss(st);
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
      st.streak = 0;
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

/** Extra star condition for bento factory: streak of >= 5 consecutive boxes without mistake. */
export const bentoExtra = (st) => (st.maxStreak || 0) >= 5;

/** Completed fraction 0..1 (for shiftEnd). */
export const bentoFraction = (st) => Math.max(0, Math.min(1, st.count / Math.max(1, st.goal)));
