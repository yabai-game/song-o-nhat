// Morning routine before the first step of each day — pure module (no DOM, no three.js).
// Wake up in the dorm (寮), optionally snooze / eat breakfast, walk to the site, optionally buy a
// drink and greet the neighbour, and reach the gate before the morning meeting (朝礼, 7:45).
// The game clock runs only while the player walks in the dorm or on the street.
import { applyFx } from './state.js';

export const MORNING = {
  ALARM: 6 * 60 + 30,     // alarm rings at 6:30
  READY: 7 * 60 + 10,     // after washing and dressing (skipped in a toast)
  SNOOZE: 10,             // "ten more minutes"
  BREAKFAST: 8,           // minutes to eat an onigiri at the low table
  DRINK: 1,               // minutes at the vending machine
  GREET: 2,               // minutes chatting with the neighbour
  EARLY: 7 * 60 + 40,     // 5分前行動: at the gate 5 minutes before the meeting
  CHOREI: 7 * 60 + 45,    // morning meeting
  MIN_PER_SEC: 1,         // game minutes per real second while walking
  TRAIN: 6,               // minutes from the platform to the care home stop, waiting included
  DRINK_YEN: 130,
};

export function createMorning() {
  return { min: MORNING.ALARM, phase: 'wake', snoozed: false, ate: false, drank: false, greeted: false, over: false };
}

/** "7:05" */
export function clock(min) {
  const m = Math.floor(min);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** Wake up (snooze = true sleeps ten more minutes first). Returns applied stat deltas. */
export function wake(S, st, snooze) {
  if (st.phase !== 'wake') return [];
  st.phase = 'room';
  st.snoozed = !!snooze;
  st.min = MORNING.READY + (snooze ? MORNING.SNOOZE : 0);
  return snooze ? applyFx(S, { mental: 2 }) : [];
}

/** Advance the clock while walking (the platform wait and the ride are inside TRAIN). */
export function tick(st, dt) {
  if (st.over || st.phase === 'wake' || st.phase === 'platform' || st.phase === 'ride') return;
  st.min += dt * MORNING.MIN_PER_SEC;
}

/** Optional actions; each can be done once. Returns { ok, deltas, why }. */
export function act(S, st, id) {
  if (st.over || st.phase === 'wake') return { ok: false, why: 'not-now' };
  if (id === 'eat') {
    if (st.phase !== 'room' || st.ate) return { ok: false, why: 'done' };
    st.ate = true; st.min += MORNING.BREAKFAST;
    return { ok: true, deltas: applyFx(S, { health: 3 }) };
  }
  if (id === 'drink') {
    if (st.phase !== 'street' || st.drank) return { ok: false, why: 'done' };
    if (S.money < MORNING.DRINK_YEN) return { ok: false, why: 'money' };
    st.drank = true; st.min += MORNING.DRINK;
    return { ok: true, deltas: applyFx(S, { money: -MORNING.DRINK_YEN, mental: 2 }) };
  }
  if (id === 'greet') {
    if (st.phase !== 'street' || st.greeted) return { ok: false, why: 'done' };
    st.greeted = true; st.min += MORNING.GREET;
    return { ok: true, deltas: applyFx(S, { culture: 2, mental: 1 }) };
  }
  return { ok: false, why: 'unknown' };
}

/** Leave the dorm room for the street. */
export function leaveRoom(st) { if (st.phase === 'room') st.phase = 'street'; }

/** Train commute: through the ticket gates onto the platform, the ride, then the walk inside. */
export function toPlatform(st) { if (st.phase === 'street') st.phase = 'platform'; }
export function board(st) { if (st.phase === 'platform') { st.phase = 'ride'; st.min += MORNING.TRAIN; } }
export function alight(st) { if (st.phase === 'ride') st.phase = 'walkin'; }

/** Reaching the site gate: early (+boss), on time, or late (−boss, −mental, lesson). */
export function arrive(S, st) {
  st.over = true;
  const m = Math.floor(st.min); // compare whole minutes, exactly as the HUD clock shows them
  if (m <= MORNING.EARLY) return { kind: 'early', min: m, deltas: applyFx(S, { boss: 2 }) };
  if (m <= MORNING.CHOREI) return { kind: 'ontime', min: m, deltas: [] };
  return { kind: 'late', min: m, deltas: applyFx(S, { boss: -4, mental: -2 }) };
}
