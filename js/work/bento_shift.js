// Runs one bento factory conveyor-belt shift (j3Bento): the player stands still in front of the
// yellow work zone (joystick hidden, tap-to-walk disabled) with a fixed camera 3.9 m behind them,
// pressing 1/2/3 (or tapping the 3 buttons) to place the requested side dish into each tray.
import * as THREE from 'three';
import { ITEMS, createBento, activeTray, act, step, bentoFraction } from '../core/bento_rules.js';
import { BENTO_ROOM } from '../gfx/bento.js';
import { camera, isPortrait } from '../gfx/stage.js';
import { $, show, card, esc } from '../ui/ui.js';

const ACTIONS = [
  { id: 'karaage', icon: ITEMS.karaage.icon, label: ITEMS.karaage.vi, jp: ITEMS.karaage.jp },
  { id: 'sausage', icon: ITEMS.sausage.icon, label: ITEMS.sausage.vi, jp: ITEMS.sausage.jp },
  { id: 'veg',     icon: ITEMS.veg.icon,     label: ITEMS.veg.vi,     jp: ITEMS.veg.jp },
];
const CAM_DIST = 3.9, CAM_YAW = 0.26, CAM_PITCH = 0.42;

export class BentoShift {
  constructor({ stage, controls, overhead, camRig }) {
    Object.assign(this, { stage, controls, overhead, camRig });
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.active = false;
    this.btn = {};
    this.mine = ACTIONS.map((a) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'act'; b.dataset.id = a.id;
      b.innerHTML = `<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.action(a.id); });
      this.btn[a.id] = b;
      return b;
    });
    $('sh-quit').addEventListener('click', () => this.active && this.askQuit());
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      const k = { Digit1: 'karaage', Space: 'karaage', Digit2: 'sausage', Digit3: 'veg' }[e.code];
      if (k) { e.preventDefault(); this.action(k); }
    });
  }

  /** opts from story.shiftOpts (+ speed); who = { player, foreman }; meta = { unit, rankLabel, onRetry } */
  start(opts, who, meta, onEnd) {
    Object.assign(this, { opts, who, meta, onEnd });
    this.st = createBento(opts);
    const P = who.player, F = who.foreman;
    P.unpinAll(); P.holder.rotation.x = 0; P.bendTo = 0; P.reachTo = 0; P.reach = 0;
    P.holder.position.set(BENTO_ROOM.player.x, 0, BENTO_ROOM.player.z);
    P.yaw = BENTO_ROOM.player.yaw; P.play('idle');
    if (F) {
      F.holder.position.set(BENTO_ROOM.foreman.x, 0, BENTO_ROOM.foreman.z);
      F.yaw = BENTO_ROOM.foreman.yaw; F.play('idle');
    }

    const box = $('acts'); if (!this.saved) this.saved = [...box.children]; box.replaceChildren(...this.mine);
    show('dayhud', false); show('shifthud'); show('sh-gust', false); show('joy', false);
    $('sh-place').querySelector('span').textContent = 'Xưởng cơm hộp さくら食品';
    $('sh-rank').textContent = meta.rankLabel;

    this.controls.reset({ yaw: CAM_YAW, pitch: CAM_PITCH, groundY: 0, yawLimit: [-0.2, 1] });
    this.controls.enabled = false;
    this.controls.target = null;
    this.controls.onTap = null;

    this.stage.syncTrays(this.st.trays);
    this.intro = 2.2;
    this.active = true;
    this.paused = false;
    this.endT = -1;
    this.tip('唐揚げ・ウインナー・野菜', 'Khay vào vùng vàng thì bấm đúng món được hiện trên khay', 6.5);
    if (F) this.overhead.say(F, '衛生第一！手を止めないで！ — Vệ sinh là số một! Đừng dừng tay!', 5);
    this.camRig.init = false;
    this.hud();
  }

  stop() {
    this.active = false;
    this.controls.enabled = false;
    show('joy', true);
    if (this.saved) { $('acts').replaceChildren(...this.saved); this.saved = null; }
    for (const a of ACTIONS) this.btn[a.id].classList.remove('hot');
    this.stage.clearTrays();
    show('shifthud', false); show('sh-tip', false);
    clearTimeout(this.reachT);
    if (this.who && this.who.player) { this.who.player.bendTo = 0; this.who.player.reachTo = 0; }
  }

  tip(jp, vi, sec = 5.5) {
    const t = $('sh-tip'); t.querySelector('b').textContent = jp; t.querySelector('span').textContent = vi;
    t.hidden = false; clearTimeout(this.tipT); this.tipT = setTimeout(() => { t.hidden = true; }, sec * 1000);
  }

  hud() {
    const s = this.st;
    let txt = `🍱 ${s.count}/${s.goal} ${this.meta.unit}`;
    if (s.maxMiss) txt += ` · ❌ ${s.miss}/${s.maxMiss}`; else if (s.miss) txt += ` · ❌ ${s.miss}`;
    const g = $('sh-goal'); if (g.textContent !== txt) g.textContent = txt;
    g.classList.toggle('warn', !!(s.maxMiss && s.miss >= s.maxMiss));
    const cur = activeTray(s);
    for (const a of ACTIONS) this.btn[a.id].classList.toggle('hot', !!(cur && cur.need === a.id));
  }

  action(id) {
    if (!this.active || this.paused || this.intro > 0 || this.st.over) return;
    const s = this.st, P = this.who.player, F = this.who.foreman;
    const cur = activeTray(s);
    const needBefore = cur ? cur.need : null;
    const r = act(s, id);
    if (r === 'locked') return;
    if (r === 'early') {
      this.tip('まだです', 'Chờ khay vào vùng vàng đã', 2.5);
      return;
    }
    if (r === 'good') {
      const it = ITEMS[id];
      P.bendTo = 0.35; P.reachTo = 1;
      clearTimeout(this.reachT);
      this.reachT = setTimeout(() => { if (this.active) { P.bendTo = 0; P.reachTo = 0; } }, 250);
      this.tip(it.jp, `Đúng rồi! ${it.vi}`, 2.2);
      this.stage.syncTrays(s.trays);
      if (s.result === 'win') this.endT = 0.5;
    } else if (r === 'bad') {
      const want = ITEMS[needBefore || id], got = ITEMS[id];
      this.tip(`${want.jp} ですよ！`, `Khay này thiếu ${want.vi}, không phải ${got.vi}`, 3.5);
      if (F) this.overhead.say(F, `${want.jp} ですよ！`, 2);
      if (s.result === 'lose') this.lose();
    }
    this.hud();
  }

  askQuit() {
    if (this.paused) return;
    this.paused = true;
    card(`<h2>Về sớm?</h2><p>Mới xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}. Về sớm thì chỉ được tính phần đã làm.</p>`, [
      { label: 'Làm tiếp', on: () => { this.paused = false; } },
      { label: 'Về sớm', cls: 'ghost', on: () => this.finish({ f: bentoFraction(this.st), done: this.st.count, fail: this.opts.hard }) },
    ]);
  }
  finish(r) { this.stop(); this.onEnd(r); }
  lose() {
    this.paused = true;
    card(`<div class="big">😣</div><h2>Chưa đạt</h2><p>${esc(this.st.loseWhy)}</p><p>Đã xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}.</p>`, [
      { label: '🔁 Làm lại (🧠 −4)', on: () => { this.meta.onRetry && this.meta.onRetry(); this.stop(); this.start(this.opts, this.who, this.meta, this.onEnd); } },
      { label: 'Chịu thua, nhận phê bình', cls: 'ghost', on: () => this.finish({ f: bentoFraction(this.st), done: this.st.count, fail: true }) },
    ]);
  }
  win() {
    this.paused = true;
    this.overhead.say(this.who.player, 'お疲れ様でした！', 3);
    card('<div class="big">✅</div><h2>Hết ca! <span class="jp">お疲れ様でした</span></h2><p>Khay cơm nào cũng đều tay và sạch sẽ.</p>', [
      { label: 'Về thôi →', on: () => this.finish({ f: 1, done: this.st.count, fail: false }) },
    ]);
  }

  update(dt) {
    if (!this.active) return;
    const s = this.st, P = this.who.player, pos = P.holder.position, portrait = isPortrait();
    P.play('idle');
    if (!this.paused) {
      if (this.intro > 0) this.intro -= dt;
      else {
        const ev = step(s, dt);
        if (ev.includes('miss_pass')) {
          this.tip('遅れてるよ！', '“Chậm rồi đó!” — một khay đã trôi qua', 3.5);
          if (this.who.foreman) this.overhead.say(this.who.foreman, '遅れてるよ！ — Chậm rồi đó!', 2.5);
        }
        if (ev.includes('lose')) this.lose();
        if (ev.includes('win') && this.endT < 0) this.endT = 0.5;
      }
      this.stage.syncTrays(s.trays);
    }
    if (this.endT >= 0 && !this.paused) { this.endT -= dt; if (this.endT < 0) this.win(); }

    // Fixed camera 3.9 m behind the player looking at the conveyor belt (showcase during intro)
    camera.fov = portrait ? 56 : 45; camera.updateProjectionMatrix();
    if (this.intro > 0) {
      this.tmp.set(...BENTO_ROOM.showcase.look);
      this.camPos.set(...BENTO_ROOM.showcase.pos);
      this.camRig.to(this.camPos, this.tmp, dt, 3);
    } else {
      const dist = CAM_DIST * (portrait ? 1.12 : 1), cp = Math.cos(CAM_PITCH);
      this.camPos.set(
        pos.x - Math.sin(CAM_YAW) * dist * cp,
        1.15 + Math.sin(CAM_PITCH) * dist,
        pos.z + Math.cos(CAM_YAW) * dist * cp,
      );
      this.camLook.set(pos.x - 0.35, 0.96, -0.05);
      this.camRig.to(this.camPos, this.camLook, dt, 5);
    }
    this.hud();
  }
}
