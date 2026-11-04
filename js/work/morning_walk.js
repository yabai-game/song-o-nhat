// Morning before work: wake up in the dorm, walk out, walk along the street to the site gate.
// Care home job: walk to the station at the east end of the street, wait on the platform behind the
// yellow line, ride the train, then walk into the care home and greet the nurse.
// Rules and stat effects live in core/morning.js; this module drives the 3D scenes and the HUD.
import * as THREE from 'three';
import { MORNING, createMorning, clock, wake, tick, act, leaveRoom, arrive, toPlatform, board, alight } from '../core/morning.js';
import { DORM } from '../gfx/dorm.js';
import { ROUTE } from '../gfx/site.js';
import { STATION } from '../gfx/station.js';
import { CARE_ROOM } from '../gfx/care.js';
import { camera, isPortrait } from '../gfx/stage.js';
import { $, show, card, esc, deltaChips, deltaText, toast } from '../ui/ui.js';

const BUTTONS = [
  { id: 'wake', icon: '⏰', label: 'Dậy ngay', jp: '起きる', main: true },
  { id: 'snooze', icon: '😴', label: 'Ngủ thêm 10 phút', jp: 'あと10分' },
  { id: 'eat', icon: '🍙', label: 'Ăn sáng', jp: '朝ご飯' },
  { id: 'out', icon: '🚪', label: 'Ra ngoài', jp: '行ってきます', main: true },
  { id: 'drink', icon: '🥤', label: 'Mua nước', jp: '自販機' },
  { id: 'greet', icon: '🙋', label: 'Chào', jp: 'おはよう' },
  { id: 'run', icon: '🏃', label: 'Chạy', jp: '走る' },
  { id: 'board', icon: '🚃', label: 'Lên tàu', jp: '乗る', main: true },
];
const SHOW = { wake: ['wake', 'snooze'], room: ['out', 'eat'], street: ['greet', 'drink', 'run'], platform: ['board'], ride: [], walkin: ['greet'] };
// where the nurse waits for the morning greeting, just inside the dining room
const NURSE_AT = { x: -1.4, z: 2.6 };
const WALK = 3.0, RUN_MUL = 1.6, NEAR = 1.7;

export class MorningWalk {
  constructor({ controls, overhead, camRig }) {
    Object.assign(this, { controls, overhead, camRig });
    this.dir = new THREE.Vector3(); this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3();
    this.active = false; this.running = false;
    this.btn = {}; this.mine = [];
    for (const a of BUTTONS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'act' + (a.main ? ' main' : ''); b.dataset.id = a.id;
      b.innerHTML = `<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.action(a.id); });
      this.btn[a.id] = b; this.mine.push(b);
    }
    this.fade = document.createElement('div'); this.fade.className = 'fade'; $('app').appendChild(this.fade);
    $('sh-quit').addEventListener('click', () => this.active && this.askSkip());
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      const ph = this.st.phase;
      if (e.code === 'Space' || e.code === 'Digit1') { e.preventDefault(); this.action(ph === 'wake' ? 'wake' : ph === 'room' ? (this.near(DORM.table) ? 'eat' : 'out') : ph === 'platform' ? 'board' : ph === 'walkin' ? 'greet' : this.nearV() ? 'drink' : 'greet'); }
      if (e.code === 'Digit2' || e.code === 'ShiftLeft') this.action(this.st.phase === 'wake' ? 'snooze' : 'run');
    });
  }

  /** stages = { dorm, site }; who = { player, suzuki, hung }; setStage(id) switches the rendered scene */
  /** commute: 'walk' (street to the site gate) or 'train' (dorm → station → care home, 22 min) */
  start({ S, stages, who, setStage, dayLabel, onEnd, commute = 'walk' }) {
    Object.assign(this, { S, stages, who, setStage, onEnd, commute });
    this.st = createMorning();
    this.active = true; this.paused = false; this.running = false; this.rise = -1; this.busy = 0; this.bestD = Infinity; this.stuckT = 0;
    this.platT = 0; this.rideT = -1; this.boarding = false; this.warned = false; this.greetT = -1; this.pendingGreet = false;
    // swap the shift buttons for the morning ones
    const box = $('acts'); this.saved = [...box.children]; box.replaceChildren(...this.mine);
    show('shifthud'); show('sh-gust', false);
    $('sh-rank').textContent = dayLabel;
    this.enterRoom();
  }
  stop() {
    this.active = false; this.controls.enabled = false;
    const P = this.who.player; P.holder.rotation.x = 0; P.holder.visible = true;
    if (this.who.hung) this.who.hung.holder.visible = true;
    if (this.stages.station) this.stages.station.sendTrain('reset');
    $('acts').replaceChildren(...this.saved);
    show('shifthud', false); show('sh-tip', false);
    this.btn.run.classList.remove('on');
  }

  tip(jp, vi, sec = 6) {
    const t = $('sh-tip'); t.querySelector('b').textContent = jp; t.querySelector('span').textContent = vi;
    t.hidden = false; clearTimeout(this.tipT); this.tipT = setTimeout(() => { t.hidden = true; }, sec * 1000);
  }
  hud() {
    const s = this.st, g = $('sh-goal');
    const late = s.min > MORNING.CHOREI, close = s.min > MORNING.EARLY;
    const txt = `⏰ ${clock(s.min)} · 朝礼 ${clock(MORNING.CHOREI)}${late ? ' · muộn rồi!' : ''}`;
    if (g.textContent !== txt) g.textContent = txt;
    g.classList.toggle('warn', close);
    for (const a of BUTTONS) this.btn[a.id].hidden = !SHOW[s.phase].includes(a.id);
    if (s.phase === 'room') {
      this.btn.eat.disabled = s.ate;
      this.btn.eat.classList.toggle('hot', !s.ate && this.near(DORM.table, 1.4));
      this.btn.out.classList.toggle('hot', this.near(DORM.door));
    } else if (s.phase === 'street') {
      this.btn.drink.disabled = s.drank;
      this.btn.drink.classList.toggle('hot', !s.drank && this.nearV());
      this.btn.greet.classList.toggle('hot', !s.greeted && this.near(ROUTE.suzuki, 2.2));
    } else if (s.phase === 'platform') {
      const stopped = this.stages.station.trainState() === 'stopped';
      this.btn.board.disabled = !stopped;
      this.btn.board.classList.toggle('hot', stopped);
    } else if (s.phase === 'walkin') {
      this.btn.greet.classList.toggle('hot', this.near(NURSE_AT, 2.2));
    }
  }
  near(pt, r = NEAR) { const p = this.who.player.holder.position; return Math.hypot(p.x - pt.x, p.z - pt.z) < r; }
  nearV() { return this.near(ROUTE.vending, 1.9); }

  fadeTo(fn) {
    this.paused = true; this.fade.classList.add('on');
    setTimeout(() => { fn(); this.fade.classList.remove('on'); this.paused = false; }, 450);
  }

  // ---- phase 1: the dorm room ----
  enterRoom() {
    const P = this.who.player;
    this.setStage('dorm');
    this.stages.dorm.setTime('day'); this.stages.dorm.onigiri.visible = true;
    P.unpinAll(); if (P.helmet) P.helmet.visible = false;
    P.look(this.S.look.colors);
    // lying on the futon, face up, head towards the back wall
    P.yaw = 0; P.play('idle'); P.holder.rotation.x = -Math.PI / 2;
    P.holder.position.set(DORM.bed.x, 0.2, DORM.bed.z + 0.85);
    this.controls.reset({ yaw: 0, pitch: 0.55, groundY: 0, yawLimit: [-0.7, 0.7] });
    this.controls.enabled = false;
    $('sh-place').querySelector('span').textContent = 'Ký túc xá さくら寮';
    this.tip('ピピピ… 6:30', 'Chuông báo thức! Dậy luôn hay ngủ thêm 10 phút?', 30);
    this.overhead.say(P, 'ピピピ…！', 3);
    this.hud();
    this.camRig.init = false;
  }
  getUp() {
    // stand up pivoting around the hips (0.9 s)
    this.rise = 0;
    show('sh-tip', false);
  }

  // ---- phase 2: the street to the site ----
  enterStreet() {
    const P = this.who.player, site = this.stages.site;
    this.setStage('site');
    site.setWeather({}); site.setTime('day'); site.ring.visible = false;
    P.look({ ...this.S.look.colors, top: '#1f3148', bottom: '#1c2c42' }); // dressed for work
    P.holder.rotation.x = 0;
    P.holder.position.set(ROUTE.start.x, 0, ROUTE.start.z); P.yaw = Math.PI / 2; P.play('idle');
    const { suzuki, hung } = this.who, train = this.commute === 'train';
    suzuki.holder.position.set(ROUTE.suzuki.x, 0, ROUTE.suzuki.z + 0.6); suzuki.yaw = Math.PI; suzuki.play('idle');
    hung.holder.position.set(ROUTE.hung.x, 0, ROUTE.hung.z); hung.yaw = -Math.PI / 2; hung.play('idle');
    if (hung.helmet) hung.helmet.visible = true;
    hung.holder.visible = !train; // Hùng works at the site, not on the way to the station
    this.controls.reset({ yaw: -Math.PI / 2, pitch: 0.3, groundY: 0, yawLimit: [-Infinity, Infinity] });
    this.controls.enabled = true;
    this.controls.onTap = null;
    if (train) {
      $('sh-place').querySelector('span').textContent = 'Đường ra ga さくら駅';
      this.tip('駅はあっち', 'Đi bộ tới biển 🚉 さくら駅 ở cuối phố, đi tàu tới viện trước 7:45 (朝礼)', 5);
    } else {
      $('sh-place').querySelector('span').textContent = 'Đường tới công trường';
      this.tip('行ってきます！', 'Đi bộ tới cổng công trường trước 7:45 (họp đầu ca 朝礼)', 5);
    }
    this.camRig.init = false;
  }

  // ---- care home commute, phase 3: the platform of さくら駅 ----
  enterPlatform() {
    const P = this.who.player, stn = this.stages.station;
    this.setStage('station'); stn.sendTrain('reset');
    P.holder.position.set(STATION.start.x, STATION.floor, STATION.start.z); P.yaw = STATION.start.yaw; P.play('idle');
    this.controls.reset({ yaw: -Math.PI / 2 + 0.5, pitch: 0.3, groundY: STATION.floor, yawLimit: [-Infinity, Infinity] }); // camera on the track side
    this.controls.enabled = true; this.controls.target = null;
    this.platT = 0; this.warned = false; this.boarding = false; this.gated = false;
    $('sh-place').querySelector('span').textContent = 'Ga さくら駅 · sân ga 1番線';
    this.tip('改札を通って', 'Qua cổng soát vé 改札, rồi đứng chờ ở vạch xanh 乗車位置 sau vạch vàng', 5);
    this.camRig.init = false;
  }
  // phase 4: the ride (the camera follows the train out of the station)
  ride() {
    const s = this.st, P = this.who.player;
    board(s); P.holder.visible = false; this.controls.enabled = false; this.controls.target = null;
    this.stages.station.sendTrain('leave'); this.rideT = 0;
    show('sh-tip', false);
    toast('🚃 電車で' + MORNING.TRAIN + '分', `Đi tàu ${MORNING.TRAIN} phút tới ga gần viện · ⏰ ${clock(s.min)}`);
  }
  // phase 5: into the care home, greet the nurse
  enterCare() {
    const s = this.st, P = this.who.player, N = this.who.nurse;
    alight(s); this.rideT = -1;
    this.setStage('care');
    P.holder.visible = true; P.holder.position.set(0.6, 0, CARE_ROOM.bounds.z1 - 0.2); P.yaw = Math.PI; P.play('idle');
    if (N) { this.stages.care.scene.add(N.holder); N.holder.position.set(NURSE_AT.x, 0, NURSE_AT.z); N.yaw = 0.5; N.play('idle'); }
    this.controls.reset({ yaw: 0.25, pitch: 0.36, groundY: 0, yawLimit: [-Infinity, Infinity] });
    this.controls.enabled = true;
    $('sh-place').querySelector('span').textContent = 'Viện dưỡng lão さくら苑';
    this.tip('おはようございます', 'Vào phòng ăn, chào chị Yamada trước giờ họp đầu ca', 5);
    this.camRig.init = false;
  }
  greetNurse() {
    const P = this.who.player, N = this.who.nurse;
    if (this.greetT >= 0) return;
    this.greetT = 0; this.busy = 1.6; P.bendTo = 0.45; setTimeout(() => { P.bendTo = 0; }, 700);
    if (N) {
      P.yaw = Math.atan2(N.holder.position.x - P.holder.position.x, N.holder.position.z - P.holder.position.z);
      N.yaw = Math.atan2(P.holder.position.x - N.holder.position.x, P.holder.position.z - N.holder.position.z);
      N.play('talk');
      setTimeout(() => this.active && this.overhead.say(N, 'おはよう！今日もよろしくね。 — Chào em! Hôm nay nhờ em nhé.', 3), 600);
    }
    this.overhead.say(P, 'おはようございます！', 2.2);
  }

  action(id) {
    if (!this.active || this.paused) return;
    if (this.rise >= 0 || (this.busy > 0 && id !== 'run')) return; // still getting up / eating / buying
    const S = this.S, s = this.st, P = this.who.player;
    if (id === 'wake' || id === 'snooze') {
      if (s.phase !== 'wake' || this.rise >= 0) return;
      const d = wake(S, s, id === 'snooze');
      toast(id === 'snooze' ? '😴 Ngủ thêm 10 phút…' : '🌅 おはよう！', `Đánh răng, rửa mặt, thay đồ · ${clock(s.min)}${d.length ? ' · 🧠 +2' : ''}`);
      this.getUp();
    } else if (id === 'eat') {
      if (!this.near(DORM.table, 1.4)) { this.controls.target = new THREE.Vector3(DORM.table.x - 1.0, 0, DORM.table.z); this.pendingEat = true; return; }
      const r = act(S, s, 'eat'); if (!r.ok) return;
      this.stages.dorm.onigiri.visible = false;
      this.busy = 1.2; P.bendTo = 0.5;
      this.overhead.say(P, 'いただきます！', 2.5);
      toast('🍙 Ăn sáng', `${deltaText(r.deltas)} · ⏰ ${clock(s.min)}`);
    } else if (id === 'out') {
      if (!this.near(DORM.door, 2.4)) { this.controls.target = new THREE.Vector3(DORM.door.x, 0, DORM.door.z); this.pendingOut = true; return; }
      this.overhead.say(P, '行ってきます！', 1.5);
      leaveRoom(s);
      this.fadeTo(() => this.enterStreet());
    } else if (id === 'drink') {
      if (!this.nearV()) { this.tip('自販機', 'Máy bán nước ở ngay cạnh cửa ký túc xá', 3); return; }
      const r = act(S, s, 'drink');
      if (!r.ok) { if (r.why === 'money') this.tip('お金が足りない', 'Không đủ tiền mua nước', 3); return; }
      this.busy = 0.8; P.yaw = Math.PI;
      this.overhead.say(P, 'ガコン！ 缶コーヒー', 2);
      toast('🥤 Cà phê lon', deltaText(r.deltas));
    } else if (id === 'board') {
      if (s.phase !== 'platform' || this.boarding || this.stages.station.trainState() !== 'stopped') return;
      this.boarding = true; this.controls.target = new THREE.Vector3(STATION.door.x, 0, STATION.door.z);
      this.overhead.say(P, '乗ります！', 1.2);
    } else if (id === 'greet' && s.phase === 'walkin') {
      if (!this.near(NURSE_AT, 2.2)) { this.controls.target = new THREE.Vector3(NURSE_AT.x + 0.9, 0, NURSE_AT.z + 0.6); this.pendingGreet = true; return; }
      this.greetNurse();
    } else if (id === 'greet') {
      const suz = this.who.suzuki;
      if (!this.st.greeted && this.near(ROUTE.suzuki, 2.6)) {
        const r = act(S, s, 'greet');
        P.yaw = Math.atan2(suz.holder.position.x - P.holder.position.x, suz.holder.position.z - P.holder.position.z);
        suz.yaw = Math.atan2(P.holder.position.x - suz.holder.position.x, P.holder.position.z - suz.holder.position.z);
        suz.play('talk'); setTimeout(() => this.active && suz.play('idle'), 2500);
        this.busy = 1.2; P.bendTo = 0.45; setTimeout(() => { P.bendTo = 0; }, 700);
        this.overhead.say(P, 'おはようございます！', 2.5);
        setTimeout(() => this.active && this.overhead.say(suz, 'おはよう！いってらっしゃい！ — Chào cháu! Đi làm vui nhé!', 3.5), 700);
        toast('🙋 Chào bà Suzuki', deltaText(r.deltas));
        this.tip('おはようございます', 'Chào hỏi hàng xóm mỗi sáng giúp bạn hòa nhập nhanh hơn', 4);
      } else this.overhead.say(P, 'おはようございます！', 2);
    } else if (id === 'run') {
      this.running = !this.running; this.btn.run.classList.toggle('on', this.running);
    }
  }

  askSkip() {
    if (this.paused) return;
    this.paused = true;
    card(`<h2>Bỏ qua buổi sáng?</h2><p>Đi thẳng tới ${this.commute === 'train' ? 'viện dưỡng lão' : 'công trường'}, đến vừa kịp giờ.</p>`, [
      { label: 'Đi tiếp', on: () => { this.paused = false; } },
      { label: 'Bỏ qua →', cls: 'ghost', on: () => { this.st.phase = 'street'; this.st.min = Math.min(this.st.min, MORNING.CHOREI - 3); this.finish(); } },
    ]);
  }

  finish() {
    const r = arrive(this.S, this.st), P = this.who.player;
    this.paused = true;
    const head = r.kind === 'early' ? '👍 Đến sớm 5 phút' : r.kind === 'ontime' ? '🙂 Vừa kịp giờ' : '😓 Đến muộn';
    const lesson = r.kind === 'late'
      ? 'Ở Nhật, “đúng giờ” nghĩa là có mặt trước giờ hẹn. Đến muộn họp đầu ca là cả đội phải chờ bạn.'
      : r.kind === 'early' ? '5分前行動 (gofun-mae kōdō): có mặt trước 5 phút — người Nhật rất quý điều này.' : 'Lần sau thử đến sớm hơn 5 phút nhé (5分前行動).';
    const hungLine = r.kind === 'late' ? '遅いぞ！みんな待ってる。 — Muộn rồi! Mọi người đang chờ.' : 'おはよう！今日も頑張ろう。 — Chào em! Hôm nay cố lên nhé.';
    const train = this.commute === 'train';
    if (!train) { this.overhead.say(this.who.hung, hungLine, 4); if (P.helmet) P.helmet.visible = true; }
    card(`<h2>${head}</h2><p>${train ? 'Bạn tới viện dưỡng lão' : 'Bạn tới cổng công trường'} lúc <b>${clock(r.min)}</b> · 朝礼 ${clock(MORNING.CHOREI)}.</p>
      <div class="deltas">${deltaChips(r.deltas) || '<span class="delta">—</span>'}</div>
      <p class="lesson">${esc(lesson)}</p>`, [
      { label: 'Vào họp đầu ca →', on: () => { this.stop(); this.onEnd(r); } },
    ]);
  }

  /** platform: the train comes in once the player waits at the mark (or after a while), never
   *  while they stand past the yellow line; boarding walks them to the doors. */
  platform(dt) {
    const stn = this.stages.station, P = this.who.player, pos = P.holder.position, state = stn.trainState();
    this.platT += dt;
    // through the ticket gates: the IC card beeps
    if (!this.gated && pos.x > STATION.gateX) { this.gated = true; this.overhead.say(P, 'ピッ♪', 1.2); }
    if (state === 'away' && !this.boarding && (this.near(STATION.mark, 1.3) || this.platT > 8)) {
      stn.sendTrain('arrive');
      this.tip('まもなく電車が参ります', 'Tàu sắp vào ga — đứng sau vạch vàng (黄色い線の内側)', 4);
    }
    if (state === 'in' && pos.z > STATION.line - 0.15) {
      pos.z = STATION.line - 0.35;
      if (!this.warned) { this.warned = true; this.tip('黄色い線の内側までお下がりください', 'Lùi vào sau vạch vàng! Tàu đang vào ga', 3.5); }
    }
    if (this.boarding && !this.controls.target) {
      if (Math.hypot(pos.x - STATION.door.x, pos.z - STATION.door.z) < 0.9) { this.boarding = false; this.ride(); }
      else this.controls.target = new THREE.Vector3(STATION.door.x, 0, STATION.door.z);
    }
  }

  update(dt) {
    if (!this.active) return;
    const s = this.st, P = this.who.player, pos = P.holder.position, c = this.controls;
    const portrait = isPortrait();
    // getting up from the futon
    if (this.rise >= 0) {
      this.rise = Math.min(1, this.rise + dt / 0.9);
      const k = this.rise * this.rise * (3 - 2 * this.rise), a = (1 - k) * Math.PI / 2, h = 0.55;
      const hipY = 0.2 + (h - 0.2) * k, hipZ = DORM.bed.z + 0.85 - h; // hip stays over the same spot
      P.holder.rotation.x = -a;
      P.holder.position.set(DORM.bed.x, hipY - h * Math.cos(a), hipZ + h * Math.sin(a));
      if (this.rise >= 1) {
        this.rise = -1; P.holder.rotation.x = 0; P.holder.position.y = 0; P.yaw = Math.PI / 2;
        this.controls.enabled = true;
        this.controls.onTap = (pt) => { if (Math.hypot(pt.x - DORM.door.x, pt.z - DORM.door.z) < 1) this.pendingOut = true; };
        this.tip('朝ご飯は？', 'Ăn sáng ở bàn (🍙) hoặc ra cửa đi làm luôn (🚪)', 5);
      }
    }
    let moving = false;
    if (!this.paused && s.phase !== 'wake' && this.rise < 0 && !s.over) {
      if (this.busy > 0) this.busy -= dt;
      else {
        P.bendTo = 0;
        let mag = c.input(this.dir);
        if (mag < 0.05 && c.target) {
          this.dir.set(c.target.x - pos.x, 0, c.target.z - pos.z);
          const d = this.dir.length();
          // give up on a tap target that cannot be reached (blocked): no progress for 0.4 s
          if (d < this.bestD - 0.02) { this.bestD = d; this.stuckT = 0; } else this.stuckT = (this.stuckT || 0) + dt;
          if (d < 0.1 || this.stuckT > 0.4) { c.target = null; mag = 0; this.bestD = Infinity; this.stuckT = 0; } else { this.dir.multiplyScalar(1 / d); mag = 1; }
        } else if (mag >= 0.05) { this.dir.multiplyScalar(1 / Math.max(mag, 1e-4)); this.bestD = Infinity; }
        if (!c.target) this.bestD = Infinity;
        if (mag >= 0.05) {
          moving = true;
          const room = s.phase === 'room', plat = s.phase === 'platform', inside = s.phase === 'walkin';
          const B = room ? DORM.bounds : plat ? STATION.bounds : inside ? CARE_ROOM.bounds : ROUTE.bounds;
          const blocks = room ? DORM.blocks : plat ? STATION.blocks : inside ? this.stages.care.blocks : ROUTE.blocks;
          const sp = WALK * (this.running && s.phase === 'street' ? RUN_MUL : 1) * (room ? 0.6 : inside ? 0.75 : 1) * mag * dt;
          pos.x += this.dir.x * sp; pos.z += this.dir.z * sp;
          for (const o of blocks) {
            const dx = pos.x - o.x, dz = pos.z - o.z, dd = Math.hypot(dx, dz), rr = o.r + 0.3;
            if (dd < rr && dd > 1e-4) { pos.x = o.x + dx / dd * rr; pos.z = o.z + dz / dd * rr; }
          }
          pos.x = THREE.MathUtils.clamp(pos.x, B.x0, B.x1); pos.z = THREE.MathUtils.clamp(pos.z, B.z0, B.z1);
          let dy = Math.atan2(this.dir.x, this.dir.z) - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          P.yaw += dy * Math.min(1, dt * 12);
          tick(s, dt);
        }
      }
      if (this.pendingOut && !c.target && this.near(DORM.door, 2.4)) { this.pendingOut = false; this.action('out'); }
      if (this.pendingEat && !c.target) { this.pendingEat = false; if (this.near(DORM.table, 1.4)) { P.yaw = Math.PI / 2; this.action('eat'); } }
      if (s.phase === 'street' && this.commute !== 'train' && this.near(ROUTE.gate, 1.9)) this.finish();
      if (s.phase === 'street' && this.commute === 'train' && this.near(ROUTE.station, 1.6)) { toPlatform(s); this.fadeTo(() => this.enterPlatform()); }
      if (s.phase === 'platform') this.platform(dt);
      if (this.pendingGreet && !c.target) { this.pendingGreet = false; if (this.near(NURSE_AT, 2.2)) this.greetNurse(); }
      if (s.phase === 'walkin' && this.greetT < 0 && this.near(NURSE_AT, 1.3)) this.greetNurse();
    }
    if (this.greetT >= 0 && !this.paused) { this.greetT += dt; if (this.greetT > 2.4 && !s.over) { this.greetT = -1; this.finish(); } }
    if (this.rideT >= 0 && !this.paused) { this.rideT += dt; if (this.rideT > 3.4) { this.rideT = -1; this.fadeTo(() => this.enterCare()); } }
    if (this.rise < 0 && s.phase !== 'wake' && s.phase !== 'ride') P.play(moving ? (this.running && s.phase === 'street' ? 'run' : 'walk') : 'idle');

    // camera
    camera.fov = portrait ? 56 : 46; camera.updateProjectionMatrix();
    if (s.phase === 'wake' || s.phase === 'room') {
      // diorama view over the open front wall, gently following the player
      const fx = pos.x * 0.5, fz = THREE.MathUtils.clamp(pos.z, -1, 1.4);
      this.camPos.set(fx, 2.9 * (portrait ? 1.25 : 1), fz + (portrait ? 4.9 : 3.9));
      this.camLook.set(fx * 1.2, 0.55, fz - 0.7);
      if (s.phase === 'wake' && this.rise < 0) { this.camPos.set(DORM.bed.x + 0.4, 2.3, DORM.bed.z + 2.6 + (portrait ? 0.8 : 0)); this.camLook.set(DORM.bed.x, 0.1, DORM.bed.z - 0.1); }
      this.camRig.to(this.camPos, this.camLook, dt, 4);
    } else if (s.phase === 'platform') {
      // down the platform from behind the player, between the canopy columns (left) and the track
      // (right), below the canopy; the joystick follows this view (controls.yaw = camera heading)
      this.camPos.set(pos.x - 5.0, STATION.floor + 2.0, THREE.MathUtils.clamp(pos.z + 0.4, 3.3, 5.3));
      this.camLook.set(pos.x + 2, STATION.floor + 0.9, pos.z + 0.6);
      c.yaw = Math.atan2(this.camPos.x - this.camLook.x, this.camPos.z - this.camLook.z);
      this.camRig.to(this.camPos, this.camLook, dt, 5);
    } else if (s.phase === 'ride') {
      // watch the train pull out of the station
      const tx = Math.max(this.stages.station.trainX() - 4, -40);
      this.camPos.set(tx + 14, 4.6, STATION.trackZ + 13); this.camLook.set(tx, 1.8, STATION.trackZ);
      this.camRig.to(this.camPos, this.camLook, dt, 3);
    } else {
      if (moving && !c.drag && Math.abs(c.joy.x) < 0.4) {
        let dy = P.yaw + Math.PI - c.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        c.yaw += dy * Math.min(1, dt * 2);
      }
      const dist = 4.6 * (portrait ? 1.15 : 1), cp = Math.cos(c.pitch);
      this.camPos.set(pos.x + Math.sin(c.yaw) * dist * cp, pos.y + 1.5 + Math.sin(c.pitch) * dist, pos.z + Math.cos(c.yaw) * dist * cp);
      this.camLook.set(pos.x - Math.sin(c.yaw) * 2, pos.y + 1.0, pos.z - Math.cos(c.yaw) * 2);
      this.camRig.to(this.camPos, this.camLook, dt, 6);
    }
    this.hud();
  }
}
