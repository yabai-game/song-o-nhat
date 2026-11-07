/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx,clamp}from'./state.js';
import{RANK_NEED,rankOf,rankPay,ranksOf}from'./jobs.js';
export const WELL={
WARN:30,
COLLAPSE:15,
DAY_PAY:8000,
HOSPITAL:15000,
COPAY:0.3,
BACK_TO:60,
BOSS_LOSS:5,
};
export function checkCollapse(S){
const h=S.health<=WELL.COLLAPSE,m=S.mental<=WELL.COLLAPSE;
return h&&m?'both':h?'health':m?'mental':null;
}
export const lowBars=(S)=>['health','mental'].filter((k)=>S[k]<WELL.WARN);
export function sickLeave(S,kind){
const hospital=kind==='health'||kind==='both';
const hasHoken=!S?.papers||S.papers.hoken!==false;
const rate=hasHoken?WELL.COPAY:1.0;
const copay=hospital?Math.round(WELL.HOSPITAL*rate):0;
const money=-(WELL.DAY_PAY+copay);
S.money+=money;
S.health=WELL.BACK_TO;S.mental=WELL.BACK_TO;
S.boss=clamp(S.boss-WELL.BOSS_LOSS);
if(S?.cal){
S.festLog=S.festLog||{};
S.festLog.lastSickDay=((S.cal.year||1)-1)*112+(S.cal.season||0)*28+(S.cal.day||1);
}
const lines=[`💴 Mất 1 ngày lương: −${WELL.DAY_PAY.toLocaleString('ja-JP')} ¥`];
if(hospital){
lines.push(hasHoken
?`🏥 Viện phí ${WELL.HOSPITAL.toLocaleString('ja-JP')} ¥ — bảo hiểm y tế 国民健康保険 trả 70 %, bạn trả 30 %: −${copay.toLocaleString('ja-JP')} ¥`
:`🏥 Viện phí ${WELL.HOSPITAL.toLocaleString('ja-JP')} ¥ — chưa có thẻ bảo hiểm 国民健康保険 nên phải trả 100 %: −${copay.toLocaleString('ja-JP')} ¥`);
}else lines.push('📞 Nghỉ ở nhà, gọi đường dây tư vấn tinh thần (miễn phí)');
lines.push(`❤️ 🧠 nghỉ ngơi xong về ${WELL.BACK_TO} · 👷 Quản lý −${WELL.BOSS_LOSS}`);
return{hospital,hasHoken,money,copay,lines};
}
export function skillInfo(S,job=S.job){
const xp=S.jobXp||0,rank=rankOf(xp),maxed=rank>=RANK_NEED.length-1;
const from=RANK_NEED[rank],to=maxed?from:RANK_NEED[rank+1];
const pct=maxed?100:Math.round(((xp-from)/(to-from))*100);
return{rank,title:ranksOf(job)[rank]||'',xp:xp-from,need:to-from,pct,maxed,pay:rankPay(rank+1)};
}
export function rankUp(prevXp,xp){const a=rankOf(prevXp||0),b=rankOf(xp||0);return b>a?b:0;}
export function mealDayOf(S){
if(!S)return 0;
if(S.life&&S.cal){
const y=Math.max(1,S.cal.year||1);
const s=Math.max(0,Math.min(3,S.cal.season||0));
const d=Math.max(1,S.cal.day||1);
return(y-1)*112+s*28+d;
}
if(typeof S.story==='number')return S.story;
return S.meals?.day||0;
}
export function ensureMeals(S){
if(!S)return{day:0,breakfast:false,dinner:false};
const curDay=mealDayOf(S);
if(!S.meals||typeof S.meals!=='object'){
S.meals={day:curDay,breakfast:false,dinner:false};
}else if(S.meals.day!==curDay){
S.meals={day:curDay,breakfast:false,dinner:false};
}
if(typeof S.hungry!=='number')S.hungry=0;
return S.meals;
}
export function markBreakfast(S){
if(!S)return;
const m=ensureMeals(S);
m.breakfast=true;
}
export function markDinner(S){
if(!S)return;
const m=ensureMeals(S);
m.dinner=true;
S.hungry=0;
}
export function ateDinner(S){
if(!S)return false;
return!!ensureMeals(S).dinner;
}
export function sleepMeals(S){
if(!S)return 0;
const m=ensureMeals(S);
if(m.dinner){
S.hungry=0;
}else{
S.hungry=(S.hungry||0)+1;
}
m.breakfast=false;
m.dinner=false;
return S.hungry;
}
export{applyFx};
