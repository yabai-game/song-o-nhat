// Runs one care-home shift (j3Care): walk up to a resident, read what they say in Japanese, pick the
// matching action. Rules live in core/care_rules.js; this module drives the 3D room and the HUD.
import * as THREE from 'three';
import { CARE, NEEDS, createCare, nearestNeed, act, step, careFraction } from '../core/care_rules.js';
import { CARE_ROOM } from '../gfx/care.js';
import { camera, isPortrait } from '../gfx/stage.js';
import { $, show, card, esc } from '../ui/ui.js';

const ACTIONS = [
  { id: 'feed', icon: '🥣', label: 'Đút ăn', jp: '食事介助' },
  { id: 'wipe', icon: '🧻', label: 'Lau miệng', jp: '口を拭く' },
  { id: 'talk', icon: '💬', label: 'Trò chuyện', jp: '話す' },
  { id: 'comfort', icon: '❤️', label: 'Dỗ dành', jp: 'なだめる' },
];
const WALK = 3.0, NEAR_TAG = 4.2, SEAT = 0.52;

export class CareShift {
  constructor({ stage, controls, overhead, camRig }) {
    Object.assign(this, { stage, controls, overhead, camRig });
    this.dir = new THREE.Vector3(); this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3(); this.tmp = new THREE.Vector3();
    this.active = false;
    this.mine = ACTIONS.map((a) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'act'; b.dataset.id = a.id;
      b.innerHTML = `<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.action(a.id); });
      return b;
    });
    this.spots = CARE_ROOM.folk.map(([x, z]) => ({ x, z }));
    $('sh-quit').addEventListener('click', () => this.active && this.askQuit());
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      const k = { Digit1: 'feed', Space: 'feed', Digit2: 'wipe', Digit3: 'talk', Digit4: 'comfort' }[e.code];
      if (k) { e.preventDefault(); this.action(k); }
    });
  }

  /** opts from story.shiftOpts; who = { player, nurse, folk: [Character × 4] }; meta = { unit, rankLabel, onRetry } */
  start(opts, who, meta, onEnd) {
    Object.assign(this, { opts, who, meta, onEnd });
    this.st = createCare(opts, who.folk.length);
    const p = who.player;
    p.unpinAll(); p.holder.rotation.x = 0; p.bendTo = 0; if (p.helmet) p.helmet.visible = false;
    p.holder.position.set(CARE_ROOM.start.x, 0, CARE_ROOM.start.z); p.yaw = CARE_ROOM.start.yaw; p.play('idle');
    who.nurse.holder.position.set(CARE_ROOM.nurse.x, 0, CARE_ROOM.nurse.z); who.nurse.yaw = Math.PI / 2; who.nurse.play('idle');
    seatFolk(who.folk);
    // swap the shift buttons for the care actions
    const box = $('acts'); if (!this.saved) this.saved = [...box.children]; box.replaceChildren(...this.mine);
    show('dayhud', false); show('shifthud'); show('sh-gust', false);
    $('sh-place').querySelector('span').textContent = 'Viện dưỡng lão · 食堂';
    $('sh-rank').textContent = meta.rankLabel;
    this.tags = who.folk.map((f) => { const it = this.overhead.tag(f, '', false, 2.15); it.el.classList.add('care'); it.text = ''; return it; });
    this.controls.reset({ yaw: 0, pitch: 0.42, groundY: 0, yawLimit: [-1.2, 1.2] });
    this.controls.enabled = true; this.controls.onTap = null;
    this.intro = 2.6; this.active = true; this.paused = false; this.bestD = Infinity; this.stuckT = 0; this.endT = -1;
    this.tip('お手伝いします', 'Đi tới cạnh các cụ, nghe cụ nói gì (tiếng Nhật) rồi chọn việc phù hợp', 7);
    this.overhead.say(who.nurse, '敬語を忘れないでね。 — Nhớ dùng kính ngữ nhé.', 5);
    this.camRig.init = false;
    this.hud();
  }
  stop() {
    this.active = false; this.controls.enabled = false;
    if (this.saved) { $('acts').replaceChildren(...this.saved); this.saved = null; }
    for (const it of this.tags || []) { it.el.remove(); const i = this.overhead.items.indexOf(it); if (i >= 0) this.overhead.items.splice(i, 1); }
    this.tags = [];
    show('shifthud', false); show('sh-tip', false);
    this.who.player.bendTo = 0;
  }

  tip(jp, vi, sec = 6.5) {
    const t = $('sh-tip'); t.querySelector('b').textContent = jp; t.querySelector('span').textContent = vi;
    t.hidden = false; clearTimeout(this.tipT); this.tipT = setTimeout(() => { t.hidden = true; }, sec * 1000);
  }
  hud() {
    const s = this.st;
    let txt = `👵 ${s.count}/${s.goal} ${this.meta.unit}`;
    if (s.limit) txt += ` · ⏱ ${Math.ceil(s.time)}s`;
    if (s.maxMiss) txt += ` · ❌ ${s.miss}/${s.maxMiss}`; else if (s.miss) txt += ` · ❌ ${s.miss}`;
    const g = $('sh-goal'); if (g.textContent !== txt) g.textContent = txt;
    g.classList.toggle('warn', !!(s.limit && s.time < 10));
  }

  action(id) {
    if (!this.active || this.paused || this.intro > 0 || this.st.over) return;
    const P = this.who.player, pos = P.holder.position, s = this.st;
    if (s.busy > 0) return;
    const i = nearestNeed(s, this.spots, pos.x, pos.z);
    if (i < 0) { this.tip('もっと近くに！', 'Hãy lại gần một cụ đang cần giúp (có dấu ❗)', 3); return; }
    const need = s.folk[i].need, f = this.who.folk[i], N = NEEDS[need];
    P.yaw = Math.atan2(this.spots[i].x - pos.x, this.spots[i].z - pos.z);
    const r = act(s, i, id);
    if (r === 'good') {
      this.overhead.say(P, `${N.say} — ${N.sayVi}`, 3);
      this.tip(N.say, N.sayVi, 3.5);
      if (id === 'feed' || id === 'wipe') { P.bendTo = 0.45; setTimeout(() => { P.bendTo = 0; }, CARE.ACT_TIME * 1000); }
      else { P.play('talk'); setTimeout(() => this.active && P.play('idle'), CARE.ACT_TIME * 1000); }
      setTimeout(() => this.active && this.overhead.say(f, '😊 ありがとう — Cảm ơn cháu', 2.2), 500);
      if (s.result === 'win') this.endT = 0.6;
    } else if (r === 'bad') {
      this.tip(N.jp, `Cụ đang nói: “${N.vi}” — chưa đúng việc rồi`, 4);
      this.overhead.say(f, '…', 1.5);
      if (s.result === 'lose') this.lose();
    }
    this.hud();
  }

  askQuit() {
    if (this.paused) return;
    this.paused = true;
    card(`<h2>Về sớm?</h2><p>Mới xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}. Về sớm thì chỉ được tính phần đã làm.</p>`, [
      { label: 'Làm tiếp', on: () => { this.paused = false; } },
      { label: 'Về sớm', cls: 'ghost', on: () => this.finish({ f: careFraction(this.st), done: this.st.count, fail: this.opts.hard }) },
    ]);
  }
  finish(r) { this.stop(); this.onEnd(r); }
  lose() {
    this.paused = true;
    card(`<div class="big">😣</div><h2>Chưa đạt</h2><p>${esc(this.st.loseWhy)}</p><p>Đã xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}.</p>`, [
      { label: '🔁 Làm lại (🧠 −4)', on: () => { this.meta.onRetry && this.meta.onRetry(); this.stop(); this.start(this.opts, this.who, this.meta, this.onEnd); } },
      { label: 'Chịu thua, nhận phê bình', cls: 'ghost', on: () => this.finish({ f: careFraction(this.st), done: this.st.count, fail: true }) },
    ]);
  }
  win() {
    this.paused = true;
    this.overhead.say(this.who.player, 'お疲れ様でした！', 3);
    card('<div class="big">✅</div><h2>Hết ca! <span class="jp">お疲れ様でした</span></h2><p>Các cụ vui vẻ cả buổi.</p>', [
      { label: 'Về thôi →', on: () => this.finish({ f: 1, done: this.st.count, fail: false }) },
    ]);
  }

  update(dt) {
    if (!this.active) return;
    const s = this.st, P = this.who.player, pos = P.holder.position, c = this.controls, portrait = isPortrait();
    let moving = false;
    if (!this.paused && this.intro <= 0 && !s.over && s.busy <= 0) {
      let mag = c.input(this.dir);
      if (mag < 0.05 && c.target) {
        this.dir.set(c.target.x - pos.x, 0, c.target.z - pos.z);
        const d = this.dir.length();
        if (d < this.bestD - 0.02) { this.bestD = d; this.stuckT = 0; } else this.stuckT += dt;
        if (d < 0.1 || this.stuckT > 0.4) { c.target = null; mag = 0; this.bestD = Infinity; this.stuckT = 0; } else { this.dir.multiplyScalar(1 / d); mag = 1; }
      } else if (mag >= 0.05) this.dir.multiplyScalar(1 / Math.max(mag, 1e-4));
      if (mag >= 0.05) {
        moving = true;
        const sp = WALK * mag * dt;
        pos.x += this.dir.x * sp; pos.z += this.dir.z * sp;
        for (const o of this.stage.blocks) {
          const dx = pos.x - o.x, dz = pos.z - o.z, dd = Math.hypot(dx, dz), rr = o.r + 0.34;
          if (dd < rr && dd > 1e-4) { pos.x = o.x + dx / dd * rr; pos.z = o.z + dz / dd * rr; }
        }
        const B = CARE_ROOM.bounds;
        pos.x = THREE.MathUtils.clamp(pos.x, B.x0, B.x1); pos.z = THREE.MathUtils.clamp(pos.z, B.z0, B.z1);
        let dy = Math.atan2(this.dir.x, this.dir.z) - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        P.yaw += dy * Math.min(1, dt * 12);
      }
    }
    if (P.cur !== 'talk') P.play(moving ? 'walk' : 'idle');
    if (!this.paused) {
      if (this.intro > 0) this.intro -= dt;
      else for (const [ev] of step(s, dt)) { if (ev === 'lose') this.lose(); if (ev === 'warn10') this.tip('急いで！', 'Còn 10 giây!', 3); }
    }
    if (this.endT >= 0) { this.endT -= dt; if (this.endT < 0) this.win(); }

    // residents turn towards the player when near; their tags show the Japanese line and satisfaction
    s.folk.forEach((f, i) => {
      const ch = this.who.folk[i], sp = this.spots[i], d = Math.hypot(pos.x - sp.x, pos.z - sp.z);
      if (d < NEAR_TAG) {
        let dy = Math.atan2(pos.x - sp.x, pos.z - sp.z) - ch.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        ch.yaw += dy * Math.min(1, dt * 2);
      }
      const txt = f.need ? (d < NEAR_TAG ? `${NEEDS[f.need].jp}\n❤️ Độ hài lòng • ${f.sat}%` : '❗') : d < NEAR_TAG ? `😊 ❤️ Độ hài lòng • ${f.sat}%` : '';
      const it = this.tags[i];
      if (it && it.text !== txt) { it.text = txt; it.el.textContent = txt; it.el.hidden = !txt; it.w = 0; }
    });

    // third-person camera (showcase during the intro)
    camera.fov = portrait ? 58 : 46; camera.updateProjectionMatrix();
    if (this.intro > 0) {
      this.tmp.set(...CARE_ROOM.showcase.look);
      this.camPos.set(...CARE_ROOM.showcase.pos);
      this.camRig.to(this.camPos, this.tmp, dt, 3);
    } else {
      const dist = 6.4 * (portrait ? 1.15 : 1), cp = Math.cos(c.pitch);
      this.camPos.set(pos.x + Math.sin(c.yaw) * dist * cp, 1.2 + Math.sin(c.pitch) * dist, pos.z + Math.cos(c.yaw) * dist * cp);
      this.camLook.set(pos.x, 1.0, pos.z);
      this.camRig.to(this.camPos, this.camLook, dt, 5);
    }
    this.hud();
  }
}

/** Put the residents into their wheelchairs: seated pose, hips at seat height, facing their table. */
export function seatFolk(folk) {
  folk.forEach((ch, i) => {
    const [x, z, ry] = CARE_ROOM.folk[i];
    ch.unpinAll(); ch.sit = 1; ch.yaw = ry; ch.play('idle');
    ch.holder.position.set(x, 0, z);
    if (ch.hipH === undefined) {
      ch.holder.updateMatrixWorld(true);
      const hips = ch.root.getObjectByProperty('isBone', true);
      const v = new THREE.Vector3(); (ch.hips || hips).getWorldPosition(v);
      ch.hipH = v.y - ch.holder.position.y;
    }
    ch.holder.position.y = SEAT - ch.hipH + 0.08;
  });
}
