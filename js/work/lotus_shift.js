// Runs one lotus-root harvest shift (j3Lotus in docs/ORIGINAL_SPEC.md):
// Wade through the mud paddy at groundY = -0.14 (slowed by walk / rain), approach one of the 8
// yellow-ringed lotus spots within 2.3 m, and perform the 4 steps in order:
// 1. ⛏️ Đào (掘る) -> 2. 💦 Xịt nước (洗う) -> 3. 🪴 Nhổ (抜く) -> 4. 🧺 Nhặt (拾う).
import * as THREE from 'three';
import { LOTUS, STEPS, STEP_KEYS, createLotus, nearestSpot, act, step, lotusFraction } from '../core/lotus_rules.js';
import { LOTUS_FIELD } from '../gfx/lotus.js';
import { camera, isPortrait } from '../gfx/stage.js';
import { $, show, card, esc } from '../ui/ui.js';

export class LotusShift {
  constructor({ stage, controls, overhead, camRig }) {
    Object.assign(this, { stage, controls, overhead, camRig });
    this.dir = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.active = false;
    this.btn = {};
    this.mine = STEP_KEYS.map((k) => {
      const a = STEPS[k];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'act';
      b.dataset.id = a.id;
      b.innerHTML = `<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.action(a.id); });
      this.btn[a.id] = b;
      return b;
    });
    $('sh-quit').addEventListener('click', () => this.active && this.askQuit());
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      const k = { Digit1: 'dig', Space: 'dig', Digit2: 'wash', Digit3: 'pull', Digit4: 'collect' }[e.code];
      if (k) { e.preventDefault(); this.action(k); }
    });
  }

  /** opts from story.shiftOpts; who = { player, foreman }; meta = { unit, rankLabel, onRetry } */
  start(opts, who, meta, onEnd) {
    Object.assign(this, { opts, who, meta, onEnd });
    this.st = createLotus(opts);
    const P = who.player, F = who.foreman;
    P.unpinAll();
    P.holder.rotation.x = 0;
    P.bendTo = 0;
    P.holder.position.set(LOTUS_FIELD.player.x, LOTUS.GROUND_Y, LOTUS_FIELD.player.z);
    P.yaw = LOTUS_FIELD.player.yaw;
    P.play('idle');

    if (F) {
      F.holder.position.set(LOTUS_FIELD.foreman.x, 0, LOTUS_FIELD.foreman.z);
      F.yaw = LOTUS_FIELD.foreman.yaw;
      F.play('idle');
    }

    const box = $('acts');
    if (!this.saved) this.saved = [...box.children];
    box.replaceChildren(...this.mine);
    show('dayhud', false);
    show('shifthud');
    show('sh-gust', false);
    show('joy', true);
    $('sh-place').querySelector('span').textContent = 'Ruộng sen 霞ヶ浦 · Ibaraki';
    $('sh-rank').textContent = meta.rankLabel;

    this.stage.setWeather({ rain: !!opts.rain, cold: (opts.walk || 1) < 1 && !opts.rain, pm: !!opts.hard });
    this.stage.setCollected(0);
    this.stage.setSpray(false);
    this.stage.syncSpots(this.st.spots, nearestSpot(this.st, P.holder.position.x, P.holder.position.z));

    this.controls.reset({ yaw: 0.15, pitch: 0.42, groundY: LOTUS.GROUND_Y, yawLimit: [-Infinity, Infinity] });
    this.controls.enabled = true;
    this.controls.target = null;
    this.controls.onTap = null;

    this.intro = 2.2;
    this.active = true;
    this.paused = false;
    this.endT = -1;
    this.tip('掘る → 洗う → 抜く → 拾う', 'Lại gần vòng vàng, làm đúng 4 bước: Đào → Xịt nước → Nhổ → Nhặt', 6.5);
    if (F) {
      const line = opts.jp
        ? `${opts.jp.replace(/[「」]/g, '')} — ${opts.vi || 'Làm đúng thứ tự 4 bước nhé!'}`
        : '順番通りにね！折らないように！ — Làm đúng thứ tự nhé, cẩn thận kẻo gãy củ!';
      this.overhead.say(F, line, 5);
    }
    this.camRig.init = false;
    this.hud();
  }

  stop() {
    this.active = false;
    this.controls.enabled = false;
    this.stage.setSpray(false);
    if (this.saved) { $('acts').replaceChildren(...this.saved); this.saved = null; }
    for (const k of STEP_KEYS) this.btn[k].classList.remove('hot');
    show('shifthud', false);
    show('sh-tip', false);
    if (this.who && this.who.player) {
      this.who.player.bendTo = 0;
      this.who.player.holder.position.y = 0;
    }
  }

  tip(jp, vi, sec = 5.5) {
    const t = $('sh-tip');
    t.querySelector('b').textContent = jp;
    t.querySelector('span').textContent = vi;
    t.hidden = false;
    clearTimeout(this.tipT);
    this.tipT = setTimeout(() => { t.hidden = true; }, sec * 1000);
  }

  hud() {
    const s = this.st, pos = this.who.player.holder.position;
    let txt = `🪷 ${s.count}/${s.goal} ${this.meta.unit}`;
    if (s.limit) txt += ` · ⏱ ${Math.ceil(s.time)}s`;
    if (s.maxMiss) txt += ` · ❌ ${s.miss}/${s.maxMiss}`;
    else if (s.miss) txt += ` · ❌ ${s.miss}`;
    const g = $('sh-goal');
    if (g.textContent !== txt) g.textContent = txt;
    g.classList.toggle('warn', (s.limit && s.time <= 10) || !!(s.maxMiss && s.miss >= s.maxMiss));

    const near = nearestSpot(s, pos.x, pos.z);
    const wantId = near && s.busy <= 0 ? STEP_KEYS[near.state] : null;
    for (const k of STEP_KEYS) {
      this.btn[k].classList.toggle('hot', k === wantId);
    }
  }

  action(id) {
    if (!this.active || this.paused || this.intro > 0 || this.st.over) return;
    const s = this.st, P = this.who.player, F = this.who.foreman, pos = P.holder.position;
    const nearBefore = nearestSpot(s, pos.x, pos.z);
    const r = act(s, id, pos.x, pos.z);
    if (r === 'busy') return;
    if (r === 'far') {
      this.tip('もっと近くに！', 'Lại gần gốc sen có vòng vàng đã', 2.5);
      return;
    }
    if (r === 'bad') {
      const wantKey = STEP_KEYS[nearBefore ? nearBefore.state : 0];
      const want = STEPS[wantKey];
      this.tip(want.tipJp, `Sai thứ tự! Bước này phải: ${want.vi}`, 4);
      if (F) this.overhead.say(F, `${want.jp}が先だよ！ — Phải ${want.label.toLowerCase()} trước đã!`, 2.5);
      if (s.result === 'lose') this.lose();
      this.hud();
      return;
    }
    if (r === 'good') {
      const sp = s.spots[s.busySpot];
      this.controls.target = null;
      P.yaw = Math.atan2(sp.x - pos.x, sp.z - pos.z);
      P.bendTo = id === 'wash' ? 0.35 : 0.65;
      const stp = STEPS[id];
      this.overhead.say(P, `${stp.jp}！`, 1.1);
      if (sp.state < 4) {
        const next = STEPS[STEP_KEYS[sp.state]];
        this.tip(stp.tipJp, `${stp.vi} — tiếp theo: ${next.icon} ${next.label}`, 3.2);
      } else {
        this.stage.setCollected(s.count);
        this.overhead.say(P, `蓮根！(${s.count}/${s.goal})`, 2);
        if (F) {
          this.overhead.say(
            F,
            s.count >= s.goal ? 'よし、終わり！ — Tốt lắm, đủ số củ rồi!' : 'いい蓮根だ！ — Củ sen đẹp đấy!',
            2.5,
          );
        }
        this.tip('よし、一本！', `Đào được 1 củ sen (${s.count}/${s.goal})!`, 3.5);
        if (s.result === 'win') this.endT = 0.6;
      }
      this.stage.syncSpots(s.spots, nearestSpot(s, pos.x, pos.z));
      this.hud();
    }
  }

  askQuit() {
    if (this.paused) return;
    this.paused = true;
    card(`<h2>Về sớm?</h2><p>Mới đào được ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}. Về sớm thì chỉ được tính phần đã làm.</p>`, [
      { label: 'Làm tiếp', on: () => { this.paused = false; } },
      { label: 'Về sớm', cls: 'ghost', on: () => this.finish({ f: lotusFraction(this.st), done: this.st.count, fail: this.opts.hard }) },
    ]);
  }
  finish(r) { this.stop(); this.onEnd(r); }
  lose() {
    this.paused = true;
    card(`<div class="big">😣</div><h2>Chưa đạt</h2><p>${esc(this.st.loseWhy)}</p><p>Đã đào ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}.</p>`, [
      { label: '🔁 Làm lại (🧠 −4)', on: () => { this.meta.onRetry && this.meta.onRetry(); this.stop(); this.start(this.opts, this.who, this.meta, this.onEnd); } },
      { label: 'Chịu thua, nhận phê bình', cls: 'ghost', on: () => this.finish({ f: lotusFraction(this.st), done: this.st.count, fail: true }) },
    ]);
  }
  win() {
    this.paused = true;
    this.overhead.say(this.who.player, 'お疲れ様でした！', 3);
    card('<div class="big">✅</div><h2>Hết ca! <span class="jp">お疲れ様でした</span></h2><p>Những củ sen nguyên vẹn đã được xếp gọn vào giỏ trên bờ.</p>', [
      { label: 'Về thôi →', on: () => this.finish({ f: 1, done: this.st.count, fail: false }) },
    ]);
  }

  update(dt) {
    if (!this.active) return;
    const s = this.st, P = this.who.player, pos = P.holder.position, c = this.controls;
    const portrait = isPortrait();
    let moving = false;

    if (!this.paused) {
      if (this.intro > 0) this.intro -= dt;
      else {
        const ev = step(s, dt);
        if (ev.includes('ready')) P.bendTo = 0;
        if (ev.includes('warn10')) this.tip('あと10秒！', 'Còn 10 giây!', 3);
        if (ev.includes('lose')) this.lose();

        if (s.busy <= 0 && !s.over) {
          let mag = c.input(this.dir);
          if (mag < 0.05 && c.target) {
            this.dir.set(c.target.x - pos.x, 0, c.target.z - pos.z);
            const d = this.dir.length();
            if (d < 0.14) { c.target = null; mag = 0; }
            else { this.dir.multiplyScalar(1 / d); mag = 1; }
          } else if (mag >= 0.05) {
            this.dir.multiplyScalar(1 / Math.max(mag, 1e-4));
          }
          if (mag >= 0.05) {
            moving = true;
            const speed = LOTUS.WALK * (s.walk || 1) * (s.rain ? 0.92 : 1) * mag * dt;
            const B = LOTUS.BOUNDS;
            pos.x = THREE.MathUtils.clamp(pos.x + this.dir.x * speed, B.x0, B.x1);
            pos.z = THREE.MathUtils.clamp(pos.z + this.dir.z * speed, B.z0, B.z1);
            pos.y = LOTUS.GROUND_Y;
            let dy = Math.atan2(this.dir.x, this.dir.z) - P.yaw;
            dy = Math.atan2(Math.sin(dy), Math.cos(dy));
            P.yaw += dy * Math.min(1, dt * 10);
          }
        }
      }

      // Water spray particles during 'wash'
      if (s.busy > 0 && s.busyStep === 'wash' && s.busySpot >= 0) {
        const sp = s.spots[s.busySpot];
        this.stage.setSpray(true, pos, sp.x, sp.z, dt);
      } else {
        this.stage.setSpray(false);
      }

      this.stage.syncSpots(s.spots, nearestSpot(s, pos.x, pos.z));
    } else {
      this.stage.setSpray(false);
    }

    if (this.endT >= 0 && !this.paused) {
      this.endT -= dt;
      if (this.endT < 0) this.win();
    }

    P.play(moving ? 'walk' : 'idle');

    // Camera: showcase overview during intro, then follow player over the lotus paddy
    camera.fov = portrait ? 56 : 46;
    camera.updateProjectionMatrix();
    if (this.intro > 0) {
      this.camRig.to(this.stage.showcase.pos, this.stage.showcase.look, dt, 3);
    } else {
      if (moving && !c.drag && Math.abs(c.joy.x) < 0.4) {
        let dy = P.yaw + Math.PI - c.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        c.yaw += dy * Math.min(1, dt * 1.6);
      }
      const dist = 5.4 * (portrait ? 1.16 : 1), cp = Math.cos(c.pitch);
      this.camPos.set(
        pos.x + Math.sin(c.yaw) * dist * cp,
        pos.y + 1.55 + Math.sin(c.pitch) * dist,
        pos.z + Math.cos(c.yaw) * dist * cp,
      );
      this.camLook.set(pos.x - Math.sin(c.yaw) * 1.8, pos.y + 0.9, pos.z - Math.cos(c.yaw) * 1.8);
      this.camRig.to(this.camPos, this.camLook, dt, 6);
    }
    this.hud();
  }
}
