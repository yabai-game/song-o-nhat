// Runs one pipe-carrying shift on the scaffold: input → rules (core/site_rules) → 3D + HUD.
import * as THREE from 'three';
import { createShift, step, hold, toggleRun, speedOf, nearStack, nearRack, fraction, SITE } from '../core/site_rules.js';
import { DECK_Y, SITE_BOUNDS } from '../gfx/site.js';
import { camera, isPortrait } from '../gfx/stage.js';
import { $, show, card, esc } from '../ui/ui.js';

const ACTIONS = [
  { id: 'hold', icon: '🤲', label: 'Nhấc / Đặt', jp: '持つ・置く', main: true },
  { id: 'run', icon: '🏃', label: 'Chạy', jp: '走る' },
  { id: 'hi', icon: '🙋', label: 'Chào', jp: 'ご安全に' },
];
const BLOCK = [{ x: SITE.STACK.x, z: SITE.STACK.z, r: 1 }, { x: SITE.RACK.x, z: SITE.RACK.z, r: 1 }];

export class SiteShift {
  constructor({ site, controls, overhead, camRig }) {
    Object.assign(this, { site, controls, overhead, camRig });
    this.dir = new THREE.Vector3(); this.tmp = new THREE.Vector3(); this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3();
    this.active = false;
    this._buildActions();
    $('sh-quit').addEventListener('click', () => this.askQuit());
  }
  _buildActions() {
    const box = $('acts'); box.textContent = '';
    this.btn = {};
    for (const a of ACTIONS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'act' + (a.main ? ' main' : ''); b.dataset.id = a.id;
      b.innerHTML = `<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.action(a.id); });
      box.appendChild(b); this.btn[a.id] = b;
    }
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Space' || e.code === 'Digit1') { e.preventDefault(); this.action('hold'); }
      if (e.code === 'Digit2' || e.code === 'ShiftLeft') this.action('run');
      if (e.code === 'Digit3') this.action('hi');
    });
  }

  /** opts from story.shiftOpts; who = { player, foreman, workers }; onEnd({ f, done, fail }) */
  start(opts, who, meta, onEnd) {
    this.opts = opts; this.who = who; this.meta = meta; this.onEnd = onEnd;
    this.st = createShift(opts);
    const p = who.player;
    p.holder.position.set(-3, DECK_Y, 1); p.yaw = -Math.PI / 2; p.play('idle'); // facing the pipe stack
    who.foreman.holder.position.set(1.4, DECK_Y, -1.4); who.foreman.yaw = 0.3;
    this.site.setPlaced(0);
    this.site.setWeather({ rain: opts.rain, pm: opts.hard });
    this.bundle = this.site.bundle; this.bundle.visible = false;
    p.unpinAll();
    // pipes ride on the right shoulder, the right hand holds them from above
    p.pin(this.bundle, p.armR, 0.12, -0.04, -0.1); // local +x is the character's left
    if (p.helmet) p.helmet.visible = true;
    this.controls.reset({ yaw: Math.PI / 2, pitch: 0.34, groundY: DECK_Y, yawLimit: [-Infinity, Infinity] });
    this.controls.enabled = true;
    this.controls.onTap = (pt) => this.onTap(pt);
    this.pending = null; this.bowT = 0; this.warned = false;
    this.intro = 2.8; this.active = true; this.paused = false;
    this.btn.run.classList.remove('on');
    // the shift HUD replaces the day HUD (both use the top row, they would overlap)
    show('dayhud', false); show('shifthud'); show('sh-gust', false);
    $('sh-place').querySelector('span').textContent = 'Công trường Saitama';
    $('sh-rank').textContent = meta.rankLabel;
    this.tip(opts.jp ? opts.jp.replace(/[「」]/g, '') : '持つ (motsu)', opts.vi || 'Đi tới đống ống thép bên trái, nhấc lên, rồi vác sang giá bên phải');
    this.hud();
    this.overhead.say(who.foreman, 'ご安全に！走るなよ！ — Chúc an toàn! Đừng chạy nhé!', 5);
  }
  stop() {
    this.active = false; this.controls.enabled = false;
    show('shifthud', false); show('sh-tip', false); show('sh-gust', false);
    this.bundle.visible = false; this.who.player.unpinAll(); this.who.player.shoulderTo = 0; this.who.player.bendTo = 0;
  }

  tip(jp, vi, sec = 6.5) {
    const t = $('sh-tip'); t.querySelector('b').textContent = jp; t.querySelector('span').textContent = vi;
    t.hidden = false; clearTimeout(this.tipT); this.tipT = setTimeout(() => { t.hidden = true; }, sec * 1000);
  }
  hud() {
    const s = this.st, o = this.opts;
    let txt = `👷 ${s.count}/${s.goal} bó ống thép`;
    if (s.limit) txt += ` · ⏱ ${Math.ceil(s.time)}s`;
    if (s.maxMiss) txt += ` · ❌ ${s.miss}/${s.maxMiss}`;
    else if (s.miss) txt += ` · ❌ ${s.miss}`;
    const g = $('sh-goal'); g.textContent = txt; g.classList.toggle('warn', !!(s.limit && s.time < 10));
    void o;
  }

  action(id) {
    if (!this.active || this.paused || this.intro > 0) return;
    const p = this.who.player.holder.position, s = this.st;
    if (id === 'run') {
      const on = toggleRun(s); this.btn.run.classList.toggle('on', on);
      on ? this.tip('走る (hashiru)', 'Đang chạy — coi chừng đốc công!', 3) : this.tip('歩く (aruku)', 'Đi bộ, an toàn', 3);
    } else if (id === 'hi') {
      this.bowT = 0.9; // a small bow while greeting
      this.overhead.say(this.who.player, 'ご安全に！', 2.5);
      setTimeout(() => this.active && this.overhead.say(this.who.foreman, 'ご安全に！いい挨拶だ。 — Chúc an toàn! Chào hay lắm.', 3), 600);
      this.tip('ご安全に！', '“Chúc an toàn!” — câu chào đặc trưng ở công trường Nhật', 4);
    } else if (id === 'hold') {
      const r = hold(s, p.x, p.z);
      if (r === 'far-stack') this.tip('もっと近くに！', 'Lại gần đống ống thép bên trái đã', 3);
      else if (r === 'far-rack') this.tip('もっと奥へ', 'Giá để ống ở bên phải, đi tiếp nhé', 3);
      else if (r === 'bend') {
        const t = s.carry ? SITE.RACK : SITE.STACK;
        this.who.player.yaw = Math.atan2(t.x - p.x, t.z - p.z);
        this.controls.target = null; this.pending = null;
      }
    }
  }

  /** Tapping the pipe stack or the rack walks there and picks up / puts down on arrival. */
  onTap(pt) {
    if (!this.active || this.st.over) return;
    const near = (a) => Math.hypot(pt.x - a.x, pt.z - a.z) < 2.2;
    const s = this.st;
    if (!s.carry && near(SITE.STACK)) this.pending = SITE.STACK;
    else if (s.carry && near(SITE.RACK)) this.pending = SITE.RACK;
    else { this.pending = null; return; }
    // stop just in front of the target, on the player's side
    const p = this.who.player.holder.position, dx = p.x - this.pending.x, dz = p.z - this.pending.z, d = Math.hypot(dx, dz) || 1;
    this.controls.target.set(this.pending.x + dx / d * 1.9, DECK_Y, this.pending.z + dz / d * 1.9);
  }

  askQuit() {
    if (!this.active || this.paused) return;
    this.paused = true;
    card(`<h2>Về sớm?</h2><p>Mới xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}. Về sớm thì chỉ được tính phần đã làm.</p>`, [
      { label: 'Làm tiếp', on: () => { this.paused = false; } },
      { label: 'Về sớm', cls: 'ghost', on: () => this.finish({ f: fraction(this.st), done: this.st.count, fail: this.opts.hard }) },
    ]);
  }
  finish(r) { this.stop(); this.onEnd(r); }

  update(dt, t) {
    if (!this.active) return;
    const s = this.st, p = this.who.player, pos = p.holder.position;
    const c = this.controls;
    let moving = false, speed = 0;
    if (!this.paused && this.intro <= 0 && s.busy <= 0 && !s.over) {
      let mag = c.input(this.dir);
      if (mag < 0.05 && c.target) {
        this.dir.set(c.target.x - pos.x, 0, c.target.z - pos.z);
        const d = this.dir.length();
        if (d < 0.08) { c.target = null; mag = 0; } else { this.dir.multiplyScalar(1 / d); mag = 1; }
      } else if (mag >= 0.05) { this.dir.multiplyScalar(1 / Math.max(mag, 1e-4)); }
      if (mag >= 0.05) {
        moving = true;
        const ox = pos.x, oz = pos.z;
        const sp = speedOf(s, this.opts.walk) * mag * dt;
        pos.x += this.dir.x * sp; pos.z += this.dir.z * sp;
        for (const o of BLOCK) {
          const dx = pos.x - o.x, dz = pos.z - o.z, dd = Math.hypot(dx, dz), rr = o.r + 0.34;
          if (dd < rr && dd > 1e-4) { pos.x = o.x + dx / dd * rr; pos.z = o.z + dz / dd * rr; }
        }
        const f = this.who.foreman.holder.position, dx = pos.x - f.x, dz = pos.z - f.z, dd = Math.hypot(dx, dz);
        if (dd < 0.7 && dd > 1e-4) { pos.x = f.x + dx / dd * 0.7; pos.z = f.z + dz / dd * 0.7; }
        pos.x = THREE.MathUtils.clamp(pos.x, SITE_BOUNDS.x0, SITE_BOUNDS.x1);
        pos.z = THREE.MathUtils.clamp(pos.z, SITE_BOUNDS.z0, SITE_BOUNDS.z1);
        speed = dt > 0 ? Math.hypot(pos.x - ox, pos.z - oz) / dt : 0;
        const want = Math.atan2(this.dir.x, this.dir.z);
        let dy = want - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        p.yaw += dy * Math.min(1, dt * 12);
      }
    }
    p.moveAt(speed);
    p.shoulderTo = s.carry ? 1 : 0;

    if (!this.paused) {
      if (this.intro > 0) this.intro -= dt;
      else this.events(step(s, dt, moving));
    }
    // arrived at a tapped stack / rack → act
    if (this.pending && !c.target && s.busy <= 0) { const t = this.pending; this.pending = null; if (Math.hypot(pos.x - t.x, pos.z - t.z) <= SITE.REACH) this.action('hold'); }

    // bending to pick up / put down, small bow when greeting
    if (this.bowT > 0) this.bowT -= dt;
    p.bendTo = s.busy > 0 ? 1 : this.bowT > 0 ? 0.55 : 0;

    // pipes: shown while carrying, wobble more and more while running (drop at 0.9 s), shake in a gust
    this.bundle.visible = s.carry;
    const risk = s.carry && s.run && moving ? Math.min(1, s.runCarry / SITE.RUN_DROP) : 0;
    const gusty = s.gust > 0 ? 1 : 0;
    const tilt = this.bundle.userData.tilt;
    tilt.rotation.z = Math.sin(t * (10 + risk * 18)) * (0.02 + risk * 0.2 + gusty * 0.12);
    tilt.rotation.x = -0.3 + Math.sin(t * 7.3) * (risk * 0.12 + gusty * 0.06);
    if (risk > 0.4 && !this.warned) { this.warned = true; this.tip('危ない！', 'Ống đang lắc — dừng chạy ngay!', 1.6); }
    if (risk === 0) this.warned = false;

    // ring on the current goal, contextual main button
    const goal = s.carry ? SITE.RACK : SITE.STACK;
    this.site.ring.position.set(goal.x, DECK_Y + 0.03, goal.z);
    this.site.ring.scale.setScalar(1 + Math.sin(t * 6) * 0.05);
    const inReach = s.carry ? nearRack(pos.x, pos.z) : nearStack(pos.x, pos.z);
    this.btn.hold.classList.toggle('hot', inReach);
    const lbl = s.carry ? (inReach ? 'Đặt ống' : 'Đang vác') : (inReach ? 'Nhấc ống' : 'Nhấc / Đặt');
    if (this.btn.hold.dataset.l !== lbl) { this.btn.hold.dataset.l = lbl; this.btn.hold.querySelector('.l').textContent = lbl; this.btn.hold.querySelector('.j').textContent = s.carry ? '置く' : '持つ'; }

    // foreman faces the player
    const fp = this.who.foreman.holder.position;
    this.who.foreman.yaw = Math.atan2(pos.x - fp.x, pos.z - fp.z);

    // third-person camera (showcase during the intro)
    const portrait = isPortrait();
    camera.fov = portrait ? 56 : 46; camera.updateProjectionMatrix();
    if (this.intro > 0) {
      this.camRig.to(this.site.showcase.pos, this.site.showcase.look, dt, 3);
    } else {
      // low over-the-back camera (art reference): swings behind the player while walking,
      // unless the player is dragging the view or steering sideways with the stick
      if (moving && !c.drag && Math.abs(c.joy.x) < 0.4) {
        const want = p.yaw + Math.PI;
        let dy = want - c.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        c.yaw += dy * Math.min(1, dt * 2.2);
      }
      // slightly raised and looking down past the player, so the yard 9 m below shows over the rail
      const dist = 4.6 * (portrait ? 1.1 : 1);
      const cp = Math.cos(c.pitch);
      this.camPos.set(pos.x + Math.sin(c.yaw) * dist * cp, pos.y + 1.45 + Math.sin(c.pitch) * dist, pos.z + Math.cos(c.yaw) * dist * cp);
      this.camLook.set(pos.x - Math.sin(c.yaw) * 2.2, pos.y + 0.75, pos.z - Math.cos(c.yaw) * 2.2);
      this.camRig.to(this.camPos, this.camLook, dt, 6);
    }
    this.hud();
  }

  events(list) {
    const s = this.st, who = this.who;
    for (const e of list) {
      if (e === 'pick') this.tip('置く (oku)', 'Vác sang giá bên phải. Đi bộ thôi, đừng chạy!', 4);
      else if (e === 'place') {
        this.site.setPlaced(s.count);
        this.overhead.say(who.foreman, 'よし、次！ — Tốt, bó tiếp!', 2);
        if (s.count < s.goal) this.tip('持つ (motsu)', 'Tốt lắm! Quay lại lấy bó tiếp theo', 3);
      } else if (e === 'drop-run' || e === 'drop-gust') {
        this.tmp.copy(who.player.holder.position); this.tmp.y += 1.3; this.site.dropAt(this.tmp);
        this.btn.run.classList.remove('on');
        if (e === 'drop-run') { this.overhead.say(who.foreman, '走るな！危ない！ — Đừng chạy! Nguy hiểm!', 4); this.tip('走るな！ 危ない！', '“Đừng chạy! Nguy hiểm!” — ống rơi mất, phải lấy lại từ đầu', 5); }
        else { this.overhead.say(who.foreman, '止まれって言っただろ！ — Đã bảo dừng lại mà!', 3); this.tip('止まれ！', '“Dừng lại!” — gió giật làm rơi ống', 4); }
      } else if (e === 'gust-start') show('sh-gust', true);
      else if (e === 'gust-end') show('sh-gust', false);
      else if (e === 'lose') this.lose();
      else if (e === 'win') this.win();
    }
  }

  lose() {
    this.paused = true;
    card(`<div class="big">😣</div><h2>Chưa đạt</h2><p>${esc(this.st.loseWhy)}</p><p>Đã xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}.</p>`, [
      { label: '🔁 Làm lại (🧠 −4)', on: () => { this.meta.onRetry && this.meta.onRetry(); this.stop(); this.start(this.opts, this.who, this.meta, this.onEnd); } },
      { label: 'Chịu thua, nhận phê bình', cls: 'ghost', on: () => this.finish({ f: fraction(this.st), done: this.st.count, fail: true }) },
    ]);
  }
  win() {
    this.paused = true;
    this.overhead.say(this.who.player, 'お疲れ様でした！', 3);
    card('<div class="big">✅</div><h2>Hết ca! <span class="jp">お疲れ様でした</span></h2>', [
      { label: 'Về thôi →', on: () => this.finish({ f: 1, done: this.st.count, fail: false }) },
    ]);
  }
}
