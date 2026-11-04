// Sunday day off (日曜日) at Sakura Shrine (さくら神社) before the first-week evaluation:
// 9:00 clock start, 1 min/sec walk rate, お参り (二礼二拍手一礼 after 5 ¥ coin), おみくじ (100 ¥),
// お花見 (30 min with Hùng & Hoa), and a +20 mental cap across the day off — pure module.
import { applyFx } from './state.js';

export const DAYOFF = {
  START: 9 * 60,       // 9:00 AM
  WALK_MIN: 1,         // 1 game minute per second when walking
  COIN_FEE: 5,         // 5 ¥ 賽銭
  OMIKUJI_FEE: 100,    // 100 ¥ おみくじ
  HANAMI_MIN: 30,      // 30 game minutes
  MAX_MENTAL: 20,      // maximum total mental gain on the day off
};

// 二礼二拍手一礼 preceded by tossing a 5 ¥ coin (6 steps total)
export const PRAY_SEQ = ['coin', 'bow', 'bow', 'clap', 'clap', 'bow'];

export const PRAY_STEPS = {
  coin: { id: 'coin', icon: '💴', label: 'Bỏ tiền',   jp: 'お賽銭', hint: 'Bỏ đồng 5 ¥ vào hộp 賽銭箱 (お賽銭)' },
  bow:  { id: 'bow',  icon: '🙇', label: 'Cúi chào', jp: '礼',     hint: 'Cúi chào sâu (礼)' },
  clap: { id: 'clap', icon: '👏', label: 'Vỗ tay',   jp: '拍手',   hint: 'Vỗ tay (拍手)' },
};

export const PRAY_FX = { culture: 5, mental: 5 };

// 15% 大吉, 25% 中吉, 30% 吉, 20% 小吉, 10% 凶
export const OMIKUJI = [
  {
    id: 'daikichi',
    jp: '大吉',
    vi: 'Đại Cát — Vận khí rực rỡ, công việc thuận buồm xuôi gió!',
    chance: 0.15,
    fx: { mental: 6 },
  },
  {
    id: 'chukichi',
    jp: '中吉',
    vi: 'Trung Cát — Gặp người tốt bụng chỉ dẫn, tiếng Nhật tiến bộ nhanh!',
    chance: 0.25,
    fx: { mental: 4 },
  },
  {
    id: 'kichi',
    jp: '吉',
    vi: 'Cát — Ngày tháng bình yên, chăm chỉ sẽ gặt quả ngọt.',
    chance: 0.30,
    fx: { mental: 3 },
  },
  {
    id: 'shokichi',
    jp: '小吉',
    vi: 'Tiểu Cát — Có niềm vui nhỏ cuối tuần, nhớ giữ sức khỏe.',
    chance: 0.20,
    fx: { mental: 2 },
  },
  {
    id: 'kyo',
    jp: '凶',
    vi: 'Hung — Hơi xui một chút, hãy buộc giấy quẻ lên giá để hóa giải!',
    chance: 0.10,
    fx: { mental: -2 },
    tieTip: 'Buộc quẻ 凶 lên giá おみくじ掛け để gửi lại điều xui ở đền (tinh thần về 0, không bị âm).',
  },
];

export const HANAMI_FX = { mental: 8, team: 3 };

export const HANAMI_LINES = [
  {
    who: 'hung',
    jp: '「桜が満開だね。休みの日にみんなで花見できて最高だよ！」',
    vi: 'Hoa anh đào nở rộ đẹp thật. Ngày nghỉ được ngồi ngắm hoa cùng anh em thế này tuyệt quá!',
  },
  {
    who: 'hoa',
    jp: '「風が気持ちいいですね。お茶とお団子、どうぞ食べてください！」',
    vi: 'Gió mát dễ chịu quá. Mời mọi người uống trà và ăn bánh dango nhé!',
  },
];

export function createDayOff(S = null) {
  return {
    min: DAYOFF.START,
    phase: 'room',
    prayIdx: 0,
    coinPaid: false,
    prayed: false,
    omikuji: null,
    omikujiData: null,
    tiedKyo: false,
    hanami: false,
    mentalGained: 0,
    S,
  };
}

export function tickDayOff(st, dt) {
  if (!st || !(dt > 0)) return;
  st.min += dt * DAYOFF.WALK_MIN;
}

/** Clamps positive mental gains so the total mental gained during the day off never exceeds +20. */
export function capDayOffFx(st, fx, targetS = null) {
  if (!fx) return {};
  const out = { ...fx };
  if (typeof out.mental === 'number' && out.mental > 0 && st) {
    const room = Math.max(0, DAYOFF.MAX_MENTAL - (st.mentalGained || 0));
    out.mental = Math.min(out.mental, room);
    st.mentalGained = (st.mentalGained || 0) + out.mental;
  }
  const S = targetS || (st && st.S);
  if (S) applyFx(S, out);
  return out;
}

/**
 * Advances one step in the shrine prayer sequence: coin -> bow -> bow -> clap -> clap -> bow.
 * - Right action advances st.prayIdx; completing all 6 grants { culture: 5, mental: 5 } once per day off.
 * - Wrong action resets st.prayIdx to 0 and returns a hint for the expected step (no money penalty).
 */
export function prayStep(st, act, S = null) {
  if (!st) return { ok: false, reason: 'invalid' };
  if (st.prayed) return { ok: false, reason: 'done', done: true };
  const targetS = S || st.S;
  const want = PRAY_SEQ[st.prayIdx];

  if (act !== want) {
    const expectedStep = PRAY_STEPS[want];
    st.prayIdx = 0;
    return {
      ok: false,
      reason: 'wrong_step',
      expected: want,
      want,
      hint: expectedStep ? expectedStep.hint : '',
      restartHint: PRAY_STEPS[PRAY_SEQ[0]].hint,
      idx: 0,
    };
  }

  if (act === 'coin' && !st.coinPaid) {
    if (targetS && (targetS.money || 0) < DAYOFF.COIN_FEE) {
      return { ok: false, reason: 'money', expected: 'coin', idx: st.prayIdx };
    }
    if (targetS) targetS.money -= DAYOFF.COIN_FEE;
    st.coinPaid = true;
  }

  st.prayIdx += 1;
  if (st.prayIdx >= PRAY_SEQ.length) {
    st.prayed = true;
    st.min += 5;
    const fx = capDayOffFx(st, PRAY_FX, targetS);
    if (targetS) {
      targetS.flags = targetS.flags || {};
      targetS.flags.dayOff = { ...(targetS.flags.dayOff || {}), prayed: true };
    }
    return { ok: true, done: true, step: act, idx: st.prayIdx, fx };
  }

  const nextKey = PRAY_SEQ[st.prayIdx];
  return {
    ok: true,
    done: false,
    step: act,
    idx: st.prayIdx,
    next: nextKey,
    hint: PRAY_STEPS[nextKey].hint,
  };
}

/** Pure fortune draw with 15 / 25 / 30 / 20 / 10 % probabilities. */
export function pickOmikuji(rng = Math.random) {
  let r = rng();
  for (const item of OMIKUJI) {
    if ((r -= item.chance) < 0) return { ...item, fx: { ...item.fx } };
  }
  const last = OMIKUJI[OMIKUJI.length - 1];
  return { ...last, fx: { ...last.fx } };
}

/**
 * Draws an omikuji:
 * - If called as drawOmikuji(rngFn) (or with no args), returns the picked fortune object directly.
 * - If called as drawOmikuji(st, S, rngFn, { tieKyo }), charges 100 ¥ (once per day off), records the
 *   fortune in st, neutralizes 凶 mental penalty to 0 if tieKyo is true, and applies capped fx.
 */
export function drawOmikuji(arg1 = Math.random, S = null, rng = Math.random, opts = {}) {
  if (typeof arg1 === 'function' || arg1 === undefined) {
    return pickOmikuji(arg1 || Math.random);
  }
  const st = arg1;
  if (!st) return { ok: false, reason: 'invalid' };
  if (st.omikuji) return { ok: false, reason: 'done' };
  const targetS = S || st.S;
  if (targetS && (targetS.money || 0) < DAYOFF.OMIKUJI_FEE) {
    return { ok: false, reason: 'money' };
  }
  if (targetS) targetS.money -= DAYOFF.OMIKUJI_FEE;

  const fortune = pickOmikuji(typeof rng === 'function' ? rng : Math.random);
  st.omikuji = fortune.jp;
  st.omikujiData = fortune;
  st.min += 5;

  const rawFx = { ...fortune.fx };
  if (fortune.id === 'kyo' && opts && opts.tieKyo) {
    rawFx.mental = 0;
    st.tiedKyo = true;
  }
  const fx = capDayOffFx(st, rawFx, targetS);
  if (targetS) {
    targetS.flags = targetS.flags || {};
    targetS.flags.dayOff = { ...(targetS.flags.dayOff || {}), omikuji: fortune.jp };
  }
  return { ok: true, fortune, jp: fortune.jp, vi: fortune.vi, fx, tieTip: fortune.tieTip || null };
}

/** Ties a 凶 (bad luck) slip onto the おみくじ掛け rack so mental loss becomes 0 (non-negative). */
export function tieOmikujiKyo(st, S = null) {
  if (!st || st.omikuji !== '凶' || st.tiedKyo) return { ok: false };
  st.tiedKyo = true;
  const targetS = S || st.S;
  if (targetS) applyFx(targetS, { mental: 2 });
  if (st.omikujiData && st.omikujiData.fx.mental < 0) st.omikujiData.fx.mental = 0;
  return { ok: true, fx: { mental: 0 } };
}

/**
 * Sitting on the blue tarp (ブルーシート) with Hùng & Hoa for 30 game minutes:
 * grants { mental: 8, team: 3 } (capped by MAX_MENTAL), once per day off.
 */
export function doHanami(st, S = null) {
  if (!st) return { ok: false, reason: 'invalid' };
  if (st.hanami) return { ok: false, reason: 'done' };
  const targetS = S || st.S;
  st.hanami = true;
  st.min += DAYOFF.HANAMI_MIN;
  const fx = capDayOffFx(st, HANAMI_FX, targetS);
  if (targetS) {
    targetS.flags = targetS.flags || {};
    targetS.flags.dayOff = { ...(targetS.flags.dayOff || {}), hanami: true };
  }
  return { ok: true, fx, lines: HANAMI_LINES, minDelta: DAYOFF.HANAMI_MIN };
}

export function dayOffSummary(S) {
  const d = (S && S.flags && S.flags.dayOff) || {};
  const p = d.prayed ? '✓' : '—';
  const q = d.omikuji || '—';
  const h = d.hanami ? '✓' : '—';
  return `🎌 Ngày nghỉ: đi lễ ${p} / quẻ ${q} / ngắm hoa ${h}`;
}
