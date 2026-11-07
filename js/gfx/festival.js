/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,signTexture,LOW_MEM}from'./stage.js';
export const FESTIVAL_SPOTS={
stalls:[
{id:'takoyaki',jp:'たこ焼き',x:-4.5,z:3.8,side:-1},
{id:'yakisoba',jp:'焼きそば',x:4.5,z:3.8,side:1},
{id:'kakigori',jp:'かき氷',x:-4.5,z:6.8,side:-1},
{id:'ringoame',jp:'りんご飴',x:4.5,z:6.8,side:1},
{id:'kingyo',jp:'金魚すくい',x:-4.5,z:10.0,side:-1},
{id:'amazake',jp:'甘酒',x:4.5,z:10.0,side:1},
{id:'soba',jp:'年越しそば',x:-6.2,z:-1.4,side:-1},
].map((s)=>({...s,stand:{x:s.x-s.side*1.25,z:s.z}})),
yagura:{x:-7.0,z:5.3,stand:{x:-5.4,z:5.3}},
bell:{x:7.3,z:3.4,stand:{x:6.0,z:2.6}},
show:{
hanami:['yakisoba','ringoame','amazake'],
natsumatsuri:['takoyaki','yakisoba','kakigori','ringoame','kingyo'],
obon:['takoyaki','yakisoba','kakigori','kingyo'],
halloween:['takoyaki','ringoame'],
kouyou:['yakisoba','amazake'],
oomisoka:['soba','amazake'],
shogatsu:['takoyaki','ringoame','amazake'],
},
};
const STALL_COLORS={takoyaki:'#c0392b',yakisoba:'#e67e22',kakigori:'#2e86c1',ringoame:'#c0392b',kingyo:'#16a085',amazake:'#f4f1ea',soba:'#6b4a30'};
export function makeFestival(scene,{sky,hemi,sun,fill,backdrop}={}){
const mats=new Map();
const M=(c,o={})=>{const k=c+JSON.stringify(o);if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color:c,roughness:0.8,...o}));return mats.get(k);};
const glowMats=[];
const glowCache=new Map();
const glow=(c)=>{
if(glowCache.has(c))return glowCache.get(c);
const m=new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:0.15,roughness:0.6});
glowMats.push(m);
glowCache.set(c,m);
return m;
};
const add=(g,geo,m,x,y,z,ry=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.y=ry;o.castShadow=true;g.add(o);return o;};
const groups={};
const group=(k)=>{const g=new THREE.Group();g.visible=false;scene.add(g);groups[k]=g;return g;};
function mergeGroup(grp){
grp.updateMatrixWorld(true);
const inv=grp.matrixWorld.clone().invert();
const byMat=new Map();
const toRemove=[];
const ws=new THREE.Vector3();
grp.traverse((o)=>{
if(!o.isMesh||!o.geometry||!o.material)return;
toRemove.push(o);
if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();
o.getWorldScale(ws);
const r=o.geometry.boundingSphere.radius*Math.max(ws.x,ws.y,ws.z);
const cast=!LOW_MEM?o.castShadow:(o.castShadow&&r>=1.0);
let g=o.geometry.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld));
if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
let bucket=byMat.get(o.material);
if(!bucket){bucket={cast:false,list:[]};byMat.set(o.material,bucket);}
if(cast)bucket.cast=true;
bucket.list.push(g);
});
for(const o of toRemove)if(o.parent)o.parent.remove(o);
for(const[m,{cast,list}]of byMat){
const hasUv=list.some((g)=>g.attributes.uv);
if(hasUv){
for(const g of list){
if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
}
}
const merged=mergeGeometries(list,false);
if(!merged)continue;
const mesh=new THREE.Mesh(merged,m);
mesh.castShadow=cast;
grp.add(mesh);
}
}
const awning=canvasTexture(128,64,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ffffff':'#d63c3c';g.fillRect(i*16,0,16,64);}});
const awningMat=new THREE.MeshStandardMaterial({map:awning,side:THREE.DoubleSide,roughness:0.9});
const stalls={};
for(const s of FESTIVAL_SPOTS.stalls){
const g=group('stall_'+s.id),ry=s.side<0?Math.PI/2:-Math.PI/2;
const root=new THREE.Group();root.position.set(s.x,0,s.z);root.rotation.y=ry;g.add(root);
add(root,new THREE.BoxGeometry(1.9,0.9,0.8),M('#8a5a34'),0,0.45,0);
add(root,new THREE.BoxGeometry(1.95,0.05,0.85),M('#d9c7a6'),0,0.92,0);
for(const dx of[-0.92,0.92])for(const dz of[-0.36,0.36])add(root,new THREE.CylinderGeometry(0.04,0.04,2.2,6),M('#6b4a30'),dx,1.1,dz);
const roof=add(root,new THREE.PlaneGeometry(2.2,1.2),awningMat,0,2.2,0.1);
roof.rotation.x=-Math.PI/2+0.28;
const sign=add(root,new THREE.PlaneGeometry(1.7,0.42),new THREE.MeshStandardMaterial({map:signTexture(s.jp,420,104,STALL_COLORS[s.id],s.id==='amazake'?'#c0392b':'#ffffff'),roughness:0.8}),0,1.86,0.58);
sign.rotation.x=-0.12;
add(root,new THREE.SphereGeometry(0.16,12,8),glow('#ff6b3d'),0.75,1.75,0.55);
if(s.id==='kingyo'){const pool=add(root,new THREE.CylinderGeometry(0.62,0.62,0.14,20),M('#3a7bd5',{roughness:0.2}),0,1.0,0.05);pool.scale.z=0.55;for(let i=0;i<6;i++)add(root,new THREE.SphereGeometry(0.035,6,4),M('#ff5a1f'),-0.4+i*0.16,1.08,(i%2?0.08:-0.08));}
else for(let i=0;i<4;i++)add(root,new THREE.BoxGeometry(0.22,0.08,0.16),M(i%2?'#f0e2c0':'#c9963e'),-0.6+i*0.4,0.98,0.15);
mergeGroup(g);
stalls[s.id]=g;
}
const strings=group('strings');
const wire=new THREE.LineBasicMaterial({color:'#333333'});
for(const z of[2.6,5.3,8.9]){
for(const sx of[-3.4,3.4])add(strings,new THREE.CylinderGeometry(0.05,0.06,3.6,6),M('#7a5236'),sx,1.8,z);
const pts=[];
for(let i=0;i<=12;i++){const x=-3.4+i*(6.8/12);pts.push(new THREE.Vector3(x,3.45-0.35*(1-((x/3.4)**2)),z));}
strings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),wire));
for(let i=1;i<12;i++){const p=pts[i];const l=add(strings,new THREE.SphereGeometry(0.14,10,8),glow(i%2?'#ff4d3d':'#fff3d6'),p.x,p.y-0.2,z);l.scale.y=1.3;}
}
mergeGroup(strings);
const Y=FESTIVAL_SPOTS.yagura,yag=group('yagura');
const kohaku=canvasTexture(128,32,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ffffff':'#d63c3c';g.fillRect(i*16,0,16,32);}});
const kohakuMat=new THREE.MeshStandardMaterial({map:kohaku,side:THREE.DoubleSide});
for(const dx of[-1,1])for(const dz of[-1,1])add(yag,new THREE.BoxGeometry(0.16,2.6,0.16),M('#7a5236'),Y.x+dx*1.1,1.3,Y.z+dz*1.1);
add(yag,new THREE.BoxGeometry(2.5,0.12,2.5),M('#8a5a34'),Y.x,1.6,Y.z);
for(const[dx,dz,ry]of[[0,1.2,0],[0,-1.2,0],[1.2,0,Math.PI/2],[-1.2,0,Math.PI/2]])add(yag,new THREE.PlaneGeometry(2.4,0.9),kohakuMat,Y.x+dx,1.12,Y.z+dz,ry);
const drum=add(yag,new THREE.CylinderGeometry(0.42,0.42,0.55,18),M('#8a3a22'),Y.x,2.05,Y.z);drum.rotation.z=Math.PI/2;
add(yag,new THREE.ConeGeometry(1.9,0.7,4),M('#5b3a22'),Y.x,3.0,Y.z,Math.PI/4);
for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2;add(yag,new THREE.SphereGeometry(0.15,10,8),glow(i%2?'#ff4d3d':'#fff3d6'),Y.x+Math.cos(a)*1.9,2.55,Y.z+Math.sin(a)*1.9);}
mergeGroup(yag);
const ny=group('newyear');
for(const sx of[-1.95,1.95]){
add(ny,new THREE.CylinderGeometry(0.34,0.38,0.5,14),M('#b8955a'),sx,0.25,9.0);
for(const[dx,dz,h]of[[0,0,1.6],[-0.12,0.1,1.3],[0.12,0.1,1.1]]){
const b=add(ny,new THREE.CylinderGeometry(0.07,0.07,h,10),M('#6f9a3e'),sx+dx,h/2,9.0+dz);
b.rotation.z=0.02;
}
for(let i=0;i<5;i++)add(ny,new THREE.SphereGeometry(0.16,8,6),M('#2f5d2a'),sx+Math.cos(i)*0.22,0.6,9.0+Math.sin(i)*0.22);
}
mergeGroup(ny);
const hw=group('halloween');
const face=canvasTexture(128,64,(g)=>{g.fillStyle='#e87814';g.fillRect(0,0,128,64);g.fillStyle='#ffe28a';g.beginPath();g.moveTo(34,18);g.lineTo(46,30);g.lineTo(22,30);g.fill();g.beginPath();g.moveTo(94,18);g.lineTo(106,30);g.lineTo(82,30);g.fill();g.fillRect(36,42,56,8);});
const pmat=new THREE.MeshStandardMaterial({map:face,emissive:'#ffb347',emissiveMap:face,emissiveIntensity:0.2,roughness:0.7});glowMats.push(pmat);
for(const z of[1.2,4.2,7.2])for(const sx of[-1.95,1.95]){const p=add(hw,new THREE.SphereGeometry(0.28,16,10),pmat,sx,0.24,z,sx<0?Math.PI/2:-Math.PI/2);p.scale.y=0.8;add(hw,new THREE.CylinderGeometry(0.03,0.04,0.1,6),M('#4b6b2a'),sx,0.47,z);}
mergeGroup(hw);
const B=FESTIVAL_SPOTS.bell,eve=group('eve');
for(const dx of[-0.8,0.8])add(eve,new THREE.BoxGeometry(0.18,2.6,0.18),M('#5b3a22'),B.x+dx,1.3,B.z);
add(eve,new THREE.BoxGeometry(2.2,0.16,0.5),M('#5b3a22'),B.x,2.6,B.z);
add(eve,new THREE.ConeGeometry(1.6,0.6,4),M('#3a2a20'),B.x,3.0,B.z,Math.PI/4);
add(eve,new THREE.CylinderGeometry(0.42,0.5,1.0,18),M('#6d5a3a',{metalness:0.5,roughness:0.45}),B.x,1.9,B.z);
const striker=add(eve,new THREE.CylinderGeometry(0.09,0.09,1.4,8),M('#8a6a44'),B.x-1.0,1.8,B.z);striker.rotation.z=Math.PI/2;
const fire=new THREE.PointLight(0xff8a3a,0,7,1.6);fire.position.set(-4.6,0.9,-0.2);eve.add(fire);
for(let i=0;i<5;i++){const l=add(eve,new THREE.CylinderGeometry(0.06,0.06,0.8,6),M('#5b3a22'),-4.6,0.2,-0.2);l.rotation.set(1.2,(i/5)*Math.PI*2,0);}
const flame=add(eve,new THREE.ConeGeometry(0.3,0.9,10),glow('#ff9a3c'),-4.6,0.55,-0.2);
const N=140,POOL=6,bursts=[];
const dot=canvasTexture(32,32,(g)=>{const gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.4,'rgba(255,255,255,0.7)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);});
for(let b=0;b<POOL;b++){
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
const mat=new THREE.PointsMaterial({size:1.9,map:dot,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:'#ffffff',fog:false});
const pts=new THREE.Points(geo,mat);pts.visible=false;pts.frustumCulled=false;scene.add(pts);
bursts.push({pts,vel:new Float32Array(N*3),t:9,life:2.4});
}
const COLORS=['#ff5a5a','#ffd84a','#7ad1ff','#9dff8a','#ff8ae6','#ffffff','#ffa63d'];
let nextB=0,auto=false,autoT=0;
function launch(){
const b=bursts[nextB];nextB=(nextB+1)%POOL;
const cx=(Math.random()-0.5)*30,cy=20+Math.random()*9,cz=-30-Math.random()*8,sp=9+Math.random()*5;
const p=b.pts.geometry.attributes.position.array;
for(let i=0;i<N;i++){
const u=Math.random()*2-1,a=Math.random()*Math.PI*2,r=Math.sqrt(1-u*u);
p[i*3]=cx;p[i*3+1]=cy;p[i*3+2]=cz;
b.vel[i*3]=r*Math.cos(a)*sp;b.vel[i*3+1]=u*sp;b.vel[i*3+2]=r*Math.sin(a)*sp;
}
b.pts.geometry.attributes.position.needsUpdate=true;
b.pts.material.color.set(COLORS[Math.floor(Math.random()*COLORS.length)]);b.pts.material.opacity=1;
b.pts.visible=true;b.t=0;
}
const day={bg:scene.background.clone(),fog:scene.fog.color.clone(),fogD:scene.fog.density,hemi:hemi?.intensity??1,sun:sun?.intensity??2,fill:fill?.intensity??0.6};
let time='day',current=null;
function setTime(t){
time=t||'day';
const night=time==='night',dusk=time==='dusk';
scene.background.set(night?'#0e1630':dusk?'#e9a77f':day.bg);
scene.fog.color.set(night?'#141c36':dusk?'#d9a088':day.fog);scene.fog.density=night?0.012:day.fogD;
if(sky)night?sky.setColors('#070c1f','#1d2a4f'):dusk?sky.setColors('#6e7fb0','#f0b48a'):sky.setColors('#74b2dc','#e5f0f5');
if(hemi)hemi.intensity=night?0.32:dusk?0.7:day.hemi;
if(sun){sun.intensity=night?0.12:dusk?1.0:day.sun;sun.color.set(dusk?0xffb27a:0xfff3de);}
if(fill)fill.intensity=night?0.15:day.fill;
if(backdrop){backdrop.setWeather?.(false);if(night||dusk)backdrop.setTone?.(night?'night':'dusk');}
for(const m of glowMats)m.emissiveIntensity=night?1.6:dusk?0.8:0.15;
fire.intensity=current==='oomisoka'?(night?3:1.2):0;
}
function setFestival(id){
current=id||null;
for(const g of Object.values(groups))g.visible=false;
const open=FESTIVAL_SPOTS.show[current]||[];
for(const s of open)stalls[s].visible=true;
if(['hanami','natsumatsuri','obon','shogatsu','kouyou'].includes(current))strings.visible=true;
yag.visible=current==='obon';
ny.visible=current==='shogatsu';
hw.visible=current==='halloween';
eve.visible=current==='oomisoka';
if(!current){auto=false;for(const b of bursts)b.pts.visible=false;}
setTime(time);
return current;
}
return{
setFestival,setTime,launch,
get festival(){return current;},
fireworks(on){auto=!!on;autoT=0;if(on)launch();},
update(dt,t){
if(auto){autoT-=dt;if(autoT<=0){launch();autoT=0.6+Math.random()*0.7;}}
for(const b of bursts){
if(!b.pts.visible)continue;
b.t+=dt;const p=b.pts.geometry.attributes.position.array,drag=Math.exp(-dt*1.4);
for(let i=0;i<N;i++){const k=i*3;b.vel[k]*=drag;b.vel[k+1]=b.vel[k+1]*drag-3.2*dt;b.vel[k+2]*=drag;p[k]+=b.vel[k]*dt;p[k+1]+=b.vel[k+1]*dt;p[k+2]+=b.vel[k+2]*dt;}
b.pts.geometry.attributes.position.needsUpdate=true;
b.pts.material.opacity=Math.max(0,1-b.t/b.life);
if(b.t>b.life)b.pts.visible=false;
}
if(eve.visible){flame.scale.set(1+Math.sin(t*17)*0.08,1+Math.sin(t*11)*0.15,1);fire.intensity=(time==='night'?3:1.2)*(0.85+Math.sin(t*23)*0.15);striker.position.x=B.x-1.0+Math.max(0,Math.sin(t*0.8))*0.1;}
},
};
}
