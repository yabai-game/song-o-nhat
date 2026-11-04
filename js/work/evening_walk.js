// Evening after the afternoon shift: walk out of the site gate at dusk to the evening story's place
// (konbini, dorm front or the room), then home at night, bath / call home, and sleep.
// Rules live in core/evening.js; this module drives the 3D scenes and the HUD.
import * as THREE from 'three';
import { EVENING, createEvening, tick, talked, enterRoom, act, toBed } from '../core/evening.js';
import { clock } from '../core/morning.js';
import { DORM } from '../gfx/dorm.js';
import { ROUTE } from '../gfx/site.js';
import { camera, isPortrait } from '../gfx/stage.js';
import { $, show, deltaText, toast } from '../ui/ui.js';

const BUTTONS = [
  { id: 'sleep', icon: '🛏️', label: 'Đi ngủ', jp: 'おやすみ', main: true },
  { id: 'bath', icon: '🛁', label: 'Tắm', jp: 'お風呂' },
  { id: 'call', icon: '📱', label: 'Gọi về nhà', jp: '電話' },
  { id: 'run', icon: '🏃', label: 'Chạy', jp: '走る' },
];
const SHOW = { toSpot: ['run'], toDorm: ['run'], talk: [], room: ['sleep', 'bath', 'call'], bed: [] };
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
    this.fade = document.createElement('div'); this.fade.className = 'fade'; $('app').appendChild(this.fade);
    $('sh-quit').addEventListener('click', () => this.active && this.skip());
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Space' || e.code === 'Digit1') { e.preventDefault(); this.action('sleep'); }
      if (e.code === 'Digit2' || e.code === 'ShiftLeft') this.action(this.ev.phase === 'room' ? 'bath' : 'run');
      if (e.code === 'Digit3') this.action('call');
    });
  }

  _show(dayLabel) {
    const box = $('acts');
    if (!this.saved) this.saved = [...box.children];
    box.replaceChildren(...this.mine);
    show('dayhud', false); show('shifthud'); show('sh-gust', false);
    $('sh-rank').textContent = dayLabel;
    this.active = true; this.paused = false; this.busy = 0; this.bestD = Infinity; this.stuckT = 0; this.running = false; this.lie = -1; this.toFuton = false;
    this.btn.run.classList.remove('on');
  }
  _hide() {
    this.active = false; this.controls.enabled = false;
    if (this.saved) { $('acts').replaceChildren(...this.saved); this.saved = null; }
    show('shifthud', false); show('sh-tip', false);
  }

  /** After the afternoon shift: walk from the gate to the evening story. */
  /** from: 'gate' (out of the site gate) or 'station' (off the train at the east end of the street) */
  start({ S, spot, stages, who, setStage, dayLabel, onArrive, from = 'gate' }) {
    Object.assign(this, { S, stages, who, setStage, onArrive, dayLabel });
    this.ev = createEvening(spot);
    this._show(dayLabel);
    if (spot === 'room') this.target = { ...ROUTE.start, name: 'Ký túc xá さくら寮', enter: true };
    else this.target = SPOT[spot];
    if (from === 'station') this.street('dusk', ROUTE.bounds.x1 - 0.5, 24.6, -Math.PI / 2);
    else this.street('dusk', ROUTE.gate.x - 0.5, ROUTE.gate.z + 0.9, -Math.PI / 2);
    this.tip('お疲れ様でした！', spot === 'room' ? 'Hết ca rồi. Về ký túc xá thôi.' : `Hết ca rồi. Ghé ${this.target.name} trên đường về.`, 5);
  }

  /** After the evening story: walk home at night (or stay in the room), then sleep. */
  home({ S, stages, who, setStage, dayLabel, onSleep }) {
    Object.assign(this, { S, stages, who, setStage, onSleep, dayLabel });
    if (!this.ev) { this.ev = createEvening('room'); this.ev.talked = true; this.ev.phase = 'room'; this.ev.min = 21 * 60; }
    else if (!this.ev.talked) talked(this.ev);
    this._show(dayLabel);
    if (this.ev.phase === 'room') { this.room(); return; }
    this.target = { ...ROUTE.start, name: 'Ký túc xá さくら寮', enter: true };
    const p = this.who.player.holder.position;
    this.street('night', p.x, p.z, this.who.player.yaw);
    this.tip('ただいま', 'Trời tối rồi. Về ký túc xá nghỉ ngơi.', 4);
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
    P.look(this.S.look.colors); P.unpinAll(); if (P.helmet) P.helmet.visible = false;
    P.holder.rotation.x = 0; P.holder.position.set(DORM.door.x - 0.3, 0, DORM.door.z); P.yaw = -Math.PI / 2; P.play('idle');
    enterRoom(this.ev);
    this.controls.reset({ yaw: 0, pitch: 0.55, groundY: 0, yawLimit: [-0.7, 0.7] });
    this.controls.enabled = true; this.controls.onTap = null;
    $('sh-place').querySelector('span').textContent = 'Ký túc xá さくら寮';
    this.camRig.init = false;
    if (this.ev.talked) this.tip('ただいま！', 'Tắm 🛁, gọi về nhà 📱, rồi lên futon đi ngủ 🛏️', 6);
    else { this.paused = true; this._hide(); this.onArrive(); } // the evening story happens in the room
  }

  tip(jp, vi, sec = 6) {
    const t = $('sh-tip'); t.querySelector('b').textContent = jp; t.querySelector('span').textContent = vi;
    t.hidden = false; clearTimeout(this.tipT); this.tipT = setTimeout(() => { t.hidden = true; }, sec * 1000);
  }
  hud() {
    const e = this.ev, g = $('sh-goal');
    const icon = e.min >= 21 * 60 ? '🌙' : '🌆';
    const txt = `${icon} ${clock(e.min)}${e.phase === 'room' ? (e.min >= EVENING.LATE ? ' · khuya rồi!' : ' · nghỉ ngơi') : ' · về nhà'}`;
    if (g.textContent !== txt) g.textContent = txt;
    g.classList.toggle('warn', e.min >= EVENING.LATE);
    for (const a of BUTTONS) this.btn[a.id].hidden = !SHOW[e.phase].includes(a.id);
    this.btn.bath.disabled = e.bath; this.btn.call.disabled = e.call;
  }

  fadeTo(fn) {
    this.paused = true; this.fade.classList.add('on');
    setTimeout(() => { fn(); this.fade.classList.remove('on'); this.paused = false; }, 450);
  }

  action(id) {
    if (!this.active || this.paused || this.busy > 0 || this.lie >= 0) return;
    const e = this.ev, P = this.who.player;
    if (id === 'run') { this.running = !this.running; this.btn.run.classList.toggle('on', this.running); return; }
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

  skip() {
    if (this.paused) return;
    const e = this.ev;
    if (e.phase === 'toSpot') { this.who.player.holder.position.set(this.target.x, 0, this.target.z); }
    else if (e.phase === 'toDorm') this.fadeTo(() => this.room());
    else if (e.phase === 'room') this.action('sleep');
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
      if (this.busy > 0) { this.busy -= dt; if (this.busy <= 0 && P.cur === 'talk') P.play('idle'); }
      else {
        let mag = c.input(this.dir);
        if (mag < 0.05 && c.target) {
          this.dir.set(c.target.x - pos.x, 0, c.target.z - pos.z);
          const d = this.dir.length();
          if (d < this.bestD - 0.02) { this.bestD = d; this.stuckT = 0; } else this.stuckT += dt;
          if (d < 0.1 || this.stuckT > 0.4) { c.target = null; mag = 0; this.bestD = Infinity; this.stuckT = 0; } else { this.dir.multiplyScalar(1 / d); mag = 1; }
        } else if (mag >= 0.05) this.dir.multiplyScalar(1 / Math.max(mag, 1e-4));
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
      if ((e.phase === 'toSpot' || e.phase === 'toDorm') && Math.hypot(pos.x - this.target.x, pos.z - this.target.z) < 1.6) this.arrived();
      if (this.toFuton && !c.target) { this.toFuton = false; this.lie = 0; }
    }
    if (this.lie < 0) P.moveAt(speed);

    // camera: over-the-back on the street, diorama view in the room
    camera.fov = portrait ? 56 : 46; camera.updateProjectionMatrix();
    if (e.phase === 'room' || e.phase === 'bed') {
      const fx = pos.x * 0.5, fz = THREE.MathUtils.clamp(pos.z, -1, 1.4);
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
