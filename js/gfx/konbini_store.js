/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,signTexture,makeSun,loadModel}from'./stage.js';
import{makeCharacter}from'./chars.js';
import{GOODS,GOOD_KEYS}from'../core/konbini_rules.js';
import{KONBINI_STORE}from'../core/konbini_view.js';
export const KONBINI_COLORS={top:'#4a9ec8',bottom:'#1f2b3a'};
export{KONBINI_STORE};
const CUST_POOL_KINDS=['f_casual','hoodie','suit','f_office'];
function extractShelfParts(gltf,whiteMat,greyMat){
const whiteGeos=[];
const greyGeos=[];
gltf.scene.updateMatrixWorld(true);
gltf.scene.traverse((o)=>{
if(!o.isMesh)return;
let g=o.geometry.clone().applyMatrix4(o.matrixWorld);
if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes)){
if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
}
const name=o.material?.name||'';
if(name==='peach')greyGeos.push(g);
else whiteGeos.push(g);
});
return{
whiteGeo:whiteGeos.length?mergeGeometries(whiteGeos,false):null,
greyGeo:greyGeos.length?mergeGeometries(greyGeos,false):null,
whiteMat,
greyMat,
};
}
function makeItemCardTexture(good,scanned=false){
return canvasTexture(128,128,(g)=>{
g.fillStyle=scanned?'#d8f5e3':'#fffdf7';
g.fillRect(0,0,128,128);
g.strokeStyle=scanned?'#27ae60':'#d68910';
g.lineWidth=8;
g.strokeRect(4,4,120,120);
g.textAlign='center';
g.textBaseline='middle';
g.font='52px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
g.fillText(good.icon,64,46);
g.fillStyle='#1f2a36';
g.font='800 18px "Zen Maru Gothic", "Be Vietnam Pro", sans-serif';
g.fillText(good.jp,64,88);
g.fillStyle=scanned?'#1e8449':'#b84b18';
g.font='800 17px "Be Vietnam Pro", sans-serif';
g.fillText(scanned?`✓ ${good.price}円`:`${good.price}円`,64,111);
});
}
function makeRegisterScreen(){
const c=document.createElement('canvas');
c.width=256;
c.height=128;
const g=c.getContext('2d');
const tex=new THREE.CanvasTexture(c);
tex.colorSpace=THREE.SRGBColorSpace;
const mat=new THREE.MeshBasicMaterial({map:tex});
return{c,g,tex,mat,sig:''};
}
function drawRegisterScreen(scr,cust){
const sig=cust
?`${cust.id}:${cust.step}:${cust.subTotal}:${cust.total}:${cust.tendered}:${cust.changeGiven}:${cust.payMethod}`
:'idle';
if(scr.sig===sig)return;
scr.sig=sig;
const{g,tex}=scr;
g.fillStyle='#0f2438';
g.fillRect(0,0,256,128);
g.strokeStyle='#38a169';
g.lineWidth=4;
g.strokeRect(3,3,250,122);
g.fillStyle='#7ed6a0';
g.font='700 17px "Zen Maru Gothic", "Be Vietnam Pro", sans-serif';
g.fillText('サクラマート POS',12,24);
if(!cust){
g.fillStyle='#ffffff';
g.font='800 22px "Zen Maru Gothic", sans-serif';
g.fillText('いらっしゃいませ',12,68);
tex.needsUpdate=true;
return;
}
const shownTotal=cust.step==='pay'||cust.step==='thanks'?cust.total:cust.subTotal;
g.fillStyle='#ffd666';
g.font='800 24px "Zen Maru Gothic", "Be Vietnam Pro", sans-serif';
g.fillText(`合計  ${shownTotal}円`,12,58);
g.fillStyle='#d8e9f8';
g.font='700 17px "Zen Maru Gothic", "Be Vietnam Pro", sans-serif';
if(cust.step==='pay'){
if(cust.payMethod==='ic'){
g.fillText('決済: ICカード (タッチ)',12,88);
g.fillStyle='#7ed6a0';
g.fillText('お釣り: 0円',12,112);
}else{
g.fillText(`お預かり: ${cust.tendered}円`,12,88);
g.fillStyle='#7ed6a0';
g.fillText(`お釣り: ${cust.changeDue}円 (入力 ${cust.changeGiven}円)`,12,112);
}
}else if(cust.step==='scan'){
const done=cust.items.filter((i)=>i.scanned).length;
g.fillText(`スキャン: ${done}/${cust.items.length}点`,12,92);
}else{
g.fillText('接客中…',12,92);
}
tex.needsUpdate=true;
}
export async function buildKonbiniStore(){
const[shelfLong,shelfFridge,shelfCounter,vending,plant,karaageModel]=await Promise.all(
['shelf_long','shelf_fridge','shelf_counter','vending','plant','bento_karaage'].map(loadModel),
);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#eef3f6');
scene.fog=new THREE.FogExp2(new THREE.Color('#eef3f6'),0.012);
scene.add(new THREE.HemisphereLight(0xffffff,0xd8e0e6,1.35));
const fill=new THREE.DirectionalLight(0xf6faff,0.72);
fill.position.set(-4,7,-5);
scene.add(fill);
const sun=makeSun(scene,{color:0xfffcf5,intensity:1.55,size:8,offset:[3,9,4]});
const counterLight=new THREE.PointLight(0xfff9ec,0.85,9,1.4);
counterLight.position.set(0,3.1,1.2);
scene.add(counterLight);
const batch=new Map();
const mats={};
const col=(c,o={})=>{
const key=`${c}:${JSON.stringify(o)}`;
return mats[key]||(mats[key]=new THREE.MeshStandardMaterial({color:c,roughness:0.72,...o}));
};
const m4=new THREE.Matrix4();
const q=new THREE.Quaternion();
const e=new THREE.Euler();
const p=new THREE.Vector3();
const s1=new THREE.Vector3(1,1,1);
function put(geo,m,x,y,z,ry=0,rx=0,rz=0){
e.set(rx,ry,rz);
q.setFromEuler(e);
p.set(x,y,z);
let g=geo.clone().applyMatrix4(m4.compose(p,q,s1));
if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes)){
if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
}
if(!batch.has(m))batch.set(m,[]);
batch.get(m).push(g);
}
const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const C=(rt,rb,h,seg=10)=>new THREE.CylinderGeometry(rt,rb,h,seg);
const floorTex=canvasTexture(128,128,(g)=>{
g.fillStyle='#f3efe6';
g.fillRect(0,0,128,128);
g.strokeStyle='#ded7c8';
g.lineWidth=2;
g.strokeRect(1,1,62,62);
g.strokeRect(65,1,62,62);
g.strokeRect(1,65,62,62);
g.strokeRect(65,65,62,62);
},[11,13]);
const floor=new THREE.Mesh(
new THREE.PlaneGeometry(9.2,11.2),
new THREE.MeshStandardMaterial({map:floorTex,roughness:0.32,metalness:0.04}),
);
floor.rotation.x=-Math.PI/2;
floor.position.set(0,0,-0.8);
floor.receiveShadow=true;
scene.add(floor);
const wallMat=col('#f7f6f1',{roughness:0.65});
const fasciaGreen=col('#2b8a5e',{roughness:0.45});
const fasciaOrange=col('#eb7a28',{roughness:0.45});
const woodTrim=col('#c89d6c',{roughness:0.55});
const darkMetal=col('#26323f',{metalness:0.55,roughness:0.35});
const chromeMat=col('#d8e0e6',{metalness:0.78,roughness:0.24});
const counterBodyMat=col('#ebe6dc',{roughness:0.5});
const counterTopMat=col('#34404d',{roughness:0.32,metalness:0.15});
const warmCaseMat=col('#d97706',{metalness:0.35,roughness:0.35});
const warmGlowMat=col('#fff3c4',{emissive:'#ffae2b',emissiveIntensity:0.65,roughness:0.25});
const ceilingLightMat=col('#ffffff',{emissive:'#f4faff',emissiveIntensity:1.25,roughness:0.15});
const icPadMat=col('#1d6fa5',{emissive:'#2980b9',emissiveIntensity:0.55,roughness:0.25});
const matGreen=col('#2d6a4f',{roughness:0.85});
const whiteShelfMat=col('#f3f4f6',{roughness:0.42});
const greyShelfMat=col('#cfd6de',{roughness:0.48,metalness:0.18});
const bunMat=col('#fdfaf2',{roughness:0.65});
const H=3.6;
const Z_NORTH=-5.2;
const Z_SOUTH=4.2;
put(B(9.2,H,0.16),wallMat,0,H/2,Z_SOUTH);
put(B(0.16,H,9.6),wallMat,-4.5,H/2,-0.5);
put(B(0.16,H,9.6),wallMat,4.5,H/2,-0.5);
put(B(5.2,H,0.16),wallMat,1.9,H/2,Z_NORTH);
put(B(1.1,H,0.16),wallMat,-4.0,H/2,Z_NORTH);
put(B(2.8,1.0,0.18),wallMat,-2.1,H-0.5,Z_NORTH);
put(B(9.0,0.26,0.05),fasciaGreen,0,3.15,Z_SOUTH-0.09);
put(B(9.0,0.08,0.06),fasciaOrange,0,2.98,Z_SOUTH-0.09);
put(B(0.05,0.26,9.2),fasciaGreen,-4.41,3.15,-0.5);
put(B(0.05,0.26,9.2),fasciaGreen,4.41,3.15,-0.5);
put(B(9.0,0.26,0.05),fasciaGreen,0,3.15,Z_NORTH+0.09);
put(B(9.0,0.08,0.06),fasciaOrange,0,2.98,Z_NORTH+0.09);
for(const lx of[-2.4,0,2.4]){
for(const lz of[-3.2,-0.6,1.8]){
put(B(1.8,0.05,0.32),ceilingLightMat,lx,H-0.04,lz);
}
}
put(B(2.3,2.55,0.12),darkMetal,-2.6,2.52,Z_NORTH+0.04);
put(B(0.08,2.55,0.14),darkMetal,-3.72,1.275,Z_NORTH+0.04);
put(B(0.08,2.55,0.14),darkMetal,-1.48,1.275,Z_NORTH+0.04);
put(B(1.9,0.015,0.95),matGreen,-2.6,0.008,Z_NORTH+0.65);
const scParts=extractShelfParts(shelfCounter,whiteShelfMat,greyShelfMat);
if(scParts.whiteGeo)put(scParts.whiteGeo,counterBodyMat,0,0,1.35);
if(scParts.greyGeo)put(scParts.greyGeo,woodTrim,0,0,1.35);
put(B(2.75,0.90,0.62),counterBodyMat,0.05,0.45,1.38);
put(B(2.78,0.16,0.04),fasciaGreen,0.05,0.72,1.06);
put(B(2.82,0.045,0.68),counterTopMat,0.05,0.91,1.38);
put(B(0.75,0.90,0.62),counterBodyMat,1.22,0.45,1.62);
put(B(0.80,0.045,0.66),counterTopMat,1.22,0.91,1.62);
put(B(2.40,0.90,0.56),counterBodyMat,-0.5,0.45,3.25);
put(B(2.46,0.045,0.60),counterTopMat,-0.5,0.91,3.25);
const[rx,,rz]=KONBINI_STORE.registerPos;
put(B(0.32,0.10,0.30),darkMetal,rx,0.98,rz);
put(B(0.26,0.18,0.10),darkMetal,rx,1.12,rz-0.02);
put(B(0.11,0.022,0.14),icPadMat,rx+0.19,0.94,rz-0.05);
put(B(0.14,0.016,0.11),icPadMat,rx+0.19,0.938,rz+0.11);
const[hx,,hz]=KONBINI_STORE.hotCasePos;
put(B(0.38,0.05,0.30),warmCaseMat,hx,0.955,hz);
put(B(0.38,0.04,0.30),warmCaseMat,hx,1.26,hz);
put(B(0.34,0.015,0.26),warmGlowMat,hx,1.10,hz);
put(B(0.34,0.015,0.26),warmGlowMat,hx,0.985,hz);
for(const dx of[-0.175,0.175]){
for(const dz of[-0.135,0.135]){
put(B(0.02,0.28,0.02),warmCaseMat,hx+dx,1.11,hz+dz);
}
}
for(const ox of[-0.10,0,0.10]){
for(const oz of[-0.05,0.05]){
put(new THREE.SphereGeometry(0.034,8,6),bunMat,hx+ox,1.125,hz+oz);
put(C(0.022,0.022,0.11,7),col('#d67f29',{roughness:0.55}),hx+ox,1.015,hz+oz,0,Math.PI/2);
}
}
const[cx,,cz]=KONBINI_STORE.coffeePos;
put(B(0.34,0.46,0.34),darkMetal,cx,1.16,cz);
put(B(0.28,0.12,0.06),chromeMat,cx,1.28,cz-0.15);
put(C(0.032,0.026,0.09,8),whiteShelfMat,cx,1.02,cz-0.12);
put(B(0.48,0.32,0.38),chromeMat,-0.95,1.09,3.22);
put(B(0.28,0.20,0.02),warmGlowMat,-1.02,1.09,3.02);
const sfParts=extractShelfParts(shelfFridge,whiteShelfMat,greyShelfMat);
const fridgeSpots=[
{x:-0.2,z:-4.65,ry:0},
{x:1.0,z:-4.65,ry:0},
{x:2.2,z:-4.65,ry:0},
{x:3.4,z:-4.65,ry:0},
{x:-3.95,z:-1.8,ry:Math.PI/2},
{x:-3.95,z:-0.6,ry:Math.PI/2},
];
for(const fs of fridgeSpots){
if(sfParts.whiteGeo)put(sfParts.whiteGeo,whiteShelfMat,fs.x,0,fs.z,fs.ry);
if(sfParts.greyGeo)put(sfParts.greyGeo,greyShelfMat,fs.x,0,fs.z,fs.ry);
}
for(const[m,list]of batch){
const mesh=new THREE.Mesh(mergeGeometries(list,false),m);
mesh.castShadow=false;
mesh.receiveShadow=true;
scene.add(mesh);
}
const slParts=extractShelfParts(shelfLong,whiteShelfMat,greyShelfMat);
const shelfSpots=[
{x:-2.15,z:-2.55,ry:Math.PI/2},
{x:-2.15,z:-1.35,ry:Math.PI/2},
{x:0.15,z:-2.75,ry:Math.PI/2},
{x:0.15,z:-1.65,ry:Math.PI/2},
{x:2.35,z:-2.55,ry:Math.PI/2},
{x:2.35,z:-1.35,ry:Math.PI/2},
];
for(const[geo,mat]of[[slParts.whiteGeo,whiteShelfMat],[slParts.greyGeo,greyShelfMat]]){
if(!geo)continue;
const inst=new THREE.InstancedMesh(geo,mat,shelfSpots.length);
inst.castShadow=true;
inst.receiveShadow=true;
shelfSpots.forEach((sp,i)=>{
e.set(0,sp.ry,0);
q.setFromEuler(e);
p.set(sp.x,0,sp.z);
inst.setMatrixAt(i,m4.compose(p,q,s1));
});
inst.instanceMatrix.needsUpdate=true;
scene.add(inst);
}
const prodGeo=new THREE.BoxGeometry(0.13,0.16,0.11);
const prodMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:0.45});
const prodPalette=[
new THREE.Color('#47a467'),
new THREE.Color('#e67e22'),
new THREE.Color('#3b82f6'),
new THREE.Color('#e74c3c'),
new THREE.Color('#f1c40f'),
new THREE.Color('#9b59b6'),
];
const prodCoords=[];
for(const sp of shelfSpots){
for(const sy of[0.35,0.72,1.08]){
for(const dz of[-0.36,-0.12,0.12,0.36]){
prodCoords.push([sp.x-0.14,sy,sp.z+dz]);
prodCoords.push([sp.x+0.14,sy,sp.z+dz]);
}
}
}
for(const fs of fridgeSpots.slice(0,4)){
for(const sy of[0.48,0.92,1.36]){
for(const dx of[-0.32,-0.10,0.12,0.32]){
prodCoords.push([fs.x+dx,sy,fs.z+0.18]);
}
}
}
const prodInst=new THREE.InstancedMesh(prodGeo,prodMat,prodCoords.length);
prodCoords.forEach(([px,py,pz],i)=>{
e.set(0,(i%3)*0.08,0);
q.setFromEuler(e);
p.set(px,py,pz);
prodInst.setMatrixAt(i,m4.compose(p,q,s1));
prodInst.setColorAt(i,prodPalette[i%prodPalette.length]);
});
prodInst.instanceMatrix.needsUpdate=true;
if(prodInst.instanceColor)prodInst.instanceColor.needsUpdate=true;
scene.add(prodInst);
const vend=vending.scene.clone(true);
vend.position.set(3.85,0,-3.55);
vend.rotation.y=-Math.PI/2;
scene.add(vend);
const potted=plant.scene.clone(true);
potted.position.set(-3.85,0,-4.25);
scene.add(potted);
const glassMat=new THREE.MeshStandardMaterial({
color:'#cce8f6',
transparent:true,
opacity:0.36,
roughness:0.12,
metalness:0.1,
depthWrite:false,
});
const doorLeft=new THREE.Mesh(new THREE.BoxGeometry(1.06,2.38,0.04),glassMat);
const doorRight=new THREE.Mesh(new THREE.BoxGeometry(1.06,2.38,0.04),glassMat);
doorLeft.position.set(-3.13,1.20,Z_NORTH+0.04);
doorRight.position.set(-2.07,1.20,Z_NORTH+0.04);
scene.add(doorLeft,doorRight);
const hotGlass=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.27,0.28),glassMat);
hotGlass.position.set(hx,1.11,hz);
scene.add(hotGlass);
const addSign=(text,w,h,bg,fg,x,y,z,ry=0)=>{
const m=new THREE.Mesh(
new THREE.PlaneGeometry(w,h),
new THREE.MeshBasicMaterial({map:signTexture(text,512,148,bg,fg),side:THREE.DoubleSide}),
);
m.position.set(x,y,z);
m.rotation.y=ry;
scene.add(m);
return m;
};
addSign('いらっしゃいませ',1.55,0.36,'#2b8a5e','#ffffff',0.02,2.35,-0.35);
addSign('レジ',0.68,0.26,'#1f6b45','#ffffff',rx,1.92,rz);
addSign('ホットスナック',0.44,0.12,'#d93829','#fff8dc',hx,1.33,hz);
addSign('温めます',0.85,0.24,'#fff4e0','#c94a1d',-0.95,1.68,3.05,Math.PI);
const regScreen=makeRegisterScreen();
drawRegisterScreen(regScreen,null);
const screenMesh=new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.13),regScreen.mat);
screenMesh.position.set(rx,1.14,rz+0.04);
screenMesh.rotation.x=-0.22;
scene.add(screenMesh);
const itemTexCache={};
for(const k of GOOD_KEYS){
itemTexCache[`${k}:0`]=makeItemCardTexture(GOODS[k],false);
itemTexCache[`${k}:1`]=makeItemCardTexture(GOODS[k],true);
}
const slotGeo=new THREE.BoxGeometry(0.11,0.085,0.11);
const itemMeshes=KONBINI_STORE.itemSlots.map(([sx,sy,sz],idx)=>{
const mat=new THREE.MeshStandardMaterial({map:itemTexCache['onigiri:0'],roughness:0.35});
const mesh=new THREE.Mesh(slotGeo,mat);
mesh.position.set(sx,sy,sz);
mesh.visible=false;
mesh.userData={slotIdx:idx};
scene.add(mesh);
return mesh;
});
const bagMesh=new THREE.Mesh(
new THREE.BoxGeometry(0.16,0.20,0.12),
new THREE.MeshStandardMaterial({color:'#f8fafc',roughness:0.55}),
);
bagMesh.position.set(-0.26,1.01,1.48);
bagMesh.visible=false;
scene.add(bagMesh);
const tencho=await makeCharacter('suit',KONBINI_COLORS);
tencho.holder.position.set(KONBINI_STORE.tencho.x,0,KONBINI_STORE.tencho.z);
tencho.yaw=KONBINI_STORE.tencho.yaw;
tencho.holder.visible=false;
tencho.play('idle');
scene.add(tencho.holder);
const custPool=await Promise.all(
CUST_POOL_KINDS.map(async(kind,i)=>{
const ch=await makeCharacter(kind);
ch.holder.position.set(KONBINI_STORE.door.x,0,KONBINI_STORE.door.z);
ch.holder.visible=false;
ch.play('idle');
scene.add(ch.holder);
return{ch,slot:i,targetX:KONBINI_STORE.door.x,targetZ:KONBINI_STORE.door.z,targetYaw:0,active:false};
}),
);
let leavingSlot=-1;
let leavingTimer=0;
function syncShift(st){
if(!st){
drawRegisterScreen(regScreen,null);
for(const m of itemMeshes)m.visible=false;
bagMesh.visible=false;
for(const p of custPool)p.ch.holder.visible=false;
return;
}
const c=st.cur;
drawRegisterScreen(regScreen,c);
const counterItems=c?c.items:[];
for(let i=0;i<itemMeshes.length;i++){
const m=itemMeshes[i];
const it=counterItems[i];
if(!it||c.step==='done'){
m.visible=false;
continue;
}
const[bx,by,bz]=KONBINI_STORE.itemSlots[i];
const texKey=`${it.id}:${it.scanned ? 1 : 0}`;
if(itemTexCache[texKey]&&m.material.map!==itemTexCache[texKey]){
m.material.map=itemTexCache[texKey];
m.material.needsUpdate=true;
}
m.position.set(bx+(it.scanned?-0.025:0),by,bz+(it.scanned?0.06:0));
m.visible=true;
}
bagMesh.visible=Boolean(c&&c.bagAdded);
const curSlot=c?(c.id-1)%custPool.length:-1;
const qCust=st.queue&&st.queue[0];
const qSlot=qCust?(qCust.id-1)%custPool.length:-1;
for(let i=0;i<custPool.length;i++){
const entry=custPool[i];
if(i===curSlot&&c){
if(!entry.active){
entry.ch.holder.position.set(KONBINI_STORE.counterCustomer.x,0,KONBINI_STORE.counterCustomer.z-0.55);
entry.active=true;
}
entry.ch.holder.visible=true;
entry.targetX=KONBINI_STORE.counterCustomer.x;
entry.targetZ=KONBINI_STORE.counterCustomer.z;
entry.targetYaw=KONBINI_STORE.counterCustomer.yaw;
}else if(i===qSlot&&qCust&&i!==curSlot){
if(!entry.active){
entry.ch.holder.position.set(KONBINI_STORE.door.x,0,KONBINI_STORE.door.z);
entry.active=true;
}
entry.ch.holder.visible=true;
entry.targetX=KONBINI_STORE.queueSpot.x;
entry.targetZ=KONBINI_STORE.queueSpot.z;
entry.targetYaw=KONBINI_STORE.queueSpot.yaw;
}else if(i===leavingSlot&&leavingTimer>0){
entry.ch.holder.visible=true;
entry.targetX=KONBINI_STORE.door.x;
entry.targetZ=KONBINI_STORE.door.z;
entry.targetYaw=Math.PI;
}else{
entry.active=false;
entry.ch.holder.visible=false;
}
}
}
function triggerLeave(custId){
leavingSlot=(Math.max(1,custId)-1)%custPool.length;
leavingTimer=1.4;
}
return{
scene,
sun,
showcase:{pos:new THREE.Vector3(...KONBINI_STORE.showcase.pos),look:new THREE.Vector3(...KONBINI_STORE.showcase.look)},
foreman:tencho,
tencho,
custPool,
itemMeshes,
hotCaseMesh:hotGlass,
syncShift,
triggerLeave,
activeCustomerChar(st){
if(!st?.cur)return custPool[0].ch;
return custPool[(st.cur.id-1)%custPool.length].ch;
},
queueCustomerChar(st){
if(!st?.queue?.length)return null;
return custPool[(st.queue[0].id-1)%custPool.length].ch;
},
update(dt=0.016){
if(leavingTimer>0){
leavingTimer=Math.max(0,leavingTimer-dt);
if(leavingTimer<=0)leavingSlot=-1;
}
let nearDoor=false;
for(const entry of custPool){
if(!entry.ch.holder.visible)continue;
const pos=entry.ch.holder.position;
const dx=entry.targetX-pos.x;
const dz=entry.targetZ-pos.z;
const dist=Math.hypot(dx,dz);
if(dist>0.04){
const stepD=Math.min(dist,2.8*dt);
pos.x+=(dx/dist)*stepD;
pos.z+=(dz/dist)*stepD;
entry.ch.yaw=Math.atan2(dx,dz);
entry.ch.play('walk');
}else{
entry.ch.yaw=entry.targetYaw;
entry.ch.play('idle');
}
entry.ch.update(dt);
if(pos.z<-2.4)nearDoor=true;
}
const openOffset=nearDoor?0.65:0;
doorLeft.position.x+=((-3.13-openOffset)-doorLeft.position.x)*Math.min(1,dt*8);
doorRight.position.x+=((-2.07+openOffset)-doorRight.position.x)*Math.min(1,dt*8);
tencho.update(dt);
},
};
}
