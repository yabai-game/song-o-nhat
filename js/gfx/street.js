/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,LOW_MEM}from'./stage.js';
export const STREET={
z:25,x0:-38,x1:38,
edgeN:21.85,edgeS:28.15,
green:[27.62,28.08],
crossX:3,
};
function prepGeo(geo,m4){
let g=geo.clone().applyMatrix4(m4);
if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes)){
if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
}
if(!g.attributes.normal)g.computeVertexNormals();
if(!g.attributes.uv){
const n=g.attributes.position.count;
g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(n*2),2));
}
return g;
}
export function asphaltTexture(){
return canvasTexture(256,256,(g,w,h)=>{
g.fillStyle='#5c5e60';g.fillRect(0,0,w,h);
for(let i=0;i<2600;i++){const v=70+Math.random()*45;g.fillStyle=`rgb(${v},${v + 1},${v + 3})`;g.fillRect(Math.random()*w,Math.random()*h,1.6,1.6);}
g.fillStyle='rgba(40,40,42,.25)';for(let i=0;i<4;i++){g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,20+Math.random()*30,10+Math.random()*18,Math.random()*3,0,7);g.fill();}
g.strokeStyle='rgba(30,30,32,.55)';g.lineWidth=1.2;
for(let i=0;i<5;i++){let x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);for(let k=0;k<6;k++){x+=(Math.random()-0.5)*30;y+=(Math.random()-0.5)*30;g.lineTo(x,y);}g.stroke();}
},[1,1]);
}
export function buildStreetDetails(scene,gl){
const S=STREET;
const batchW=new Map(),batchE=new Map();
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s1=new THREE.Vector3(1,1,1);
const addBatch=(geo,mat,mat4)=>{
const target=mat4.elements[12]<-10?batchW:batchE;
if(!target.has(mat))target.set(mat,[]);
target.get(mat).push(prepGeo(geo,mat4));
};
const flat=(w,d,mat,x,z,y=0.031,rz=0)=>{
e.set(-Math.PI/2,0,rz,'XYZ');q.setFromEuler(e);p.set(x,y,z);
addBatch(new THREE.PlaneGeometry(w,d),mat,m4.compose(p,q,s1));
};
const paint=new THREE.MeshStandardMaterial({color:'#ecebe4',roughness:0.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
paint.userData.noCast=true;
const len=S.x1-S.x0,cx=(S.x0+S.x1)/2;
flat(len,0.15,paint,cx,S.edgeN);flat(len,0.15,paint,cx,S.edgeS);
for(let x=S.x0+1.5;x<S.x1;x+=5)if(Math.abs(x-S.crossX)>3)flat(3,0.12,paint,x,S.z);
const greenM=new THREE.MeshStandardMaterial({color:'#3f8f5a',roughness:0.9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
greenM.userData.noCast=true;
const gw=S.green[1]-S.green[0],gz=(S.green[0]+S.green[1])/2;
flat(S.crossX-2-S.x0,gw,greenM,(S.x0+S.crossX-2)/2,gz);flat(S.x1-S.crossX-2,gw,greenM,(S.crossX+2+S.x1)/2,gz);
for(let z=S.edgeN+0.45;z<S.edgeS-0.3;z+=0.9)flat(3.2,0.45,paint,S.crossX,z+0.22,0.032);
const tomare=new THREE.MeshStandardMaterial({map:canvasTexture(256,128,(g)=>{g.fillStyle='#ecebe4';g.font='bold 96px "Noto Sans JP", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('止まれ',128,68);}),transparent:true,roughness:0.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
tomare.userData.noCast=true;
flat(2.4,1.2,tomare,S.crossX-3.4,26.4,0.032,-Math.PI/2);
const grate=new THREE.MeshStandardMaterial({map:canvasTexture(64,32,(g)=>{g.fillStyle='#8f8d86';g.fillRect(0,0,64,32);g.fillStyle='#3c3b38';for(let x=4;x<64;x+=6)g.fillRect(x,5,3,22);},[len/1.2,1]),roughness:0.9});
grate.userData.noCast=true;
flat(len,0.32,grate,cx,S.z-3.3,0.028);flat(len,0.32,grate,cx,S.z+3.38,0.028);
const mh=new THREE.MeshStandardMaterial({map:canvasTexture(128,128,(g)=>{g.fillStyle='#4a4a46';g.beginPath();g.arc(64,64,62,0,7);g.fill();g.strokeStyle='#6d6b65';g.lineWidth=5;for(let r=18;r<60;r+=13){g.beginPath();g.arc(64,64,r,0,7);g.stroke();}for(let a=0;a<8;a++){g.save();g.translate(64,64);g.rotate(a*Math.PI/4);g.fillStyle='#6d6b65';g.fillRect(-2,8,4,50);g.restore();}}),transparent:true,roughness:0.6,metalness:0.3,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
mh.userData.noCast=true;
const mhGeo=new THREE.CircleGeometry(0.42,24);
for(const[x,z]of[[-24,24.2],[-9,25.8],[12,24.4],[24,25.6]]){
e.set(-Math.PI/2,0,0);q.setFromEuler(e);p.set(x,0.033,z);
addBatch(mhGeo,mh,m4.compose(p,q,s1));
}
const poleM=new THREE.MeshStandardMaterial({color:'#d9d9d6',roughness:0.5,metalness:0.4});
e.set(0,0,0);q.setFromEuler(e);p.set(S.crossX-2.2,2.55/2,28.75);
addBatch(new THREE.CylinderGeometry(0.04,0.04,2.55,10),poleM,m4.compose(p,q,s1));
const tintCache=new Map();
const rootM=new THREE.Matrix4(),meshM=new THREE.Matrix4(),sv=new THREE.Vector3();
const place=(gltf,list,tint,y0=0.02)=>{
if(!gltf)return;
gltf.scene.updateMatrixWorld(true);
list.forEach(([x,z,ry,s=1],i)=>{
e.set(0,ry,0);q.setFromEuler(e);p.set(x,y0,z);sv.set(s,s,s);
rootM.compose(p,q,sv);
gltf.scene.traverse((m)=>{
if(!m.isMesh)return;
let mat=m.material;
if(tint&&tint[i]&&mat.color&&mat.color.r>0.5&&mat.color.g<0.35){
const k=mat.uuid+':'+tint[i];
if(!tintCache.has(k)){const c=mat.clone();c.color.set(tint[i]);tintCache.set(k,c);}
mat=tintCache.get(k);
}else if(mat&&/^Cover/i.test(mat.name||'')){
const k=mat.uuid+':cover';
if(!tintCache.has(k)){const c=mat.clone();c.color.set('#f08a2c');tintCache.set(k,c);}
mat=tintCache.get(k);
}
meshM.copy(rootM).multiply(m.matrixWorld);
if(LOW_MEM&&mat)mat.userData.noCast=true;
addBatch(m.geometry,mat,meshM);
});
});
};
const bikeTint=['#c8352d','#e0e0dc','#3a6fb0','#2f8f57'];
place(gl.bicycle,[[-3.4,29.15,0.08],[-2.7,29.2,-0.05],[-28.2,29.25,0.1],[-27.5,29.3,-0.08]],bikeTint);
place(gl.kei_truck,[[15.5,22.7,Math.PI/2]]);
place(gl.stop_sign,[[S.crossX-2.2-0.05,28.75,Math.PI/2]],null,1.85);
place(gl.curve_mirror,[[-29.2,28.95,-Math.PI/4]]);
buildYards(scene,gl,addBatch,m4,q,e,p,s1);
for(const bMap of[batchW,batchE]){
for(const[mat,list]of bMap){
if(!list.length)continue;
const mesh=new THREE.Mesh(mergeGeometries(list,false),mat);
mesh.castShadow=!mat.userData?.noCast&&!mat.transparent;
mesh.receiveShadow=true;
scene.add(mesh);
}
}
}
export function lotTexture(){
return canvasTexture(256,256,(g,w,h)=>{
g.fillStyle='#b3afa6';g.fillRect(0,0,w,h);
for(let i=0;i<1800;i++){const v=150+Math.random()*40;g.fillStyle=`rgba(${v},${v - 3},${v - 9},.6)`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}
g.fillStyle='rgba(90,86,80,.18)';for(let i=0;i<3;i++){g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,30,18,Math.random()*3,0,7);g.fill();}
g.strokeStyle='rgba(80,76,70,.55)';g.lineWidth=2;for(let k=0;k<=256;k+=128){g.beginPath();g.moveTo(k,0);g.lineTo(k,h);g.stroke();g.beginPath();g.moveTo(0,k);g.lineTo(w,k);g.stroke();}
},[1,1]);
}
function buildYards(scene,gl,addBatch,m4,q,e,p,s1){
const blockTex=canvasTexture(128,64,(g)=>{
g.fillStyle='#b9b5ab';g.fillRect(0,0,128,64);
for(let i=0;i<600;i++){const v=160+Math.random()*40;g.fillStyle=`rgba(${v},${v - 2},${v - 8},.7)`;g.fillRect(Math.random()*128,Math.random()*64,2,2);}
g.strokeStyle='#8a867d';g.lineWidth=2;
for(let r=0;r<4;r++){g.beginPath();g.moveTo(0,r*16);g.lineTo(128,r*16);g.stroke();for(let x=(r%2)*16;x<128;x+=32){g.beginPath();g.moveTo(x,r*16);g.lineTo(x,r*16+16);g.stroke();}}
},[1,1]);
const wallM=new THREE.MeshStandardMaterial({map:blockTex,roughness:0.95});
const capM=new THREE.MeshStandardMaterial({color:'#8f8b83',roughness:0.9});
const H=1.1,Z=30.15;
const wall=(x0,x1,z=Z,alongZ=false)=>{
const L=Math.abs(x1-x0),m=(x0+x1)/2;
const wg=new THREE.BoxGeometry(alongZ?0.15:L,H,alongZ?L:0.15);
const uv=wg.attributes.uv;
for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*(L/1.6),uv.getY(i)*(H/0.8));
e.set(0,0,0);q.setFromEuler(e);p.set(alongZ?z:m,H/2,alongZ?m:z);
addBatch(wg,wallM,m4.compose(p,q,s1));
p.set(alongZ?z:m,H+0.035,alongZ?m:z);
addBatch(new THREE.BoxGeometry(alongZ?0.22:L+0.06,0.07,alongZ?L+0.06:0.22),capM,m4.compose(p,q,s1));
};
wall(-38,-28.6);wall(15.9,19.0);wall(20.2,22.4);wall(29.6,38);
wall(29.6,36.5,-28.5,true);wall(29.6,36.5,15.95,true);wall(29.6,36.5,22.4,true);
if(gl.hedge){
const segs=[];
const run=(x0,x1,z,h)=>{const L=1.77*h/0.9*0.95;for(let x=x0+L/2;x<=x1-L/2+0.01;x+=L)segs.push([x,z,h]);};
run(-37.6,-29,30.75,1.5);run(-22.9,-17,31.6,1.35);run(16.3,22,30.75,1.5);run(30,37.6,30.75,1.5);
run(-16.3,-9.7,30.55,0.8);run(10.3,15.7,30.7,0.8);run(22.6,29.4,30.55,0.8);
const srcs=[];gl.hedge.scene.updateMatrixWorld(true);gl.hedge.scene.traverse((o)=>{if(o.isMesh)srcs.push(o);});
const sv=new THREE.Vector3(),q0=new THREE.Quaternion();
const segGroups=[segs.filter((s)=>s[0]<0),segs.filter((s)=>s[0]>=0)].filter((g)=>g.length);
for(const src of srcs){
const hMat=src.material.clone();
hMat.name=src.material.name;
for(const sub of segGroups){
const im=new THREE.InstancedMesh(src.geometry,hMat,sub.length);
sub.forEach(([x,z,h],i)=>{const k=h/0.9;p.set(x,0,z);sv.set(k,k,k);m4.compose(p,q0,sv).multiply(src.matrixWorld);im.setMatrixAt(i,m4);});
im.castShadow=!LOW_MEM;im.receiveShadow=true;im.computeBoundingSphere();scene.add(im);
}
}
}
const acBody=new THREE.MeshStandardMaterial({color:'#ecebe6',roughness:0.6});
const fanTex=canvasTexture(64,64,(g)=>{g.fillStyle='#ecebe6';g.fillRect(0,0,64,64);g.fillStyle='#3a3a38';g.beginPath();g.arc(32,32,26,0,7);g.fill();g.strokeStyle='#9a9a96';g.lineWidth=2;for(let r=6;r<27;r+=5){g.beginPath();g.arc(32,32,r,0,7);g.stroke();}});
const fanM=new THREE.MeshStandardMaterial({map:fanTex,roughness:0.6});
const acBoxGeo=new THREE.BoxGeometry(0.8,0.6,0.3);
const acFanGeo=new THREE.PlaneGeometry(0.78,0.58);
const acStandGeo=new THREE.BoxGeometry(0.7,0.12,0.34);
const ac=(x,z,ry)=>{
e.set(0,ry,0);q.setFromEuler(e);
p.set(x,0.42,z);addBatch(acBoxGeo,acBody,m4.compose(p,q,s1));
p.set(x+Math.sin(ry)*0.152,0.42,z+Math.cos(ry)*0.152);addBatch(acFanGeo,fanM,m4.compose(p,q,s1));
p.set(x,0.06,z);addBatch(acStandGeo,capM,m4.compose(p,q,s1));
};
ac(-23.2,31.0,-Math.PI/2);ac(-16.9,31.6,Math.PI/2);ac(16.3,31.6,-Math.PI/2);ac(22.0,31.0,Math.PI/2);ac(6.1,31.4,-Math.PI/2);
const meterM=new THREE.MeshStandardMaterial({color:'#d8d4c8',roughness:0.7}),pipeM=new THREE.MeshStandardMaterial({color:'#c9b046',roughness:0.6});
const meterGeo=new THREE.BoxGeometry(0.12,0.28,0.22),pipeGeo=new THREE.CylinderGeometry(0.02,0.02,0.9,8);
e.set(0,0,0);q.setFromEuler(e);
for(const[x,z]of[[-23.5,32.4],[16.0,32.6],[22.3,32.4]]){
p.set(x,1.0,z);addBatch(meterGeo,meterM,m4.compose(p,q,s1));
p.set(x,0.45,z+0.06);addBatch(pipeGeo,pipeM,m4.compose(p,q,s1));
}
}
