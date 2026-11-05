// Health / mental / job-skill bars and what happens at the ends of them — pure module (no DOM).
// Player feedback (S13): show them as bars; running out means a day off sick (hospital costs money);
// a full skill bar means a promotion and a pay rise.
import { applyFx, clamp } from './state.js';
import { RANK_NEED, rankOf, rankPay, ranksOf } from './jobs.js';

export const WELL = {
  WARN: 30,          // bar turns red, a warning once a day
  COLLAPSE: 15,      // at or below this the player cannot work today
  DAY_PAY: 8000,     // one day's wage lost when off sick
  HOSPITAL: 15000,   // full hospital bill; national health insurance (国民健康保険) pays 70 %
  COPAY: 0.3,
  BACK_TO: 60,       // health and mental after the day off
  BOSS_LOSS: 5,
};

/** null, or which bar ran out: 'health' | 'mental' | 'both' */
export function checkCollapse(S) {
  const h = S.health <= WELL.COLLAPSE, m = S.mental <= WELL.COLLAPSE;
  return h && m ? 'both' : h ? 'health' : m ? 'mental' : null;
}

/** true when a bar is low enough to warn about (red) */
export const lowBars = (S) => ['health', 'mental'].filter((k) => S[k] < WELL.WARN);

/** A day off sick: lost wage, hospital co-pay when the body gave out; both bars back to 60. */
export function sickLeave(S, kind) {
  const hospital = kind === 'health' || kind === 'both';
  const hasHoken = !S?.papers || S.papers.hoken !== false;
  const rate = hasHoken ? WELL.COPAY : 1.0;
  const copay = hospital ? Math.round(WELL.HOSPITAL * rate) : 0;
  const money = -(WELL.DAY_PAY + copay);
  S.money += money;
  S.health = WELL.BACK_TO; S.mental = WELL.BACK_TO;
  S.boss = clamp(S.boss - WELL.BOSS_LOSS);
  if (S?.cal) {
    S.festLog = S.festLog || {};
    S.festLog.lastSickDay = ((S.cal.year || 1) - 1) * 112 + (S.cal.season || 0) * 28 + (S.cal.day || 1);
  }
  const lines = [`💴 Mất 1 ngày lương: −${WELL.DAY_PAY.toLocaleString('ja-JP')} ¥`];
  if (hospital) {
    lines.push(hasHoken
      ? `🏥 Viện phí ${WELL.HOSPITAL.toLocaleString('ja-JP')} ¥ — bảo hiểm y tế 国民健康保険 trả 70 %, bạn trả 30 %: −${copay.toLocaleString('ja-JP')} ¥`
      : `🏥 Viện phí ${WELL.HOSPITAL.toLocaleString('ja-JP')} ¥ — chưa có thẻ bảo hiểm 国民健康保険 nên phải trả 100 %: −${copay.toLocaleString('ja-JP')} ¥`);
  } else lines.push('📞 Nghỉ ở nhà, gọi đường dây tư vấn tinh thần (miễn phí)');
  lines.push(`❤️ 🧠 nghỉ ngơi xong về ${WELL.BACK_TO} · 👷 Quản lý −${WELL.BOSS_LOSS}`);
  return { hospital, hasHoken, money, copay, lines };
}

/** Job-skill bar: rank 0..9, progress inside the rank, title, monthly skill allowance. */
export function skillInfo(S, job = S.job) {
  const xp = S.jobXp || 0, rank = rankOf(xp), maxed = rank >= RANK_NEED.length - 1;
  const from = RANK_NEED[rank], to = maxed ? from : RANK_NEED[rank + 1];
  const pct = maxed ? 100 : Math.round(((xp - from) / (to - from)) * 100);
  return { rank, title: ranksOf(job)[rank] || '', xp: xp - from, need: to - from, pct, maxed, pay: rankPay(rank + 1) };
}

/** the new rank index if xp just crossed a rank threshold, else 0 */
export function rankUp(prevXp, xp) { const a = rankOf(prevXp || 0), b = rankOf(xp || 0); return b > a ? b : 0; }

export { applyFx };
