/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const BENTO={
BELT_LEN:37.2,
ZONE0:20.4,
ZONE1:24.0,
LOOKAHEAD:2.5,
SPEED0:1.5,
SPEED_ADD:0.04,
SPEED_MAX:2.0,
SPAWN_BASE:2.5,
SPAWN_DIST:3.75,
LOCK_GOOD:0.12,
LOCK_BAD:0.25,
};
export const ITEMS={
karaage:{id:'karaage',icon:'🍗',jp:'唐揚げ',vi:'Gà rán'},
sausage:{id:'sausage',icon:'🌭',jp:'ウインナー',vi:'Xúc xích'},
veg:{id:'veg',icon:'🥦',jp:'野菜',vi:'Rau'},
};
export const ITEM_KEYS=['karaage','sausage','veg'];
export const DEFECTS={
hair:{id:'hair',icon:'💇',jp:'異物（髪の毛）',vi:'Có sợi tóc trong khay'},
lid:{id:'lid',icon:'📐',jp:'容器不良',vi:'Khay bị lệch vành'},
norice:{id:'norice',icon:'🍚',jp:'ご飯なし',vi:'Khay thiếu phần cơm'},
};
export const DEFECT_KEYS=['hair','lid','norice'];
function makeTray(st,x,rand){
const i=Math.floor(rand()*ITEM_KEYS.length)%ITEM_KEYS.length;
const j=(i+1+(Math.floor(rand()*2)%2))%ITEM_KEYS.length;
const[minItems,maxItems]=st.multi||[1,1];
const order=[ITEM_KEYS[i]];
if(maxItems>1){
const span=Math.max(0,maxItems-minItems);
const len=minItems+(span>0?Math.floor(rand()*(span+1))%(span+1):0);
for(let k=1;k<len;k++){
const next=ITEM_KEYS[(ITEM_KEYS.indexOf(order[k-1])+1+(Math.floor(rand()*2)%2))%ITEM_KEYS.length];
order.push(next);
}
}
let defect=null;
if(st.defectRate>0){
const roll=rand();
if(!st.lastDefect&&roll<st.defectRate){
defect=DEFECT_KEYS[Math.floor(rand()*DEFECT_KEYS.length)%DEFECT_KEYS.length];
st.lastDefect=true;
}else{
st.lastDefect=false;
}
}
return{
id:++st.seq,
x,
need:order[0],
order,
placed:[],
stepIdx:0,
defect,
other:ITEM_KEYS[j],
done:false,
rejected:false,
missed:false,
penalized:false,
};
}
export const spawnInterval=(speed)=>BENTO.SPAWN_BASE/(speed/BENTO.SPEED0);
export function createBento(opts={},rand=Math.random){
const speed=opts.speed||BENTO.SPEED0;
const multi=Array.isArray(opts.multi)?opts.multi:opts.multi?[1,opts.multi]:[1,1];
const defectRate=typeof opts.defect==='number'?opts.defect:opts.defect?0.125:0;
const st={
goal:opts.goal||8,
maxMiss:opts.maxMiss||0,
speed,
multi,
defectRate,
lastDefect:false,
count:0,
rejected:0,
miss:0,
streak:0,
maxStreak:0,
lock:0,
spawnT:spawnInterval(speed),
over:false,
result:null,
loseWhy:'',
seq:0,
trays:[],
winPending:false,
losePending:false,
};
if(opts.prefill!==false){
for(let x=1.0;x<=BENTO.ZONE0-4.5;x+=BENTO.SPAWN_DIST){
st.trays.push(makeTray(st,x,rand));
}
}
return st;
}
export function activeTray(st){
let best=null;
for(const t of st.trays){
if(!t.done&&!t.missed&&t.x>=BENTO.ZONE0&&t.x<=BENTO.ZONE1){
if(!best||t.x>best.x)best=t;
}
}
return best;
}
function addMiss(st){
st.miss++;
st.streak=0;
st.lock=BENTO.LOCK_BAD;
if(st.maxMiss&&st.miss>st.maxMiss){
st.over=true;
st.result='lose';
st.loseWhy='Sai quá nhiều lần rồi.';
st.losePending=true;
}
}
export function act(st,item){
if(st.over||st.lock>0)return'locked';
const t=activeTray(st);
if(!t)return'early';
if(item==='reject'){
if(t.defect){
t.done=true;
t.rejected=true;
st.rejected++;
st.streak++;
if(st.streak>st.maxStreak)st.maxStreak=st.streak;
st.lock=BENTO.LOCK_GOOD;
return'rejected';
}
t.penalized=true;
addMiss(st);
return'bad_reject';
}
if(t.defect){
t.missed=true;
addMiss(st);
return'bad_defect';
}
const order=t.order||[t.need];
const idx=t.stepIdx||0;
const want=order[idx];
if(want===item){
if(!t.placed)t.placed=[];
t.placed.push(item);
const nextIdx=idx+1;
t.stepIdx=nextIdx;
st.lock=BENTO.LOCK_GOOD;
if(nextIdx<order.length){
t.need=order[nextIdx];
return'step';
}
t.done=true;
st.count++;
st.streak++;
if(st.streak>st.maxStreak)st.maxStreak=st.streak;
st.speed=Math.min(BENTO.SPEED_MAX,Math.round((st.speed+BENTO.SPEED_ADD)*1000)/1000);
if(st.count>=st.goal){
st.over=true;
st.result='win';
st.winPending=true;
}
return'good';
}
t.penalized=true;
addMiss(st);
return'bad';
}
export function step(st,dt,rand=Math.random){
const ev=[];
if(st.winPending){st.winPending=false;ev.push('win');return ev;}
if(st.losePending){st.losePending=false;ev.push('lose');return ev;}
if(st.over)return ev;
if(st.lock>0)st.lock=Math.max(0,st.lock-dt);
const dx=st.speed*dt;
for(const t of st.trays){
t.x+=dx;
if(!t.done&&!t.missed&&t.x>BENTO.ZONE1){
t.missed=true;
if(t.penalized){
ev.push('pass');
}else{
st.miss++;
st.streak=0;
ev.push('miss_pass');
if(st.maxMiss&&st.miss>st.maxMiss&&!st.over){
st.over=true;
st.result='lose';
st.loseWhy='Sai quá nhiều lần rồi.';
ev.push('lose');
}
}
}
}
for(let i=st.trays.length-1;i>=0;i--){
if(st.trays[i].x>BENTO.BELT_LEN)st.trays.splice(i,1);
}
if(!st.over){
st.spawnT-=dt;
while(st.spawnT<=0){
const overshoot=-st.spawnT;
const nt=makeTray(st,overshoot*st.speed,rand);
st.trays.push(nt);
ev.push('spawn');
st.spawnT+=spawnInterval(st.speed);
}
}
return ev;
}
function formatQueueTray(t){
if(!t)return null;
const order=t.order||(t.need?[t.need]:[]);
const placedCount=t.placed?t.placed.length:(t.stepIdx||0);
const def=t.defect?(DEFECTS[t.defect]||{id:t.defect,icon:'🚫',jp:'不良',vi:'Khay lỗi'}):null;
return{
id:t.id,
x:t.x,
defect:t.defect||null,
defectIcon:def?def.icon:null,
isDefect:!!t.defect,
order:[...order],
placed:t.placed?[...t.placed]:order.slice(0,placedCount),
stepIdx:placedCount,
need:t.defect?'reject':(order[placedCount]||null),
items:order.map((id,i)=>({
id,
icon:ITEMS[id]?.icon||'',
done:i<placedCount,
active:!t.defect&&i===placedCount,
})),
};
}
export function queueView(st,n=2){
const cur=activeTray(st);
const upcoming=st.trays
.filter((t)=>!t.done&&!t.missed&&t.x<BENTO.ZONE0)
.sort((a,b)=>b.x-a.x)
.slice(0,n)
.map(formatQueueTray);
return{
cur:formatQueueTray(cur),
next:upcoming,
};
}
export const bentoExtra=(st)=>(st.maxStreak||0)>=5;
export const bentoFraction=(st)=>Math.max(0,Math.min(1,st.count/Math.max(1,st.goal)));
