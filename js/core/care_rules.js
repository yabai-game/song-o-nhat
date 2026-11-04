// Care-home shift rules (j3Care in the original, spec §4.6 / §16) — pure module, no DOM / three.js.
// Four residents sit in the dining room; each one says what they need in Japanese and the player
// must pick the matching action. There are no hints: understanding the Japanese is the game.

export const CARE = {
  REACH: 2.2,          // must stand this close to a resident to help
  ACT_TIME: 1.1,       // seconds an action takes
  GOOD: 14,            // satisfaction gained for the right action
  BAD: 8,              // satisfaction lost for the wrong one
  WAIT_MIN: 7,         // a helped resident is content for 7..12 s, then needs something new
  WAIT_RAND: 5,
  SAT0: 55, SAT_STEP: 6, // starting satisfaction 55 / 61 / 67 / 73 %
};

/** need key → what the resident says, and the polite line the player answers with */
export const NEEDS = {
  feed: { jp: 'お腹がすいたよ…', vi: 'Đói bụng rồi…', say: 'ゆっくり食べましょうね', sayVi: 'Mình ăn từ từ nhé ạ' },
  wipe: { jp: '口の周りが汚れちゃった', vi: 'Dính bẩn quanh miệng rồi', say: 'お口を拭きますね', sayVi: 'Cháu lau miệng cho bà nhé' },
  talk: { jp: 'さみしいねえ…', vi: 'Buồn quá…', say: '今日はいい天気ですね', sayVi: 'Hôm nay trời đẹp bà nhỉ' },
  comfort: { jp: '家に帰りたい…', vi: 'Tôi muốn về nhà…', say: '大丈夫ですよ、そばにいますよ', sayVi: 'Không sao đâu ạ, có cháu ở đây' },
};
export const KEYS = ['feed', 'wipe', 'talk', 'comfort'];

/** opts: { goal, limit (s, 0 = none), maxMiss (0 = none) }, n residents */
export function createCare(opts, n = 4) {
  return {
    goal: opts.goal, limit: opts.limit || 0, maxMiss: opts.maxMiss || 0,
    time: opts.limit || 0, count: 0, miss: 0, busy: 0, over: false, result: null, loseWhy: '', warned: false,
    folk: Array.from({ length: n }, (_, i) => ({ need: KEYS[(i * 2 + 1) % 4], sat: CARE.SAT0 + i * CARE.SAT_STEP, wait: 0 })),
  };
}

/** index of the resident with a need closest to (x, z) within REACH, or −1 */
export function nearestNeed(st, spots, x, z) {
  let best = -1, bd = CARE.REACH;
  st.folk.forEach((f, i) => {
    if (!f.need) return;
    const d = Math.hypot(spots[i].x - x, spots[i].z - z);
    if (d <= bd) { bd = d; best = i; }
  });
  return best;
}

/**
 * The player does action `id` for resident i. Returns 'busy' | 'none' | 'good' | 'bad'.
 * rng() in [0, 1) decides how long the resident stays content.
 */
export function act(st, i, id, rng = Math.random) {
  if (st.over || st.busy > 0) return 'busy';
  const f = st.folk[i];
  if (!f || !f.need) return 'none';
  if (f.need === id) {
    f.sat = Math.min(100, f.sat + CARE.GOOD);
    f.need = null; f.wait = CARE.WAIT_MIN + rng() * CARE.WAIT_RAND;
    st.count++; st.busy = CARE.ACT_TIME;
    if (st.count >= st.goal) { st.over = true; st.result = 'win'; }
    return 'good';
  }
  f.sat = Math.max(0, f.sat - CARE.BAD);
  st.miss++;
  if (st.maxMiss && st.miss > st.maxMiss) { st.over = true; st.result = 'lose'; st.loseWhy = 'Sai quá nhiều lần rồi.'; }
  return 'bad';
}

/** Advance time; returns events ('need' with index, 'warn10', 'lose'). rng picks new needs. */
export function step(st, dt, rng = Math.random) {
  const ev = [];
  if (st.over) return ev;
  if (st.busy > 0) st.busy = Math.max(0, st.busy - dt);
  st.folk.forEach((f, i) => {
    if (f.need) return;
    f.wait -= dt;
    if (f.wait <= 0) { f.need = KEYS[Math.floor(rng() * KEYS.length) % KEYS.length]; ev.push(['need', i]); }
  });
  if (st.limit) {
    st.time -= dt;
    if (!st.warned && st.time <= 10) { st.warned = true; ev.push(['warn10']); }
    if (st.time <= 0) { st.time = 0; st.over = true; st.result = 'lose'; st.loseWhy = 'Hết giờ!'; ev.push(['lose']); }
  }
  return ev;
}

/** completed fraction 0..1 (for shiftEnd) */
export const careFraction = (st) => Math.min(1, st.count / Math.max(1, st.goal));
