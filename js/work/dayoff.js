// Sunday day off (日曜日):
// Walk out from the dorm onto the sunny street (no 朝礼 deadline) to the ⛩ さくら神社 → signpost,
// enter Sakura Shrine, interact with the 3 yellow-ringed spots (お参り 二礼二拍手一礼, おみくじ 100¥,
// お花見 on the blue tarp with Hùng & Hoa), then tap 🏠 Về nhà -> night street -> dorm -> sleep -> weekEnd().
import * as THREE from 'three';
import {
  PRAY_SEQ, PRAY_STEPS, createDayOff, tickDayOff, prayStep, drawOmikuji, tieOmikujiKyo, doHanami,
} from '../core/dayoff_rules.js';
import { clock } from '../core/morning.js';
import { save } from '../core/state.js';
import { DORM } from '../gfx/dorm.js';
import { ROUTE } from '../gfx/site.js';
import { SHRINE } from '../gfx/shrine.js';
import { camera, isPortrait } from '../gfx/stage.js';
import { $, show, card, esc, deltaChips, deltaText, toast } from '../ui/ui.js';

const WALK = 3.0, RUN_MUL = 1.6;

function seatOnTarp(ch, x, z, yaw) {
  if (!ch) return;
  ch.unpinAll();
  ch.holder.rotation.x = 0;
  ch.sit = 1;
  ch.yaw = yaw;
  ch.play('idle');
  ch.holder.position.set(x, 0, z);
  if (ch.hipH === undefined) {
    ch.holder.updateMatrixWorld(true);
    const hips = ch.root.getObjectByProperty('isBone', true);
    const v = new THREE.Vector3();
    (ch.hips || hips).getWorldPosition(v);
    ch.hipH = v.y - ch.holder.position.y;
  }
  ch.holder.position.y = Math.max(-0.42, 0.14 - ch.hipH);
}

function standUp(ch) {
  if (!ch) return;
  ch.sit = 0;
  ch.bendTo = 0;
  ch.reachTo = 0;
  ch.wristSway = 0;
  ch.holder.rotation.x = 0;
  ch.holder.position.y = 0;
}

const BUTTON_DEFS = [
  { id: 'out',     icon: '🚪', label: 'Ra phố',    jp: 'お出かけ', main: true },
  { id: 'shrine',  icon: '⛩️', label: 'Tới đền',   jp: 'さくら神社', main: true },
  { id: 'coin',    icon: '💴', label: 'Bỏ tiền',   jp: 'お賽銭 5¥', main: true },
  { id: 'bow',     icon: '🙇', label: 'Cúi chào',  jp: '礼' },
  { id: 'clap',    icon: '👏', label: 'Vỗ tay',    jp: '拍手' },
  { id: 'omikuji', icon: '🎋', label: 'Rút quẻ',   jp: 'おみくじ', main: true },
  { id: 'hanami',  icon: '🌸', label: 'Ngắm hoa',  jp: 'お花見', main: true },
  { id: 'home',    icon: '🏠', label: 'Về nhà',    jp: '帰る' },
  { id: 'run',     icon: '🏃', label: 'Chạy',      jp: '走る' },
  { id: 'sleep',   icon: '🛏️', label: 'Đi ngủ',    jp: 'おやすみ', main: true },
];

export class DayOff {
  constructor({ controls, overhead, camRig }) {
    Object.assign(this, { controls, overhead, camRig });
    this.dir = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.active = false;
    this.paused = false;
    this.running = false;
    this.st = null;
    this.poseT = 0;
    this.lie = -1;
    this.toFuton = false;
    this.toShrineSign = false;
    this.bestD = Infinity;
    this.stuckT = 0;

    this.btn = {};
    this.mine = BUTTON_DEFS.map((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'act' + (a.main ? ' main' : '');
      b.dataset.id = a.id;
      b.innerHTML = `<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.action(a.id); });
      this.btn[a.id] = b;
      return b;
    });

    this.fade = document.createElement('div');
    this.fade.className = 'fade';
    $('app').appendChild(this.fade);

    $('sh-quit').addEventListener('click', () => this.active && this.skip());
    addEventListener('keydown', (e) => {
      if (!this.active || this.paused) return;
      const ph = this.st?.phase;
      if (ph === 'shrine') {
        const spot = this.nearSpot();
        if (spot === 'pray' && !this.st.prayed) {
          if (e.code === 'Digit1' || e.code === 'Space') { e.preventDefault(); this.action('coin'); }
          else if (e.code === 'Digit2') { e.preventDefault(); this.action('bow'); }
          else if (e.code === 'Digit3') { e.preventDefault(); this.action('clap'); }
          return;
        }
        if (spot === 'omikuji' && !this.st.omikuji && (e.code === 'Digit1' || e.code === 'Space')) {
          e.preventDefault(); this.action('omikuji'); return;
        }
        if (spot === 'hanami' && !this.st.hanami && (e.code === 'Digit1' || e.code === 'Space')) {
          e.preventDefault(); this.action('hanami'); return;
        }
      }
      if (e.code === 'Space' || e.code === 'Digit1') {
        e.preventDefault();
        if (ph === 'roomDay') this.action('out');
        else if (ph === 'streetDay') this.action('shrine');
        else if (ph === 'shrine') this.action('home');
        else if (ph === 'roomNight') this.action('sleep');
      }
    });
  }

  start({ S, stages, who, setStage, storage = null, demo = false, onEnd }) {
    Object.assign(this, { S, stages, who, setStage, storage, demo: !!demo, onEnd });
    this.st = createDayOff(S);
    this.S.flags = this.S.flags || {};
    this.S.flags.dayOff = { ...(this.S.flags.dayOff || {}), started: true };
    if (this.storage) save(this.S, this.storage);

    const box = $('acts');
    if (!this.saved) this.saved = [...box.children];
    box.replaceChildren(...this.mine);
    show('dayhud', false);
    show('shifthud');
    show('sh-gust', false);
    $('sh-rank').textContent = demo ? '🎮 Thử nhanh · 🎌 Ngày nghỉ ở đền' : '🎌 Chủ nhật · 日曜日 (Ngày nghỉ)';

    this.active = true;
    this.paused = false;
    this.running = false;
    this.poseT = 0;
    this.lie = -1;
    this.toFuton = false;
    this.toShrineSign = false;
    this.btn.run.classList.remove('on');
    if (this.stages.shrine) this.stages.shrine.setKyoTied(false);

    if (demo) {
      this.enterShrine();
    } else {
      this.enterRoomDay();
    }
  }

  _hide() {
    this.active = false;
    this.controls.enabled = false;
    standUp(this.who?.player);
    standUp(this.who?.hung);
    standUp(this.who?.hoa);
    if (this.saved) {
      $('acts').replaceChildren(...this.saved);
      this.saved = null;
    }
    show('shifthud', false);
    show('sh-tip', false);
  }

  fadeTo(fn) {
    this.paused = true;
    this.fade.classList.add('on');
    setTimeout(() => {
      fn();
      this.fade.classList.remove('on');
      this.paused = false;
    }, 420);
  }

  tip(jp, vi, sec = 6) {
    const t = $('sh-tip');
    t.querySelector('b').textContent = jp;
    t.querySelector('span').textContent = vi;
    t.hidden = false;
    clearTimeout(this.tipT);
    if (sec > 0) this.tipT = setTimeout(() => { t.hidden = true; }, sec * 1000);
  }

  enterRoomDay() {
    this.st.phase = 'roomDay';
    const P = this.who.player;
    this.setStage('dorm');
    this.stages.dorm.setTime('day');
    this.stages.dorm.onigiri.visible = false;
    standUp(P);
    P.look(this.S.look.colors);
    P.holder.position.set(DORM.bed.x, 0, DORM.bed.z + 0.35);
    P.yaw = 0;
    P.play('idle');
    this.controls.reset({ yaw: 0, pitch: 0.55, groundY: 0, yawLimit: [-0.7, 0.7] });
    this.controls.enabled = true;
    this.controls.target = null;
    $('sh-place').querySelector('span').textContent = 'Ký túc xá さくら寮 · Chủ nhật';
    this.tip('日曜日 · Ngày nghỉ', 'Hôm nay được nghỉ! Bấm 🚪 Ra phố để đi dạo tới đền ⛩ さくら神社.', 6);
    this.camRig.init = false;
    this.hud();
  }

  enterStreetDay() {
    this.st.phase = 'streetDay';
    const P = this.who.player, site = this.stages.site;
    this.setStage('site');
    site.setWeather({});
    site.setTime('day');
    site.ring.visible = false;
    standUp(P);
    P.look(this.S.look.colors);
    P.holder.position.set(ROUTE.start.x, 0, ROUTE.start.z);
    P.yaw = Math.PI / 2;
    P.play('idle');
    this.controls.reset({ yaw: -Math.PI / 2, pitch: 0.3, groundY: 0, yawLimit: [-Infinity, Infinity] });
    this.controls.enabled = true;
    this.controls.target = null;
    $('sh-place').querySelector('span').textContent = 'Đường tới ⛩ さくら神社';
    this.tip('⛩ さくら神社 →', 'Đi dọc vỉa hè tới biển chỉ đường ⛩ さくら神社 → ở đầu phố (hoặc bấm ⛩️ Tới đền)', 6);
    this.camRig.init = false;
    this.hud();
  }

  enterShrine() {
    this.st.phase = 'shrine';
    const P = this.who.player, shrine = this.stages.shrine;
    this.setStage('shrine');
    standUp(P);
    P.look(this.S.look.colors);
    P.holder.position.set(SHRINE.start.x, 0, SHRINE.start.z);
    P.yaw = SHRINE.start.yaw;
    P.play('idle');

    if (this.who.hung) {
      this.stages.shrine.scene.add(this.who.hung.holder);
      if (this.who.hung.helmet) this.who.hung.helmet.visible = false;
      seatOnTarp(this.who.hung, SHRINE.seats.hung.x, SHRINE.seats.hung.z, SHRINE.seats.hung.yaw);
    }
    if (this.who.hoa) {
      this.stages.shrine.scene.add(this.who.hoa.holder);
      seatOnTarp(this.who.hoa, SHRINE.seats.hoa.x, SHRINE.seats.hoa.z, SHRINE.seats.hoa.yaw);
    }

    shrine.syncRings(this.st);
    this.controls.reset({ yaw: 0, pitch: 0.38, groundY: 0, yawLimit: [-Infinity, Infinity] });
    this.controls.enabled = true;
    this.controls.target = null;
    $('sh-place').querySelector('span').textContent = 'Đền さくら神社';
    this.tip('さくら神社', 'Bước vào 3 vòng vàng: 🙏 Đi lễ (二礼二拍手一礼) · 🎋 Rút quẻ (100¥) · 🌸 Ngắm hoa cùng anh Hùng & chị Hoa', 7);
    this.camRig.init = false;
    this.hud();
  }

  enterStreetNight() {
    this.st.phase = 'streetNight';
    if (this.st.min < 19 * 60) this.st.min = 19 * 60 + 30;
    const P = this.who.player, site = this.stages.site;
    standUp(this.who.hung);
    standUp(this.who.hoa);
    this.setStage('site');
    site.setWeather({});
    site.setTime('night');
    site.ring.visible = false;
    standUp(P);
    P.holder.position.set(ROUTE.shrine.x, 0, ROUTE.shrine.z);
    P.yaw = -Math.PI / 2;
    P.play('idle');
    this.controls.reset({ yaw: Math.PI / 2, pitch: 0.3, groundY: 0, yawLimit: [-Infinity, Infinity] });
    this.controls.enabled = true;
    this.controls.target = new THREE.Vector3(ROUTE.start.x, 0, ROUTE.start.z);
    $('sh-place').querySelector('span').textContent = 'Đường về ký túc xá さくら寮';
    this.tip('帰り道', 'Trời đã tối, đi bộ về ký túc xá nghỉ ngơi chuẩn bị cho tuần mới.', 5);
    this.camRig.init = false;
    this.hud();
  }

  enterRoomNight() {
    this.st.phase = 'roomNight';
    const P = this.who.player;
    this.setStage('dorm');
    this.stages.dorm.setTime('night');
    standUp(P);
    P.holder.position.set(DORM.door.x - 0.3, 0, DORM.door.z);
    P.yaw = -Math.PI / 2;
    P.play('idle');
    this.controls.reset({ yaw: 0, pitch: 0.55, groundY: 0, yawLimit: [-0.7, 0.7] });
    this.controls.enabled = true;
    this.controls.target = null;
    $('sh-place').querySelector('span').textContent = 'Ký túc xá さくら寮 · Tối Chủ nhật';
    this.tip('おやすみ', 'Ngày nghỉ thật vui! Bấm 🛏️ Đi ngủ để tổng kết tuần đầu tiên.', 6);
    this.camRig.init = false;
    this.hud();
  }

  nearSpot() {
    if (!this.st || this.st.phase !== 'shrine') return null;
    const p = this.who.player.holder.position;
    for (const [k, sp] of Object.entries(SHRINE.spots)) {
      if (Math.hypot(p.x - sp.x, p.z - sp.z) < sp.r) return k;
    }
    return null;
  }

  hud() {
    const st = this.st;
    if (!st) return;
    const ph = st.phase;
    const icon = st.min >= 18 * 60 + 30 ? '🌙' : '☀️';
    const statusParts = [
      `🙏 ${st.prayed ? '✓' : '—'}`,
      `🎋 ${st.omikuji || '—'}`,
      `🌸 ${st.hanami ? '✓' : '—'}`,
    ];
    const g = $('sh-goal');
    const txt = `${icon} ${clock(st.min)} · ${statusParts.join(' · ')}`;
    if (g.textContent !== txt) g.textContent = txt;

    const spot = this.nearSpot();
    const visibleIds = new Set();
    if (ph === 'roomDay') {
      visibleIds.add('out');
    } else if (ph === 'streetDay') {
      visibleIds.add('shrine');
      visibleIds.add('run');
    } else if (ph === 'shrine') {
      if (spot === 'pray' && !st.prayed) {
        visibleIds.add('coin');
        visibleIds.add('bow');
        visibleIds.add('clap');
        const want = PRAY_SEQ[st.prayIdx];
        const stepInfo = PRAY_STEPS[want];
        this.tip(
          '二礼二拍手一礼 · Đi lễ (5 ¥)',
          `Bước ${st.prayIdx + 1}/6: ${stepInfo.icon} ${stepInfo.hint} (Bỏ tiền → 2 Cúi → 2 Vỗ tay → 1 Cúi)`,
          0,
        );
      } else if (spot === 'omikuji' && !st.omikuji) {
        visibleIds.add('omikuji');
      } else if (spot === 'hanami' && !st.hanami) {
        visibleIds.add('hanami');
      }
      visibleIds.add('home');
    } else if (ph === 'streetNight') {
      visibleIds.add('run');
    } else if (ph === 'roomNight') {
      visibleIds.add('sleep');
    }

    for (const a of BUTTON_DEFS) {
      const b = this.btn[a.id];
      b.hidden = !visibleIds.has(a.id);
      if (a.id === 'coin' || a.id === 'bow' || a.id === 'clap') {
        b.classList.toggle('hot', visibleIds.has(a.id) && PRAY_SEQ[st.prayIdx] === a.id);
      } else if (a.id === 'omikuji' || a.id === 'hanami') {
        b.classList.toggle('hot', visibleIds.has(a.id));
      }
    }
  }

  action(id) {
    if (!this.active || this.paused || this.lie >= 0) return;
    const st = this.st, P = this.who.player;
    if (id === 'run') {
      this.running = !this.running;
      this.btn.run.classList.toggle('on', this.running);
      return;
    }
    if (id === 'out' && st.phase === 'roomDay') {
      this.fadeTo(() => this.enterStreetDay());
      return;
    }
    if (id === 'shrine' && st.phase === 'streetDay') {
      const pos = P.holder.position;
      if (Math.hypot(pos.x - ROUTE.shrine.x, pos.z - ROUTE.shrine.z) < 2.2) {
        this.fadeTo(() => this.enterShrine());
      } else {
        this.toShrineSign = true;
        this.controls.target = new THREE.Vector3(ROUTE.shrine.x, 0, ROUTE.shrine.z);
        this.tip('⛩ さくら神社 →', 'Đang đi bộ tới lối vào đền さくら神社…', 4);
      }
      return;
    }
    if ((id === 'coin' || id === 'bow' || id === 'clap') && st.phase === 'shrine') {
      this.doPrayAction(id);
      return;
    }
    if (id === 'omikuji' && st.phase === 'shrine') {
      this.doOmikujiAction();
      return;
    }
    if (id === 'hanami' && st.phase === 'shrine') {
      this.doHanamiAction();
      return;
    }
    if (id === 'home' && st.phase === 'shrine') {
      this.fadeTo(() => this.enterStreetNight());
      return;
    }
    if (id === 'sleep' && st.phase === 'roomNight') {
      show('sh-tip', false);
      this.controls.target = new THREE.Vector3(DORM.bed.x, 0, DORM.bed.z + 0.3);
      this.toFuton = true;
    }
  }

  doPrayAction(actId) {
    const P = this.who.player;
    P.yaw = Math.PI;
    // Animate pose for bow / clap / coin
    if (actId === 'bow') {
      P.bendTo = 0.95;
      P.reachTo = 0;
      this.poseT = 0.55;
    } else if (actId === 'clap') {
      P.bendTo = 0;
      P.reachTo = 0.6;
      this.poseT = 0.45;
    } else {
      P.reachTo = 0.65;
      this.poseT = 0.35;
    }

    const r = prayStep(this.st, actId, this.S);
    if (!r.ok) {
      if (r.reason === 'money') {
        toast('💴 Không đủ 5 ¥', 'Bạn cần 5 ¥ để bỏ vào hộp 賽銭箱.');
      } else if (r.reason === 'wrong_step') {
        this.overhead.say(P, `Nhầm thứ tự rồi! Phải là: ${r.hint}`, 2.6);
        toast('🙏 Sai thứ tự 二礼二拍手一礼', `Lẽ ra phải: ${r.hint}. Hãy làm lại từ đầu (không mất thêm 5 ¥).`);
      }
      this.hud();
      return;
    }

    if (r.done) {
      if (this.storage) save(this.S, this.storage);
      this.stages.shrine.syncRings(this.st);
      this.overhead.say(P, 'どうか健康で働けますように… — Mong luôn khỏe mạnh bình an!', 3.5);
      toast('⛩️ Đi lễ お参り hoàn tất!', `🎌 Văn hóa +${r.fx.culture} · 🧠 Tinh thần +${r.fx.mental}`);
      this.tip('お参り完了', 'Bạn đã hành lễ đúng phép 二礼二拍手一礼!', 4);
    } else {
      const label = actId === 'coin' ? 'チャリン♪ (5 ¥)' : actId === 'bow' ? '🙇 礼 (Cúi chào)' : '👏 パチン！(Vỗ tay)';
      this.overhead.say(P, `${label} · Tiếp: ${r.hint}`, 1.8);
    }
    this.hud();
  }

  doOmikujiAction() {
    const P = this.who.player;
    const r = drawOmikuji(this.st, this.S);
    if (!r.ok) {
      if (r.reason === 'money') toast('💴 Không đủ 100 ¥', 'Rút quẻ おみくじ cần 100 ¥.');
      return;
    }
    if (this.storage) save(this.S, this.storage);
    this.stages.shrine.syncRings(this.st);
    this.paused = true;
    P.yaw = Math.PI;
    P.reachTo = 0.55;
    this.poseT = 0.4;

    const isKyo = r.jp === '凶';
    const renderSlip = (tied = false) => {
      const fxDelta = tied ? [['mental', 0]] : [['mental', r.fx.mental]];
      const btns = [];
      if (isKyo && !tied) {
        btns.push({
          label: '🪢 Buộc giấy lên giá おみくじ掛け (hóa giải → 🧠 ±0)',
          on: () => {
            tieOmikujiKyo(this.st, this.S);
            if (this.storage) save(this.S, this.storage);
            this.stages.shrine.setKyoTied(true);
            renderSlip(true);
          },
        });
      }
      btns.push({
        label: 'Cất quẻ & Tiếp tục →',
        cls: isKyo && !tied ? 'ghost' : '',
        on: () => {
          show('modal', false);
          this.paused = false;
          this.hud();
        },
      });
      card(`
        <div class="omikuji-slip">
          <div class="omi-sub">さくら神社 · おみくじ</div>
          <div class="omi-kanji">${esc(r.jp)}</div>
          <p class="omi-vi">${esc(r.vi)}</p>
        </div>
        <div class="deltas">${
          tied ? '<span class="delta">🧠 Tinh thần ±0 (đã buộc hóa giải)</span>' : deltaChips(fxDelta)
        }</div>
        ${r.tieTip ? `<p class="lesson">🪢 ${esc(r.tieTip)}</p>` : ''}
      `, btns);
    };
    renderSlip(false);
  }

  doHanamiAction() {
    const P = this.who.player, hung = this.who.hung, hoa = this.who.hoa;
    const r = doHanami(this.st, this.S);
    if (!r.ok) return;
    if (this.storage) save(this.S, this.storage);
    this.stages.shrine.syncRings(this.st);
    this.paused = true;

    seatOnTarp(P, SHRINE.seats.player.x, SHRINE.seats.player.z, SHRINE.seats.player.yaw);
    if (hung) this.overhead.say(hung, r.lines[0].jp.replace(/[「」]/g, ''), 5);

    const deltas = Object.entries(r.fx).filter(([, v]) => v);
    card(`<h2>🌸 Ngắm hoa anh đào · お花見</h2>
      <p class="jpline">${esc(r.lines[0].jp)}</p>
      <p><b>Anh Hùng:</b> ${esc(r.lines[0].vi)}</p>
      <p class="jpline">${esc(r.lines[1].jp)}</p>
      <p><b>Chị Hoa:</b> ${esc(r.lines[1].vi)}</p>
      <div class="deltas">${deltaChips(deltas)}</div>
      <p class="lesson">🌸 Ngồi dưới tán hoa anh đào 30 phút cùng đồng nghiệp giúp tinh thần nhẹ nhõm hẳn sau tuần làm việc đầu tiên.</p>`, [
      {
        label: 'Đứng dậy đi tiếp →',
        on: () => {
          show('modal', false);
          standUp(P);
          P.holder.position.set(SHRINE.spots.hanami.x, 0, SHRINE.spots.hanami.z + 0.35);
          this.paused = false;
          toast('🌸 Ngắm hoa お花見', `${deltaText(deltas)} · ${clock(this.st.min)}`);
          this.hud();
        },
      },
    ]);
  }

  skip() {
    if (this.paused || !this.st) return;
    const ph = this.st.phase;
    if (ph === 'roomDay') this.action('out');
    else if (ph === 'streetDay') this.fadeTo(() => this.enterShrine());
    else if (ph === 'shrine') this.action('home');
    else if (ph === 'streetNight') this.fadeTo(() => this.enterRoomNight());
    else if (ph === 'roomNight') this.action('sleep');
  }

  update(dt) {
    if (!this.active || !this.st) return;
    const st = this.st, ph = st.phase, P = this.who.player, pos = P.holder.position, c = this.controls;
    const portrait = isPortrait();
    let moving = false, speed = 0;

    if (this.poseT > 0) {
      this.poseT -= dt;
      if (this.poseT <= 0) {
        P.bendTo = 0;
        P.reachTo = 0;
        P.wristSway = 0;
      }
    }

    if (this.lie >= 0) {
      this.lie = Math.min(1, this.lie + dt / 0.9);
      const k = this.lie * this.lie * (3 - 2 * this.lie), a = k * Math.PI / 2, h = 0.55;
      const hipY = h - (h - 0.2) * k, hipZ = DORM.bed.z + 0.3;
      P.yaw = 0;
      P.holder.rotation.x = -a;
      P.holder.position.set(DORM.bed.x, hipY - h * Math.cos(a), hipZ + h * Math.sin(a));
      if (this.lie >= 1) {
        this.lie = -1;
        this.paused = true;
        setTimeout(() => this.fadeTo(() => {
          this.S.flags = this.S.flags || {};
          this.S.flags.dayOff = {
            ...(this.S.flags.dayOff || {}),
            done: true,
            prayed: st.prayed,
            omikuji: st.omikuji,
            hanami: st.hanami,
          };
          if (this.storage) save(this.S, this.storage);
          this._hide();
          this.st = null;
          if (this.onEnd) this.onEnd();
        }), 650);
      }
    } else if (!this.paused) {
      let mag = c.input(this.dir);
      if (mag < 0.05 && c.target) {
        this.dir.set(c.target.x - pos.x, 0, c.target.z - pos.z);
        const d = this.dir.length();
        if (d < this.bestD - 0.02) { this.bestD = d; this.stuckT = 0; } else this.stuckT += dt;
        if (d < 0.12 || this.stuckT > 0.45) {
          c.target = null; mag = 0; this.bestD = Infinity; this.stuckT = 0;
        } else {
          this.dir.multiplyScalar(1 / d); mag = 1;
        }
      } else if (mag >= 0.05) {
        this.dir.multiplyScalar(1 / Math.max(mag, 1e-4));
        this.toShrineSign = false;
      }

      if (mag >= 0.05) {
        moving = true;
        const ox = pos.x, oz = pos.z;
        const isRoom = ph === 'roomDay' || ph === 'roomNight';
        const isShrine = ph === 'shrine';
        const B = isRoom ? DORM.bounds : isShrine ? SHRINE.bounds : ROUTE.bounds;
        const blocks = isRoom ? DORM.blocks : isShrine ? SHRINE.blocks : ROUTE.blocks;
        const sp = WALK * (this.running && !isRoom ? RUN_MUL : 1) * (isRoom ? 0.6 : 1) * mag * dt;
        pos.x += this.dir.x * sp;
        pos.z += this.dir.z * sp;
        for (const o of blocks) {
          const dx = pos.x - o.x, dz = pos.z - o.z, dd = Math.hypot(dx, dz), rr = o.r + 0.3;
          if (dd < rr && dd > 1e-4) {
            pos.x = o.x + (dx / dd) * rr;
            pos.z = o.z + (dz / dd) * rr;
          }
        }
        pos.x = THREE.MathUtils.clamp(pos.x, B.x0, B.x1);
        pos.z = THREE.MathUtils.clamp(pos.z, B.z0, B.z1);
        speed = dt > 0 ? Math.hypot(pos.x - ox, pos.z - oz) / dt : 0;
        let dy = Math.atan2(this.dir.x, this.dir.z) - P.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        P.yaw += dy * Math.min(1, dt * 12);
        tickDayOff(st, dt);
      }

      if (ph === 'streetDay' && (Math.hypot(pos.x - ROUTE.shrine.x, pos.z - ROUTE.shrine.z) < 1.8 || (this.toShrineSign && !c.target))) {
        this.toShrineSign = false;
        this.fadeTo(() => this.enterShrine());
        return;
      }
      if (ph === 'streetNight' && (Math.hypot(pos.x - ROUTE.start.x, pos.z - ROUTE.start.z) < 1.8 || !c.target)) {
        this.fadeTo(() => this.enterRoomNight());
        return;
      }
      if (this.toFuton && !c.target) {
        this.toFuton = false;
        this.lie = 0;
      }
    }

    if (this.lie < 0 && P.sit === 0) P.moveAt(speed);

    // Camera framing per phase
    camera.fov = portrait ? 56 : 46;
    camera.updateProjectionMatrix();
    if (ph === 'roomDay' || ph === 'roomNight') {
      const fx = pos.x * 0.5, fz = THREE.MathUtils.clamp(pos.z, -1.2, 1.4);
      this.camPos.set(fx, 2.9 * (portrait ? 1.25 : 1), fz + (portrait ? 4.9 : 3.9));
      this.camLook.set(fx * 1.2, 0.55, fz - 0.7);
      this.camRig.to(this.camPos, this.camLook, dt, 4);
    } else if (ph === 'shrine') {
      const dist = 5.4 * (portrait ? 1.18 : 1);
      this.camPos.set(pos.x * 0.75, portrait ? 3.5 : 2.9, pos.z + dist);
      this.camLook.set(pos.x * 0.85, 1.15, pos.z - 2.6);
      this.camRig.to(this.camPos, this.camLook, dt, 5);
    } else {
      if (moving && !c.drag && Math.abs(c.joy.x) < 0.4) {
        let dy = P.yaw + Math.PI - c.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
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
