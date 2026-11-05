/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx}from'./state.js';
import{
TIMETABLE,RIDE,WALKIN,DWELL,DELAY_REASONS,
makeTrainInfo,nextTrain,followingTrain,lastSafeTrain,crowdEffect,delayToday,
}from'./train.js';
export{
TIMETABLE,RIDE,WALKIN,DWELL,DELAY_REASONS,
makeTrainInfo,nextTrain,followingTrain,lastSafeTrain,crowdEffect,delayToday,
};
export const MORNING={
ALARM:6*60+30,
READY:7*60+10,
SNOOZE:10,
BREAKFAST:8,
DRINK:1,
GREET:2,
EARLY:7*60+40,
CHOREI:7*60+45,
MIN_PER_SEC:1,
TRAIN:RIDE,
RIDE,
WALKIN,
DWELL,
TIMETABLE,
DRINK_YEN:130,
};
export function createMorning(opts={}){
const delayInfo=opts&&typeof opts.delay==='object'?opts.delay:null;
const delayMin=delayInfo?(delayInfo.min||0):(typeof opts?.delay==='number'?opts.delay:0);
return{
min:MORNING.ALARM,
phase:'wake',
snoozed:false,
ate:false,
drank:false,
greeted:false,
over:false,
missed:0,
delay:delayMin,
delayReasonJp:delayInfo?.reasonJp||opts?.delayReasonJp||'',
delayReasonVi:delayInfo?.reasonVi||opts?.delayReasonVi||'',
delayCert:false,
trainTaken:null,
boardedDep:null,
boardedSchedDep:null,
crowdKind:null,
useTimetable:!!opts?.useTimetable,
};
}
export function clock(min){
const m=Math.floor(min);
return`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
export function wake(S,st,snooze){
if(st.phase!=='wake')return[];
st.phase='room';
st.snoozed=!!snooze;
st.min=MORNING.READY+(snooze?MORNING.SNOOZE:0);
return snooze?applyFx(S,{mental:2}):[];
}
export function tick(st,dt){
if(st.over||st.phase==='wake'||st.phase==='ride')return;
st.min+=dt*MORNING.MIN_PER_SEC;
}
export function act(S,st,id){
if(st.over||st.phase==='wake')return{ok:false,why:'not-now'};
if(id==='eat'){
if(st.phase!=='room'||st.ate)return{ok:false,why:'done'};
st.ate=true;st.min+=MORNING.BREAKFAST;
return{ok:true,deltas:applyFx(S,{health:3})};
}
if(id==='drink'){
if(st.phase!=='street'||st.drank)return{ok:false,why:'done'};
if(S.money<MORNING.DRINK_YEN)return{ok:false,why:'money'};
st.drank=true;st.min+=MORNING.DRINK;
return{ok:true,deltas:applyFx(S,{money:-MORNING.DRINK_YEN,mental:2})};
}
if(id==='greet'){
if(st.phase!=='street'||st.greeted)return{ok:false,why:'done'};
st.greeted=true;st.min+=MORNING.GREET;
return{ok:true,deltas:applyFx(S,{culture:2,mental:1})};
}
if(id==='cert'){
return takeDelayCert(st);
}
return{ok:false,why:'unknown'};
}
export function leaveRoom(st){if(st.phase==='room')st.phase='street';}
export function toPlatform(st){if(st.phase==='street')st.phase='platform';}
export function takeDelayCert(st){
if(!st)return{ok:false};
st.delayCert=true;
return{ok:true,delayCert:true};
}
export function missTrain(st,dep){
if(!st)return{missed:0,next:null};
const curTrain=(dep&&typeof dep==='object')
?dep
:(typeof dep==='number'?makeTrainInfo(dep,st.delay||0):nextTrain(st.min,st.delay||0));
st.missed=(st.missed||0)+1;
st.min=Math.max(st.min,curTrain.dep+0.05);
const next=nextTrain(st.min,st.delay||0);
return{
missed:st.missed,
missedTrain:curTrain.label,
next,
};
}
export function board(arg1,arg2,arg3){
let st=null;
let S=null;
let trainArg=null;
if(arg1&&typeof arg1==='object'&&'phase'in arg1){
st=arg1;
if(arg2&&typeof arg2==='object'&&'mental'in arg2&&!('dep'in arg2)){
S=arg2;
trainArg=arg3;
}else{
trainArg=arg2;
S=arg3;
}
}else if(arg2&&typeof arg2==='object'&&'phase'in arg2){
S=arg1;
st=arg2;
trainArg=arg3;
}
if(!st||st.phase!=='platform')return{ok:false,deltas:[]};
st.phase='ride';
if(trainArg!==undefined&&trainArg!==null||st.useTimetable){
const tr=(trainArg&&typeof trainArg==='object'&&'dep'in trainArg)
?trainArg
:(typeof trainArg==='number'
?makeTrainInfo(trainArg-(st.delay||0),st.delay||0)
:nextTrain(st.min,st.delay||0));
st.trainTaken=tr.label;
st.boardedDep=tr.dep;
st.boardedSchedDep=tr.schedDep;
st.min=Math.max(st.min,tr.dep)+MORNING.RIDE;
const ce=crowdEffect(tr);
st.crowdKind=ce.kind;
const deltas=(S&&Object.keys(ce.fx).length)?applyFx(S,ce.fx):[];
return{ok:true,train:tr,crowd:ce,deltas};
}
st.min+=MORNING.TRAIN;
return{ok:true,deltas:[]};
}
export function alight(st){if(st.phase==='ride')st.phase='walkin';}
export function arrive(S,st){
st.over=true;
const m=Math.floor(st.min);
const meta={
trainTaken:st.trainTaken||null,
missed:st.missed||0,
delay:st.delay||0,
delayCert:!!st.delayCert,
};
if(m<=MORNING.EARLY)return{kind:'early',min:m,deltas:applyFx(S,{boss:2}),...meta};
if(m<=MORNING.CHOREI)return{kind:'ontime',min:m,deltas:[],...meta};
if(st.delayCert&&(st.delay>0||st.delayedTrain)){
return{
kind:'excused',
min:m,
deltas:[],
managerLine:'遅延証明書ありがとう。',
...meta,
};
}
if(S?.cal){
S.festLog=S.festLog||{};
S.festLog.lastLateDay=((S.cal.year||1)-1)*112+(S.cal.season||0)*28+(S.cal.day||1);
}
return{kind:'late',min:m,deltas:applyFx(S,{boss:-4,mental:-2}),...meta};
}
