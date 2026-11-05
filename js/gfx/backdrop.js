/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture}from'./stage.js';
function rng(seed){
return()=>{
seed=(seed+0x6d2b79f5)|0;
let t=Math.imul(seed^(seed>>>15),1|seed);
t=(t+Math.imul(t^(t>>>7),61|t))^t;
return((t^(t>>>14))>>>0)/4294967296;
};
}
const TILE=26;
function facadeBox(w,h,d,mw,mh,wall,roof){
const g=new THREE.BoxGeometry(w,h,d).toNonIndexed();
const uv=g.attributes.uv,col=new Float32Array(36*3),cw=new THREE.Color(wall),cr=new THREE.Color(roof);
for(let f=0;f<6;f++)for(let k=0;k<6;k++){
const i=f*6+k;
if(f===2||f===3)uv.setXY(i,0.02,0.98);
else uv.setXY(i,uv.getX(i)*Math.max(1,Math.round((f<2?d:w)/mw)),uv.getY(i)*Math.max(1,Math.round(h/mh)));
const c=f===2?cr:cw;col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
}
g.setAttribute('color',new THREE.BufferAttribute(col,3));
return g;
}
function gable(w,rise,d,color){
const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(0,rise);s.lineTo(w/2,0);s.closePath();
let g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false}).translate(0,0,-d/2);
g=g.index?g.toNonIndexed():g;
const n=g.attributes.position.count,uv=g.attributes.uv,col=new Float32Array(n*3),c=new THREE.Color(color);
for(let i=0;i<n;i++){uv.setXY(i,0.02,0.98);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
g.setAttribute('color',new THREE.BufferAttribute(col,3));
return g;
}
const keep=(g)=>{for(const k of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(k))g.deleteAttribute(k);return g;};
export function buildBackdrop(scene,{houseLight,isFree,ground=true}){
const R=rng(20261104);
const pick=(a)=>a[Math.floor(R()*a.length)];
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s1=new THREE.Vector3(1,1,1);
const place=(g,x,y,z,ry)=>{e.set(0,ry,0);q.setFromEuler(e);p.set(x,y,z);return g.applyMatrix4(m4.compose(p,q,s1));};
const townTex=canvasTexture(256,256,(g)=>{
g.fillStyle='#a19f96';g.fillRect(0,0,256,256);
for(let i=0;i<700;i++){const v=140+Math.random()*40;g.fillStyle=`rgba(${v},${v},${v * 0.94},0.35)`;g.fillRect(Math.random()*256,Math.random()*256,3,3);}
g.fillStyle='#c9c6bd';g.fillRect(0,0,256,50);g.fillRect(0,0,50,256);
g.fillStyle='#66686a';g.fillRect(0,0,256,40);g.fillRect(0,0,40,256);
g.fillStyle='#e8e4d6';for(let x=46;x<256;x+=22)g.fillRect(x,19,12,2);for(let y=46;y<256;y+=22)g.fillRect(19,y,2,12);
},[20,20]);
const town=new THREE.Mesh(new THREE.PlaneGeometry(TILE*20,TILE*20),new THREE.MeshLambertMaterial({map:townTex}));
town.rotation.x=-Math.PI/2;town.position.set(-20/256*TILE,-0.02,-20/256*TILE);
if(ground)scene.add(town);
const aptTex=canvasTexture(64,64,(g)=>{
g.fillStyle='#ffffff';g.fillRect(0,0,64,64);
g.fillStyle='#5b6b78';g.fillRect(8,16,30,30);
g.fillStyle='#7f909c';g.fillRect(10,18,12,26);
g.fillStyle='#dcd8d0';g.fillRect(0,44,64,4);g.fillStyle='#b9b5ad';g.fillRect(0,48,64,2);
g.fillStyle='#8c949a';g.fillRect(44,22,12,14);
},[1,1]);
const houseTex=canvasTexture(64,64,(g)=>{
g.fillStyle='#ffffff';g.fillRect(0,0,64,64);
g.fillStyle='#e8e2d6';g.fillRect(0,54,64,10);
g.fillStyle='#5f6e7a';g.fillRect(18,18,26,20);g.fillStyle='#d6d0c4';g.fillRect(16,38,30,3);
},[1,1]);
const aptGeo=[],houseGeo=[],treeGeo=[],towerGeo=[];
const walls=['#f1ece2','#e6dfd2','#dfe3e4','#efe3cf','#d9d1c4','#e9e6df','#cfd6d9'];
const roofs=['#4a535c','#5b5048','#3d4851','#6c5c4d','#55606a','#7a4a3c','#3f5a66'];
function house(x,z,ry){
const w=6.5+R()*2.5,d=6+R()*2,h=5.2+R()*0.8,roof=pick(roofs);
houseGeo.push(place(facadeBox(w,h,d,3,2.8,pick(walls),roof).translate(0,h/2,0),x,0,z,ry));
houseGeo.push(place(gable(w+0.8,1.6+R()*0.6,d+0.8,roof).translate(0,h,0),x,0,z,ry));
}
function apartment(x,z,ry,floors){
const w=12+Math.round(R()*3)*3.2,d=8+R()*4,h=floors*3;
aptGeo.push(place(facadeBox(w,h,d,3.2,3,pick(walls),'#9a978f').translate(0,h/2,0),x,0,z,ry));
aptGeo.push(place(facadeBox(w+0.4,0.5,d+0.4,3.2,3,'#a8a49c','#8e8b84').translate(0,h+0.25,0),x,0,z,ry));
}
const treeLeaf=new THREE.Color('#6f9e55'),treeDark=new THREE.Color('#5d8a48');
function trees(x,z,n){
for(let k=0;k<n;k++){
const r=1.6+R()*1.6,tx=x+(R()-0.5)*8,tz=z+(R()-0.5)*8;
let g=new THREE.IcosahedronGeometry(r,0);g=keep(g.index?g.toNonIndexed():g);
const c=R()>0.5?treeLeaf:treeDark,col=new Float32Array(g.attributes.position.count*3);
for(let i=0;i<col.length;i+=3){col[i]=c.r;col[i+1]=c.g;col[i+2]=c.b;}
g.setAttribute('color',new THREE.BufferAttribute(col,3));
treeGeo.push(place(g,tx,r*1.1,tz,R()*3));
}
}
const light=[];
for(let tx=-10;tx<10;tx++)for(let tz=-10;tz<10;tz++)for(const[ox,oz]of[[7.5,7.5],[18.5,7.5],[7.5,18.5],[18.5,18.5]]){
const x=tx*TILE+ox,z=tz*TILE+oz,r=Math.hypot(x,z);
if(r>182||!isFree(x,z))continue;
const ry=(Math.floor(R()*4)*Math.PI)/2,roll=R();
if(roll<0.1){trees(x,z,3);continue;}
if(r<95){
if(roll<0.45)light.push([x,z,ry]);
else if(roll<0.92)house(x,z,ry);
else apartment(x,z,ry,3+Math.floor(R()*2));
}else if(r<145){
if(roll<0.82)house(x,z,ry);else apartment(x,z,ry,3+Math.floor(R()*4));
}else if(roll<0.6)house(x,z,ry);
else apartment(x,z,ry,4+Math.floor(R()*6));
}
houseLight.scene.updateMatrixWorld(true);
houseLight.scene.traverse((o)=>{
if(!o.isMesh)return;
const im=new THREE.InstancedMesh(o.geometry,new THREE.MeshLambertMaterial({map:o.material.map}),light.length);
light.forEach(([x,z,ry],i)=>{e.set(0,ry,0);q.setFromEuler(e);p.set(x,0.02,z);im.setMatrixAt(i,m4.compose(p,q,s1).multiply(o.matrixWorld));});
im.computeBoundingSphere();scene.add(im);
});
for(let k=0;k<44;k++){
const a=R()*Math.PI*2,r=192+R()*30,h=16+R()*R()*55,w=12+R()*14;
towerGeo.push(place(facadeBox(w,h,w*(0.6+R()*0.5),3.2,3,pick(['#dfe3e6','#cfd6dc','#e8e4dc','#c4ccd2']),'#9aa0a6').translate(0,h/2,0),Math.cos(a)*r,0,Math.sin(a)*r,-a));
}
const vc={vertexColors:true};
const meshes=[
[houseGeo,new THREE.MeshLambertMaterial({map:houseTex,...vc})],
[aptGeo,new THREE.MeshLambertMaterial({map:aptTex,...vc})],
[towerGeo,new THREE.MeshLambertMaterial({map:aptTex,...vc})],
[treeGeo,Object.assign(new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}),{name:'tree_far'})],
];
for(const[list,mat]of meshes)if(list.length)scene.add(new THREE.Mesh(mergeGeometries(list.map(keep),false),mat));
const haze=new THREE.Color('#d6e0e4');
function ridge(radius,base,amp,top,seed){
const RR=rng(seed),N=160,pos=[],col=[],ct=new THREE.Color(top);
const hs=[];let hv=0.5;
for(let i=0;i<=N;i++){hv=Math.min(1,Math.max(0,hv+(RR()-0.5)*0.35));hs.push(hv);}
for(let i=0;i<N;i++){
const a0=(i/N)*Math.PI*2,a1=((i+1)/N)*Math.PI*2;
const west=(a)=>0.35+0.65*Math.max(0,-Math.cos(a));
const y0=base+amp*hs[i]*west(a0),y1=base+amp*hs[i+1]*west(a1);
const P=(a,y)=>[Math.cos(a)*radius,y,Math.sin(a)*radius];
const quad=[P(a0,-2),P(a1,-2),P(a1,y1),P(a0,-2),P(a1,y1),P(a0,y0)];
const cs=[haze,haze,ct,haze,ct,ct];
for(let k=0;k<6;k++){pos.push(...quad[k]);col.push(cs[k].r,cs[k].g,cs[k].b);}
}
const g=new THREE.BufferGeometry();
g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,fog:false,side:THREE.DoubleSide}));
m.renderOrder=-0.5;scene.add(m);return m;
}
const ridges=[ridge(236,8,46,'#9fb2c1',7),ridge(229,4,26,'#93a89a',11)];
const cloudTex=canvasTexture(256,128,(g)=>{
g.clearRect(0,0,256,128);
for(const[x,y,r]of[[70,80,46],[125,62,58],[185,82,42],[100,92,40],[160,95,38]]){
const gr=g.createRadialGradient(x,y,0,x,y,r);
gr.addColorStop(0,'rgba(255,255,255,0.95)');gr.addColorStop(0.6,'rgba(255,255,255,0.6)');gr.addColorStop(1,'rgba(255,255,255,0)');
g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
}
});
const cloudMat=new THREE.MeshBasicMaterial({map:cloudTex,transparent:true,depthWrite:false,fog:false,opacity:0.9});
const cloudGeo=[];
for(let k=0;k<16;k++){
const a=R()*Math.PI*2,r=150+R()*70,y=60+R()*45,sc=0.7+R()*0.8;
const g=new THREE.PlaneGeometry(70*sc,32*sc);
e.set(0,Math.atan2(-Math.cos(a),-Math.sin(a)),0);q.setFromEuler(e);p.set(Math.cos(a)*r,y,Math.sin(a)*r);
cloudGeo.push(g.applyMatrix4(m4.compose(p,q,s1)));
}
const clouds=new THREE.Mesh(mergeGeometries(cloudGeo,false),cloudMat);clouds.renderOrder=-0.4;scene.add(clouds);
return{
setWeather(rainy){
for(const r of ridges)r.material.color.set(rainy?'#b4bcc2':'#ffffff');
cloudMat.color.set(rainy?'#aab3b9':'#ffffff');
},
setTone(t){
for(const r of ridges)r.material.color.set(t==='night'?'#39445e':'#d9a894');
cloudMat.color.set(t==='night'?'#465270':'#f6c3a2');
},
};
}
