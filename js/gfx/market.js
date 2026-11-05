/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,signTexture,makeSun,loadModel,loadBrand,BRAND_ASPECT}from'./stage.js';
import{discount}from'../core/market_rules.js';
const MODELS=[
'shelf_long','shelf_fridge','shelf_counter',
'food_meat','food_eggs','food_banana','food_cucumber','food_eggplant','food_apple','bento_box',
];
export const MARKET={
door:{x:2.2,z:2.35},
checkout:{x:-1.9,z:1.15},
clerk:{x:-1.9,z:2.55},
fridge:{x:0.0,z:-1.45},
shelfL:{x:-1.85,z:0.45},
shelfR:{x:1.85,z:0.45},
bounds:{x0:-3.25,x1:3.25,z0:-1.65,z1:2.55},
blocks:[
{x:-1.85,z:-0.35,r:0.55},
{x:-1.0,z:-0.35,r:0.55},
{x:-2.7,z:-0.35,r:0.55},
{x:1.85,z:-0.35,r:0.55},
{x:1.0,z:-0.35,r:0.55},
{x:2.7,z:-0.35,r:0.55},
{x:-1.9,z:2.0,r:0.72},
],
};
function recolorShelf(root){
root.traverse((o)=>{
if(!o.isMesh||!o.material)return;
o.castShadow=true;
o.receiveShadow=true;
const m=o.material.clone();
if(!m.transparent&&m.color){
const{r,g,b}=m.color;
if(r>0.8&&g>0.55&&b<0.65){
m.color.set('#f5f6f8');
m.roughness=0.6;
}else if(r>0.4&&g<0.25){
m.color.set('#cfd6de');
m.roughness=0.5;
}
}
o.material=m;
});
}
function makeBadgeTexture(kind){
const isHalf=kind==='半額';
return canvasTexture(128,128,(g)=>{
g.clearRect(0,0,128,128);
g.fillStyle=isHalf?'#ffd426':'#d93829';
g.beginPath();g.arc(64,64,58,0,Math.PI*2);g.fill();
g.lineWidth=7;
g.strokeStyle=isHalf?'#c92a1d':'#fff3b0';
g.stroke();
g.fillStyle=isHalf?'#c92a1d':'#ffffff';
g.textAlign='center';g.textBaseline='middle';
g.font='900 42px "Zen Maru Gothic", "Yu Gothic", sans-serif';
g.fillText(kind,64,56);
g.font='800 20px "Be Vietnam Pro", sans-serif';
g.fillText(isHalf?'-50%':'-20%',64,94);
});
}
export async function buildMarket(){
const[gl,brandBlack]=await Promise.all([
Promise.all(MODELS.map(async(n)=>[n,await loadModel(n)])).then(Object.fromEntries),
loadBrand('black'),
]);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#232a38');
const hemi=new THREE.HemisphereLight(0xffffff,0xd8d2c5,1.35);
scene.add(hemi);
const sun=makeSun(scene,{color:0xfffaf0,intensity:1.45,size:7,offset:[2,7,5]});
for(const x of[-2.0,2.0]){
const pt=new THREE.PointLight(0xfffdf6,1.4,9,1.3);
pt.position.set(x,2.75,0.2);
scene.add(pt);
}
const batch=new Map();
const mats={};
const mat=(k,fn)=>mats[k]||(mats[k]=fn());
const col=(c,o={})=>mat(c+JSON.stringify(o),()=>new THREE.MeshStandardMaterial({color:c,roughness:0.8,...o}));
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
const tiles=canvasTexture(256,256,(g)=>{
g.fillStyle='#f7f5ee';g.fillRect(0,0,256,256);
g.fillStyle='#ece8dc';
for(let y=0;y<4;y++)for(let x=0;x<4;x++){
if((x+y)%2===1)g.fillRect(x*64,y*64,64,64);
}
g.strokeStyle='#dad4c6';g.lineWidth=2;
for(let i=0;i<=256;i+=64){
g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();
g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke();
}
},[7,6]);
put(new THREE.PlaneGeometry(7.6,6.4).rotateX(-Math.PI/2),mat('floor',()=>new THREE.MeshStandardMaterial({map:tiles,roughness:0.65})),0,0,0);
const wallMat=col('#f5f3ec');
const greenMat=col('#277a46');
put(B(7.8,3.0,0.14),wallMat,0,1.5,-3.25);
put(B(0.14,3.0,6.6),wallMat,-3.85,1.5,0);
put(B(0.14,3.0,6.6),wallMat,3.85,1.5,0);
put(B(7.6,0.28,0.04),greenMat,0,2.76,-3.16);
put(B(0.04,0.28,6.4),greenMat,-3.76,2.76,0);
put(B(0.04,0.28,6.4),greenMat,3.76,2.76,0);
put(B(1.5,0.015,0.8),col('#277a46'),MARKET.door.x,0.008,MARKET.door.z+0.35);
const bannerTex=canvasTexture(768,180,(g)=>{
g.fillStyle='#ffd426';g.fillRect(0,0,768,180);
g.strokeStyle='#c92a1d';g.lineWidth=8;g.strokeRect(6,6,756,168);
g.fillStyle='#c92a1d';g.textAlign='center';g.textBaseline='middle';
g.font='800 44px "Zen Maru Gothic", "Yu Gothic", sans-serif';
g.fillText('スーパー さくら · タイムセール 19:30〜',384,130);
});
const banner=new THREE.Mesh(
new THREE.PlaneGeometry(2.8,0.64),
new THREE.MeshStandardMaterial({map:bannerTex,roughness:0.6}),
);
banner.position.set(0,2.28,-3.15);
scene.add(banner);
{
const lw=0.68,lh=lw/BRAND_ASPECT;
const mktLogo=new THREE.Mesh(
new THREE.PlaneGeometry(lw,lh),
new THREE.MeshStandardMaterial({map:brandBlack,transparent:true,alphaTest:0.05,depthWrite:false,roughness:0.6}),
);
mktLogo.position.set(0,2.43,-3.13);
scene.add(mktLogo);
}
for(const[txt,x,bg,fg]of[
['🥚 卵・野菜',-2.35,'#277a46','#ffffff'],
['🥩 精肉・お弁当',0.0,'#c92a1d','#ffffff'],
['🍌 果物・青果',2.35,'#277a46','#ffffff'],
]){
const s=new THREE.Mesh(
new THREE.PlaneGeometry(1.35,0.36),
new THREE.MeshStandardMaterial({map:signTexture(txt,384,108,bg,fg),roughness:0.65}),
);
s.position.set(x,1.75,-3.15);
scene.add(s);
}
for(const[m,list]of batch){
const mesh=new THREE.Mesh(mergeGeometries(list,false),m);
mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
}
const fridge=gl.shelf_fridge.scene.clone(true);
recolorShelf(fridge);
fridge.position.set(0,0,-2.42);
scene.add(fridge);
const shelfL=gl.shelf_long.scene.clone(true);
recolorShelf(shelfL);
shelfL.position.set(-1.85,0,-0.35);
scene.add(shelfL);
const shelfR=gl.shelf_long.scene.clone(true);
recolorShelf(shelfR);
shelfR.position.set(1.85,0,-0.35);
scene.add(shelfR);
const counter=gl.shelf_counter.scene.clone(true);
recolorShelf(counter);
counter.position.set(-1.9,0,2.0);
scene.add(counter);
const regSign=new THREE.Mesh(
new THREE.PlaneGeometry(0.95,0.3),
new THREE.MeshStandardMaterial({map:signTexture('お会計 レジ',256,84,'#2f5d9a','#ffffff'),roughness:0.6}),
);
regSign.position.set(-1.9,1.35,2.0);
scene.add(regSign);
const pickTargets=[];
let foodCount=0;
function placeFood(modelKey,goodId,x,y,z,ry=0,scale=1){
const g=gl[modelKey].scene.clone(true);
g.position.set(x,y,z);
g.rotation.y=ry;
if(scale!==1)g.scale.setScalar(scale);
g.userData.goodId=goodId;
g.traverse((o)=>{
o.userData.goodId=goodId;
if(o.isMesh){
o.castShadow=true;
o.receiveShadow=true;
pickTargets.push(o);
}
});
scene.add(g);
foodCount++;
}
const hitMat=new THREE.MeshBasicMaterial({visible:false});
function addZoneHitbox(goodId,x,y,z,w,h,d){
const hb=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),hitMat);
hb.position.set(x,y,z);
hb.userData.goodId=goodId;
scene.add(hb);
pickTargets.push(hb);
}
for(let r=0;r<2;r++){
for(let c=0;c<5;c++){
placeFood('food_meat','meat',-1.28+c*0.25,0.425,-2.46+r*0.22,0,1.05);
}
}
for(let c=0;c<4;c++){
placeFood('food_meat','meat',-1.2+c*0.28,0.755,-2.42,0,1.05);
}
for(let c=0;c<4;c++){
placeFood('bento_box','bento',0.16+c*0.29,0.755,-2.42,0,0.95);
placeFood('bento_box','bento',0.16+c*0.29,0.425,-2.36,0,0.95);
}
addZoneHitbox('meat',-0.75,0.65,-2.25,1.45,0.85,0.75);
addZoneHitbox('bento',0.65,0.65,-2.25,1.25,0.85,0.75);
const moyashiCard=new THREE.Mesh(
new THREE.PlaneGeometry(0.46,0.34),
new THREE.MeshStandardMaterial({map:signTexture('🌱 もやし 39¥',256,160,'#fffef7','#277a46'),roughness:0.6}),
);
moyashiCard.position.set(1.36,0.98,-1.92);
moyashiCard.userData.goodId='moyashi';
scene.add(moyashiCard);
pickTargets.push(moyashiCard);
addZoneHitbox('moyashi',1.36,0.88,-1.95,0.55,0.55,0.55);
for(let c=0;c<7;c++){
placeFood('food_eggs','eggs',-2.72+c*0.29,1.50,-0.25,0,1.0);
placeFood('food_eggs','eggs',-2.72+c*0.29,1.03,-0.25,0,1.0);
}
for(let c=0;c<8;c++){
placeFood('food_eggplant','eggplant',-2.75+c*0.26,0.57,-0.24,0.3,1.15);
placeFood('food_cucumber','cucumber',-2.75+c*0.26,0.10,-0.24,0.2,1.05);
}
addZoneHitbox('eggs',-1.85,1.32,-0.2,2.35,0.75,0.75);
addZoneHitbox('eggplant',-1.85,0.68,-0.2,2.35,0.44,0.75);
addZoneHitbox('cucumber',-1.85,0.24,-0.2,2.35,0.42,0.75);
for(let c=0;c<7;c++){
placeFood('food_banana','banana',0.98+c*0.29,1.50,-0.24,0.15,1.05);
placeFood('food_banana','banana',0.98+c*0.29,0.57,-0.24,-0.15,1.05);
}
for(let c=0;c<8;c++){
placeFood('food_apple','apple',0.95+c*0.26,1.03,-0.24,0,1.15);
placeFood('food_apple','apple',0.95+c*0.26,0.10,-0.24,0,1.15);
}
addZoneHitbox('banana',1.85,1.55,-0.2,2.35,0.45,0.75);
addZoneHitbox('apple',1.85,1.08,-0.2,2.35,0.44,0.75);
addZoneHitbox('banana',1.85,0.62,-0.2,2.35,0.44,0.75);
addZoneHitbox('apple',1.85,0.22,-0.2,2.35,0.42,0.75);
const priceLabels=[
['🥩 豚こま 398¥',-0.75,1.14,-1.82],
['🍱 お弁当 498¥',0.65,1.14,-1.82],
['🥚 卵 248¥',-1.85,1.46,0.03],
['🍆 なす 158¥',-1.85,0.53,0.03],
['🥒 きゅうり 98¥',-1.85,0.08,0.03],
['🍌 バナナ 198¥',1.85,1.46,0.03],
['🍎 りんご 128¥',1.85,0.99,0.03],
];
for(const[txt,x,y,z]of priceLabels){
const lbl=new THREE.Mesh(
new THREE.PlaneGeometry(0.68,0.16),
new THREE.MeshStandardMaterial({map:signTexture(txt,256,64,'#fffdf4','#1d1d1d'),roughness:0.7}),
);
lbl.position.set(x,y,z);
scene.add(lbl);
}
const tex20=makeBadgeTexture('2割引');
const tex50=makeBadgeTexture('半額');
const mat20=new THREE.SpriteMaterial({map:tex20,transparent:true});
const mat50=new THREE.SpriteMaterial({map:tex50,transparent:true});
const badgeCoords=[
['meat',-1.05,0.62,-1.78],
['meat',-0.42,0.92,-1.78],
['bento',0.35,0.92,-1.78],
['bento',0.92,0.62,-1.78],
['moyashi',1.36,1.18,-1.78],
];
const badges=badgeCoords.map(([id,x,y,z])=>{
const sp=new THREE.Sprite(mat20);
sp.position.set(x,y,z);
sp.scale.set(0.32,0.32,1);
sp.visible=false;
sp.userData.goodId=id;
scene.add(sp);
pickTargets.push(sp);
return{id,sprite:sp};
});
function syncDiscounts(min){
for(const b of badges){
const d=discount(b.id,min);
if(!d.tag){
b.sprite.visible=false;
}else{
b.sprite.visible=true;
b.sprite.material=d.tag==='半額'?mat50:mat20;
}
}
}
return{
scene,
sun,
pickTargets,
foodCount,
syncDiscounts,
update(){},
};
}
