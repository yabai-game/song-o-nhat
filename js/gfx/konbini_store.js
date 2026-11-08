/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{canvasTexture,makeSun,loadModel}from'./stage.js';
import{makeCharacter}from'./chars.js';
import{KONBINI_STORE}from'../core/konbini_view.js';
export const KONBINI_COLORS={top:'#4a9ec8',bottom:'#1f2b3a'};
export{KONBINI_STORE};
const CUST_POOL_KINDS=['f_casual','hoodie','suit','f_office'];
export const COUNTER_TOP_Y=0.93;
export const MODEL_3D_GOODS={
onigiri:{model:'kb_onigiri',rotY:0},
ocha:{model:'kb_ocha',rotY:-0.45,frontSide:true},
coffee:{model:'kb_coffee',rotY:0},
sandwich:{model:'kb_sandwich',rotY:0},
cupmen:{model:'kb_cupnoodle',rotY:0},
pan:{model:'kb_croissant',rotY:0},
ice:{model:'kb_icecream',rotY:0},
bento:{model:'bento_box',rotY:0,normalizeLongSide:0.14},
karaage_bou:{model:'kb_karaagebou',rotY:0,rotZ:Math.PI/2},
nikuman:{model:'kb_nikuman',rotY:0},
};
function makeScannedCheckMaterial(){
const tex=canvasTexture(64,64,(g)=>{
g.clearRect(0,0,64,64);
g.fillStyle='#27ae60';
g.beginPath();
g.arc(32,32,26,0,Math.PI*2);
g.fill();
g.lineWidth=4;
g.strokeStyle='#ffffff';
g.stroke();
g.fillStyle='#ffffff';
g.textAlign='center';
g.textBaseline='middle';
g.font='900 34px "Be Vietnam Pro", sans-serif';
g.fillText('✓',32,34);
});
return new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
}
function buildItem3DTemplate(gltf,cfg){
const group=new THREE.Group();
const inner=gltf.scene.clone(true);
inner.traverse((o)=>{
if(!o.isMesh)return;
o.castShadow=false;
o.receiveShadow=true;
if(cfg.frontSide&&o.material){
o.material=o.material.clone();
o.material.side=THREE.FrontSide;
o.material.depthWrite=true;
}
});
inner.rotation.set(cfg.rotX||0,cfg.rotY||0,cfg.rotZ||0);
inner.updateMatrixWorld(true);
const bb=new THREE.Box3().setFromObject(inner);
const sz=new THREE.Vector3();
const center=new THREE.Vector3();
bb.getSize(sz);
bb.getCenter(center);
let scale=1.6;
if(cfg.normalizeLongSide){
const longSide=Math.max(sz.x,sz.y,sz.z)||1;
scale=(cfg.normalizeLongSide/longSide)*1.6;
}
inner.scale.setScalar(scale);
inner.position.set(-center.x*scale,-bb.min.y*scale,-center.z*scale);
group.add(inner);
const topY=sz.y*scale;
return{group,topY};
}
function makeRegisterScreen(){
const c=document.createElement('canvas');
c.width=256;
c.height=128;
const g=c.getContext('2d');
const tex=new THREE.CanvasTexture(c);
tex.colorSpace=THREE.SRGBColorSpace;
const mat=new THREE.MeshBasicMaterial({
map:tex,
polygonOffset:true,
polygonOffsetFactor:-1,
polygonOffsetUnits:-1,
});
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
function addModelInstance(scene,gltf,x,y,z,ry=0,scale=1,rx=0,rz=0){
const obj=gltf.scene.clone(true);
obj.position.set(x,y,z);
obj.rotation.set(rx,ry,rz);
obj.scale.setScalar(scale);
obj.traverse((o)=>{
if(o.isMesh){
o.castShadow=false;
o.receiveShadow=true;
}
});
scene.add(obj);
return obj;
}
export async function buildKonbiniStore(){
const[
roomGltf,
counterGltf,
registerGltf,
terminalGltf,
hotcaseGltf,
coffeemachGltf,
onigiriGltf,
ochaGltf,
coffeeGltf,
sandwichGltf,
cupnoodleGltf,
croissantGltf,
icecreamGltf,
bentoGltf,
karaagebouGltf,
nikumanGltf,
]=await Promise.all(
[
'konbini_room',
'kb_counter',
'kb_register',
'kb_terminal',
'kb_hotcase',
'kb_coffeemach',
'kb_onigiri',
'kb_ocha',
'kb_coffee',
'kb_sandwich',
'kb_cupnoodle',
'kb_croissant',
'kb_icecream',
'bento_box',
'kb_karaagebou',
'kb_nikuman',
].map(loadModel),
);
const gltfByGood={
onigiri:onigiriGltf,
ocha:ochaGltf,
coffee:coffeeGltf,
sandwich:sandwichGltf,
cupmen:cupnoodleGltf,
pan:croissantGltf,
ice:icecreamGltf,
bento:bentoGltf,
karaage_bou:karaagebouGltf,
nikuman:nikumanGltf,
};
const item3DTemplates={};
for(const[goodId,cfg]of Object.entries(MODEL_3D_GOODS)){
const gltf=gltfByGood[goodId];
if(gltf){
const tpl=buildItem3DTemplate(gltf,cfg);
cfg.topY=tpl.topY;
item3DTemplates[goodId]=tpl;
}
}
const scene=new THREE.Scene();
scene.background=new THREE.Color('#eef3f6');
scene.fog=new THREE.FogExp2(new THREE.Color('#eef3f6'),0.012);
scene.add(new THREE.HemisphereLight(0xffffff,0xd8e0e6,1.55));
const fill=new THREE.DirectionalLight(0xf6faff,0.85);
fill.position.set(-4,7,-5);
scene.add(fill);
const sun=makeSun(scene,{color:0xfffcf5,intensity:1.55,size:8,offset:[3,9,4]});
const counterLight=new THREE.PointLight(0xfff9ec,0.9,9,1.4);
counterLight.position.set(0,3.1,1.2);
scene.add(counterLight);
const room=roomGltf.scene;
room.position.set(0,0,0);
room.rotation.set(0,0,0);
room.scale.set(1,1,1);
room.traverse((o)=>{
if(o.isMesh){
o.castShadow=false;
o.receiveShadow=true;
}
});
scene.add(room);
addModelInstance(scene,counterGltf,0.05,0,1.38);
const regX=-0.42;
const regZ=1.40;
addModelInstance(scene,registerGltf,regX,COUNTER_TOP_Y,regZ);
const regScreen=makeRegisterScreen();
drawRegisterScreen(regScreen,null);
const screenMesh=new THREE.Mesh(new THREE.PlaneGeometry(0.17,0.13),regScreen.mat);
const normX=-0.01;
const normY=0.34;
const normZ=0.94;
screenMesh.position.set(
regX+0.068+normX*0.002,
COUNTER_TOP_Y+0.288+normY*0.002,
regZ+0.043+normZ*0.002,
);
screenMesh.lookAt(
screenMesh.position.x+normX,
screenMesh.position.y+normY,
screenMesh.position.z+normZ,
);
scene.add(screenMesh);
addModelInstance(scene,terminalGltf,-0.15,COUNTER_TOP_Y,1.06,Math.PI);
const hotX=0.56;
const hotZ=1.40;
const hotCaseObj=addModelInstance(scene,hotcaseGltf,hotX,COUNTER_TOP_Y,hotZ);
let hotCaseMesh=null;
hotCaseObj.traverse((o)=>{
if(o.isMesh&&(!hotCaseMesh||o.name==='Object_0010')){
hotCaseMesh=o;
}
});
for(const dx of[-0.11,0,0.11]){
addModelInstance(scene,nikumanGltf,hotX+dx,COUNTER_TOP_Y+0.18,hotZ,0,0.8);
}
for(const dx of[-0.11,0,0.11]){
addModelInstance(scene,karaagebouGltf,hotX+dx,COUNTER_TOP_Y+0.086+0.02,hotZ-0.068,0,0.8,Math.PI/2,0);
}
const[cx,cy,cz]=KONBINI_STORE.coffeePos;
addModelInstance(scene,coffeemachGltf,cx,cy,cz);
const scannedCheckMat=makeScannedCheckMaterial();
const itemMeshes=[];
const slotViews=KONBINI_STORE.itemSlots.map(([sx,,sz],idx)=>{
const models={};
for(const[goodId,tpl]of Object.entries(item3DTemplates)){
const grp=tpl.group.clone(true);
grp.position.set(sx,COUNTER_TOP_Y,sz);
grp.visible=false;
const meshes=[];
grp.traverse((o)=>{
if(o.isMesh){
o.visible=false;
o.userData={slotIdx:idx};
itemMeshes.push(o);
meshes.push(o);
}
});
scene.add(grp);
models[goodId]={grp,meshes,topY:tpl.topY};
}
const checkSprite=new THREE.Sprite(scannedCheckMat);
checkSprite.scale.set(0.072,0.072,1);
checkSprite.position.set(sx,COUNTER_TOP_Y+0.22,sz);
checkSprite.visible=false;
scene.add(checkSprite);
return{models,checkSprite};
});
const bagMesh=new THREE.Mesh(
new THREE.BoxGeometry(0.16,0.20,0.12),
new THREE.MeshStandardMaterial({color:'#f8fafc',roughness:0.55}),
);
bagMesh.position.set(-0.26,COUNTER_TOP_Y+0.10,1.48);
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
function hideSlotView(sv){
sv.checkSprite.visible=false;
for(const entry of Object.values(sv.models)){
entry.grp.visible=false;
for(let i=0;i<entry.meshes.length;i++){
entry.meshes[i].visible=false;
}
}
}
function syncShift(st){
if(!st){
drawRegisterScreen(regScreen,null);
for(const sv of slotViews)hideSlotView(sv);
bagMesh.visible=false;
for(const p of custPool)p.ch.holder.visible=false;
return;
}
const c=st.cur;
drawRegisterScreen(regScreen,c);
const counterItems=c?c.items:[];
for(let i=0;i<slotViews.length;i++){
const sv=slotViews[i];
const it=counterItems[i];
if(!it||c.step==='done'){
hideSlotView(sv);
continue;
}
const[bx,,bz]=KONBINI_STORE.itemSlots[i];
const px=bx;
const pz=bz;
const liftY=it.scanned?0.02:0;
const baseY=COUNTER_TOP_Y+liftY;
let activeTopY=0.16;
for(const[k,entry]of Object.entries(sv.models)){
const on=k===it.id;
entry.grp.visible=on;
for(let m=0;m<entry.meshes.length;m++){
entry.meshes[m].visible=on;
}
if(on){
entry.grp.position.set(px,baseY,pz);
activeTopY=entry.topY;
}
}
sv.checkSprite.visible=Boolean(it.scanned);
if(it.scanned){
sv.checkSprite.position.set(px,baseY+activeTopY+0.042,pz);
}
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
const uploadedTextures=new Set();
let warmPromise=null;
let texturesWarmed=false;
const warmStats={total:0,frames:0,perFrame:[]};
function warmTextures(renderer,maxPerFrame=4){
if(texturesWarmed)return Promise.resolve(warmStats);
if(warmPromise)return warmPromise;
const queue=[];
const addTex=(t)=>{
if(t&&t.isTexture&&!uploadedTextures.has(t)){
uploadedTextures.add(t);
queue.push(t);
}
};
const collectFrom=(root)=>{
root.traverse((o)=>{
if(!o.material)return;
for(const m of[].concat(o.material)){
if(!m)continue;
for(const k of['map','alphaMap','emissiveMap','normalMap','roughnessMap','metalnessMap'])addTex(m[k]);
}
});
};
collectFrom(scene);
for(const tpl of Object.values(item3DTemplates))collectFrom(tpl.group);
warmStats.total=queue.length;
warmStats.frames=0;
warmStats.perFrame=[];
if(!queue.length){
texturesWarmed=true;
return Promise.resolve(warmStats);
}
const raf=typeof requestAnimationFrame==='function'?requestAnimationFrame:(fn)=>setTimeout(fn,16);
warmPromise=new Promise((resolve)=>{
const step=()=>{
const n=Math.min(maxPerFrame,queue.length);
for(let i=0;i<n;i++){
const tex=queue.shift();
try{renderer.initTexture(tex);}catch{}
}
warmStats.frames++;
warmStats.perFrame.push(n);
if(queue.length>0){
raf(step);
}else{
texturesWarmed=true;
resolve(warmStats);
}
};
raf(step);
});
return warmPromise;
}
return{
scene,
sun,
blocks:KONBINI_STORE.blocks,
showcase:{pos:new THREE.Vector3(...KONBINI_STORE.showcase.pos),look:new THREE.Vector3(...KONBINI_STORE.showcase.look)},
foreman:tencho,
tencho,
custPool,
itemMeshes,
hotCaseMesh,
syncShift,
triggerLeave,
warmTextures,
isTexturesWarmed:()=>texturesWarmed,
warmStats,
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
}
tencho.update(dt);
},
};
}
