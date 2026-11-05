// Holiday activities, limited trading-card boxes (モンスターカード 限定BOX),
// second-hand marketplace app ("Chợ Cũ" / フリマ), and illegal side-job risk — pure module.

import { applyFx } from './state.js';
import { DAYS_PER_SEASON, eventsOn, isRedDay, isOffDay } from './calendar.js';
import { totalDays } from './home_life.js';

export const HOLI = {
  BOX_PRICE: 5500,
  BOX_CUTOFF_MIN: 10 * 60, // 10:00
  BOX_MIN_VAL: 1500,
  BOX_MAX_VAL: 25000,
  APP_FEE_RATE: 0.10,
  APP_SHIP_FEE: 700,
  STRANGER_FAKE_CHANCE: 0.25,
  SIDE_JOB_PAY: 8000,
  SIDE_JOB_HEALTH: -10,
  SIDE_JOB_DAYS: 10,
  CAUGHT_CHANCE: 0.06,
  CAUGHT_FINE_1: 30000,
  CAUGHT_FX_1: { money: -30000, boss: -20, mental: -15 },
  CAUGHT_FX_2: { boss: -30, mental: -20 },
  REFUSE_LESSON: 'Thực tập sinh kỹ năng (技能実習生) chỉ được làm công việc trong hợp đồng; tự ý đi làm thêm ngoài tư cách lưu trú (資格外活動) là vi phạm pháp luật Nhật Bản.',
};

function hash01(seed, y, s, d, salt = 0) {
  let x = (Math.trunc(seed || 1) * 2654435761)
    ^ (Math.trunc(y || 1) * 73856093)
    ^ (Math.trunc(s || 0) * 19349663)
    ^ (Math.trunc(d || 1) * 83492791)
    ^ (Math.trunc(salt) * 3266489917);
  x = Math.imul(x ^ (x >>> 16), 2246822507);
  x = Math.imul(x ^ (x >>> 13), 3266489909);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** Ensure `S.cards`, `S.risk`, and `S.holidayLog` exist on state `S`. */
export function ensureHolidayState(S) {
  if (!S) return null;
  if (!Array.isArray(S.cards)) S.cards = [];
  if (!S.risk || typeof S.risk !== 'object') {
    S.risk = { sideJobs: 0, daysLeft: 0, caughtCount: 0, lostJob: false };
  }
  if (typeof S.risk.sideJobs !== 'number') S.risk.sideJobs = 0;
  if (typeof S.risk.daysLeft !== 'number') S.risk.daysLeft = 0;
  if (typeof S.risk.caughtCount !== 'number') S.risk.caughtCount = 0;
  if (typeof S.risk.lostJob !== 'boolean') S.risk.lostJob = false;
  if (!Array.isArray(S.holidayLog)) S.holidayLog = [];
  return S;
}

/**
 * Available special holiday / day-off activities on `cal`.
 * Each item is `{ id, icon, vi, jp, cost, min, fx, desc }`.
 */
export function holidayActs(S, cal = S?.cal) {
  ensureHolidayState(S);
  if (!cal) return [];
  const evs = eventsOn(cal);
  const evIds = new Set(evs.map((e) => e.id));
  const isLongOrRed = isRedDay(cal) || evIds.has('gw') || evIds.has('obon') || evIds.has('shogatsu');
  const acts = [];

  if (isLongOrRed) {
    acts.push({
      id: 'cards',
      icon: '🃏',
      vi: 'Xếp hàng mua Thẻ Quái Thú 限定BOX (trước 10:00)',
      jp: 'モンスターカード 限定BOX',
      cost: HOLI.BOX_PRICE,
      min: 90,
      fx: { mental: 3 },
      desc: 'Sáng ngày lễ cửa hàng mở bán hộp thẻ sưu tầm giới hạn モンスターカード 限定BOX (5.500 ¥, 1 hộp/người, hết hàng sau 10:00).',
    });
  }

  if (evIds.has('gw')) {
    acts.push({
      id: 'nightBus',
      icon: '🚌',
      vi: 'Đi xe buýt đêm du lịch xa dịp Tuần lễ Vàng',
      jp: 'ゴールデンウィーク夜行バス旅行',
      cost: 9000,
      min: 480,
      fx: { mental: 18, culture: 6 },
      desc: 'Đặt vé xe buýt đường dài đi ngắm cảnh nổi tiếng dịp Tuần lễ Vàng, khuây khỏa sau nhiều tháng làm việc.',
    });
  }

  if (evIds.has('umi')) {
    acts.push({
      id: 'beach',
      icon: '🏖️',
      vi: 'Đi tắm biển mùa hè cùng đồng nghiệp',
      jp: '海水浴',
      cost: 2500,
      min: 240,
      fx: { mental: 12, health: 5, team: 4, culture: 3 },
      desc: 'Bắt tàu ra bãi biển hóng gió mát, ăn đá bào カキ氷 cùng anh em trong tổ.',
    });
  }

  if (evIds.has('yama')) {
    acts.push({
      id: 'hike',
      icon: '🥾',
      vi: 'Leo núi ngoại ô hít thở không khí rừng',
      jp: 'ハイキング・登山',
      cost: 1500,
      min: 240,
      fx: { health: 8, mental: 10, culture: 3 },
      desc: 'Leo đường mòn lên đỉnh núi ngoại ô ngắm toàn cảnh vùng Kanto xanh mát.',
    });
  }

  if (evIds.has('obon')) {
    acts.push({
      id: 'vnGather',
      icon: '🍲',
      vi: 'Tụ tập hội đồng hương nấu ăn lớn dịp Obon',
      jp: 'お盆の同郷パーティー',
      cost: 1000,
      min: 210,
      fx: { mental: 14, health: 4, team: 5 },
      desc: 'Anh chị em người Việt từ các xưởng lân cận tụ hội nấu lẩu, ca hát rôm rả suốt kỳ nghỉ Obon.',
    });
  }

  if (evIds.has('bunka')) {
    acts.push({
      id: 'museum',
      icon: '🏛️',
      vi: 'Tham quan bảo tàng miễn phí Ngày Văn hóa',
      jp: '文化の日・博物館無料公開',
      cost: 0,
      min: 150,
      fx: { culture: 5, mental: 6, jp: 2 },
      desc: 'Ngày Văn hóa 文化の日 nhiều bảo tàng mở cửa miễn phí, cơ hội tìm hiểu lịch sử và mỹ thuật Nhật Bản.',
    });
  }

  if (evIds.has('shogatsu')) {
    acts.push({
      id: 'fukubukuro',
      icon: '🛍️',
      vi: 'Mua túi may mắn đầu năm 福袋 (3.000 ¥)',
      jp: '福袋',
      cost: 3000,
      min: 90,
      fx: { mental: 6, culture: 2 },
      desc: 'Xếp hàng mua túi may mắn 福袋 đầu năm mới — bên trong là món đồ ngẫu nhiên trị giá 2.000–6.000 ¥.',
    });
    acts.push({
      id: 'vnTemple',
      icon: '🏮',
      vi: 'Đi chùa Việt & hội Tết cộng đồng đầu năm',
      jp: 'ベトナム寺院・新年会',
      cost: 1000,
      min: 180,
      fx: { mental: 12, culture: 3, team: 3 },
      desc: 'Ghé chùa Việt tại Nhật cầu bình an đầu năm, gặp gỡ đồng hương và thưởng thức hương vị Tết.',
    });
  }

  if (isOffDay(cal)) {
    acts.push({
      id: 'karaoke',
      icon: '🎤',
      vi: 'Đi hát カラオケ cùng bạn cùng phòng',
      jp: 'カラオケ',
      cost: 1500,
      min: 120,
      fx: { mental: 8, team: 4, jp: 1 },
      desc: 'Thuê phòng カラオケ hát nhạc Việt lẫn nhạc Nhật xả hết căng thẳng tuần làm việc.',
    });
  }

  return acts;
}

/** Open a New Year `福袋` (`fukubukuro`, costs 3,000 ¥, yields item worth 2,000–6,000 ¥). */
export function openFukubukuro(S, rng = Math.random) {
  ensureHolidayState(S);
  const cost = 3000;
  if (!S || (S.money || 0) < cost) return { ok: false, why: 'money', deltas: [] };
  const val = 2000 + Math.round(rng() * 4000);
  const net = val - cost;
  const deltas = applyFx(S, { money: net, mental: val >= 3000 ? 7 : 3, culture: 2 });
  return { ok: true, cost, value: val, net, deltas };
}

/**
 * Queue up to buy 1 limited card box (`モンスターカード 限定BOX`, 5,500 ¥, before 10:00, max 1 per day).
 */
export function buyBox(S, minNow = 9 * 60, rng = Math.random) {
  ensureHolidayState(S);
  if (minNow >= HOLI.BOX_CUTOFF_MIN) {
    return { ok: false, soldOut: true, why: 'soldOut', deltas: [] };
  }
  const today = totalDays(S?.cal);
  if (S.holidayLog.includes(`box:${today}`) || S.cards.some((c) => c.boughtDay === today && !c.fromStranger)) {
    return { ok: false, limit: true, why: 'limit', deltas: [] };
  }
  if ((S.money || 0) < HOLI.BOX_PRICE) {
    return { ok: false, why: 'money', cost: HOLI.BOX_PRICE, deltas: [] };
  }
  const deltas = applyFx(S, { money: -HOLI.BOX_PRICE, mental: 3 });
  const box = {
    id: `box-${today}-${Math.floor(rng() * 100000)}`,
    boughtDay: today,
    price: HOLI.BOX_PRICE,
    opened: false,
    value: 0,
  };
  Object.defineProperty(box, '_S', { value: S, enumerable: false, configurable: true });
  S.cards.push(box);
  S.holidayLog.push(`box:${today}`);
  return { ok: true, box, cost: HOLI.BOX_PRICE, min: 90, deltas };
}

/**
 * Unbox a sealed card box (`1,500..25,000 ¥`), setting `opened = true` and granting `🧠 +2` if kept.
 * Supports `openBox(card, rng)` or `openBox(S, card, rng)`.
 */
export function openBox(arg1, arg2 = Math.random, arg3 = Math.random) {
  let S = null, card = arg1, rng = arg2;
  if (arg1 && Array.isArray(arg1.cards) && arg2 && typeof arg2 === 'object') {
    S = arg1;
    card = arg2;
    rng = typeof arg3 === 'function' ? arg3 : Math.random;
  } else if (card && card._S) {
    S = card._S;
  }
  if (!card || typeof card !== 'object') return { ok: false, value: 0 };
  const r = Math.max(0, Math.min(1, (typeof rng === 'function' ? rng() : 0.5)));
  const value = Math.round(HOLI.BOX_MIN_VAL + r * (HOLI.BOX_MAX_VAL - HOLI.BOX_MIN_VAL));
  const rarity = value >= 18000 ? 'UR (Siêu hiếm ✨)'
    : value >= 9000 ? 'SR (Hiếm 🌟)'
    : 'N/R (Thường)';
  card.opened = true;
  card.value = value;
  card.rarity = rarity;
  const deltas = S ? applyFx(S, { mental: 2 }) : [['mental', 2]];
  return { ok: true, opened: true, value, rarity, deltas };
}

/**
 * Current secondary-market price on "Chợ Cũ" (`フリマ`) for a card or sealed box.
 * Sealed boxes fluctuate around `6,000..9,000 ¥`, but can dip below the `5,500 ¥` retail price (`4,200..5,400 ¥`).
 */
export function marketPrice(card, daysSince = 0, rng = Math.random) {
  if (card && card.opened && card.value > 0) {
    return card.value;
  }
  const r = Math.max(0, Math.min(1, typeof rng === 'function' ? rng() : 0.5));
  // Bottom 20% of rng or oversupply dip drops below retail (4,200..5,400 ¥)
  if (r < 0.2) {
    return Math.round(4200 + (r / 0.2) * 1200);
  }
  // Normal hype range: 6,000..9,000 ¥ (slight decay if held very long)
  const ratio = (r - 0.2) / 0.8;
  const decay = Math.min(600, Math.max(0, daysSince - 14) * 20);
  return Math.round(6000 + ratio * 3000 - decay);
}

/**
 * Sell a card or sealed box on the second-hand app (`フリマ app "Chợ Cũ"`).
 * Deducts 10% platform fee + 700 ¥ shipping.
 */
export function sellOnApp(S, card, rng = Math.random) {
  ensureHolidayState(S);
  if (!S || !card) return { ok: false, net: 0, profit: 0, deltas: [] };
  const today = totalDays(S.cal);
  const daysSince = Math.max(0, today - (card.boughtDay || today));
  const gross = card.opened && card.value > 0
    ? card.value
    : (typeof card.askPrice === 'number' ? card.askPrice : marketPrice(card, daysSince, rng));
  const fee = Math.round(gross * HOLI.APP_FEE_RATE);
  const ship = HOLI.APP_SHIP_FEE;
  const net = Math.max(0, gross - fee - ship);
  const costBasis = typeof card.price === 'number' ? card.price : HOLI.BOX_PRICE;
  const profit = net - costBasis;

  const deltas = applyFx(S, { money: net, mental: profit >= 0 ? 2 : -2 });
  card.sold = true;
  if (Array.isArray(S.cards)) {
    const idx = S.cards.indexOf(card);
    if (idx >= 0) S.cards.splice(idx, 1);
  }
  return { ok: true, gross, fee, ship, net, profit, deltas };
}

/**
 * Buy a card box from a stranger outside the shop / on social media (`25%` chance of a resealed fake box).
 */
export function buyFromStranger(S, price = 4800, rng = Math.random) {
  ensureHolidayState(S);
  const cost = Math.max(1000, Math.round(Number(price) || 4800));
  if (!S || (S.money || 0) < cost) {
    return { ok: false, why: 'money', fake: false, deltas: [] };
  }
  const isFake = (typeof rng === 'function' ? rng() : Math.random()) < HOLI.STRANGER_FAKE_CHANCE;
  if (isFake) {
    const deltas = applyFx(S, { money: -cost, mental: -6 });
    return { ok: true, fake: true, lost: cost, deltas };
  }
  const deltas = applyFx(S, { money: -cost });
  const today = totalDays(S.cal);
  const box = {
    id: `stranger-${today}-${Math.floor(Math.random() * 100000)}`,
    boughtDay: today,
    price: cost,
    opened: false,
    value: 0,
    fromStranger: true,
  };
  Object.defineProperty(box, '_S', { value: S, enumerable: false, configurable: true });
  S.cards.push(box);
  return { ok: true, fake: false, box, cost, deltas };
}

function rawSideJobDay(cal, seed) {
  if (!cal || !isOffDay(cal)) return false;
  return hash01(seed, cal.year || 1, cal.season || 0, cal.day || 1, 707) < 0.28;
}

/**
 * Deterministic illegal side-job offer on ~25% of off days, capped at 2 offers per season.
 * Pays 8,000 ¥ cash in hand.
 */
export function sideJobOffer(S, cal = S?.cal, seed = S?.seed || 1) {
  if (!cal || !isOffDay(cal)) return null;
  const y = cal.year || 1, s = cal.season || 0, d = cal.day || 1;
  if (!rawSideJobDay(cal, seed)) return null;
  let countBefore = 0;
  for (let prev = 1; prev < d; prev++) {
    const prevCal = { year: y, season: s, day: prev };
    if (rawSideJobDay(prevCal, seed)) {
      countBefore++;
      if (countBefore >= 2) return null;
    }
  }
  return {
    id: `sidejob-${y}-${s}-${d}`,
    pay: HOLI.SIDE_JOB_PAY,
    health: HOLI.SIDE_JOB_HEALTH,
    vi: 'Phụ dọn kho / phân loại hàng ngày nghỉ (trả tiền mặt 8.000 ¥)',
    jp: '日払い倉庫バイト（現金8,000円）',
    warning: 'Trả tiền mặt không qua bảng lương nhưng trái quy định tư cách lưu trú thực tập sinh (資格外活動).',
  };
}

/** Accept the illegal side job: `+8,000 ¥, ❤️ -10`, `S.risk.sideJobs++`, `S.risk.daysLeft = 10`. */
export function takeSideJob(S) {
  ensureHolidayState(S);
  const deltas = applyFx(S, { money: HOLI.SIDE_JOB_PAY, health: HOLI.SIDE_JOB_HEALTH });
  S.risk.sideJobs = (S.risk.sideJobs || 0) + 1;
  S.risk.daysLeft = HOLI.SIDE_JOB_DAYS;
  return {
    ok: true,
    pay: HOLI.SIDE_JOB_PAY,
    sideJobs: S.risk.sideJobs,
    daysLeft: S.risk.daysLeft,
    deltas,
  };
}

/** Refuse the illegal side job: `🧠 +1` and legal reminder about `資格外活動`. */
export function refuseSideJob(S) {
  ensureHolidayState(S);
  const deltas = applyFx(S, { mental: 1 });
  return {
    ok: true,
    deltas,
    lesson: HOLI.REFUSE_LESSON,
  };
}

/**
 * Daily check during the 10 days after taking an illegal side job (`6%`/day chance of being caught).
 * - 1st time caught: fine `-30,000 ¥, boss -20, 🧠 -15`.
 * - 2nd time caught: `lostJob: true` (must change career with penalty).
 */
export function checkCaught(S, rng = Math.random) {
  ensureHolidayState(S);
  if (!S.risk || S.risk.daysLeft <= 0) {
    return { caught: false, lostJob: false, daysLeft: 0, deltas: [] };
  }
  S.risk.daysLeft -= 1;
  const roll = typeof rng === 'function' ? rng() : Math.random();
  if (roll >= HOLI.CAUGHT_CHANCE) {
    return { caught: false, lostJob: false, daysLeft: S.risk.daysLeft, deltas: [] };
  }
  S.risk.daysLeft = 0;
  S.risk.caughtCount = (S.risk.caughtCount || 0) + 1;
  if (S.risk.caughtCount === 1) {
    const deltas = applyFx(S, HOLI.CAUGHT_FX_1);
    return {
      caught: true,
      count: 1,
      lostJob: false,
      fine: HOLI.CAUGHT_FINE_1,
      deltas,
    };
  }
  S.risk.lostJob = true;
  const deltas = applyFx(S, HOLI.CAUGHT_FX_2);
  return {
    caught: true,
    count: S.risk.caughtCount,
    lostJob: true,
    deltas,
  };
}
