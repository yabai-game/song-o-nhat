/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{canvasTexture,LOW_MEM}from'./stage.js';
export const SEASON_IDS=['spring','summer','autumn','winter'];
const asId=(s)=>(typeof s==='number'?SEASON_IDS[s]:s)||'spring';
export const SEASON_LOOK={
spring:{crown:'#8cc063',foliage:'#ffffff',sakura:'#ffffff',ground:'#ffffff',sky:'#9cc0d2',top:'#74aedb',bottom:'#dbe5e8',fog:'#d3dde0',sun:1,warm:0xfff0dc,fall:'petals'},
summer:{crown:'#4e8a3a',foliage:'#cfe8b8',sakura:'#9fd08a',ground:'#fffaf0',sky:'#86b9e2',top:'#4f9be0',bottom:'#d2e6f2',fog:'#d6e4ec',sun:1.12,warm:0xfff4e0,fall:null},
autumn:{crown:'#d3642a',foliage:'#f0a050',sakura:'#f08a3c',ground:'#f4ead8',sky:'#a9c3cf',top:'#7aa6c9',bottom:'#ecdcc6',fog:'#e2d8c8',sun:0.95,warm:0xffd9a8,fall:'leaves'},
winter:{crown:null,foliage:'#d4dad6',sakura:'#a89a8e',ground:'#ffffff',sky:'#c3ccd3',top:'#9fb2c4',bottom:'#e8edf0',fog:'#dfe5e8',sun:0.82,warm:0xe8f0ff,fall:null},
};
const SNOW={value:0};
const SNOW_COL='vec3(0.93, 0.95, 0.97)';
export function snowCover(scene){
const skip=new Set();
scene.traverse((o)=>{if(o.isSkinnedMesh){let r=o;while(r.parent&&r.parent!==scene)r=r.parent;skip.add(r);}});
const top=(o)=>{while(o.parent&&o.parent!==scene)o=o.parent;return o;};
scene.traverse((o)=>{
if(!o.isMesh||o.isSkinnedMesh||skip.has(top(o)))return;
for(const m of[].concat(o.material)){
if(!m||m.userData.snowy||m.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)continue;
if(!(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial)||(m.transparent&&m.opacity<0.95))continue;
m.userData.snowy=true;
m.onBeforeCompile=(sh)=>{
sh.uniforms.uSnow=SNOW;
sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vSnowUp;')
.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSnowUp = normalize(mat3(modelMatrix) * objectNormal).y;');
sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uSnow;\nvarying float vSnowUp;')
.replace('#include <color_fragment>',`#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, ${SNOW_COL}, uSnow * smoothstep(0.5, 0.85, vSnowUp));`);
};
m.customProgramCacheKey=()=>'snowy';
m.needsUpdate=true;
}
});
}
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_v=new THREE.Vector3(),_s=new THREE.Vector3(1,1,1),_e=new THREE.Euler();
function flakes(scene,n,colors,size,round){
const tex=canvasTexture(32,32,(g)=>{
g.fillStyle='#ffffff';
if(round){g.beginPath();g.arc(16,16,13,0,7);g.fill();}
else{g.beginPath();g.ellipse(16,16,14,8,0.6,0,7);g.fill();}
});
const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide,alphaTest:0.1});
const im=new THREE.InstancedMesh(new THREE.PlaneGeometry(size,size*(round?1:0.7)),mat,n);
im.frustumCulled=false;im.visible=false;scene.add(im);
const c=new THREE.Color(),p=new Float32Array(n*4);
for(let i=0;i<n;i++){
p.set([(Math.random()-0.5)*26,Math.random()*12,(Math.random()-0.5)*22,Math.random()*6.28],i*4);
im.setColorAt(i,c.set(colors[i%colors.length]));
}
return{im,p,n};
}
export function makeSeasonFx(scene,{foliage=[],crowns=[],sakura=[],ground=[],sky=null,sun=null,groundY=0,snowArea=null,snowAreas=[],fall:ownFall=true}={}){
const base=new Map();
const remember=(m)=>{if(m&&m.color&&!base.has(m))base.set(m,m.color.clone());};
[...foliage,...sakura,...ground].forEach(remember);
const petals=flakes(scene,LOW_MEM?120:260,['#ffc4d6','#ffd6e2','#ffb3c8'],0.12,false);
const leaves=flakes(scene,LOW_MEM?100:200,['#e2742c','#c94a26','#e8a838','#b5651d'],0.16,false);
const snow=flakes(scene,LOW_MEM?280:700,['#ffffff'],0.11,true);
let flakeTick=0,flakeAccDt=0;
snowCover(scene);
const sheets=[];
for(const a of snowArea?[{y:groundY,...snowArea},...snowAreas]:snowAreas){
const tex=canvasTexture(128,128,(g)=>{
g.fillStyle='#f4f7f9';g.fillRect(0,0,128,128);
for(let i=0;i<500;i++){const v=225+Math.random()*30;g.fillStyle=`rgb(${v},${v + 2},${v + 5})`;g.fillRect(Math.random()*128,Math.random()*128,3,3);}
},[Math.max(1,a.w/6),Math.max(1,a.d/6)]);
const sh=new THREE.Mesh(new THREE.PlaneGeometry(a.w,a.d),new THREE.MeshStandardMaterial({map:tex,roughness:0.9,transparent:true,opacity:a.opacity??0.9}));
sh.rotation.x=-Math.PI/2;sh.position.set(a.x,a.y??groundY,a.z);sh.receiveShadow=true;sh.visible=false;scene.add(sh);
sheets.push(sh);
}
let season='spring',fall=null,snowing=false;
const tint=(list,hex)=>{const c=new THREE.Color(hex);for(const m of list){const b=base.get(m);if(b)m.color.copy(b).multiply(c);}};
return{
get season(){return season;},
look(){return SEASON_LOOK[season];},
setSeason(s){
season=asId(s);const L=SEASON_LOOK[season];
tint(foliage,L.foliage);tint(sakura,L.sakura);tint(ground,L.ground);
for(const m of crowns){m.visible=!!L.crown;if(L.crown)m.color.set(L.crown);}
for(const m of foliage)if(m.emissive)m.emissive.set(season==='winter'?'#3a3e42':'#000000');
fall=ownFall?L.fall:null;petals.im.visible=fall==='petals';leaves.im.visible=fall==='leaves';
for(const sh of sheets)sh.visible=season==='winter'||snowing;
snow.im.visible=season==='winter'||snowing;
SNOW.value=season==='winter'?(snowing?0.95:0.8):snowing?0.6:0;
return L;
},
applySky(bg,fog){
const L=SEASON_LOOK[season];
if(bg)bg.set(L.sky);if(fog)fog.color.set(L.fog);
if(sky)sky.setColors(L.top,L.bottom);
if(sun){sun.color.setHex(L.warm);}
return L;
},
setSnow(on){
snowing=!!on;const w=season==='winter'||snowing;
snow.im.visible=w;snow.im.count=snowing?snow.n:Math.round(snow.n*0.7);
for(const sh of sheets)sh.visible=w;
SNOW.value=season==='winter'?(snowing?0.95:0.8):snowing?0.6:0;
},
update(dt,focus){
if(!focus)return;
if(!petals.im.visible&&!leaves.im.visible&&!snow.im.visible)return;
if(LOW_MEM){
flakeAccDt+=dt;
flakeTick=(flakeTick+1)&1;
if(flakeTick!==0)return;
dt=flakeAccDt;
flakeAccDt=0;
}
const step=(f,fallSpeed,sway,spin)=>{
if(!f.im.visible)return;
const count=f.im.count;
for(let i=0;i<count;i++){
const k=i*4;f.p[k+1]-=dt*fallSpeed;f.p[k+3]+=dt*spin;
if(f.p[k+1]<0){f.p[k+1]+=12;f.p[k]=(Math.random()-0.5)*26;f.p[k+2]=(Math.random()-0.5)*22;}
_v.set(focus.x+f.p[k]+Math.sin(f.p[k+3])*sway,focus.y+f.p[k+1]-1,focus.z+f.p[k+2]);
_e.set(f.p[k+3],f.p[k+3]*0.7,0);_q.setFromEuler(_e);_m.compose(_v,_q,_s);f.im.setMatrixAt(i,_m);
}
f.im.instanceMatrix.needsUpdate=true;
};
step(petals,0.9,0.6,1.6);step(leaves,1.3,0.8,2.4);step(snow,1.1,0.35,0.8);
},
};
}
