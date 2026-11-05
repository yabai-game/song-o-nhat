/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,signTexture,makeSun,loadBrand,BRAND_ASPECT}from'./stage.js';
export const DORM={
bed:{x:-0.5,z:-0.95},
lieY:0.3,
table:{x:1.25,z:0.75},
stove:{x:1.78,z:-1.25},
door:{x:2.2,z:1.65},
bounds:{x0:-2.4,x1:2.45,z0:-1.95,z1:2.1},
blocks:[{x:1.25,z:0.75,r:0.62},{x:-2.0,z:-1.75,r:0.55},{x:1.96,z:-1.88,r:0.48},{x:2.16,z:-0.35,r:0.42},{x:-1.78,z:0.6,r:0.4}],
washer:{x:1.65,z:-0.35},
};
export function buildDorm(models={}){
const scene=new THREE.Scene();
scene.background=new THREE.Color('#2a211b');
const hemi=new THREE.HemisphereLight(0xfff3df,0x8a6a4a,1.05);scene.add(hemi);
const sun=makeSun(scene,{color:0xffe2b8,intensity:1.6,size:5,offset:[1.5,6,4]});
const window_=new THREE.PointLight(0xfff0d0,2.2,7,1.4);window_.position.set(-0.6,1.7,-1.9);scene.add(window_);
const batch=new Map();
const mats={};
const mat=(key,make)=>mats[key]||(mats[key]=make());
const col=(c,o={})=>mat(c+JSON.stringify(Object.keys(o)),()=>new THREE.MeshStandardMaterial({color:c,roughness:0.85,...o}));
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s1=new THREE.Vector3(1,1,1);
function put(geo,m,x,y,z,ry=0,rx=0){
e.set(rx,ry,0);q.setFromEuler(e);p.set(x,y,z);
let g=geo.applyMatrix4(m4.compose(p,q,s1));if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
if(!batch.has(m))batch.set(m,[]);batch.get(m).push(g);
}
const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const tatami=canvasTexture(512,512,(g)=>{
g.fillStyle='#c9c08a';g.fillRect(0,0,512,512);
for(let i=0;i<2600;i++){g.fillStyle=`rgba(${120 + Math.random() * 60},${120 + Math.random() * 50},60,0.18)`;g.fillRect(Math.random()*512,Math.random()*512,1,6);}
g.strokeStyle='#3f3a2a';g.lineWidth=8;
for(const[x,y,w,h]of[[0,0,256,128],[256,0,256,128],[0,128,128,256],[128,128,256,128],[384,128,128,256],[128,256,256,128],[0,384,256,128],[256,384,256,128]])g.strokeRect(x+4,y+4,w-8,h-8);
});
put(new THREE.PlaneGeometry(5.0,4.4).rotateX(-Math.PI/2),mat('tatami',()=>new THREE.MeshStandardMaterial({map:tatami,roughness:0.95})),0,0,0);
const wall=col('#ece2cf');
put(B(5.2,2.6,0.12),wall,0,1.3,-2.26);
put(B(0.12,2.6,4.6),wall,-2.56,1.3,0);
put(B(0.12,2.6,2.9),wall,2.56,1.3,-0.85);
put(B(0.12,0.5,1.7),wall,2.56,2.35,1.45);
for(const[x,z,w,d]of[[0,-2.18,5.0,0.06],[-2.48,0,0.06,4.4],[2.48,-0.85,0.06,2.7]])put(B(w,0.1,d),col('#6b4a30'),x,0.05,z);
put(B(5.2,0.12,0.16),col('#6b4a30'),0,2.55,-2.2);
const sky=canvasTexture(128,128,(g)=>{
const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,'#8cc4ea');gr.addColorStop(1,'#f5e2c0');g.fillStyle=gr;g.fillRect(0,0,128,128);
g.fillStyle='#9aa7b0';for(let i=0;i<6;i++)g.fillRect(i*22,80+(i%3)*8,18,48);
});
const nightSky=canvasTexture(128,128,(g)=>{
const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,'#0d1630');gr.addColorStop(1,'#2b3a63');g.fillStyle=gr;g.fillRect(0,0,128,128);
for(let i=0;i<6;i++){g.fillStyle='#1a2238';g.fillRect(i*22,80+(i%3)*8,18,48);g.fillStyle='#ffd98a';g.fillRect(i*22+4,90+(i%3)*8,4,4);g.fillRect(i*22+10,104+(i%2)*6,4,4);}
g.fillStyle='#fffbe0';g.beginPath();g.arc(98,22,8,0,Math.PI*2);g.fill();
});
const skyMat=new THREE.MeshBasicMaterial({map:sky});
const skyPane=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.1),skyMat);skyPane.position.set(-0.6,1.55,-2.19);scene.add(skyPane);
const lampMat=new THREE.MeshStandardMaterial({color:'#fff8e8',emissive:'#ffe2a8',emissiveIntensity:0});
const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.36,0.1,24),lampMat);lamp.position.set(0,2.5,0);scene.add(lamp);
const lampLight=new THREE.PointLight(0xffd9a0,0,8,1.3);lampLight.position.set(0,2.3,0.2);lampLight.visible=false;scene.add(lampLight);
for(const[w,h,x,y]of[[1.7,0.07,-0.6,2.13],[1.7,0.07,-0.6,0.97],[0.07,1.2,-1.45,1.55],[0.07,1.2,0.25,1.55],[0.05,1.1,-0.6,1.55]])put(B(w,h,0.06),col('#f4f1ea'),x,y,-2.17);
for(const x of[-1.62,0.42])put(B(0.36,1.35,0.05),col('#e8a0b0'),x,1.5,-2.12);
const futon=col('#f3efe6');
if(models.futon){
const f=models.futon.scene.clone(true);
f.traverse((o)=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
f.position.set(DORM.bed.x,0,DORM.bed.z+0.05);f.rotation.y=Math.PI;scene.add(f);
}else put(B(1.05,0.1,2.0),futon,DORM.bed.x,0.05,DORM.bed.z+0.05);
for(let k=0;k<4;k++)put(B(0.95,0.12,0.7),k%2?col('#e9b8c2'):futon,-1.95,0.06+k*0.12,-1.75,0.05*k);
put(B(0.88,0.06,1.9),col('#d9cfb8'),0.78,0.03,-0.95);
const kx=1.96,kz=-1.88,kw=1.04,kh=0.72,kd=0.54;
put(B(kw,kh,kd),col('#b88958'),kx,kh/2,kz);
put(B(0.46,0.56,0.02),col('#9e7144'),kx-0.25,0.35,kz+kd/2+0.01);
put(B(0.46,0.56,0.02),col('#9e7144'),kx+0.25,0.35,kz+kd/2+0.01);
put(B(0.03,0.12,0.03),col('#7c8288',{metalness:0.5}),kx-0.06,0.42,kz+kd/2+0.025);
put(B(0.03,0.12,0.03),col('#7c8288',{metalness:0.5}),kx+0.06,0.42,kz+kd/2+0.025);
put(B(kw+0.04,0.04,kd+0.04),col('#d6dce2',{metalness:0.35,roughness:0.4}),kx,kh+0.02,kz);
put(B(kw+0.04,0.18,0.03),col('#e4e8ec',{roughness:0.5}),kx,kh+0.13,kz-kd/2+0.015);
put(B(0.32,0.03,0.34),col('#88929b',{metalness:0.5,roughness:0.35}),kx+0.3,kh+0.042,kz);
put(new THREE.CylinderGeometry(0.016,0.016,0.18,10),col('#bcc4cc',{metalness:0.6,roughness:0.3}),kx+0.3,kh+0.13,kz-0.16);
put(B(0.03,0.025,0.12),col('#bcc4cc',{metalness:0.6,roughness:0.3}),kx+0.3,kh+0.21,kz-0.11);
const stovePos={x:kx-0.18,y:kh+0.04,z:kz+0.01};
if(models.gas_stove){
const st=models.gas_stove.scene.clone(true);
st.traverse((o)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
st.position.set(stovePos.x,stovePos.y,stovePos.z);
scene.add(st);
}else{
put(B(0.58,0.14,0.44),col('#3a3f45'),stovePos.x,stovePos.y+0.07,stovePos.z);
}
const prop=(m,x,y,z,ry=0,s=1)=>{
if(!m)return null;
const o=m.scene.clone(true);o.traverse((c)=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
o.position.set(x,y,z);o.rotation.y=ry;o.scale.setScalar(s);scene.add(o);return o;
};
if(models.cooking_pot){
let top=stovePos.y+0.14;
if(models.gas_stove){const bb=new THREE.Box3().setFromObject(scene.children[scene.children.length-1]);if(isFinite(bb.max.y))top=bb.max.y;}
prop(models.cooking_pot,stovePos.x-0.1,top,stovePos.z+0.02,0.4);
}
put(B(0.42,0.5,0.36),col('#b88958'),1.18,0.25,-1.96);
put(B(0.44,0.03,0.38),col('#9e7144'),1.18,0.515,-1.96);
prop(models.rice_cooker,1.18,0.53,-1.94,0.2);
prop(models.washing_machine,2.16,0,-0.35,-Math.PI/2);
prop(models.drying_rack,-1.78,0,0.6,Math.PI/2,0.75);
const drying=new THREE.Group();drying.visible=false;scene.add(drying);
for(const[dz,c,w,h]of[[-0.55,'#3b6ea8',0.34,0.42],[-0.15,'#f4f1ea',0.3,0.36],[0.25,'#c0504d',0.32,0.4],[0.62,'#5f7f58',0.22,0.3]]){
for(const dx of[-0.2,0.2]){
const cl=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({color:c,roughness:0.95,side:THREE.DoubleSide}));
cl.position.set(-1.78+dx,0.72-h/2,0.6+dz);cl.rotation.y=Math.PI/2;cl.rotation.z=dx*0.6;drying.add(cl);
}
}
const steamGroup=new THREE.Group();
steamGroup.position.set(stovePos.x,stovePos.y+0.36,stovePos.z);
steamGroup.visible=false;
scene.add(steamGroup);
const steamMat=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0.55,depthWrite:false});
const steamGeo=new THREE.SphereGeometry(0.055,8,6);
const steamPuffs=[];
for(let i=0;i<10;i++){
const m=new THREE.Mesh(steamGeo,steamMat);
const ox=(i%2===0?-0.11:0.11)+((i*37)%11-5)*0.008;
const oz=((i*53)%11-5)*0.008;
m.position.set(ox,(i/10)*0.42,oz);
steamGroup.add(m);
steamPuffs.push({mesh:m,ox,oz,phase:i/10});
}
const clockTex=signTexture('6:30',128,64,'#fffbe8','#c0392b');
put(B(0.18,0.14,0.08),col('#e2574c'),DORM.bed.x+0.48,0.07,DORM.bed.z-0.78);
const clockFace=new THREE.Mesh(new THREE.PlaneGeometry(0.15,0.075),new THREE.MeshBasicMaterial({map:clockTex}));
clockFace.position.set(DORM.bed.x+0.48,0.08,DORM.bed.z-0.735);scene.add(clockFace);
if(models.lowtable){
const t=models.lowtable.scene.clone(true);
t.traverse((o)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
t.scale.set(1.35,1.0,2.0);t.position.set(DORM.table.x,0,DORM.table.z);t.rotation.y=Math.PI/2;scene.add(t);
}else{
put(new THREE.CylinderGeometry(0.6,0.6,0.05,28),col('#8a5a34'),DORM.table.x,0.34,DORM.table.z);
for(const[dx,dz]of[[0.32,0.32],[-0.32,0.32],[0.32,-0.32],[-0.32,-0.32]])put(B(0.06,0.32,0.06),col('#6b4428'),DORM.table.x+dx,0.16,DORM.table.z+dz);
}
const onigiri=new THREE.Group();onigiri.position.set(DORM.table.x-0.12,0.37,DORM.table.z+0.05);scene.add(onigiri);
const plate=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.15,0.02,20),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:0.4}));onigiri.add(plate);
for(const dx of[-0.06,0.07]){
const rice=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.1,3),new THREE.MeshStandardMaterial({color:'#fbfaf4',roughness:0.9}));rice.position.set(dx,0.06,0);rice.rotation.y=0.6;onigiri.add(rice);
const nori=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.04,0.05),new THREE.MeshStandardMaterial({color:'#1f2a1f'}));nori.position.set(dx,0.03,0.025);onigiri.add(nori);
}
put(new THREE.CylinderGeometry(0.045,0.04,0.09,14),col('#5f7f58'),DORM.table.x+0.2,0.41,DORM.table.z-0.1);
put(new THREE.BoxGeometry(0.42,0.42,0.42),col('#8a5a34'),-2.2,0.21,1.6);
put(new THREE.BoxGeometry(0.5,0.36,0.06),col('#24282c'),-2.2,0.62,1.6);
put(B(1.4,0.04,0.3),col('#6b4a30'),-2.38,1.9,0.35,Math.PI/2);
put(B(0.06,0.8,0.45),col('#1f3148'),-2.46,1.42,0.0);
put(B(0.06,0.8,0.45),col('#1f3148'),-2.46,1.42,0.7);
const hat=new THREE.Mesh(new THREE.SphereGeometry(0.16,16,10,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#f4f4f0',roughness:0.4}));
hat.position.set(-2.38,1.93,0.35);scene.add(hat);
put(B(0.9,0.06,1.5),col('#8d8a84'),2.05,-0.02,1.5);
put(B(0.06,0.12,1.5),col('#6b4a30'),1.58,0.04,1.5);
for(const[x,z,c]of[[1.9,1.15,'#2b2b30'],[2.12,1.15,'#2b2b30'],[1.95,1.85,'#f4f4f0'],[2.17,1.85,'#f4f4f0']])put(B(0.12,0.08,0.28),col(c),x,0.04,z);
put(B(0.06,2.1,1.1),col('#7a5236'),2.58,1.05,1.5);
put(new THREE.SphereGeometry(0.04,8,6),col('#d8c07a',{metalness:0.6}),2.53,1.0,1.1);
for(const[txt,x,y,bg,fg]of[['5分前行動',1.3,1.65,'#fffdf4','#c0392b'],['ゴミは分別',0.7,1.65,'#fffdf4','#2f6fb0']]){
const poster=new THREE.Mesh(new THREE.PlaneGeometry(0.52,0.32),new THREE.MeshStandardMaterial({map:signTexture(txt,256,160,bg,fg),roughness:0.9}));
poster.position.set(x,y,-2.19);scene.add(poster);
}
{
const px=1.88,py=1.65,pz=-2.19;
const pTex=canvasTexture(220,310,(g)=>{
g.fillStyle='#1e293b';g.fillRect(0,0,220,310);
g.strokeStyle='#f5e2c0';g.lineWidth=6;g.strokeRect(8,8,204,294);
g.fillStyle='#f5e2c0';g.fillRect(24,152,172,3);
g.fillStyle='#f8fafc';g.textAlign='center';g.textBaseline='middle';
g.font='800 28px "Zen Maru Gothic", "Yu Gothic", sans-serif';
g.fillText('夢に向かって',110,204);
g.fillStyle='#cbd5e1';
g.font='700 22px "Zen Maru Gothic", "Yu Gothic", sans-serif';
g.fillText('一歩ずつ',110,252);
});
const pBg=new THREE.Mesh(new THREE.PlaneGeometry(0.44,0.62),new THREE.MeshStandardMaterial({map:pTex,roughness:0.85}));
pBg.position.set(px,py,pz);
scene.add(pBg);
const lw=0.36,lh=lw/BRAND_ASPECT;
const lMat=new THREE.MeshStandardMaterial({transparent:true,alphaTest:0.05,depthWrite:false,roughness:0.7});
if(models.brandWhite)lMat.map=models.brandWhite;
else loadBrand('white').then((tex)=>{lMat.map=tex;lMat.needsUpdate=true;});
const lMesh=new THREE.Mesh(new THREE.PlaneGeometry(lw,lh),lMat);
lMesh.position.set(px,py+0.14,pz+0.02);
scene.add(lMesh);
}
const sign=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.3),new THREE.MeshStandardMaterial({map:signTexture('さくら寮',256,128,'#ffffff','#3a2c23')}));
sign.position.set(2.5,2.25,1.5);sign.rotation.y=-Math.PI/2;scene.add(sign);
for(const[m,list]of batch){const mesh=new THREE.Mesh(mergeGeometries(list,false),m);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}
return{
scene,sun,onigiri,steamGroup,
setDrying(on){drying.visible=!!on;},
setTime(which){
const night=which==='night';
skyMat.map=night?nightSky:sky;skyMat.needsUpdate=true;
hemi.intensity=night?0.45:1.05;sun.intensity=night?0.35:1.6;
window_.intensity=night?0.4:2.2;
lampMat.emissiveIntensity=night?1.4:0;lampLight.visible=night;lampLight.intensity=night?3.2:0;
if(night)onigiri.visible=false;
},
setSteam(on){
steamGroup.visible=!!on;
},
update(dt=0.016,t=0){
if(!steamGroup.visible)return;
for(let i=0;i<steamPuffs.length;i++){
const p=steamPuffs[i];
p.phase=(p.phase+dt*0.85)%1;
p.mesh.position.y=p.phase*0.48;
p.mesh.position.x=p.ox+Math.sin(t*4+i)*0.025;
p.mesh.position.z=p.oz+Math.cos(t*3.5+i)*0.02;
const s=0.65+Math.sin(p.phase*Math.PI)*0.75;
p.mesh.scale.setScalar(s);
}
},
};
}
