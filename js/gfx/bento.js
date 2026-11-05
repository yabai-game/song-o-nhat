/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,signTexture,makeSun,loadModel}from'./stage.js';
import{makeCharacter,makeSanitaryCap,wearHelmet}from'./chars.js';
import{BENTO,ITEMS,ITEM_KEYS,DEFECTS}from'../core/bento_rules.js';
const BELT_X0=-22.5;
const BELT_Y=0.95;
const BELT_Z=0;
const SEG_LEN=9.3;
const POOL_SIZE=16;
const BENTO_UNIFORM={top:'#f2f2ee',bottom:'#f2f2ee'};
const WORKER_SPOTS=[
{x:-5.2,z:-1.06,yaw:0,kind:'f_casual',dish:'karaage',panZ:-0.58},
{x:-3.1,z:-1.06,yaw:0,kind:'hoodie',dish:'sausage',panZ:-0.58},
{x:-1.1,z:-1.06,yaw:0,kind:'f_office',dish:'veg',panZ:-0.58},
{x:1.1,z:-1.06,yaw:0,kind:'suit',dish:'karaage',panZ:-0.58},
{x:3.2,z:-1.06,yaw:0,kind:'f_casual',dish:'sausage',panZ:-0.58},
{x:-4.2,z:1.08,yaw:Math.PI,kind:'suit',dish:'veg',panZ:0.58},
{x:-2.3,z:1.08,yaw:Math.PI,kind:'f_office',dish:'karaage',panZ:0.58},
{x:2.3,z:1.08,yaw:Math.PI,kind:'hoodie',dish:'sausage',panZ:0.58},
];
export const BENTO_ROOM={
beltX0:BELT_X0,
beltY:BELT_Y,
beltZ:BELT_Z,
bounds:{x0:-7.5,x1:7.5,z0:1.55,z1:4.7},
start:{x:2.6,z:4.3,yaw:Math.PI},
greeterAt:{x:-1.2,z:2.3,yaw:0.45},
player:{x:0,z:1.08,yaw:Math.PI},
foreman:{x:-2.4,z:-1.85,yaw:0.25},
talkPlayer:{x:-0.4,z:2.3},
showcase:{pos:[-3.6,2.55,4.1],look:[-0.8,1.05,-0.4]},
};
function makeOrderSprite(){
const c=document.createElement('canvas');
c.width=256;
c.height=112;
const g=c.getContext('2d');
const tex=new THREE.CanvasTexture(c);
tex.colorSpace=THREE.SRGBColorSpace;
const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
return{c,g,tex,mat};
}
function drawOrderBadge(badge,tray){
const{g,tex}=badge;
g.clearRect(0,0,256,112);
if(tray.defect){
const def=DEFECTS[tray.defect]||DEFECTS.hair;
g.fillStyle='rgba(255, 244, 242, 0.96)';
g.strokeStyle='#d93829';
g.lineWidth=7;
g.beginPath();
g.roundRect(14,14,228,84,22);
g.fill();
g.stroke();
g.font='800 32px "Zen Maru Gothic", "Segoe UI Emoji", sans-serif';
g.textAlign='center';
g.textBaseline='middle';
g.fillStyle='#c92a1d';
g.fillText(`${def.icon} 不良`,128,56);
tex.needsUpdate=true;
return;
}
const order=tray.order||[tray.need];
const stepIdx=tray.stepIdx||0;
const w=order.length===1?116:order.length===2?176:236;
const x0=(256-w)/2;
g.fillStyle='rgba(255, 255, 255, 0.96)';
g.strokeStyle='#e67e22';
g.lineWidth=7;
g.beginPath();
g.roundRect(x0,14,w,84,24);
g.fill();
g.stroke();
g.textAlign='center';
g.textBaseline='middle';
const stepW=w/order.length;
for(let i=0;i<order.length;i++){
const cx=x0+stepW*(i+0.5);
const ic=ITEMS[order[i]]?ITEMS[order[i]].icon:'🍱';
if(i<stepIdx){
g.globalAlpha=0.42;
g.font='42px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
g.fillText(ic,cx,56);
g.globalAlpha=1;
g.fillStyle='#27ae60';
g.font='900 26px sans-serif';
g.fillText('✓',cx+16,36);
}else{
if(i===stepIdx&&order.length>1){
g.fillStyle='rgba(245, 199, 26, 0.36)';
g.beginPath();
g.arc(cx,56,30,0,Math.PI*2);
g.fill();
}
g.font=order.length===1?'56px "Segoe UI Emoji", sans-serif':'46px "Segoe UI Emoji", sans-serif';
g.fillStyle='#1f2a33';
g.fillText(ic,cx,58);
}
}
tex.needsUpdate=true;
}
function makeCompartmentDish(sideMats){
const g=new THREE.Group();
const n1=new THREE.Mesh(new THREE.DodecahedronGeometry(0.020,0),sideMats.karaage);
n1.position.set(-0.022,0.004,-0.004);
const n2=new THREE.Mesh(new THREE.DodecahedronGeometry(0.019,0),sideMats.karaage);
n2.position.set(0.004,0.005,0.006);
const n3=new THREE.Mesh(new THREE.DodecahedronGeometry(0.018,0),sideMats.karaage);
n3.position.set(0.026,0.003,-0.005);
g.add(n1,n2,n3);
g.userData.pieces=[n1,n2,n3];
return g;
}
function setDishClusterMaterial(cluster,mat){
for(const m of cluster.userData.pieces)m.material=mat;
}
function makeRawTray(trayMat,rimMat,riceMat,umeboshiMat,sideMats,hairMat){
const g=new THREE.Group();
const base=new THREE.Mesh(new THREE.BoxGeometry(0.30,0.016,0.22),trayMat);
base.position.y=0.008;
base.castShadow=true;
base.receiveShadow=true;
const rim=new THREE.Group();
const wallFB=new THREE.BoxGeometry(0.316,0.044,0.014);
const wallLR=new THREE.BoxGeometry(0.014,0.044,0.236);
const wFront=new THREE.Mesh(wallFB,rimMat);wFront.position.set(0,0.022,0.111);
const wBack=new THREE.Mesh(wallFB,rimMat);wBack.position.set(0,0.022,-0.111);
const wLeft=new THREE.Mesh(wallLR,rimMat);wLeft.position.set(-0.151,0.022,0);
const wRight=new THREE.Mesh(wallLR,rimMat);wRight.position.set(0.151,0.022,0);
const divMain=new THREE.Mesh(new THREE.BoxGeometry(0.011,0.038,0.21),rimMat);
divMain.position.set(-0.018,0.020,0);
const divSub1=new THREE.Mesh(new THREE.BoxGeometry(0.158,0.036,0.010),rimMat);
divSub1.position.set(0.064,0.019,-0.035);
const divSub2=new THREE.Mesh(new THREE.BoxGeometry(0.158,0.036,0.010),rimMat);
divSub2.position.set(0.064,0.019,0.035);
rim.add(wFront,wBack,wLeft,wRight,divMain,divSub1,divSub2);
const rice=new THREE.Group();
const riceBed=new THREE.Mesh(new THREE.BoxGeometry(0.112,0.026,0.188),riceMat);
riceBed.position.set(-0.082,0.021,0);
const ume=new THREE.Mesh(new THREE.SphereGeometry(0.013,10,8),umeboshiMat);
ume.scale.set(1,0.55,1);
ume.position.set(-0.082,0.035,0);
rice.add(riceBed,ume);
const compZ=[-0.070,0.000,0.070];
const compartments=compZ.map((cz)=>{
const cl=makeCompartmentDish(sideMats);
cl.position.set(0.064,0.024,cz);
cl.visible=false;
g.add(cl);
return cl;
});
const hair=new THREE.Mesh(new THREE.BoxGeometry(0.085,0.006,0.008),hairMat);
hair.position.set(-0.082,0.038,0.015);
hair.rotation.y=0.45;
hair.visible=false;
g.add(base,rim,rice,hair);
g.userData={rim,rice,hair,compartments};
return g;
}
export async function buildBento(){
const[conveyor,bentoBox,steelSink,foodPan]=await Promise.all(
['conveyor','bento_box','steel_sink','food_pan'].map(loadModel),
);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#eef4f8');
scene.fog=new THREE.FogExp2(new THREE.Color('#eef4f8'),0.007);
scene.add(new THREE.HemisphereLight(0xffffff,0xd4dfe8,1.25));
const fill=new THREE.DirectionalLight(0xf4f9ff,0.72);
fill.position.set(-6,9,8);
scene.add(fill);
const sun=makeSun(scene,{color:0xf8fbff,intensity:1.75,size:12,offset:[3,11,6]});
const tubeLightL=new THREE.PointLight(0xf7fbff,0.85,14,1.5);
tubeLightL.position.set(-2.5,4.1,0);
const tubeLightR=new THREE.PointLight(0xf7fbff,0.85,14,1.5);
tubeLightR.position.set(2.5,4.1,0);
scene.add(tubeLightL,tubeLightR);
const batch=new Map(),mats={};
const col=(c,o={})=>mats[c]||(mats[c]=new THREE.MeshStandardMaterial({color:c,roughness:0.75,...o}));
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s1=new THREE.Vector3(1,1,1);
function put(geo,m,x,y,z,ry=0){
e.set(0,ry,0);q.setFromEuler(e);p.set(x,y,z);
let g=geo.applyMatrix4(m4.compose(p,q,s1));if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
if(!batch.has(m))batch.set(m,[]);batch.get(m).push(g);
}
const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const floorTex=canvasTexture(128,128,(g)=>{
g.fillStyle='#cbdbe3';g.fillRect(0,0,128,128);
g.strokeStyle='#b9ccd6';g.lineWidth=2;g.strokeRect(1,1,126,126);
g.fillStyle='rgba(255, 255, 255, 0.14)';g.fillRect(8,8,48,16);
},[20,7]);
const floor=new THREE.Mesh(
new THREE.PlaneGeometry(42,14),
new THREE.MeshStandardMaterial({map:floorTex,roughness:0.22,metalness:0.08}),
);
floor.rotation.x=-Math.PI/2;
floor.position.set(-4,0,0);
floor.receiveShadow=true;
scene.add(floor);
const wallTex=canvasTexture(128,128,(g)=>{
g.fillStyle='#f6f9fb';g.fillRect(0,0,128,128);
g.strokeStyle='#e1e8ee';g.lineWidth=2;
g.beginPath();g.moveTo(64,0);g.lineTo(64,128);g.stroke();
},[18,2]);
const wall=new THREE.MeshStandardMaterial({map:wallTex,roughness:0.55});
const brightSteel=col('#d6dee4',{metalness:0.80,roughness:0.22});
const darkSteel=col('#aeb8c0',{metalness:0.72,roughness:0.28});
const trim=col('#2b7a9b',{roughness:0.45});
const lampHood=col('#e8eef2',{metalness:0.45,roughness:0.3});
const lampTube=col('#ffffff',{emissive:'#f2f9ff',emissiveIntensity:1.35,roughness:0.15});
const ceilingMat=col('#f2f6f9',{roughness:0.7});
const H=4.5,Z_BACK=-5.1;
put(B(42,H,0.16),wall,-4,H/2,Z_BACK);
put(B(0.16,H,14),wall,-25,H/2,0);
put(B(0.16,H,14),wall,17,H/2,0);
put(B(42,0.12,14),ceilingMat,-4,H+0.06,0);
put(B(42,0.22,0.05),brightSteel,-4,0.11,Z_BACK+0.09);
put(B(42,0.26,0.06),brightSteel,-4,1.22,Z_BACK+0.09);
put(B(42,0.07,0.05),trim,-4,1.40,Z_BACK+0.09);
put(B(0.06,0.26,14),brightSteel,-24.9,1.22,0);
put(B(0.06,0.26,14),brightSteel,16.9,1.22,0);
for(let x=-18;x<=10;x+=3.6){
for(const cz of[-2.4,0.0,2.2]){
put(B(2.8,0.06,0.34),lampHood,x,H-0.06,cz);
put(B(2.65,0.045,0.09),lampTube,x,H-0.10,cz-0.08);
put(B(2.65,0.045,0.09),lampTube,x,H-0.10,cz+0.08);
}
}
for(const sideZ of[-0.58,0.58]){
put(B(11.6,0.045,0.36),brightSteel,-1.0,0.86,sideZ);
for(let lx=-6.4;lx<=4.4;lx+=1.8){
put(B(0.045,0.84,0.045),darkSteel,lx,0.42,sideZ-0.14);
put(B(0.045,0.84,0.045),darkSteel,lx,0.42,sideZ+0.14);
}
}
const stackTrayMat=col('#1b1d22',{roughness:0.22,metalness:0.15});
for(const rx of[-5.2,-3.4]){
const rz=-3.85;
for(const dx of[-0.55,0.55]){
for(const dz of[-0.28,0.28]){
put(B(0.04,1.85,0.04),brightSteel,rx+dx,0.925,rz+dz);
}
}
for(let sy=0.28;sy<=1.75;sy+=0.36){
put(B(1.16,0.03,0.60),brightSteel,rx,sy,rz);
for(const sx of[-0.32,0.0,0.32]){
put(B(0.28,0.14,0.22),stackTrayMat,rx+sx,sy+0.085,rz);
}
}
}
put(B(1.6,0.86,0.65),brightSteel,-1.2,0.43,-3.95);
for(let i=0;i<3;i++){
const b=bentoBox.scene.clone(true);
b.position.set(-1.65+i*0.45,0.87,-3.95);
b.traverse((o)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
scene.add(b);
}
const pvcMat=new THREE.MeshStandardMaterial({
color:'#b4e0f8',
transparent:true,
opacity:0.46,
roughness:0.14,
metalness:0.05,
side:THREE.DoubleSide,
depthWrite:false,
});
function addPvcDoorway(cx,cz){
put(B(1.92,0.12,0.18),brightSteel,cx,2.42,cz);
put(B(0.10,2.45,0.18),brightSteel,cx-0.92,1.225,cz);
put(B(0.10,2.45,0.18),brightSteel,cx+0.92,1.225,cz);
for(let i=0;i<9;i++){
const strip=new THREE.Mesh(new THREE.BoxGeometry(0.21,2.34,0.012),pvcMat);
strip.position.set(cx-0.76+i*0.19,1.18,cz+(i%2?0.012:-0.012));
scene.add(strip);
}
}
addPvcDoorway(5.1,Z_BACK+0.10);
addPvcDoorway(2.6,4.92);
const placeSink=(sx,sz,rotY)=>{
const s=steelSink.scene.clone(true);
s.position.set(sx,0,sz);
s.rotation.y=rotY;
s.traverse((o)=>{
if(o.isMesh){
o.material=brightSteel;
o.castShadow=true;
o.receiveShadow=true;
}
});
scene.add(s);
};
placeSink(2.2,Z_BACK+0.56,Math.PI);
put(B(2.1,0.78,0.04),col('#cfe6f3',{metalness:0.55,roughness:0.15}),2.2,1.62,Z_BACK+0.11);
for(const[m,list]of batch){
const mesh=new THREE.Mesh(mergeGeometries(list,false),m);
mesh.castShadow=true;
mesh.receiveShadow=true;
scene.add(mesh);
}
const addSign=(text,w,h,bg,fg,x,y,z)=>{
const m=new THREE.Mesh(
new THREE.PlaneGeometry(w,h),
new THREE.MeshStandardMaterial({map:signTexture(text,512,148,bg,fg),roughness:0.45}),
);
m.position.set(x,y,z);
scene.add(m);
};
addSign('衛生第一',2.3,0.66,'#f2f7f2','#1f6b3a',-3.8,3.25,Z_BACK+0.10);
addSign('異物混入注意',2.6,0.66,'#fff6f4','#c92a1d',-0.8,3.25,Z_BACK+0.10);
addSign('手洗い30秒',2.3,0.66,'#eef5fb','#1c5a96',2.2,2.55,Z_BACK+0.10);
addSign('作業中',1.8,0.56,'#fff9db','#b45309',5.1,3.15,Z_BACK+0.10);
for(let i=0;i<4;i++){
const seg=conveyor.scene.clone(true);
seg.rotation.y=Math.PI/2;
seg.position.set(BELT_X0+(i+0.5)*SEG_LEN,0,BELT_Z);
seg.traverse((o)=>{
if(o.isMesh){
o.material=brightSteel;
o.castShadow=true;
o.receiveShadow=true;
}
});
scene.add(seg);
}
const puBeltTex=canvasTexture(128,64,(g)=>{
g.fillStyle='#eaeeef';g.fillRect(0,0,128,64);
g.strokeStyle='#d8dfe2';g.lineWidth=2;
g.beginPath();g.moveTo(0,0);g.lineTo(0,64);g.moveTo(64,0);g.lineTo(64,64);g.stroke();
},[48,1]);
const puBelt=new THREE.Mesh(
new THREE.BoxGeometry(BENTO.BELT_LEN,0.014,0.64),
new THREE.MeshStandardMaterial({map:puBeltTex,roughness:0.34,metalness:0.04}),
);
puBelt.position.set(BELT_X0+BENTO.BELT_LEN/2,BELT_Y+0.004,BELT_Z);
puBelt.receiveShadow=true;
scene.add(puBelt);
const panMat=new THREE.MeshStandardMaterial({color:'#f8fafb',roughness:0.26,metalness:0.05});
const panAssignments=[
{x:-0.38,z:0.58,kind:'karaage'},
{x:0.00,z:0.58,kind:'sausage'},
{x:0.38,z:0.58,kind:'veg'},
];
for(const w of WORKER_SPOTS){
panAssignments.push({x:w.x-0.19,z:w.panZ,kind:w.dish});
panAssignments.push({x:w.x+0.19,z:w.panZ,kind:ITEM_KEYS[(ITEM_KEYS.indexOf(w.dish)+1)%3]});
}
for(const pa of panAssignments){
const fp=foodPan.scene.clone(true);
fp.position.set(pa.x,0.882,pa.z);
fp.traverse((o)=>{
if(o.isMesh){
o.material=panMat;
o.castShadow=true;
o.receiveShadow=true;
}
});
scene.add(fp);
}
const piecesPerPan=12;
const sideMats={
karaage:new THREE.MeshStandardMaterial({color:'#d98a2e',roughness:0.65}),
sausage:new THREE.MeshStandardMaterial({color:'#c8423a',roughness:0.55}),
veg:new THREE.MeshStandardMaterial({color:'#4c9a4a',roughness:0.65}),
};
const dishGeos={
karaage:new THREE.DodecahedronGeometry(0.026,0),
sausage:new THREE.CapsuleGeometry(0.013,0.032,4,8),
veg:new THREE.DodecahedronGeometry(0.024,1),
};
for(const key of ITEM_KEYS){
const pans=panAssignments.filter((p)=>p.kind===key);
const inst=new THREE.InstancedMesh(dishGeos[key],sideMats[key],pans.length*piecesPerPan);
inst.castShadow=true;
inst.receiveShadow=true;
let idx=0;
for(let pi=0;pi<pans.length;pi++){
const pa=pans[pi];
for(let k=0;k<piecesPerPan;k++){
const colIdx=k%4,rowIdx=Math.floor(k/4);
const ox=(colIdx-1.5)*0.058+((k*17)%5-2)*0.004;
const oz=(rowIdx-1)*0.056+((k*13)%5-2)*0.004;
const oy=0.916+(k%2)*0.012;
e.set(key==='sausage'?Math.PI/2:0.2*k,0.5*k,key==='sausage'?0.3*(k%3-1):0.1*k);
q.setFromEuler(e);
p.set(pa.x+ox,oy,pa.z+oz);
inst.setMatrixAt(idx++,m4.compose(p,q,s1));
}
}
inst.instanceMatrix.needsUpdate=true;
scene.add(inst);
}
const zoneW=BENTO.ZONE1-BENTO.ZONE0;
const zoneCenterX=BELT_X0+(BENTO.ZONE0+BENTO.ZONE1)/2;
const zonePlane=new THREE.Mesh(
new THREE.PlaneGeometry(zoneW,0.64),
new THREE.MeshBasicMaterial({color:'#f5c71a',transparent:true,opacity:0.30,depthWrite:false}),
);
zonePlane.rotation.x=-Math.PI/2;
zonePlane.position.set(zoneCenterX,BELT_Y+0.013,BELT_Z);
scene.add(zonePlane);
const railMat=new THREE.MeshStandardMaterial({color:'#f2b705',emissive:'#b88600',emissiveIntensity:0.25,roughness:0.35});
for(const dz of[-0.36,0.36]){
const r=new THREE.Mesh(new THREE.BoxGeometry(zoneW,0.03,0.04),railMat);
r.position.set(zoneCenterX,BELT_Y+0.022,BELT_Z+dz);
scene.add(r);
}
for(const dx of[-zoneW/2,zoneW/2]){
const bar=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.025,0.74),railMat);
bar.position.set(zoneCenterX+dx,BELT_Y+0.020,BELT_Z);
scene.add(bar);
}
const trayMat=new THREE.MeshStandardMaterial({color:'#181a1f',roughness:0.20,metalness:0.16});
const rimMat=new THREE.MeshStandardMaterial({color:'#242830',roughness:0.18,metalness:0.18});
const riceMat=new THREE.MeshStandardMaterial({color:'#fbfaf5',roughness:0.82});
const umeboshiMat=new THREE.MeshStandardMaterial({color:'#c0292b',roughness:0.5});
const hairMat=new THREE.MeshStandardMaterial({color:'#141210',roughness:0.4});
const pool=[];
for(let i=0;i<POOL_SIZE;i++){
const group=new THREE.Group();
const raw=makeRawTray(trayMat,rimMat,riceMat,umeboshiMat,sideMats,hairMat);
const badge=makeOrderSprite();
const sprite=new THREE.Sprite(badge.mat);
sprite.scale.set(0.86,0.38,1);
sprite.position.set(0,0.45,0);
sprite.renderOrder=10;
group.add(raw,sprite);
group.visible=false;
scene.add(group);
pool.push({group,raw,sprite,badge,sig:''});
}
const lineWorkers=await Promise.all(
WORKER_SPOTS.map(async(cfg,i)=>{
const ch=await makeCharacter(cfg.kind,BENTO_UNIFORM);
const cap=makeSanitaryCap(ch);
wearHelmet(ch,cap.group);
ch.cap=cap.group;
ch.cap.visible=true;
ch.holder.position.set(cfg.x,0,cfg.z);
ch.yaw=cfg.yaw;
ch.reachTo=0.32;
ch.reach=0.32;
ch.play('idle');
scene.add(ch.holder);
return{
ch,
dish:cfg.dish,
timer:0.35+(i*0.31)%1.8,
period:1.65+(i%4)*0.28,
};
}),
);
function syncTrays(trays){
const n=Math.min(pool.length,trays.length);
for(let i=0;i<n;i++){
const t=trays[i],slot=pool[i];
if(t.rejected){
slot.group.visible=false;
continue;
}
slot.group.visible=true;
slot.group.position.set(BELT_X0+t.x,BELT_Y+0.011,BELT_Z);
slot.raw.visible=true;
const u=slot.raw.userData;
u.rice.visible=t.defect!=='norice';
u.hair.visible=t.defect==='hair';
u.rim.rotation.y=t.defect==='lid'?0.24:0;
u.rim.position.x=t.defect==='lid'?0.024:0;
const comps=u.compartments;
for(let c=0;c<comps.length;c++)comps[c].visible=false;
const itemsToShow=[t.other,...(t.placed||[])].filter(Boolean);
for(const itemKey of itemsToShow){
const prefIdx=ITEM_KEYS.indexOf(itemKey);
let slotIdx=prefIdx>=0&&!comps[prefIdx].visible
?prefIdx
:comps.findIndex((c)=>!c.visible);
if(slotIdx>=0&&sideMats[itemKey]){
comps[slotIdx].visible=true;
setDishClusterMaterial(comps[slotIdx],sideMats[itemKey]);
}
}
const showIcon=!t.done&&!t.missed&&t.x>=BENTO.ZONE0-BENTO.LOOKAHEAD-3.5&&t.x<=BENTO.ZONE1;
slot.sprite.visible=showIcon;
if(showIcon){
const orderStr=(t.order||[t.need]).join(',');
const sig=`${t.id}:${t.defect || ''}:${orderStr}:${t.stepIdx || 0}`;
if(slot.sig!==sig){
slot.sig=sig;
drawOrderBadge(slot.badge,t);
}
}
}
for(let i=n;i<pool.length;i++)pool[i].group.visible=false;
}
function clearTrays(){
for(const slot of pool)slot.group.visible=false;
}
function update(dt){
for(const w of lineWorkers){
w.timer-=dt;
if(w.timer<=0){
w.timer=w.period;
w.ch.triggerPick(w.dish,0.38);
}
w.ch.update(dt);
}
}
const blocks=[
{x:-0.38,z:0.58,r:0.35},
{x:0.00,z:0.58,r:0.35},
{x:0.38,z:0.58,r:0.35},
];
return{
scene,
sun,
blocks,
lineWorkers,
showcase:{pos:new THREE.Vector3(...BENTO_ROOM.showcase.pos),look:new THREE.Vector3(...BENTO_ROOM.showcase.look)},
syncTrays,
clearTrays,
update,
};
}
