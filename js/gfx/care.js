// Care home dining room (食堂), Tokyo — layout from j3Care in the original (spec §16): checkered floor,
// a big window onto green hills, 食堂 and お知らせ boards, four tables with chairs, four residents in
// wheelchairs, plants and a steel cart. Furniture is CC0 Meshy community models (baked in Blender).
// The front wall is left open so the camera can look in.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture, signTexture, makeSun, loadModel } from './stage.js';

export const CARE_ROOM = {
  bounds: { x0: -8.4, x1: 8.4, z0: -6.3, z1: 6.3 },
  start: { x: 0, z: 4.2, yaw: Math.PI },
  nurse: { x: -7.2, z: -0.2 },
  // residents: [x, z, facing] — they sit in wheelchairs at the tables
  folk: [[-2.6, 1.1, 0.9], [2.8, 2.9, -2.2], [3.2, -1.8, -1], [-1.6, -1.6, 0.4]],
  tables: [[-5.4, -2, 0], [0.2, -3.6, 0], [5.4, 0.2, 0], [-5.8, 3.2, 0]],
  showcase: { pos: [-5.5, 2.4, 3.4], look: [-8.9, 2.7, 3.4] },
};

export async function buildCare() {
  const [table, chair, wheel, plant, cart] = await Promise.all(['dtable', 'chair', 'wheelchair', 'plant', 'cart'].map(loadModel));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f6dfae');
  const hemi = new THREE.HemisphereLight(0xfff0d0, 0xb98a50, 1.0); scene.add(hemi);
  const sun = makeSun(scene, { color: 0xffeccb, intensity: 1.9, size: 10, offset: [4, 10, 6] });
  const W = 9, D = 7, H = 4.2;

  const batch = new Map(), mats = {};
  const col = (c, o = {}) => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1);
  function put(geo, m, x, y, z, ry = 0) {
    e.set(0, ry, 0); q.setFromEuler(e); p.set(x, y, z);
    let g = geo.applyMatrix4(m4.compose(p, q, s1)); if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!batch.has(m)) batch.set(m, []); batch.get(m).push(g);
  }
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // checkered floor (18 × 14 tiles) and a rug
  const floorTex = canvasTexture(64, 64, (g) => {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#e5b56e' : '#f3d08d'; g.fillRect(i * 32, j * 32, 32, 32); }
  }, [9, 7]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshStandardMaterial({ color: '#e8df9a', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.005, 1.5); rug.receiveShadow = true; scene.add(rug);

  // walls (back, left, right), skirting, handrail, ceiling beam
  const wall = col('#fbeccc');
  put(B(W * 2, H, 0.15), wall, 0, H / 2, -D);
  put(B(0.15, H, D * 2), wall, -W, H / 2, 0);
  put(B(0.15, H, D * 2), wall, W, H / 2, 0);
  const wood = col('#c98a44');
  for (const [x, z, w, d] of [[0, -D + 0.1, W * 2, 0.06], [-W + 0.1, 0, 0.06, D * 2], [W - 0.1, 0, 0.06, D * 2]]) put(B(w, 0.22, d), wood, x, 0.11, z);
  for (const [x, z, w, d] of [[0, -D + 0.16, W * 2, 0.08], [-W + 0.16, 0, 0.08, D * 2], [W - 0.16, 0, 0.08, D * 2]]) put(B(w, 0.07, d), col('#d6a660'), x, 0.95, z); // handrail
  put(B(W * 2, 0.2, 0.3), col('#8a6a44'), 0, H - 0.1, -D + 0.15);
  // big window onto green hills
  const view = canvasTexture(256, 128, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#9fd0ef'); gr.addColorStop(1, '#e8f4f8'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#9cc77a'; g.beginPath(); g.moveTo(0, 90); g.quadraticCurveTo(70, 52, 140, 84); g.quadraticCurveTo(200, 60, 256, 80); g.lineTo(256, 128); g.lineTo(0, 128); g.fill();
    g.fillStyle = '#7fae5f'; g.beginPath(); g.moveTo(0, 108); g.quadraticCurveTo(110, 82, 256, 104); g.lineTo(256, 128); g.lineTo(0, 128); g.fill();
    g.fillStyle = '#ffffff'; for (const [x, y] of [[40, 22], [150, 30], [210, 16]]) { g.beginPath(); g.ellipse(x, y, 22, 7, 0, 0, Math.PI * 2); g.fill(); }
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: view })); win.position.set(-1.5, 2.1, -D + 0.09); scene.add(win);
  for (const [w, h, x, y] of [[6.2, 0.14, -1.5, 3.62], [6.2, 0.14, -1.5, 0.58], [0.14, 3.1, -4.6, 2.1], [0.14, 3.1, 1.6, 2.1], [0.08, 3, -1.5, 2.1]]) put(B(w, h, 0.1), col('#d6a660'), x, y, -D + 0.12);
  // 食堂 sign and the notice board with three papers
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshStandardMaterial({ map: signTexture('食堂', 256, 96, '#fff8e8', '#8a5a2b') }));
  sign.position.set(-6.8, 3.1, -D + 0.1); scene.add(sign);
  const notice = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshStandardMaterial({ map: signTexture('お知らせ', 256, 72, '#2f6fb0', '#ffffff') }));
  notice.position.set(5.6, 3.05, -D + 0.1); scene.add(notice);
  put(B(2.6, 1.4, 0.05), col('#c9a27a'), 5.0, 2.2, -D + 0.1);
  for (const [x, y, c] of [[4.3, 2.3, '#ffffff'], [5.0, 2.1, '#fff2b8'], [5.7, 2.35, '#ffd9e0']]) put(B(0.5, 0.65, 0.02), col(c), x, y, -D + 0.14);
  // cabinet
  put(B(1.2, 1.8, 0.6), col('#b07a46'), -8.1, 0.9, -3.2, Math.PI / 2);
  for (const [m, list] of batch) { const mesh = new THREE.Mesh(mergeGeometries(list, false), m); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); }

  // furniture: Meshy models drawn instanced (one draw call each)
  const sv = new THREE.Vector3();
  function placeModel(gltf, list, cast = true) {
    gltf.scene.updateMatrixWorld(true);
    const srcs = []; gltf.scene.traverse((o) => { if (o.isMesh) srcs.push(o); });
    for (const src of srcs) {
      const im = new THREE.InstancedMesh(src.geometry, src.material, list.length);
      list.forEach(([x, z, ry, s = 1], i) => { e.set(0, ry, 0); q.setFromEuler(e); p.set(x, 0, z); sv.set(s, s, s); m4.compose(p, q, sv).multiply(src.matrixWorld); im.setMatrixAt(i, m4); });
      im.castShadow = cast; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
    }
  }
  placeModel(table, CARE_ROOM.tables.map(([x, z, ry]) => [x, z, ry, 1.2]));
  const chairs = [];
  for (const [x, z] of CARE_ROOM.tables) for (const dx of [-0.6, 0.6]) chairs.push([x + dx, z - 0.95, 0]);
  placeModel(chair, chairs);
  // wheelchairs: the model faces +z like the residents, so it takes the same turn
  placeModel(wheel, CARE_ROOM.folk.map(([x, z, ry]) => [x, z, ry, 1]));
  placeModel(plant, [[-7.9, -5.8, 0, 1.05], [8, -6, 1.2, 1.1]]);
  placeModel(cart, [[6.6, -3.8, -0.4, 1]]);

  // blockers for walking: tables (two circles each), residents, cabinet, plants, cart
  const blocks = [];
  for (const [x, z] of CARE_ROOM.tables) { blocks.push({ x: x - 0.7, z, r: 0.8 }, { x: x + 0.7, z, r: 0.8 }); }
  for (const [x, z] of CARE_ROOM.folk) blocks.push({ x, z, r: 0.68 });
  blocks.push({ x: -8.1, z: -3.2, r: 0.7 }, { x: -7.9, z: -5.8, r: 0.45 }, { x: 8, z: -6, r: 0.45 }, { x: 6.6, z: -3.8, r: 0.7 });

  return {
    scene, sun, blocks,
    showcase: { pos: new THREE.Vector3(...CARE_ROOM.showcase.pos), look: new THREE.Vector3(...CARE_ROOM.showcase.look) },
    update() {},
  };
}
