// Game flow: title → creator → job → first week at the construction site (M1).
import * as THREE from 'three';
import { renderer, camera, resize, isPortrait, CamRig, loadModel, loadBrand } from './gfx/stage.js';
import { OUTFITS, SWATCH, ensureSrc, makeCharacter, makeHelmet, makeSanitaryCap, wearHelmet, wearWaders, refHex } from './gfx/chars.js';
import { buildTown } from './gfx/town.js';
import { buildSite, DECK_Y, WANDER, ROUTE } from './gfx/site.js';
import { Controls } from './gfx/controls.js';
import { SiteShift } from './work/site_shift.js';
import { MorningWalk } from './work/morning_walk.js';
import { EveningWalk } from './work/evening_walk.js';
import { MarketShop } from './work/market_shop.js';
import { spotFor, createEvening } from './core/evening.js';
import { spoil, goodOf } from './core/market_rules.js';
import { buildDorm } from './gfx/dorm.js';
import { buildMarket } from './gfx/market.js';
import { buildShrine } from './gfx/shrine.js';
import { buildCare } from './gfx/care.js';
import { buildBento, BENTO_ROOM } from './gfx/bento.js';
import { buildLotus, LOTUS_FIELD } from './gfx/lotus.js';
import { buildStation } from './gfx/station.js';
import { Crowd } from './gfx/crowd.js';
import { CareShift, seatFolk } from './work/care_shift.js';
import { BentoShift } from './work/bento_shift.js';
import { LotusShift } from './work/lotus_shift.js';
import { DayOff } from './work/dayoff.js';
import { dayOffSummary } from './core/dayoff_rules.js';
import { $, show, card, toast, deltaChips, esc, Overhead } from './ui/ui.js';
import { newState, save, load, clearSave, yen, jpLevel, applyFx } from './core/state.js';
import { JOBS, NPCS, INTRO, rankOf, rankPay, daysOf, ranksOf } from './core/jobs.js';
import { WELL, checkCollapse, lowBars, sickLeave, skillInfo } from './core/wellbeing.js';
import { CAREER, targets, cannotStudy, startStudy, quitStudy } from './core/career.js';
import { daySteps, lifeDaySteps, shiftOpts, shiftEnd, chooseTalk, completeStep, weekEval, sleep, retryCost, DAYS } from './core/story.js';
import { stars, formatStars, recordStars, getStars } from './core/stars.js';
import { clock as fmtClock } from './core/morning.js';
import {
  SEASONS, DAYS_PER_SEASON, WEEKDAYS, WEEKDAYS_VI, PAY,
  newCalendar, advance, nextDay, weekday, seasonOf, label as calLabel,
  eventsOn, isRedDay, isOffDay, isMandatoryOff, isSaturdayWorkable,
  weatherOf, weatherFx, paydayOn, payslip, applyPay,
} from './core/calendar.js';

const storage = (() => { try { return window.localStorage; } catch { return { getItem: () => null, setItem() {}, removeItem() {} }; } })();
const G = {
  S: null, demoState: { flags: {} }, stage: null, stages: {}, player: null, own: null, wardrobe: {}, folk: [], npcs: {}, workers: [], streetCrowd: null, stationCrowd: null, demoJob: null, activeShift: null,
  draft: { gender: 'm', outfit: 'hoodie', colors: { top: null, bottom: null, hair: null, skin: null }, name: '' },
  mode: 'loading', yaw: 0, spin: 0.5, camRig: new CamRig(), overhead: new Overhead(), t: 0,
};
window.__game = G;

// NPC looks: outfit model + colours (+ hard hat at the site)
const NPC_LOOK = {
  tanaka: { kind: 'hoodie', colors: { top: '#2e5a44', bottom: '#2b2b30', hair: '#2a2420' }, helmet: '#f2c230' },
  hung:   { kind: 'suit',   colors: { top: '#3c5a86', bottom: '#2b2b30', hair: '#3a2a20' }, helmet: '#f4f4f0' },
  sato:   { kind: 'f_casual', colors: { top: '#6b8f9e', bottom: '#2b2b30', hair: '#5a3a24' }, helmet: '#f4f4f0' },
  hoa:    { kind: 'f_office', colors: {} },
  tencho: { kind: 'hoodie', colors: { top: '#3f8f5a', bottom: '#2b2b30' } },
  suzuki: { kind: 'f_casual', colors: { top: '#7a5236', bottom: '#5d6168', hair: '#e9e2d4' } },
  clerk:  { kind: 'suit', colors: {} },
  yamada: { kind: 'care_f', colors: { top: '#8fc7d9', hair: '#3a2a20' } }, // the care home's nurse
};
// care home residents: model + cardigan colour (Tanaka-san, Suzuki-san, Sato-san, Kimura-san)
const FOLK_LOOK = [['elder_m', '#4f7f8f'], ['elder_f', '#a0605f'], ['elder_m', '#8a7a4f'], ['elder_f', '#6d6a9a']];
const WORK_COLORS = { top: '#1f3148', bottom: '#1c2c42' };  // JOB_OUTFIT.site: navy work clothes
const BENTO_COLORS = { top: '#f2f2ee', bottom: '#f2f2ee' }; // JOB_OUTFIT.bento: white sanitary clothes
const LOTUS_COLORS = { top: '#2b3a36', bottom: '#3f5a3c' }; // JOB_OUTFIT.lotus: dark jacket + moss-green waders (胴長)

// ---------- boot ----------
async function boot() {
  try {
    const fontReady = document.fonts ? document.fonts.load('700 48px "Zen Maru Gothic"', 'ラーメン安全第一') : Promise.resolve();
    let done = 0; const tick = (p) => p.then((v) => { done++; $('bar').style.width = `${Math.round(done / 8 * 100)}%`; return v; });
    const [town, site, care, bento, lotus] = await Promise.all([tick(buildTown()), tick(buildSite()), tick(buildCare()), tick(buildBento()), tick(buildLotus()), tick(ensureSrc('hoodie')), tick(ensureSrc('suit')), tick(fontReady.catch(() => {}))]);
    G.stages.town = town;
    G.stages.site = site;
    G.stages.care = care;
    G.stages.bento = bento;
    G.stages.lotus = lotus;
    const [lowtable, gas_stove, brandWhite, futon] = await Promise.all([loadModel('lowtable'), loadModel('gas_stove'), loadBrand('white'), loadModel('futon')]);
    G.stages.dorm = buildDorm({ lowtable, gas_stove, brandWhite, futon });
    $('bar').style.width = '100%';
    G.controls = new Controls($('joy'));
    G.shift = new SiteShift({ site: G.stages.site, controls: G.controls, overhead: G.overhead, camRig: G.camRig });
    G.morning = new MorningWalk({ controls: G.controls, overhead: G.overhead, camRig: G.camRig });
    G.evening = new EveningWalk({ controls: G.controls, overhead: G.overhead, camRig: G.camRig });
    G.market = new MarketShop({ controls: G.controls, overhead: G.overhead, camRig: G.camRig });
    G.care = new CareShift({ stage: G.stages.care, controls: G.controls, overhead: G.overhead, camRig: G.camRig });
    G.bento = new BentoShift({ stage: G.stages.bento, controls: G.controls, overhead: G.overhead, camRig: G.camRig });
    G.lotus = new LotusShift({ stage: G.stages.lotus, controls: G.controls, overhead: G.overhead, camRig: G.camRig });
    G.dayoff = new DayOff({ controls: G.controls, overhead: G.overhead, camRig: G.camRig });
    G.streetCrowd = await new Crowd(G.stages.site.scene, { mode: 'street', seed: 331 }).spawnStreet();
    G.streetCrowd.setVisible(false);
    await setPlayer();
    setStage('town');
    bindUi();
    show('loading', false);
    titleScreen();
    requestAnimationFrame(frame);
  } catch (e) {
    $('loadmsg').textContent = 'Không tải được (' + (e && e.message ? e.message : e) + '). Tải lại trang để thử lại.';
    console.error(e);
  }
}

function setStage(id) {
  const st = G.stages[id];
  if (!st) return;
  const cal = G.S?.cal;
  if (cal) st.setSeason?.(seasonOf(cal).id);
  if (G.stage === st) return;
  G.overhead.clear();
  G.player && st.scene.add(G.player.holder);
  G.stage = st; G.stageId = id;
  G.camRig.init = false;
}

async function setPlayer() {
  const d = G.draft;
  const ch = await makeCharacter(d.outfit, d.colors);
  if (d.outfit !== G.draft.outfit) return; // another outfit was picked meanwhile
  const old = G.player;
  if (old) { ch.holder.position.copy(old.holder.position); ch.yaw = old.yaw; old.holder.parent?.remove(old.holder); old.unpinAll(); }
  else ch.holder.position.set(0, 0, 1.2);
  G.player = ch; G.own = ch;
  const h = makeHelmet(ch); wearHelmet(ch, h.group); ch.helmet = h.group; h.group.visible = G.stageId === 'site';
  const c = makeSanitaryCap(ch); wearHelmet(ch, c.group); ch.cap = c.group; c.group.visible = G.stageId === 'bento';
  ch.waders = wearWaders(ch); ch.waders.setVisible(G.stageId === 'lotus');
  G.stage && G.stage.scene.add(ch.holder);
}

async function npc(id, where) {
  const L = NPC_LOOK[id] || NPC_LOOK.tanaka;
  if (!G.npcs[id]) {
    const ch = await makeCharacter(L.kind, L.colors);
    if (L.helmet) { const h = makeHelmet(ch, L.helmet); wearHelmet(ch, h.group); ch.helmet = h.group; }
    if (id === 'tanaka' || id === 'sato') { const c = makeSanitaryCap(ch); wearHelmet(ch, c.group); ch.cap = c.group; c.group.visible = false; }
    if (id === 'tanaka' || id === 'sato' || id === 'hung') { ch.waders = wearWaders(ch); ch.waders.setVisible(false); }
    G.npcs[id] = ch;
  }
  const ch = G.npcs[id];
  G.stages[where].scene.add(ch.holder);
  ch.unpinAll();
  if (ch.helmet) ch.helmet.visible = where === 'site';
  if (ch.cap) ch.cap.visible = where === 'bento';
  if (ch.waders) ch.waders.setVisible(where === 'lotus');
  if (id === 'tanaka' || id === 'sato' || id === 'hung') {
    ch.look(where === 'bento' ? { ...L.colors, ...BENTO_COLORS } : where === 'lotus' ? { ...L.colors, ...LOTUS_COLORS } : L.colors);
  }
  return ch;
}
function hideNpcs() { for (const ch of Object.values(G.npcs)) { ch.holder.parent?.remove(ch.holder); ch.unpinAll(); } }

// ---------- jobs: uniforms and residents ----------
const jobOf = () => G.demoJob || (G.S && G.S.job) || 'site';
const lookOf = () => (G.S ? G.S.look : { gender: G.draft.gender, colors: G.draft.colors });
/** Swap the character the player controls (own outfit / job uniform), keeping place and facing. */
function swapPlayer(ch) {
  if (!ch || G.player === ch) return G.player;
  const old = G.player;
  if (old) { ch.holder.position.copy(old.holder.position); ch.yaw = old.yaw; old.holder.parent?.remove(old.holder); old.unpinAll(); old.holder.rotation.x = 0; }
  ch.holder.rotation.x = 0; ch.holder.visible = true;
  G.player = ch; G.stage && G.stage.scene.add(ch.holder);
  return ch;
}
/** At work in the care home the player wears the caregiver uniform; in the bento factory, white sanitary clothes; in the lotus field, waders (胴長); elsewhere their own outfit. */
async function dress(atWork) {
  const job = jobOf();
  const kind = atWork && job === 'care' ? (lookOf().gender === 'f' ? 'care_f' : 'care_m') : null;
  if (!kind) {
    const ch = swapPlayer(G.own);
    if (ch) {
      if (ch.helmet) ch.helmet.visible = false;
      if (ch.cap) ch.cap.visible = !!(atWork && job === 'bento');
      if (ch.waders) ch.waders.setVisible(!!(atWork && job === 'lotus'));
      ch.look(
        atWork && job === 'bento' ? { ...lookOf().colors, ...BENTO_COLORS }
        : atWork && job === 'lotus' ? { ...lookOf().colors, ...LOTUS_COLORS }
        : lookOf().colors,
      );
    }
    return ch;
  }
  if (!G.wardrobe[kind]) G.wardrobe[kind] = await makeCharacter(kind, { hair: lookOf().colors.hair, skin: lookOf().colors.skin });
  return swapPlayer(G.wardrobe[kind]);
}
async function spawnFolk() {
  if (!G.folk.length) G.folk = await Promise.all(FOLK_LOOK.map(([kind, top]) => makeCharacter(kind, { top })));
  for (const ch of G.folk) G.stages.care.scene.add(ch.holder);
  seatFolk(G.folk);
}

async function spawnWorkers() {
  if (G.workers.length) return;
  for (let i = 0; i < WANDER.length; i++) {
    const kind = i % 2 ? 'suit' : 'hoodie';
    const ch = await makeCharacter(kind, { top: ['#1f3148', '#5d6168', '#2e5a44'][i % 3], bottom: '#2b2b30', hair: '#2a2420' });
    const h = makeHelmet(ch, i % 2 ? '#f4f4f0' : '#f2c230');
    wearHelmet(ch, h.group);
    const [x, z, xr, zr] = WANDER[i];
    ch.holder.position.set(x, 0, z);
    G.stages.site.scene.add(ch.holder);
    ch.w = { x, z, xr, zr, tx: x, tz: z, wait: Math.random() * 3 };
    G.workers.push(ch);
  }
}
function updateWorkers(dt) {
  for (const ch of G.workers) {
    const w = ch.w, p = ch.holder.position;
    if (w.wait > 0) { w.wait -= dt; ch.moveAt(0); if (w.wait <= 0) { w.tx = w.x + (Math.random() - 0.5) * w.xr; w.tz = w.z + (Math.random() - 0.5) * w.zr; } }
    else {
      const dx = w.tx - p.x, dz = w.tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.1) { w.wait = 1 + Math.random() * 3; ch.moveAt(0); continue; }
      const ox = p.x, oz = p.z;
      p.x += dx / d * 1.5 * dt; p.z += dz / d * 1.5 * dt;
      ch.yaw = Math.atan2(dx, dz);
      ch.moveAt(dt > 0 ? Math.hypot(p.x - ox, p.z - oz) / dt : 0);
    }
  }
}

// ---------- UI binding ----------
function bindUi() {
  $('btn-new').addEventListener('click', () => creatorScreen());
  $('btn-continue').addEventListener('click', () => { const S = load(storage); if (S) { G.S = S; G.draft.colors = S.look.colors; G.draft.outfit = S.look.outfit; setPlayer().then(runStep); } });
  $('btn-demo').addEventListener('click', demoScreen);
  $('btn-career').addEventListener('click', careerScreen);
  $('btn-menu').addEventListener('click', pauseMenu);
  $('btn-cal').addEventListener('click', calendarModal);
  $('day-label').parentElement?.addEventListener('click', calendarModal);
  // the ☰ menu button and 📅 calendar button show whenever a game screen (not the title / creator) is up
  setInterval(() => {
    const on = !['title', 'creator', 'jobs'].includes(G.mode) && $('title').hidden && $('creator').hidden;
    $('btn-menu').hidden = !on;
    $('btn-cal').hidden = !on || !G.S;
    $('app').classList.toggle('has-menu', on);
    if (G.S) {
      const red = isRedPill(ensureCal(G.S));
      $('day-label').parentElement?.classList.toggle('red-day', red);
      $('sh-rank')?.classList.toggle('red-day', red);
    }
  }, 300);
  $('stats').addEventListener('click', onStatsTap);
  $('sh-bars').addEventListener('click', onStatsTap);
  // compact bars on the walking / shift HUD, refreshed twice a second (S13)
  setInterval(() => {
    const box = $('sh-bars'), hud = $('shifthud');
    if (!G.S || hud.hidden || G.S.flags.demo) { box.hidden = true; return; }
    box.hidden = false;
    const S = G.S, sk = skillInfo(S, jobOf()), lvl = (v) => (v < WELL.WARN ? 'bad' : v < 60 ? 'mid' : 'ok');
    const m = (k, icon, v, cls) => `<button type="button" class="sbar mini ${cls}" data-k="${k}" aria-label="${k}"><span class="sb-i">${icon}</span><span class="sb-t"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span></button>`;
    const html = m('health', '❤️', S.health, lvl(S.health)) + m('mental', '🧠', S.mental, lvl(S.mental)) + m('skill', '🛠️', sk.pct, sk.maxed ? 'max' : 'skill');
    if (box.dataset.h !== html) { box.dataset.h = html; box.innerHTML = html; }
    // sit just below whatever is on the left under the top bar (the day / rank pill can wrap to two lines)
    let bottom = 0;
    for (const id of ['sh-rank', 'sh-place', 'sh-tip', 'sh-ticket']) {
      const el = $(id); if (!el || el.hidden) continue;
      const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
      if (r.height && r.left < b.right && r.right > b.left) bottom = Math.max(bottom, r.bottom);
    }
    if (bottom) { const top = Math.round(bottom - hud.getBoundingClientRect().top + 6) + 'px'; if (box.style.top !== top) box.style.top = top; }
  }, 250);
  $('btn-credits').addEventListener('click', creditsScreen);
  $('cr-back').addEventListener('click', titleScreen);
  $('cr-next').addEventListener('click', jobScreen);
  $('jobs-back').addEventListener('click', creatorScreen);
  for (const b of document.querySelectorAll('#gender button')) {
    b.addEventListener('click', () => {
      if (G.draft.gender === b.dataset.g) return;
      G.draft.gender = b.dataset.g;
      for (const x of document.querySelectorAll('#gender button')) x.setAttribute('aria-pressed', String(x === b));
      $('name').placeholder = G.draft.gender === 'f' ? 'Ví dụ: Lan' : 'Ví dụ: Minh';
      outfitList(); pickOutfit(Object.keys(OUTFITS).find((k) => OUTFITS[k].g === G.draft.gender && !OUTFITS[k].uniform && !OUTFITS[k].npc));
    });
  }
  // drag to turn the character in the creator
  let drag = null;
  $('c').addEventListener('pointerdown', (e) => { if (G.mode === 'creator') drag = { x: e.clientX, yaw: G.yaw }; });
  addEventListener('pointermove', (e) => { if (drag && G.mode === 'creator') { G.yaw = drag.yaw + (e.clientX - drag.x) * 0.012; G.spin = 0; } });
  addEventListener('pointerup', () => { drag = null; });
}

/** ☰ during play: pause, then resume or go back to the title screen (progress is saved per step). */
function activeModule() {
  return { shift: G.activeShift || G.shift, morning: G.morning, evening: G.evening, market: G.market, dayoff: G.dayoff }[G.mode] || null;
}
function pauseMenu() {
  if (!$('modal').hidden) return; // another card is already open
  const mod = activeModule(), was = mod ? mod.paused : false;
  if (mod) mod.paused = true;
  const demo = !G.S || G.S.flags.demo || G.demoJob;
  card(`<h2>⏸ Tạm dừng</h2><p>${demo ? 'Đang ở chế độ thử, không lưu.' : 'Tiến độ đã lưu tới bước gần nhất. Về màn hình chính thì phần đang làm dở (ca làm, đường đi) sẽ làm lại từ đầu bước này.'}</p>`, [
    { label: '▶ Tiếp tục', on: () => { if (mod) mod.paused = was; } },
    { label: '🏠 Về màn hình chính', cls: 'ghost', on: () => {
      try { if (mod && mod.stop) mod.stop(); } catch (e) { console.warn(e); }
      if (mod) mod.active = false;
      if (G.player) { G.player.unpinAll(); G.player.holder.rotation.x = 0; G.player.bendTo = 0; G.player.reachTo = 0; }
      titleScreen();
    } },
  ]);
}

function hideAll() { for (const id of ['title', 'creator', 'jobs', 'dayhud', 'talk', 'shifthud', 'modal']) show(id, false); G.talkPair = null; }

function titleScreen() {
  hideAll(); hideNpcs(); setStage('town'); G.stages.town.setTime('day');
  G.demoJob = null; swapPlayer(G.own);
  if (G.own) { if (G.own.helmet) G.own.helmet.visible = false; if (G.own.cap) G.own.cap.visible = false; if (G.own.waders) G.own.waders.setVisible(false); G.own.look(G.draft.colors); }
  G.mode = 'title'; G.player.holder.visible = true;
  G.player.holder.position.set(0, 0, 1.2); G.player.play('idle');
  const S = load(storage);
  const c = $('btn-continue');
  c.hidden = !S;
  $('btn-career').hidden = !S;
  if (S) c.textContent = `⏯ Chơi tiếp với ${S.name || 'Bạn'} · ${S.life && S.cal ? calLabel(S.cal) : S.week ? 'Tháng ' + S.week : 'Ngày ' + Math.min(DAYS, S.story + 1) + '/5'}`;
  // the lobby shows the saved season (snow in winter, red leaves in autumn…), spring for a new game
  G.stages.town.setSeason?.(S && S.life && S.cal ? seasonOf(S.cal).id : 'spring');
  show('title');
}

function ensureCal(S = G.S) {
  if (!S) return newCalendar();
  if (!S.cal) S.cal = newCalendar();
  if (!S.life) S.cal.day = S.story < DAYS ? (S.story || 0) + 1 : 7;
  return S.cal;
}
const curDayKey = (S = G.S) => (S?.life && S?.cal ? `${S.cal.year}-${S.cal.season}-${S.cal.day}` : (S?.story || 0));
const curWeather = (S = G.S) => weatherOf(ensureCal(S), S?.seed || 1);
const curWeatherFx = (S = G.S) => weatherFx(curWeather(S));
const isRedPill = (cal) => weekday(cal) === 6 || isRedDay(cal) || eventsOn(cal).some((e) => e.kind === 'off');
function hudCalText(S = G.S, sub = '') {
  const cal = ensureCal(S);
  const base = calLabel(cal, curWeather(S));
  return sub ? `${base} · ${sub}` : base;
}

function calendarModal() {
  if (!$('modal').hidden || !G.S) return;
  const mod = activeModule(), was = mod ? mod.paused : false;
  if (mod) mod.paused = true;
  const cur = ensureCal(G.S);
  let vYear = cur.year, vSeason = cur.season, selDay = cur.day;
  const tom = nextDay(cur);

  const renderCal = () => {
    const sInfo = SEASONS[vSeason] || SEASONS[0];
    const cells = [];
    for (let d = 1; d <= DAYS_PER_SEASON; d++) {
      const c = { year: vYear, season: vSeason, day: d };
      const wd = weekday(c);
      const isToday = vYear === cur.year && vSeason === cur.season && d === cur.day;
      const isTom = vYear === tom.year && vSeason === tom.season && d === tom.day;
      const isPast = vYear < cur.year || (vYear === cur.year && vSeason < cur.season) || (vYear === cur.year && vSeason === cur.season && d < cur.day);
      const evs = eventsOn(c);
      const pay = paydayOn(c);
      const wIcon = (isPast || isToday || isTom) ? weatherFx(weatherOf(c, G.S.seed || 1)).icon : '';
      const badge = (evs[0]?.icon || '') + (pay ? '💴' : '') || wIcon;
      const cls = [
        'cal-cell',
        wd === 5 ? 'sat' : '',
        isRedPill(c) ? 'red' : '',
        isToday ? 'today' : '',
        d === selDay ? 'sel' : '',
      ].filter(Boolean).join(' ');
      cells.push(`<button type="button" class="${cls}" data-d="${d}"><span class="d">${d}</span><span class="ic">${badge}</span></button>`);
    }
    const selCal = { year: vYear, season: vSeason, day: selDay };
    const selEvs = eventsOn(selCal);
    const selPay = paydayOn(selCal);
    const isNear = (vYear === cur.year && vSeason === cur.season && selDay <= cur.day + 1)
      || (vYear === tom.year && vSeason === tom.season && selDay === tom.day)
      || vYear < cur.year || (vYear === cur.year && vSeason < cur.season);
    const selW = isNear ? weatherFx(weatherOf(selCal, G.S.seed || 1)) : null;
    const statusTxt = isRedDay(selCal) ? '🎌 Ngày lễ quốc gia (nghỉ làm)'
      : isMandatoryOff(selCal) ? '🎌 Ngày nghỉ'
      : isSaturdayWorkable(selCal) ? '👷 Thứ Bảy (nghỉ hoặc đăng ký tăng ca +12.000 ¥)'
      : '🧰 Ngày đi làm (T2–T6)';

    card(`<h2>📅 Lịch 4 mùa · カレンダー</h2>
      <div class="cal-nav">
        <button type="button" id="cal-prev" aria-label="Mùa trước">◀</button>
        <b>${sInfo.icon} Mùa ${sInfo.vi} (${sInfo.jp} · tháng ${sInfo.months}) · Năm ${vYear}</b>
        <button type="button" id="cal-next" aria-label="Mùa sau">▶</button>
      </div>
      <div class="cal-wk">
        <span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span class="sat">土</span><span class="sun">日</span>
      </div>
      <div class="cal-grid" id="cal-grid">${cells.join('')}</div>
      <div class="cal-info">
        <div><b>${sInfo.icon} ${sInfo.vi} · Ngày ${selDay} (${WEEKDAYS[weekday(selCal)]} · ${WEEKDAYS_VI[weekday(selCal)]}) · Năm ${vYear}</b></div>
        <div>${statusTxt}${selW ? ` · Thời tiết: <b>${selW.icon} ${esc(selW.jp)} (${esc(selW.vi)})</b>` : ' · 📺 Xem dự báo trên TV tối hôm trước'}</div>
        ${selPay ? '<div>💴 <b>Ngày nhận lương định kỳ (給与明細):</b> nhận lương kỳ + phụ cấp bậc nghề + tăng ca, trừ tiền nhà 15.000 ¥, thuế 12% và trả nợ 25.000 ¥.</div>' : ''}
        ${selEvs.map((ev) => `<div>${ev.icon} <b>${esc(ev.jp)} — ${esc(ev.vi)}:</b> ${esc(ev.desc)}</div>`).join('')}
      </div>`, [
      { label: 'Đóng lịch', on: () => { if (mod) mod.paused = was; } },
    ]);

    $('cal-prev')?.addEventListener('click', () => {
      if (vSeason > 0) vSeason--;
      else if (vYear > 1) { vYear--; vSeason = 3; }
      selDay = 1;
      renderCal();
    });
    $('cal-next')?.addEventListener('click', () => {
      if (vSeason < 3) vSeason++;
      else { vYear++; vSeason = 0; }
      selDay = 1;
      renderCal();
    });
    for (const b of document.querySelectorAll('#cal-grid .cal-cell')) {
      b.addEventListener('click', () => {
        selDay = Number(b.dataset.d) || 1;
        renderCal();
      });
    }
  };
  renderCal();
}

// ---------- changing job (player feedback S13) ----------
function careerScreen() {
  const S = load(storage); if (!S) return;
  hideAll();
  const back = { label: '← Quay lại', cls: 'ghost', on: titleScreen };
  if (S.career && S.career.target) {
    const J = JOBS[S.career.target];
    return card(`<h2>📚 Đang học chuyển ngành</h2><p>Ngành mới: ${J.icon} <b>${esc(J.name)}</b>.</p><p>Đã học ${S.career.lessons}/${CAREER.LESSONS} buổi tối. Học ở phòng ký túc xá buổi tối (nút 📚). Học đủ thì thi 5 câu, đúng từ 4 câu là đỗ.</p>`, [
      back, { label: 'Bỏ học (mất lệ phí)', cls: 'ghost', on: () => { quitStudy(S); save(S, storage); titleScreen(); } },
    ]);
  }
  card(`<h2>🔄 Đổi nghề?</h2>
    <p class="lesson">Ở Nhật, thực tập sinh <b>không được tự ý đổi sang ngành khác</b>. Muốn chuyển ngành phải <b>học và thi đỗ chứng chỉ kỹ năng của ngành mới</b> (<span class="jp">特定技能 技能試験</span>) và có tiếng Nhật <b>N4</b> trở lên.</p>
    <p>Lệ phí thi ${yen(CAREER.FEE)} · học ${CAREER.LESSONS} buổi tối ở ký túc xá (mỗi buổi 🧠 ${CAREER.LESSON_MENTAL}) · thi 5 câu từ chuyên ngành. Đỗ thì làm nghề mới từ bậc 1.</p>
    <h2 style="font-size:18px">Bạn có muốn học chuyển ngành không?</h2>`, [
    { label: '📚 Có, học chuyển ngành', on: () => careerPick(S) },
    { label: 'Không, ở lại nghề cũ', cls: 'ghost', on: titleScreen },
  ]);
}
function careerPick(S) {
  const why = cannotStudy(S);
  if (why === 'jp') return card(`<h2>🗣️ Chưa đủ tiếng Nhật</h2><p>Cần N4 trở lên (hiện tại ${jpLevel(S.jp)}). Học tiếng Nhật buổi tối và nói chuyện nhiều hơn ở chỗ làm rồi quay lại nhé.</p>`, [{ label: '← Quay lại', on: titleScreen }]);
  if (why === 'money') return card(`<h2>💴 Chưa đủ tiền</h2><p>Lệ phí thi ${yen(CAREER.FEE)}, bạn đang có ${yen(S.money)}.</p>`, [{ label: '← Quay lại', on: titleScreen }]);
  card('<h2>Chọn ngành muốn chuyển sang</h2>', [
    ...targets(S).map((j) => ({ label: `${JOBS[j].icon} ${JOBS[j].name} · ${JOBS[j].area}`, on: () => {
      startStudy(S, j); save(S, storage);
      card(`<h2>📚 Bắt đầu học!</h2><p>Đã đóng lệ phí ${yen(CAREER.FEE)}. Mỗi tối về phòng ký túc xá bấm <b>📚 Học chứng chỉ</b>. Học đủ ${CAREER.LESSONS} buổi thì nút đổi thành <b>📝 Thi</b>.</p><p>Trong lúc học bạn vẫn đi làm nghề cũ.</p>`, [{ label: 'Tiếp tục chơi →', on: () => { G.S = S; setPlayer().then(runStep); } }]);
    } })),
    { label: '← Quay lại', cls: 'ghost', on: titleScreen },
  ]);
}

// ---------- creator ----------
function swatchRow(slot) {
  const box = $('sw-' + slot); box.textContent = '';
  for (const hex of SWATCH[slot]) {
    const b = document.createElement('button'); b.type = 'button';
    if (hex === null) { b.style.background = refHex(G.draft.outfit, slot); b.classList.add('orig'); b.setAttribute('aria-label', 'Màu gốc'); }
    else { b.style.background = hex; b.setAttribute('aria-label', hex); }
    b.setAttribute('aria-pressed', String(G.draft.colors[slot] === hex));
    b.addEventListener('click', () => { G.draft.colors[slot] = hex; G.player.look(G.draft.colors); swatchRow(slot); });
    box.appendChild(b);
  }
}
function outfitList() {
  const box = $('outfits'); box.textContent = '';
  for (const [id, o] of Object.entries(OUTFITS)) {
    if (o.g !== G.draft.gender || o.uniform || o.npc) continue; // job uniforms and residents are not offered
    const b = document.createElement('button'); b.type = 'button'; b.className = 'outfit'; b.dataset.o = id;
    b.innerHTML = `<b>${esc(o.name)}</b><span>${esc(o.desc)}</span>`;
    b.setAttribute('aria-pressed', String(id === G.draft.outfit));
    b.addEventListener('click', () => pickOutfit(id));
    box.appendChild(b);
  }
}
async function pickOutfit(id) {
  G.draft.outfit = id; G.draft.colors.top = null; G.draft.colors.bottom = null;
  for (const b of document.querySelectorAll('.outfit')) { b.setAttribute('aria-pressed', String(b.dataset.o === id)); if (b.dataset.o === id) b.setAttribute('aria-busy', 'true'); }
  $('lbl-bottom').textContent = OUTFITS[id].bottomLabel;
  await setPlayer();
  for (const b of document.querySelectorAll('.outfit')) b.removeAttribute('aria-busy');
  ['top', 'bottom', 'hair', 'skin'].forEach(swatchRow);
}
function creatorScreen() {
  hideAll(); setStage('town'); G.stages.town.setTime('day'); swapPlayer(G.own);
  if (G.own) { if (G.own.helmet) G.own.helmet.visible = false; if (G.own.cap) G.own.cap.visible = false; if (G.own.waders) G.own.waders.setVisible(false); G.own.look(G.draft.colors); }
  G.mode = 'creator'; G.spin = 0.5;
  outfitList(); ['top', 'bottom', 'hair', 'skin'].forEach(swatchRow);
  $('lbl-bottom').textContent = OUTFITS[G.draft.outfit].bottomLabel;
  show('creator');
}

// ---------- job choice ----------
function jobScreen() {
  G.draft.name = $('name').value.trim();
  hideAll(); G.mode = 'creator';
  const box = $('joblist'); box.textContent = '';
  for (const [id, j] of Object.entries(JOBS)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'job'; b.disabled = !j.ready;
    b.innerHTML = `<span class="ic">${j.icon}</span><b>${esc(j.sector)} — ${esc(j.name)}</b><span class="meta">📍 ${esc(j.place)} · ${esc(j.area)}</span><span class="d">${esc(j.desc)}${j.ready ? '' : ' <span class="soon">· Sắp mở</span>'}</span>`;
    b.addEventListener('click', () => startGame(id));
    box.appendChild(b);
  }
  show('jobs');
}

function startGame(job) {
  const d = G.draft;
  G.S = newState({ name: d.name, job, look: { gender: d.gender, outfit: d.outfit, colors: { ...d.colors } } });
  save(G.S, storage);
  hideAll();
  card(`<h2>${JOBS[job].icon} ${esc(JOBS[job].place)} · ${esc(JOBS[job].area)}</h2>
    <p><b>${esc(NPCS[INTRO.who].name)}</b> (${esc(NPCS[INTRO.who].role)}): ${esc(INTRO.text)}</p>
    <p class="lesson">💸 Bạn đang mang khoản nợ phí môi giới khoảng <b>${yen(G.S.debt)}</b>.</p>`, [
    { label: 'Đi làm thôi →', on: runStep },
  ]);
}

// ---------- story ----------
/** Three bars (player feedback): health, mental, job skill — tap one for what it means. */
function statsHtml() {
  const S = G.S, sk = skillInfo(S, jobOf());
  const lvl = (v) => (v < WELL.WARN ? 'bad' : v < 60 ? 'mid' : 'ok');
  const bar = (k, icon, name, v, cls, txt) => `<button type="button" class="sbar ${cls}" data-k="${k}"><span class="sb-h">${icon} ${name}<b>${txt}</b></span><span class="sb-t"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span></button>`;
  const st = (t) => `<span class="stat">${t}</span>`;
  return `<div class="sbars">${bar('health', '❤️', 'Thể lực', S.health, lvl(S.health), `${Math.round(S.health)}/100`)}${bar('mental', '🧠', 'Tinh thần', S.mental, lvl(S.mental), `${Math.round(S.mental)}/100`)}`
    + `${bar('skill', '🛠️', 'Kỹ năng', sk.pct, sk.maxed ? 'max' : 'skill', sk.maxed ? 'MAX' : `Bậc ${sk.rank + 1}/10 · ${sk.xp}/${sk.need}`)}</div>`
    + `<div class="schips">${st(`💴 ${yen(S.money)}`)}${st(`🗣️ ${jpLevel(S.jp)}`)}${st(`⭐ Lv ${S.lv}`)}</div>`;
}
const BAR_HELP = {
  health: () => `<h2>❤️ Thể lực</h2><p>Sức khỏe của bạn. <b>Giảm</b> sau mỗi ca làm (ca chiều mệt hơn), khi bị thương, khi thức khuya. <b>Tăng</b> khi ngủ, tắm, tự nấu ăn, ngày nghỉ.</p>
    <p class="lesson">Dưới ${WELL.WARN}: thanh đỏ, sắp kiệt sức.<br>Tụt xuống ${WELL.COLLAPSE}: <b>phải nghỉ làm, đi viện</b>. Mất 1 ngày lương (${yen(WELL.DAY_PAY)}) + viện phí ${yen(WELL.HOSPITAL)}, bảo hiểm y tế 国民健康保険 trả 70 % nên bạn trả 30 % (${yen(WELL.HOSPITAL * WELL.COPAY)}).</p>`,
  mental: () => `<h2>🧠 Tinh thần</h2><p>Tâm trạng, độ vững vàng. <b>Giảm</b> khi làm sai, bị mắng, thua ca, học khuya. <b>Tăng</b> khi gọi về nhà, ngủ đủ, được khen, đi chơi ngày nghỉ.</p>
    <p class="lesson">Dưới ${WELL.WARN}: thanh đỏ.<br>Tụt xuống ${WELL.COLLAPSE}: <b>phải nghỉ làm ở nhà</b> và gọi tư vấn. Mất 1 ngày lương (${yen(WELL.DAY_PAY)}).</p>`,
  skill: () => { const sk = skillInfo(G.S, jobOf()); return `<h2>🛠️ Kỹ năng nghề</h2><p>Tay nghề ở ${esc(JOBS[jobOf()].place.toLowerCase())}. Tăng sau mỗi ca (ca chiều thắng được nhiều hơn).</p>
    <p class="lesson">Đầy thanh: <b>lên bậc, lên chức, tăng lương</b> (+${yen(4000)}/tháng mỗi bậc).<br>Hiện tại: Bậc ${sk.rank + 1}/10 · ${esc(sk.title)} · phụ cấp ${yen(sk.pay)}/tháng.${sk.maxed ? '<br>🏆 Đã MAX: bạn là trụ cột của tổ!' : ''}</p>`; },
};
function onStatsTap(e) {
  const b = e.target.closest('.sbar'); if (!b || !G.S) return;
  const back = G.mode; const html = BAR_HELP[b.dataset.k](); card(html, [{ label: 'Đã hiểu', on: () => { G.mode = back; } }]);
}
function dayHud(label) {
  const S = G.S;
  const cal = ensureCal(S);
  $('day-label').textContent = hudCalText(S, label);
  $('day-label').parentElement?.classList.toggle('red-day', isRedPill(cal));
  $('stats').innerHTML = statsHtml();
  show('dayhud');
  const wk = curDayKey(S);
  if (lowBars(S).length && S.flags.warnDay !== wk && !S.flags.demo) {
    S.flags.warnDay = wk;
    setTimeout(() => toast('⚠️ Sắp kiệt sức!', 'Ngủ sớm, ăn uống đủ, đừng cố quá. Tụt xuống 15 là phải nghỉ làm.', 5), 600);
  }
}

async function runStep() {
  const S = G.S; hideAll();
  ensureCal(S);
  if (!S.life) {
    if (S.story >= DAYS) return S.flags.dayOff?.done ? weekEnd() : dayOffStep();
    const out = S.sStep < 5 ? checkCollapse(S) : null;
    if (out) return sickDay(out);
    const st = daySteps(S.story, jobOf())[S.sStep];
    if (S.sStep === 0 && S.flags.morningDay !== curDayKey(S)) return morningStep(st);
    if (S.sStep === 4) return S.flags.eveningDay === curDayKey(S) ? talkStep(st, eveningPlace(st)) : eveningStep(st);
    if (st.t === 'talk') return talkStep(st);
    if (st.t === 'shift') return shiftStep(st);
    return sleepStep(st);
  }

  // Endless 4-season calendar life loop (S.life === true)
  S.lDay = S.lDay || {};
  if (S.sStep === 0 && paydayOn(S.cal) && !S.lDay.paid) return paydayCard();
  const out = S.sStep < 5 ? checkCollapse(S) : null;
  if (out) return sickDay(out);

  if (!S.lDay.kind) {
    const fx = curWeatherFx(S);
    if (fx.dayOff) return typhoonCard();
    if (isMandatoryOff(S.cal)) {
      S.lDay.kind = 'dayoff';
      S.lDay.min = 9 * 60;
      save(S, storage);
    } else if (isSaturdayWorkable(S.cal)) {
      return saturdayPrompt();
    } else {
      S.lDay.kind = 'work';
      save(S, storage);
    }
  }

  if (S.lDay.kind === 'dayoff' || S.lDay.kind === 'typhoonOff') {
    if (S.sStep >= 5 || (S.lDay.min || 540) >= 21 * 60) {
      S.sStep = 5;
      return sleepStep({ label: 'Đêm · Ký túc xá', xp: 5, data: {} });
    }
    return lifeDayOffHub();
  }

  // Workday or Saturday overtime
  const evs = eventsOn(S.cal).filter((e) => e.kind === 'event');
  if (S.sStep === 4 && evs.length && !S.lDay.eventDone) return seasonalWorkEventCard(evs[0]);
  const st = lifeDaySteps(S, jobOf())[S.sStep];
  if (S.sStep === 0 && S.flags.morningDay !== curDayKey(S)) return morningStep(st);
  if (S.sStep === 4) return S.flags.eveningDay === curDayKey(S) ? talkStep(st, eveningPlace(st)) : eveningStep(st);
  if (st.t === 'talk') return talkStep(st);
  if (st.t === 'shift') return shiftStep(st);
  return sleepStep(st);
}

function paydayCard() {
  const S = G.S, p = payslip(S);
  setStage('dorm'); G.stages.dorm.setTime('day'); hideNpcs();
  G.mode = 'talk';
  dayHud('💴 Ngày lương · 給与明細');
  const P = G.player; P.holder.rotation.x = 0; P.holder.position.set(0.2, 0, 0.8); P.yaw = 0; P.play('idle');
  const remDebt = Math.max(0, (S.debt || 0) - p.debt);
  const avail = (S.money || 0) + p.net;
  const pickRemit = (remit, mental) => {
    applyPay(S, remit);
    S.lDay.paid = true;
    save(S, storage);
    if (remit > 0) toast(`💸 Đã gửi ${yen(remit)} về nhà`, `Gia đình nhắn cảm ơn · 🧠 +${mental}`, 4.5);
    else toast(`💴 Nhận lương thực lĩnh +${yen(p.net)}`, remDebt > 0 ? `Còn nợ ${yen(remDebt)}` : '🎉 Đã trả hết nợ môi giới!', 4);
    runStep();
  };
  const btns = [
    { label: 'Không gửi (giữ lại tiêu dùng)', cls: 'ghost', on: () => pickRemit(0, 0) },
  ];
  if (avail >= 10000) btns.unshift({ label: '💸 Gửi 10.000 ¥ về nhà (🧠 +5)', on: () => pickRemit(10000, 5) });
  if (avail >= 30000) btns.unshift({ label: '💸 Gửi 30.000 ¥ về nhà (🧠 +8)', on: () => pickRemit(30000, 8) });

  card(`<h2>💴 Phiếu lương · 給与明細</h2>
    <div class="payslip">
      <div class="prow"><span>Lương cơ bản kỳ (基本給)</span><b class="pos">+${yen(p.base)}</b></div>
      <div class="prow"><span>Phụ cấp bậc nghề (Bậc ${p.rank}/10)</span><b class="pos">+${yen(p.skill)}</b></div>
      <div class="prow"><span>Tăng ca thứ Bảy (${S.overtime || 0} ca × ${yen(PAY.OVERTIME)})</span><b class="pos">+${yen(p.overtime)}</b></div>
      <div class="prow sub"><span>Tổng thu nhập (総支給額)</span><b>${yen(p.gross)}</b></div>
      <div class="prow"><span>Tiền nhà ký túc xá (寮費)</span><span class="neg">−${yen(p.rent)}</span></div>
      <div class="prow"><span>Thuế & bảo hiểm (12%)</span><span class="neg">−${yen(p.tax)}</span></div>
      <div class="prow"><span>Trả nợ môi giới (返済)</span><span class="neg">−${yen(p.debt)}</span></div>
      <div class="prow net"><span>Thực lĩnh (手取り)</span><span>+${yen(p.net)}</span></div>
    </div>
    <p class="lesson">💳 Dư nợ còn lại: <b>${yen(remDebt)}</b> · Tiền mặt sau lương: <b>${yen(avail)}</b>.<br>Bạn có muốn gửi tiền về cho gia đình (海外送金) kỳ này không?</p>`, btns);
}

function typhoonCard() {
  const S = G.S;
  setStage('dorm'); G.stages.dorm.setTime('day'); hideNpcs();
  G.mode = 'talk';
  dayHud('🌀 Nghỉ bão');
  const P = G.player; P.holder.rotation.x = 0; P.holder.position.set(0.2, 0, 0.8); P.yaw = 0; P.play('idle');
  card(`<div class="big">🌀</div><h2>台風で会社は休みです — Bão, công ty cho nghỉ</h2>
    <p>Ngoài trời mưa to gió giật mạnh. Quản lý nhắn tin cho cả tổ ở yên trong ký túc xá, hôm nay được nghỉ ở nhà.</p>
    <p class="lesson">🌀 Khi bão lớn (台風) đổ bộ, tàu điện ngừng chạy và công ty cho nghỉ để đảm bảo an toàn.</p>`, [
    { label: 'Ở trong phòng nghỉ ngơi →', on: () => {
      S.lDay.kind = 'typhoonOff';
      S.lDay.min = 9 * 60;
      save(S, storage);
      runStep();
    } },
  ]);
}

function saturdayPrompt() {
  const S = G.S;
  setStage('dorm'); G.stages.dorm.setTime('day'); hideNpcs();
  G.mode = 'talk';
  dayHud('👷 Thứ Bảy · 土曜日');
  const P = G.player; P.holder.rotation.x = 0; P.holder.position.set(0.2, 0, 0.8); P.yaw = 0; P.play('idle');
  card(`<div class="big">👷</div><h2>休日出勤 — Tăng ca thứ Bảy?</h2>
    <p>Hôm nay là thứ Bảy. Quản lý hỏi bạn có muốn đăng ký làm 1 ca tăng ca cuối tuần không:</p>
    <ul>
      <li>💰 Phụ cấp tăng ca: <b>+${yen(PAY.OVERTIME)}</b> (cộng vào phiếu lương kỳ tới)</li>
      <li>❤️ Thể lực <b>−8</b> · 🧠 Tinh thần <b>−4</b></li>
    </ul>`, [
    { label: `💪 Đi tăng ca (+${yen(PAY.OVERTIME)}, ❤️ −8, 🧠 −4)`, on: () => {
      applyFx(S, { health: -8, mental: -4 });
      S.overtime = (S.overtime || 0) + 1;
      S.lDay.kind = 'overtime';
      save(S, storage);
      toast('💪 Đăng ký tăng ca thứ Bảy', `+${yen(PAY.OVERTIME)} vào kỳ lương tới · ❤️ −8, 🧠 −4`);
      runStep();
    } },
    { label: '🎌 Nghỉ thứ Bảy', cls: 'ghost', on: () => {
      S.lDay.kind = 'dayoff';
      S.lDay.min = 9 * 60;
      save(S, storage);
      runStep();
    } },
  ]);
}

function seasonalWorkEventCard(ev) {
  const S = G.S;
  setStage('town'); G.stages.town.setTime(ev.time === 'evening' ? 'night' : 'day'); hideNpcs();
  G.mode = 'talk';
  dayHud(`${ev.icon} ${ev.vi}`);
  const deltas = applyFx(S, ev.fx || { mental: 5, culture: 3 });
  S.lDay.eventDone = true;
  save(S, storage);
  card(`<div class="big">${ev.icon}</div><h2>🎉 ${esc(ev.jp)} — ${esc(ev.vi)}</h2>
    <p>${esc(ev.desc)}</p>
    <div class="deltas">${deltaChips(deltas)}</div>`, [
    { label: 'Tiếp tục →', on: () => runStep() },
  ]);
}

async function lifeDayOffHub() {
  const S = G.S, d = S.lDay, isTyphoon = d.kind === 'typhoonOff';
  d.min = d.min || 9 * 60;
  await dress(false);
  setStage('dorm'); G.stages.dorm.setTime(d.min >= 18 * 60 ? 'night' : 'day'); hideNpcs();
  G.mode = 'talk';
  const P = G.player; P.holder.rotation.x = 0; P.holder.position.set(0.2, 0, 0.8); P.yaw = 0; P.play('idle');
  const evs = eventsOn(S.cal);
  const ev = evs[0] || null;
  dayHud(isTyphoon ? '🌀 Nghỉ bão ở nhà' : ev ? `${ev.icon} ${ev.vi}` : '🎌 Ngày nghỉ');

  const btns = [];
  if (ev && !d.eventDone) {
    btns.push({
      label: `🎉 ${ev.jp} — ${ev.vi} (+1h)`,
      on: () => {
        const deltas = applyFx(S, ev.fx || { mental: 5, culture: 3 });
        d.eventDone = true;
        d.min += 60;
        save(S, storage);
        card(`<div class="big">${ev.icon}</div><h2>🎉 ${esc(ev.jp)} — ${esc(ev.vi)}</h2>
          <p>${esc(ev.desc)}</p>
          <div class="deltas">${deltaChips(deltas)}</div>`, [
          { label: 'Tiếp tục ngày nghỉ →', on: () => runStep() },
        ]);
      },
    });
  }
  if (!isTyphoon) {
    btns.push({
      label: '⛩ Đền さくら神社 (dạo phố, đi lễ, rút quẻ, ngắm hoa)',
      on: () => lifeShrineVisit(),
    });
    btns.push({
      label: '🛒 Siêu thị スーパー さくら (mua đồ nấu ăn · 15:00)',
      on: () => {
        const mEv = createEvening('room');
        mEv.min = Math.min(18 * 60, Math.max(15 * 60, d.min));
        openMarket(mEv, () => {
          d.min = Math.max(d.min + 90, mEv.min);
          save(S, storage);
          runStep();
        });
      },
    });
  }
  btns.push({
    label: '📚 Học tiếng Nhật ở nhà (+2h · 🗣️ +2, 🧠 −2)',
    on: () => {
      applyFx(S, { jp: 3, mental: -2 });
      d.min += 120;
      save(S, storage);
      toast('📚 Tự học tiếng Nhật ở nhà', `🗣️ +2 · 🧠 −2 · ⏰ ${fmtClock(d.min)}`);
      runStep();
    },
  });
  if (!d.napped) {
    btns.push({
      label: '🛌 Ngủ bù (+3h · ❤️ +12, 🧠 +6)',
      on: () => {
        applyFx(S, { health: 12, mental: 6 });
        d.napped = true;
        d.min += 180;
        save(S, storage);
        toast('🛌 Ngủ bù khỏe người', `❤️ +12 · 🧠 +6 · ⏰ ${fmtClock(d.min)}`);
        runStep();
      },
    });
  }
  if (!d.called) {
    btns.push({
      label: '📱 Gọi về nhà (+1h · 🧠 +6)',
      on: () => {
        applyFx(S, { mental: 6 });
        d.called = true;
        d.min += 60;
        save(S, storage);
        toast('📱 Gọi điện về nhà', `Gia đình động viên · 🧠 +6 · ⏰ ${fmtClock(d.min)}`);
        runStep();
      },
    });
  }
  btns.push({
    label: '🌙 Kết thúc ban ngày → Nghỉ tối tại phòng',
    cls: 'ghost',
    on: () => {
      d.min = 21 * 60;
      S.sStep = 5;
      save(S, storage);
      runStep();
    },
  });

  const fx = curWeatherFx(S);
  card(`<h2>${isTyphoon ? '🌀 Nghỉ bão tại phòng' : '🎌 Hôm nay đi đâu?'}</h2>
    <p>⏰ Bây giờ là <b>${fmtClock(d.min)}</b> (tới 21:00 về phòng) · Thời tiết: <b>${fx.icon} ${esc(fx.vi)}</b></p>
    ${ev ? `<p class="lesson">🎉 <b>${esc(ev.jp)} — ${esc(ev.vi)}:</b> ${esc(ev.desc)}</p>` : ''}`, btns);
}

async function lifeShrineVisit() {
  const S = G.S, d = S.lDay;
  if (!G.stages.shrine) { toast('⛩️ Đang vào đền さくら神社…', '休日 · Ngày nghỉ'); await ensureShrine(); }
  hideNpcs();
  await dress(false);
  const [hung, hoa] = [await npc('hung', 'shrine'), await npc('hoa', 'shrine')];
  await spawnWorkers();
  G.mode = 'dayoff';
  G.dayoff.start({
    S,
    stages: G.stages,
    who: { player: G.player, hung, hoa },
    setStage,
    storage,
    hubReturn: true,
    min: d.min || 10 * 60,
    dayLabel: hudCalText(S, 'Đền さくら神社'),
    onEnd: (endSt) => {
      d.min = Math.max((d.min || 540) + 180, endSt?.min || 720);
      save(S, storage);
      runStep();
    },
  });
}

/** Too tired / too low to work: day off sick, money lost, the day ends as if slept. */
function sickDay(kind) {
  const S = G.S, r = sickLeave(S, kind);
  setStage('dorm'); G.stages.dorm.setTime('day'); hideNpcs();
  G.mode = 'talk';
  dayHud('🏥 Nghỉ ốm');
  const P = G.player; P.holder.rotation.x = -Math.PI / 2; P.holder.position.set(-0.5, 0.3, -0.1); P.yaw = 0; P.play('idle');
  card(`<div class="big">${r.hospital ? '🏥' : '🛌'}</div><h2>Bạn phải nghỉ làm hôm nay</h2>
    <p>${kind === 'mental' ? '🧠 Tinh thần cạn kiệt, không thể tập trung làm việc.' : kind === 'both' ? '❤️ 🧠 Kiệt sức cả thân lẫn tâm.' : '❤️ Cơ thể kiệt sức, sáng nay bạn không đứng dậy nổi.'}${r.hospital ? ' Bạn được đưa tới <span class="jp">病院</span> (bệnh viện).' : ''}</p>
    <ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="lesson">Ở Nhật, nghỉ ốm phải báo quản lý trước giờ làm 「体調が悪いので休みます」. Đừng cố quá sức!</p>`, [
    { label: 'Nghỉ ngơi →', on: () => { P.holder.rotation.x = 0; S.sStep = 5; S.flags.morningDay = curDayKey(S); finishStep(); } },
  ]);
}

function finishStep(extraHtml = '') {
  const r = completeStep(G.S);
  const spoiled = r.dayEnd ? spoil(G.S) : [];
  save(G.S, storage);
  if (r.levels) toast(`⬆️ Lên cấp ${G.S.lv}!`, 'Hồi ❤️ 🧠 +15 · làm việc bớt mệt hơn');
  else toast(`⭐ +${r.xp} XP`, extraHtml);
  if (r.dayEnd && !r.weekEnd) {
    const spoilNote = spoiled.length
      ? ` · 🥀 Hỏng: ${spoiled.map((id) => `${goodOf(id)?.icon || ''} ${goodOf(id)?.vi || id}`).join(', ')}`
      : '';
    toast('🌅 Sáng hôm sau · おはようございます！', `${hudCalText(G.S)}${spoilNote}`);
  }
  runStep();
}

/** The station platform is only needed for the care home commute: built the first time. */
let stationP = null;
function ensureStation() {
  if (!stationP) {
    stationP = buildStation().then(async (s) => {
      G.stages.station = s;
      G.stationCrowd = await new Crowd(s.scene, { mode: 'station', stage: s, seed: 7 }).spawnStation();
      return s;
    });
  }
  return stationP;
}

/** The supermarket interior is built the first time the player enters スーパー さくら. */
let marketP = null;
function ensureMarket() {
  if (!marketP) {
    marketP = buildMarket().then((m) => {
      G.stages.market = m;
      return m;
    });
  }
  return marketP;
}

async function openMarket(ev, onExit) {
  if (!G.stages.market) { toast('🛒 Đang vào siêu thị…', 'スーパー さくら'); await ensureMarket(); }
  hideNpcs();
  await dress(false);
  const clerk = await npc('clerk', 'market');
  G.mode = 'market';
  G.market.start({
    S: G.S,
    ev,
    stage: G.stages.market,
    who: { player: G.player, clerk },
    setStage,
    storage,
    dayLabel: hudCalText(G.S, 'Siêu thị'),
    onExit,
  });
}

async function morningStep(st) {
  const S = G.S, job = jobOf();
  hideNpcs(); await dress(false);
  G.mode = 'morning';
  const train = job === 'care' || job === 'bento' || job === 'lotus';
  if (train && !G.stages.station) { toast('🚉 Đang tải ga tàu…', 'さくら駅'); await ensureStation(); }
  if (train && G.stationCrowd) G.stationCrowd.reset();
  const [suzuki, hung] = [await npc('suzuki', 'site'), await npc('hung', 'site')];
  const nurse = job === 'care' ? await npc('yamada', 'care') : null;
  const foreman = job === 'bento' ? await npc('tanaka', 'bento') : job === 'lotus' ? await npc('tanaka', 'lotus') : null;
  if (job === 'care') await spawnFolk(); // the residents are already at breakfast when the player walks in
  await spawnWorkers();
  G.morning.start({
    S, stages: G.stages, who: { player: G.player, suzuki, hung, nurse, foreman },
    commute: train ? 'train' : 'walk',
    storage,
    setStage, dayLabel: hudCalText(S, 'Buổi sáng'),
    onEnd: () => { S.flags.morningDay = curDayKey(S); save(S, storage); hideAll(); talkStep(st); },
  });
}

/** Where the evening story of this step takes place: { stage, pos, cam } */
function eveningPlace(st) {
  const spot = spotFor(st.data);
  if (spot === 'room') return { stage: 'dorm', pos: { x: 0.3, z: 0.9 }, cam: 'room' };
  const p = spot === 'konbini' ? ROUTE.konbini : ROUTE.start;
  return { stage: 'site', pos: { x: p.x - 0.7, z: p.z - 0.3 }, cam: 'street' };
}

async function eveningStep(st) {
  const S = G.S, job = jobOf();
  hideNpcs(); await dress(false);
  G.mode = 'evening';
  await spawnWorkers();
  G.evening.start({
    S, spot: spotFor(st.data), stages: G.stages, who: { player: G.player }, setStage,
    storage,
    from: job === 'care' || job === 'bento' || job === 'lotus' ? 'station' : 'gate',
    dayLabel: hudCalText(S, 'Buổi tối'),
    onMarket: (ev) => openMarket(ev, () => { hideNpcs(); G.mode = 'evening'; G.evening.resumeFromMarket(); }),
    onArrive: () => { S.flags.eveningDay = curDayKey(S); save(S, storage); talkStep(st, eveningPlace(st)); },
  });
}

async function talkStep(st, where = null) {
  const d = st.data, job = jobOf(), atWork = st.at === 'work' && !where;
  const atCare = atWork && job === 'care', atBento = atWork && job === 'bento', atLotus = atWork && job === 'lotus';
  await dress(atWork);
  setStage(where ? where.stage : atCare ? 'care' : atBento ? 'bento' : atLotus ? 'lotus' : atWork ? 'site' : 'town');
  hideNpcs();
  G.mode = 'talk';
  G.talkCam = where ? where.cam : atCare ? 'care' : atBento ? 'bento' : atLotus ? 'lotus' : atWork ? 'deck' : 'town';
  const P = G.player; P.play('idle');
  const fx = curWeatherFx(G.S);
  if (atCare) {
    P.unpinAll(); P.holder.rotation.x = 0;
    await spawnFolk();
    P.holder.position.set(0.4, 0, 3.6);
  } else if (atBento) {
    P.unpinAll(); P.holder.rotation.x = 0;
    G.stages.bento.clearTrays();
    P.holder.position.set(BENTO_ROOM.talkPlayer.x, 0, BENTO_ROOM.talkPlayer.z);
  } else if (atLotus) {
    P.unpinAll(); P.holder.rotation.x = 0;
    G.stages.lotus.setWeather({ rain: !!fx.rain, snow: !!fx.snow, wind: !!fx.wind, cold: !!((d.title || '').includes('lạnh') || fx.snow) });
    G.stages.lotus.setSpray(false);
    P.holder.position.set(LOTUS_FIELD.talkPlayer.x, 0, LOTUS_FIELD.talkPlayer.z);
  } else if (atWork) {
    P.look({ ...G.S.look.colors, ...WORK_COLORS }); P.unpinAll(); P.helmet.visible = true;
    G.stages.site.setWeather({ rain: !!fx.rain, snow: !!fx.snow, wind: !!fx.wind }); G.stages.site.setTime('day'); G.stages.site.ring.visible = false;
    await spawnWorkers();
    P.holder.position.set(-1.2, DECK_Y, 1.9);
  } else if (where) {
    P.look(G.S.look.colors); P.unpinAll(); if (P.helmet) P.helmet.visible = false; if (P.cap) P.cap.visible = false; if (P.waders) P.waders.setVisible(false); P.holder.rotation.x = 0;
    if (where.stage === 'site') { G.stages.site.setWeather({ rain: !!fx.rain, snow: !!fx.snow, wind: !!fx.wind }); G.stages.site.setTime('dusk'); G.stages.site.ring.visible = false; }
    else G.stages.dorm.setTime('night');
    P.holder.position.set(where.pos.x, 0, where.pos.z);
  } else {
    P.look(G.S.look.colors); P.unpinAll(); if (P.helmet) P.helmet.visible = false; if (P.cap) P.cap.visible = false; if (P.waders) P.waders.setVisible(false);
    G.stages.town.setTime(st.data.place === 'konbini' || st.data.place === 'bank' ? 'dusk' : 'night');
    P.holder.position.set(-0.6, 0, 2.2);
  }
  let N = null;
  if (d.who) {
    N = await npc(d.who, where ? where.stage : atCare ? 'care' : atBento ? 'bento' : atLotus ? 'lotus' : atWork ? 'site' : 'town');
    if (where && job !== 'site' && N.helmet) N.helmet.visible = false;
    // on the deck the pair stands across it, so the camera can look along the deck between the rails;
    // on the street they stand side by side in front of the shop, facing each other
    const off = atWork && !atCare && !atBento && !atLotus ? [-0.5, -1.5] : G.talkCam === 'street' ? [1.4, 0.15] : [1.5, -0.6];
    N.holder.position.set(P.holder.position.x + off[0], P.holder.position.y, P.holder.position.z + off[1]);
    N.yaw = Math.atan2(P.holder.position.x - N.holder.position.x, P.holder.position.z - N.holder.position.z);
    P.yaw = Math.atan2(N.holder.position.x - P.holder.position.x, N.holder.position.z - P.holder.position.z);
    N.play('talk');
    G.overhead.say(N, d.jp.replace(/[「」]/g, ''), 6);
  } else P.yaw = 0;
  G.talkPair = { P, N };
  dayHud(st.label);
  const who = d.who ? NPCS[d.who] : { name: G.S.name || 'Bạn', role: '' };
  $('talk-name').textContent = who.name; $('talk-role').textContent = who.role; $('talk-step').textContent = `+${st.xp} XP`;
  $('talk-title').textContent = d.title; $('talk-jp').textContent = d.jp; $('talk-text').textContent = d.text;
  const box = $('talk-choices'); box.textContent = ''; box.hidden = false; show('talk-result', false);
  d.choices.forEach((c) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = c.t;
    b.addEventListener('click', () => {
      const deltas = chooseTalk(G.S, c);
      box.hidden = true;
      $('talk-r').textContent = c.r || '';
      $('talk-deltas').innerHTML = deltaChips(deltas) + (c.ally ? '<span class="delta">🤝 Có thêm người sẵn sàng giúp bạn</span>' : '') + (c.watch ? '<span class="delta neg">👀 Bạn đang bị để ý</span>' : '');
      const L = $('talk-lesson'); L.hidden = !c.lesson; L.textContent = c.lesson ? '📘 ' + c.lesson : '';
      show('talk-result');
      $('stats').innerHTML = statsHtml();
      if (N) N.play('idle');
      $('talk-next').onclick = () => { show('talk', false); finishStep(); };
    });
    box.appendChild(b);
  });
  show('talk');
}

async function shiftStep(st) {
  if (jobOf() === 'care') return careShiftStep(st);
  if (jobOf() === 'bento') return bentoShiftStep(st);
  if (jobOf() === 'lotus') return lotusShiftStep(st);
  const S = G.S;
  await dress(true);
  setStage('site'); hideNpcs();
  G.mode = 'shift'; G.activeShift = G.shift;
  const P = G.player; P.look({ ...S.look.colors, ...WORK_COLORS });
  await spawnWorkers();
  const foreman = await npc('tanaka', 'site');
  G.stages.site.ring.visible = true;
  G.stages.site.setFloors(1 + Math.floor((S.jobXp || 0) / 16));
  const opts = shiftOpts(st.data, st.hard, S);
  G.stages.site.setWeather({ rain: !!opts.rain, snow: !!opts.snow, wind: !!opts.wind });
  G.stages.site.setSeason?.(seasonOf(ensureCal(S)).id);
  const rk = rankOf(S.jobXp || 0);
  card(`<h2>${st.hard ? '🔥 ' : ''}${esc(opts.label)}</h2>
    ${opts.jp ? `<p class="jpline">${esc(opts.jp)}</p>` : ''}
    <p>${esc(opts.vi || 'Đi tới đống ống thép bên trái, nhấc lên, rồi vác sang giá bên phải.')}</p>
    <ul><li>🎯 Vác ${opts.goal} bó ống thép</li>${opts.limit ? `<li>⏱ ${opts.limit} giây</li>` : '<li>⏱ Không giới hạn giờ</li>'}${opts.maxMiss ? `<li>❌ Sai tối đa ${opts.maxMiss} lần</li>` : ''}${opts.wind ? '<li>💨 Có gió giật: kim thăng bằng trôi nhanh hơn</li>' : ''}${opts.rain ? '<li>🌧️ Mưa, sàn trơn: đi chậm hơn</li>' : ''}${opts.snow ? '<li>🌨️ Tuyết rơi: đường trơn (đi chậm ×0.85)</li>' : ''}${opts.heat ? '<li>🥵 Nắng gắt (猛暑): mỗi ca mất thêm ❤️ −3</li>' : ''}</ul>
    <p class="lesson">⚖️ Giữ thanh thăng bằng bằng 2 nút ◀ ▶ (hoặc phím A / D) khi đang vác ống · Xem 📋 Phiếu giao việc để lấy đúng loại ống và đặt đúng ô A / B / C.</p>`, [
    { label: 'Bắt đầu ca →', on: () => {
      G.shift.start(opts, { player: P, foreman }, {
        unit: JOBS.site.unit, rankLabel: `${hudCalText(S)} · 🎖️ ${rk + 1}/10 ${ranksOf('site')[rk]}`,
        onRetry: () => { retryCost(G.S); save(G.S, storage); },
      }, (r) => shiftDone(st, r));
    } },
  ]);
  dayHud(st.label);
  G.camRig.snap(G.stages.site.showcase.pos, G.stages.site.showcase.look);
}

function finishDemoShift(job, day, r) {
  const n = typeof r?.stars === 'number' ? r.stars : (r?.fail ? 0 : 1);
  recordStars(G.demoState, job, day, 'b', n);
  if (G.S && !G.S.flags?.demo) {
    recordStars(G.S, job, day, 'b', n);
    save(G.S, storage);
  }
  demoScreen();
}

/** Care home shift: four residents in the dining room, answer what they say in Japanese. */
async function careShiftStep(st, demo = false, demoDay = 0) {
  const S = G.S || { jobXp: 0, ally: 0, watch: 0 };
  await dress(true);
  setStage('care'); hideNpcs();
  G.mode = 'shift'; G.activeShift = G.care;
  const P = G.player;
  await spawnFolk();
  const nurse = await npc('yamada', 'care');
  const opts = shiftOpts(st.data, st.hard, S);
  const rk = rankOf(S.jobXp || 0);
  const meta = { unit: JOBS.care.unit, rankLabel: demo ? '🎮 Chế độ thử' : `${hudCalText(S)} · 🎖️ ${rk + 1}/10 ${ranksOf('care')[rk]}`,
    onRetry: () => { if (!demo) { retryCost(G.S); save(G.S, storage); } } };
  const begin = () => G.care.start(opts, { player: P, nurse, folk: G.folk }, meta, (r) => (demo ? finishDemoShift('care', demoDay, r) : shiftDone(st, r)));
  if (demo) { begin(); return; }
  card(`<h2>${st.hard ? '🔥 ' : ''}${esc(opts.label)}</h2>
    ${opts.jp ? `<p class="jpline">${esc(opts.jp)}</p>` : ''}
    <p>${esc(opts.vi || 'Đi tới cạnh từng cụ, nghe cụ nói gì rồi chọn việc phù hợp.')}</p>
    <ul><li>🎯 Chăm sóc ${opts.goal} lượt</li>${opts.limit ? `<li>⏱ ${opts.limit} giây</li>` : '<li>⏱ Không giới hạn giờ</li>'}${opts.maxMiss ? `<li>❌ Sai tối đa ${opts.maxMiss} lần</li>` : ''}</ul>
    <p class="lesson">👂 Đọc câu tiếng Nhật của cụ (ưu tiên cụ có ❤️ thấp, khi có 🚨 chạy lại bấm 🤲 Đỡ cụ trong 6s).<br>お腹がすいた → 🥣 Đút ăn · 口が汚れた → 🧻 Lau miệng · さみしい → 💬 Trò chuyện · 家に帰りたい → ❤️ Dỗ dành</p>`, [
    { label: 'Bắt đầu ca →', on: begin },
  ]);
  dayHud(st.label);
  G.camRig.snap(G.stages.care.showcase.pos, G.stages.care.showcase.look);
}

/** Bento factory shift: stand at the conveyor belt and place the requested side dish into each tray. */
async function bentoShiftStep(st, demo = false, demoDay = 0) {
  const S = G.S || { jobXp: 0, ally: 0, watch: 0 };
  await dress(true);
  setStage('bento'); hideNpcs();
  G.mode = 'shift'; G.activeShift = G.bento;
  const P = G.player;
  const foreman = await npc('tanaka', 'bento');
  const opts = { ...shiftOpts(st.data, st.hard, S), speed: st.data.speed };
  const rk = rankOf(S.jobXp || 0);
  const meta = { unit: JOBS.bento.unit, rankLabel: demo ? '🎮 Chế độ thử' : `${hudCalText(S)} · 🎖️ ${rk + 1}/10 ${ranksOf('bento')[rk]}`,
    onRetry: () => { if (!demo) { retryCost(G.S); save(G.S, storage); } } };
  const begin = () => G.bento.start(opts, { player: P, foreman }, meta, (r) => (demo ? finishDemoShift('bento', demoDay, r) : shiftDone(st, r)));
  if (demo) { begin(); return; }
  card(`<h2>${st.hard ? '🔥 ' : ''}${esc(opts.label)}</h2>
    ${opts.jp ? `<p class="jpline">${esc(opts.jp)}</p>` : ''}
    <p>${esc(opts.vi || 'Đứng trước băng chuyền, nhìn biểu tượng trên khay rồi bấm đúng món khi khay vào vùng vàng.')}</p>
    <ul><li>🎯 Đóng gói ${opts.goal} hộp cơm</li>${opts.maxMiss ? `<li>❌ Sai/trôi qua tối đa ${opts.maxMiss} khay</li>` : ''}</ul>
    <p class="lesson">🍱 Phím 1 / 2 / 3 (🍗 Gà rán · 🌭 Xúc xích · 🥦 Rau) theo thứ tự trái → phải khi khay vào vùng vàng · Gặp khay lỗi bấm 4 / 🚫 Loại 不良.</p>`, [
    { label: 'Bắt đầu ca →', on: begin },
  ]);
  dayHud(st.label);
  G.camRig.snap(G.stages.bento.showcase.pos, G.stages.bento.showcase.look);
}

/** Lotus paddy shift: wade through mud to the yellow-ringed spots and perform the 4 steps in order. */
async function lotusShiftStep(st, demo = false, demoDay = 0) {
  const S = G.S || { jobXp: 0, ally: 0, watch: 0 };
  await dress(true);
  setStage('lotus'); hideNpcs();
  G.mode = 'shift'; G.activeShift = G.lotus;
  const P = G.player;
  const foreman = await npc('tanaka', 'lotus');
  const opts = shiftOpts(st.data, st.hard, S);
  G.stages.lotus.setWeather({ rain: !!opts.rain, snow: !!opts.snow, wind: !!opts.wind, cold: !!(opts.cold || opts.snow) });
  G.stages.lotus.setSeason?.(seasonOf(ensureCal(S)).id);
  const rk = rankOf(S.jobXp || 0);
  const meta = { unit: JOBS.lotus.unit, rankLabel: demo ? '🎮 Chế độ thử' : `${hudCalText(S)} · 🎖️ ${rk + 1}/10 ${ranksOf('lotus')[rk]}`,
    onRetry: () => { if (!demo) { retryCost(G.S); save(G.S, storage); } } };
  const begin = () => G.lotus.start(opts, { player: P, foreman }, meta, (r) => (demo ? finishDemoShift('lotus', demoDay, r) : shiftDone(st, r)));
  if (demo) { begin(); return; }
  card(`<h2>${st.hard ? '🔥 ' : ''}${esc(opts.label)}</h2>
    ${opts.jp ? `<p class="jpline">${esc(opts.jp)}</p>` : ''}
    <p>${esc(opts.vi || 'Lội bùn lại gần gốc sen có vòng vàng, làm đúng các bước theo thứ tự để thu hoạch củ sen.')}</p>
    <ul><li>🎯 Đào ${opts.goal} củ sen</li>${opts.limit ? `<li>⏱ ${opts.limit} giây</li>` : '<li>⏱ Không giới hạn giờ</li>'}${opts.maxMiss ? `<li>❌ Sai tối đa ${opts.maxMiss} lần</li>` : ''}${opts.rain ? '<li>🌧️ Mưa lớn: bùn nặng chân</li>' : ''}</ul>
    <p class="lesson">🪷 Gốc có 🌿 bấm ✂️ Cắt cỏ trước → ⛏️ Đào → Giữ 💦 Xịt nước đến 80–100% rồi thả → Căn kim vùng xanh bấm 🪴 Nhổ → 🧺 Nhặt.</p>`, [
    { label: 'Bắt đầu ca →', on: begin },
  ]);
  dayHud(st.label);
  G.camRig.snap(G.stages.lotus.showcase.pos, G.stages.lotus.showcase.look);
}

function shiftDone(st, r) {
  const S = G.S, job = jobOf();
  const starCount = typeof r.stars === 'number' ? r.stars : stars({ won: !r.fail && r.f >= 1, miss: 0, maxMiss: st.data.maxMiss || 0, timeLeft: 0, limit: 0, extra: false });
  const starDay = S.life ? (((S.cal?.day || 1) - 1) % 5 + 5) % 5 : S.story;
  recordStars(S, job, starDay, st.hard ? 'b' : 'a', starCount);
  const res = shiftEnd(S, r, st.hard);
  const isHeat = !!(st.data?.heat || curWeather(S) === 'heat');
  if (isHeat) {
    applyFx(S, { health: -3 });
    res.deltas.push(['health', -3]);
    setTimeout(() => toast('🥵 水分補給！', 'Uống nước kẻo say nắng (❤️ −3)', 4.5), 350);
  }
  save(S, storage);
  G.mode = 'talk';
  const P = G.player; P.play('idle');
  if (st.hard) G.overhead.say(P, r.fail ? '悔しい… — Tiếc quá…' : 'やった！ — Làm được rồi!', 3);
  const rk = rankOf(S.jobXp);
  const linesHtml = (r.starLines || []).map((l) => `<div class="star-line${l.ok ? ' ok' : ''}">${esc(l.text)}</div>`).join('');
  const starsBox = `<div class="stars-box"><div class="stars-row">${formatStars(starCount)}</div>${linesHtml ? `<div class="stars-lines">${linesHtml}</div>` : ''}</div>`;
  card(`<h2>${res.title}</h2>
    <p>Xong ${r.done}/${st.data.goal} ${esc(JOBS[job].unit)}.</p>
    ${starsBox}
    <div class="deltas">${deltaChips(res.deltas)}<span class="delta">🛠️ Tay nghề +${res.jobXp}</span></div>
    ${isHeat ? '<p class="lesson">🥵 <b>水分補給！</b> Uống nước kẻo say nắng (trời nắng gắt làm mất thêm ❤️ −3).</p>' : ''}
    ${res.rankUp ? `<p class="lesson">🎖️ Lên mốc ${res.rankUp + 1}/10: ${esc(ranksOf(job)[res.rankUp])}<br>Quản lý: 「任せるよ！」 “Từ giờ việc này giao cho em.” · 💰 Phụ cấp tay nghề: +${yen(rankPay(res.rankUp + 1))}/tháng</p>` : ''}
    <p style="color:var(--ink-dim);font-size:12.5px">Tay nghề ${S.jobXp} · Mốc ${rk + 1}/10</p>`, [
    { label: 'Tiếp →', on: () => finishStep() },
  ]);
  $('stats').innerHTML = statsHtml();
}

async function sleepStep(st) {
  // walk home at night (or stay in the room), bath / call home / TV forecast, then lie down on the futon
  G.mode = 'evening';
  await dress(false);
  const dayIdx = G.S.life ? (((G.S.cal?.day || 1) - 1) % 5 + 5) % 5 : G.S.story;
  const after = st?.data?.after || daysOf(jobOf())[dayIdx]?.story?.after;
  G.evening.home({
    S: G.S, stages: G.stages, who: { player: G.player }, setStage,
    storage,
    dayLabel: hudCalText(G.S, st.label),
    onMarket: (ev) => openMarket(ev, () => { hideNpcs(); G.mode = 'evening'; G.evening.resumeFromMarket(); }),
    onSleep: () => {
      const d = sleep(G.S);
      toast('😴 Ngủ một giấc · おやすみなさい', d.map(([k, v]) => `${k === 'health' ? '❤️' : '🧠'} +${v}`).join(' · '), 4);
      hideNpcs();
      finishStep();
    },
  });
  if (after) setTimeout(() => G.mode === 'evening' && G.evening.tip('今日の一言', after, 6), 900);
}

/** The shrine stage is built the first time the player enters さくら神社 on the day off. */
let shrineP = null;
function ensureShrine() {
  if (!shrineP) {
    shrineP = buildShrine().then((sh) => {
      G.stages.shrine = sh;
      return sh;
    });
  }
  return shrineP;
}

async function dayOffStep(demo = false) {
  if (!G.stages.shrine) { toast('⛩️ Đang vào đền さくら神社…', '日曜日 · Ngày nghỉ'); await ensureShrine(); }
  hideNpcs();
  await dress(false);
  const [hung, hoa] = [await npc('hung', 'shrine'), await npc('hoa', 'shrine')];
  await spawnWorkers();
  G.mode = 'dayoff';
  G.dayoff.start({
    S: G.S,
    stages: G.stages,
    who: { player: G.player, hung, hoa },
    setStage,
    storage: demo ? null : storage,
    demo,
    onEnd: () => weekEnd(),
  });
}

function weekEnd() {
  const S = G.S, e = weekEval(S);
  if (e.bonus && !S.flags.weekBonus) { applyFx(S, { money: e.bonus }); S.flags.weekBonus = true; if (!S.flags.demo) save(S, storage); }
  setStage('town'); G.stages.town.setTime('day'); hideNpcs();
  G.mode = 'talk';
  dayHud('Đánh giá tuần đầu');
  $('day-label').textContent = `📋 Tuần đầu ở ${JOBS[S.job].place.toLowerCase()}`;
  const btns = S.flags.demo
    ? [{ label: '← Về chế độ thử', on: demoScreen }, { label: 'Về màn hình chính', cls: 'ghost', on: titleScreen }]
    : [
      { label: '▶ Tiếp tục cuộc sống ở Nhật', on: () => {
        S.life = true;
        S.cal = { year: 1, season: 0, day: 8 };
        S.sStep = 0;
        S.lDay = {};
        save(S, storage);
        toast('🌸 Bước sang tuần mới!', calLabel(S.cal, curWeather(S)));
        runStep();
      } },
      { label: '🏠 Về màn hình chính', cls: 'ghost', on: titleScreen },
      { label: 'Chơi lại từ đầu', cls: 'ghost', on: () => { clearSave(storage); creatorScreen(); } },
    ];
  card(`<h2>📋 Tuần đầu ở ${esc(JOBS[S.job].place)}</h2>
    <div class="big">${e.grade.split(' ')[0]}</div>
    <h2 style="text-align:center">${esc(e.grade.split(' ').slice(1).join(' '))}</h2>
    <p class="jpline" style="text-align:center">「${esc(e.jp)}」</p>
    <ul><li>🏆 Thử thách vượt qua: ${e.win}/5</li><li>🤝 Người sẵn sàng giúp bạn: ${e.ally}</li><li>👀 Lần bị để ý: ${e.watch}</li><li>${esc(dayOffSummary(S))}</li>${e.bonus ? `<li>💰 Thưởng: +${yen(e.bonus)}</li>` : ''}</ul>
    <p class="lesson">🌸 Bạn đã vượt qua tuần đầu tiên! Bấm <b>▶ Tiếp tục cuộc sống ở Nhật</b> để bước vào nhịp sống 4 mùa (Xuân · Hạ · Thu · Đông, nhận lương định kỳ ngày 10/19/28, trả nợ, tăng ca thứ Bảy và lễ hội quanh năm).</p>`, btns);
}

// ---------- demo: try any afternoon challenge, no scoring ----------
// Sketchfab models: CC BY 4.0 ones must credit their authors (art_src/sketchfab/CREDITS.md)
const CREDITS = [
  ['Máy bán nước', 'Japanese Vending Machine (Game Ready)', 'erlangga da', 'ad6fbf4844504b4f8321a990fcc4d3bf', 'CC BY 4.0'],
  ['Đèn lồng giấy', 'Japanese Paper Lantern', 'WIsEman_Tavern', 'f993239d99304992aef9701af1f31a3c', 'CC BY 4.0'],
  ['Ký túc xá', 'PSX Japanese Apartment', 'Shazly', '0a12452df55c4e3687759732c81a8437', 'CC BY 4.0'],
  ['Konbini', 'Mini mart', 'Pasha', 'a8d45543eaf24658bde28cf6dda49e22', 'Sketchfab Free Standard'],
  ['Toà nhà đang xây', 'Construction', 'Stas Gunko', '84e65d542fa9456593b10ffb0d0802ec', 'CC BY 4.0'],
  ['Đèn đường', 'Stylized Traditional Japanese Street Lamp', 'dayuchuu', '64eab2d23d824420abd35c53a40c3d58', 'CC BY 4.0'],
  ['Nhà dân', 'Japanese Residential Home 01, 02, 03', 'Morrissey Alexander', 'd690f83d8e8d48e6a532bebe84901595', 'CC BY 4.0'],
  ['Chung cư xa', 'LOW POLY - ASIAN TOWER BLOCK', 'Colin.Greenall', '694adf5094fa41f99a245ed822293f47', 'CC BY 4.0'],
  ['Máy xúc', 'Excavator', 'Anton Krupnov', '3c4d505819294b4982a67218fa8baaa2', 'CC BY 4.0'],
  ['Sân ga', 'Nazo no eki (Mystery Station)', 'Thomas Nguyen', '6cbd6ce6354f44a4b6517e8176d8741b', 'CC BY 4.0'],
  ['Cổng soát vé', 'Animated Ticket Gate', '€r!c', '19a605237de941edbd9fe829ca0cfedf', 'CC BY 4.0'],
  ['Ghế sân ga', 'Japan Train Station Bench', 'ditovirnantio', 'e23d79c1014a431bb913d15fc395b4f0', 'CC BY 4.0'],
  ['Băng chuyền', 'Conveyor Belt', 'Cianon', '55f0d0f9b3384ea4b49cfc8aef97dcf9', 'CC BY 4.0'],
  ['Hộp cơm bento', 'Low Poly Bento 弁当', 'SaltySaveState', 'f27d78a4526a4fe685b5ae2f75f60c11', 'CC BY 4.0'],
  ['Lá sen', 'Water lily', 'Mariia Melnik', '04dd636204cd4b0db45a4fc82efa4385', 'CC BY 4.0'],
  ['Củ sen', 'Scan Lotus Root-Freepoly.org', 'Freepoly.org', 'f4fa4b58b6514440bdc2d90817a42083', 'CC BY 4.0'],
  ['Túi rác', 'Garbage bags', 'DJMaesen', '9e769751ac3a4b6a893a5719349b78ca', 'CC BY 4.0'],
  ['Kệ siêu thị', 'Low Poly Store Shelves and Supermarket Rack Pack', 'Ankitimation', '3c5ec087909140c2a9483bb9bb838a25', 'CC BY 4.0'],
  ['Đồ siêu thị', 'Super market asset [low poly] [pixel]', 'Kanna-Nakajima', '9d6158220c894c2a8e28e48178f72a6c', 'CC BY 4.0'],
  ['Bếp ga', 'Gas Stove', 'Xin', 'acf506540b6a4c25b6836d6e12aac57b', 'CC BY 4.0'],
  ['Cổng torii', 'Japanese Torii gate Game Asset', 'Bazylonator', 'e12d2fa1b2b94928b8b87cb7787e2462', 'CC BY 4.0'],
  ['Đèn đá', 'Japanese Stone Lantern', 'Sahir Virmani', 'e0417d1e05984727a50f9ab1451d162d', 'CC BY 4.0'],
  ['Đền', 'Japanese shrine', 'GreenG', '56baeb7b13ba4238a2f54c363e7a3e0b', 'CC BY 4.0'],
  ['Futon', 'Japanese futon/bed', 'nicolas_solo', '0d5590d1d2184aa98797c3d6382afd7e', 'CC BY 4.0'],
  ['Bộ ấm trà', 'Japanese Tea Set', 'Geraldo Pratama Wahyu Teddy', '99c0bcbb59fa4efebbb918df747e86a5', 'CC BY 4.0'],
  ['Khăn', 'Folded Towel', 'Nicothin', 'c5f9e72edf7d4b5eaa2ec9b95c3b099d', 'CC BY 4.0'],
  ['Xe đạp', 'Low Poly Bicycles', 'EdwiixGG', 'c256e970e2874ad0ac04dcef730863af', 'CC BY 4.0'],
  ['Xe tải nhỏ', 'Simple Kei Truck', 'Spookyghostboo', 'fb477a6082c5442ca060dfcdf8eae928', 'CC BY 4.0'],
  ['Hàng rào cây', 'Shrub tiles pack (3 vars, seamless)', 'LOLIPOP', 'ce2fce219f634f328abc6280b2409613', 'CC BY 4.0'],
  ['Gương cầu lồi', 'Blind spot traffic mirror', 'Insane Ninja', '6b7baf381f6c45ef8d92411e0467492b', 'CC BY 4.0'],
  ['Biển 止まれ', 'Japanese Street Props', 'AlienKat', 'fc52f80909ba466c8b786bb2dada5dab', 'CC BY 4.0'],
  ['Bồn rửa inox', 'Low poly commercial sink', 'christian', '2d0cade455614fd989b2e81878fd7764', 'CC BY 4.0'],
  ['Khay inox đựng món', 'Gastronorm_Basic_1_2', 'MPS Porcellane di Saronno', '9fec684962424c8186b075dd99f9bef6', 'CC BY 4.0'],
];
function creditsScreen() {
  hideAll();
  const rows = CREDITS.map(([what, name, by, uid, lic]) => `<li><b>${esc(what)}</b>: <a href="https://sketchfab.com/3d-models/${uid}" target="_blank" rel="noopener">${esc(name)}</a> — ${esc(by)} <small>(${esc(lic)})</small></li>`).join('');
  card(`<h2>📜 Ghi công mô hình 3D</h2>
    <p>Các mô hình dưới đây lấy từ Sketchfab (giấy phép <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> hoặc Sketchfab Free Standard):</p>
    <ul class="credits">${rows}</ul>
    <p class="lesson">Các mô hình khác: thư viện cộng đồng Meshy (CC0) và mô hình tạo riêng cho game.</p>`, [
    { label: '← Quay lại', cls: 'ghost', on: titleScreen },
  ]);
}

function demoScreen() {
  hideAll(); G.demoJob = null;
  const saved = (!G.S || G.S.flags?.demo) ? load(storage) : G.S;
  const starStr = (job, i) => {
    const best = Math.max(getStars(saved, job, i, 'b'), getStars(G.S, job, i, 'b'), getStars(G.demoState, job, i, 'b'));
    return ` · ${formatStars(best)}`;
  };
  const name = (d) => d.b.label.replace(/^Ca chiều: |^Thử thách cuối tuần: /, '');
  const rows = [
    { label: '🎌 Ngày nghỉ ở đền', on: () => demoDayOff() },
    { label: '🗑️ Phân loại rác', on: () => demoTrash() },
    { label: '🛒 Siêu thị (20:05)', on: () => demoMarket() },
    { label: '🍳 Nấu cơm', on: () => demoCook() },
    ...daysOf('site').map((d, i) => ({ label: `👷 Ngày ${i + 1}: ${name(d)}${d.b.wind ? ' 💨' : ''}${d.b.rain ? ' 🌧️' : ''}${starStr('site', i)}`, on: () => demoShift('site', i) })),
    ...daysOf('care').map((d, i) => ({ label: `👵 Ngày ${i + 1}: ${name(d)}${starStr('care', i)}`, on: () => demoShift('care', i) })),
    ...daysOf('bento').map((d, i) => ({ label: `🍱 Ngày ${i + 1}: ${name(d)}${starStr('bento', i)}`, on: () => demoShift('bento', i) })),
    ...daysOf('lotus').map((d, i) => ({ label: `🪷 Ngày ${i + 1}: ${name(d)}${d.b.rain ? ' 🌧️' : ''}${starStr('lotus', i)}`, on: () => demoShift('lotus', i) })),
  ];
  card('<h2>🎮 Thử ca làm 3D</h2><p>🎌 Ngày nghỉ ở đền · 🗑️ Phân loại rác · 🛒 Siêu thị · 🍳 Nấu cơm · 👷 Công trường · 👵 Viện dưỡng lão · 🍱 Xưởng cơm hộp · 🪷 Ruộng sen · không tính điểm.</p>', [...rows, { label: '← Quay lại', cls: 'ghost', on: titleScreen }]);
}
async function demoDayOff() {
  hideAll(); hideNpcs();
  const demoS = newState({ name: G.draft.name || 'Bạn', job: 'site', look: { gender: G.draft.gender, outfit: G.draft.outfit, colors: { ...G.draft.colors } } });
  demoS.story = DAYS;
  demoS.flags.demo = true;
  G.S = demoS;
  await dayOffStep(true);
}
async function demoMarket() {
  hideAll(); hideNpcs();
  await dress(false);
  if (!G.stages.market) { toast('🛒 Đang vào siêu thị…', 'スーパー さくら'); await ensureMarket(); }
  const clerk = await npc('clerk', 'market');
  const demoS = newState({ name: G.draft.name || 'Bạn', job: 'site', look: { gender: G.draft.gender, outfit: G.draft.outfit, colors: { ...G.draft.colors } } });
  const ev = createEvening('room');
  ev.min = 20 * 60 + 5; // 20:05 -> 半額 (50% off)
  G.mode = 'market';
  G.market.start({
    S: demoS,
    ev,
    stage: G.stages.market,
    who: { player: G.player, clerk },
    setStage,
    dayLabel: '🎮 Thử nhanh · 🛒 Siêu thị (20:05 · 半額)',
    onExit: () => { hideNpcs(); demoScreen(); },
  });
}
async function demoCook() {
  hideAll(); hideNpcs();
  await dress(false);
  const demoS = newState({ name: G.draft.name || 'Bạn', job: 'site', look: { gender: G.draft.gender, outfit: G.draft.outfit, colors: { ...G.draft.colors } } });
  demoS.pantry = ['eggs', 'eggplant', 'meat', 'cucumber', 'banana', 'apple'];
  G.mode = 'evening';
  G.evening.ev = null;
  G.evening.home({
    S: demoS,
    stages: G.stages,
    who: { player: G.player },
    setStage,
    demoCook: true,
    dayLabel: '🎮 Thử nhanh · 🍳 Nấu cơm ký túc xá',
    onSleep: () => demoScreen(),
  });
}
async function demoTrash() {
  hideAll(); hideNpcs();
  await dress(false);
  G.mode = 'morning';
  const [suzuki, hung] = [await npc('suzuki', 'site'), await npc('hung', 'site')];
  await spawnWorkers();
  const demoS = newState({ name: G.draft.name || 'Bạn', job: 'site', look: { gender: G.draft.gender, outfit: G.draft.outfit, colors: { ...G.draft.colors } } });
  demoS.story = 0;
  G.morning.start({
    S: demoS,
    stages: G.stages,
    who: { player: G.player, suzuki, hung },
    commute: 'walk',
    demoTrash: true,
    setStage,
    dayLabel: '🎮 Thử nhanh · 🗑️ Phân loại rác (Ngày 1)',
    onEnd: () => demoScreen(),
  });
}
async function demoShift(job, i) {
  G.demoJob = job;
  const W = daysOf(job)[i].b;
  if (job === 'care') return careShiftStep({ data: W, hard: true, label: W.label }, true, i);
  if (job === 'bento') return bentoShiftStep({ data: W, hard: true, label: W.label }, true, i);
  if (job === 'lotus') return lotusShiftStep({ data: W, hard: true, label: W.label }, true, i);
  await dress(true);
  setStage('site'); hideNpcs(); G.mode = 'shift'; G.activeShift = G.shift;
  G.player.look({ ...G.draft.colors, ...WORK_COLORS });
  await spawnWorkers();
  const foreman = await npc('tanaka', 'site');
  G.stages.site.ring.visible = true; G.stages.site.setFloors(3);
  G.camRig.snap(G.stages.site.showcase.pos, G.stages.site.showcase.look);
  const opts = shiftOpts(W, true, { ally: 0, watch: 0 });
  G.shift.start(opts, { player: G.player, foreman }, { unit: JOBS.site.unit, rankLabel: '🎮 Chế độ thử' }, (r) => finishDemoShift('site', i, r));
}

// ---------- frame ----------
const clock = new THREE.Clock();
const vPos = new THREE.Vector3(), vLook = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05), t = (G.t += dt);
  resize();
  const st = G.stage, P = G.player;
  if (G.mode === 'title') {
    const a = t * 0.08;
    camera.fov = isPortrait() ? 52 : 42; camera.updateProjectionMatrix();
    vPos.set(Math.sin(a) * 9, 4.2, 4 + Math.cos(a) * 9); vLook.set(0, 1.4, -1);
    G.camRig.to(vPos, vLook, dt, 2);
    P.yaw = Math.sin(t * 0.4) * 0.6;
  } else if (G.mode === 'creator') {
    G.yaw += G.spin * dt; P.yaw = G.yaw;
    const b = P.holder.position, portrait = isPortrait();
    camera.fov = portrait ? 48 : 38; camera.updateProjectionMatrix();
    // portrait: the sheet covers the lower half, so frame the whole body (head included) in the top part
    if (portrait) { vPos.set(b.x, b.y + 1.1, b.z + 6.6); vLook.set(b.x, b.y - 0.75, b.z); }
    else { vPos.set(b.x + 1.2, b.y + 1.2, b.z + 4.6); vLook.set(b.x + 1.2, b.y + 0.8, b.z); }
    G.camRig.to(vPos, vLook, dt, 6);
  } else if (G.mode === 'talk' && G.talkPair && G.talkPair.N) {
    const a = G.talkPair.P.holder.position, b = G.talkPair.N.holder.position, portrait = isPortrait();
    camera.fov = portrait ? 50 : 40; camera.updateProjectionMatrix();
    vLook.set((a.x + b.x) / 2, a.y + (portrait ? 0.4 : 1.0), (a.z + b.z) / 2);
    if (G.talkCam === 'street') {
      // from the site side of the street, looking at the pair in front of the shop (+z);
      // screen right is −x here, so landscape aims right of the pair to clear the talk panel
      if (!portrait) vLook.x -= 1.2;
      vPos.set(vLook.x + 0.8, a.y + 2.2, vLook.z - (portrait ? 6.2 : 4.6));
    } else if (G.talkCam === 'deck') {
      // inside the deck rails, looking along it (−x); in landscape the talk panel sits bottom-right,
      // so aim right of the pair (screen right is −z here) to keep them clear of it
      if (!portrait) vLook.z -= 1.2;
      vPos.set(vLook.x + (portrait ? 6.2 : 4.6), a.y + 2.1, vLook.z + 0.9);
    }
    else vPos.set(vLook.x - 1.2, a.y + 2.3, vLook.z + (portrait ? 6.4 : 4.8));
    G.camRig.to(vPos, vLook, dt, 4);
  } else if (G.mode === 'talk') {
    const a = P.holder.position;
    vLook.set(a.x, a.y + 0.6, a.z); vPos.set(a.x, a.y + 2.4, a.z + 6);
    G.camRig.to(vPos, vLook, dt, 4);
  }
  if (G.mode === 'shift') (G.activeShift || G.shift).update(dt, t);
  if (G.mode === 'morning') G.morning.update(dt, t);
  if (G.mode === 'evening') G.evening.update(dt, t);
  if (G.mode === 'market') G.market.update(dt, t);
  if (G.mode === 'dayoff') G.dayoff.update(dt, t);
  if (G.streetCrowd) {
    const onStreet = G.stageId === 'site' && (G.mode === 'morning' || G.mode === 'evening' || G.mode === 'dayoff');
    G.streetCrowd.setVisible(onStreet);
    if (onStreet) G.streetCrowd.update(dt, P.holder.position);
  }
  if (G.stationCrowd) {
    const onStation = G.stageId === 'station' && G.mode === 'morning';
    G.stationCrowd.setVisible(onStation);
    if (onStation) G.stationCrowd.update(dt);
  }
  if (G.stageId === 'site') { updateWorkers(dt); for (const w of G.workers) w.update(dt); }
  P.update(dt);
  for (const ch of Object.values(G.npcs)) if (ch.holder.parent) ch.update(dt);
  if (G.stageId === 'care') for (const ch of G.folk) ch.update(dt);
  st.update(dt, t, P.holder.position);
  st.sun.userData.follow(P.holder.position);
  renderer.render(st.scene, camera);
  G.overhead.update(dt);
}

boot();
