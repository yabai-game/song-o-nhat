// Earthquake (緊急地震速報), emergency bag (非常持ち出し袋), typhoon preparation, and evacuation shelter (避難所) — pure module.
import { applyFx } from './state.js';
import { DAYS_PER_SEASON } from './calendar.js';

export const PREP_ITEMS = [
  { id: 'water', icon: '💧', jp: '飲料水 (2L×3)', vi: 'Nước uống dự trữ', cost: 600 },
  { id: 'food',  icon: '🥫', jp: '非常食・乾パン', vi: 'Đồ hộp & lương khô', cost: 900 },
  { id: 'light', icon: '🔦', jp: '懐中電灯', vi: 'Đèn pin khẩn cấp', cost: 800 },
  { id: 'radio', icon: '📻', jp: '携帯ラジオ・電池', vi: 'Đài radio & pin dự phòng', cost: 900 },
  { id: 'bag',   icon: '🎒', jp: '非常持ち出し袋', vi: 'Túi khẩn cấp chống cháy', cost: 800 },
];

export const DISASTER = {
  KIT_TOTAL_COST: 4000,
  QUAKE_COUNTDOWN_SEC: 4,
  QUAKE_OK_MENTAL: -2,
  QUAKE_OK_PREPARED_MENTAL: -1,
  QUAKE_FAIL_HEALTH: -8,
  QUAKE_FAIL_MENTAL: -8,
  QUAKE_FAIL_PREPARED_MENTAL: -5,
  STORM_UNPREPARED_MENTAL: -6,
  STORM_PREP_KIT_MENTAL: -3,
};

export const QUAKE_STEPS = [
  {
    id: 'step1',
    title: '緊急地震速報 — Cảnh báo động đất khẩn cấp!',
    prompt: 'Điện thoại hú còi báo động và mặt đất bắt đầu rung chuyển! Trong 4 giây bạn làm gì?',
    countdownSec: 4,
    options: [
      { id: 'table', jp: '机の下に隠れる', vi: '机の下に隠れる — Trốn dưới bàn, che đầu', ok: true },
      { id: 'outside', jp: '外へ飛び出す', vi: 'Chạy lao ngay ra ngoài đường', ok: false },
      { id: 'window', jp: '窓の近くに立つ', vi: 'Đứng cạnh cửa sổ nhìn ra ngoài', ok: false },
    ],
  },
  {
    id: 'step2',
    title: 'Sau đợt rung chính — Bảo đảm lối thoát!',
    prompt: 'Cơn rung mạnh vừa ngớt, bạn xử lý tiếp thế nào trong 4 giây?',
    countdownSec: 4,
    options: [
      { id: 'gas_door', jp: '火を消してドアを開ける', vi: 'Tắt bếp, mở cửa thoát hiểm', ok: true },
      { id: 'elevator', jp: 'エレベーターに乗る', vi: 'Bấm thang máy xuống tầng trệt', ok: false },
    ],
  },
];

export const SHELTER_QUESTION = {
  jp: '指定避難所',
  q: 'Khi có lệnh sơ tán khẩn cấp do bão lũ hoặc động đất lớn, nơi sơ tán 避難所 gần ký túc xá nhất là ở đâu?',
  options: [
    'Trường học công lập gần nhà (近くの小・中学校)',
    'Siêu thị スーパー さくら',
    'Sân ga さくら駅',
  ],
  answer: 'Trường học công lập gần nhà (近くの小・中学校)',
  correctIdx: 0,
};

function seasonHash(year, season, seed) {
  let h = ((year || 1) * 73856093) ^ ((season || 0) * 19349663) ^ ((seed || 1) * 2654435761) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Ensure `S.prep` exists with all 5 emergency bag keys and storm flags. */
export function ensurePrep(S) {
  if (!S) return null;
  if (!S.prep || typeof S.prep !== 'object') {
    S.prep = {
      water: false,
      food: false,
      light: false,
      radio: false,
      bag: false,
      stormReady: false,
      shelterKnown: false,
    };
  }
  return S.prep;
}

/** Emergency preparedness score from 0 to 5 based on owned items in `S.prep`. */
export function prepScore(S) {
  const p = S?.prep;
  if (!p || typeof p !== 'object') return 0;
  let score = 0;
  for (const item of PREP_ITEMS) {
    if (p[item.id]) score += 1;
  }
  return score;
}

/** Buy a single emergency bag item or the full remaining kit (~4,000 ¥ total). */
export function buyPrep(S, itemId = 'all') {
  const p = ensurePrep(S);
  if (!p) return { ok: false, why: 'state', cost: 0, deltas: [] };

  if (itemId !== 'all') {
    const item = PREP_ITEMS.find((x) => x.id === itemId);
    if (!item) return { ok: false, why: 'item', cost: 0, deltas: [] };
    if (p[item.id]) return { ok: false, why: 'owned', cost: 0, deltas: [] };
    if ((S.money || 0) < item.cost) return { ok: false, why: 'money', cost: item.cost, deltas: [] };
    p[item.id] = true;
    const deltas = applyFx(S, { money: -item.cost });
    return { ok: true, cost: item.cost, score: prepScore(S), deltas };
  }

  const missing = PREP_ITEMS.filter((x) => !p[x.id]);
  if (!missing.length) return { ok: false, why: 'owned', cost: 0, score: 5, deltas: [] };
  const cost = missing.reduce((sum, x) => sum + x.cost, 0);
  if ((S.money || 0) < cost) return { ok: false, why: 'money', cost, deltas: [] };
  for (const x of missing) p[x.id] = true;
  const deltas = applyFx(S, { money: -cost });
  return { ok: true, cost, score: prepScore(S), deltas };
}

/**
 * Deterministic earthquake check for `cal` and `seed`:
 * - At most 1 time per season (`<= 1 / mùa`)
 * - Overall frequency ~2% per day (`56%` of seasons have 1 quake day out of 28 days -> `0.56 / 28 = 0.02`)
 */
export function quakeToday(S, cal = S?.cal, seed = S?.seed ?? 1) {
  const c = cal || S?.cal;
  if (!c) return false;
  const y = c.year || 1;
  const s = (c.season ?? 0) & 3;
  const d = Math.max(1, Math.min(DAYS_PER_SEASON, c.day || 1));
  const h = seasonHash(y, s, seed);
  // 56% of seasons have exactly 1 quake day -> 0.56 / 28 = 2.0% per day, strictly <= 1 per season
  if ((h % 100) >= 56) return false;
  const quakeDay = 1 + ((h >>> 8) % DAYS_PER_SEASON);
  return d === quakeDay;
}

function isStep1Correct(ans) {
  return ans === 'table' || ans === '机の下に隠れる' || ans === 0 || ans === true;
}

function isStep2Correct(ans) {
  return (
    ans === 'gas_door'
    || ans === '火を消してドアを開ける'
    || ans === 'tắt bếp, mở cửa thoát hiểm'
    || ans === 0
    || ans === true
  );
}

/**
 * Resolve the 2-step earthquake emergency response (`緊急地震速報`):
 * - Both steps right: 🧠 −2 (or 🧠 −1 if `prepScore(S) >= 4`)
 * - Any step wrong or timed out: ❤️ −8, 🧠 −8 (or 🧠 −5 if `prepScore(S) >= 4`)
 */
export function resolveQuake(S, step1Ans, step2Ans) {
  ensurePrep(S);
  const ok1 = isStep1Correct(step1Ans);
  const ok2 = isStep2Correct(step2Ans);
  const allOk = ok1 && ok2;
  const wellPrepared = prepScore(S) >= 4;

  let fx;
  if (allOk) {
    fx = { mental: wellPrepared ? DISASTER.QUAKE_OK_PREPARED_MENTAL : DISASTER.QUAKE_OK_MENTAL };
  } else {
    fx = {
      health: DISASTER.QUAKE_FAIL_HEALTH,
      mental: wellPrepared ? DISASTER.QUAKE_FAIL_PREPARED_MENTAL : DISASTER.QUAKE_FAIL_MENTAL,
    };
  }
  const deltas = S ? applyFx(S, fx) : [];
  return {
    ok: allOk,
    ok1,
    ok2,
    wellPrepared,
    deltas,
  };
}

/** Mark that the player prepared water, taped windows, and charged batteries the night before a typhoon. */
export function markStormReady(S, cost = 500) {
  const p = ensurePrep(S);
  if (!p) return { ok: false };
  if (cost > 0 && (S.money || 0) >= cost) {
    applyFx(S, { money: -cost });
  }
  p.stormReady = true;
  p.water = true;
  return { ok: true, stormReady: true };
}

/**
 * Evaluate or set typhoon preparation (`stormPrep(S)`):
 * - If `prepared === true` or `S.prep.stormReady === true`: no mental loss (🧠 0)
 * - If not prepared: 🧠 −6 (or 🧠 −3 if emergency bag `prepScore(S) >= 4`)
 */
export function stormPrep(S, prepared = undefined) {
  const p = ensurePrep(S);
  if (prepared === true && p) {
    p.stormReady = true;
  } else if (prepared === false && p) {
    p.stormReady = false;
  }

  const isReady = !!(p && p.stormReady);
  if (isReady) {
    p.stormReady = false; // consumed for today's typhoon
    return { ok: true, prepared: true, mentalDelta: 0, deltas: [] };
  }

  const hasKit = prepScore(S) >= 4;
  const mentalLoss = hasKit ? DISASTER.STORM_PREP_KIT_MENTAL : DISASTER.STORM_UNPREPARED_MENTAL;
  const deltas = S ? applyFx(S, { mental: mentalLoss }) : [];
  return {
    ok: true,
    prepared: false,
    hasKit,
    mentalDelta: mentalLoss,
    deltas,
  };
}

/**
 * Answer the evacuation shelter (`避難所`) question:
 * Knowing the nearby public school (`trường học gần nhà`) grants 🎌 culture +2.
 */
export function answerShelter(S, choice) {
  const p = ensurePrep(S);
  const ok =
    choice === 0
    || choice === 'school'
    || choice === true
    || choice === SHELTER_QUESTION.answer
    || (typeof choice === 'string' && choice.includes('Trường'));
  let deltas = [];
  if (ok && p && !p.shelterKnown) {
    p.shelterKnown = true;
    // applyFx scales culture by 0.5, so 4 -> +2
    deltas = applyFx(S, { culture: 4 });
  }
  return { ok, deltas };
}
