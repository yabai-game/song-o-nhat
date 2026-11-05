/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{turnYaw}from'./gait.js';
export{turnYaw};
export const CROWD={
WALK:1.25,
WALK_VAR:0.25,
PAUSE_MIN:1,
PAUSE_MAX:3,
PAUSE_CHANCE:0.2,
AVOID:0.9,
TURN_RATE:6,
};
export const KINDS=['hoodie','suit','f_casual','f_office','elder_m','elder_f','npc_black'];
export const FIXED_KINDS=['npc_black'];
export const TOPS=[
'#3c5a86','#2e5a44','#a0605f','#6b8f9e',
'#8a7a4f','#6d6a9a','#7a5236','#d9a43b',
'#6b6f78','#e59bb0','#f2efe9','#c8423b',
];
export const BOTTOMS=[
'#2b2b30','#3c5a86','#5d6168','#7a5236',
'#8b8d92','#e8dcc4','#3a342e','#263849',
];
export const HAIR=[
'#2a2420','#3a2a20','#5a3a24','#a8743f',
'#d8b35a','#e9e2d4','#7a2c2c','#4a4542',
];
export const SKIN=[
'#f6d5bc','#f3c9ad','#ebc09d','#e2ad86',
'#d49b72','#c48a62','#8d5a3b',
];
export function rng(seed){
let s=seed|0;
return()=>{
s=(s+0x6d2b79f5)|0;
let t=Math.imul(s^(s>>>15),1|s);
t=(t+Math.imul(t^(t>>>7),61|t))^t;
return((t^(t>>>14))>>>0)/4294967296;
};
}
function pickFrom(arr,rand,avoid){
const pool=avoid!==undefined&&arr.length>1?arr.filter((x)=>x!==avoid):arr;
const i=Math.min(pool.length-1,Math.max(0,Math.floor(rand()*pool.length)));
return pool[i];
}
export function pickLooks(n,rand=Math.random,kinds=KINDS){
const out=[];
let prevKind,prevTop;
for(let i=0;i<n;i++){
const kind=pickFrom(kinds,rand,prevKind);
if(FIXED_KINDS.includes(kind)){
out.push({kind,colors:{}});
prevKind=kind;
prevTop=undefined;
}else{
const top=pickFrom(TOPS,rand,prevTop);
const bottom=pickFrom(BOTTOMS,rand);
const hair=pickFrom(HAIR,rand);
const skin=pickFrom(SKIN,rand);
out.push({kind,colors:{top,bottom,hair,skin}});
prevKind=kind;
prevTop=top;
}
}
return out;
}
export function makeWalker(lane,rand=Math.random){
const x=lane.x0+rand()*(lane.x1-lane.x0);
const dir=rand()<0.5?-1:1;
const speed=CROWD.WALK+(rand()*2-1)*CROWD.WALK_VAR;
return{x,z:lane.z,dir,yaw:dir*(Math.PI/2),speed,pause:0};
}
export function stepWalker(w,dt,rand=Math.random,lane,player=null){
if(lane){
if(w.x<lane.x0)w.x=lane.x0;
else if(w.x>lane.x1)w.x=lane.x1;
if(lane.z!==undefined)w.z=lane.z;
}
if(w.yaw!==undefined){
const targetYaw=w.dir*(Math.PI/2);
const t=turnYaw(w.yaw,targetYaw,dt,CROWD.TURN_RATE);
if(t.turning||Math.abs(t.yaw-w.yaw)>1e-6){
w.yaw=t.yaw;
if(w.pause>0)w.pause=Math.max(0,w.pause-dt);
return'idle';
}
w.yaw=targetYaw;
}
if(player&&Math.hypot(w.x-player.x,w.z-player.z)<CROWD.AVOID){
w.pause=Math.max(w.pause,0.3);
return'idle';
}
if(w.pause>0){
if(dt<=w.pause){
w.pause-=dt;
return'idle';
}
dt-=w.pause;
w.pause=0;
}
let nx=w.x+w.dir*w.speed*dt;
if(player){
const dz=Math.abs(w.z-player.z);
if(dz<CROWD.AVOID){
const half=Math.sqrt(CROWD.AVOID*CROWD.AVOID-dz*dz);
if(w.dir>0&&w.x<=player.x&&nx>player.x-half){
w.x=Math.max(lane.x0,Math.min(lane.x1,player.x-half));
w.pause=0.3;
return'idle';
}
if(w.dir<0&&w.x>=player.x&&nx<player.x+half){
w.x=Math.max(lane.x0,Math.min(lane.x1,player.x+half));
w.pause=0.3;
return'idle';
}
}
}
if(nx<=lane.x0){
w.x=lane.x0;
w.dir=1;
if(rand()<CROWD.PAUSE_CHANCE){
w.pause=CROWD.PAUSE_MIN+rand()*(CROWD.PAUSE_MAX-CROWD.PAUSE_MIN);
return'idle';
}
return w.yaw!==undefined?'idle':'walk';
}
if(nx>=lane.x1){
w.x=lane.x1;
w.dir=-1;
if(rand()<CROWD.PAUSE_CHANCE){
w.pause=CROWD.PAUSE_MIN+rand()*(CROWD.PAUSE_MAX-CROWD.PAUSE_MIN);
return'idle';
}
return w.yaw!==undefined?'idle':'walk';
}
w.x=nx;
return'walk';
}
