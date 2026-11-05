/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const PIPE_KINDS={
short:{
id:'short',slot:'A',icon:'🔵',jp:'短',vi:'ngắn',
label:'🔵 短 (ngắn)',ticketText:'🔵 短 (ngắn) → ô A',
color:'#2f80ed',len:2.2,
stack:{x:-8.3,z:-1.35},
rack:{x:8.3,z:-1.35},
},
med:{
id:'med',slot:'B',icon:'🟡',jp:'中',vi:'vừa',
label:'🟡 中 (vừa)',ticketText:'🟡 中 (vừa) → ô B',
color:'#f2c230',len:2.7,
stack:{x:-8.3,z:0.45},
rack:{x:8.3,z:0.45},
},
long:{
id:'long',slot:'C',icon:'🔴',jp:'長',vi:'dài',
label:'🔴 長 (dài)',ticketText:'🔴 長 (dài) → ô C',
color:'#e2574c',len:3.3,
stack:{x:-8.3,z:2.15},
rack:{x:8.3,z:2.15},
},
};
export const PIPE_ORDER=['short','med','long'];
export const SITE={
STACK:{x:-8.3,z:-0.4},
RACK:{x:8.3,z:-0.2},
REACH:2.7,
SLOT_REACH:1.55,
HOLD_TIME:0.6,
DRIFT0:0.35,
BAL_GUST_MUL:1.6,
BAL_RUN_MUL:1.4,
BAL_RECOVER:0.55,
BAL_STEP:0.34,
GUST_FIRST:7,GUST_MIN:6,GUST_RANGE:4,GUST_LEN:2,GUST_GRACE:0.5,
WALK:3.4,RUN_MUL:1.7,
WIN_DELAY:0.5,
};
function makeTicket(pipeKinds,rng,prevKind=null){
const n=Math.max(1,Math.min(3,pipeKinds||1));
const pool=PIPE_ORDER.slice(0,n);
let k=pool[Math.floor(rng()*pool.length)%pool.length];
if(n>1&&k===prevKind&&rng()<0.65){
k=pool[(pool.indexOf(k)+1)%pool.length];
}
const info=PIPE_KINDS[k];
return{kind:info.id,slot:info.slot,icon:info.icon,jp:info.jp,vi:info.vi,text:info.ticketText,color:info.color};
}
export function createShift(opts={},rng=Math.random){
const pipeKinds=Math.max(1,Math.min(3,opts.pipeKinds||1));
const drift=opts.drift!==undefined?opts.drift:SITE.DRIFT0;
const ticket=makeTicket(pipeKinds,rng);
const initDir=rng()<0.5?-1:1;
return{
goal:opts.goal||2,
limit:opts.limit||0,
maxMiss:opts.maxMiss||0,
wind:!!opts.wind,
pipeKinds,
drift,
ticket,
carryKind:null,
time:opts.limit||0,
elapsed:0,
count:0,
miss:0,
drops:0,
carry:false,
run:false,
bal:0,
balDir:initDir||1,
balSwitchT:0.9,
gustT:SITE.GUST_FIRST,
gust:0,
busy:0,
busyDo:null,
over:null,
winT:0,
rng,
};
}
const dist=(a,x,z)=>Math.hypot(a.x-x,a.z-z);
export function nearestStackKind(x,z,pipeKinds=3,maxDist=SITE.REACH){
const n=Math.max(1,Math.min(3,pipeKinds||3));
let best=null,bestD=maxDist;
for(let i=0;i<n;i++){
const k=PIPE_ORDER[i];
const d=dist(PIPE_KINDS[k].stack,x,z);
if(d<=bestD){bestD=d;best=k;}
}
return best;
}
export function nearestRackSlot(x,z,pipeKinds=3,maxDist=SITE.REACH){
const n=Math.max(1,Math.min(3,pipeKinds||3));
let best=null,bestD=maxDist;
for(let i=0;i<n;i++){
const k=PIPE_ORDER[i];
const d=dist(PIPE_KINDS[k].rack,x,z);
if(d<=bestD){bestD=d;best=PIPE_KINDS[k].slot;}
}
return best;
}
export const nearStack=(x,z)=>dist(SITE.STACK,x,z)<=SITE.REACH||nearestStackKind(x,z,3,SITE.REACH)!==null;
export const nearRack=(x,z)=>dist(SITE.RACK,x,z)<=SITE.REACH||nearestRackSlot(x,z,3,SITE.REACH)!==null;
export const speedOf=(st,walkMul=1)=>SITE.WALK*walkMul*(st.run?SITE.RUN_MUL:1);
function miss(st,ev){
st.miss++;
ev.push('miss');
if(st.maxMiss&&st.miss>st.maxMiss){
st.over='lose';
st.result='lose';
st.loseWhy='Sai quá nhiều lần rồi.';
ev.push('lose');
}
}
function drop(st,ev,why){
st.carry=false;
st.carryKind=null;
st.bal=0;
st.drops++;
ev.push(why);
miss(st,ev);
}
export function nudgeBalance(st,dir){
if(!st||!st.carry||st.over)return st?st.bal:0;
const s=Math.sign(dir);
if(!s)return st.bal;
st.bal=Math.max(-0.98,Math.min(0.98,st.bal+s*SITE.BAL_STEP));
return st.bal;
}
export function hold(st,x,z,choice=null){
if(st.over||st.busy>0)return'busy';
if(!st.carry){
let kind=choice;
if(!kind){
if(st.pipeKinds<=1){
if(!nearStack(x,z))return'far-stack';
kind=st.ticket.kind;
}else{
kind=nearestStackKind(x,z,st.pipeKinds,SITE.REACH);
if(!kind)return'far-stack';
}
}
if(kind!==st.ticket.kind){
miss(st,[]);
return'wrong-kind';
}
st.carryKind=kind;
st.busy=SITE.HOLD_TIME;
st.busyDo='pick';
return'bend';
}
let slot=choice;
if(!slot){
if(st.pipeKinds<=1){
if(!nearRack(x,z))return'far-rack';
slot=st.ticket.slot;
}else{
slot=nearestRackSlot(x,z,st.pipeKinds,SITE.REACH);
if(!slot)return'far-rack';
}
}
if(slot!==st.ticket.slot){
miss(st,[]);
return'wrong-slot';
}
st.busy=SITE.HOLD_TIME;
st.busyDo='place';
return'bend';
}
export function toggleRun(st){
if(!st.over)st.run=!st.run;
return st.run;
}
export function step(st,dt,moving){
const ev=[];
if(st.over==='lose'||st.over==='won')return ev;
if(st.over==='win'){
st.winT-=dt;
if(st.winT<=0){st.over='won';ev.push('win');}
return ev;
}
st.elapsed+=dt;
if(st.busy>0){
st.busy-=dt;
if(st.busy<=0){
st.busy=0;
if(st.busyDo==='pick'){
st.carry=true;
st.bal=0;
st.balDir=st.rng()<0.5?-1:1;
st.balSwitchT=0.8+st.rng()*0.8;
ev.push('pick');
}else if(st.busyDo==='place'){
st.carry=false;
st.carryKind=null;
st.bal=0;
st.count++;
ev.push('place');
if(st.count>=st.goal){
st.over='win';
st.result='win';
st.winT=SITE.WIN_DELAY;
}else{
st.ticket=makeTicket(st.pipeKinds,st.rng,st.ticket.kind);
}
}
st.busyDo=null;
}
}
if(st.wind&&!st.over){
if(st.gust>0){
st.gust-=dt;
if(st.gust<=0){
st.gust=0;
ev.push('gust-end');
}else if(st.carry&&moving&&st.gust<SITE.GUST_LEN-SITE.GUST_GRACE){
st.gust=0;
ev.push('gust-end');
drop(st,ev,'drop-gust');
}
}else{
st.gustT-=dt;
if(st.gustT<=0){
st.gustT=SITE.GUST_MIN+st.rng()*SITE.GUST_RANGE;
st.gust=SITE.GUST_LEN;
ev.push('gust-start');
}
}
}
if(st.carry&&!st.over&&st.busy<=0){
if(moving){
st.balSwitchT-=dt;
if(st.balSwitchT<=0){
const nextDir=st.rng()<0.5?-1:1;
st.balDir=Math.abs(st.bal)>0.25?Math.sign(st.bal):(nextDir||1);
st.balSwitchT=0.8+st.rng()*0.8;
}
const rate=(st.drift||SITE.DRIFT0)*(st.gust>0?SITE.BAL_GUST_MUL:1)*(st.run?SITE.BAL_RUN_MUL:1);
st.bal+=(st.balDir||1)*rate*dt;
if(Math.abs(st.bal)>=1){
st.run=false;
drop(st,ev,'drop-balance');
}
}else{
const rec=SITE.BAL_RECOVER*dt;
if(st.bal>0)st.bal=Math.max(0,st.bal-rec);
else if(st.bal<0)st.bal=Math.min(0,st.bal+rec);
}
}
if(st.limit&&!st.over){
const before=st.time;
st.time=Math.max(0,st.time-dt);
if(before>10&&st.time<=10)ev.push('warn10');
if(st.time<=0){
st.over='lose';
st.result='lose';
st.loseWhy='Hết giờ!';
ev.push('lose');
}
}
return ev;
}
export const siteExtra=(st)=>(st.drops||0)===0;
export const fraction=(st)=>Math.max(0,Math.min(1,st.count/st.goal));
