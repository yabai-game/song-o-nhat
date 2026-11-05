// Morning commuter train timetable (時刻表), delays (遅延), delay certificates (遅延証明書),
// missed trains, and rush-hour crowding (満員電車) at さくら駅 — pure module (no DOM, no three.js).

export const TIMETABLE = [
  7 * 60 + 2,   // 7:02 (quiet)
  7 * 60 + 10,  // 7:10 (quiet)
  7 * 60 + 16,  // 7:16 (rush hour)
  7 * 60 + 22,  // 7:22 (rush hour)
  7 * 60 + 28,  // 7:28 (rush hour)
  7 * 60 + 34,  // 7:34 (rush hour, last safe train for 7:45 朝礼)
  7 * 60 + 40,  // 7:40 (arrives 7:49 -> late for 7:45 朝礼)
];

export const RIDE = 6;       // minutes on the train
export const WALKIN = 3;     // minutes walking from the destination stop into the workplace
export const DWELL = 1;      // train stands at the platform for 1 minute before departing
export const CHOREI_MIN = 7 * 60 + 45;

export const DELAY_REASONS = [
  { id: 'signal', jp: '信号故障', vi: 'Hỏng tín hiệu đường ray' },
  { id: 'incident', jp: '人身事故', vi: 'Sự cố an toàn trên tuyến' },
  { id: 'rain', jp: '大雨の影響', vi: 'Ảnh hưởng mưa lớn' },
  { id: 'snow', jp: '雪の影響', vi: 'Ảnh hưởng tuyết rơi dày' },
];

function fmtMin(min) {
  const m = Math.floor(min);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** Build a train descriptor from a scheduled departure minute and an active delay. */
export function makeTrainInfo(schedDep, delay = 0) {
  const d = Math.max(0, Math.round(delay || 0));
  const dep = schedDep + d;
  const arr = dep - DWELL;
  const eta = dep + RIDE + WALKIN;
  const crowded = schedDep >= 7 * 60 + 16 && schedDep <= 7 * 60 + 34;
  const quiet = schedDep <= 7 * 60 + 10;
  const mentalDelta = quiet ? 1 : (crowded ? -2 : 0);
  return {
    schedDep,
    dep,
    arr,
    arrive: arr,
    leave: dep,
    depart: dep,
    delay: d,
    eta,
    safe: eta <= CHOREI_MIN,
    crowded,
    rush: crowded,
    quiet,
    mentalDelta,
    label: fmtMin(schedDep),
    depLabel: fmtMin(dep),
    arrLabel: fmtMin(arr),
    valueOf() { return dep; },
  };
}

/**
 * Next train that has not left yet at clock time `min`: its delayed departure (scheduled + `delay`) is at or after `min`.
 * If `min` is after the last scheduled train in `TIMETABLE`, generates post-7:40 trains every 8 minutes.
 */
export function nextTrain(min = 7 * 60, delay = 0) {
  const d = Math.max(0, Math.round(delay || 0));
  for (const sched of TIMETABLE) {
    if (sched + d >= min) {
      return makeTrainInfo(sched, d);
    }
  }
  let extra = TIMETABLE[TIMETABLE.length - 1] + 8;
  while (extra + d < min) extra += 8;
  return makeTrainInfo(extra, d);
}

/** The train immediately following `nextTrain(min, delay)` (for the platform `次々発` display). */
export function followingTrain(min = 7 * 60, delay = 0) {
  const first = nextTrain(min, delay);
  return nextTrain(first.dep + 0.01, delay);
}

/**
 * Last train in `TIMETABLE` that still reaches the workplace on or before 7:45 (`CHOREI_MIN`),
 * given `RIDE` (6 min) + `WALKIN` (3 min) = 9 minutes after departure.
 * Without delay, this is the 7:34 train (arrives 7:43).
 */
export function lastSafeTrain(delay = 0) {
  const d = Math.max(0, Math.round(delay || 0));
  let best = TIMETABLE[0];
  for (const sched of TIMETABLE) {
    if (sched + d + RIDE + WALKIN <= CHOREI_MIN) {
      best = sched;
    }
  }
  return makeTrainInfo(best, d);
}

/**
 * Rush-hour crowding effect for a given train or scheduled departure minute:
 * - 7:02 / 7:10: quiet (`🧠 +1`)
 * - 7:16..7:34: rush hour `満員電車` (`🧠 −2`)
 * - 7:40+: normal (`0`)
 */
export function crowdEffect(trainOrDep) {
  const schedDep = (trainOrDep && typeof trainOrDep === 'object')
    ? (trainOrDep.schedDep ?? trainOrDep.dep)
    : Number(trainOrDep || 0);
  if (schedDep <= 7 * 60 + 10) {
    return {
      kind: 'quiet',
      jp: '空いている電車',
      vi: 'Đi chuyến sớm tàu vắng, ngồi thong thả (🧠 +1)',
      fx: { mental: 1 },
    };
  }
  if (schedDep >= 7 * 60 + 16 && schedDep <= 7 * 60 + 34) {
    return {
      kind: 'rush',
      jp: '満員電車',
      vi: 'Tàu giờ cao điểm đông nghẹt, chen chúc (🧠 −2)',
      fx: { mental: -2 },
    };
  }
  return {
    kind: 'normal',
    jp: '普通電車',
    vi: 'Tàu đi làm buổi sáng',
    fx: {},
  };
}

function hash01(n) {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

/**
 * Deterministic train delay for the day (`delayToday(cal, weather, seed)`):
 * - Normal weather: ~8% chance
 * - Heavy rain (`rain`) or snow (`snow`): ~30% chance
 * - Typhoon (`typhoon`): company is closed (0 delay)
 * - Delay duration: 5–20 minutes, with reason in Japanese and Vietnamese.
 */
export function delayToday(cal = { year: 1, season: 0, day: 1 }, weather = 'sunny', seed = 1) {
  if (weather === 'typhoon') {
    return { delayed: false, min: 0, delay: 0, reasonJp: '', reasonVi: '' };
  }
  const y = cal?.year || 1;
  const s = cal?.season || 0;
  const d = cal?.day || 1;
  const wCode = weather === 'snow' ? 31 : weather === 'rain' ? 19 : 7;
  const baseKey = y * 10007 + s * 997 + d * 131 + (seed || 1) * 53 + wCode;
  const roll = hash01(baseKey);
  const roll2 = hash01(baseKey + 7919);

  const chance = (weather === 'rain' || weather === 'snow') ? 0.30 : 0.08;
  if (roll >= chance) {
    return { delayed: false, min: 0, delay: 0, reasonJp: '', reasonVi: '' };
  }

  const delayMin = 5 + Math.floor(roll2 * 16); // 5..20 minutes
  let reason = DELAY_REASONS[0];
  if (weather === 'snow') {
    reason = DELAY_REASONS[3]; // 雪の影響
  } else if (weather === 'rain') {
    reason = DELAY_REASONS[2]; // 大雨の影響
  } else {
    reason = (Math.floor(roll2 * 100) % 2 === 0) ? DELAY_REASONS[0] : DELAY_REASONS[1];
  }

  return {
    delayed: true,
    min: delayMin,
    delay: delayMin,
    reasonId: reason.id,
    reasonJp: reason.jp,
    reasonVi: reason.vi,
  };
}
