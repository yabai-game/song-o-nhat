/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx}from'./state.js';
import{weekday,isRedDay}from'./calendar.js';
export const ILLNESSES={
kaze:{
id:'kaze',
jp:'風邪',
vi:'Cảm lạnh',
icon:'🤒',
chip:'🤒 Cảm',
symptom:'Hắt hơi, sổ mũi, cổ họng đau rát và người hâm hấp sốt do nhiễm lạnh.',
},
yotsu:{
id:'yotsu',
jp:'腰痛',
vi:'Đau lưng',
icon:'💢',
chip:'💢 Đau lưng',
symptom:'Bê vác nặng và cúi người nhiều khiến thắt lưng đau mỏi mỗi khi bước đi.',
},
necchu:{
id:'necchu',
jp:'熱中症',
vi:'Say nắng',
icon:'🥵',
chip:'🥵 Say nắng',
symptom:'Hoa mắt, chóng mặt, khát khô cổ vì làm việc dưới trời nắng gắt.',
},
kafun:{
id:'kafun',
jp:'花粉症',
vi:'Dị ứng phấn hoa',
icon:'🤧',
chip:'🤧 Phấn hoa',
symptom:'Ngứa mắt, nghẹt mũi, hắt hơi liên tục vì phấn hoa tuyết tùng (スギ花粉) đầu xuân.',
},
};
export const CLINIC={
BASE_FEE:5000,
HOKEN_RATE:0.3,
MIN_TIME:60,
MAX_TIME:120,
DRUG_MIN_COST:800,
DRUG_MAX_COST:1500,
DRUG_DEFAULT_COST:1200,
DRUG_TIME:30,
DRUG_SUCCESS_RATE:0.7,
DAILY_HEALTH_LOSS:-3,
WALK_MUL:0.9,
REMINDER:'Ốm lâu hơn 3 ngày thì đi khám, mang thẻ bảo hiểm',
};
export function isClinicOpen(cal,min=540){
if(!cal||isRedDay(cal))return false;
const wd=weekday(cal);
if(wd>=0&&wd<=4)return min>=9*60&&min<=18*60;
if(wd===5)return min>=9*60&&min<=12*60;
return false;
}
export function illWalkMul(S){
return S?.ill&&S.ill.daysLeft>0?CLINIC.WALK_MUL:1.0;
}
export function catchIll(S,cal=S?.cal,weather='sunny',job=S?.job||'site',rng=Math.random){
if(!S)return null;
if(S.ill&&S.ill.daysLeft>0)return S.ill;
const health=S.health??80;
let chance=health<35?0.18:health<55?0.10:health<75?0.05:0.02;
if((S.hungry||0)>=2)chance+=0.25;
else if((S.hungry||0)>=1)chance+=0.15;
let kind='kaze';
const season=cal?.season??0;
const day=cal?.day??1;
const wId=typeof weather==='string'?weather:(weather?.id||'sunny');
if(wId==='heat'||weather?.heat){
kind='necchu';
chance+=0.22;
}else if((season===3&&day>=20)||(season===0&&day<=14)){
kind='kafun';
chance+=0.15;
}else if(season===3||wId==='snow'||wId==='rain'||wId==='heavyRain'){
kind='kaze';
chance+=season===3?0.16:0.10;
}else if(job==='site'||job==='lotus'){
kind='yotsu';
chance+=0.14;
}else{
kind='kaze';
chance+=0.04;
}
const roll=typeof rng==='function'?rng():0.5;
if(roll>=chance)return null;
const durRoll=typeof rng==='function'?rng():0.5;
const daysLeft=4+Math.min(2,Math.floor(durRoll*3));
const info=ILLNESSES[kind]||ILLNESSES.kaze;
S.ill={
...info,
daysLeft,
daysSick:0,
treated:null,
};
return S.ill;
}
export function illDayTick(S){
if(!S||!S.ill)return null;
const deltas=applyFx(S,{health:CLINIC.DAILY_HEALTH_LOSS});
S.ill.daysSick=(S.ill.daysSick||0)+1;
S.ill.daysLeft=Math.max(0,(S.ill.daysLeft||1)-1);
if(S.ill.daysLeft<=0){
const prev=S.ill;
S.ill=null;
return{recovered:true,prev,deltas};
}
return{recovered:false,ill:S.ill,deltas};
}
export function visitClinic(S,rng=Math.random){
if(!S)return{ok:false,why:'state'};
const hasHoken=!!(S.papers&&S.papers.hoken);
const rate=hasHoken?CLINIC.HOKEN_RATE:1.0;
const cost=Math.round(CLINIC.BASE_FEE*rate);
if((S.money||0)<cost){
return{ok:false,why:'money',cost,hasHoken,deltas:[]};
}
const r1=typeof rng==='function'?rng():0.5;
const r2=typeof rng==='function'?rng():0.5;
const min=60+Math.round(r1*60);
const daysLeft=r2<0.5?1:2;
const deltas=applyFx(S,{money:-cost,health:6});
if(S.ill){
S.ill.daysLeft=Math.min(S.ill.daysLeft||daysLeft,daysLeft);
S.ill.treated='clinic';
}
return{
ok:true,
cost,
hasHoken,
rate,
min,
daysLeft,
deltas,
};
}
export function buyMedicine(S,rng=Math.random){
if(!S)return{ok:false,why:'state'};
const rRoll=typeof rng==='function'?rng():0.5;
const rCost=typeof rng==='function'?rng():0.5;
const cost=Math.min(
CLINIC.DRUG_MAX_COST,
Math.max(CLINIC.DRUG_MIN_COST,800+Math.round(rCost*7)*100),
);
const actualCost=(S.money||0)>=cost?cost:CLINIC.DRUG_MIN_COST;
if((S.money||0)<actualCost){
return{ok:false,why:'money',cost:actualCost,min:CLINIC.DRUG_TIME,deltas:[]};
}
const deltas=applyFx(S,{money:-actualCost});
const helped=rRoll<CLINIC.DRUG_SUCCESS_RATE;
if(helped){
const daysLeft=rCost<0.5?2:3;
if(S.ill){
S.ill.daysLeft=Math.min(S.ill.daysLeft||daysLeft,daysLeft);
S.ill.treated='drugstore';
}
return{
ok:true,
helped:true,
effective:true,
cost:actualCost,
min:CLINIC.DRUG_TIME,
daysLeft,
note:'Thuốc hợp cơ địa, triệu chứng giảm dần và sẽ khỏi sau 2–3 ngày.',
deltas,
};
}
return{
ok:true,
helped:false,
effective:false,
cost:actualCost,
min:CLINIC.DRUG_TIME,
daysLeft:S.ill?.daysLeft??5,
note:CLINIC.REMINDER,
reminder:CLINIC.REMINDER,
deltas,
};
}
