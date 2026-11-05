// Care-home shift rules (j3Care in the original, spec §4.6 / §16) — pure module, no DOM / three.js.
// Four residents sit in the dining room; each one says what they need in Japanese and the player
// must pick the matching action. Vietnamese meaning appears after hintDelay (or via 💡 Gợi ý).

export const CARE = {
  REACH: 2.2,          // must stand this close to a resident to help
  ACT_TIME: 1.1,       // seconds an action takes
  GOOD: 14,            // satisfaction gained for the right action
  BAD: 8,              // satisfaction lost for the wrong one
  WAIT_MIN: 7,         // a helped resident is content for 7..12 s, then needs something new
  WAIT_RAND: 5,
  SAT0: 55, SAT_STEP: 6, // starting satisfaction 55 / 61 / 67 / 73 %
  URGENT_TIME: 6.0,    // seconds to reach a wobbling resident and press 🤲 Đỡ cụ 支える
  URGENT_FIRST: 11.0,  // seconds until first urgent incident
  URGENT_GAP: 15.0,    // base seconds before a second urgent incident
};

/** need key → 3 Japanese phrase variants, Vietnamese meaning, and polite reply */
export const NEEDS = {
  feed: {
    jp: 'お腹がすいたよ…',
    phrases: [
      'お腹がすいたよ…',
      'なんだかお腹が減ったねえ…',
      'そろそろご飯はまだかい？',
    ],
    vi: 'Đói bụng rồi…',
    say: 'ゆっくり食べましょうね',
    sayVi: 'Mình ăn từ từ nhé ạ',
  },
  wipe: {
    jp: '口の周りが汚れちゃった',
    phrases: [
      '口の周りが汚れちゃった',
      '口元がちょっとこぼれちゃって…',
      'お口を拭いてもらえるかい？',
    ],
    vi: 'Dính bẩn quanh miệng rồi',
    say: 'お口を拭きますね',
    sayVi: 'Cháu lau miệng cho bà nhé',
  },
  talk: {
    jp: 'さみしいねえ…',
    phrases: [
      'さみしいねえ…',
      '誰か少し話し相手になっておくれ',
      'ひとりでいると退屈でねえ…',
    ],
    vi: 'Buồn quá…',
    say: '今日はいい天気ですね',
    sayVi: 'Hôm nay trời đẹp bà nhỉ',
  },
  comfort: {
    jp: '家に帰りたい…',
    phrases: [
      '家に帰りたい…',
      'ここはどこ？お家に帰らせて…',
      'なんだか不安でたまらないよ…',
    ],
    vi: 'Tôi muốn về nhà…',
    say: '大丈夫ですよ、そばにいますよ',
    sayVi: 'Không sao đâu ạ, có cháu ở đây',
  },
};
for (const v of Object.values(NEEDS)) v.jps = v.phrases;
export const KEYS = ['feed', 'wipe', 'talk', 'comfort'];

/**
 * opts: { goal, limit, maxMiss, hintDelay (s, -1 = button only), decay (/s), urgent (0..2), waitMin, waitRand }
 */
export function createCare(opts = {}, n = 4, rng = Math.random) {
  const hintDelay = opts.hintDelay !== undefined ? opts.hintDelay : 0;
  const decay = opts.decay !== undefined ? opts.decay : 0;
  const urgentLeft = opts.urgent || 0;
  const folk = Array.from({ length: n }, (_, i) => {
    const need = KEYS[(i * 2 + 1) % 4];
    const sat = CARE.SAT0 + i * CARE.SAT_STEP;
    const ph = NEEDS[need].phrases;
    return {
      need,
      jp: ph[i % ph.length],
      needAge: 0,
      hintShown: hintDelay === 0,
      sat,
      wait: 0,
    };
  });
  return {
    goal: opts.goal,
    limit: opts.limit || 0,
    maxMiss: opts.maxMiss || 0,
    hintDelay,
    decay,
    waitMin: opts.waitMin || CARE.WAIT_MIN,
    waitRand: opts.waitRand || CARE.WAIT_RAND,
    urgentMax: urgentLeft,
    urgentLeft,
    urgentNextT: urgentLeft > 0 ? (opts.urgentFirst || CARE.URGENT_FIRST) : 0,
    urgent: null,
    hintUsed: false,
    minSat: folk.length ? Math.min(...folk.map((f) => f.sat)) : CARE.SAT0,
    time: opts.limit || 0,
    count: 0,
    miss: 0,
    busy: 0,
    over: false,
    result: null,
    loseWhy: '',
    warned: false,
    folk,
  };
}

/** Reveal Vietnamese hint on resident i (or all residents with active needs); marks hintUsed = true (loses 2nd ★). */
export function useHint(st, i = null) {
  if (!st || st.over) return false;
  st.hintUsed = true;
  if (i !== null && st.folk[i]) {
    st.folk[i].hintShown = true;
  } else {
    for (const f of st.folk) if (f.need) f.hintShown = true;
  }
  return true;
}

/** index of the resident with a need (or urgent incident) closest to (x, z) within REACH, or −1 */
export function nearestNeed(st, spots, x, z) {
  if (st.urgent) {
    const u = st.urgent.i;
    if (spots[u] && Math.hypot(spots[u].x - x, spots[u].z - z) <= CARE.REACH) return u;
  }
  let best = -1, bd = CARE.REACH;
  st.folk.forEach((f, i) => {
    if (!f.need) return;
    const d = Math.hypot(spots[i].x - x, spots[i].z - z);
    if (d <= bd) { bd = d; best = i; }
  });
  return best;
}

/**
 * The player does action `id` ('feed'|'wipe'|'talk'|'comfort'|'support') for resident i.
 * Returns 'busy' | 'none' | 'good' | 'bad' | 'saved'.
 */
export function act(st, i, id, rng = Math.random) {
  if (st.over || st.busy > 0) return 'busy';
  if (id === 'support') {
    if (!st.urgent || st.urgent.i !== i) return 'none';
    const uf = st.folk[i];
    st.urgent = null;
    if (uf) uf.sat = Math.min(100, Math.round(uf.sat + CARE.GOOD));
    st.busy = 0.8;
    return 'saved';
  }
  if (st.urgent) {
    st.miss++;
    if (st.maxMiss && st.miss > st.maxMiss) {
      st.over = true;
      st.result = 'lose';
      st.loseWhy = 'Sai quá nhiều lần rồi.';
    }
    return 'bad_urgent';
  }
  const f = st.folk[i];
  if (!f || !f.need) return 'none';
  if (f.need === id) {
    f.sat = Math.min(100, Math.round(f.sat + CARE.GOOD));
    f.need = null;
    f.needAge = 0;
    f.hintShown = false;
    f.wait = (st.waitMin || CARE.WAIT_MIN) + rng() * (st.waitRand || CARE.WAIT_RAND);
    st.count++;
    st.busy = CARE.ACT_TIME;
    if (st.count >= st.goal) { st.over = true; st.result = 'win'; }
    return 'good';
  }
  f.sat = Math.max(0, Math.round(f.sat - CARE.BAD));
  if (f.sat < st.minSat) st.minSat = f.sat;
  st.miss++;
  if (st.maxMiss && st.miss > st.maxMiss) {
    st.over = true;
    st.result = 'lose';
    st.loseWhy = 'Sai quá nhiều lần rồi.';
  }
  return 'bad';
}

/**
 * Advance time; returns events:
 * ['need', i], ['sat0', i], ['urgent', i], ['urgent_fail', i], ['warn10'], ['lose'].
 */
export function step(st, dt, rng = Math.random) {
  const ev = [];
  if (st.over) return ev;
  if (st.busy > 0) st.busy = Math.max(0, st.busy - dt);

  st.folk.forEach((f, i) => {
    if (f.need) {
      f.needAge = (f.needAge || 0) + dt;
      if (st.hintDelay >= 0 && f.needAge >= st.hintDelay) f.hintShown = true;
      if (st.decay > 0) {
        f.sat = Math.max(0, f.sat - st.decay * dt);
        if (f.sat < st.minSat) st.minSat = f.sat;
        if (f.sat <= 0) {
          st.minSat = 0;
          f.sat = 45;
          const curIdx = KEYS.indexOf(f.need);
          const nextNeed = KEYS[(curIdx + 1 + (Math.floor(rng() * 3) % 3)) % KEYS.length];
          const ph = NEEDS[nextNeed].phrases;
          f.need = nextNeed;
          f.jp = ph[Math.floor(rng() * ph.length) % ph.length];
          f.needAge = 0;
          f.hintShown = st.hintDelay === 0;
          st.miss++;
          ev.push(['sat0', i]);
          if (st.maxMiss && st.miss > st.maxMiss && !st.over) {
            st.over = true;
            st.result = 'lose';
            st.loseWhy = 'Để các cụ chờ quá lâu!';
            ev.push(['lose']);
          }
        }
      }
      return;
    }
    f.wait -= dt;
    if (f.wait <= 0) {
      const nk = KEYS[Math.floor(rng() * KEYS.length) % KEYS.length];
      const ph = NEEDS[nk].phrases;
      f.need = nk;
      f.jp = ph[Math.floor(rng() * ph.length) % ph.length];
      f.needAge = 0;
      f.hintShown = st.hintDelay === 0;
      ev.push(['need', i]);
    }
  });

  // Urgent incident: resident stands up wobbling 「あっ…！」, player has 6 s to press 🤲 Đỡ cụ 支える
  if (st.urgent && !st.over) {
    st.urgent.time -= dt;
    if (st.urgent.time <= 0) {
      const ui = st.urgent.i;
      st.urgent = null;
      st.miss += 2;
      if (st.folk[ui]) {
        st.folk[ui].sat = Math.max(0, st.folk[ui].sat - CARE.BAD * 2);
        if (st.folk[ui].sat < st.minSat) st.minSat = st.folk[ui].sat;
      }
      ev.push(['urgent_fail', ui]);
      if (st.maxMiss && st.miss > st.maxMiss && !st.over) {
        st.over = true;
        st.result = 'lose';
        st.loseWhy = 'Không kịp đỡ cụ khi loạng choạng!';
        ev.push(['lose']);
      }
    }
  } else if (!st.urgent && st.urgentLeft > 0 && !st.over) {
    st.urgentNextT -= dt;
    if (st.urgentNextT <= 0) {
      const ui = Math.floor(rng() * st.folk.length) % st.folk.length;
      st.urgent = { i: ui, time: CARE.URGENT_TIME };
      st.urgentLeft--;
      st.urgentNextT = CARE.URGENT_GAP + rng() * 5;
      ev.push(['urgent', ui]);
    }
  }

  if (st.limit && !st.over) {
    st.time -= dt;
    if (!st.warned && st.time <= 10) { st.warned = true; ev.push(['warn10']); }
    if (st.time <= 0) {
      st.time = 0;
      st.over = true;
      st.result = 'lose';
      st.loseWhy = 'Hết giờ!';
      ev.push(['lose']);
    }
  }
  return ev;
}

/** Extra star condition for care home: no resident dropped below 30% satisfaction. */
export const careExtra = (st) => Math.round(st.minSat ?? CARE.SAT0) >= 30;

/** completed fraction 0..1 (for shiftEnd) */
export const careFraction = (st) => Math.min(1, st.count / Math.max(1, st.goal));
