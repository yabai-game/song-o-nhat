/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{SEASON_IDS,SEASON_LOOK,makeSeasonFx}from'./season.js';
import{loadModel,shadowAll,canvasTexture,signTexture,makeSun,skyDome}from'./stage.js';
export async function buildTown(){
const scene=new THREE.Scene();
const SKY=new THREE.Color('#cfe8f3');
scene.background=SKY.clone();
scene.fog=new THREE.Fog(SKY.clone(),22,48);
const hemi=new THREE.HemisphereLight(0xe4f4ff,0xb59f84,1.15);
scene.add(hemi);
const sun=makeSun(scene);
const sky=skyDome(scene,'#7db6dc','#e3eef2',120);
const obstacles=[];
const paving=canvasTexture(512,512,(g)=>{
g.fillStyle='#857b70';g.fillRect(0,0,512,512);
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
for(let r=0;r<8;r++){
const w=128,h=64,off=(r%2)*w/2;
for(let i=-1;i<5;i++){
const v=200+Math.floor(rnd()*30)-15;
g.fillStyle=`rgb(${v},${v - 7},${v - 16})`;g.fillRect(i*w+off+4,r*h+4,w-8,h-8);
g.fillStyle='rgba(255,255,255,0.10)';g.fillRect(i*w+off+4,r*h+4,w-8,5);
}
}
},[5.5,5]);
const grass=new THREE.Mesh(new THREE.CircleGeometry(60,48),new THREE.MeshStandardMaterial({color:'#8fbf6a',roughness:1}));
grass.rotation.x=-Math.PI/2;grass.position.y=-0.06;grass.receiveShadow=true;scene.add(grass);
const curb=new THREE.Mesh(new THREE.BoxGeometry(22.4,0.06,20.4),new THREE.MeshStandardMaterial({color:'#8a8176',roughness:1}));
curb.position.set(0,-0.05,1.5);curb.receiveShadow=true;scene.add(curb);
const plaza=new THREE.Mesh(new THREE.PlaneGeometry(22,20),new THREE.MeshStandardMaterial({map:paving,roughness:0.95,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
plaza.rotation.x=-Math.PI/2;plaza.position.set(0,0,1.5);plaza.receiveShadow=true;scene.add(plaza);
const[shop,sakura,vending,lamp,lantern]=await Promise.all(['shop','sakura','vending','lamp','lantern'].map(loadModel));
const place=(gltf,x,z,ry=0,s=1,r=0)=>{
const o=shadowAll(gltf.scene.clone(true),{cast:true,receive:true});
o.position.set(x,0,z);o.rotation.y=ry;o.scale.setScalar(s);scene.add(o);
if(r)obstacles.push({x,z,r});
return o;
};
const shopO=place(shop,0,-6.2);
const board=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.52),new THREE.MeshStandardMaterial({map:signTexture('ラーメン',512,140,'#6b3a1f','#fff3df'),roughness:0.9}));
board.position.set(0,4.12,2.02);shopO.add(board);
place(sakura,-4.7,-2.4,0.4,1,0.55);
place(sakura,6.2,0.6,2.2,1.1,0.6);
place(sakura,-5.6,6.0,1.2,0.9,0.55);
place(vending,4.3,-4.3,0,1,0.75);
place(vending,5.45,-4.3,0,1,0.75);
place(lamp,-3.4,1.6,0,1,0.3);
place(lamp,3.6,6.0,Math.PI,1,0.3);
const wood=new THREE.MeshStandardMaterial({color:'#7a4a2a',roughness:0.9});
const FZ=-2.9;
for(const x of[-2.6,2.6]){
const post=new THREE.Mesh(new THREE.BoxGeometry(0.16,3.1,0.16),wood);post.position.set(x,1.55,FZ);post.castShadow=true;scene.add(post);
obstacles.push({x,z:FZ,r:0.25});
}
const beam=new THREE.Mesh(new THREE.BoxGeometry(5.6,0.14,0.14),wood);beam.position.set(0,3.05,FZ);beam.castShadow=true;scene.add(beam);
const lanternLights=[];
for(const x of[-1.8,-0.6,0.6,1.8]){
const l=shadowAll(lantern.scene.clone(true));l.scale.setScalar(1.15);l.position.set(x,2.25,FZ);scene.add(l);
const cord=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.2),wood);cord.position.set(x,2.92,FZ);scene.add(cord);
const glow=new THREE.PointLight(0xffa860,0,6,1.6);glow.position.set(x,2.2,FZ+0.3);scene.add(glow);lanternLights.push(glow);
}
const N=90,petals=new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09,0.06),new THREE.MeshLambertMaterial({color:'#f6c3d0',side:THREE.DoubleSide}),N);
const ps=new Float32Array(N*5);
for(let i=0;i<N;i++){ps.set([(Math.random()-0.5)*22,Math.random()*6,(Math.random()-0.5)*18+1,Math.random()*6.28,0.35+Math.random()*0.4],i*5);}
scene.add(petals);
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),one=new THREE.Vector3(1,1,1);
const DAY={sky:new THREE.Color('#cfe8f3'),hemi:1.15,sun:2.3,lamps:0};
const DUSK={sky:new THREE.Color('#e9a77f'),hemi:0.55,sun:0.9,lamps:2.2};
const NIGHT={sky:new THREE.Color('#27324f'),hemi:0.35,sun:0.25,lamps:3.2};
function setTime(which){
const L=which==='dusk'?DUSK:which==='night'?NIGHT:DAY;
scene.background.copy(L.sky);scene.fog.color.copy(L.sky);
if(which==='dusk')sky.setColors('#6e7fb0','#f0b48a');else if(which==='night')sky.setColors('#101a33','#34406a');else sky.setColors('#7db6dc','#e3eef2');
hemi.intensity=L.hemi;sun.intensity=L.sun;
sun.color.set(which==='day'?0xfff0dc:0xffb27a);
for(const g of lanternLights)g.intensity=L.lamps;
}
const season=seasonal(scene,petals,grass.material,[{x:0,z:1.5,w:22,d:20,y:0.04,opacity:0.85}],new THREE.Vector3(0,0,3));
return{
scene,sun,obstacles,setTime,
setSeason:season,
bounds:{x0:-10.2,x1:10.2,z0:-3.7,z1:10.8},
update(dt,t){
season.update(dt);
for(let i=0;i<N;i++){
const k=i*5;
ps[k+1]-=ps[k+4]*dt;
ps[k]+=Math.sin(t*0.9+ps[k+3])*0.25*dt+0.12*dt;
if(ps[k+1]<0.02){ps[k+1]=5+Math.random()*2;ps[k]=(Math.random()-0.5)*22;}
p.set(ps[k],ps[k+1],ps[k+2]);e.set(t*1.3+ps[k+3],t*0.8+ps[k+3],0);q.setFromEuler(e);
m4.compose(p,q,one);petals.setMatrixAt(i,m4);
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
if(m.emissive)m.emissive.set(id==='winter'?'#6a6e74':'#000000');
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
