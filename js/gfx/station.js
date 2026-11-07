/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,signTexture,makeSun,skyDome,loadModel,loadBrand,BRAND_ASPECT,LOW_MEM}from'./stage.js';
import{buildBackdrop}from'./backdrop.js';
const FLOOR=1.1;
const EDGE=5.9;
const DEPTH=4.6;
const TRACK_Z=7.55;
const GATE_X=-11;
const SHELTER={slabTop:1.21,halfDepth:1.587};
export const STATION={
floor:FLOOR,
start:{x:-13.4,z:4.75,yaw:Math.PI/2},
gateX:GATE_X,
mark:{x:6.5,z:4.75},
line:EDGE-0.6,
door:{x:6.5,z:5.75},
bounds:{x0:-14.2,x1:13.6,z0:EDGE-DEPTH+0.35,z1:EDGE-0.15},
trackZ:TRACK_Z,
stopX:6.5,
blocks:[],
showcase:{pos:[14,4.2,13],look:[3,1.6,4]},
};
export async function buildStation(){
const[shelter,gate,bench,train,houseLight,brandBlack,brandWhite]=await Promise.all([
...['platform_jp','ticket_gate','station_bench','train','house_beige'].map(loadModel),
loadBrand('black'),
loadBrand('white'),
]);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#9cc0d2');
scene.fog=new THREE.FogExp2(new THREE.Color('#d3dde0'),0.0068);
scene.add(new THREE.HemisphereLight(0xdbe8ee,0x7a624a,0.95));
const fill=new THREE.DirectionalLight(0xe6eeff,0.6);fill.position.set(-4,9,12);scene.add(fill);
const sun=makeSun(scene,{intensity:2.3,size:16,offset:[8,16,9]});
skyDome(scene,'#74aedb','#dbe5e8');
buildBackdrop(scene,{houseLight,isFree:(x,z)=>!(Math.abs(x)<60&&z>-30&&z<40)});
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
const ground=new THREE.Mesh(new THREE.PlaneGeometry(140,80),new THREE.MeshLambertMaterial({color:'#a19f96'}));
ground.rotation.x=-Math.PI/2;ground.position.y=-0.01;ground.receiveShadow=true;scene.add(ground);
const ballast=canvasTexture(128,128,(g)=>{
g.fillStyle='#8a8378';g.fillRect(0,0,128,128);
for(let i=0;i<900;i++){const v=100+Math.random()*70;g.fillStyle=`rgb(${v},${v * 0.96},${v * 0.9})`;g.fillRect(Math.random()*128,Math.random()*128,2,2);}
},[40,2]);
const bed=new THREE.Mesh(new THREE.PlaneGeometry(140,4.2),new THREE.MeshLambertMaterial({map:ballast}));
bed.rotation.x=-Math.PI/2;bed.position.set(0,0.005,TRACK_Z);bed.receiveShadow=true;scene.add(bed);
const concrete=col('#bdb8ad');concrete.userData.noCast=true;
const edgeMat=col('#d8d4ca');edgeMat.userData.noCast=true;
const PZ=EDGE-DEPTH/2;
put(B(29,FLOOR-0.02,DEPTH),concrete,-0.3,(FLOOR-0.02)/2,PZ);
put(B(29,0.08,0.35),edgeMat,-0.3,FLOOR-0.04,EDGE-0.12);
const fenceM=col('#8f9aa3',{metalness:0.4,roughness:0.5});fenceM.userData.noCast=LOW_MEM;
for(let x=-14.5;x<=13.9;x+=1.8)put(B(0.06,1.1,0.06),fenceM,x,FLOOR+0.55,EDGE-DEPTH+0.08);
for(const y of[0.5,1.05])put(B(29,0.05,0.05),fenceM,-0.3,FLOOR+y,EDGE-DEPTH+0.08);
const tacM=col('#e8c21e',{roughness:0.6});tacM.userData.noCast=true;
const markM=col('#2f7fd0');markM.userData.noCast=true;
put(B(28,0.02,0.3),tacM,-0.3,FLOOR+0.012,STATION.line);
for(const dx of[-0.75,0.75])put(B(0.55,0.02,0.55),markM,STATION.mark.x+dx,FLOOR+0.012,STATION.mark.z+0.05);
const steel=col('#7d8086',{metalness:0.6,roughness:0.4});steel.userData.noCast=true;
const sleeperM=col('#6b5d4c');sleeperM.userData.noCast=true;
for(const dz of[-0.53,0.53])put(B(140,0.14,0.08),steel,0,0.17,TRACK_Z+dz);
for(let x=-70;x<=70;x+=0.9)put(B(0.22,0.1,2.2),sleeperM,x,0.06,TRACK_Z);
for(let x=-60;x<=60;x+=20){put(B(0.25,6.6,0.25),col('#8c867b'),x,3.3,TRACK_Z+2.6);put(B(0.1,0.1,3.2),col('#8c867b'),x,6.2,TRACK_Z+1.2);}
function putModel(m,x,y,z,ry=0,noCast=false){
const root=m.scene;
root.position.set(x,y,z);
root.rotation.set(0,ry,0);
root.scale.setScalar(1);
root.updateMatrixWorld(true);
root.traverse((o)=>{
if(!o.isMesh||!o.geometry||!o.material)return;
if(noCast)o.material.userData.noCast=true;
let g=o.geometry.clone().applyMatrix4(o.matrixWorld);
if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
if(!batch.has(o.material))batch.set(o.material,[]);
batch.get(o.material).push(g);
});
root.position.set(0,0,0);
root.rotation.set(0,0,0);
root.updateMatrixWorld(true);
}
const wire=new THREE.Mesh(new THREE.BoxGeometry(140,0.025,0.025),new THREE.MeshBasicMaterial({color:'#2b2b2b'}));
wire.position.set(0,5.4,TRACK_Z);scene.add(wire);
putModel(shelter,0,FLOOR-SHELTER.slabTop+0.005,EDGE-SHELTER.halfDepth,0,LOW_MEM);
for(let x=-3.2;x<=3.21;x+=1.6)STATION.blocks.push({x,z:EDGE-2.75,r:0.75});
const gz=[EDGE-1.15,EDGE-2.46,EDGE-3.77];
for(const z of gz){
putModel(gate,GATE_X,FLOOR,z,Math.PI/2);
for(const dz of[-0.5,0.5])STATION.blocks.push({x:GATE_X,z:z+dz,r:0.2},{x:GATE_X-0.6,z:z+dz,r:0.18},{x:GATE_X+0.6,z:z+dz,r:0.18});
}
const gateSign=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.7),new THREE.MeshStandardMaterial({map:signTexture('改札  さくら駅',640,132,'#2f5d9a','#ffffff'),side:THREE.DoubleSide}));
gateSign.position.set(GATE_X,FLOOR+2.55,EDGE-2.46);gateSign.rotation.y=-Math.PI/2;scene.add(gateSign);
for(const z of[EDGE-4.2,EDGE-0.7])put(B(0.08,2.9,0.08),col('#4b5560'),GATE_X,FLOOR+1.45,z);
for(const x of[-7.5,6.5,10.5]){
putModel(bench,x,FLOOR,EDGE-DEPTH+0.6,0);
STATION.blocks.push({x:x-0.5,z:EDGE-DEPTH+0.6,r:0.35},{x:x+0.5,z:EDGE-DEPTH+0.6,r:0.35});
}
const boardTex=canvasTexture(512,192,(g)=>{
g.fillStyle='#ffffff';g.fillRect(0,0,512,192);
g.fillStyle='#2f7fd0';g.fillRect(0,118,512,22);
g.fillStyle='#1f2a33';g.textAlign='center';g.textBaseline='middle';
g.font='700 74px "Zen Maru Gothic", "Yu Gothic", sans-serif';g.fillText('さくら',256,62);
g.font='600 22px "Be Vietnam Pro", sans-serif';g.fillText('Sakura',256,106);
g.fillStyle='#ffffff';g.font='700 18px "Zen Maru Gothic", sans-serif';
g.textAlign='left';g.fillText('← もみじ',14,130);g.textAlign='right';g.fillText('ひかり →',498,130);
});
const board=new THREE.Group();
const face=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.6),new THREE.MeshStandardMaterial({map:boardTex,side:THREE.DoubleSide}));
face.position.y=2.0;board.add(face);
for(const dx of[-0.7,0.7])put(B(0.06,2.0,0.06),col('#4b5560'),12.4,FLOOR+1.0,3.4+dx);
board.position.set(12.4,FLOOR,3.4);board.rotation.y=-Math.PI/2;scene.add(board);
STATION.blocks.push({x:12.4,z:2.7,r:0.2},{x:12.4,z:4.1,r:0.2});
{
const pano=new THREE.Group();
pano.position.set(8.5,FLOOR,EDGE-DEPTH+0.22);
pano.rotation.y=-0.32;
scene.add(pano);
const aluMat=col('#c6cdd4',{metalness:0.55,roughness:0.35});
const panelMat=col('#f9fafb',{roughness:0.5});
const aluGeos=[
B(0.06,1.98,0.06).translate(-0.88,0.99,0),
B(0.06,1.98,0.06).translate(0.88,0.99,0),
B(1.92,0.96,0.05).translate(0,1.48,0),
];
const aluMesh=new THREE.Mesh(mergeGeometries(aluGeos,false),aluMat);
aluMesh.castShadow=true;pano.add(aluMesh);
const bgMesh=new THREE.Mesh(new THREE.BoxGeometry(1.82,0.86,0.06),panelMat);
bgMesh.position.set(0,1.48,0.005);pano.add(bgMesh);
const lw=1.56,lh=lw/BRAND_ASPECT;
const pLogo=new THREE.Mesh(
new THREE.PlaneGeometry(lw,lh),
new THREE.MeshStandardMaterial({map:brandBlack,transparent:true,alphaTest:0.05,depthWrite:false,roughness:0.6}),
);
pLogo.position.set(0,1.62,0.055);
pano.add(pLogo);
const pSub=new THREE.Mesh(
new THREE.PlaneGeometry(1.56,0.22),
new THREE.MeshStandardMaterial({
map:signTexture('次は、あなたの番。',512,72,'#f9fafb','#1f2a33'),
depthWrite:false,roughness:0.6,
}),
);
pSub.position.set(0,1.24,0.055);
pano.add(pSub);
}
for(const[m,list]of batch){
const hasUv=list.some((g)=>g.attributes.uv);
if(hasUv){
for(const g of list){
if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
}
}
const merged=mergeGeometries(list,false);
if(!merged)continue;
const mesh=new THREE.Mesh(merged,m);
mesh.castShadow=!m.transparent&&!m.userData?.noCast;mesh.receiveShadow=true;scene.add(mesh);
}
const car=train.scene;car.traverse((o)=>{if(o.isMesh){o.castShadow=!LOW_MEM;o.receiveShadow=true;}});
const rig=new THREE.Group();rig.add(car);rig.scale.setScalar(0.85);rig.position.set(90,0.24,TRACK_Z);rig.visible=false;scene.add(rig);
{
const tw=1.2/0.85,th=tw/BRAND_ASPECT;
const tGeo=new THREE.PlaneGeometry(tw,th);
const tMat=new THREE.MeshStandardMaterial({map:brandWhite,transparent:true,alphaTest:0.05,depthWrite:false,roughness:0.55});
for(const[tz,ry]of[[-1.298,Math.PI],[1.298,0]]){
const decal=new THREE.Mesh(tGeo,tMat);
decal.position.set(-0.8,1.26,tz);
decal.rotation.y=ry;
rig.add(decal);
}
}
const T={state:'away',x:90,v:0};
return{
scene,sun,blocks:STATION.blocks,train:rig,
showcase:{pos:new THREE.Vector3(...STATION.showcase.pos),look:new THREE.Vector3(...STATION.showcase.look)},
trainState:()=>T.state,
sendTrain(kind){
if(kind==='arrive'){T.state='in';T.x=70;T.v=16;rig.visible=true;}
if(kind==='leave'){T.state='out';T.v=0;}
if(kind==='reset'){T.state='away';rig.visible=false;}
},
trainX:()=>T.x,
update(dt){
if(T.state==='in'){
const d=T.x-STATION.stopX;
if(d<=0.02){T.x=STATION.stopX;T.v=0;T.state='stopped';}
else{const a=(T.v*T.v)/(2*d);T.v=Math.max(0.4,T.v-a*dt);T.x-=T.v*dt;}
}else if(T.state==='out'){
T.v=Math.min(22,T.v+2.2*dt);T.x-=T.v*dt;
if(T.x<-90){T.state='away';rig.visible=false;}
}
rig.position.x=T.x;
},
};
}
