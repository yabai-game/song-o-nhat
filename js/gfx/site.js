// Construction site: carrying steel pipes along a high scaffold deck (gameplay layout from j3Site,
// original 6706–6796; look from the Saitama art reference: high deck with scaffold framing and
// railings, a concrete building under construction behind it, a netted scaffold tower, a busy yard
// below and a Japanese suburb around). Community Meshy models (CC0) are baked in Blender and drawn
// instanced; everything procedural and static is merged into one mesh per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture, signTexture, makeSun, skyDome, loadModel, loadBrand, BRAND_ASPECT } from './stage.js';
import { SITE, PIPE_KINDS, PIPE_ORDER } from '../core/site_rules.js';
import { buildBackdrop } from './backdrop.js';

export const DECK_Y = 9;
export const SITE_BOUNDS = { x0: -10.4, x1: 10.4, z0: -1.9, z1: 3 };

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(r, h, mat, parent, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

/** Instanced pipe pile: rows × cols pipes of length len lying along x (rotated by ry). */
function pipePile(parent, x, y, z, rows, cols, len, ry = 0, r = 0.09, color = '#8f9398') {
  const n = rows * cols;
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r, len, 10), M(color, { metalness: 0.6, roughness: 0.4 }), n);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  let i = 0;
  for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols - rr * 0.5; c++) {
    if (i >= n) break;
    p.set(0, r + rr * r * 1.75, (c - (cols - 1) / 2) * r * 2.05 + (rr % 2) * r);
    m4.compose(p, q, s); mesh.setMatrixAt(i++, m4);
  }
  mesh.count = i;
  const g = new THREE.Group(); g.add(mesh); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  return mesh;
}

const MODELS = ['house_beige', 'house_wood', 'house_modern', 'apartment', 'apartment_lo', 'building_wip', 'excavator', 'vending', 'minimart', 'streetlight', 'trash_bags'];
const KONBINI_Z = 33.3;                  // mini mart lot centre: its 7.7 m deep lot fronts the sidewalk (z ≈ 29.4)
const KONBINI_SIGN = { z: KONBINI_Z - 3.2 }; // shop front (for the light spilling out at night)
const DORM_Z = 33.3;                     // dorm model centre: its 7.3 m deep block fronts the sidewalk (z ≈ 29.7)

/** Morning walk on the south street: dorm → trash point → vending machines → neighbour → site gate. */
export const ROUTE = {
  dorm: { x: -26, z: 36.2 },
  start: { x: -24, z: 28.3 },
  trash: { x: -22.7, z: 28.5 },
  vending: { x: -20.6, z: 28.5 },
  suzuki: { x: -10.5, z: 28.6 },
  hung: { x: 5.2, z: 22.6 },
  gate: { x: 3, z: 22.1 },
  konbini: { x: -1, z: 28.5 },   // in front of the konbini, facing the street
  market: { x: -5.5, z: 22.2 },  // across the street from the konbini: スーパー さくら
  shrine: { x: 7.8, z: 28.2 },   // east end of the south sidewalk: the way to ⛩ さくら神社
  station: { x: 8.4, z: 24.6 },  // east end of the street: the way to さくら駅 (care home commute)
  bounds: { x0: -31, x1: 9, z0: 21.8, z1: 28.7 },
  blocks: [{ x: -22.7, z: 29.45, r: 0.55 }, { x: -20.6, z: 29.5, r: 0.45 }, { x: -19.45, z: 29.5, r: 0.45 }],
};

export async function buildSite() {
  const [gl, brandBlack, brandWhite] = await Promise.all([
    Promise.all(MODELS.map(async (n) => [n, await loadModel(n)])).then(Object.fromEntries),
    loadBrand('black'),
    loadBrand('white'),
  ]);
  const scene = new THREE.Scene();
  const SKY = new THREE.Color('#9cc0d2');
  scene.background = SKY.clone();
  // exponential haze: the site stays crisp, the town fades with distance (aerial perspective)
  scene.fog = new THREE.FogExp2(new THREE.Color('#d3dde0'), 0.0068);
  const hemi = new THREE.HemisphereLight(0xdbe8ee, 0x7a624a, 0.95);
  // soft sky fill from the north (no shadows): the street-facing fronts of the south row face north,
  // away from the sun, and looked dull and muddy without it
  const fill = new THREE.DirectionalLight(0xe6eeff, 0.75); fill.position.set(-4, 9, -12); scene.add(fill);
  scene.add(hemi);
  const sun = makeSun(scene, { intensity: 2.4, size: 18, offset: [8, 16, 9] });
  const sky = skyDome(scene, '#74aedb', '#dbe5e8');
  const Y = DECK_Y;

  // ---- batching helpers: static geometry merged into one mesh per material ----
  const batch = new Map(); // material -> geometries
  const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _e4 = new THREE.Euler(), _s4 = new THREE.Vector3(1, 1, 1), _p4 = new THREE.Vector3();
  const mats = {};
  const mat = (c, o) => mats[c] || (mats[c] = M(c, o));
  function put(geo, color, x, y, z, ry = 0, rx = 0, opts) {
    _e4.set(rx, ry, 0); _q4.setFromEuler(_e4); _p4.set(x, y, z); _m4.compose(_p4, _q4, _s4);
    let g = geo.clone().applyMatrix4(_m4);
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const m = mat(color, opts);
    if (!batch.has(m)) batch.set(m, []);
    batch.get(m).push(g);
  }
  // local → world helper for a building at (bx, bz) rotated by ry (its front faces +z before rotation)
  const at = (bx, bz, ry) => (lx, ly, lz, geo, color, rot = 0, opts) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    put(geo, color, bx + lx * c + lz * s, ly, bz - lx * s + lz * c, ry + rot, 0, opts);
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const tube = (len, r = 0.045) => new THREE.CylinderGeometry(r, r, len, 6);
  const tubeX = (len, r) => tube(len, r).rotateZ(Math.PI / 2);
  const tubeZ = (len, r) => tube(len, r).rotateX(Math.PI / 2);
  /** a tube between two points in the x–y plane at depth z */
  function brace(x0, y0, x1, y1, z, color, r = 0.035) {
    const dx = x1 - x0, dy = y1 - y0;
    put(tube(Math.hypot(dx, dy), r).rotateZ(-Math.atan2(dx, dy)), color, (x0 + x1) / 2, (y0 + y1) / 2, z);
  }
  /** a tube between two points in the z–y plane at x */
  function braceZ(z0, y0, z1, y1, x, color, r = 0.035) {
    const dz = z1 - z0, dy = y1 - y0;
    put(tube(Math.hypot(dz, dy), r).rotateX(Math.atan2(dz, dy)), color, x, (y0 + y1) / 2, (z0 + z1) / 2);
  }
  /** Meshy models drawn instanced: list of [x, z, ry, scale] */
  function placeModel(gltf, list, { cast = false, receive = true, y = 0.02 } = {}) {
    gltf.scene.updateMatrixWorld(true);
    const srcs = []; gltf.scene.traverse((o) => { if (o.isMesh) srcs.push(o); });
    const sv = new THREE.Vector3();
    for (const src of srcs) {
      const im = new THREE.InstancedMesh(src.geometry, src.material, list.length);
      list.forEach(([x, z, ry, s = 1], i) => {
        _e4.set(0, ry, 0); _q4.setFromEuler(_e4); _p4.set(x, y, z); sv.set(s, s, s);
        _m4.compose(_p4, _q4, sv).multiply(src.matrixWorld); im.setMatrixAt(i, _m4);
      });
      im.castShadow = cast; im.receiveShadow = receive; im.computeBoundingSphere(); scene.add(im);
    }
  }

  // ---- ground ----
  const dirt = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#93806a'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { const v = 110 + Math.random() * 50; g.fillStyle = `rgba(${v},${v * 0.8},${v * 0.6},0.35)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  }, [40, 40]);
  // dirt only inside the site fence; the suburb around stands on plain lots, the town beyond on a street grid
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(56, 52), new THREE.MeshStandardMaterial({ map: dirt, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0.004, -4); ground.receiveShadow = true; scene.add(ground);
  const lots = new THREE.Mesh(new THREE.PlaneGeometry(116, 106), new THREE.MeshStandardMaterial({ color: '#a29f96', roughness: 1 }));
  lots.rotation.x = -Math.PI / 2; lots.position.set(0, -0.01, -5); lots.receiveShadow = true; scene.add(lots);
  dirt.repeat.set(8, 8);
  // compacted gravel yard under and in front of the scaffold
  const gravel = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#a49a8c'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = 120 + Math.random() * 90; g.fillStyle = `rgba(${v},${v * 0.95},${v * 0.88},0.5)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  }, [14, 8]);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(52, 30), new THREE.MeshStandardMaterial({ map: gravel, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  yard.rotation.x = -Math.PI / 2; yard.position.set(0, 0.01, 5); yard.receiveShadow = true; scene.add(yard);

  // ---- scaffold deck (steel planks) on a full scaffold frame (足場) ----
  const planks = canvasTexture(512, 128, (g) => {
    g.fillStyle = '#77746d'; g.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#6f6c66' : '#7d7a73'; g.fillRect(0, i * 16, 512, 15); }
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 2, 128);
    g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * 512, Math.random() * 128, 3, 1);
  }, [4, 2]);
  const deck = box(22.4, 0.25, 6.2, new THREE.MeshStandardMaterial({ map: planks, roughness: 0.7, metalness: 0.3 }), 0, Y - 0.125, 0.6, scene);
  deck.receiveShadow = true;
  const ST = '#80858b', RAIL = '#d9a62e', TOE = '#9aa0a6';
  const XS = []; for (let x = -10.8; x <= 10.81; x += 1.8) XS.push(x);
  const ZO = [-2.3, 3.5], ZS = [-2.3, 0.6, 3.5];
  const LV = [0.3, 2.05, 3.8, 5.55, 7.3, Y - 0.32];
  for (const x of XS) for (const z of ZS) {
    const h = z === 0.6 ? Y - 0.25 : Y + 1.25;
    put(tube(h, 0.048), ST, x, h / 2, z);
    put(B(0.32, 0.05, 0.32), '#5d6166', x, 0.025, z);              // base plate
  }
  for (const l of LV) {
    for (const z of ZS) put(tubeX(21.7, 0.04), ST, 0, l, z);       // ledgers
    for (const x of XS) put(tubeZ(5.9, 0.04), ST, x, l, 0.6);      // transoms
  }
  for (let b = 0; b < XS.length - 1; b++) for (let k = 0; k < LV.length - 1; k++) {   // zig-zag braces on both faces
    const up = (b + k) % 2 === 0;
    for (const z of ZO) brace(XS[b], up ? LV[k] : LV[k + 1], XS[b + 1], up ? LV[k + 1] : LV[k], z + (z > 0 ? 0.06 : -0.06), ST);
  }
  for (const x of [XS[0], XS[XS.length - 1]]) for (let k = 0; k < LV.length - 1; k++) braceZ(-2.3, LV[k], 3.5, LV[k + 1], x, ST);
  // chunky guard rails on both long sides and both ends, with toe boards
  for (const z of ZO) {
    for (const h of [0.55, 1.15]) put(tubeX(22, 0.05), RAIL, 0, Y + h, z);
    put(B(22, 0.2, 0.04), TOE, 0, Y + 0.1, z);
  }
  for (const x of [-11, 11]) for (const h of [0.55, 1.15]) put(tubeZ(5.9, 0.05), RAIL, x, Y + h, 0.6);
  // mesh sheets (養生シート) on the outer face below the deck, every other bay, so the yard stays visible
  const netTex = canvasTexture(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128); g.fillStyle = 'rgba(120,150,135,.45)'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(40,80,60,.9)'; g.lineWidth = 2;
    for (let i = 0; i < 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  }, [3, 6]);
  const sheetOpts = { map: netTex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 };
  for (let b = 0; b < XS.length - 1; b += 2) put(new THREE.PlaneGeometry(1.8, Y - 1.2), '#a9c4b4', (XS[b] + XS[b + 1]) / 2, (Y - 1.2) / 2 + 0.4, 3.6, 0, 0, sheetOpts);
  // a low net along the outer rail
  put(new THREE.PlaneGeometry(22, 0.9), '#a9c4b5', 0, Y + 0.6, 3.56, 0, 0, sheetOpts);
  // yellow 安全第一 boards on the outer rail
  for (const x of [-4.2, 5.4]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshStandardMaterial({ map: signTexture('安全第一', 512, 160, '#ffd60a', '#1d1d1d'), roughness: 0.7 }));
    sign.position.set(x, Y + 0.85, 3.62); scene.add(sign);
  }
  const keep = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshStandardMaterial({ map: signTexture('足場注意', 512, 160, '#ffffff', '#c0392b'), roughness: 0.7 }));
  keep.position.set(0.8, Y + 0.85, -2.36); keep.rotation.y = Math.PI; scene.add(keep);

  // ---- netted scaffold stair tower at the stack end, taller than the deck ----
  const TX = [-16.2, -14.4, -12.6], TH = Y + 5.2;
  for (const x of TX) for (const z of ZS) put(tube(TH, 0.048), ST, x, TH / 2, z);
  for (let l = 0.3; l < TH; l += 1.75) {
    for (const z of ZS) put(tubeX(3.8, 0.04), ST, -14.4, l, z);
    for (const x of TX) put(tubeZ(5.9, 0.04), ST, x, l, 0.6);
  }
  for (let l = 1.75, k = 0; l < TH - 1; l += 1.75, k++) {      // zig-zag stair flights and landings
    const dir = k % 2 ? 1 : -1;
    put(B(3.2, 0.08, 1.1).rotateZ(dir * Math.atan2(1.75, 3.2)), '#8a8f94', -14.4, l - 0.875, k % 2 ? -0.6 : 1.8);
    put(B(3.6, 0.1, 5.8), '#77746d', -14.4, Math.floor(l / 1.75) % 3 === 0 ? l : -50, 0.6);
  }
  put(B(3.8, 0.12, 5.9), '#77746d', -14.4, Y - 0.06, 0.6);    // landing level with the deck
  const greenSheet = { transparent: true, opacity: 0.82, side: THREE.DoubleSide, roughness: 0.9 };
  put(new THREE.PlaneGeometry(5.9, TH - 0.4), '#3f7f5f', -16.3, TH / 2 + 0.2, 0.6, Math.PI / 2, 0, greenSheet);
  for (const z of [-2.4, 3.6]) put(new THREE.PlaneGeometry(3.7, TH - 0.4), '#3f7f5f', -14.4, TH / 2 + 0.2, z, 0, 0, greenSheet);
  for (const z of ZO) for (const h of [0.55, 1.15]) put(tubeX(3.8, 0.05), RAIL, -14.4, TH + h - 0.3, z);
  const towerSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshStandardMaterial({ map: signTexture('安全第一', 512, 160, '#2f8f57', '#ffffff'), roughness: 0.8 }));
  towerSign.position.set(-14.4, Y + 2.6, 3.7); scene.add(towerSign);

  // ---- concrete building under construction behind the deck (CC0 Meshy model) ----
  // (receives no shadows: the decimated shell self-shadows into a dark brown blotch)
  placeModel(gl.building_wip, [[0.5, -12.2, 0, 1.05]], { cast: true, receive: false, y: 0 });

  // ---- second building: concrete frame that grows with the player's skill (setFloors) ----
  const bld = new THREE.Group(); bld.position.set(18.5, 0, -9.5); scene.add(bld);
  const conc = M('#a7a49d'), concDark = M('#8f8d88');
  const floors = [];
  for (let f = 0; f < 8; f++) {
    const fl = new THREE.Group(); fl.position.y = f * 3; bld.add(fl);
    box(10, 0.3, 8, conc, 0, 3, 0, fl);
    for (const x of [-4.6, -1.5, 1.5, 4.6]) for (const z of [-3.6, 3.6]) box(0.45, 3, 0.45, concDark, x, 1.5, z, fl);
    floors.push(fl);
  }
  const rebar = new THREE.Group(); bld.add(rebar);
  for (const x of [-4.6, -1.5, 1.5, 4.6]) for (const z of [-3.6, 3.6]) { const r = cyl(0.03, 1.4, M('#8a4b2a'), rebar, 5); r.position.set(x, 0.7, z); }
  function setFloors(n) {
    n = Math.max(1, Math.min(8, n));
    floors.forEach((f, i) => { f.visible = i < n; });
    rebar.position.y = n * 3 + 0.3;
  }
  setFloors(2);

  // ---- tower crane ----
  const crane = new THREE.Group(); crane.position.set(6, 0, -27); scene.add(crane);
  const yellow = M('#d6a92e', { metalness: 0.3, roughness: 0.55 });
  const H = 31;
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const p = cyl(0.08, H, yellow, crane, 6); p.position.set(x, H / 2, z); }
  for (let yy = 1.1; yy < H; yy += 2.2) for (const s of [-1, 1]) {
    const d = cyl(0.04, 1.75, yellow, crane, 5); d.position.set(0, yy, s * 0.6); d.rotation.z = Math.PI / 4;
    const d2 = cyl(0.04, 1.75, yellow, crane, 5); d2.position.set(s * 0.6, yy, 0); d2.rotation.x = Math.PI / 4;
  }
  const jib = new THREE.Group(); jib.position.y = H; crane.add(jib);
  box(21, 0.5, 0.9, yellow, 6, 0.6, 0, jib);
  box(4, 1.2, 1.4, M('#5c5f63'), -4.2, 0.2, 0, jib);
  box(1.3, 1.3, 1.3, M('#e7e2d4'), 0, 1.4, 0, jib);
  box(0.3, 4, 0.3, yellow, 0, 3, 0, jib);
  const cable = cyl(0.02, 11, M('#333'), jib, 4); cable.position.set(14, -5, 0);
  pipePile(jib, 14, -11.2, 0, 2, 4, 3, 0, 0.08, '#8f9398');

  // ---- the yard below: pipe piles, H-beams, pallets, gravel, excavator, office, toilets ----
  pipePile(scene, -6, 0, 6.5, 3, 6, 4, 0.1);
  pipePile(scene, 4, 0, 7.2, 2, 5, 3.4, -0.3);
  pipePile(scene, -12, 0, 11.5, 3, 5, 4, 1.2);
  pipePile(scene, 18, 0, 12, 2, 6, 4, 0.5);
  for (const [x, z, s] of [[-9, 16.5, 2], [21, 4, 1.6], [3, 17, 2.2]]) {
    const g = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), M('#9b8f7e', { flatShading: true })); g.position.set(x, s * 0.3, z); g.scale.y = 0.42; g.castShadow = true; g.receiveShadow = true; scene.add(g);
  }
  for (const [x, z, ry] of [[-1, 11, 0.2], [9, 5.5, -0.1], [-18, 15, 0.6]]) {     // H-beams
    const P = at(x, z, ry);
    for (let k = 0; k < 3; k++) { P(0, 0.15 + k * 0.3, (k % 2) * 0.1, B(5, 0.3, 0.12), '#7a3b2a'); P(0, 0.29 + k * 0.3, (k % 2) * 0.1, B(5, 0.03, 0.3), '#7a3b2a'); P(0, 0.01 + k * 0.3, (k % 2) * 0.1, B(5, 0.03, 0.3), '#7a3b2a'); }
  }
  for (const [x, z, ry, n] of [[-3, 4.8, 0, 3], [7, 12, 0.4, 2], [-15, 7, -0.3, 3], [13, 3.5, 0.1, 2], [0, -0.6, 0, 2], [-7, -0.8, 0.1, 3]]) {   // pallets of cement bags
    const P = at(x, z, ry);
    for (let p = 0; p < n; p++) {
      P(p * 1.4, 0.07, 0, B(1.2, 0.14, 1.0), '#a07a4f');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) P(p * 1.4 + (c - 0.5) * 0.55, 0.23 + r * 0.17, 0, B(0.5, 0.16, 0.85), r % 2 ? '#d8d2c2' : '#cdc6b4');
    }
  }
  for (const [x, z] of [[2.5, 1.5], [-4.5, 2.2], [8, -0.2]]) for (let k = 0; k < 6; k++) put(B(0.4, 0.2, 0.2), '#b5b2aa', x + (k % 3) * 0.42, 0.1 + Math.floor(k / 3) * 0.2, z);  // block stacks under the deck
  for (const [x, z, ry] of [[-21, 9, 0.2], [20, 16, -0.4]]) put(B(3, 0.3, 1.1), '#b88a55', x, 0.15, z, ry); // timber
  placeModel(gl.excavator, [[11.5, 15, -2.3, 1]], { cast: true, y: 0 }); // "Excavator" by Anton Krupnov (CC BY), maker name painted out
  const office = at(-19, 10, 0.4);
  office(0, 1.35, 0, B(6, 2.7, 2.5), '#f3f3ef'); office(0, 2.75, 0, B(6.2, 0.12, 2.7), '#2f6fb0');
  const glass = '#6f8796';
  for (const x of [-1.8, 0, 1.8]) office(x, 1.6, 1.27, B(1.1, 0.8, 0.04), glass, 0, { roughness: 0.25 });
  office(2.4, 1.0, 1.27, B(0.8, 2, 0.04), '#9aa3aa');
  const offSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshStandardMaterial({ map: signTexture('現場事務所', 512, 120, '#ffffff', '#1d3b5c') }));
  offSign.position.set(-19 + Math.sin(0.4) * 1.31, 2.35, 10 + Math.cos(0.4) * 1.31); offSign.rotation.y = 0.4; scene.add(offSign);
  for (const [x, z] of [[-23.5, 6], [-24.8, 6]]) { put(B(1.1, 2.3, 1.1), '#3c7fc0', x, 1.15, z); put(B(1.2, 0.12, 1.2), '#2c5f93', x, 2.35, z); }
  for (const [x, z] of [[-4, 9], [0, 10], [4, 9.5], [14, 8], [22, 9], [-10, 4.5], [6, 17.5], [-2, 18]]) {
    put(new THREE.ConeGeometry(0.22, 0.7, 10), '#ff7a1a', x, 0.35, z);
    put(new THREE.CylinderGeometry(0.16, 0.18, 0.12, 10), '#f4f4f0', x, 0.42, z);
    put(B(0.42, 0.04, 0.42), '#222222', x, 0.02, z);
  }
  for (const [x, z, ry] of [[6, 12.5, 0.3], [-8, 13.5, -0.2], [2, 19.2, 0]]) {
    const c = Math.cos(ry), s = Math.sin(ry);
    for (let k = 0; k < 4; k++) put(B(0.4, 0.22, 0.12), k % 2 ? '#1d1d1d' : '#f2c230', x + (k - 1.5) * 0.4 * c, 0.75, z - (k - 1.5) * 0.4 * s, ry);
    put(B(0.08, 0.75, 0.08), '#8a8a8a', x - 0.8 * c, 0.37, z + 0.8 * s); put(B(0.08, 0.75, 0.08), '#8a8a8a', x + 0.8 * c, 0.37, z - 0.8 * s);
  }

  // ---- site fence: white panels with a green band, 安全第一 banners, gate on the south side ----
  const BRAND_FENCE_X = new Set([-18, 8]);
  for (let x = -26; x <= 26; x += 2) { put(B(1.95, 2, 0.06), '#f2f2ee', x, 1, -29); put(B(1.95, 0.25, 0.07), '#2f8f57', x, 1.65, -28.96); }
  for (let x = -26; x <= 26; x += 2) {
    if ((x >= 0 && x <= 6) || (x >= -8 && x <= -2)) continue;
    put(B(1.95, 2, 0.06), '#f2f2ee', x, 1, 21);
    if (!BRAND_FENCE_X.has(x)) put(B(1.95, 0.25, 0.07), '#2f8f57', x, 1.65, 20.96);
  }
  for (let z = -27; z <= 20; z += 2) for (const sx of [-27, 27]) { put(B(0.06, 2, 1.95), '#f2f2ee', sx, 1, z); put(B(0.07, 0.25, 1.95), '#2f8f57', sx - Math.sign(sx) * 0.04, 1.65, z); }
  for (const [x, z, ry] of [[-14, -28.9, 0], [10, -28.9, 0], [26.9, -6, -Math.PI / 2], [-26.9, 2, Math.PI / 2], [-12, 20.9, Math.PI], [14, 20.9, Math.PI]]) {
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), new THREE.MeshStandardMaterial({ map: signTexture('安全第一', 640, 128, '#2f8f57', '#ffffff'), roughness: 0.8 }));
    ban.position.set(x, 1.0, z); ban.rotation.y = ry; scene.add(ban);
  }
  // 2 contractor panels on the south fence (x = -18 and x = 8): black YABAI logo on the white fence + 施工 YABAI建設
  {
    const logoW = 1.48, logoH = logoW / BRAND_ASPECT;
    const logoGeo = new THREE.PlaneGeometry(logoW, logoH);
    const logoMat = new THREE.MeshStandardMaterial({ map: brandBlack, transparent: true, alphaTest: 0.05, depthWrite: false, roughness: 0.75 });
    const subGeo = new THREE.PlaneGeometry(1.48, 0.28);
    const subMat = new THREE.MeshStandardMaterial({ map: signTexture('施工 YABAI建設', 512, 96, '#f2f2ee', '#1d2733'), depthWrite: false, roughness: 0.8 });
    for (const fx of BRAND_FENCE_X) {
      for (const [fz, ry] of [[21.05, 0], [20.95, Math.PI]]) {
        const lg = new THREE.Mesh(logoGeo, logoMat);
        lg.position.set(fx, 1.24, fz); lg.rotation.y = ry; scene.add(lg);
        const sb = new THREE.Mesh(subGeo, subMat);
        sb.position.set(fx, 0.78, fz); sb.rotation.y = ry; scene.add(sb);
      }
    }
  }

  // ---- Saitama suburb: streets, houses ("Japanese Residential Home" 01–03 by Morrissey Alexander, CC BY),
  // tower blocks, street trees, far city ----
  const asphalt = M('#5d5f61', { roughness: 0.95 }), lineM = new THREE.MeshBasicMaterial({ color: '#e8e4d6' });
  for (const [x, z, w, d] of [[0, -34, 130, 7], [35, -6, 7, 62], [-35, -6, 7, 62], [0, 25, 77, 7]]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asphalt); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.02, z); r.receiveShadow = true; scene.add(r);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(w > d ? w : 0.12, w > d ? 0.12 : d), lineM);
    line.rotation.x = -Math.PI / 2; line.position.set(x, 0.03, z); scene.add(line);
  }
  // near rows (east and west in the shift's walking direction, and the south street walked every morning
  // and evening) use the detailed houses; the far north row uses the light ones
  const beigeN = [], woodN = [], beigeF = [], woodF = [];
  [-23, -9.5, 4, 17.5].forEach((z, i) => {
    (i % 2 ? woodN : beigeN).push([45.5, z, -Math.PI / 2, 1]);
    (i % 2 ? beigeN : woodN).push([-45.5, z + 2, Math.PI / 2, 1]);
  });
  for (let x = -52, i = 0; x <= 52; x += 13, i++) (i % 2 ? beigeF : woodF).push([x, -45, 0, 1]);
  for (const [x, i] of [[-13, 0], [13, 1], [26, 2]]) (i % 2 ? woodN : beigeN).push([x, 35, Math.PI, 1]); // −26 is the dorm, 0 the konbini
  placeModel(gl.house_beige, beigeN); placeModel(gl.house_wood, woodN);
  placeModel(gl.house_modern, beigeF); placeModel(gl.house_wood, woodF);
  // tower blocks ("LOW POLY - ASIAN TOWER BLOCK" by Colin.Greenall, CC BY; its shop signs are left out)
  placeModel(gl.apartment_lo, [[-30, -62, 0, 1], [16, -64, 0, 1], [63, 34, -Math.PI / 2, 1], [-63, 32, Math.PI / 2, 1], [60, -30, -Math.PI / 2, 1]]);
  // the trainees' dorm (さくら寮) on the south street, with vending machines by its entrance;
  // the morning walk goes from here along the street to the site gate
  // (PSX Japanese Apartment by Shazly, CC BY — a narrow concrete block with a たばこ shop downstairs)
  placeModel(gl.apartment, [[ROUTE.dorm.x, DORM_Z, Math.PI, 1]], { cast: true });
  const ryoSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), new THREE.MeshStandardMaterial({ map: signTexture('さくら寮', 512, 150, '#ffffff', '#3a2c23'), roughness: 0.8 }));
  ryoSign.position.set(ROUTE.dorm.x, 3.45, DORM_Z - 3.64 - 0.04); ryoSign.rotation.y = Math.PI; scene.add(ryoSign);
  for (const [k, dx] of [[0, 0], [1, 1.15]]) {
    const v = gl.vending.scene.clone(true); v.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    v.position.set(ROUTE.vending.x + dx, 0, ROUTE.vending.z + 0.9); v.rotation.y = Math.PI; scene.add(v); void k;
  }
  // small YABAI logo sticker on the side of the vending machine (not on the front glass)
  {
    const vw = 0.42, vh = vw / BRAND_ASPECT;
    const vSticker = new THREE.Mesh(
      new THREE.PlaneGeometry(vw, vh),
      new THREE.MeshStandardMaterial({ map: brandWhite, transparent: true, alphaTest: 0.05, depthWrite: false, roughness: 0.55 }),
    );
    vSticker.position.set(ROUTE.vending.x - 0.52, 1.35, ROUTE.vending.z + 0.88);
    vSticker.rotation.y = -Math.PI / 2;
    scene.add(vSticker);
  }
  // trash collection point (ゴミ集積所) beside the dorm entrance on the sidewalk: blue net box, 2 clusters
  // of trash_bags, and the Japanese collection schedule sign
  let handBag = null, droppedBag = null;
  {
    const tx = ROUTE.trash.x, tz = 29.36, nw = 1.54, nh = 0.86, nd = 0.82, fCol = '#1f65a6';
    placeModel(gl.trash_bags, [[tx - 0.34, tz, 0.25, 0.78], [tx + 0.32, tz + 0.02, -0.4, 0.72]], { cast: true, y: 0.01 });
    for (const sx of [-nw / 2, nw / 2]) for (const sz of [-nd / 2, nd / 2]) {
      put(tube(nh, 0.022), fCol, tx + sx, nh / 2, tz + sz);
    }
    for (const y of [0.02, nh]) {
      for (const sz of [-nd / 2, nd / 2]) put(tubeX(nw, 0.02), fCol, tx, y, tz + sz);
      for (const sx of [-nw / 2, nw / 2]) put(tubeZ(nd, 0.02), fCol, tx + sx, y, tz);
    }
    for (const sx of [-0.45, 0.45]) put(tube(1.75, 0.024), '#6b737b', tx + sx, 0.875, tz + nd / 2);
    const trashNetTex = canvasTexture(128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = 'rgba(35, 118, 200, 0.36)'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(18, 72, 138, 0.88)'; g.lineWidth = 2;
      for (let i = 0; i <= 128; i += 16) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
      }
    }, [3, 2]);
    const trashNetMat = new THREE.MeshStandardMaterial({
      map: trashNetTex, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false, roughness: 0.75,
    });
    const topNet = new THREE.Mesh(new THREE.PlaneGeometry(nw, nd), trashNetMat);
    topNet.rotation.x = -Math.PI / 2; topNet.position.set(tx, nh, tz); scene.add(topNet);
    for (const sz of [-nd / 2, nd / 2]) {
      const pNet = new THREE.Mesh(new THREE.PlaneGeometry(nw, nh), trashNetMat);
      pNet.position.set(tx, nh / 2, tz + sz); scene.add(pNet);
    }
    for (const sx of [-nw / 2, nw / 2]) {
      const sNet = new THREE.Mesh(new THREE.PlaneGeometry(nd, nh), trashNetMat);
      sNet.rotation.y = Math.PI / 2; sNet.position.set(tx + sx, nh / 2, tz); scene.add(sNet);
    }
    const schedTex = canvasTexture(512, 340, (g) => {
      g.fillStyle = '#fdfcf7'; g.fillRect(0, 0, 512, 340);
      g.strokeStyle = '#1f65a6'; g.lineWidth = 10; g.strokeRect(8, 8, 496, 324);
      g.fillStyle = '#1f65a6'; g.fillRect(14, 14, 484, 58);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 34px "Zen Maru Gothic", "Yu Gothic", sans-serif';
      g.fillText('ゴミ収集日', 256, 44);
      g.textAlign = 'left'; g.font = '700 26px "Zen Maru Gothic", "Yu Gothic", sans-serif';
      const rows = [
        ['#c0392b', '月・木  燃えるゴミ'],
        ['#b87314', '火      プラ'],
        ['#277a46', '水      資源ゴミ'],
        ['#2b578a', '金      燃えないゴミ'],
      ];
      rows.forEach(([col, txt], idx) => { g.fillStyle = col; g.fillText(txt, 44, 102 + idx * 44); });
      g.fillStyle = '#c0392b'; g.textAlign = 'center';
      g.font = '700 22px "Zen Maru Gothic", "Yu Gothic", sans-serif';
      g.fillText('朝8時までに出してください', 256, 296);
    });
    const schedBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.76),
      new THREE.MeshStandardMaterial({ map: schedTex, roughness: 0.65, side: THREE.DoubleSide }),
    );
    schedBoard.position.set(tx, 1.38, tz + nd / 2 - 0.02);
    schedBoard.rotation.y = Math.PI;
    scene.add(schedBoard);

    // Extract one bag from trash_bags (z >= 0 sub-mesh), scaled down for carrying in hand & placing
    handBag = new THREE.Group();
    gl.trash_bags.scene.updateMatrixWorld(true);
    gl.trash_bags.scene.traverse((o) => {
      if (!o.isMesh) return;
      const src = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const pos = src.attributes.position, idx = src.index;
      if (idx) {
        const keep = [];
        for (let i = 0; i < idx.count; i += 3) {
          const i0 = idx.getX(i), i1 = idx.getX(i + 1), i2 = idx.getX(i + 2);
          if (pos.getZ(i0) >= -0.02 && pos.getZ(i1) >= -0.02 && pos.getZ(i2) >= -0.02) keep.push(i0, i1, i2);
        }
        src.setIndex(keep);
      }
      src.translate(-0.05, -0.58, -0.25);
      const m = new THREE.Mesh(src, o.material);
      m.castShadow = true; m.receiveShadow = true;
      handBag.add(m);
    });
    handBag.scale.setScalar(0.55);
    droppedBag = handBag.clone(true);
    droppedBag.position.set(tx, 0.33, tz - 0.14);
    droppedBag.visible = false;
    scene.add(droppedBag);
  }
  // evening place on the south street: the konbini (fictional chain) — its sign glows at dusk/night,
  // with street lamps that only light up then. Money is also sent home from its counter (day 3).
  const glow = [];
  {
    // konbini: "Mini mart" by Pasha (Sketchfab, Free Standard). Its shop signs carry the model's own
    // store name: the two sign materials get our fictional chain's name instead (glTF UVs: flipY off)
    const K = ROUTE.konbini;
    const wide = signTexture('サクラマート  24h', 1024, 144, '#e8684f', '#ffffff');
    const tall = canvasTexture(128, 420, (g) => {
      g.fillStyle = '#e8684f'; g.fillRect(0, 0, 128, 420); g.fillStyle = '#ffffff';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 62px "Zen Maru Gothic", "Yu Gothic", sans-serif';
      [...'サクラ'].forEach((ch, k) => g.fillText(ch, 64, 70 + k * 72));
      g.font = '700 30px "Be Vietnam Pro", sans-serif'; g.fillText('24h', 64, 350);
    });
    for (const t of [wide, tall]) { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; }
    gl.minimart.scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = o.material.name.toLowerCase();
      const tex = n === 'material_15' ? wide : n === 'material_13' ? tall : null;
      if (tex) { o.material = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.6, side: THREE.DoubleSide }); glow.push(o.material); }
    });
    placeModel(gl.minimart, [[K.x, KONBINI_Z, Math.PI, 1]], { cast: true, y: 0 });
  }
  // supermarket storefront (スーパー さくら) on the opposite side of the street from the konbini,
  // clear of houses and pedestrian lanes, with canvas sign + タイムセール 19:30〜 board and night glow
  {
    const mx = ROUTE.market.x, mz = 20.05, mw = 5.4, mh = 3.5, md = 2.0;
    put(B(mw, mh, md), '#f5f2e9', mx, mh / 2, mz);
    put(B(mw + 0.2, 0.24, md + 0.25), '#277a46', mx, mh + 0.1, mz + 0.06);
    put(B(mw + 0.16, 0.56, 0.34), '#277a46', mx, 2.75, mz + md / 2 + 0.14);
    // sliding glass entrance and bright display windows (lit at dusk/night)
    put(B(1.65, 2.2, 0.08), '#2c3e50', mx - 0.85, 1.1, mz + md / 2 + 0.02);
    const winTex = canvasTexture(256, 128, (g) => {
      g.fillStyle = '#fff5d6'; g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#e8dfc4'; g.fillRect(0, 92, 256, 36);
      g.fillStyle = '#277a46'; g.fillRect(14, 18, 96, 22);
      g.fillStyle = '#d93829'; g.beginPath(); g.arc(196, 48, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.font = '800 18px "Zen Maru Gothic", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('半額', 196, 48);
    });
    const winMat = new THREE.MeshStandardMaterial({
      map: winTex, emissiveMap: winTex, emissive: '#fff2c2', emissiveIntensity: 0, roughness: 0.35,
    });
    glow.push(winMat);
    const doorPane = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 2.04), winMat);
    doorPane.position.set(mx - 0.85, 1.1, mz + md / 2 + 0.07); scene.add(doorPane);
    const showPane = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.45), winMat);
    showPane.position.set(mx + 1.25, 1.35, mz + md / 2 + 0.05); scene.add(showPane);
    // main illuminated fascia sign: スーパー さくら
    const mktSignTex = canvasTexture(640, 140, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 640, 140);
      g.strokeStyle = '#277a46'; g.lineWidth = 10; g.strokeRect(5, 5, 630, 130);
      g.fillStyle = '#277a46'; g.fillRect(14, 14, 165, 112);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 38px "Zen Maru Gothic", "Yu Gothic", sans-serif'; g.fillText('スーパー', 96, 70);
      g.fillStyle = '#c92a1d'; g.font = '900 58px "Zen Maru Gothic", "Yu Gothic", sans-serif';
      g.fillText('さくら', 395, 72);
    });
    const mktSignMat = new THREE.MeshStandardMaterial({
      map: mktSignTex, emissiveMap: mktSignTex, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.5,
    });
    glow.push(mktSignMat);
    const mktSign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.82), mktSignMat);
    mktSign.position.set(mx, 3.22, mz + md / 2 + 0.18); scene.add(mktSign);
    // small sidewalk sale board: タイムセール 19:30〜
    const saleTex = canvasTexture(256, 320, (g) => {
      g.fillStyle = '#ffd426'; g.fillRect(0, 0, 256, 320);
      g.strokeStyle = '#c92a1d'; g.lineWidth = 10; g.strokeRect(6, 6, 244, 308);
      g.fillStyle = '#c92a1d'; g.fillRect(14, 18, 228, 66);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 32px "Zen Maru Gothic", "Yu Gothic", sans-serif'; g.fillText('タイムセール', 128, 52);
      g.fillStyle = '#1d1d1d'; g.font = '900 40px "Be Vietnam Pro", sans-serif'; g.fillText('19:30〜', 128, 128);
      g.fillStyle = '#c92a1d'; g.font = '900 34px "Zen Maru Gothic", "Yu Gothic", sans-serif';
      g.fillText('2割引・半額', 128, 200);
      g.fillStyle = '#277a46'; g.font = '800 24px "Zen Maru Gothic", "Yu Gothic", sans-serif';
      g.fillText('お惣菜・精肉', 128, 266);
    });
    const saleMat = new THREE.MeshStandardMaterial({
      map: saleTex, emissiveMap: saleTex, emissive: '#fff4c8', emissiveIntensity: 0, roughness: 0.55, side: THREE.DoubleSide,
    });
    glow.push(saleMat);
    put(B(0.56, 0.72, 0.06), '#8a5a34', mx + 2.25, 0.38, mz + md / 2 + 0.32);
    const saleBoard = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.65), saleMat);
    saleBoard.position.set(mx + 2.25, 0.4, mz + md / 2 + 0.36); scene.add(saleBoard);
  }
  // signpost at the east end of the street: the way to the station (the platform is its own stage)
  {
    const tex = canvasTexture(384, 128, (g) => {
      g.fillStyle = '#2f5d9a'; g.fillRect(0, 0, 384, 128); g.fillStyle = '#ffffff'; g.fillRect(6, 6, 372, 116);
      g.fillStyle = '#2f5d9a'; g.fillRect(12, 12, 360, 104);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 22px "Zen Maru Gothic", "Yu Gothic", sans-serif'; g.fillText('この先', 192, 28);
      g.font = '700 52px "Zen Maru Gothic", "Yu Gothic", sans-serif'; g.fillText('🚉 さくら駅', 192, 66);
      g.font = '600 20px "Be Vietnam Pro", sans-serif'; g.fillText('Sakura Station', 192, 102);
    });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), M('#7b8590', { metalness: 0.4 }));
    post.position.set(ROUTE.station.x + 1.4, 1.6, 23.0); post.castShadow = true; scene.add(post);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.6 }));
    sign.position.set(ROUTE.station.x + 1.35, 2.75, 23.0); sign.rotation.y = -Math.PI / 2; scene.add(sign); // faces the player walking east
  }
  // signpost on the south sidewalk at the head of the street: the way to Sakura Shrine (⛩ さくら神社 →)
  {
    const sTex = canvasTexture(384, 128, (g) => {
      g.fillStyle = '#fdf8ec'; g.fillRect(0, 0, 384, 128);
      g.strokeStyle = '#c92a1d'; g.lineWidth = 10; g.strokeRect(6, 6, 372, 116);
      g.fillStyle = '#c92a1d'; g.fillRect(14, 14, 356, 34);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 20px "Zen Maru Gothic", "Yu Gothic", sans-serif'; g.fillText('参道入口 · Lối vào đền', 192, 31);
      g.fillStyle = '#1d1d1d'; g.font = '900 42px "Zen Maru Gothic", "Yu Gothic", sans-serif';
      g.fillText('⛩ さくら神社 →', 192, 84);
    });
    const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.7, 8), M('#6b4a30'));
    sPost.position.set(ROUTE.shrine.x + 1.2, 1.35, 29.15); sPost.castShadow = true; scene.add(sPost);
    const sBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.55), new THREE.MeshStandardMaterial({ map: sTex, side: THREE.DoubleSide, roughness: 0.65 }));
    sBoard.position.set(ROUTE.shrine.x + 1.14, 2.35, 29.15); sBoard.rotation.y = -Math.PI / 2; scene.add(sBoard);
  }
  // LED street lights (CC0 Meshy model): pole on the south sidewalk, the head reaching over the street.
  // The model's arm points +z from its pole, so it is turned around: pole at z 29.0, head at ≈ 27.2.
  const lampHeads = [], lampLights = [], LAMPS = [-21, -7, 7];
  placeModel(gl.streetlight, LAMPS.map((x) => [x, 29.0 - 1.11, Math.PI, 1]), { cast: true, y: 0 });
  for (const x of LAMPS) {
    const head = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.62), new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: '#ffe2a8', emissiveIntensity: 0, side: THREE.DoubleSide }));
    head.rotation.x = Math.PI / 2; head.position.set(x, 4.78, 29.0 - 1.11 - 0.67); scene.add(head); lampHeads.push(head.material);
    const l = new THREE.PointLight(0xffc98a, 0, 16, 1.6); l.position.set(x, 4.4, 27.3); l.visible = false; scene.add(l); lampLights.push(l);
  }
  { const l = new THREE.PointLight(0xf2f6ff, 0, 10, 1.5); l.position.set(ROUTE.konbini.x, 2.4, KONBINI_SIGN.z - 1.2); l.visible = false; scene.add(l); lampLights.push(l); } // shop light spilling out
  { const l = new THREE.PointLight(0xfff4d6, 0, 10, 1.5); l.position.set(ROUTE.market.x, 2.5, 22.1); l.visible = false; scene.add(l); lampLights.push(l); } // supermarket light spilling out
  // Rooftop YABAI billboard on the building across the street from the construction site (x = -2.4, z = 30.55)
  let billboardLogo = null, billboardStdMat = null, billboardBasicMat = null;
  {
    const bx = -2.4, by = 4.95, bz = 30.55, bry = Math.PI + 0.35; // by 4.35 hid the tagline behind the roof eave seen from the street
    const bb = new THREE.Group();
    bb.position.set(bx, by, bz);
    bb.rotation.y = bry;
    scene.add(bb);
    const frameMat = M('#4a5058', { metalness: 0.55, roughness: 0.45 });
    const boardMat = M('#1c1f26', { roughness: 0.7 });
    // steel support columns and rear diagonal struts standing on the roof
    for (const lx of [-1.75, 0, 1.75]) {
      box(0.1, 1.75, 0.1, frameMat, lx, 0.875, -0.08, bb);
      const strut = box(0.08, 1.45, 0.08, frameMat, lx, 0.62, -0.52, bb);
      strut.rotation.x = 0.58;
    }
    // outer metal frame + dark #1c1f26 backing panel
    box(4.56, 1.68, 0.14, frameMat, 0, 1.02, 0, bb);
    box(4.38, 1.50, 0.16, boardMat, 0, 1.02, 0.01, bb);
    // white YABAI logo (~ 4 x 1 m, exact 845:213 aspect ratio)
    const lw = 4.0, lh = lw / BRAND_ASPECT;
    billboardStdMat = new THREE.MeshStandardMaterial({
      map: brandWhite, transparent: true, alphaTest: 0.05, depthWrite: false, roughness: 0.5,
    });
    billboardBasicMat = new THREE.MeshBasicMaterial({
      map: brandWhite, transparent: true, alphaTest: 0.05, depthWrite: false,
    });
    billboardLogo = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), billboardStdMat);
    billboardLogo.position.set(0, 1.18, 0.11);
    bb.add(billboardLogo);
    // small Japanese canvas tagline below the logo
    const subTex = signTexture('日本で生きる', 640, 64, '#1c1f26', '#eef2f7');
    const subMat = new THREE.MeshStandardMaterial({
      map: subTex, emissiveMap: subTex, emissive: '#ffffff', emissiveIntensity: 0, depthWrite: false, roughness: 0.6,
    });
    glow.push(subMat);
    const subMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.30), subMat);
    subMesh.position.set(0, 0.46, 0.11);
    bb.add(subMesh);
    // single weak PointLight for the billboard at dusk/night
    const bl = new THREE.PointLight(0xeef4ff, 0, 9, 1.5);
    bl.userData.scale = 0.38;
    bl.position.set(bx - Math.sin(0.35) * 1.1, by + 1.05, bz - Math.cos(0.35) * 1.1);
    bl.visible = false;
    scene.add(bl);
    lampLights.push(bl);
  }
  // a second row of light houses behind the near rows, so the street does not end at one row
  placeModel(gl.house_modern, [
    ...[-5.5, 8, 21.5].map((z, i) => [58.5, z, -Math.PI / 2 + (i % 2) * Math.PI, 1]),
    ...[-26, -12.5, 1, 14.5].map((z, i) => [-58.5, z, Math.PI / 2 - (i % 2) * Math.PI, 1]),
    ...[-52, -13, 33, 46].map((x, i) => [x, -58.5, (i % 2) * Math.PI, 1]),
  ], { receive: false });

  function tree(x, z, s = 1) {
    put(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 2.2 * s, 6), '#6b4e36', x, 1.1 * s, z);
    for (const [ox, oy, oz, r] of [[0, 2.9, 0, 1.25], [0.7, 2.5, 0.3, 0.9], [-0.6, 2.6, -0.3, 0.95], [0.1, 3.5, 0.1, 0.8]]) {
      put(new THREE.IcosahedronGeometry(r * s, 1), '#6f9e55', x + ox * s, oy * s, z + oz * s, 0, 0, { roughness: 0.9 });
    }
  }
  for (let x = -54; x <= 54; x += 13) tree(x + 6.5, -38, 0.9);
  for (const z of [-16, 11]) { tree(39, z, 0.85); tree(-39, z + 2, 0.85); }
  // town beyond the suburb: street grid, houses, apartments, skyline, mountains, clouds
  const APTS = [[-30, -62], [16, -64], [63, 34], [-63, 32], [60, -30]];
  const backdrop = buildBackdrop(scene, {
    houseLight: gl.house_beige,
    isFree: (x, z) => !(Math.abs(x) < 66 && z > -66 && z < 48) && APTS.every(([ax, az]) => Math.hypot(x - ax, z - az) > 12),
  });

  // merge everything static into one mesh per material
  for (const [m, list] of batch) {
    const mesh = new THREE.Mesh(mergeGeometries(list, false), m);
    mesh.castShadow = !m.transparent; mesh.receiveShadow = true; scene.add(mesh);
  }

  // utility poles with sagging wires along the streets
  const poleM = M('#8c867b'), wireM = new THREE.MeshBasicMaterial({ color: '#2b2b2b' });
  function poleLine(points) {
    const tops = [];
    for (const [x, z] of points) {
      const p = cyl(0.13, 10, poleM, scene, 6); p.position.set(x, 5, z);
      const arm = box(1.6, 0.1, 0.1, poleM, x, 9.2, z, scene); arm.castShadow = false;
      box(0.35, 0.5, 0.35, M('#6f7a80'), x + 0.3, 8.4, z, scene);
      tops.push(new THREE.Vector3(x, 9.25, z));
    }
    for (let i = 0; i + 1 < tops.length; i++) for (const off of [-0.7, 0, 0.7]) {
      const a = tops[i].clone(), b = tops[i + 1].clone(); a.x += off; b.x += off;
      const mid = a.clone().lerp(b, 0.5); mid.y -= 0.9;
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 12, 0.018, 3, false), wireM));
    }
  }
  poleLine([[-50, -30.5], [-36, -30.5], [-22, -30.5], [-8, -30.5], [6, -30.5], [20, -30.5], [34, -30.5], [48, -30.5]]);
  poleLine([[31.5, 18], [31.5, 4], [31.5, -10], [31.5, -24]]);
  poleLine([[-31.5, 18], [-31.5, 4], [-31.5, -10], [-31.5, -24]]);

  // ---- gameplay props on the deck: 3 pipe stacks (short/med/long) on the left and 3 rack slots (A/B/C) on the right ----
  const stackGroups = {}, rackGroups = {};
  const rackM = M('#d9a62e', { metalness: 0.3, roughness: 0.5 });
  const stack = new THREE.Group();
  scene.add(stack);

  for (const k of PIPE_ORDER) {
    const info = PIPE_KINDS[k];
    const sg = new THREE.Group();
    sg.position.set(info.stack.x, Y, info.stack.z);
    pipePile(sg, 0, 0, 0, 2, 4, info.len * 0.72, 0, 0.075, '#9a9ea3');
    // Painted pipe-end marker cap & sign (短 A / 中 B / 長 C)
    const endMat = M(info.color, { roughness: 0.45 });
    for (const sx of [-info.len * 0.36, info.len * 0.36]) {
      box(0.06, 0.24, 0.52, endMat, sx, 0.14, 0, sg);
    }
    const lblSign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.32),
      new THREE.MeshStandardMaterial({ map: signTexture(`${info.jp} (${info.vi})`, 256, 112, info.color, '#ffffff'), side: THREE.DoubleSide, roughness: 0.6 }),
    );
    lblSign.position.set(0.45, 0.62, 0);
    lblSign.rotation.y = Math.PI / 2;
    sg.add(lblSign);
    scene.add(sg);
    stackGroups[k] = sg;

    // Matching rack slot (A / B / C) on the right
    const rg = new THREE.Group();
    rg.position.set(info.rack.x, Y, info.rack.z);
    for (const z of [-0.45, 0.45]) for (const x of [-0.42, 0.42]) {
      const p = box(0.07, 0.95, 0.07, rackM, x, 0.475, z, rg);
      p.castShadow = true;
    }
    for (const z of [-0.45, 0.45]) box(0.92, 0.07, 0.08, rackM, 0, 0.14, z, rg);
    const slotSign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 0.34),
      new THREE.MeshStandardMaterial({ map: signTexture(`Ô ${info.slot} · ${info.jp}`, 256, 112, info.color, '#ffffff'), side: THREE.DoubleSide, roughness: 0.6 }),
    );
    slotSign.position.set(-0.48, 0.76, 0);
    slotSign.rotation.y = -Math.PI / 2;
    rg.add(slotSign);
    scene.add(rg);
    rackGroups[k] = rg;
  }

  const rack = new THREE.Group();
  rack.position.set(SITE.RACK.x, Y, PIPE_KINDS.med.rack.z);
  scene.add(rack);
  const placed = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.055, 1.8, 8), M('#9a9ea3', { metalness: 0.6, roughness: 0.4 }), 60);
  placed.count = 0; placed.castShadow = true; rack.add(placed);
  const pm = new THREE.Matrix4(), pq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), pv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  function setPlaced(n) {
    const k = Math.min(60, n * 4);
    for (let i = 0; i < k; i++) {
      const slotIdx = Math.floor(i / 4) % 3;
      const slotZ = PIPE_KINDS[PIPE_ORDER[slotIdx]].rack.z - PIPE_KINDS.med.rack.z;
      const row = Math.floor(i / 12);
      pv.set(0, 0.22 + row * 0.12, slotZ + ((i % 4) - 1.5) * 0.13);
      pm.compose(pv, pq, one);
      placed.setMatrixAt(i, pm);
    }
    placed.count = k; placed.instanceMatrix.needsUpdate = true;
  }

  function setActiveKinds(pipeKinds = 3) {
    const n = Math.max(1, Math.min(3, pipeKinds || 3));
    PIPE_ORDER.forEach((k, idx) => {
      const vis = idx < n;
      if (stackGroups[k]) stackGroups[k].visible = vis;
      if (rackGroups[k]) rackGroups[k].visible = vis;
    });
  }

  // bundle carried on the right shoulder: outer group follows the body's yaw, inner group tilts
  // the pipes so the front end rises a little (as in the art reference) and carries the wobble
  const bundle = new THREE.Group(), tilt = new THREE.Group(); bundle.add(tilt);
  tilt.rotation.set(-0.3, -0.55, 0, 'YXZ'); // front end up and out to the right, back end across the back
  const pipeM = M('#a3a7ad', { metalness: 0.65, roughness: 0.3 });
  const bundleEndMat = M(PIPE_KINDS.short.color, { roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const px = (i % 2) * 0.085 - 0.042, py = Math.floor(i / 2) * 0.08;
    const p = cyl(0.042, 2.6, pipeM, tilt, 10); p.rotation.x = Math.PI / 2; p.position.set(px, py, 0.35);
    const capF = cyl(0.045, 0.16, bundleEndMat, tilt, 10); capF.rotation.x = Math.PI / 2; capF.position.set(px, py, 1.58);
    const capB = cyl(0.045, 0.16, bundleEndMat, tilt, 10); capB.rotation.x = Math.PI / 2; capB.position.set(px, py, -0.88);
  }
  for (const z of [-0.3, 0.9]) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.016, 6, 16), M('#55585c', { metalness: 0.5 })); band.position.set(0, 0.04, z); tilt.add(band); }
  bundle.userData.tilt = tilt;
  bundle.visible = false; scene.add(bundle);
  function setBundleKind(kind) {
    const info = PIPE_KINDS[kind] || PIPE_KINDS.short;
    bundleEndMat.color.set(info.color);
  }

  // dropped bundle that falls onto the deck and fades
  const fallen = bundle.clone(); fallen.visible = false; scene.add(fallen);
  let fallT = 0;
  function dropAt(p) { fallen.position.copy(p); fallen.rotation.set(0, Math.random() * 3, 0); fallen.visible = true; fallT = 1.2; }

  // target ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = Y + 0.03; scene.add(ring);
  const trashRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.04, 8, 40), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
  trashRing.rotation.x = -Math.PI / 2; trashRing.position.set(ROUTE.trash.x, 0.03, ROUTE.trash.z); trashRing.visible = false; scene.add(trashRing);
  function setTrashDropped(on) { if (droppedBag) droppedBag.visible = !!on; }

  // rain: instanced streaks around the camera
  const RN = 600, rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.5, 0.012), new THREE.MeshBasicMaterial({ color: '#d6e4ee', transparent: true, opacity: 0.55 }), RN);
  const rs = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) rs.set([(Math.random() - 0.5) * 30, Math.random() * 16, (Math.random() - 0.5) * 24], i * 3);
  rain.visible = false; rain.frustumCulled = false; scene.add(rain);
  const rm = new THREE.Matrix4(), rq = new THREE.Quaternion(), rv = new THREE.Vector3();

  const look = { sky: SKY.clone(), sun: 2.4, hemi: 0.95 };
  function setWeather({ rain: isRain = false, pm = false } = {}) {
    rain.visible = isRain;
    // afternoon is only a warm tint: the art reference keeps a clear blue sky
    scene.background.copy(isRain ? new THREE.Color('#8e9aa3') : pm ? new THREE.Color('#b9cfda') : look.sky);
    scene.fog.color.set(isRain ? '#9aa4ab' : pm ? '#e3dccf' : '#d3dde0');
    scene.fog.density = isRain ? 0.011 : 0.0068;
    isRain ? sky.setColors('#8796a0', '#a7b0b5') : pm ? sky.setColors('#86b4d6', '#ebdfcb') : sky.setColors('#74aedb', '#dbe5e8');
    sun.intensity = look.sun * (isRain ? 0.45 : pm ? 0.85 : 1);
    sun.color.set(pm ? 0xffc48a : 0xfff0dc);
    hemi.intensity = look.hemi; fill.intensity = isRain ? 0.45 : 0.75; fill.color.set(0xe6eeff);
    backdrop.setWeather(isRain);
    setLamps(0);
  }
  function setLamps(k) {
    if (billboardLogo) billboardLogo.material = k > 0 ? billboardBasicMat : billboardStdMat;
    for (const m of glow) m.emissiveIntensity = k * 0.9;
    for (const m of lampHeads) m.emissiveIntensity = k * 2;
    for (const l of lampLights) { l.visible = k > 0; l.intensity = k * 9 * (l.userData.scale || 1); }
  }
  /** Dusk after the afternoon shift, night on the way home (call after setWeather). */
  function setTime(which) {
    if (which === 'day') return setWeather({});
    const dusk = which === 'dusk';
    scene.background.set(dusk ? '#e9a77f' : '#27324f');
    scene.fog.color.set(dusk ? '#d9a98a' : '#2c3552');
    scene.fog.density = dusk ? 0.0075 : 0.009;
    dusk ? sky.setColors('#6e7fb0', '#f0b48a') : sky.setColors('#101a33', '#34406a');
    sun.intensity = dusk ? 1.1 : 0.22; sun.color.set(dusk ? 0xff9a5c : 0x8fa4d8);
    hemi.intensity = dusk ? 0.6 : 0.32;
    fill.intensity = dusk ? 0.35 : 0.12; fill.color.set(dusk ? 0xb8b8e0 : 0x6f80b8);
    backdrop.setTone(which);
    setLamps(dusk ? 0.7 : 1);
  }

  return {
    scene, sun, bundle, ring, trashRing, handBag, setTrashDropped, setFloors, setPlaced, setBundleKind, setActiveKinds, setWeather, setTime, dropAt, stack,
    showcase: { pos: new THREE.Vector3(9, Y + 4.5, 12), look: new THREE.Vector3(-2, Y - 2, -3) },
    update(dt, t, focus) {
      jib.rotation.y = Math.sin(t * 0.12) * 0.55 + 0.35;
      if (trashRing.visible) trashRing.scale.setScalar(1 + Math.sin(t * 6) * 0.05);
      if (fallT > 0) { fallT -= dt; fallen.position.y = Math.max(Y + 0.1, fallen.position.y - dt * 9); if (fallT <= 0) fallen.visible = false; }
      if (rain.visible) {
        for (let i = 0; i < RN; i++) {
          const k = i * 3; rs[k + 1] -= dt * 14; if (rs[k + 1] < 0) rs[k + 1] += 16;
          rv.set(focus.x + rs[k], focus.y - 4 + rs[k + 1], focus.z + rs[k + 2]); rm.compose(rv, rq, one); rain.setMatrixAt(i, rm);
        }
        rain.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

/** Ground workers wander inside boxes in the yard below the deck ([x, z, xRange, zRange]). */
export const WANDER = [[-6, 8.5, 10, 4], [6, 9.5, 8, 4], [16, 7, 6, 5], [-14, 14, 8, 4], [2, 14.5, 10, 3], [-20, 16, 4, 3], [12, 18.5, 6, 2]];
