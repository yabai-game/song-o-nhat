/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{canvasTexture,signTexture}from'./stage.js';
export const STREET={
z:25,x0:-38,x1:38,
edgeN:21.85,edgeS:28.15,
green:[27.62,28.08],
crossX:3,
};
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
const S=STREET,flat=(w,d,mat,x,z,y=0.031)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;};
const paint=new THREE.MeshStandardMaterial({color:'#ecebe4',roughness:0.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const len=S.x1-S.x0,cx=(S.x0+S.x1)/2;
flat(len,0.15,paint,cx,S.edgeN);flat(len,0.15,paint,cx,S.edgeS);
for(let x=S.x0+1.5;x<S.x1;x+=5)if(Math.abs(x-S.crossX)>3)flat(3,0.12,paint,x,S.z);
const greenM=new THREE.MeshStandardMaterial({color:'#3f8f5a',roughness:0.9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const gw=S.green[1]-S.green[0],gz=(S.green[0]+S.green[1])/2;
flat(S.crossX-2-S.x0,gw,greenM,(S.x0+S.crossX-2)/2,gz);flat(S.x1-S.crossX-2,gw,greenM,(S.crossX+2+S.x1)/2,gz);
for(let z=S.edgeN+0.45;z<S.edgeS-0.3;z+=0.9)flat(3.2,0.45,paint,S.crossX,z+0.22,0.032);
const tomare=new THREE.MeshStandardMaterial({map:canvasTexture(256,128,(g)=>{g.fillStyle='#ecebe4';g.font='bold 96px "Noto Sans JP", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('止まれ',128,68);}),transparent:true,roughness:0.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const tm=flat(2.4,1.2,tomare,S.crossX-3.4,26.4,0.032);tm.rotation.z=-Math.PI/2;
const grate=new THREE.MeshStandardMaterial({map:canvasTexture(64,32,(g)=>{g.fillStyle='#8f8d86';g.fillRect(0,0,64,32);g.fillStyle='#3c3b38';for(let x=4;x<64;x+=6)g.fillRect(x,5,3,22);},[len/1.2,1]),roughness:0.9});
flat(len,0.32,grate,cx,S.z-3.3,0.028);flat(len,0.32,grate,cx,S.z+3.38,0.028);
const mh=new THREE.MeshStandardMaterial({map:canvasTexture(128,128,(g)=>{g.fillStyle='#4a4a46';g.beginPath();g.arc(64,64,62,0,7);g.fill();g.strokeStyle='#6d6b65';g.lineWidth=5;for(let r=18;r<60;r+=13){g.beginPath();g.arc(64,64,r,0,7);g.stroke();}for(let a=0;a<8;a++){g.save();g.translate(64,64);g.rotate(a*Math.PI/4);g.fillStyle='#6d6b65';g.fillRect(-2,8,4,50);g.restore();}}),transparent:true,roughness:0.6,metalness:0.3,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
for(const[x,z]of[[-24,24.2],[-9,25.8],[12,24.4],[24,25.6]]){const d=new THREE.Mesh(new THREE.CircleGeometry(0.42,24),mh);d.rotation.x=-Math.PI/2;d.position.set(x,0.033,z);scene.add(d);}
const poleM=new THREE.MeshStandardMaterial({color:'#d9d9d6',roughness:0.5,metalness:0.4});
const pole=(x,z,h,mat=poleM)=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,h,10),mat);p.position.set(x,h/2,z);p.castShadow=true;scene.add(p);return p;};
pole(S.crossX-2.2,28.75,2.55);
const place=(gltf,list,tint)=>{
if(!gltf)return;
gltf.scene.updateMatrixWorld(true);
list.forEach(([x,z,ry,s=1],i)=>{
const o=gltf.scene.clone(true);o.position.set(x,0.02,z);o.rotation.y=ry;o.scale.setScalar(s);
o.traverse((m)=>{
if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;
if(tint&&tint[i]&&m.material.color&&m.material.color.r>0.5&&m.material.color.g<0.35){m.material=m.material.clone();m.material.color.set(tint[i]);}
});
scene.add(o);
});
};
const bikeTint=['#c8352d','#e0e0dc','#3a6fb0','#2f8f57'];
place(gl.bicycle,[[-3.4,29.15,0.08],[-2.7,29.2,-0.05],[-28.2,29.25,0.1],[-27.5,29.3,-0.08]],bikeTint);
place(gl.kei_truck,[[15.5,22.7,Math.PI/2]]);
if(gl.stop_sign){const st=gl.stop_sign.scene.clone(true);st.position.set(S.crossX-2.2-0.05,1.85,28.75);st.rotation.y=Math.PI/2;scene.add(st);}
place(gl.curve_mirror,[[-29.2,28.95,-Math.PI/4]]);
scene.traverse((o)=>{if(o.isMesh&&o.material&&/^Cover/i.test(o.material.name||'')){o.material=o.material.clone();o.material.color.set('#f08a2c');}});
buildYards(scene,gl);
}
export function lotTexture(){
return canvasTexture(256,256,(g,w,h)=>{
g.fillStyle='#b3afa6';g.fillRect(0,0,w,h);
for(let i=0;i<1800;i++){const v=150+Math.random()*40;g.fillStyle=`rgba(${v},${v - 3},${v - 9},.6)`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}
g.fillStyle='rgba(90,86,80,.18)';for(let i=0;i<3;i++){g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,30,18,Math.random()*3,0,7);g.fill();}
g.strokeStyle='rgba(80,76,70,.55)';g.lineWidth=2;for(let k=0;k<=256;k+=128){g.beginPath();g.moveTo(k,0);g.lineTo(k,h);g.stroke();g.beginPath();g.moveTo(0,k);g.lineTo(w,k);g.stroke();}
},[1,1]);
}
function buildYards(scene,gl){
const blockTex=canvasTexture(128,64,(g)=>{
g.fillStyle='#b9b5ab';g.fillRect(0,0,128,64);
for(let i=0;i<600;i++){const v=160+Math.random()*40;g.fillStyle=`rgba(${v},${v - 2},${v - 8},.7)`;g.fillRect(Math.random()*128,Math.random()*64,2,2);}
g.strokeStyle='#8a867d';g.lineWidth=2;
for(let r=0;r<4;r++){g.beginPath();g.moveTo(0,r*16);g.lineTo(128,r*16);g.stroke();for(let x=(r%2)*16;x<128;x+=32){g.beginPath();g.moveTo(x,r*16);g.lineTo(x,r*16+16);g.stroke();}}
},[1,1]);
const capM=new THREE.MeshStandardMaterial({color:'#8f8b83',roughness:0.9});
const H=1.1,Z=30.15;
const wall=(x0,x1,z=Z,alongZ=false)=>{
const L=Math.abs(x1-x0),m=(x0+x1)/2;
const t=blockTex.clone();t.needsUpdate=true;t.repeat.set(L/1.6,H/0.8);
const w=new THREE.Mesh(new THREE.BoxGeometry(alongZ?0.15:L,H,alongZ?L:0.15),new THREE.MeshStandardMaterial({map:t,roughness:0.95}));
w.position.set(alongZ?z:m,H/2,alongZ?m:z);w.castShadow=true;w.receiveShadow=true;scene.add(w);
const cap=new THREE.Mesh(new THREE.BoxGeometry(alongZ?0.22:L+0.06,0.07,alongZ?L+0.06:0.22),capM);
cap.position.set(alongZ?z:m,H+0.035,alongZ?m:z);cap.castShadow=true;scene.add(cap);
};
wall(-38,-28.6);wall(15.9,19.0);wall(20.2,22.4);wall(29.6,38);
wall(29.6,36.5,-28.5,true);wall(29.6,36.5,15.95,true);wall(29.6,36.5,22.4,true);
if(gl.hedge){
const segs=[];
const run=(x0,x1,z,h)=>{const L=1.77*h/0.9*0.95;for(let x=x0+L/2;x<=x1-L/2+0.01;x+=L)segs.push([x,z,h]);};
run(-37.6,-29,30.75,1.5);run(-22.9,-17,31.6,1.35);run(16.3,22,30.75,1.5);run(30,37.6,30.75,1.5);
run(-16.3,-9.7,30.55,0.8);run(10.3,15.7,30.7,0.8);run(22.6,29.4,30.55,0.8);
const srcs=[];gl.hedge.scene.updateMatrixWorld(true);gl.hedge.scene.traverse((o)=>{if(o.isMesh)srcs.push(o);});
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),sv=new THREE.Vector3();
for(const src of srcs){
const im=new THREE.InstancedMesh(src.geometry,src.material,segs.length);
segs.forEach(([x,z,h],i)=>{const k=h/0.9;p.set(x,0,z);sv.set(k,k,k);m4.compose(p,q,sv).multiply(src.matrixWorld);im.setMatrixAt(i,m4);});
im.castShadow=true;im.receiveShadow=true;im.computeBoundingSphere();scene.add(im);
}
}
const acBody=new THREE.MeshStandardMaterial({color:'#ecebe6',roughness:0.6});
const fanTex=canvasTexture(64,64,(g)=>{g.fillStyle='#ecebe6';g.fillRect(0,0,64,64);g.fillStyle='#3a3a38';g.beginPath();g.arc(32,32,26,0,7);g.fill();g.strokeStyle='#9a9a96';g.lineWidth=2;for(let r=6;r<27;r+=5){g.beginPath();g.arc(32,32,r,0,7);g.stroke();}});
const fanM=new THREE.MeshStandardMaterial({map:fanTex,roughness:0.6});
const ac=(x,z,ry)=>{
const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);
const b=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.6,0.3),[acBody,acBody,acBody,acBody,fanM,acBody]);b.position.y=0.42;b.castShadow=true;g.add(b);
const st=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.12,0.34),capM);st.position.y=0.06;g.add(st);
};
ac(-23.2,31.0,-Math.PI/2);ac(-16.9,31.6,Math.PI/2);ac(16.3,31.6,-Math.PI/2);ac(22.0,31.0,Math.PI/2);ac(6.1,31.4,-Math.PI/2);
const meterM=new THREE.MeshStandardMaterial({color:'#d8d4c8',roughness:0.7}),pipeM=new THREE.MeshStandardMaterial({color:'#c9b046',roughness:0.6});
for(const[x,z]of[[-23.5,32.4],[16.0,32.6],[22.3,32.4]]){
const m=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.28,0.22),meterM);m.position.set(x,1.0,z);scene.add(m);
const pp=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.9,8),pipeM);pp.position.set(x,0.45,z+0.06);scene.add(pp);
}
}
