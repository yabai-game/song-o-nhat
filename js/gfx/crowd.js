/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{makeCharacter}from'./chars.js';
import{STATION}from'./station.js';
import{LOW_MEM}from'./stage.js';
import{CROWD,KINDS,rng,pickLooks,makeWalker,stepWalker,turnYaw}from'../core/crowd.js';
import{charStepInterval,shouldCullByFog}from'../core/perf.js';
export const STREET_LANES=[
{z:23.1,x0:-30,x1:8.5},
{z:27.6,x0:-30,x1:8.5},
];
const WAIT_X=[3,8,10.5];
const WAIT_Z=4.2;
const DOORS_X=[3.5,6.5,9.5];
const DOOR_Z=5.6;
function nearestX(x,list){
let best=list[0],bestD=Math.abs(x-best);
for(let i=1;i<list.length;i++){
const d=Math.abs(x-list[i]);
if(d<bestD){best=list[i];bestD=d;}
}
return best;
}
export class Crowd{
constructor(scene,{mode='street',stage=null,seed=331}={}){
this.scene=scene;
this.stage=stage;
this.mode=mode;
this.rand=rng(seed);
this.items=[];
this.visible=true;
this.frame=0;
}
async spawnStreet(lanes=STREET_LANES,perLane=3){
if(this.items.length)return this;
const total=lanes.length*perLane;
const looks=pickLooks(total,this.rand,KINDS);
const chars=await Promise.all(looks.map((l)=>makeCharacter(l.kind,l.colors)));
let k=0;
for(const lane of lanes){
for(let i=0;i<perLane;i++){
const ch=chars[k++];
if(LOW_MEM)ch.setCastShadow(false);
const w=makeWalker(lane,this.rand);
ch.holder.position.set(w.x,0,w.z);
ch.yaw=w.yaw;
ch.moveAt(w.speed);
ch.holder.visible=this.visible;
this.scene.add(ch.holder);
this.items.push({ch,w,lane,animDt:0});
}
}
return this;
}
async spawnStation(){
if(this.items.length)return this;
this.mode='station';
const looks=pickLooks(WAIT_X.length,this.rand,KINDS);
const chars=await Promise.all(looks.map((l)=>makeCharacter(l.kind,l.colors)));
for(let i=0;i<WAIT_X.length;i++){
const ch=chars[i],x0=WAIT_X[i],tx=nearestX(x0,DOORS_X);
if(LOW_MEM)ch.setCastShadow(false);
this.scene.add(ch.holder);
this.items.push({ch,x0,z0:WAIT_Z,tx,tz:DOOR_Z,wait:i*0.35,boarding:false,boarded:false,animDt:0});
}
this.reset();
return this;
}
reset(){
if(this.mode!=='station')return;
for(let i=0;i<this.items.length;i++){
const p=this.items[i];
p.ch.holder.position.set(p.x0,STATION.floor,p.z0);
p.ch.yaw=0;
p.ch.moveAt(0);
p.wait=i*0.35;
p.boarding=false;
p.boarded=false;
p.animDt=0;
p.ch.holder.visible=this.visible;
}
}
setVisible(on){
if(this.visible===on&&this.mode!=='station')return;
this.visible=on;
for(let i=0;i<this.items.length;i++){
const p=this.items[i];
p.ch.holder.visible=this.mode==='station'?(on&&!p.boarded):on;
}
}
update(dt,playerPos=null){
if(!this.visible)return;
this.frame=(this.frame+1)|0;
if(this.mode==='station'){
const st=this.stage?this.stage.trainState():'away';
for(let i=0;i<this.items.length;i++){
const p=this.items[i];
if(p.boarded)continue;
if(st==='out'){
p.boarded=true;
p.ch.holder.visible=false;
continue;
}
const pos=p.ch.holder.position;
if(st==='stopped'||p.boarding){
p.boarding=true;
if(p.wait>0){
p.wait-=dt;
p.ch.yaw=turnYaw(p.ch.yaw,0,dt,CROWD.TURN_RATE).yaw;
p.ch.moveAt(0);
}else{
const ox=pos.x,oz=pos.z;
const dx=p.tx-pos.x,dz=p.tz-pos.z,d=Math.hypot(dx,dz);
const step=CROWD.WALK*dt;
if(d<=step||d<0.08){
pos.x=p.tx;pos.z=p.tz;
p.boarded=true;
p.ch.holder.visible=false;
continue;
}
pos.x+=(dx/d)*step;
pos.z+=(dz/d)*step;
p.ch.yaw=turnYaw(p.ch.yaw,Math.atan2(dx,dz),dt,CROWD.TURN_RATE).yaw;
const speed=dt>0?Math.hypot(pos.x-ox,pos.z-oz)/dt:0;
p.ch.moveAt(speed);
}
}else{
p.ch.yaw=turnYaw(p.ch.yaw,0,dt,CROWD.TURN_RATE).yaw;
p.ch.moveAt(0);
}
p.animDt+=dt;
const distSq=playerPos?(pos.x-playerPos.x)**2+(pos.z-playerPos.z)**2:0;
const interval=playerPos?charStepInterval(distSq,LOW_MEM):(LOW_MEM?2:1);
if((this.frame+i)%interval===0){
p.ch.update(p.animDt);
p.animDt=0;
}else{
p.ch.holder.rotation.y=p.ch.yaw;
}
}
return;
}
for(let i=0;i<this.items.length;i++){
const p=this.items[i];
const ox=p.w.x;
const state=stepWalker(p.w,dt,this.rand,p.lane,playerPos);
p.ch.holder.position.x=p.w.x;
p.ch.holder.position.z=p.w.z;
p.ch.yaw=p.w.yaw!==undefined?p.w.yaw:p.w.dir*(Math.PI/2);
const speed=state==='walk'&&dt>0?Math.abs(p.w.x-ox)/dt:0;
p.ch.moveAt(speed);
const distSq=playerPos?(p.w.x-playerPos.x)**2+(p.w.z-playerPos.z)**2:0;
if(playerPos&&shouldCullByFog(distSq,36)){
p.ch.holder.visible=false;
p.animDt=0;
continue;
}
p.ch.holder.visible=true;
p.animDt+=dt;
const interval=playerPos?charStepInterval(distSq,LOW_MEM):(LOW_MEM?2:1);
if((this.frame+i)%interval===0){
p.ch.update(p.animDt);
p.animDt=0;
}else{
p.ch.holder.rotation.y=p.ch.yaw;
}
}
}
}
