// Details for the south street walked every morning and evening (player request: a richer street).
// A Japanese residential street has no raised sidewalk: white edge lines, a green walking strip on the
// school-route side, gutters with grates, manholes, a zebra crossing with 止まれ, a stop sign and a curve
// mirror, bicycles parked by the konbini and the dorm, potted plants by the doors, a kei truck at the kerb.
// Models (CC BY, Sketchfab): "Low Poly Bicycles" (EdwiixGG), "Simple Kei Truck" (Spookyghostboo, maker
// emblem removed), "Optimized Potted Plants" (Nicholas-3D). Everything else is drawn here.
import * as THREE from 'three';
import { canvasTexture, signTexture } from './stage.js';

export const STREET = {
  z: 25, x0: -38, x1: 38,        // the road strip of the south street (z 21.5 .. 28.5)
  edgeN: 21.85, edgeS: 28.15,    // white edge lines (外側線)
  green: [27.62, 28.08],         // green walking strip on the dorm side (グリーンベルト)
  crossX: 3,                     // zebra crossing at the site gate
};

/** asphalt with grain, cracks and darker patches (repeats along every road) */
export function asphaltTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#5c5e60'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 70 + Math.random() * 45; g.fillStyle = `rgb(${v},${v + 1},${v + 3})`; g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); }
    g.fillStyle = 'rgba(40,40,42,.25)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 30, 10 + Math.random() * 18, Math.random() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(30,30,32,.55)'; g.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  }, [1, 1]);
}

export function buildStreetDetails(scene, gl) {
  const S = STREET, flat = (w, d, mat, x, z, y = 0.031) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
  const paint = new THREE.MeshStandardMaterial({ color: '#ecebe4', roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const len = S.x1 - S.x0, cx = (S.x0 + S.x1) / 2;
  // edge lines and a dashed centre line
  flat(len, 0.15, paint, cx, S.edgeN); flat(len, 0.15, paint, cx, S.edgeS);
  for (let x = S.x0 + 1.5; x < S.x1; x += 5) if (Math.abs(x - S.crossX) > 3) flat(3, 0.12, paint, x, S.z);
  // green walking strip (school route) on the dorm side, interrupted at the crossing
  const greenM = new THREE.MeshStandardMaterial({ color: '#3f8f5a', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const gw = S.green[1] - S.green[0], gz = (S.green[0] + S.green[1]) / 2;
  flat(S.crossX - 2 - S.x0, gw, greenM, (S.x0 + S.crossX - 2) / 2, gz); flat(S.x1 - S.crossX - 2, gw, greenM, (S.crossX + 2 + S.x1) / 2, gz);
  // zebra crossing at the gate and 止まれ painted before it
  for (let z = S.edgeN + 0.45; z < S.edgeS - 0.3; z += 0.9) flat(3.2, 0.45, paint, S.crossX, z + 0.22, 0.032);
  const tomare = new THREE.MeshStandardMaterial({ map: canvasTexture(256, 128, (g) => { g.fillStyle = '#ecebe4'; g.font = 'bold 96px "Noto Sans JP", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('止まれ', 128, 68); }), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const tm = flat(2.4, 1.2, tomare, S.crossX - 3.4, 26.4, 0.032); tm.rotation.z = -Math.PI / 2; // readable when driving east towards the crossing
  // gutters with grates along both edges
  const grate = new THREE.MeshStandardMaterial({ map: canvasTexture(64, 32, (g) => { g.fillStyle = '#8f8d86'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#3c3b38'; for (let x = 4; x < 64; x += 6) g.fillRect(x, 5, 3, 22); }, [len / 1.2, 1]), roughness: 0.9 });
  flat(len, 0.32, grate, cx, S.z - 3.3, 0.028); flat(len, 0.32, grate, cx, S.z + 3.38, 0.028);
  // manholes
  const mh = new THREE.MeshStandardMaterial({ map: canvasTexture(128, 128, (g) => { g.fillStyle = '#4a4a46'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#6d6b65'; g.lineWidth = 5; for (let r = 18; r < 60; r += 13) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.stroke(); } for (let a = 0; a < 8; a++) { g.save(); g.translate(64, 64); g.rotate(a * Math.PI / 4); g.fillStyle = '#6d6b65'; g.fillRect(-2, 8, 4, 50); g.restore(); } }), transparent: true, roughness: 0.6, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  for (const [x, z] of [[-24, 24.2], [-9, 25.8], [12, 24.4], [24, 25.6]]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), mh); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.033, z); scene.add(d); }

  // stop sign (red inverted triangle 止まれ) by the crossing and an orange curve mirror at the dorm corner
  const poleM = new THREE.MeshStandardMaterial({ color: '#d9d9d6', roughness: 0.5, metalness: 0.4 });
  const pole = (x, z, h, mat = poleM) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, h, 10), mat); p.position.set(x, h / 2, z); p.castShadow = true; scene.add(p); return p; };
  pole(S.crossX - 2.2, 28.75, 2.4);
  const tri = new THREE.Shape(); tri.moveTo(-0.38, 0.22); tri.lineTo(0.38, 0.22); tri.lineTo(0, -0.44); tri.closePath();
  const stopTex = canvasTexture(128, 128, (g) => { g.fillStyle = '#d42a2a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#ffffff'; g.font = 'bold 26px "Noto Sans JP", sans-serif'; g.textAlign = 'center'; g.fillText('止まれ', 64, 52); g.font = 'bold 14px sans-serif'; g.fillText('STOP', 64, 70); });
  const stopGeo = new THREE.ShapeGeometry(tri); stopGeo.computeBoundingBox();
  const uv = stopGeo.attributes.uv, pos = stopGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.38) / 0.76, (pos.getY(i) + 0.44) / 0.66);
  const stop = new THREE.Mesh(stopGeo, new THREE.MeshStandardMaterial({ map: stopTex, side: THREE.DoubleSide, roughness: 0.6 }));
  stop.position.set(S.crossX - 2.2, 2.2, 28.71); stop.rotation.y = Math.PI; scene.add(stop);
  const orange = new THREE.MeshStandardMaterial({ color: '#e8742a', roughness: 0.6 });
  pole(-29.2, 28.9, 2.9, orange);
  const mirror = new THREE.Group(); mirror.position.set(-29.2, 2.75, 28.75); mirror.rotation.y = Math.PI + 0.6; scene.add(mirror);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 28), orange); mirror.add(rim);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 12, 0, Math.PI * 2, 0, 0.6), new THREE.MeshStandardMaterial({ color: '#c8d6dc', metalness: 0.95, roughness: 0.08 }));
  glass.rotation.x = Math.PI / 2; glass.position.z = -0.25; glass.scale.set(1, 1, 0.5); mirror.add(glass);

  // models: bicycles (three colours) by the konbini and the dorm, plants by the doors, a kei truck
  const place = (gltf, list, tint) => {
    if (!gltf) return;
    gltf.scene.updateMatrixWorld(true);
    list.forEach(([x, z, ry, s = 1], i) => {
      const o = gltf.scene.clone(true); o.position.set(x, 0.02, z); o.rotation.y = ry; o.scale.setScalar(s);
      o.traverse((m) => {
        if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true;
        if (tint && tint[i] && m.material.color && m.material.color.r > 0.5 && m.material.color.g < 0.35) { m.material = m.material.clone(); m.material.color.set(tint[i]); }
      });
      scene.add(o);
    });
  };
  const bikeTint = ['#c8352d', '#e0e0dc', '#3a6fb0', '#2f8f57'];
  place(gl.bicycle, [[-3.4, 29.15, 0.08], [-2.7, 29.2, -0.05], [-28.2, 29.25, 0.1], [-27.5, 29.3, -0.08]], bikeTint);
  place(gl.pot_tall, [[-25.1, 29.35, 0.3], [-13.9, 29.4, 1.2], [12.2, 29.4, 2.4], [25.8, 29.4, 0.7]]);
  place(gl.pot_box, [[-12.2, 29.45, 0], [13.9, 29.45, 0], [27.3, 29.45, 0]]);
  place(gl.pot_round, [[-21.6, 29.45, 0.4], [-0.2, 29.5, 1.1], [1.6, 29.5, 2.2]]);
  place(gl.kei_truck, [[15.5, 22.7, Math.PI / 2]]);
}
