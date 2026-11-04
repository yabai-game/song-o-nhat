// Evening after the afternoon shift — pure module (no DOM, no three.js).
// Walk home along the street at dusk; the evening story happens at its place (konbini, in front of
// the dorm, or in the room); then optional bath / call home in the dorm, and sleep.
import { applyFx } from './state.js';

export const EVENING = {
  OUT: 18 * 60 + 40,      // leaving the site gate
  MIN_PER_SEC: 1,         // game minutes per real second while walking
  TALK: 25,               // minutes spent on the evening story
  BATH: { min: 20, fx: { health: 2 } },
  CALL: { min: 30, fx: { mental: 3 } },
  LATE: 23 * 60,          // going to bed after this is late (shown on the HUD only)
};

/** Where on the map an evening story takes place. */
export function spotFor(ev) {
  if (ev.place === 'konbini' || ev.place === 'bank') return 'konbini'; // money is sent at the konbini counter
  if (ev.place === 'home') return ev.who ? 'dormFront' : 'room';
  return 'dormFront';
}

export function createEvening(spot) {
  return { min: EVENING.OUT, spot, phase: 'toSpot', talked: false, bath: false, call: false, slept: false };
}

export function tick(ev, dt) { if (ev.phase === 'toSpot' || ev.phase === 'toDorm' || ev.phase === 'room') ev.min += dt * EVENING.MIN_PER_SEC; }

/** The evening story is done at its place; the walk continues home (or stays in the room). */
export function talked(ev) {
  ev.talked = true; ev.min += EVENING.TALK;
  ev.phase = ev.spot === 'room' ? 'room' : 'toDorm';
}

/** Entering the dorm room. */
export function enterRoom(ev) { if (ev.phase === 'toDorm' || ev.phase === 'toSpot') ev.phase = 'room'; }

/** Optional room actions, once each: 'bath' (+health) and 'call' home (+mental). */
export function act(S, ev, id) {
  if (ev.phase !== 'room') return { ok: false, why: 'not-now' };
  const A = id === 'bath' ? EVENING.BATH : id === 'call' ? EVENING.CALL : null;
  if (!A) return { ok: false, why: 'unknown' };
  if (ev[id]) return { ok: false, why: 'done' };
  ev[id] = true; ev.min += A.min;
  return { ok: true, deltas: applyFx(S, A.fx) };
}

/** Going to bed ends the evening (the sleep recovery itself is story.sleep). */
export function toBed(ev) {
  if (ev.phase !== 'room') return false;
  ev.phase = 'bed'; ev.slept = true;
  return true;
}
