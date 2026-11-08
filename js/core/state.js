/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const SAVE_KEY='song-o-nhat-3d';
export const LV_HEAL=15;
export const CULTURE_GAIN=0.5;
export const LOVE_MAX=30;
export const JP_GAIN_TTS=0.6;
export const START_TTS={
money:50000,health:85,mental:65,jp:15,culture:5,boss:40,senpai:45,team:25,
love:0,lv:1,xp:0,debt:700000,jobXp:0,
};
export const BOSS_TYPES={
kind:{label:'Dễ tính',start:55,gain:1.2,loss:0.8,weekly:0.3,chance:0.3},
normal:{label:'Bình thường',start:40,gain:1,loss:1,weekly:0.2,chance:0.4},
strict:{label:'Khó tính',start:22,gain:0.7,loss:1.4,weekly:0.55,chance:0.3},
};
export const STAT_LABELS={
money:'💴 Tiền',health:'❤️ Sức khỏe',mental:'🧠 Tinh thần',jp:'🗣️ Tiếng Nhật',culture:'🎌 Văn hóa',
boss:'👷 Quản lý',team:'🤝 Đồng nghiệp',senpai:'🫂 Senpai',love:'💕 Tình cảm',
};
export const clamp=(v)=>Math.max(0,Math.min(100,v));
export function pickBossType(rng=Math.random){
let r=rng();
for(const[id,b]of Object.entries(BOSS_TYPES)){if((r-=b.chance)<0)return id;}
return'normal';
}
export function newState(draft,rng=Math.random){
const bossType=pickBossType(rng);
return{
v:1,...START_TTS,boss:BOSS_TYPES[bossType].start,bossType,
route:'tts',job:draft.job||null,name:(draft.name||'').trim(),look:{...draft.look},
nation:draft.nation||'vn',city:'saitama',
week:0,story:0,sStep:0,ally:0,watch:0,wins:0,fails:0,
cal:{year:1,season:0,day:1},life:false,seed:draft.seed||331,overtime:0,
recentTalks:[],recentEvenings:[],lDay:{},
home:{
homesick:0,dirty:0,drying:false,calledToday:false,cleanedToday:false,
missedDutyPending:false,lastCheckedDay:0,nextMsgDay:1,inbox:[],recentMsgs:[],
},
cards:[],risk:{sideJobs:0,daysLeft:0,caughtCount:0,lostJob:false},holidayLog:[],
papers:{tennyu:false,hoken:false,yucho:false,juminzei:false,zairyu:false},
ill:null,bike:null,
prep:{water:false,food:false,light:false,radio:false,bag:false,stormReady:false,shelterKnown:false},
notebook:{},
festLog:{
visited:[],stamps:{},acts:{},bonOdoriBest:0,fireworks:false,launches:0,yukata:false,
joyaBell:false,soba:false,nyCall:false,amazake:false,nengajo:false,giriChoco:false,
remitCount:0,legalRemitCount:0,cheapRemitCount:0,vnCookCount:0,lastSickDay:0,lastLateDay:0,
},
pets:{goldfish:0},
meals:{day:0,breakfast:false,dinner:false},
hungry:0,
flags:{},certs:[jpLevel(START_TTS.jp)],log:[],pantry:[],
};
}
export function jpLevel(v){return v>=85?'N1':v>=70?'N2':v>=50?'N3':v>=30?'N4':'N5';}
export const xpNeed=(lv)=>50+lv*30;
export const tireMul=(S)=>Math.max(0.5,1-((S&&S.lv||1)-1)*0.07);
export function bossAdjust(S,fx){
if(!fx.boss)return fx;
const b=BOSS_TYPES[S.bossType]||BOSS_TYPES.normal;
return{...fx,boss:Math.round(fx.boss*(fx.boss>0?b.gain:b.loss))};
}
export function lessTired(S,fx){
const o={...fx},m=tireMul(S);
for(const k of['health','mental'])if(o[k]<0)o[k]=Math.min(-1,Math.round(o[k]*m));
return o;
}
export function applyFx(S,fx){
const out=[];
for(const k in fx){
let v=fx[k];
if(!v)continue;
if(k==='culture'&&v>0)v=Math.max(1,Math.round(v*CULTURE_GAIN));
if(k==='jp'&&v>0)v=Math.max(1,Math.round(v*JP_GAIN_TTS));
if(k==='money')S.money+=v;
else if(k==='love')S.love=Math.max(0,Math.min(LOVE_MAX,(S.love||0)+v));
else S[k]=clamp((S[k]||0)+v);
out.push([k,v]);
}
return out;
}
export function gainXp(S,n){
S.xp=(S.xp||0)+n;S.lv=S.lv||1;
let up=0;
while(S.xp>=xpNeed(S.lv)){S.xp-=xpNeed(S.lv);S.lv++;up++;}
if(up)applyFx(S,{health:LV_HEAL*up,mental:LV_HEAL*up});
return up;
}
export const yen=(v)=>Math.round(v).toLocaleString('ja-JP')+' ¥';
export function save(S,storage){
try{storage.setItem(SAVE_KEY,JSON.stringify(S));return true;}catch{return false;}
}
export function load(storage){
try{
const t=storage.getItem(SAVE_KEY);
if(!t)return null;
const S=JSON.parse(t);
if(!S||S.v!==1)return null;
if(!S.cal)S.cal={year:1,season:0,day:S.story>=5?(S.flags?.dayOff?.done?8:7):Math.max(1,(S.story||0)+1)};
if(S.life===undefined)S.life=false;
if(!S.seed)S.seed=331;
if(S.overtime===undefined)S.overtime=0;
if(!Array.isArray(S.recentTalks))S.recentTalks=[];
if(!Array.isArray(S.recentEvenings))S.recentEvenings=[];
if(!S.lDay)S.lDay={};
if(!S.home||typeof S.home!=='object'){
S.home={
homesick:0,dirty:0,drying:false,calledToday:false,cleanedToday:false,
missedDutyPending:false,lastCheckedDay:0,nextMsgDay:1,inbox:[],recentMsgs:[],
};
}
if(!Array.isArray(S.cards))S.cards=[];
if(!S.risk||typeof S.risk!=='object')S.risk={sideJobs:0,daysLeft:0,caughtCount:0,lostJob:false};
if(!Array.isArray(S.holidayLog))S.holidayLog=[];
if(!S.papers||typeof S.papers!=='object'){
const totalD=((S.cal.year||1)-1)*112+(S.cal.season||0)*28+(S.cal.day||1);
const pastSpring14=totalD>14;
const pastSummer28=totalD>56;
const pastWinter20=totalD>104;
S.papers={
tennyu:pastSpring14,
hoken:pastSpring14,
yucho:pastSpring14,
juminzei:pastSummer28,
zairyu:pastWinter20,
};
}
if(S.ill===undefined)S.ill=null;
if(S.bike===undefined)S.bike=null;
if(!S.prep||typeof S.prep!=='object'){
S.prep={water:false,food:false,light:false,radio:false,bag:false,stormReady:false,shelterKnown:false};
}
if(!S.notebook||typeof S.notebook!=='object'||Array.isArray(S.notebook))S.notebook={};
if(!S.pets||typeof S.pets!=='object')S.pets={goldfish:0};
if(typeof S.pets.goldfish!=='number')S.pets.goldfish=0;
if(!S.meals||typeof S.meals!=='object'){
const dk=S.life&&S.cal?((S.cal.year||1)-1)*112+(S.cal.season||0)*28+(S.cal.day||1):(S.story||0);
S.meals={day:dk,breakfast:false,dinner:false};
}
if(typeof S.hungry!=='number')S.hungry=0;
if(!S.festLog||typeof S.festLog!=='object'){
S.festLog={
visited:[],stamps:{},acts:{},bonOdoriBest:0,fireworks:false,launches:0,yukata:false,
joyaBell:false,soba:false,nyCall:false,amazake:false,nengajo:false,giriChoco:false,
remitCount:0,legalRemitCount:0,cheapRemitCount:0,vnCookCount:0,lastSickDay:0,lastLateDay:0,
};
}
if(!Array.isArray(S.festLog.visited))S.festLog.visited=[];
if(!S.festLog.stamps||typeof S.festLog.stamps!=='object')S.festLog.stamps={};
if(!S.festLog.acts||typeof S.festLog.acts!=='object')S.festLog.acts={};
if(S.festLog.festivalsVisited&&typeof S.festLog.festivalsVisited==='object'){
for(const[k,v]of Object.entries(S.festLog.festivalsVisited)){
if(v&&!S.festLog.visited.includes(k))S.festLog.visited.push(k);
}
delete S.festLog.festivalsVisited;
}
if(S.festLog.hanami&&!S.festLog.visited.includes('hanami'))S.festLog.visited.push('hanami');
return S;
}catch{return null;}
}
export function clearSave(storage){try{storage.removeItem(SAVE_KEY);}catch{}}
