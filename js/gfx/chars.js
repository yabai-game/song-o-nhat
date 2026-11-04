// Chibi characters: Meshy models (rigged, 4 clips: idle/walk/run/talk) with per-slot recolouring.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './stage.js';

// One entry per Meshy model. ref = reference colours measured from each texture (sRGB 0..1)
// by tools/process_character.py. Adding an outfit = one model file + one line here.
export const OUTFITS = {
  hoodie: { g: 'm', file: 'hero_hoodie', name: 'Áo hoodie', desc: 'Đi học, làm thêm', bottomLabel: 'Màu quần',
    ref: { top: [0.095, 0.148, 0.317], bottom: [0.821, 0.733, 0.629], skin: [0.988, 0.826, 0.744], a: [0.97, 0.97, 0.976], b: [0.02, 0.02, 0.02] } },
  suit: { g: 'm', file: 'hero_suit', name: 'Vest công sở', desc: 'Đi làm ở công ty', bottomLabel: 'Màu quần',
    ref: { top: [0.064, 0.083, 0.132], bottom: [0.264, 0.223, 0.232], skin: [0.99, 0.834, 0.72], a: [0.983, 0.975, 0.969], b: [0.02, 0.02, 0.02] } },
  f_casual: { g: 'f', file: 'f_casual', name: 'Áo len + váy', desc: 'Đi học, làm thêm', bottomLabel: 'Màu váy',
    ref: { top: [0.964, 0.904, 0.808], bottom: [0.054, 0.075, 0.204], skin: [0.979, 0.791, 0.695], a: [0.994, 0.993, 0.993], b: [0.02, 0.02, 0.02] } },
  f_office: { g: 'f', file: 'f_office', name: 'Vest công sở', desc: 'Đi làm ở công ty', bottomLabel: 'Màu váy',
    ref: { top: [0.038, 0.053, 0.129], bottom: [0.445, 0.433, 0.449], skin: [0.989, 0.792, 0.661], a: [0.984, 0.977, 0.974], b: [0.02, 0.02, 0.02] } },
  // job uniforms (not offered in the creator): the care home's caregiver outfits
  care_f: { g: 'f', file: 'care_f', name: 'Đồng phục điều dưỡng', uniform: true,
    ref: { top: [0.976, 0.668, 0.702], bottom: [0.97, 0.968, 0.974], skin: [0.981, 0.779, 0.667], a: [0.95, 0.942, 0.947], b: [0.02, 0.02, 0.02] } },
  care_m: { g: 'm', file: 'care_m', name: 'Đồng phục điều dưỡng', uniform: true,
    ref: { top: [0.752, 0.903, 0.838], bottom: [0.961, 0.763, 0.638], skin: [0.936, 0.833, 0.743], a: [0.943, 0.941, 0.946], b: [0.02, 0.02, 0.02] } },
  // care home residents (NPC only)
  elder_f: { g: 'f', file: 'elder_f', name: 'Cụ bà', npc: true,
    ref: { top: [0.717, 0.594, 0.796], bottom: [0.291, 0.257, 0.282], skin: [0.979, 0.774, 0.694], a: [0.863, 0.854, 0.866], b: [0.02, 0.02, 0.02] } },
  elder_m: { g: 'm', file: 'elder_m', name: 'Cụ ông', npc: true,
    ref: { top: [0.772, 0.685, 0.582], bottom: [0.433, 0.307, 0.225], skin: [0.955, 0.746, 0.656], a: [0.932, 0.932, 0.94], b: [0.02, 0.02, 0.02] } },
  npc_black: { g: 'm', file: 'npc_black', name: 'Người qua đường', npc: true, fixedColors: true,
    ref: { top: [0.807, 0.631, 0.416], bottom: [0.194, 0.19, 0.187], skin: [0.904, 0.782, 0.574], a: [0.596, 0.435, 0.264], b: [0.02, 0.02, 0.02] } },
};
export const SWATCH = {
  top:    [null, '#c8423b', '#3f8f5a', '#d9a43b', '#6b6f78', '#e59bb0', '#f2efe9'],
  bottom: [null, '#2b2b30', '#3c5a86', '#8b8d92', '#7a5236', '#e8dcc4'],
  hair:   [null, '#5a3a24', '#a8743f', '#d8b35a', '#e9e2d4', '#7a2c2c'],
  skin:   [null, '#f3c9ad', '#e2ad86', '#c48a62', '#8d5a3b'],
};

const srgb = (a) => new THREE.Color().setRGB(a[0], a[1], a[2], THREE.SRGBColorSpace);
export const refHex = (kind, slot) => '#' + srgb(OUTFITS[kind].ref[slot === 'hair' ? 'b' : slot]).getHexString(THREE.SRGBColorSpace);

function makeTint(baseMat, ref) {
  const m = baseMat.clone();
  m.vertexColors = false;
  const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const u = {
    uTop: { value: srgb(ref.top) }, uBottom: { value: srgb(ref.bottom) }, uSkin: { value: srgb(ref.skin) }, uHair: { value: srgb(ref.b) },
    rTop: { value: v3(ref.top) }, rBottom: { value: v3(ref.bottom) }, rSkin: { value: v3(ref.skin) }, rA: { value: v3(ref.a) }, rB: { value: v3(ref.b) },
    rSkinLin: { value: srgb(ref.skin) },
    uOn: { value: new THREE.Vector4(0, 0, 0, 0) }, // hair, top, bottom, skin: 1 = a colour was picked
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    // COLOR_0 from Blender: r = hair, g = top, b = bottom, a = skin (faces where recolouring is allowed)
    sh.vertexShader = 'attribute vec4 color;\nvarying vec4 vMask;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vMask = color;');
    sh.fragmentShader = 'uniform vec3 uTop, uBottom, uSkin, uHair, rTop, rBottom, rSkin, rA, rB, rSkinLin;\nuniform vec4 uOn;\nvarying vec4 vMask;\n' +
      sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  {
    vec3 lin = sampledDiffuseColor.rgb;
    vec3 t = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
    const vec3 W = vec3(0.2126, 0.7152, 0.0722);
    float lt = dot(lin, W);
    float dT = distance(t, rTop), dB = distance(t, rBottom), dS = distance(t, rSkin), dA = distance(t, rA), dK = distance(t, rB);
    float wT = uOn.y * vMask.g * (1.0 - smoothstep(0.14, 0.26, dT)) * step(dT, min(min(dB, dS), min(dA, dK)) + 0.02);
    float wB = uOn.z * vMask.b * (1.0 - smoothstep(0.14, 0.26, dB)) * step(dB, min(min(dT, dS), min(dA, dK)) + 0.02);
    float wS = uOn.w * vMask.a * (1.0 - smoothstep(0.16, 0.30, dS)) * step(dS, min(min(dT, dB), min(dA, dK)) + 0.04);
    float wH = uOn.x * vMask.r * (1.0 - smoothstep(0.02, 0.06, lt));
    vec3 c = diffuseColor.rgb;
    c = mix(c, uTop * clamp(lt / max(dot(pow(rTop, vec3(2.2)), W), 0.003), 0.55, 1.5), wT);
    c = mix(c, uBottom * clamp(lt / max(dot(pow(rBottom, vec3(2.2)), W), 0.003), 0.55, 1.5), wB);
    c = mix(c, lin * (uSkin / max(rSkinLin, vec3(0.02))), wS);
    c = mix(c, uHair * (0.7 + 6.0 * lt) + vec3(lt * 0.4), wH);
    diffuseColor.rgb = c;
  }`);
  };
  m.customProgramCacheKey = () => 'tint-v3';
  return m;
}

function fixInPlace(clip) {
  // keep walk/run cycles in place: freeze the hips' horizontal drift
  for (const tr of clip.tracks) {
    if (/Hips\.position$/.test(tr.name)) {
      const v = tr.values, x0 = v[0], z0 = v[2];
      for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
    }
  }
  return clip;
}

const SRC = {};
export function ensureSrc(kind) {
  if (!SRC[kind]) {
    SRC[kind] = loadModel(OUTFITS[kind].file).then((g) => ({ scene: g.scene, clips: g.animations.map(fixInPlace) }));
  }
  return SRC[kind];
}

export class Character {
  constructor(kind, src, shared = []) {
    this.kind = kind;
    this.root = SkeletonUtils.clone(src.scene);
    this.root.traverse((o) => {
      if (o.isSkinnedMesh) { o.castShadow = true; o.frustumCulled = false; this.tint = o.material = makeTint(o.material, OUTFITS[kind].ref); }
      if (o.isBone) {
        const n = o.name.replace(/^mixamorig:?/, '');
        if (n === 'HeadTop_End') this.headTop = o;
        else if (n === 'Head') this.head = o;
        else if (n === 'Spine2') this.chest = o;
        else if (n === 'Spine') this.spine = o;
        else if (n === 'Spine1') this.spine1 = o;
        else if (n === 'LeftHand') this.handL = o;
        else if (n === 'RightHand') this.handR = o;
        else if (n === 'RightArm') this.armR = o;
        else if (n === 'RightForeArm') this.foreR = o;
        else if (n === 'LeftForeArm') this.foreL = o;
        else if (n === 'Hips') this.hips = o;
        else if (n === 'LeftUpLeg') this.thighL = o;
        else if (n === 'RightUpLeg') this.thighR = o;
        else if (n === 'LeftLeg') this.shinL = o;
        else if (n === 'RightLeg') this.shinR = o;
      }
    });
    this.holder = new THREE.Group(); this.holder.add(this.root);
    this.mixer = new THREE.AnimationMixer(this.root);
    this.acts = {};
    // clips this model lacks (e.g. "carry") are borrowed from another model: every Meshy rig uses
    // the same Mixamo bone names and A-pose rest, so the tracks bind by name.
    for (const c of [...src.clips, ...shared.filter((s) => !src.clips.some((c) => c.name === s.name))]) this.acts[c.name] = this.mixer.clipAction(c);
    this.cur = 'idle'; this.acts.idle.play();
    this.attach = []; // { obj, bone, bone2, up, side, fwd }
    this.yaw = 0;
    this.bend = 0; this.bendTo = 0; // 0..1 procedural forward bend (pick up, bow)
    this.shoulder = 0; this.shoulderTo = 0; // 0..1 right hand up on the shoulder (shoulder carry)
    // bones posed procedurally: clips exported with optimised (constant-track-free) animation may
    // not write these every frame, so restore their rest rotation before each mixer update —
    // otherwise the extra rotation piles up frame after frame and the body folds over
    this.posed = [this.spine, this.spine1, this.chest, this.armR, this.foreR, this.foreL, this.thighL, this.thighR, this.shinL, this.shinR]
      .filter(Boolean).map((b) => [b, b.quaternion.clone()]);
    this.sit = 0; // 1 = seated (wheelchair): thighs forward, shins down, forearms on the lap
  }
  play(name, fade = 0.25) {
    if (this.cur === name || !this.acts[name]) return;
    const next = this.acts[name], prev = this.acts[this.cur];
    next.reset().setEffectiveWeight(1).play();
    prev.crossFadeTo(next, fade, false);
    this.cur = name;
  }
  setColor(slot, hex) {
    const u = this.tint.userData.u, ref = OUTFITS[this.kind].ref;
    const key = { top: 'uTop', bottom: 'uBottom', hair: 'uHair', skin: 'uSkin' }[slot];
    if (hex) u[key].value.set(hex); else u[key].value.copy(srgb(slot === 'hair' ? ref.b : ref[slot]));
    u.uOn.value[{ hair: 'x', top: 'y', bottom: 'z', skin: 'w' }[slot]] = hex ? 1 : 0;
  }
  look(colors) { for (const s of ['top', 'bottom', 'hair', 'skin']) this.setColor(s, colors[s] || null); }
  /** Keeps an object at a bone, offset in the character's facing frame (no bone-scale issues). */
  pin(obj, bone, up = 0, side = 0, fwd = 0, bone2 = null) { this.holder.parent?.add(obj); this.attach.push({ obj, bone, bone2, up, side, fwd }); return obj; }
  unpinAll() { for (const a of this.attach) a.obj.parent?.remove(a.obj); this.attach.length = 0; }
  update(dt) {
    this.holder.rotation.y = this.yaw;
    for (const [b, q] of this.posed) b.quaternion.copy(q);
    this.mixer.update(dt);
    // procedural forward bend on top of the clip. The spine bones' local axes differ between Meshy
    // rigs and change with the clip pose, so the bend turns each bone about the character's own
    // left–right axis in world space (converted into the bone's parent frame), never a local axis.
    this.bend += (this.bendTo - this.bend) * Math.min(1, dt * 12);
    if (this.bend > 0.01 && this.spine) {
      _side.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); // holder +x: positive angle tips the top towards +z (forward)
      this.holder.updateMatrixWorld(true);
      tilt(this.spine, _side, this.bend * 0.32);
      if (this.spine1) tilt(this.spine1, _side, this.bend * 0.26);
      if (this.chest) tilt(this.chest, _side, this.bend * 0.14);
    }
    // seated pose, also about the body's side axis: positive turns tip a bone's far end backwards (−z)
    // for a downward bone, so the thighs swing forward with −90° and the shins hang back down with +90°
    if (this.sit > 0 && this.thighL) {
      _side.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      this.holder.updateMatrixWorld(true);
      const k = this.sit * Math.PI / 2;
      tilt(this.thighL, _side, -k); tilt(this.thighR, _side, -k);
      tilt(this.shinL, _side, k); tilt(this.shinR, _side, k);
      if (this.foreL) tilt(this.foreL, _side, -0.9 * this.sit);
      if (this.foreR) tilt(this.foreR, _side, -0.9 * this.sit);
    }
    // right arm raised so the hand holds a load on the right shoulder (axes found on the Meshy rig)
    this.shoulder += (this.shoulderTo - this.shoulder) * Math.min(1, dt * 10);
    if (this.shoulder > 0.01 && this.armR && this.foreR) {
      _q.setFromAxisAngle(_x, this.shoulder * 1.1); this.armR.quaternion.multiply(_q);
      _q.setFromAxisAngle(_x, this.shoulder * 1.2); this.foreR.quaternion.multiply(_q);
    }
    if (this.attach.length) {
      this.holder.updateMatrixWorld(true);
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      for (const a of this.attach) {
        if (!a.bone) continue;
        a.bone.getWorldPosition(_v);
        if (a.bone2) { a.bone2.getWorldPosition(_w); _v.add(_w).multiplyScalar(0.5); } // between two bones (both hands)
        a.obj.position.set(_v.x + c * a.side + s * a.fwd, _v.y + a.up, _v.z - s * a.side + c * a.fwd);
        a.obj.rotation.y = this.yaw;
      }
    }
  }
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _x = new THREE.Vector3(1, 0, 0);
const _side = new THREE.Vector3(), _a = new THREE.Vector3(), _qp = new THREE.Quaternion();
/** rotate a bone by `angle` about a WORLD axis: local' = (parentWorld⁻¹ · axis rotation) · local */
function tilt(bone, axisW, angle) {
  bone.parent.getWorldQuaternion(_qp);
  _a.copy(axisW).applyQuaternion(_qp.invert()).normalize();
  _q.setFromAxisAngle(_a, angle);
  bone.quaternion.premultiply(_q);
  bone.updateMatrixWorld(true);
}

/**
 * Re-target the donor's clips onto another rig: the auto-rigger puts each model's bones at a slightly
 * different rest rotation (a skirt moves the hips), so a borrowed local rotation q becomes
 * restTarget · restDonor⁻¹ · q — the donor's rest pose maps onto the target's rest pose.
 */
const _retarget = new Map();
function retarget(kind, src, donor) {
  if (_retarget.has(kind)) return _retarget.get(kind);
  const rest = (scene) => { const m = new Map(); scene.traverse((o) => { if (o.isBone) m.set(o.name, o.quaternion.clone()); }); return m; };
  const rT = rest(src.scene), rD = rest(donor.scene);
  const d = new THREE.Quaternion(), q = new THREE.Quaternion();
  const clips = donor.clips.map((clip) => {
    const c = clip.clone();
    // drop tracks for bones this rig does not have (finger bones): they only warn when bound
    c.tracks = c.tracks.filter((t) => rT.has(t.name.split('.')[0]));
    for (const t of c.tracks) {
      const [bone, prop] = t.name.split('.');
      if (prop !== 'quaternion' || !rT.has(bone) || !rD.has(bone)) continue;
      d.copy(rD.get(bone)).invert().premultiply(rT.get(bone));
      const v = t.values;
      for (let i = 0; i < v.length; i += 4) { q.fromArray(v, i).premultiply(d); q.toArray(v, i); }
    }
    return c;
  });
  _retarget.set(kind, clips);
  return clips;
}

export async function makeCharacter(kind, colors) {
  const [src, donor] = await Promise.all([ensureSrc(kind), ensureSrc('hoodie')]);
  // every clip this model lacks (idle, talk, carry for the newer Meshy rigs) is borrowed from the hoodie
  const ch = new Character(kind, src, kind === 'hoodie' ? [] : retarget(kind, src, donor));
  if (colors) ch.look(colors);
  return ch;
}

/**
 * Japanese-style hard hat (ヘルメット): a lathe-turned shell with a short front peak, a centre ridge
 * and a chin-strap band, sized from the head bones and parented to the head bone so it follows
 * every head movement. The local transform is solved once from the current pose.
 */
export function makeHelmet(ch, color = '#f4f4f0') {
  ch.holder.updateMatrixWorld(true);
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  ch.head.getWorldPosition(a); ch.headTop.getWorldPosition(b);
  const h = a.distanceTo(b) || 0.55;            // neck-to-crown height of this model
  const R = h * 0.5;                           // shell radius (chibi heads are wide)
  const shell = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.8 });
  const g = new THREE.Group();
  // shell: lathe profile from the rim up to the crown
  const pts = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14, ang = t * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(ang) * R * (1 + 0.04 * (1 - t)), Math.sin(ang) * R * 0.92)); }
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), shell);
  dome.scale.set(0.96, 1, 1.08);
  // short front peak (つば)
  const peakShape = new THREE.Shape();
  peakShape.absarc(0, 0, R * 1.02, Math.PI * 0.12, Math.PI * 0.88, false);
  peakShape.absarc(0, 0, R * 0.8, Math.PI * 0.88, Math.PI * 0.12, true);
  const peak = new THREE.Mesh(new THREE.ExtrudeGeometry(peakShape, { depth: R * 0.05, bevelEnabled: false, curveSegments: 16 }), shell);
  peak.rotation.x = -Math.PI / 2 + 0.18; peak.position.set(0, R * 0.04, R * 0.32);
  // rim band and centre ridge
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.99, R * 0.035, 6, 40), shell);
  rim.rotation.x = Math.PI / 2; rim.scale.set(0.96, 1.08, 1);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(R * 0.9, R * 0.05, 6, 24, Math.PI), shell);
  ridge.rotation.y = Math.PI / 2; ridge.scale.set(1.08, 1, 1);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(R * 0.98, R * 0.018, 4, 40, Math.PI), dark);
  strap.rotation.set(0, Math.PI / 2, Math.PI); strap.position.y = -R * 0.02; strap.scale.set(1, 0.7, 1);
  // green safety cross (安全十字) sticker on the front, as on Japanese site helmets
  const green = new THREE.MeshStandardMaterial({ color: '#1f9d55', roughness: 0.6 });
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(R * 0.12, R * 0.34, R * 0.02), green);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(R * 0.34, R * 0.12, R * 0.02), green);
  for (const c of [crossV, crossH]) { c.position.set(0, R * 0.42, R * 0.98); c.rotation.x = -0.42; }
  g.add(dome, peak, rim, ridge, strap, crossV, crossH);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, h };
}

/** Parents a helmet to the head bone so it sits on the crown and follows the head. */
export function wearHelmet(ch, helmet) {
  ch.holder.updateMatrixWorld(true);
  const top = new THREE.Vector3(), base = new THREE.Vector3();
  ch.headTop.getWorldPosition(top); ch.head.getWorldPosition(base);
  const h = top.distanceTo(base);
  // desired world transform: centred slightly below the crown, facing the character's front
  const pos = base.clone().lerp(top, 0.64);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ch.holder.rotation.y);
  const world = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1));
  const local = ch.head.matrixWorld.clone().invert().multiply(world);
  helmet.matrixAutoUpdate = true;
  local.decompose(helmet.position, helmet.quaternion, helmet.scale);
  ch.head.add(helmet);
  void h;
}
