/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{SEASON_IDS,SEASON_LOOK,makeSeasonFx}from'./season.js';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,signTexture,makeSun,skyDome,loadModel,shadowAll}from'./stage.js';
import{makeFestival,FESTIVAL_SPOTS}from'./festival.js';
import{buildBackdrop}from'./backdrop.js';
const MODELS=['torii','stone_lantern','temple','sakura','lantern','house_beige'];
export const SHRINE={
festival:FESTIVAL_SPOTS,
start:{x:0,z:10.6,yaw:Math.PI},
bounds:{x0:-8.5,x1:9.2,z0:-2.4,z1:11.4},
spots:{
pray:{x:0,z:-1.7,r:1.75,look:{x:0,z:-3.2}},
omikuji:{x:-3.5,z:-1.6,r:1.75,look:{x:-3.6,z:-3.0}},
hanami:{x:4.5,z:1.85,r:1.95,look:{x:4.5,z:0.7}},
},
seats:{
hung:{x:3.85,z:0.55,yaw:0.48},
hoa:{x:5.15,z:0.55,yaw:-0.48},
player:{x:4.5,z:1.65,yaw:Math.PI},
},
blocks:[
{x:-2.5,z:8.2,r:0.45},
{x:2.5,z:8.2,r:0.45},
{x:0,z:-3.2,r:0.85},
{x:-3.6,z:-3.0,r:0.85},
{x:-2.35,z:5.4,r:0.42},
{x:2.35,z:5.4,r:0.42},
{x:-2.35,z:2.2,r:0.42},
{x:2.35,z:2.2,r:0.42},
{x:-2.35,z:-0.8,r:0.42},
{x:2.35,z:-0.8,r:0.42},
],
};
export async function buildShrine(){
const gl=Object.fromEntries(await Promise.all(MODELS.map(async(n)=>[n,await loadModel(n)])));
const scene=new THREE.Scene();
const SKY=new THREE.Color('#c8e4f4');
scene.background=SKY.clone();
scene.fog=new THREE.FogExp2(new THREE.Color('#dcebf2'),0.0045);
const hemi=new THREE.HemisphereLight(0xf6fbff,0x9b896f,1.15);
scene.add(hemi);
const fill=new THREE.DirectionalLight(0xe6f0ff,0.65);
fill.position.set(-6,10,8);
scene.add(fill);
const sun=makeSun(scene,{color:0xfff3de,intensity:2.3,size:18,offset:[8,15,10]});
const sky=skyDome(scene,'#74b2dc','#e5f0f5');
const backdrop=buildBackdrop(scene,{
houseLight:gl.house_beige,
isFree:(x,z)=>!(Math.abs(x)<42&&Math.abs(z)<42),
ground:false,
});
const grass=new THREE.Mesh(
new THREE.PlaneGeometry(420,420),
new THREE.MeshStandardMaterial({color:'#7ea856',roughness:0.96}),
);
grass.rotation.x=-Math.PI/2;
grass.position.y=-0.04;
grass.receiveShadow=true;
scene.add(grass);
const gravelTex=canvasTexture(256,256,(g)=>{
g.fillStyle='#ddd8cc';g.fillRect(0,0,256,256);
for(let i=0;i<1800;i++){
const v=185+((i*53)%55);
g.fillStyle=`rgba(${v},${v - 4},${v - 10},0.45)`;
g.fillRect((i*97)%256,(i*151)%256,2,2);
}
g.strokeStyle='rgba(160,152,138,0.28)';g.lineWidth=2;
for(let y=8;y<256;y+=16){
g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();
}
},[8,6]);
const courtyard=new THREE.Mesh(
new THREE.PlaneGeometry(22,16),
new THREE.MeshStandardMaterial({map:gravelTex,roughness:0.95,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),
);
courtyard.rotation.x=-Math.PI/2;
courtyard.position.set(-1.0,0.005,-5.5);
courtyard.receiveShadow=true;
scene.add(courtyard);
const stonePathTex=canvasTexture(256,256,(g)=>{
g.fillStyle='#999287';g.fillRect(0,0,256,256);
for(let r=0;r<4;r++){
for(let c=0;c<2;c++){
const x=c*128+(r%2)*32-16;
const y=r*64;
g.fillStyle=(r+c)%2?'#b8b1a5':'#aca598';
g.fillRect(x+4,y+4,120,56);
g.strokeStyle='#756e64';g.lineWidth=3;
g.strokeRect(x+4,y+4,120,56);
}
}
},[2,8]);
const approach=new THREE.Mesh(
new THREE.PlaneGeometry(3.2,15.6),
new THREE.MeshStandardMaterial({map:stonePathTex,roughness:0.88,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
);
approach.rotation.x=-Math.PI/2;
approach.position.set(0,0.012,4.8);
approach.receiveShadow=true;
scene.add(approach);
const batch=new Map();
const mats={};
const col=(c,o={})=>mats[c+JSON.stringify(o)]||(mats[c+JSON.stringify(o)]=new THREE.MeshStandardMaterial({color:c,roughness:0.82,...o}));
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s1=new THREE.Vector3(1,1,1);
function put(geo,m,x,y,z,ry=0,rx=0){
e.set(rx,ry,0);q.setFromEuler(e);p.set(x,y,z);
let g=geo.clone().applyMatrix4(m4.compose(p,q,s1));
if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
if(!batch.has(m))batch.set(m,[]);
batch.get(m).push(g);
}
const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const torii=shadowAll(gl.torii.scene.clone(true));
torii.position.set(0,0,8.2);
scene.add(torii);
const propBatch=new Map();
function putProp(modelKey,x,y,z,ry=0,sc=1){
const root=gl[modelKey].scene;
root.position.set(x,y,z);
root.rotation.set(0,ry,0);
root.scale.setScalar(sc);
root.updateMatrixWorld(true);
root.traverse((o)=>{
if(!o.isMesh||!o.geometry||!o.material)return;
let g=o.geometry.clone().applyMatrix4(o.matrixWorld);
if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
if(!propBatch.has(o.material))propBatch.set(o.material,[]);
propBatch.get(o.material).push(g);
});
root.position.set(0,0,0);
root.rotation.set(0,0,0);
root.scale.setScalar(1);
root.updateMatrixWorld(true);
}
for(const z of[5.4,2.2,-0.8]){
for(const sx of[-2.35,2.35]){
putProp('stone_lantern',sx,0,z,sx<0?Math.PI/2:-Math.PI/2,1);
}
}
const temple=shadowAll(gl.temple.scene.clone(true));
temple.position.set(-2.8,0,-12.2);
temple.rotation.y=0.2;
scene.add(temple);
for(const x of[-2.2,-1.1,1.1,2.2]){
putProp('lantern',x,2.45,-4.4,0,1.15);
}
for(const[m,list]of propBatch){
const hasUv=list.some((g)=>g.attributes.uv);
if(hasUv){
for(const g of list){
if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
}
}
const merged=mergeGeometries(list,false);
if(!merged)continue;
const mesh=new THREE.Mesh(merged,m);
mesh.castShadow=true;mesh.receiveShadow=false;scene.add(mesh);
}
const woodDark=col('#5b3a22'),woodMid=col('#7c5232'),brass=col('#c8a858',{metalness:0.5,roughness:0.4});
const sx=0,sz=-3.2;
put(B(1.42,0.78,0.86),woodMid,sx,0.39,sz);
put(B(1.5,0.08,0.94),woodDark,sx,0.78,sz);
for(let i=-2;i<=2;i++){
put(B(1.32,0.04,0.05),woodDark,sx,0.82,sz+i*0.14);
}
put(B(1.46,0.08,0.9),brass,sx,0.06,sz);
const honoSign=new THREE.Mesh(
new THREE.PlaneGeometry(0.56,0.52),
new THREE.MeshStandardMaterial({map:signTexture('奉納',256,256,'#f8f3e6','#1b1b1b'),roughness:0.75}),
);
honoSign.position.set(sx,0.42,sz+0.44);
scene.add(honoSign);
put(new THREE.SphereGeometry(0.18,12,10),brass,sx,2.55,sz+0.1);
put(new THREE.CylinderGeometry(0.045,0.06,1.35,8),col('#d9c28c'),sx,1.82,sz+0.1);
const ox=-3.6,oz=-3.0;
put(B(0.1,1.75,0.1),woodMid,ox-0.88,0.875,oz);
put(B(0.1,1.75,0.1),woodMid,ox+0.88,0.875,oz);
put(B(1.96,0.12,0.36),woodDark,ox,1.78,oz);
for(const y of[0.55,0.88,1.21,1.52]){
put(B(1.76,0.035,0.035),woodMid,ox,y,oz);
}
const paperMat=col('#fbfaf5',{roughness:0.9});
for(const[ry,count]of[[0.55,9],[0.88,11],[1.21,10],[1.52,8]]){
for(let i=0;i<count;i++){
const px=ox-0.72+(i/Math.max(1,count-1))*1.44;
put(B(0.055,0.13,0.025),paperMat,px,ry,oz,(i%3-1)*0.18);
}
}
const omiSign=new THREE.Mesh(
new THREE.PlaneGeometry(1.4,0.28),
new THREE.MeshStandardMaterial({map:signTexture('おみくじ 100円 · Rút quẻ',512,110,'#fffdf5','#c92a1d'),roughness:0.7}),
);
omiSign.position.set(ox,1.98,oz+0.05);
scene.add(omiSign);
const kyoSlip=new THREE.Mesh(
new THREE.BoxGeometry(0.09,0.18,0.04),
new THREE.MeshStandardMaterial({color:'#ffd426',roughness:0.6}),
);
kyoSlip.position.set(ox,1.21,oz+0.03);
kyoSlip.visible=false;
scene.add(kyoSlip);
const sakuraCoords=[
[3.1,-1.6,0.3,1.05],
[6.7,-1.1,1.8,1.1],
[7.2,2.7,0.9,1.0],
[3.2,4.3,2.4,0.95],
[-5.5,1.8,1.1,1.0],
];
for(const[tx,tz,ry,sc]of sakuraCoords){
const tree=shadowAll(gl.sakura.scene.clone(true));
tree.position.set(tx,0,tz);
tree.rotation.y=ry;
tree.scale.setScalar(sc);
scene.add(tree);
SHRINE.blocks.push({x:tx,z:tz,r:0.52});
}
const hanamiGroup=new THREE.Group();
const hanamiBatch=new Map();
const putHanami=(geo,mat,x,y,z)=>{
let g=geo.clone().translate(x,y,z);
if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
if(!hanamiBatch.has(mat))hanamiBatch.set(mat,[]);
hanamiBatch.get(mat).push(g);
};
const tarpTex=canvasTexture(128,128,(g)=>{
g.fillStyle='#1e6ec7';g.fillRect(0,0,128,128);
g.strokeStyle='rgba(255,255,255,0.12)';g.lineWidth=2;
for(let i=0;i<128;i+=16){
g.beginPath();g.moveTo(i,0);g.lineTo(i,128);g.stroke();
g.beginPath();g.moveTo(0,i);g.lineTo(128,i);g.stroke();
}
g.strokeStyle='#144d8f';g.lineWidth=6;g.strokeRect(3,3,122,122);
});
const tarp=new THREE.Mesh(
new THREE.PlaneGeometry(2.8,2.3),
new THREE.MeshStandardMaterial({map:tarpTex,roughness:0.7,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
);
tarp.rotation.x=-Math.PI/2;
tarp.position.set(4.5,0.015,1.05);
tarp.receiveShadow=true;
hanamiGroup.add(tarp);
putHanami(B(0.48,0.04,0.34),woodMid,4.5,0.035,1.02);
for(const dx of[-0.14,0,0.14]){
putHanami(new THREE.CylinderGeometry(0.035,0.03,0.07,10),col('#5f7f58'),4.5+dx,0.08,0.96);
}
for(const[dx,c]of[[-0.08,'#f4a8b8'],[0,'#fbfaf4'],[0.08,'#7ea862']]){
putHanami(new THREE.SphereGeometry(0.032,8,6),col(c),4.5+dx,0.075,1.1);
}
for(const[m,list]of hanamiBatch){
const mesh=new THREE.Mesh(mergeGeometries(list,false),m);
mesh.castShadow=true;mesh.receiveShadow=true;
hanamiGroup.add(mesh);
}
scene.add(hanamiGroup);
for(const[m,list]of batch){
const mesh=new THREE.Mesh(mergeGeometries(list,false),m);
mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
}
const ringMat=new THREE.MeshBasicMaterial({color:'#ffd23f'});
const rings={};
for(const[key,sp]of Object.entries(SHRINE.spots)){
const r=new THREE.Mesh(new THREE.TorusGeometry(0.75,0.045,8,40),ringMat);
r.rotation.x=-Math.PI/2;
r.position.set(sp.x,0.03,sp.z);
scene.add(r);
rings[key]=r;
}
const PN=120;
const petals=new THREE.InstancedMesh(
new THREE.PlaneGeometry(0.09,0.06),
new THREE.MeshLambertMaterial({color:'#f7bfd0',side:THREE.DoubleSide}),
PN,
);
const ps=new Float32Array(PN*5);
for(let i=0;i<PN;i++){
ps.set([
((i*73)%180)/10-6.5,
((i*41)%60)/10+0.3,
((i*89)%140)/10-3.5,
(i*1.17)%6.28,
0.38+((i*29)%40)/100,
],i*5);
}
petals.frustumCulled=false;
scene.add(petals);
const pm4=new THREE.Matrix4(),pq=new THREE.Quaternion(),pe=new THREE.Euler(),pp=new THREE.Vector3(),pone=new THREE.Vector3(1,1,1);
const fest=makeFestival(scene,{sky,hemi,sun,fill,backdrop});
const season=seasonal(scene,petals,grass.material,[{x:-6.8,z:-5.5,w:10.4,d:16,y:0.03},{x:5.8,z:-5.5,w:8.4,d:16,y:0.03},{x:0,z:-8.25,w:3.2,d:10.5,y:0.03}],new THREE.Vector3(0,0,0));
return{
scene,
sun,
rings,
setSeason:season,
setFestival:fest.setFestival,
setTime:fest.setTime,
fireworks:fest.fireworks,
launch:fest.launch,
get festival(){return fest.festival;},
setKyoTied(on){
kyoSlip.visible=!!on;
},
syncRings(st,showHanami=true){
if(!st)return;
rings.pray.visible=!st.prayed;
rings.omikuji.visible=!st.omikuji;
rings.hanami.visible=showHanami&&!st.hanami;
hanamiGroup.visible=showHanami;
},
update(dt,t){
season.update(dt);
fest.update(dt,t);
for(const r of Object.values(rings)){
if(r.visible)r.scale.setScalar(1+Math.sin(t*5)*0.05);
}
for(let i=0;i<PN;i++){
const k=i*5;
ps[k+1]-=ps[k+4]*dt;
ps[k]+=Math.sin(t*0.9+ps[k+3])*0.25*dt+0.1*dt;
if(ps[k+1]<0.03){
ps[k+1]=4.8+(i%5)*0.35;
ps[k]=((i*73)%180)/10-6.5;
}
pp.set(ps[k],ps[k+1],ps[k+2]);
pe.set(t*1.4+ps[k+3],t*0.9+ps[k+3],0);
pq.setFromEuler(pe);
pm4.compose(pp,pq,pone);
petals.setMatrixAt(i,pm4);
}
petals.instanceMatrix.needsUpdate=true;
},
};
}
function seasonal(scene,petals,ground=null,snowAreas=[],centre=new THREE.Vector3()){
const mats=[];
scene.traverse((o)=>{if(o.isMesh)for(const m of[].concat(o.material))if(/sakura/i.test(m.name||'')&&!mats.includes(m))mats.push(m);});
const base=mats.map((m)=>m.color.clone()),gBase=ground?ground.color.clone():null;
const GROUND={spring:'#ffffff',summer:'#e6f2d4',autumn:'#e8c890',winter:'#ffffff'};
const fx=makeSeasonFx(scene,{snowAreas,fall:false});
const set=(s)=>{
const id=(typeof s==='number'?SEASON_IDS[s]:s)||'spring',L=SEASON_LOOK[id]||SEASON_LOOK.spring,c=new THREE.Color(L.sakura);
mats.forEach((m,i)=>{
if(id==='summer')m.color.setRGB(0.28,1.15,0.32);
else m.color.copy(base[i]).multiply(c);
if(m.emissive)m.emissive.set(id==='winter'?'#3a3d42':'#000000');
});
if(ground){ground.color.copy(gBase).multiply(new THREE.Color(GROUND[id]));if(id==='winter')ground.color.set('#eef2f5');}
petals.visible=id==='spring'||id==='autumn';
petals.material.color.set(id==='autumn'?'#d9762e':'#f6c3d0');
fx.setSeason(id);
return id;
};
set.setSnow=(on)=>fx.setSnow(on);
set.update=(dt)=>fx.update(dt,centre);
return set;
}
