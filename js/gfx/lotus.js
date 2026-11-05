/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,signTexture,makeSun,skyDome,loadModel,camera}from'./stage.js';
import{buildBackdrop}from'./backdrop.js';
import{LOTUS}from'../core/lotus_rules.js';
import{rng}from'../core/crowd.js';
export const LOTUS_FIELD={
groundY:LOTUS.GROUND_Y,
bounds:{x0:-9.5,x1:9.5,z0:5.8,z1:7.5},
paddyBounds:LOTUS.BOUNDS,
start:{x:5.2,z:6.6,yaw:-Math.PI/2},
greeterAt:{x:-1.6,z:6.4,yaw:1.25},
talkPlayer:{x:-0.6,z:6.5},
player:{x:0,z:3.2,yaw:Math.PI},
foreman:{x:-2.6,z:6.2,yaw:Math.PI},
basket:{x:-1.1,z:5.95,y:0.02},
showcase:{pos:[0.5,4.3,10.4],look:[0,0.1,0.4]},
};
export async function buildLotus(){
const[lotusPlant,lotusRoot,houseBeige]=await Promise.all([
loadModel('lotus_plant'),
loadModel('lotus_root'),
loadModel('house_beige'),
]);
const scene=new THREE.Scene();
const sky=skyDome(scene,'#82b3d6','#e3ebe4');
scene.fog=new THREE.FogExp2(new THREE.Color('#dfe7e0'),0.0045);
const hemi=new THREE.HemisphereLight(0xf4f8fb,0x6b5a45,0.95);
scene.add(hemi);
const fill=new THREE.DirectionalLight(0xd9e8f5,0.55);
fill.position.set(-8,10,-6);
scene.add(fill);
const sun=makeSun(scene,{color:0xfff2dc,intensity:2.2,size:15,offset:[7,13,8]});
buildBackdrop(scene,{houseLight:houseBeige,isFree:(x,z)=>!(Math.abs(x)<45&&Math.abs(z)<45),ground:false});
const grassMat=new THREE.MeshStandardMaterial({color:'#6b824e',roughness:0.95});
const grass=new THREE.Mesh(new THREE.PlaneGeometry(420,420),grassMat);
grass.rotation.x=-Math.PI/2;
grass.position.y=-0.18;
grass.receiveShadow=true;
scene.add(grass);
const mudTex=canvasTexture(128,128,(g)=>{
g.fillStyle='#3b2a1e';
g.fillRect(0,0,128,128);
const r=rng(101);
for(let i=0;i<180;i++){
g.fillStyle=i%2?'rgba(42, 29, 20, 0.45)':'rgba(72, 53, 38, 0.38)';
g.beginPath();
g.arc(r()*128,r()*128,2+r()*7,0,Math.PI*2);
g.fill();
}
},[8,5]);
const mudFloor=new THREE.Mesh(
new THREE.PlaneGeometry(24.4,11.4),
new THREE.MeshStandardMaterial({map:mudTex,roughness:0.92}),
);
mudFloor.rotation.x=-Math.PI/2;
mudFloor.position.set(0,LOTUS.GROUND_Y,0.6);
mudFloor.receiveShadow=true;
scene.add(mudFloor);
const waterMat=new THREE.MeshStandardMaterial({
color:'#4e614a',
roughness:0.14,
metalness:0.25,
transparent:true,
opacity:0.62,
});
const water=new THREE.Mesh(new THREE.PlaneGeometry(23.8,10.8),waterMat);
water.rotation.x=-Math.PI/2;
water.position.set(0,-0.02,0.6);
water.receiveShadow=true;
scene.add(water);
for(const nx of[-27,27]){
const nWater=new THREE.Mesh(new THREE.PlaneGeometry(22,10.8),waterMat);
nWater.rotation.x=-Math.PI/2;
nWater.position.set(nx,-0.03,0.6);
scene.add(nWater);
}
const batch=new Map(),mats={};
const col=(c,o={})=>mats[c]||(mats[c]=new THREE.MeshStandardMaterial({color:c,roughness:0.85,...o}));
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s1=new THREE.Vector3(1,1,1);
function put(geo,m,x,y,z,ry=0){
e.set(0,ry,0);q.setFromEuler(e);p.set(x,y,z);
let g=geo.applyMatrix4(m4.compose(p,q,s1));if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
if(!batch.has(m))batch.set(m,[]);batch.get(m).push(g);
}
const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const earth=col('#5a4330',{roughness:0.92});
const bundTop=col('#6f7d4e',{roughness:0.88});
const pathSoil=col('#7c6449',{roughness:0.9});
const wood=col('#6d4c33',{roughness:0.8});
const roof=col('#4a5864',{metalness:0.25,roughness:0.6});
const crate=col('#2b6ca3',{roughness:0.55});
put(B(30,0.22,2.8),earth,0,-0.09,6.7);
put(B(29.6,0.04,2.2),pathSoil,0,0.0,6.7);
put(B(30,0.24,1.8),earth,0,-0.08,-5.5);
put(B(29.6,0.05,1.4),bundTop,0,0.04,-5.5);
put(B(1.8,0.22,14.0),earth,-12.4,-0.09,0.6);
put(B(1.4,0.05,13.6),bundTop,-12.4,0.02,0.6);
put(B(1.8,0.22,14.0),earth,12.4,-0.09,0.6);
put(B(1.4,0.05,13.6),bundTop,12.4,0.02,0.6);
const sx=-6.8,sz=6.9;
for(const[dx,dz]of[[-1.1,-0.6],[1.1,-0.6],[-1.1,0.6],[1.1,0.6]]){
put(B(0.12,2.2,0.12),wood,sx+dx,1.1,sz+dz);
}
put(B(2.6,0.12,1.6),roof,sx,2.24,sz);
put(B(1.8,0.08,0.42),wood,sx,0.42,sz+0.35);
const bx=LOTUS_FIELD.basket.x,bz=LOTUS_FIELD.basket.z,by=LOTUS_FIELD.basket.y;
put(B(0.76,0.04,0.54),crate,bx,by+0.02,bz);
put(B(0.76,0.26,0.04),crate,bx,by+0.15,bz-0.25);
put(B(0.76,0.26,0.04),crate,bx,by+0.15,bz+0.25);
put(B(0.04,0.26,0.50),crate,bx-0.36,by+0.15,bz);
put(B(0.04,0.26,0.50),crate,bx+0.36,by+0.15,bz);
for(const[m,list]of batch){
const mesh=new THREE.Mesh(mergeGeometries(list,false),m);
mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
}
const signPost=new THREE.Mesh(B(0.08,1.45,0.08),wood);
signPost.position.set(3.8,0.72,7.2);
signPost.castShadow=true;
scene.add(signPost);
const signBoard=new THREE.Mesh(
new THREE.PlaneGeometry(1.75,0.52),
new THREE.MeshStandardMaterial({map:signTexture('霞ヶ浦 蓮田',512,148,'#f5efe2','#2c2218'),roughness:0.6}),
);
signBoard.position.set(3.8,1.25,7.15);
scene.add(signBoard);
let plantGeo=null,plantMat=null;
lotusPlant.scene.traverse((o)=>{
if(o.isMesh&&!plantGeo){plantGeo=o.geometry;plantMat=o.material;}
});
const rand=rng(404);
const plants=[];
for(let row=-3.6;row<=4.4;row+=1.35){
for(let colX=-10.0;colX<=10.0;colX+=1.45){
const x=colX+(rand()-0.5)*0.55;
const z=row+(rand()-0.5)*0.45;
let nearSpot=false;
for(const[sxSpot,szSpot]of LOTUS.SPOTS){
if(Math.hypot(x-sxSpot,z-szSpot)<0.75){nearSpot=true;break;}
}
if(nearSpot)continue;
plants.push({
x,y:LOTUS.GROUND_Y,z,
ry:rand()*Math.PI*2,
s:0.68+rand()*0.42,
phase:rand()*Math.PI*2,
hidden:false,
});
}
}
for(const[sxSpot,szSpot]of LOTUS.SPOTS){
for(const dx of[-0.52,0.52]){
plants.push({
x:sxSpot+dx,
y:LOTUS.GROUND_Y,
z:szSpot-0.38,
ry:rand()*Math.PI*2,
s:0.78+rand()*0.25,
phase:rand()*Math.PI*2,
hidden:false,
});
}
}
const plantMesh=new THREE.InstancedMesh(plantGeo,plantMat,plants.length);
plantMesh.castShadow=true;
plantMesh.receiveShadow=true;
const dummyPhr=new THREE.Vector3(),dummyScale=new THREE.Vector3(),zeroScale=new THREE.Vector3(0,0,0);
const dummyEuler=new THREE.Euler(),dummyQuat=new THREE.Quaternion(),dummyMat=new THREE.Matrix4();
for(let i=0;i<plants.length;i++){
const pl=plants[i];
dummyPhr.set(pl.x,pl.y,pl.z);
dummyEuler.set(0,pl.ry,0);
dummyQuat.setFromEuler(dummyEuler);
dummyScale.setScalar(pl.s);
dummyMat.compose(dummyPhr,dummyQuat,dummyScale);
plantMesh.setMatrixAt(i,dummyMat);
}
plantMesh.instanceMatrix.needsUpdate=true;
scene.add(plantMesh);
const moundMat=new THREE.MeshStandardMaterial({color:'#423022',roughness:0.92});
const weedMat=new THREE.MeshStandardMaterial({color:'#3b7a2e',roughness:0.85});
const moundGeo=new THREE.CylinderGeometry(0.42,0.62,0.18,16);
const bladeGeo=new THREE.ConeGeometry(0.06,0.38,5);
const ringGeo=new THREE.RingGeometry(0.58,0.74,28);
const spotVisuals=LOTUS.SPOTS.map(([x,z],idx)=>{
const group=new THREE.Group();
group.position.set(x,0,z);
const mound=new THREE.Mesh(moundGeo,moundMat);
mound.position.y=LOTUS.GROUND_Y+0.09;
mound.castShadow=true;
mound.receiveShadow=true;
const weeds=new THREE.Group();
for(let k=0;k<7;k++){
const a=(k/7)*Math.PI*2+idx*0.3;
const r=0.16+(k%2)*0.14;
const b=new THREE.Mesh(bladeGeo,weedMat);
b.position.set(Math.cos(a)*r,LOTUS.GROUND_Y+0.24,Math.sin(a)*r);
b.rotation.set(Math.sin(a)*0.28,a,-Math.cos(a)*0.28);
weeds.add(b);
}
weeds.visible=false;
const root=lotusRoot.scene.clone(true);
root.scale.setScalar(1.45);
root.position.y=LOTUS.GROUND_Y+0.06;
root.rotation.y=(idx*1.1)%(Math.PI*2);
root.traverse((o)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
root.visible=false;
const ringMat=new THREE.MeshBasicMaterial({
color:'#f5c71a',
side:THREE.DoubleSide,
transparent:true,
opacity:0.72,
depthWrite:false,
});
const ring=new THREE.Mesh(ringGeo,ringMat);
ring.rotation.x=-Math.PI/2;
ring.position.y=0.005;
group.add(mound,weeds,root,ring);
scene.add(group);
return{group,mound,weeds,root,ring,ringMat};
});
const basketRoots=[];
for(let i=0;i<8;i++){
const rMesh=lotusRoot.scene.clone(true);
rMesh.scale.setScalar(1.25);
const row=Math.floor(i/4),colIdx=i%4;
rMesh.position.set(
bx-0.21+colIdx*0.14,
by+0.05+row*0.075,
bz+(row?0.04:-0.04),
);
rMesh.rotation.y=(i%2)*0.35-0.15;
rMesh.traverse((o)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
rMesh.visible=false;
scene.add(rMesh);
basketRoots.push(rMesh);
}
function setCollected(count){
for(let i=0;i<basketRoots.length;i++){
basketRoots[i].visible=i<count;
}
}
function syncSpots(spots,nearSpot=null){
for(let i=0;i<spotVisuals.length;i++){
const v=spotVisuals[i],sp=spots?spots[i]:null;
const st=sp?sp.state:0;
if(st>=4){
v.mound.visible=false;
v.weeds.visible=false;
v.root.visible=false;
v.ring.visible=false;
continue;
}
v.ring.visible=true;
v.weeds.visible=st<0;
const isNear=!!(nearSpot&&nearSpot.id===i);
v.ringMat.color.set(isNear?'#fff066':st<0?'#7ed6a0':'#f5c71a');
v.ringMat.opacity=isNear?0.92:0.62;
if(st<=0){
v.mound.visible=true;
v.mound.scale.set(1,1,1);
v.mound.position.y=LOTUS.GROUND_Y+0.09;
v.root.visible=false;
}else if(st===1){
v.mound.visible=true;
v.mound.scale.set(0.85,0.5,0.85);
v.mound.position.y=LOTUS.GROUND_Y+0.045;
v.root.visible=true;
v.root.position.y=LOTUS.GROUND_Y+0.02;
v.root.rotation.z=0;
}else if(st===2){
v.mound.visible=false;
v.root.visible=true;
v.root.position.y=-0.04;
v.root.rotation.z=0.08;
}else if(st===3){
v.mound.visible=false;
v.root.visible=true;
v.root.position.y=0.015;
v.root.rotation.z=0.28;
}
}
}
const SPRAY_N=28;
const sprayPos=new Float32Array(SPRAY_N*3);
const sprayGeo=new THREE.BufferGeometry();
sprayGeo.setAttribute('position',new THREE.BufferAttribute(sprayPos,3));
const sprayPts=new THREE.Points(
sprayGeo,
new THREE.PointsMaterial({color:'#dff4ff',size:0.11,transparent:true,opacity:0.85}),
);
sprayPts.visible=false;
sprayPts.frustumCulled=false;
scene.add(sprayPts);
let sprayTime=0;
function setSpray(active,fromPos,toX=0,toZ=0,dt=0.016){
sprayPts.visible=!!active;
if(!active||!fromPos)return;
sprayTime+=dt*4.5;
const ox=fromPos.x,oy=fromPos.y+0.55,oz=fromPos.z;
const dx=toX-ox,dz=toZ-oz;
for(let i=0;i<SPRAY_N;i++){
const u=((i/SPRAY_N)+sprayTime)%1;
const spread=u*0.18;
const a=i*2.39996;
sprayPos[i*3]=ox+dx*u+Math.cos(a)*spread;
sprayPos[i*3+1]=oy*(1-u)+(-0.01)*u+Math.sin(u*Math.PI)*0.22;
sprayPos[i*3+2]=oz+dz*u+Math.sin(a)*spread;
}
sprayGeo.attributes.position.needsUpdate=true;
}
const RAIN_N=200;
const rainPos=new Float32Array(RAIN_N*6);
for(let i=0;i<RAIN_N;i++){
const x=(Math.random()-0.5)*26,y=Math.random()*10,z=(Math.random()-0.5)*16;
rainPos.set([x,y,z,x-0.12,y-0.65,z],i*6);
}
const rainGeo=new THREE.BufferGeometry();
rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rain=new THREE.LineSegments(
rainGeo,
new THREE.LineBasicMaterial({color:0xc8d8e8,transparent:true,opacity:0.55}),
);
rain.visible=false;
scene.add(rain);
function setWeather({rain:isRain=false,cold=false,pm=false}={}){
rain.visible=isRain;
if(isRain){
sky.setColors('#5e6e7e','#aeb8c0');
scene.fog.color.set('#aeb8c0');
sun.intensity=1.15;
}else if(cold){
sky.setColors('#74a3c8','#dce6ec');
scene.fog.color.set('#dce6ec');
sun.intensity=1.9;
}else if(pm){
sky.setColors('#6b9fc9','#eadbc8');
scene.fog.color.set('#e5ddd2');
sun.intensity=2.05;
}else{
sky.setColors('#82b3d6','#e3ebe4');
scene.fog.color.set('#dfe7e0');
sun.intensity=2.2;
}
}
const blocks=[
{x:sx,z:sz,r:1.1},
{x:bx,z:bz,r:0.55},
];
return{
scene,
sun,
blocks,
spotGroups:spotVisuals.map((v)=>v.group),
showcase:{pos:new THREE.Vector3(...LOTUS_FIELD.showcase.pos),look:new THREE.Vector3(...LOTUS_FIELD.showcase.look)},
syncSpots,
setCollected,
setSpray,
setWeather,
update(dt,t){
const cx=camera.position.x,cz=camera.position.z;
let changed=false;
for(let i=0;i<plants.length;i++){
const pl=plants[i];
const hide=Math.hypot(pl.x-cx,pl.z-cz)<LOTUS.HIDE_CAM_DIST;
if(hide!==pl.hidden){
pl.hidden=hide;
changed=true;
if(hide){
dummyMat.compose(dummyPhr.set(pl.x,pl.y,pl.z),dummyQuat.identity(),zeroScale);
}else{
dummyEuler.set(0,pl.ry,0);
dummyQuat.setFromEuler(dummyEuler);
dummyScale.setScalar(pl.s);
dummyMat.compose(dummyPhr.set(pl.x,pl.y,pl.z),dummyQuat,dummyScale);
}
plantMesh.setMatrixAt(i,dummyMat);
}
}
if(changed)plantMesh.instanceMatrix.needsUpdate=true;
const s=1+Math.sin(t*4)*0.05;
for(const v of spotVisuals){
if(v.ring.visible)v.ring.scale.set(s,s,1);
}
if(rain.visible){
const a=rainGeo.attributes.position.array;
for(let i=0;i<RAIN_N;i++){
let y=a[i*6+1]-dt*14;
if(y<0)y+=10;
a[i*6+1]=y;
a[i*6+4]=y-0.65;
}
rainGeo.attributes.position.needsUpdate=true;
}
},
};
}
