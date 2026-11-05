/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import*as SkeletonUtils from'three/addons/utils/SkeletonUtils.js';
import{loadModel}from'./stage.js';
import{gait}from'../core/gait.js';
export const OUTFITS={
hoodie:{g:'m',file:'hero_hoodie',name:'Áo hoodie',desc:'Đi học, làm thêm',bottomLabel:'Màu quần',
ref:{top:[0.095,0.148,0.317],bottom:[0.821,0.733,0.629],skin:[0.988,0.826,0.744],a:[0.97,0.97,0.976],b:[0.02,0.02,0.02]}},
suit:{g:'m',file:'hero_suit',name:'Vest công sở',desc:'Đi làm ở công ty',bottomLabel:'Màu quần',
ref:{top:[0.064,0.083,0.132],bottom:[0.264,0.223,0.232],skin:[0.99,0.834,0.72],a:[0.983,0.975,0.969],b:[0.02,0.02,0.02]}},
f_casual:{g:'f',file:'f_casual',name:'Áo len + váy',desc:'Đi học, làm thêm',bottomLabel:'Màu váy',
ref:{top:[0.964,0.904,0.808],bottom:[0.054,0.075,0.204],skin:[0.979,0.791,0.695],a:[0.994,0.993,0.993],b:[0.02,0.02,0.02]}},
f_office:{g:'f',file:'f_office',name:'Vest công sở',desc:'Đi làm ở công ty',bottomLabel:'Màu váy',
ref:{top:[0.038,0.053,0.129],bottom:[0.445,0.433,0.449],skin:[0.989,0.792,0.661],a:[0.984,0.977,0.974],b:[0.02,0.02,0.02]}},
care_f:{g:'f',file:'care_f',name:'Đồng phục điều dưỡng',uniform:true,
ref:{top:[0.976,0.668,0.702],bottom:[0.97,0.968,0.974],skin:[0.981,0.779,0.667],a:[0.95,0.942,0.947],b:[0.02,0.02,0.02]}},
care_m:{g:'m',file:'care_m',name:'Đồng phục điều dưỡng',uniform:true,
ref:{top:[0.752,0.903,0.838],bottom:[0.961,0.763,0.638],skin:[0.936,0.833,0.743],a:[0.943,0.941,0.946],b:[0.02,0.02,0.02]}},
elder_f:{g:'f',file:'elder_f',name:'Cụ bà',npc:true,
ref:{top:[0.717,0.594,0.796],bottom:[0.291,0.257,0.282],skin:[0.979,0.774,0.694],a:[0.863,0.854,0.866],b:[0.02,0.02,0.02]}},
elder_m:{g:'m',file:'elder_m',name:'Cụ ông',npc:true,
ref:{top:[0.772,0.685,0.582],bottom:[0.433,0.307,0.225],skin:[0.955,0.746,0.656],a:[0.932,0.932,0.94],b:[0.02,0.02,0.02]}},
npc_black:{g:'m',file:'npc_black',name:'Người qua đường',npc:true,fixedColors:true,
ref:{top:[0.807,0.631,0.416],bottom:[0.194,0.19,0.187],skin:[0.904,0.782,0.574],a:[0.596,0.435,0.264],b:[0.02,0.02,0.02]}},
};
export const SWATCH={
top:[null,'#c8423b','#3f8f5a','#d9a43b','#6b6f78','#e59bb0','#f2efe9'],
bottom:[null,'#2b2b30','#3c5a86','#8b8d92','#7a5236','#e8dcc4'],
hair:[null,'#5a3a24','#a8743f','#d8b35a','#e9e2d4','#7a2c2c'],
skin:[null,'#f3c9ad','#e2ad86','#c48a62','#8d5a3b'],
};
const srgb=(a)=>new THREE.Color().setRGB(a[0],a[1],a[2],THREE.SRGBColorSpace);
export const refHex=(kind,slot)=>'#'+srgb(OUTFITS[kind].ref[slot==='hair'?'b':slot]).getHexString(THREE.SRGBColorSpace);
function makeTint(baseMat,ref){
const m=baseMat.clone();
m.vertexColors=false;
const v3=(a)=>new THREE.Vector3(a[0],a[1],a[2]);
const u={
uTop:{value:srgb(ref.top)},uBottom:{value:srgb(ref.bottom)},uSkin:{value:srgb(ref.skin)},uHair:{value:srgb(ref.b)},
rTop:{value:v3(ref.top)},rBottom:{value:v3(ref.bottom)},rSkin:{value:v3(ref.skin)},rA:{value:v3(ref.a)},rB:{value:v3(ref.b)},
rSkinLin:{value:srgb(ref.skin)},
uOn:{value:new THREE.Vector4(0,0,0,0)},
uHideHair:{value:0},
};
m.userData.u=u;
m.onBeforeCompile=(sh)=>{
Object.assign(sh.uniforms,u);
sh.vertexShader='attribute vec4 color;\nvarying vec4 vMask;\n'+
sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  vMask = color;');
sh.fragmentShader='uniform vec3 uTop, uBottom, uSkin, uHair, rTop, rBottom, rSkin, rA, rB, rSkinLin;\nuniform vec4 uOn;\nuniform float uHideHair;\nvarying vec4 vMask;\n'+
sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {
    if (uHideHair > 0.5 && vMask.r > 0.5) discard;
    vec3 lin = sampledDiffuseColor.rgb;
    vec3 t = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
    const vec3 W = vec3(0.2126, 0.7152, 0.0722);
    float lt = dot(lin, W);
    float dT = distance(t, rTop), dB = distance(t, rBottom), dS = distance(t, rSkin), dA = distance(t, rA), dK = distance(t, rB);
    float wT = uOn.y * vMask.g * (1.0 - smoothstep(0.14, 0.26, dT)) * step(dT, min(min(dB, dS), min(dA, dK)) + 0.02);
    float wB = uOn.z * vMask.b * (1.0 - smoothstep(0.14, 0.26, dB)) * step(dB, min(min(dT, dS), min(dA, dK)) + 0.02);
    float wS = uOn.w * vMask.a * (1.0 - smoothstep(0.16, 0.30, dS)) * step(dS, min(min(dT, dB), min(dA, dK)) + 0.04);
    float wH = uOn.x * vMask.r * (1.0 - smoothstep(0.02, 0.06, lt));
    vec3 c = diffuseColor.rgb;
    c = mix(c, uTop * clamp(lt / max(dot(pow(rTop, vec3(2.2)), W), 0.003), 0.55, 1.5), wT);
    c = mix(c, uBottom * clamp(lt / max(dot(pow(rBottom, vec3(2.2)), W), 0.003), 0.55, 1.5), wB);
    c = mix(c, lin * (uSkin / max(rSkinLin, vec3(0.02))), wS);
    c = mix(c, uHair * (0.7 + 6.0 * lt) + vec3(lt * 0.4), wH);
    diffuseColor.rgb = c;
  }`);
};
m.customProgramCacheKey=()=>'tint-v4';
return m;
}
function fixInPlace(clip){
for(const tr of clip.tracks){
if(/Hips\.position$/.test(tr.name)){
const v=tr.values,x0=v[0],z0=v[2];
for(let i=0;i<v.length;i+=3){v[i]=x0;v[i+2]=z0;}
}
}
return clip;
}
const SRC={};
export function ensureSrc(kind){
if(!SRC[kind]){
SRC[kind]=loadModel(OUTFITS[kind].file).then((g)=>({scene:g.scene,clips:g.animations.map(fixInPlace)}));
}
return SRC[kind];
}
export class Character{
constructor(kind,src,shared=[]){
this.kind=kind;
this.root=SkeletonUtils.clone(src.scene);
this.root.traverse((o)=>{
if(o.isSkinnedMesh){o.castShadow=true;o.frustumCulled=false;this.skinGeo=o.geometry;this.tint=o.material=makeTint(o.material,OUTFITS[kind].ref);}
if(/^headfront$/i.test(o.name))this.headFront=o;
if(o.isBone){
const n=o.name.replace(/^mixamorig:?/,'');
if(n==='HeadTop_End')this.headTop=o;
else if(n==='Head')this.head=o;
else if(n==='Spine2')this.chest=o;
else if(n==='Spine')this.spine=o;
else if(n==='Spine1')this.spine1=o;
else if(n==='LeftHand')this.handL=o;
else if(n==='RightHand')this.handR=o;
else if(n==='LeftArm')this.armL=o;
else if(n==='RightArm')this.armR=o;
else if(n==='RightForeArm')this.foreR=o;
else if(n==='LeftForeArm')this.foreL=o;
else if(n==='Hips')this.hips=o;
else if(n==='LeftUpLeg')this.thighL=o;
else if(n==='RightUpLeg')this.thighR=o;
else if(n==='LeftLeg')this.shinL=o;
else if(n==='RightLeg')this.shinR=o;
}
});
this.holder=new THREE.Group();this.holder.add(this.root);
this.mixer=new THREE.AnimationMixer(this.root);
this.acts={};
const clips=[...src.clips,...shared.filter((s)=>!src.clips.some((c)=>c.name===s.name))];
const walk=clips.find((c)=>c.name==='walk');
for(const c of clips)this.acts[c.name]=this.mixer.clipAction(c.name==='idle'&&walk?standClip(walk):c);
if(!this.acts.idle&&walk)this.acts.idle=this.mixer.clipAction(standClip(walk));
for(const a of Object.values(this.acts)){a.play();a.setEffectiveWeight(0);}
this.cur='idle';this.acts.idle.setEffectiveWeight(1);
this.fade=0.25;
this.attach=[];
this.yaw=0;
this.bend=0;this.bendTo=0;
this.reach=0;this.reachTo=0;
this.wristSway=0;this.swayT=0;
this.shoulder=0;this.shoulderTo=0;
this.pickT=-1;this.pickDur=0.35;this.pickItem=null;
this.posed=[this.spine,this.spine1,this.chest,this.armL,this.armR,this.foreL,this.foreR,this.handL,this.handR,this.thighL,this.thighR,this.shinL,this.shinR]
.filter(Boolean).map((b)=>[b,b.quaternion.clone()]);
this.sit=0;
}
play(name,fade=0.25){
if(name==='idle'||name==='talk'){
const a=this.acts[name];
if(a)a.timeScale=1;
}
if(this.cur===name||!this.acts[name])return;
const next=this.acts[name];
if(next.getEffectiveWeight()<0.02)next.time=0;
this.fade=Math.max(0.05,fade);
this.cur=name;
}
moveAt(speed){
const g=gait(speed);
if(g.clip==='idle'&&this.cur==='talk'){
if(this.acts.talk)this.acts.talk.timeScale=1;
return;
}
this.play(g.clip);
const a=this.acts[this.cur];
if(a)a.timeScale=(this.cur==='idle'||this.cur==='talk')?1:g.timeScale;
}
setColor(slot,hex){
const u=this.tint.userData.u,ref=OUTFITS[this.kind].ref;
const key={top:'uTop',bottom:'uBottom',hair:'uHair',skin:'uSkin'}[slot];
if(hex)u[key].value.set(hex);else u[key].value.copy(srgb(slot==='hair'?ref.b:ref[slot]));
u.uOn.value[{hair:'x',top:'y',bottom:'z',skin:'w'}[slot]]=hex?1:0;
}
look(colors){for(const s of['top','bottom','hair','skin'])this.setColor(s,colors[s]||null);}
setHideHair(on){
if(this.tint?.userData?.u?.uHideHair)this.tint.userData.u.uHideHair.value=on?1:0;
}
triggerPick(itemKey='karaage',dur=0.35){
this.pickT=0;
this.pickDur=Math.max(0.15,dur);
this.pickItem=itemKey;
if(this.bentoGear){
this.bentoGear.setFood(itemKey);
this.bentoGear.setPinch(1);
}
}
pin(obj,bone,up=0,side=0,fwd=0,bone2=null){this.holder.parent?.add(obj);this.attach.push({obj,bone,bone2,up,side,fwd});return obj;}
unpinAll(){for(const a of this.attach)a.obj.parent?.remove(a.obj);this.attach.length=0;}
update(dt){
this.holder.rotation.y=this.yaw;
for(const[b,q]of this.posed)b.quaternion.copy(q);
const step=dt/this.fade;
let sum=0;
for(const[n,a]of Object.entries(this.acts)){
const w=a.getEffectiveWeight(),t=n===this.cur?1:0;
const nw=w+Math.max(-step,Math.min(step,t-w));
a.setEffectiveWeight(nw);sum+=nw;
}
if(sum>1e-4&&Math.abs(sum-1)>1e-4)for(const a of Object.values(this.acts))a.setEffectiveWeight(a.getEffectiveWeight()/sum);
this.mixer.update(dt);
for(const[b,q]of this.posed)q.copy(b.quaternion);
this.bend+=(this.bendTo-this.bend)*Math.min(1,dt*12);
if(this.bend>0.01&&this.spine){
_side.set(Math.cos(this.yaw),0,-Math.sin(this.yaw));
this.holder.updateMatrixWorld(true);
tilt(this.spine,_side,this.bend*0.32);
if(this.spine1)tilt(this.spine1,_side,this.bend*0.26);
if(this.chest)tilt(this.chest,_side,this.bend*0.14);
}
if(this.sit>0&&this.thighL){
_side.set(Math.cos(this.yaw),0,-Math.sin(this.yaw));
this.holder.updateMatrixWorld(true);
const k=this.sit*Math.PI/2;
tilt(this.thighL,_side,-k);tilt(this.thighR,_side,-k);
tilt(this.shinL,_side,k);tilt(this.shinR,_side,k);
if(this.foreL)tilt(this.foreL,_side,-0.9*this.sit);
if(this.foreR)tilt(this.foreR,_side,-0.9*this.sit);
}
this.reach+=(this.reachTo-this.reach)*Math.min(1,dt*12);
if(this.reach>0.01){
_side.set(Math.cos(this.yaw),0,-Math.sin(this.yaw));
this.holder.updateMatrixWorld(true);
if(this.armL)tilt(this.armL,_side,-this.reach*0.96);
if(this.armR)tilt(this.armR,_side,-this.reach*0.96);
if(this.foreL)tilt(this.foreL,_side,-this.reach*0.61);
if(this.foreR)tilt(this.foreR,_side,-this.reach*0.61);
}
if(this.wristSway>0.01){
this.swayT+=dt;
const wAngle=Math.sin(this.swayT*Math.PI*4)*0.28*this.wristSway;
this.holder.updateMatrixWorld(true);
if(this.foreL)tilt(this.foreL,_up,wAngle*0.45);
if(this.foreR)tilt(this.foreR,_up,wAngle*0.45);
if(this.handL)tilt(this.handL,_up,wAngle);
if(this.handR)tilt(this.handR,_up,wAngle);
}
this.shoulder+=(this.shoulderTo-this.shoulder)*Math.min(1,dt*10);
if(this.shoulder>0.01&&this.armR&&this.foreR){
_q.setFromAxisAngle(_x,this.shoulder*1.1);this.armR.quaternion.multiply(_q);
_q.setFromAxisAngle(_x,this.shoulder*1.2);this.foreR.quaternion.multiply(_q);
}
if(this.pickT>=0){
this.pickT+=dt/(this.pickDur||0.35);
if(this.pickT>=1){
this.pickT=-1;
if(this.bentoGear){
this.bentoGear.setPinch(0);
this.bentoGear.setFood(null);
}
}else{
const p=this.pickT;
const arc=Math.sin(p*Math.PI);
const panYaw=this.pickItem==='karaage'?0.22:this.pickItem==='veg'?-0.22:0;
const swingSide=p<0.48
?panYaw*Math.sin((p/0.48)*Math.PI*0.5)
:panYaw*Math.cos(((p-0.48)/0.52)*Math.PI*0.5);
const reachExtra=p<0.48
?0.55*Math.sin((p/0.48)*Math.PI*0.5)
:0.55+0.28*Math.sin(((p-0.48)/0.52)*Math.PI);
_side.set(Math.cos(this.yaw),0,-Math.sin(this.yaw));
this.holder.updateMatrixWorld(true);
if(this.spine)tilt(this.spine,_side,arc*0.14);
if(this.armR){
tilt(this.armR,_side,-reachExtra*0.95);
tilt(this.armR,_up,swingSide);
}
if(this.foreR){
tilt(this.foreR,_side,-reachExtra*0.55);
tilt(this.foreR,_up,swingSide*0.6);
}
if(this.bentoGear){
const pinch=p<0.25?p/0.25:p>0.85?(1-p)/0.15:1;
this.bentoGear.setPinch(pinch);
if(p>0.88)this.bentoGear.setFood(null);
}
}
}
if(this.attach.length){
this.holder.updateMatrixWorld(true);
const s=Math.sin(this.yaw),c=Math.cos(this.yaw);
for(const a of this.attach){
if(!a.bone)continue;
a.bone.getWorldPosition(_v);
if(a.bone2){a.bone2.getWorldPosition(_w);_v.add(_w).multiplyScalar(0.5);}
a.obj.position.set(_v.x+c*a.side+s*a.fwd,_v.y+a.up,_v.z-s*a.side+c*a.fwd);
a.obj.rotation.y=this.yaw;
}
}
}
}
const _v=new THREE.Vector3(),_w=new THREE.Vector3(),_q=new THREE.Quaternion(),_x=new THREE.Vector3(1,0,0);
const _side=new THREE.Vector3(),_up=new THREE.Vector3(0,1,0),_a=new THREE.Vector3(),_qp=new THREE.Quaternion();
const _stand=new WeakMap();
function standClip(walk){
if(_stand.has(walk))return _stand.get(walk);
const N=48,tracks=[];
for(const tr of walk.tracks){
const it=tr.createInterpolant(),s=tr.getValueSize(),acc=new Array(s).fill(0);
let ref=null;
for(let i=0;i<N;i++){
const v=it.evaluate(walk.duration*i/N);
if(s===4){
if(!ref)ref=Array.from(v);
const sg=v[0]*ref[0]+v[1]*ref[1]+v[2]*ref[2]+v[3]*ref[3]<0?-1:1;
for(let k=0;k<4;k++)acc[k]+=sg*v[k];
}else for(let k=0;k<s;k++)acc[k]+=v[k];
}
let m=acc.map((x)=>x/N);
if(s===4){const l=Math.hypot(...m)||1;m=m.map((x)=>x/l);}
let times=[0,3],values=[...m,...m];
if(s===4&&/Spine2$/.test(tr.name.split('.')[0])){
const q=new THREE.Quaternion(m[0],m[1],m[2],m[3]).multiply(_q.setFromAxisAngle(_x,0.026));
times=[0,1.5,3];values=[...m,q.x,q.y,q.z,q.w,...m];
}
tracks.push(new tr.constructor(tr.name,times,values));
}
const clip=new THREE.AnimationClip('idle',3,tracks);
_stand.set(walk,clip);
return clip;
}
function tilt(bone,axisW,angle){
bone.parent.getWorldQuaternion(_qp);
_a.copy(axisW).applyQuaternion(_qp.invert()).normalize();
_q.setFromAxisAngle(_a,angle);
bone.quaternion.premultiply(_q);
bone.updateMatrixWorld(true);
}
const _retarget=new Map();
function retarget(kind,src,donor){
if(_retarget.has(kind))return _retarget.get(kind);
const rest=(scene)=>{const m=new Map();scene.traverse((o)=>{if(o.isBone)m.set(o.name,o.quaternion.clone());});return m;};
const rT=rest(src.scene),rD=rest(donor.scene);
const d=new THREE.Quaternion(),q=new THREE.Quaternion();
const clips=donor.clips.map((clip)=>{
const c=clip.clone();
c.tracks=c.tracks.filter((t)=>rT.has(t.name.split('.')[0]));
for(const t of c.tracks){
const[bone,prop]=t.name.split('.');
if(prop!=='quaternion'||!rT.has(bone)||!rD.has(bone))continue;
d.copy(rD.get(bone)).invert().premultiply(rT.get(bone));
const v=t.values;
for(let i=0;i<v.length;i+=4){q.fromArray(v,i).premultiply(d);q.toArray(v,i);}
}
return c;
});
_retarget.set(kind,clips);
return clips;
}
export async function makeCharacter(kind,colors){
const[src,donor]=await Promise.all([ensureSrc(kind),ensureSrc('hoodie')]);
const ch=new Character(kind,src,kind==='hoodie'?[]:retarget(kind,src,donor));
if(colors)ch.look(colors);
return ch;
}
export function makeHelmet(ch,color='#f4f4f0'){
ch.holder.updateMatrixWorld(true);
const a=new THREE.Vector3(),b=new THREE.Vector3();
ch.head.getWorldPosition(a);ch.headTop.getWorldPosition(b);
const h=a.distanceTo(b)||0.55;
const R=h*0.5;
const shell=new THREE.MeshStandardMaterial({color,roughness:0.35,metalness:0.05});
const dark=new THREE.MeshStandardMaterial({color:'#2b2b2b',roughness:0.8});
const g=new THREE.Group();
const pts=[];
for(let i=0;i<=14;i++){const t=i/14,ang=t*Math.PI/2;pts.push(new THREE.Vector2(Math.cos(ang)*R*(1+0.04*(1-t)),Math.sin(ang)*R*0.92));}
const dome=new THREE.Mesh(new THREE.LatheGeometry(pts,32),shell);
dome.scale.set(0.96,1,1.08);
const peakShape=new THREE.Shape();
peakShape.absarc(0,0,R*1.02,Math.PI*0.12,Math.PI*0.88,false);
peakShape.absarc(0,0,R*0.8,Math.PI*0.88,Math.PI*0.12,true);
const peak=new THREE.Mesh(new THREE.ExtrudeGeometry(peakShape,{depth:R*0.05,bevelEnabled:false,curveSegments:16}),shell);
peak.rotation.x=-Math.PI/2+0.18;peak.position.set(0,R*0.04,R*0.32);
const rim=new THREE.Mesh(new THREE.TorusGeometry(R*0.99,R*0.035,6,40),shell);
rim.rotation.x=Math.PI/2;rim.scale.set(0.96,1.08,1);
const ridge=new THREE.Mesh(new THREE.TorusGeometry(R*0.9,R*0.05,6,24,Math.PI),shell);
ridge.rotation.y=Math.PI/2;ridge.scale.set(1.08,1,1);
const strap=new THREE.Mesh(new THREE.TorusGeometry(R*0.98,R*0.018,4,40,Math.PI),dark);
strap.rotation.set(0,Math.PI/2,Math.PI);strap.position.y=-R*0.02;strap.scale.set(1,0.7,1);
const green=new THREE.MeshStandardMaterial({color:'#1f9d55',roughness:0.6});
const crossV=new THREE.Mesh(new THREE.BoxGeometry(R*0.12,R*0.34,R*0.02),green);
const crossH=new THREE.Mesh(new THREE.BoxGeometry(R*0.34,R*0.12,R*0.02),green);
for(const c of[crossV,crossH]){c.position.set(0,R*0.42,R*0.98);c.rotation.x=-0.42;}
g.add(dome,peak,rim,ridge,strap,crossV,crossH);
g.traverse((o)=>{if(o.isMesh)o.castShadow=true;});
return{group:g,h};
}
export function wearHelmet(ch,helmet){
ch.holder.updateMatrixWorld(true);
const top=new THREE.Vector3(),base=new THREE.Vector3();
ch.headTop.getWorldPosition(top);ch.head.getWorldPosition(base);
const h=top.distanceTo(base);
const pos=base.clone().lerp(top,0.64);
const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ch.holder.rotation.y);
const world=new THREE.Matrix4().compose(pos,q,new THREE.Vector3(1,1,1));
const local=ch.head.matrixWorld.clone().invert().multiply(world);
helmet.matrixAutoUpdate=true;
local.decompose(helmet.position,helmet.quaternion,helmet.scale);
ch.head.add(helmet);
void h;
}
export function makeSanitaryCap(ch,color='#f4f6f3'){
ch.holder.updateMatrixWorld(true);
const a=new THREE.Vector3(),b=new THREE.Vector3(),hf=new THREE.Vector3();
ch.head.getWorldPosition(a);ch.headTop.getWorldPosition(b);
if(ch.headFront)ch.headFront.getWorldPosition(hf);else hf.set(a.x,a.y,a.z+0.19);
const h=a.distanceTo(b)||0.52;
const R=h*0.5;
const capOrigin=a.clone().lerp(b,0.64);
let maxFrontZ=Math.max(hf.z+R*0.18,a.z+R*0.96);
let maxEarX=R*1.12;
const posAttr=ch.skinGeo?.attributes?.position;
if(posAttr){
for(let i=0;i<posAttr.count;i++){
const py=posAttr.getY(i),px=posAttr.getX(i),pz=posAttr.getZ(i);
if(py>a.y-0.03&&py<b.y+0.05&&Math.abs(px-a.x)<0.35){
if(pz>maxFrontZ)maxFrontZ=pz;
const ax=Math.abs(px-a.x);
if(ax>maxEarX)maxEarX=ax;
}
}
}
const frontRelZ=(maxFrontZ-capOrigin.z)/R;
const earRelX=maxEarX/R;
const cloth=new THREE.MeshStandardMaterial({color,roughness:0.74,metalness:0.02,side:THREE.DoubleSide});
const seamMat=new THREE.MeshStandardMaterial({color:'#e3e7e3',roughness:0.80,side:THREE.DoubleSide});
const maskMat=new THREE.MeshStandardMaterial({color:'#fbfcfa',roughness:0.70,side:THREE.DoubleSide});
const g=new THREE.Group();
const cy=-0.46*R,cz=-0.02*R;
const rx=Math.max(1.22,earRelX+0.07)*R;
const ry=1.12*R;
const rz=Math.max(1.14,frontRelZ+0.05)*R;
const crown=new THREE.Mesh(
new THREE.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI*0.48),
cloth,
);
crown.scale.set(rx,ry,rz);
crown.position.set(0,cy,cz);
const hoodSides=new THREE.Mesh(
new THREE.SphereGeometry(1,28,16,Math.PI*0.70,Math.PI*1.60,Math.PI*0.40,Math.PI*0.48),
cloth,
);
hoodSides.scale.set(rx*1.01,ry,rz*1.01);
hoodSides.position.set(0,cy,cz);
const cheekGeo=new THREE.CylinderGeometry(R*0.22,R*0.26,R*0.72,12);
const cheekL=new THREE.Mesh(cheekGeo,cloth);
cheekL.scale.set(0.65,1,1.35);
cheekL.position.set(rx*0.68,-0.82*R,(frontRelZ-0.22)*R);
cheekL.rotation.z=0.12;
const cheekR=cheekL.clone();
cheekR.position.x=-rx*0.68;
cheekR.rotation.z=-0.12;
const foreBand=new THREE.Mesh(
new THREE.CylinderGeometry(1,1,R*0.13,24,1,true,-Math.PI*0.34,Math.PI*0.68),
seamMat,
);
foreBand.scale.set(rx*0.99,1,rz*1.01);
foreBand.position.set(0,-0.36*R,cz);
const brimShape=new THREE.Shape();
brimShape.absarc(0,0,R*1.06,Math.PI*0.18,Math.PI*0.82,false);
brimShape.absarc(0,0,R*0.84,Math.PI*0.82,Math.PI*0.18,true);
const brim=new THREE.Mesh(
new THREE.ExtrudeGeometry(brimShape,{depth:R*0.032,bevelEnabled:false,curveSegments:16}),
cloth,
);
brim.rotation.x=-Math.PI/2+0.22;
brim.position.set(0,-0.33*R,(frontRelZ-0.74)*R);
const neckCape=new THREE.Mesh(
new THREE.CylinderGeometry(rx*0.74,rx*0.90,R*0.38,24,1,false),
cloth,
);
neckCape.position.set(0,-1.44*R,-0.06*R);
const fold1=new THREE.Mesh(new THREE.TorusGeometry(1,0.018,6,24,Math.PI),seamMat);
fold1.rotation.y=Math.PI/2;
fold1.scale.set(rz*1.005,ry*1.005,rx);
fold1.position.set(0,cy,cz);
const fold2=new THREE.Mesh(new THREE.TorusGeometry(1,0.016,6,28),seamMat);
fold2.rotation.x=Math.PI/2+0.12;
fold2.scale.set(rx*0.96,rz*0.96,R);
fold2.position.set(0,-0.08*R,cz);
const fold3=new THREE.Mesh(new THREE.TorusGeometry(1,0.016,6,28),seamMat);
fold3.rotation.x=Math.PI/2-0.18;
fold3.scale.set(rx*0.98,rz*0.94,R);
fold3.position.set(0,-0.68*R,cz-0.04*R);
g.add(crown,hoodSides,cheekL,cheekR,foreBand,brim,neckCape,fold1,fold2,fold3);
g.traverse((o)=>{if(o.isMesh)o.castShadow=true;});
const maskGroup=new THREE.Group();
const maskPanel=new THREE.Mesh(
new THREE.CylinderGeometry(R*0.90,R*0.76,R*0.62,24,1,true,-Math.PI*0.30,Math.PI*0.60),
maskMat,
);
maskPanel.position.set(0,0,-R*0.85);
const noseWire=new THREE.Mesh(
new THREE.CylinderGeometry(R*0.908,R*0.908,R*0.045,20,1,true,-Math.PI*0.26,Math.PI*0.52),
seamMat,
);
noseWire.position.set(0,R*0.28,-R*0.85);
for(const py of[0.12,-0.02,-0.16]){
const pleat=new THREE.Mesh(
new THREE.CylinderGeometry(R*0.89,R*0.87,R*0.032,20,1,true,-Math.PI*0.27,Math.PI*0.54),
seamMat,
);
pleat.position.set(0,R*py,-R*0.842);
maskGroup.add(pleat);
}
const strapGeo=new THREE.CylinderGeometry(R*0.016,R*0.016,R*0.54,6);
for(const sx of[-1,1]){
for(const[sy,rotX]of[[0.18,0.24],[-0.16,-0.22]]){
const loop=new THREE.Mesh(strapGeo,maskMat);
loop.rotation.x=Math.PI/2+rotX;
loop.rotation.z=sx*-0.35;
loop.position.set(sx*R*0.78,R*sy,-R*0.52);
maskGroup.add(loop);
}
}
maskGroup.add(maskPanel,noseWire);
maskGroup.traverse((o)=>{if(o.isMesh)o.castShadow=true;});
const maskParent=ch.headFront||ch.head;
if(maskParent){
const maskWorldPos=new THREE.Vector3(a.x,a.y+R*0.22,maxFrontZ+R*0.03);
const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ch.holder.rotation.y);
const maskWorld=new THREE.Matrix4().compose(maskWorldPos,q,new THREE.Vector3(1,1,1));
const maskLocal=maskParent.matrixWorld.clone().invert().multiply(maskWorld);
maskGroup.matrixAutoUpdate=true;
maskLocal.decompose(maskGroup.position,maskGroup.quaternion,maskGroup.scale);
maskParent.add(maskGroup);
}
ch.faceMask=maskGroup;
if(!ch.bentoGear)ch.bentoGear=wearBentoGear(ch);
let _vis=true;
Object.defineProperty(g,'visible',{
configurable:true,
enumerable:true,
get(){return _vis;},
set(v){
_vis=!!v;
maskGroup.visible=_vis;
ch.setHideHair(_vis);
if(ch.bentoGear)ch.bentoGear.setVisible(_vis);
},
});
return{group:g,mask:maskGroup,h};
}
export function wearBentoGear(ch){
ch.holder.updateMatrixWorld(true);
const gloveMat=new THREE.MeshStandardMaterial({color:'#7cc8f5',roughness:0.42,metalness:0.04});
const cuffMat=new THREE.MeshStandardMaterial({color:'#64b5e8',roughness:0.48});
const steelMat=new THREE.MeshStandardMaterial({color:'#dce3e8',metalness:0.85,roughness:0.18});
const parts=[];
for(const[hand,isRight]of[[ch.handL,false],[ch.handR,true]]){
if(!hand)continue;
const g=new THREE.Group();
const wristCuff=new THREE.Mesh(new THREE.CylinderGeometry(0.056,0.060,0.065,12),cuffMat);
wristCuff.position.set(0,0.015,0);
const palm=new THREE.Mesh(new THREE.SphereGeometry(0.068,12,10),gloveMat);
palm.scale.set(0.88,1.32,0.78);
palm.position.set(0,0.085,0);
const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(0.022,0.045,4,8),gloveMat);
thumb.position.set(isRight?0.045:-0.045,0.068,0.025);
thumb.rotation.z=isRight?-0.55:0.55;
g.add(wristCuff,palm,thumb);
g.traverse((o)=>{if(o.isMesh)o.castShadow=true;});
hand.add(g);
parts.push(g);
}
let bladeA=null,bladeB=null;
const foods={};
if(ch.handR){
const tongs=new THREE.Group();
tongs.position.set(0,0.095,0.02);
tongs.rotation.x=0.35;
const hinge=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.026,10),steelMat);
hinge.rotation.z=Math.PI/2;
tongs.add(hinge);
const makeBlade=(sign)=>{
const piv=new THREE.Group();
const arm=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.22,0.018),steelMat);
arm.position.set(sign*0.012,0.11,0);
const tip=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.012,0.036,8),steelMat);
tip.scale.set(0.35,1,1.15);
tip.position.set(sign*0.010,0.215,0);
piv.add(arm,tip);
piv.rotation.z=sign*-0.11;
return piv;
};
bladeA=makeBlade(1);
bladeB=makeBlade(-1);
tongs.add(bladeA,bladeB);
const foodHolder=new THREE.Group();
foodHolder.position.set(0,0.21,0);
const karaageMesh=new THREE.Mesh(
new THREE.DodecahedronGeometry(0.026,0),
new THREE.MeshStandardMaterial({color:'#d98a2e',roughness:0.65}),
);
const sausageMesh=new THREE.Mesh(
new THREE.CapsuleGeometry(0.013,0.032,4,8),
new THREE.MeshStandardMaterial({color:'#c8423a',roughness:0.55}),
);
sausageMesh.rotation.z=Math.PI/2;
const vegMesh=new THREE.Mesh(
new THREE.DodecahedronGeometry(0.025,1),
new THREE.MeshStandardMaterial({color:'#4c9a4a',roughness:0.65}),
);
foods.karaage=karaageMesh;
foods.sausage=sausageMesh;
foods.veg=vegMesh;
for(const m of Object.values(foods)){
m.visible=false;
m.castShadow=true;
foodHolder.add(m);
}
tongs.add(foodHolder);
tongs.traverse((o)=>{if(o.isMesh)o.castShadow=true;});
ch.handR.add(tongs);
parts.push(tongs);
}
return{
parts,
setVisible(v){
const on=!!v;
for(const p of parts)p.visible=on;
if(!on)for(const m of Object.values(foods))m.visible=false;
},
setPinch(k){
const p=Math.max(0,Math.min(1,k));
const ang=0.12-p*0.095;
if(bladeA)bladeA.rotation.z=-ang;
if(bladeB)bladeB.rotation.z=ang;
},
setFood(key){
for(const[k,m]of Object.entries(foods))m.visible=k===key;
},
};
}
export function wearWaders(ch){
ch.holder.updateMatrixWorld(true);
const gloveMat=new THREE.MeshStandardMaterial({color:'#d46b2c',roughness:0.55});
const bibMat=new THREE.MeshStandardMaterial({color:'#3f5a3c',roughness:0.65});
const strapMat=new THREE.MeshStandardMaterial({color:'#243322',roughness:0.7});
const parts=[];
const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ch.holder.rotation.y);
const s1=new THREE.Vector3(1,1,1);
for(const hand of[ch.handL,ch.handR]){
if(!hand)continue;
const g=new THREE.Group();
const mitt=new THREE.Mesh(new THREE.SphereGeometry(0.068,12,10),gloveMat);
mitt.scale.set(0.9,1.15,0.85);
const cuff=new THREE.Mesh(new THREE.CylinderGeometry(0.062,0.058,0.09,12),gloveMat);
cuff.position.y=0.055;
g.add(mitt,cuff);
g.traverse((o)=>{if(o.isMesh)o.castShadow=true;});
const pos=new THREE.Vector3();
hand.getWorldPosition(pos);
const local=hand.matrixWorld.clone().invert().multiply(new THREE.Matrix4().compose(pos,q,s1));
local.decompose(g.position,g.quaternion,g.scale);
hand.add(g);
parts.push(g);
}
const spineBone=ch.chest||ch.spine1||ch.spine;
if(spineBone){
const bib=new THREE.Group();
const front=new THREE.Mesh(new THREE.BoxGeometry(0.29,0.28,0.04),bibMat);
front.position.set(0,-0.02,0.13);
const sL=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.24,0.03),strapMat);
sL.position.set(-0.09,0.14,0.11);
const sR=sL.clone();
sR.position.x=0.09;
bib.add(front,sL,sR);
bib.traverse((o)=>{if(o.isMesh)o.castShadow=true;});
const pos=new THREE.Vector3();
spineBone.getWorldPosition(pos);
const local=spineBone.matrixWorld.clone().invert().multiply(new THREE.Matrix4().compose(pos,q,s1));
local.decompose(bib.position,bib.quaternion,bib.scale);
spineBone.add(bib);
parts.push(bib);
}
return{
parts,
setVisible(v){for(const p of parts)p.visible=!!v;},
};
}
