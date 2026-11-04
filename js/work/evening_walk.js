// Evening after the afternoon shift: walk out of the site gate at dusk to the evening story's place
// (konbini, dorm front or the room), optionally stop by スーパー さくら on the street, then home at night,
// cook dinner at the dorm kitchenette, bath / call home, and sleep.
// Rules live in core/evening.js and core/market_rules.js; this module drives the 3D scenes and the HUD.
import * as THREE from 'three';
import { EVENING, createEvening, tick, talked, enterRoom, act, toBed } from '../core/evening.js';
import {
  COOK_STEPS, goodOf, cookable, canCookTonight, cook, savingVsKonbini,
  createCookStove, pressCookStep, releaseCookStep, tickCookStep, cookStepProgress,
} from '../core/market_rules.js';
import { yen, save } from '../core/state.js';
import { clock } from '../core/morning.js';
import { DORM } from '../gfx/dorm.js';
import { ROUTE } from '../gfx/site.js';
import { camera, isPortrait } from '../gfx/stage.js';
import { $, show, card, esc, deltaText, toast } from '../ui/ui.js';

const BUTTONS = [
  { id: 'sleep',  icon: '🛏️', label: 'Đi ngủ',     jp: 'おやすみ', main: true },
  { id: 'cook',   icon: '🍳', label: 'Nấu cơm',    jp: '自炊' },
  { id: 'bath',   icon: '🛁', label: 'Tắm',        jp: 'お風呂' },
  { id: 'call',   icon: '📱', label: 'Gọi về nhà', jp: '電話' },
  { id: 'market', icon: '🛒', label: 'Siêu thị',   jp: 'スーパー' },
  { id: 'run',    icon: '🏃', label: 'Chạy',       jp: '走る' },
];
const SHOW = {
  toSpot: ['market', 'run'],
  toDorm: ['market', 'run'],
  talk:   [],
  room:   ['sleep', 'cook', 'bath', 'call'],
  bed:    [],
};
const WALK = 3.0, RUN_MUL = 1.6;
const SPOT = {
  konbini: { ...ROUTE.konbini, name: 'Konbini サクラマート' },
  dormFront: { ...ROUTE.start, name: 'Trước ký túc xá' },
};

export class EveningWalk {
  constructor({ controls, overhead, camRig }) {
    Object.assign(this, { controls, overhead, camRig });
    this.dir = new THREE.Vector3(); this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3();
    this.active = false; this.ev = null;
    this.btn = {}; this.mine = [];
    for (const a of BUTTONS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'act' + (a.main ? ' main' : ''); b.dataset.id = a.id;
      b.innerHTML = `<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.action(a.id); });
      this.btn[a.id] = b; this.mine.push(b);
    }
    this.cookBtn = {}; this.cookBars = {};
    this.cookMine = COOK_STEPS.map((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'act hold-act';
      b.dataset.id = s.id;
      b.innerHTML = `<span class="hold-bar"></span><span class="i">${s.icon}</span><span class="l">${s.vi}</span><span class="j">${s.jp}</span>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.pressCook(s.id); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
        b.addEventListener(ev, () => this.releaseCook(s.id));
      }
      this.cookBtn[s.id] = b;
      this.cookBars[s.id] = b.querySelector('.hold-bar');
      return b;
    });
    this.fade = document.createElement('div'); this.fade.className = 'fade'; $('app').appendChild(this.fade);
    $('sh-quit').addEventListener('click', () => this.active && this.skip());
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (this.cookState && this.cookState.phase === 'step') {
        if (e.repeat) return;
        const map = { Digit1: 'cut', Space: 'cut', Digit2: 'fry', Digit3: 'plate' };
        if (map[e.code]) { e.preventDefault(); this.pressCook(map[e.code]); }
        return;
      }
      if (e.code === 'Space' || e.code === 'Digit1') { e.preventDefault(); this.action('sleep'); }
      if (e.code === 'Digit2' || e.code === 'ShiftLeft') this.action(this.ev.phase === 'room' ? 'bath' : 'run');
      if (e.code === 'Digit3') this.action('call');
      if (e.code === 'Digit4') this.action(this.ev.phase === 'room' ? 'cook' : 'market');
    });
    addEventListener('keyup', (e) => {
      if (!this.active || !this.cookState || this.cookState.phase !== 'step') return;
      const map = { Digit1: 'cut', Space: 'cut', Digit2: 'fry', Digit3: 'plate' };
      if (map[e.code]) this.releaseCook(map[e.code]);
    });
  }

  _show(dayLabel) {
    const box = $('acts');
    if (!this.saved) this.saved = [...box.children];
    box.replaceChildren(...this.mine);
    show('dayhud', false); show('shifthud'); show('sh-gust', false);
    $('sh-rank').textContent = dayLabel;
    this.active = true; this.paused = false; this.busy = 0; this.bestD = Infinity; this.stuckT = 0;
    this.running = false; this.lie = -1; this.toFuton = false; this.toMarket = false; this.cookState = null;
    if (this.stages?.dorm?.setSteam) this.stages.dorm.setSteam(false);
    this.btn.run.classList.remove('on');
  }
  _hide() {
    this.active = false; this.controls.enabled = false;
    if (this.stages?.dorm?.setSteam) this.stages.dorm.setSteam(false);
    if (this.saved) { $('acts').replaceChildren(...this.saved); this.saved = null; }
    show('shifthud', false); show('sh-tip', false);
  }

  /** After the afternoon shift: walk from the gate to the evening story. */
  /** from: 'gate' (out of the site gate) or 'station' (off the train at the east end of the street) */
  start({ S, spot, stages, who, setStage, dayLabel, onArrive, onMarket = null, storage = null, from = 'gate' }) {
    Object.assign(this, { S, stages, who, setStage, onArrive, onMarket, storage, dayLabel });
    this.ev = createEvening(spot);
    this._show(dayLabel);
    if (spot === 'room') this.target = { ...ROUTE.start, name: 'Ký túc xá さくら寮', enter: true };
    else this.target = SPOT[spot];
    if (from === 'station') this.street('dusk', ROUTE.bounds.x1 - 0.5, 24.6, -Math.PI / 2);
    else this.street('dusk', ROUTE.gate.x - 0.5, ROUTE.gate.z + 0.9, -Math.PI / 2);
    this.tip('お疲れ様でした！', spot === 'room' ? 'Hết ca rồi. Về ký túc xá thôi (có thể ghé 🛒 Siêu thị).' : `Hết ca rồi. Ghé ${this.target.name} trên đường về.`, 5);
  }

  /** After the evening story: walk home at night (or stay in the room), then sleep. */
  home({ S, stages, who, setStage, dayLabel, onSleep, onMarket = null, storage = null, demoCook = false }) {
    Object.assign(this, { S, stages, who, setStage, onSleep, onMarket, storage, dayLabel });
    if (!this.ev) { this.ev = createEvening('room'); this.ev.talked = true; this.ev.phase = 'room'; this.ev.min = 20 * 60 + 30; }
    else if (!this.ev.talked) talked(this.ev);
    this._show(dayLabel);
    if (this.ev.phase === 'room') {
      this.room();
      if (demoCook) setTimeout(() => this.active && this.action('cook'), 250);
      return;
    }
    this.target = { ...ROUTE.start, name: 'Ký túc xá さくら寮', enter: true };
    const p = this.who.player.holder.position;
    this.street('night', p.x, p.z, this.who.player.yaw);
    this.tip('ただいま', 'Trời tối rồi. Ghé 🛒 Siêu thị săn sale hoặc về ký túc xá nghỉ ngơi.', 4);
  }

  /** Resume walking on the street after exiting スーパー さくら. */
  resumeFromMarket() {
    this._show(this.dayLabel);
    const tone = this.ev.min >= 19 * 60 + 45 || this.ev.talked ? 'night' : 'dusk';
    this.street(tone, ROUTE.market.x, ROUTE.market.z + 0.45, -Math.PI / 2);
    this.tip('スーパー さくら', 'Đã rời siêu thị. Tiếp tục đi về ký túc xá.', 3.5);
  }

  street(time, x, z, yaw) {
    const P = this.who.player, site = this.stages.site;
    this.setStage('site');
    site.setWeather({}); site.setTime(time); site.ring.visible = false;
    P.holder.rotation.x = 0; P.holder.position.set(x, 0, z); P.yaw = yaw; P.play('idle'); P.unpinAll();
    if (P.helmet) P.helmet.visible = false;
    this.controls.reset({ yaw: yaw + Math.PI, pitch: 0.3, groundY: 0, yawLimit: [-Infinity, Infinity] });
    this.controls.enabled = true; this.controls.onTap = null;
    $('sh-place').querySelector('span').textContent = this.target.name;
    this.camRig.init = false;
    this.ev.phase = this.ev.talked ? 'toDorm' : 'toSpot';
  }

  room() {
    const P = this.who.player;
    this.setStage('dorm'); this.stages.dorm.setTime('night');
    if (this.stages.dorm.setSteam) this.stages.dorm.setSteam(false);
    P.look(this.S.look.colors); P.unpinAll(); if (P.helmet) P.helmet.visible = false;
    P.holder.rotation.x = 0; P.holder.position.set(DORM.door.x - 0.3, 0, DORM.door.z); P.yaw = -Math.PI / 2; P.play('idle');
    enterRoom(this.ev);
    this.controls.reset({ yaw: 0, pitch: 0.55, groundY: 0, yawLimit: [-0.7, 0.7] });
    this.controls.enabled = true; this.controls.onTap = null;
    $('sh-place').querySelector('span').textContent = 'Ký túc xá さくら寮';
    this.camRig.init = false;
    if (this.ev.talked) {
      const hasCook = canCookTonight(this.S);
      this.tip('ただいま！', hasCook ? 'Có nguyên liệu trong bếp! Bấm 🍳 Nấu cơm, 🛁 Tắm, 📱 Gọi về nhà, rồi 🛏️ Đi ngủ' : 'Tắm 🛁, gọi về nhà 📱, rồi lên futon đi ngủ 🛏️', 6);
    } else {
      this.paused = true; this._hide(); this.onArrive();
    }
  }

  tip(jp, vi, sec = 6) {
    const t = $('sh-tip'); t.querySelector('b').textContent = jp; t.querySelector('span').textContent = vi;
    t.hidden = false; clearTimeout(this.tipT); this.tipT = setTimeout(() => { t.hidden = true; }, sec * 1000);
  }

  hud() {
    const e = this.ev, g = $('sh-goal');
    const icon = e.min >= 21 * 60 ? '🌙' : '🌆';
    let suffix = e.phase === 'room' ? (e.min >= EVENING.LATE ? ' · khuya rồi!' : ' · nghỉ ngơi') : ' · về nhà';
    if (this.cookState && this.cookState.phase === 'step') {
      const st = this.cookState.stove;
      const cur = COOK_STEPS[st.idx];
      if (cur) suffix = ` · Bấm giữ ${cur.icon} ${cur.vi} ${cur.jp} (${st.idx + 1}/${COOK_STEPS.length})`;
      for (let i = 0; i < COOK_STEPS.length; i++) {
        const s = COOK_STEPS[i];
        const b = this.cookBtn[s.id];
        const bar = this.cookBars[s.id];
        b.classList.toggle('hot', i === st.idx);
        const pct = i < st.idx ? 100 : i === st.idx ? Math.round(cookStepProgress(st) * 100) : 0;
        bar.style.width = `${pct}%`;
      }
    }
    const txt = `${icon} ${clock(e.min)}${suffix}`;
    if (g.textContent !== txt) g.textContent = txt;
    g.classList.toggle('warn', e.min >= EVENING.LATE);
    for (const a of BUTTONS) {
      if (a.id === 'cook') {
        this.btn.cook.hidden = e.phase !== 'room' || !canCookTonight(this.S) || !!this.cookState;
      } else if (a.id === 'market') {
        this.btn.market.hidden = !SHOW[e.phase]?.includes('market') || !this.onMarket;
      } else {
        this.btn[a.id].hidden = !SHOW[e.phase]?.includes(a.id);
      }
    }
    this.btn.bath.disabled = e.bath || !!this.cookState;
    this.btn.call.disabled = e.call || !!this.cookState;
    this.btn.sleep.disabled = !!this.cookState;
  }

  fadeTo(fn) {
    this.paused = true; this.fade.classList.add('on');
    setTimeout(() => { fn(); this.fade.classList.remove('on'); this.paused = false; }, 450);
  }

  action(id) {
    if (!this.active || this.paused || this.busy > 0 || this.lie >= 0 || this.cookState) return;
    const e = this.ev, P = this.who.player;
    if (id === 'run') { this.running = !this.running; this.btn.run.classList.toggle('on', this.running); return; }
    if (id === 'market') {
      if (!this.onMarket) return;
      const pos = P.holder.position;
      if (Math.hypot(pos.x - ROUTE.market.x, pos.z - ROUTE.market.z) < 1.8) {
        this.enterMarket();
      } else {
        this.toMarket = true;
        this.controls.target = new THREE.Vector3(ROUTE.market.x, 0, ROUTE.market.z);
        this.tip('スーパー さくら', 'Đang đi tới siêu thị… (19:30 giảm 20%, 20:00 giảm 50%)', 4);
      }
      return;
    }
    if (id === 'cook') {
      this.openCookMenu();
      return;
    }
    if (id === 'bath' || id === 'call') {
      const r = act(this.S, e, id); if (!r.ok) return;
      this.busy = 1.4;
      if (id === 'bath') { this.overhead.say(P, 'ふぅ〜、気持ちいい… — Dễ chịu quá…', 2.5); toast('🛁 Tắm nước nóng', `${deltaText(r.deltas)} · ${clock(e.min)}`); }
      else { P.play('talk'); this.overhead.say(P, 'Mẹ ơi, con khỏe! — 元気だよ', 3); toast('📱 Gọi video về nhà', `${deltaText(r.deltas)} · ${clock(e.min)}`); }
      return;
    }
    if (id === 'sleep') {
      if (!toBed(e)) return;
      show('sh-tip', false);
      // walk to the futon, then lie down (the reverse of getting up in the morning)
      this.controls.target = new THREE.Vector3(DORM.bed.x, 0, DORM.bed.z + 0.3);
      this.toFuton = true;
    }
  }

  enterMarket() {
    if (!this.onMarket || this.paused) return;
    this.toMarket = false;
    this.controls.target = null;
    this.paused = true;
    this._hide();
    this.onMarket(this.ev);
  }

  openCookMenu() {
    const avail = cookable(this.S.pantry);
    if (!avail.length) return;
    this.paused = true;
    const pantrySummary = (this.S.pantry || [])
      .map((id) => goodOf(id))
      .filter(Boolean)
      .map((g) => `${g.icon} ${g.vi}`)
      .join(', ');
    const btns = avail.map((r) => {
      const ing = r.items.map((id) => `${goodOf(id).icon} ${goodOf(id).vi}`).join(' + ');
      const sav = savingVsKonbini(r);
      return {
        label: `${r.icon} ${r.vi} · ${r.jp} (${ing} · tiết kiệm ~${yen(sav)})`,
        on: () => {
          show('modal', false);
          this.paused = false;
          this.beginCook(r);
        },
      };
    });
    btns.push({
      label: 'Đóng',
      cls: 'ghost',
      on: () => { show('modal', false); this.paused = false; },
    });
    card(`<h2>🍳 Tự nấu cơm tại ký túc xá · 自炊</h2>
      <p>Chọn món muốn nấu từ nguyên liệu trong tủ bếp:</p>
      <p class="lesson">🧺 Đang có: <b>${esc(pantrySummary)}</b><br>⏱ Nấu trên bếp ga gồm 3 bước (🔪 Thái → 🔥 Xào → 🍚 Dọn ra), tốn 15 phút.</p>`, btns);
  }

  beginCook(recipe) {
    show('sh-tip', false);
    if (recipe.stove) {
      this.cookState = { recipe, phase: 'toStove', stove: createCookStove(recipe.id) };
      this.controls.target = new THREE.Vector3(DORM.stove.x, 0, DORM.stove.z);
    } else {
      this.cookState = { recipe, phase: 'toTable', stove: null };
      this.controls.target = new THREE.Vector3(DORM.table.x - 0.35, 0, DORM.table.z + 0.35);
    }
    this.hud();
  }

  enterStoveMode() {
    const cs = this.cookState;
    if (!cs) return;
    cs.phase = 'step';
    const P = this.who.player;
    P.yaw = Math.PI;
    P.play('idle');
    $('acts').replaceChildren(...this.cookMine);
    const first = COOK_STEPS[0];
    this.tip('切る → 炒める → 盛り付け', `Bấm và giữ từng nút theo thứ tự: 1. ${first.icon} ${first.vi} → 2. 🔥 Xào → 3. 🍚 Dọn ra`, 6);
    this.hud();
  }

  pressCook(stepId) {
    const cs = this.cookState;
    if (!cs || cs.phase !== 'step') return;
    const P = this.who.player;
    const r = pressCookStep(cs.stove, stepId);
    if (!r.ok) {
      if (r.reason === 'wrong_order') {
        P.reachTo = 0;
        P.wristSway = 0;
        if (this.stages.dorm?.setSteam) this.stages.dorm.setSteam(false);
        this.overhead.say(P, `${r.jp} — ${r.vi}`, 2.2);
        this.tip('順番が違うよ', `Sai thứ tự rồi! Bước tiếp theo phải là: ${r.want.icon} ${r.want.vi} (${r.want.jp})`, 3.5);
      }
      this.hud();
      return;
    }
    P.yaw = Math.PI;
    P.reachTo = 0.7;
    P.wristSway = stepId === 'plate' ? 0.35 : 1.0;
    if (this.stages.dorm?.setSteam) this.stages.dorm.setSteam(stepId === 'fry');
    this.overhead.say(P, `${r.step.icon} ${r.step.jp} — Đang ${r.step.vi.toLowerCase()}…`, 2);
    this.hud();
  }

  releaseCook(stepId) {
    const cs = this.cookState;
    if (!cs || cs.phase !== 'step') return;
    if (stepId && cs.stove.holding && cs.stove.holding !== stepId) return;
    releaseCookStep(cs.stove);
    const P = this.who.player;
    P.reachTo = 0;
    P.wristSway = 0;
    if (this.stages.dorm?.setSteam) this.stages.dorm.setSteam(false);
    this.hud();
  }

  finishCookAtTable() {
    const cs = this.cookState;
    if (!cs) return;
    const recipe = cs.recipe;
    this.cookState = null;
    const P = this.who.player;
    P.reachTo = 0;
    P.wristSway = 0;
    if (this.stages.dorm?.setSteam) this.stages.dorm.setSteam(false);
    $('acts').replaceChildren(...this.mine);
    if (!recipe.stove) this.ev.min += 5;
    const res = cook(this.S, this.S.pantry, recipe.id);
    if (this.storage) save(this.S, this.storage);
    P.yaw = Math.atan2(DORM.table.x - P.holder.position.x, DORM.table.z - P.holder.position.z);
    P.play('idle');
    this.busy = 1.2;
    this.overhead.say(P, `いただきます！ — ${recipe.vi} ngon quá!`, 3);
    if (res.ok) {
      toast(
        `${recipe.icon} ${recipe.vi} · ${recipe.jp}`,
        `${deltaText(res.delta)} · Tiết kiệm ~${yen(res.saved)} so với ăn konbini`,
        4.5,
      );
    }
    this.hud();
  }

  skip() {
    if (this.paused) return;
    const e = this.ev;
    if (e.phase === 'toSpot') { this.who.player.holder.position.set(this.target.x, 0, this.target.z); }
    else if (e.phase === 'toDorm') this.fadeTo(() => this.room());
    else if (e.phase === 'room' && !this.cookState) this.action('sleep');
  }

  arrived() {
    const e = this.ev;
    if (this.target.enter) { this.fadeTo(() => this.room()); return; }
    this.paused = true; e.phase = 'talk';
    this._hide();
    this.onArrive();
  }

  update(dt) {
    if (!this.active || !this.ev) return;
    const e = this.ev, P = this.who.player, pos = P.holder.position, c = this.controls;
    const portrait = isPortrait();
    let moving = false, speed = 0;
    if (this.lie >= 0) {
      // lying down on the futon pivoting around the hips (0.9 s), then sleep
      this.lie = Math.min(1, this.lie + dt / 0.9);
      const k = this.lie * this.lie * (3 - 2 * this.lie), a = k * Math.PI / 2, h = 0.55;
      const hipY = h - (h - 0.2) * k, hipZ = DORM.bed.z + 0.3;
      P.yaw = 0; P.holder.rotation.x = -a;
      P.holder.position.set(DORM.bed.x, hipY - h * Math.cos(a), hipZ + h * Math.sin(a));
      if (this.lie >= 1) { this.lie = -1; this.paused = true; setTimeout(() => this.fadeTo(() => { this._hide(); this.ev = null; this.onSleep(); }), 700); }
    } else if (!this.paused) {
      if (this.cookState && this.cookState.phase === 'step') {
        P.yaw = Math.PI;
        const tr = tickCookStep(this.cookState.stove, dt);
        if (tr.advanced) {
          e.min += tr.minDelta;
          P.reachTo = 0;
          P.wristSway = 0;
          if (this.stages.dorm?.setSteam) this.stages.dorm.setSteam(false);
          if (tr.done) {
            $('acts').replaceChildren(...this.mine);
            this.cookState.phase = 'toTable';
            this.controls.target = new THREE.Vector3(DORM.table.x - 0.35, 0, DORM.table.z + 0.35);
          } else {
            const nxt = COOK_STEPS[this.cookState.stove.idx];
            if (nxt) this.overhead.say(P, `✓ Xong ${tr.completedStep.vi}! Tiếp: ${nxt.icon} ${nxt.vi} (${nxt.jp})`, 2.2);
          }
        }
      } else if (this.busy > 0) {
        this.busy -= dt;
        if (this.busy <= 0 && P.cur === 'talk') P.play('idle');
      } else {
        let mag = c.input(this.dir);
        if (mag < 0.05 && c.target) {
          this.dir.set(c.target.x - pos.x, 0, c.target.z - pos.z);
          const d = this.dir.length();
          if (d < this.bestD - 0.02) { this.bestD = d; this.stuckT = 0; } else this.stuckT += dt;
          if (d < 0.1 || this.stuckT > 0.4) { c.target = null; mag = 0; this.bestD = Infinity; this.stuckT = 0; } else { this.dir.multiplyScalar(1 / d); mag = 1; }
        } else if (mag >= 0.05) {
          this.dir.multiplyScalar(1 / Math.max(mag, 1e-4));
          if (!this.cookState) this.toMarket = false;
        }
        if (mag >= 0.05) {
          moving = true;
          const ox = pos.x, oz = pos.z;
          const room = e.phase === 'room' || e.phase === 'bed', B = room ? DORM.bounds : ROUTE.bounds, blocks = room ? DORM.blocks : ROUTE.blocks;
          const sp = WALK * (this.running && !room ? RUN_MUL : 1) * (room ? 0.6 : 1) * mag * dt;
          pos.x += this.dir.x * sp; pos.z += this.dir.z * sp;
          for (const o of blocks) {
            const dx = pos.x - o.x, dz = pos.z - o.z, dd = Math.hypot(dx, dz), rr = o.r + 0.3;
            if (dd < rr && dd > 1e-4) { pos.x = o.x + dx / dd * rr; pos.z = o.z + dz / dd * rr; }
          }
          pos.x = THREE.MathUtils.clamp(pos.x, B.x0, B.x1); pos.z = THREE.MathUtils.clamp(pos.z, B.z0, B.z1);
          speed = dt > 0 ? Math.hypot(pos.x - ox, pos.z - oz) / dt : 0;
          let dy = Math.atan2(this.dir.x, this.dir.z) - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          P.yaw += dy * Math.min(1, dt * 12);
          tick(e, dt);
        }
      }
      if (this.toMarket && (!c.target || Math.hypot(pos.x - ROUTE.market.x, pos.z - ROUTE.market.z) < 1.5)) {
        this.enterMarket();
        return;
      }
      if (this.cookState) {
        if (this.cookState.phase === 'toStove' && (!c.target || Math.hypot(pos.x - DORM.stove.x, pos.z - DORM.stove.z) < 0.32)) {
          c.target = null;
          this.enterStoveMode();
        } else if (this.cookState.phase === 'toTable' && (!c.target || Math.hypot(pos.x - (DORM.table.x - 0.35), pos.z - (DORM.table.z + 0.35)) < 0.35)) {
          c.target = null;
          this.finishCookAtTable();
        }
      }
      if ((e.phase === 'toSpot' || e.phase === 'toDorm') && !this.toMarket && Math.hypot(pos.x - this.target.x, pos.z - this.target.z) < 1.6) this.arrived();
      if (this.toFuton && !c.target) { this.toFuton = false; this.lie = 0; }
    }
    if (this.lie < 0) P.moveAt(speed);

    // camera: over-the-back on the street, diorama view in the room
    camera.fov = portrait ? 56 : 46; camera.updateProjectionMatrix();
    if (e.phase === 'room' || e.phase === 'bed') {
      const fx = pos.x * 0.5, fz = THREE.MathUtils.clamp(pos.z, -1.2, 1.4);
      this.camPos.set(fx, 2.9 * (portrait ? 1.25 : 1), fz + (portrait ? 4.9 : 3.9));
      this.camLook.set(fx * 1.2, 0.55, fz - 0.7);
      this.camRig.to(this.camPos, this.camLook, dt, 4);
    } else if (e.phase !== 'talk') {
      if (moving && !c.drag && Math.abs(c.joy.x) < 0.4) {
        let dy = P.yaw + Math.PI - c.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        c.yaw += dy * Math.min(1, dt * 2);
      }
      const dist = 4.6 * (portrait ? 1.15 : 1), cp = Math.cos(c.pitch);
      this.camPos.set(pos.x + Math.sin(c.yaw) * dist * cp, 1.5 + Math.sin(c.pitch) * dist, pos.z + Math.cos(c.yaw) * dist * cp);
      this.camLook.set(pos.x - Math.sin(c.yaw) * 2, 1.0, pos.z - Math.cos(c.yaw) * 2);
      this.camRig.to(this.camPos, this.camLook, dt, 6);
    }
    if (this.active) this.hud();
  }
}
