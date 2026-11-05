// Work-shift controls: virtual joystick, tap-to-walk, drag to orbit the camera, WASD/arrows.
import * as THREE from 'three';
import { canvas, camera } from './stage.js';

export class Controls {
  constructor(joyEl) {
    this.joyEl = joyEl; this.knob = joyEl.querySelector('i');
    this.joy = new THREE.Vector2(); this.joyId = null; this.joyC = { x: 0, y: 0 };
    this.keys = new Set();
    this.yaw = -0.12; this.pitch = 0.36; this.yawLimit = [-1.1, 1.1];
    this.target = null; this.groundY = 0; this.enabled = false;
    this.drag = null;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); this.hit = new THREE.Vector3();
    this.onTap = null; // (point) => void
    this._bind();
  }
  _bind() {
    const j = this.joyEl;
    j.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      e.preventDefault(); this.joyId = e.pointerId; j.setPointerCapture(e.pointerId);
      const r = j.getBoundingClientRect(); this.joyC = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 };
      this.joyYaw = this.yaw; // steer in the view the stick was pressed in (no drifting while the camera follows)
      this._joyMove(e); this.target = null;
    });
    j.addEventListener('pointermove', (e) => { if (e.pointerId === this.joyId) this._joyMove(e); });
    const end = (e) => { if (e.pointerId === this.joyId) { this.joyId = null; this.joy.set(0, 0); this.knob.style.transform = ''; } };
    j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, moved: 0 };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const d = this.drag; if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y; d.moved = Math.max(d.moved, Math.hypot(dx, dy));
      if (d.moved > 8) {
        this.manual = true; // the player looks around: the camera holds that view until they walk again
        const ny = d.yaw - dx * 0.005;
        this.yaw = this.followMode ? ny : THREE.MathUtils.clamp(ny, this.yawLimit[0], this.yawLimit[1]);
        this.pitch = THREE.MathUtils.clamp(d.pitch + dy * 0.004, 0.08, 1);
      }
    });
    canvas.addEventListener('pointerup', (e) => {
      const d = this.drag; if (!d || d.id !== e.pointerId) return;
      this.drag = null;
      if (d.moved <= 8 && this.enabled) {
        const r = canvas.getBoundingClientRect();
        this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        this.ray.setFromCamera(this.ndc, camera);
        this.plane.constant = -this.groundY;
        if (this.ray.ray.intersectPlane(this.plane, this.hit)) { this.target = this.hit.clone(); this.onTap && this.onTap(this.target); }
      }
    });
    addEventListener('keydown', (e) => { if (/^(Arrow|Key[WASD])/.test(e.code)) { if (!this.keys.size) this.keyYaw = this.yaw; this.keys.add(e.code); this.target = null; } });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }
  _joyMove(e) {
    const { x, y, R } = this.joyC;
    let dx = (e.clientX - x) / R, dy = (e.clientY - y) / R;
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    this.joy.set(dx, dy);
    this.knob.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`;
  }
  reset({ yaw = -0.12, pitch = 0.36, yawLimit = [-1.1, 1.1], groundY = 0 } = {}) {
    Object.assign(this, { yaw, pitch, yawLimit, groundY, target: null, manual: false, idleT: 0, followMode: false }); this.joy.set(0, 0); this.keys.clear();
  }
  /**
   * Chase camera for walking (owner feedback 2026-11-05): while the character walks the camera swings smoothly behind it,
   * turns included; after a manual drag (looking around) it keeps that view until the character walks again; standing
   * still without a manual look, it re-centres after a moment. behind = the yaw that puts the camera behind the character.
   */
  follow(behind, moving, dt) {
    this.followMode = true;
    if (this.drag) return;
    this.idleT = moving ? 0 : (this.idleT || 0) + dt;
    if (moving) this.manual = false;
    const rate = moving ? 2.2 : (!this.manual && this.idleT > 0.6 ? 1.8 : 0);
    if (!rate) return;
    let d = behind - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * rate);
    // keep the steering frame in step while the stick is held, slowly enough that the path stays straight
    if (this.joyId != null && this.joyYaw != null) { let j = this.yaw - this.joyYaw; j = Math.atan2(Math.sin(j), Math.cos(j)); if (Math.abs(this.joy.x) < 0.35) this.joyYaw += j * Math.min(1, dt * 1.2); }
  }
  /** World-space move direction for this frame from joystick or keys (camera relative). Length 0..1. */
  input(out) {
    let ix = this.joy.x, iy = this.joy.y;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) iy -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iy += 1;
    const l = Math.hypot(ix, iy);
    if (l > 1) { ix /= l; iy /= l; }
    // camera sits at +z of the player rotated by yaw, so forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw);
    // screen-up on the stick is iy < 0: move = right·ix + forward·(-iy)
    const yaw = this.joyId != null && this.joyYaw != null ? this.joyYaw : this.keys.size && this.keyYaw != null ? this.keyYaw : this.yaw;
    const s = Math.sin(yaw), c = Math.cos(yaw);
    out.set(ix * c + iy * s, 0, -ix * s + iy * c);
    return Math.min(1, l);
  }
}
