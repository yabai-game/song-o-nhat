// Bento factory (さくら食品, Chiba): bright stainless-and-white food processing hall with a 37.2 m
// conveyor belt (4 segments of the Sketchfab conveyor model rotated 90° to run along x), black plastic
// trays with floating side-dish icons that swap to a finished bento_box when completed, a yellow work-zone
// overlay, and 「衛生第一」 / 「手洗い30秒」 wall signs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture, signTexture, makeSun, loadModel } from './stage.js';
import { BENTO, ITEMS, ITEM_KEYS } from '../core/bento_rules.js';

const BELT_X0 = -22.5;   // belt coordinate u in [0, 37.2] maps to world x = BELT_X0 + u
const BELT_Y = 0.95;     // top surface of the conveyor model
const BELT_Z = 0;        // belt centre line along z = 0
const SEG_LEN = 9.3;     // each conveyor model is 0.78 × 9.3 m (along its local z)
const POOL_SIZE = 16;

export const BENTO_ROOM = {
  beltX0: BELT_X0,
  beltY: BELT_Y,
  beltZ: BELT_Z,
  // walking bounds on the front side of the belt (used during the morning walk-in greeting)
  bounds: { x0: -7.5, x1: 7.5, z0: 0.85, z1: 4.8 },
  start: { x: 2.6, z: 4.3, yaw: Math.PI },
  greeterAt: { x: -1.2, z: 2.1, yaw: 0.45 },
  // fixed positions during the conveyor shift
  player: { x: 0, z: 0.92, yaw: Math.PI },
  foreman: { x: -2.2, z: -1.05, yaw: 0 },
  talkPlayer: { x: -0.4, z: 2.1 },
  showcase: { pos: [-4.2, 3.1, 4.8], look: [-1.5, 1.1, 0] },
};

function makeIconSpriteMat(icon) {
  const tex = canvasTexture(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255, 255, 255, 0.96)';
    g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#e67e22'; g.stroke();
    g.font = '72px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#1f2a33';
    g.fillText(icon, 64, 68);
  });
  return new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
}

function makeRawTray(trayMat, rimMat, riceMat, sideMats) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.032, 0.22), trayMat);
  base.position.y = 0.016; base.castShadow = true; base.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.044, 0.24), rimMat);
  rim.position.y = 0.022;
  const rice = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.038, 0.18), riceMat);
  rice.position.set(-0.065, 0.028, 0);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.034, 0.08), sideMats.karaage);
  side.position.set(0.06, 0.028, -0.045);
  g.add(rim, base, rice, side);
  g.userData.side = side;
  return g;
}

export async function buildBento() {
  const [conveyor, bentoBox] = await Promise.all(['conveyor', 'bento_box'].map(loadModel));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f5');
  scene.fog = new THREE.FogExp2(new THREE.Color('#eef2f5'), 0.008);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc8d0d8, 1.15));
  const fill = new THREE.DirectionalLight(0xf5f9ff, 0.65); fill.position.set(-6, 9, 8); scene.add(fill);
  const sun = makeSun(scene, { color: 0xfffaf0, intensity: 1.85, size: 12, offset: [3, 11, 6] });

  const batch = new Map(), mats = {};
  const col = (c, o = {}) => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1);
  function put(geo, m, x, y, z, ry = 0) {
    e.set(0, ry, 0); q.setFromEuler(e); p.set(x, y, z);
    let g = geo.applyMatrix4(m4.compose(p, q, s1)); if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!batch.has(m)) batch.set(m, []); batch.get(m).push(g);
  }
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // Light grey ceramic tiled floor
  const floorTex = canvasTexture(64, 64, (g) => {
    g.fillStyle = '#e7ecef'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#cfd6dc'; g.lineWidth = 2; g.strokeRect(1, 1, 62, 62);
  }, [22, 8]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 14), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.32 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(-4, 0, 0); floor.receiveShadow = true; scene.add(floor);

  // Clean white factory walls (back, left, right), hygienic trim, ceiling fluorescent light panels
  const wall = col('#f8fafb', { roughness: 0.65 });
  const steel = col('#c5cdd3', { metalness: 0.45, roughness: 0.4 });
  const trim = col('#2b7a9b', { roughness: 0.5 });
  const lamp = col('#ffffff', { emissive: '#eef7ff', emissiveIntensity: 0.9, roughness: 0.2 });
  const H = 4.5, Z_BACK = -5.1;
  put(B(42, H, 0.16), wall, -4, H / 2, Z_BACK);
  put(B(0.16, H, 14), wall, -25, H / 2, 0);
  put(B(0.16, H, 14), wall, 17, H / 2, 0);
  put(B(42, 0.22, 0.06), steel, -4, 0.11, Z_BACK + 0.1);
  put(B(42, 0.08, 0.05), trim, -4, 1.15, Z_BACK + 0.1);
  // Ceiling beams and fluorescent light tubes
  for (let x = -20; x <= 12; x += 4) {
    put(B(2.4, 0.07, 0.32), lamp, x, H - 0.12, -1.2);
    put(B(2.4, 0.07, 0.32), lamp, x, H - 0.12, 1.8);
  }
  // Stainless steel ingredient tables beside the player and along the back wall
  for (const [x, z, c] of [[1.95, 0.9, '#d98a2e'], [2.55, 0.9, '#c8423a'], [3.15, 0.9, '#4c9a4a']]) {
    put(B(0.52, 0.82, 0.52), steel, x, 0.41, z);
    put(B(0.42, 0.08, 0.42), col(c), x, 0.84, z);
  }
  // Hand-washing station & mirror near the back wall, plus stacked shipping crates (さくら食品)
  put(B(1.6, 0.9, 0.65), steel, 5.2, 0.45, Z_BACK + 0.45);
  put(B(1.4, 0.9, 0.05), col('#cbe3f0', { metalness: 0.3, roughness: 0.2 }), 5.2, 1.55, Z_BACK + 0.12);
  const crateMat = col('#f4f3ee');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    put(B(0.65, 0.42, 0.5), crateMat, -6.5 + c * 0.72, 0.21 + r * 0.43, Z_BACK + 0.55);
  }
  for (const [m, list] of batch) {
    const mesh = new THREE.Mesh(mergeGeometries(list, false), m);
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  }

  // Wall signs: 「衛生第一」 and 「手洗い30秒」
  const sign1 = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 0.72),
    new THREE.MeshStandardMaterial({ map: signTexture('衛生第一', 512, 148, '#f2f7f2', '#1f6b3a'), roughness: 0.5 }),
  );
  sign1.position.set(-1.7, 3.15, Z_BACK + 0.1);
  scene.add(sign1);

  const sign2 = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 0.72),
    new THREE.MeshStandardMaterial({ map: signTexture('手洗い30秒', 512, 148, '#eef5fb', '#1c5a96'), roughness: 0.5 }),
  );
  sign2.position.set(1.9, 3.15, Z_BACK + 0.1);
  scene.add(sign2);

  // 4 segments of conveyor joined along x (model runs along z, so rotate 90° around Y)
  for (let i = 0; i < 4; i++) {
    const seg = conveyor.scene.clone(true);
    seg.rotation.y = Math.PI / 2;
    seg.position.set(BELT_X0 + (i + 0.5) * SEG_LEN, 0, BELT_Z);
    seg.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(seg);
  }

  // Yellow work-zone strip on top of the belt spanning [ZONE0, ZONE1]
  const zoneW = BENTO.ZONE1 - BENTO.ZONE0;
  const zoneCenterX = BELT_X0 + (BENTO.ZONE0 + BENTO.ZONE1) / 2;
  const zonePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(zoneW, 0.72),
    new THREE.MeshBasicMaterial({ color: '#f5c71a', transparent: true, opacity: 0.30, depthWrite: false }),
  );
  zonePlane.rotation.x = -Math.PI / 2;
  zonePlane.position.set(zoneCenterX, BELT_Y + 0.012, BELT_Z);
  scene.add(zonePlane);

  const railMat = new THREE.MeshStandardMaterial({ color: '#f2b705', emissive: '#b88600', emissiveIntensity: 0.25, roughness: 0.4 });
  for (const dz of [-0.37, 0.37]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(zoneW, 0.03, 0.04), railMat);
    r.position.set(zoneCenterX, BELT_Y + 0.02, BELT_Z + dz);
    scene.add(r);
  }
  for (const dx of [-zoneW / 2, zoneW / 2]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.76), railMat);
    bar.position.set(zoneCenterX + dx, BELT_Y + 0.018, BELT_Z);
    scene.add(bar);
  }

  // Pre-allocated pool of tray visuals (raw black tray + icon sprite -> finished bento_box)
  const trayMat = new THREE.MeshStandardMaterial({ color: '#1f2126', roughness: 0.55 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#2c2f36', roughness: 0.45 });
  const riceMat = new THREE.MeshStandardMaterial({ color: '#fbfaf5', roughness: 0.85 });
  const sideMats = {
    karaage: new THREE.MeshStandardMaterial({ color: '#d98a2e', roughness: 0.7 }),
    sausage: new THREE.MeshStandardMaterial({ color: '#c8423a', roughness: 0.6 }),
    veg:     new THREE.MeshStandardMaterial({ color: '#4c9a4a', roughness: 0.7 }),
  };
  const iconMats = {};
  for (const k of ITEM_KEYS) iconMats[k] = makeIconSpriteMat(ITEMS[k].icon);

  const pool = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const group = new THREE.Group();
    const raw = makeRawTray(trayMat, rimMat, riceMat, sideMats);
    const doneBox = bentoBox.scene.clone(true);
    doneBox.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    doneBox.visible = false;
    const sprite = new THREE.Sprite(iconMats.karaage);
    sprite.scale.set(0.46, 0.46, 1);
    sprite.position.set(0, 0.44, 0);
    sprite.renderOrder = 10;
    group.add(raw, doneBox, sprite);
    group.visible = false;
    scene.add(group);
    pool.push({ group, raw, doneBox, sprite });
  }

  function syncTrays(trays) {
    const n = Math.min(pool.length, trays.length);
    for (let i = 0; i < n; i++) {
      const t = trays[i], slot = pool[i];
      slot.group.visible = true;
      slot.group.position.set(BELT_X0 + t.x, BELT_Y + 0.008, BELT_Z);
      slot.raw.visible = !t.done;
      slot.doneBox.visible = !!t.done;
      if (!t.done && sideMats[t.other]) slot.raw.userData.side.material = sideMats[t.other];
      const showIcon = !t.done && !t.missed && t.x >= BENTO.ZONE0 - BENTO.LOOKAHEAD - 3.5 && t.x <= BENTO.ZONE1;
      slot.sprite.visible = showIcon;
      if (showIcon && iconMats[t.need]) slot.sprite.material = iconMats[t.need];
    }
    for (let i = n; i < pool.length; i++) pool[i].group.visible = false;
  }

  function clearTrays() {
    for (const slot of pool) slot.group.visible = false;
  }

  const blocks = [
    { x: 1.95, z: 0.9, r: 0.45 },
    { x: 2.55, z: 0.9, r: 0.45 },
    { x: 3.15, z: 0.9, r: 0.45 },
  ];

  return {
    scene, sun, blocks,
    showcase: { pos: new THREE.Vector3(...BENTO_ROOM.showcase.pos), look: new THREE.Vector3(...BENTO_ROOM.showcase.look) },
    syncTrays,
    clearTrays,
    update() {},
  };
}
