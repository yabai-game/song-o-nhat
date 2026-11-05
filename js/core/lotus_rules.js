/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const LOTUS={
GROUND_Y:-0.14,
REACH:2.3,
HIDE_CAM_DIST:3.2,
WALK:1.8,
WASH_MIN:0.80,
WASH_OVER:1.6,
PREVIEW_SEC:2.0,
PREVIEW_TIME:2.0,
BOUNDS:{x0:-10.5,x1:10.5,z0:-3.8,z1:5.2},
SPOTS:[
[-2.2,2],
[2.4,2.2],
[-6,4.2],
[6.4,3.4],
[-1,-1.6],
[4,-1.8],
[-5.2,-2],
[8.6,-0.5],
],
};
export const STEPS={
cut:{id:'cut',icon:'✂️',label:'Cắt cỏ',jp:'刈る',tipJp:'刈る (karu)',vi:'Cắt cỏ dại quanh gốc sen',time:0.6},
dig:{id:'dig',icon:'⛏️',label:'Đào',jp:'掘る',tipJp:'掘る (horu)',vi:'Đào lớp bùn phía trên',time:0.8},
wash:{id:'wash',icon:'💦',label:'Xịt nước',jp:'洗う',tipJp:'洗う (arau)',vi:'Nhấn giữ để xịt sạch bùn (thả ở 80–100%)',time:1.1},
pull:{id:'pull',icon:'🪴',label:'Nhổ',jp:'抜く',tipJp:'抜く (nuku)',vi:'Canh kim vào vùng xanh để nhổ củ sen',time:0},
collect:{id:'collect',icon:'🧺',label:'Nhặt',jp:'拾う',tipJp:'拾う (hirou)',vi:'Nhặt củ sen vào giỏ',time:0.5},
};
export const STEP_KEYS=['dig','wash','pull','collect'];
export const ALL_STEP_KEYS=['cut','dig','wash','pull','collect'];
export function wantStepOf(sp){
if(!sp||sp.state>=4)return null;
return sp.state<0?'cut':STEP_KEYS[sp.state];
}
export const nextStepId=wantStepOf;
export function spotOrderText(sp){
return sp&&sp.weedy
?'🌿 刈る → 掘る → 洗う → 抜く → 拾う'
:'掘る → 洗う → 抜く → 拾う';
}
export function createLotus(opts={},rng=Math.random){
const goal=opts.goal||2;
const limit=opts.limit||0;
const weeds=!!opts.weeds;
const pullPeriod=opts.pullPeriod||1.2;
const pullZone=opts.pullZone||0.35;
const weedySet=new Set();
if(weeds){
const nWeeds=Math.max(2,Math.round(LOTUS.SPOTS.length/3));
const indices=LOTUS.SPOTS.map((_,i)=>i);
for(let k=0;k<nWeeds&&indices.length>0;k++){
const pick=Math.floor(rng()*indices.length)%indices.length;
weedySet.add(indices.splice(pick,1)[0]);
}
}
return{
goal,
limit,
maxMiss:opts.maxMiss||0,
walk:opts.walk||1,
rain:!!opts.rain,
weeds,
pullPeriod,
pullZone,
pullTime:0,
washing:null,
washProg:0,
washHold:0,
washSpot:-1,
broken:0,
bruised:0,
time:limit,
count:0,
miss:0,
busy:0,
busyStep:null,
busySpot:-1,
over:false,
result:null,
loseWhy:'',
warned:false,
spots:LOTUS.SPOTS.map(([x,z],id)=>{
const weedy=weedySet.has(id);
return{id,i:id,x,z,weedy,weeds:weedy,state:weedy?-1:0,broken:false,bruised:false,seenT:0};
}),
};
}
export function pullNeedle(st){
const p=st.pullPeriod||1.2;
return 0.5+0.5*Math.sin(((st.pullTime||0)/p)*Math.PI*2);
}
export function inPullZone(st,val=pullNeedle(st)){
const half=(st.pullZone||0.35)/2;
return Math.abs(val-0.5)<=half+1e-6;
}
export function nearestSpot(st,x,z,maxDist=LOTUS.REACH){
let best=null,bestD=Infinity;
for(const sp of st.spots){
if(sp.state>=4)continue;
const d=Math.hypot(sp.x-x,sp.z-z);
if(d<=maxDist&&d<bestD){best=sp;bestD=d;}
}
return best;
}
function addMiss(st,ev=null){
st.miss++;
if(st.maxMiss&&st.miss>st.maxMiss&&!st.over){
st.over=true;
st.result='lose';
st.loseWhy='Sai quá nhiều lần rồi.';
if(ev)ev.push('lose');
}
}
function ensureEnoughSpots(st,brokenId){
const remaining=st.spots.filter((s)=>s.state<4).length;
const needed=st.goal-st.count;
if(remaining<needed){
const candidate=st.spots.find((s)=>s.state>=4&&s.id!==brokenId)||st.spots[brokenId];
if(candidate){
candidate.broken=false;
candidate.bruised=false;
candidate.state=candidate.weedy?-1:0;
candidate.seenT=0;
}
}
}
export function startWash(st,x,z){
if(st.over||st.busy>0||st.washing)return'busy';
const sp=nearestSpot(st,x,z,LOTUS.REACH);
if(!sp)return'far';
if(wantStepOf(sp)!=='wash'){
addMiss(st);
return'bad';
}
st.washing={spotId:sp.id,fill:0,overTime:0};
st.washProg=0;
st.washHold=0;
st.washSpot=sp.id;
return'washing';
}
export function endWash(st){
if(!st.washing)return'none';
const w=st.washing;
const sp=st.spots[w.spotId];
st.washing=null;
st.washProg=0;
st.washHold=0;
st.washSpot=-1;
if(w.fill<LOTUS.WASH_MIN-1e-6){
return'short';
}
if(sp&&sp.state===1){
sp.state=2;
st.pullTime=0;
}
return'good';
}
export function act(st,id,x,z,param=undefined){
if(st.over||st.busy>0||st.washing||!STEPS[id])return'busy';
const sp=nearestSpot(st,x,z,LOTUS.REACH);
if(!sp)return'far';
const wantKey=wantStepOf(sp);
if(id!==wantKey){
addMiss(st);
return'bad';
}
if(id==='wash'&&typeof param==='number'){
startWash(st,x,z);
const ev=step(st,param);
if(ev.includes('overwash'))return'bruised';
return endWash(st);
}
if(id==='pull'){
const posVal=typeof param==='number'?param:pullNeedle(st);
if(!inPullZone(st,posVal)){
st.broken++;
sp.broken=true;
sp.state=4;
addMiss(st);
if(!st.over)ensureEnoughSpots(st,sp.id);
return'broken';
}
sp.state=3;
return'good';
}
const stepDef=STEPS[id];
if(stepDef.time>0){
st.busy=stepDef.time;
st.busyStep=id;
st.busySpot=sp.id;
}
sp.state++;
if(sp.state===2)st.pullTime=0;
if(sp.state>=4){
st.count++;
if(st.count>=st.goal){
st.over=true;
st.result='win';
}
}
return'good';
}
export function step(st,dt,px=null,pz=null){
const ev=[];
const wasBusy=st.busy>0;
if(st.busy>0){
st.busy=Math.max(0,st.busy-dt);
if(st.busy===0){
if(st.busyStep==='wash')st.pullTime=0;
st.busyStep=null;
st.busySpot=-1;
ev.push('ready');
}
}else if(!st.washing&&dt>0){
st.pullTime=(st.pullTime||0)+dt;
}
if(st.over||dt<=0)return ev;
if(st.washing&&!wasBusy){
const w=st.washing;
const washTime=STEPS.wash.time||1.1;
if(w.fill<1){
const remSec=(1-w.fill)*washTime;
if(dt<=remSec){
w.fill+=dt/washTime;
}else{
w.fill=1;
w.overTime+=dt-remSec;
}
}else{
w.overTime+=dt;
}
st.washProg=w.fill;
st.washHold=w.overTime;
if(w.overTime>LOTUS.WASH_OVER){
const sp=st.spots[w.spotId];
st.washing=null;
st.washProg=0;
st.washHold=0;
st.washSpot=-1;
if(sp&&sp.state===1){
sp.state=2;
sp.bruised=true;
st.pullTime=0;
}
st.bruised=(st.bruised||0)+1;
ev.push('overwash');
addMiss(st,ev);
}
}
let x=null,z=null;
if(typeof px==='number'&&typeof pz==='number'){x=px;z=pz;}
else if(px&&typeof px.x==='number'){x=px.x;z=px.z;}
if(x!==null&&z!==null){
const near=nearestSpot(st,x,z,LOTUS.REACH);
if(near)near.seenT=(near.seenT||0)+dt;
}
if(st.limit>0&&!st.over){
st.time-=dt;
if(st.time<=10&&!st.warned){
st.warned=true;
ev.push('warn10');
}
if(st.time<=0){
st.time=0;
st.over=true;
st.result='lose';
st.loseWhy='Hết giờ!';
ev.push('lose');
}
}
return ev;
}
export const lotusExtra=(st)=>(st.broken||0)===0;
export function lotusFraction(st){
return Math.min(1,st.count/Math.max(1,st.goal));
}
