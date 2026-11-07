/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{daysOf,EVENINGS,rankOf}from'./jobs.js';
import{applyFx,lessTired,gainXp}from'./state.js';
import{advance,weatherOf,weatherFx,scaleLifeShift,pickLifeTalk,pickEveningTalk}from'./calendar.js';
import{sleepMeals}from'./wellbeing.js';
export const DAYS=5;
export function daySteps(i,job='site'){
const W=daysOf(job)[i],E=EVENINGS[i];
return[
{t:'talk',label:`Sáng: ${W.story.title}`,xp:5,data:W.story,at:'work'},
{t:'shift',label:W.a.label,xp:15,data:W.a,hard:false},
{t:'talk',label:`⚠️ Sự cố: ${W.drama.title}`,xp:10,data:W.drama,at:'work'},
{t:'shift',label:`🔥 ${W.b.label}`,xp:25,data:W.b,hard:true},
{t:'talk',label:`Tối: ${E.title}`,xp:10,data:E,at:E.place},
{t:'sleep',label:'Về giường đi ngủ',xp:5},
];
}
export function lifeDaySteps(S,job=S?.job||'site'){
S.lDay=S.lDay||{};
if(!S.lDay.morningTalk)S.lDay.morningTalk=pickLifeTalk(S,job).data;
if(!S.lDay.middayTalk)S.lDay.middayTalk=pickLifeTalk(S,job).data;
if(!S.lDay.eveningTalk)S.lDay.eveningTalk=pickEveningTalk(S);
const dayIdx=(((S.cal?.day||1)-1)%5+5)%5;
const W=daysOf(job)[dayIdx];
const w=weatherOf(S.cal,S.seed||1),fx=weatherFx(w);
const a={
...W.a,
rain:!!(W.a.rain||fx.rain),
wind:!!(W.a.wind||fx.wind),
walk:fx.walk<1?fx.walk:(W.a.walk||1),
heat:!!fx.heat,
snow:!!fx.snow,
cold:!!(W.a.cold||fx.snow),
};
let b=scaleLifeShift(W.b,rankOf(S.jobXp||0)+1,w);
if(S.lDay.kind==='overtime'){
b={...b,label:'Tăng ca thứ Bảy: '+b.label.replace(/^Ca chiều: |^Thử thách cuối tuần: /,'')};
}
const E=S.lDay.eveningTalk;
return[
{t:'talk',label:`Sáng: ${S.lDay.morningTalk.title}`,xp:5,data:S.lDay.morningTalk,at:'work'},
{t:'shift',label:a.label,xp:15,data:a,hard:false},
{t:'talk',label:`⚠️ Giữa ca: ${S.lDay.middayTalk.title}`,xp:10,data:S.lDay.middayTalk,at:'work'},
{t:'shift',label:`🔥 ${b.label}`,xp:25,data:b,hard:true},
{t:'talk',label:`Tối: ${E.title}`,xp:10,data:E,at:E.place},
{t:'sleep',label:'Về giường đi ngủ',xp:5,data:S.lDay.morningTalk},
];
}
export function shiftOpts(W,hard,S){
const o={
goal:W.goal,limit:0,maxMiss:0,
rain:!!W.rain,wind:!!W.wind,walk:W.walk||1,
heat:!!W.heat,snow:!!W.snow,cold:!!W.cold,
drift:W.drift,pipeKinds:W.pipeKinds,
hintDelay:W.hintDelay,decay:W.decay,urgent:W.urgent,waitMin:W.waitMin,waitRand:W.waitRand,
multi:W.multi,defect:W.defect,speed:W.speed,
pullPeriod:W.pullPeriod,pullZone:W.pullZone,weeds:!!W.weeds,
patience:W.patience,items:W.items,bag:!!W.bag,bento:!!W.bento,
icRate:W.icRate,hot:!!W.hot,queue:!!W.queue,oddChange:!!W.oddChange,roundCash:!!W.roundCash,
jp:W.jp,vi:W.vi,label:W.label,hard,
};
if(!hard)return o;
o.limit=W.limit?W.limit+(S.ally||0)*6-(S.watch||0)*5:0;
let mm=W.maxMiss||3;
if((S.ally||0)>=2)mm+=1;
if((S.watch||0)>=2)mm-=1;
o.maxMiss=Math.max(0,mm);
if(o.vi&&W.maxMiss&&o.maxMiss!==W.maxMiss){
o.vi=o.vi.replace(/((?:quá|tối đa|được sai)\s+)\d+(\s+lần)/g,`$1${o.maxMiss}$2`);
}
return o;
}
export function chooseTalk(S,c){
const d=applyFx(S,c.fx||{});
if(c.ally)S.ally=(S.ally||0)+1;
if(c.watch)S.watch=(S.watch||0)+1;
return d;
}
export function shiftEnd(S,{f,done,fail},hard){
const baseHealth=(hard?-12:-8)*((S?.hungry||0)>=1?1.5:1);
const deltas=applyFx(S,lessTired(S,{
health:baseHealth,
mental:fail?-6:hard?-3:-2,
boss:fail?-5:Math.round((hard?5:3)*f),
money:hard&&!fail?3000:0,
}));
if(hard)S[fail?'fails':'wins']=(S[fail?'fails':'wins']||0)+1;
const before=rankOf(S.jobXp||0);
const jobXp=Math.round((done||0)*(hard&&!fail?1.5:1));
S.jobXp=(S.jobXp||0)+jobXp;
const after=rankOf(S.jobXp);
return{deltas,jobXp,rankUp:after>before?after:0,title:fail?'❌ Chưa đạt':hard?'🏆 Vượt qua thử thách!':'✅ Xong ca'};
}
export function retryCost(S){return applyFx(S,{mental:-4});}
export function sleep(S){
sleepMeals(S);
return applyFx(S,{health:5,mental:7});
}
export function completeStep(S){
if(S.life){
const steps=lifeDaySteps(S,S.job||'site');
const st=steps[S.sStep]||steps[0];
const levels=gainXp(S,st.xp);
if(S.lDay?.kind==='overtime'){
if(S.sStep===0)S.sStep=3;
else if(S.sStep===3)S.sStep=4;
else S.sStep++;
}else{
S.sStep++;
}
let dayEnd=false;
if(S.sStep>=6){
S.sStep=0;
dayEnd=true;
S.lDay={};
if(S.cal)advance(S.cal);
}
return{levels,dayEnd,weekEnd:false,xp:st.xp};
}
const st=daySteps(S.story,S.job||'site')[S.sStep];
const levels=gainXp(S,st.xp);
S.sStep++;
let dayEnd=false,weekEnd=false;
if(S.sStep>=6){
S.sStep=0;
S.story++;
dayEnd=true;
if(S.story>=DAYS)weekEnd=true;
if(S.cal)S.cal.day=S.story<DAYS?S.story+1:7;
}
return{levels,dayEnd,weekEnd,xp:st.xp};
}
export function weekEval(S){
const win=S.wins||0,ally=S.ally||0,watch=S.watch||0;
const score=win*2+ally-watch-(S.fails||0);
const g=score>=11?{grade:'🌟 Xuất sắc',jp:'素晴らしい！来月からも期待してるよ。',bonus:15000}
:score>=7?{grade:'👍 Tốt',jp:'よくやったね。',bonus:8000}
:score>=3?{grade:'🙂 Tạm ổn',jp:'もう少し頑張ろう。',bonus:0}
:{grade:'😓 Cần cố gắng',jp:'来週は気をつけてね。',bonus:0};
return{...g,score,win,ally,watch,fails:S.fails||0};
}
