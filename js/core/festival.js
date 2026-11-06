/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx,clamp,jpLevel}from'./state.js';
import{rankOf}from'./jobs.js';
import{label as calLabel}from'./calendar.js';
import{ensureHome,callHome,totalDays}from'./home_life.js';
import{prepScore}from'./disaster.js';
function hash01(seed,a=1,b=0){
let x=(Math.trunc(seed||1)*2654435761)
^(Math.trunc(a)*2246822519)
^(Math.trunc(b)*3266489917);
x=Math.imul(x^(x>>>16),2246822507);
x=Math.imul(x^(x>>>13),3266489909);
return((x^(x>>>16))>>>0)/4294967296;
}
export function ensureFestivalState(S){
if(!S||typeof S!=='object')return null;
if(!S.notebook||typeof S.notebook!=='object'||Array.isArray(S.notebook)){
S.notebook={};
}
if(!S.pets||typeof S.pets!=='object'){
S.pets={goldfish:0};
}
if(typeof S.pets.goldfish!=='number')S.pets.goldfish=0;
if(!S.festLog||typeof S.festLog!=='object'){
S.festLog={};
}
const f=S.festLog;
if(!Array.isArray(f.visited))f.visited=[];
if(!f.stamps||typeof f.stamps!=='object')f.stamps={};
if(!f.acts||typeof f.acts!=='object')f.acts={};
if(f.festivalsVisited&&typeof f.festivalsVisited==='object'){
for(const[k,v]of Object.entries(f.festivalsVisited)){
if(v&&!f.visited.includes(k))f.visited.push(k);
}
delete f.festivalsVisited;
}
if(f.hanami&&!f.visited.includes('hanami'))f.visited.push('hanami');
if(typeof f.bonOdoriBest!=='number')f.bonOdoriBest=0;
if(typeof f.fireworks!=='boolean')f.fireworks=false;
if(typeof f.launches!=='number')f.launches=0;
if(typeof f.yukata!=='boolean')f.yukata=false;
if(typeof f.joyaBell!=='boolean')f.joyaBell=false;
if(typeof f.soba!=='boolean')f.soba=false;
if(typeof f.nyCall!=='boolean')f.nyCall=false;
if(typeof f.amazake!=='boolean')f.amazake=false;
if(typeof f.nengajo!=='boolean')f.nengajo=false;
if(typeof f.giriChoco!=='boolean')f.giriChoco=false;
if(typeof f.remitCount!=='number')f.remitCount=0;
if(typeof f.legalRemitCount!=='number')f.legalRemitCount=0;
if(typeof f.cheapRemitCount!=='number')f.cheapRemitCount=0;
if(typeof f.vnCookCount!=='number')f.vnCookCount=0;
if(typeof f.lastSickDay!=='number')f.lastSickDay=0;
if(typeof f.lastLateDay!=='number')f.lastLateDay=0;
return f;
}
export function visitFestival(S,id){
const f=ensureFestivalState(S);
if(!f||!id)return;
if(!f.visited.includes(id))f.visited.push(id);
const at=S?.cal?calLabel(S.cal):'Năm 1';
if(!f.stamps[id])f.stamps[id]=at;
}
export const YATAI_ITEMS={
takoyaki:{
id:'takoyaki',
icon:'🐙',
jp:'たこ焼き',
vi:'Bánh bạch tuộc nướng Takoyaki',
cost:500,
min:15,
fx:{health:3,mental:3,culture:1},
desc:'Viên bánh bạch tuộc nướng nóng hổi phủ sốt đậm đà và cá bào カツオ節 nhảy múa.',
},
yakisoba:{
id:'yakisoba',
icon:'🍝',
jp:'焼きそば',
vi:'Mì xào lễ hội Yakisoba',
cost:600,
min:15,
fx:{health:4,mental:3,culture:1},
desc:'Mì xào bắp cải và thịt heo trên vỉ sắt 鉄板 thơm lừng góc sân đền.',
},
kakigori:{
id:'kakigori',
icon:'🍧',
jp:'かき氷',
vi:'Đá bào siro mát lạnh',
cost:400,
min:10,
fx:{health:2,mental:3,culture:1},
hotHealthBonus:4,
desc:'Ly đá bào rưới siro dâu đỏ mát lạnh, giải nhiệt cực tốt ngày hè oi ả.',
},
ringoame:{
id:'ringoame',
icon:'🍎',
jp:'りんご飴',
vi:'Kẹo táo bọc đường Ringo-ame',
cost:300,
min:10,
fx:{mental:3,health:1,culture:1},
desc:'Quả táo bọc lớp đường đỏ bóng loáng giòn tan đặc trưng của các kỳ lễ hội Nhật.',
},
amazake:{
id:'amazake',
icon:'🍶',
jp:'甘酒',
vi:'Rượu ngọt gạo lên men Amazake (miễn phí ở đền)',
cost:0,
min:10,
fx:{health:3,mental:3,culture:2},
desc:'Thức uống gạo lên men ngọt dịu, không cồn, được đền thờ phát miễn phí sưởi ấm tay.',
},
soba:{
id:'soba',
icon:'🍜',
jp:'年越しそば',
vi:'Mì trường thọ Toshikoshi Soba',
cost:500,
min:20,
fx:{health:4,mental:5,culture:3},
desc:'Bát mì kiều mạch nóng hổi đêm giao thừa để cắt đứt vất vả năm cũ và cầu mong sức khỏe bền lâu.',
},
kingyo:{
id:'kingyo',
icon:'🐠',
jp:'金魚すくい',
vi:'Vớt cá vàng bằng vợt giấy ポイ',
cost:300,
min:20,
fx:{mental:4,culture:2},
desc:'Trò chơi vớt cá vàng truyền thống bằng chiếc vợt giấy mỏng ポイ.',
},
};
export function festivalSky(time){
if(time==='evening'||time==='night')return'night';
return time==='dusk'?'dusk':'day';
}
export const FESTIVALS={
hanami:{
id:'hanami',
icon:'🌸',
jp:'お花見',
vi:'Lễ hội ngắm hoa anh đào',
where:'shrine',
time:'day',
acts:[
{id:'hanami_picnic',icon:'🌸',jp:'お花見',vi:'Ngồi bạt ngắm hoa cùng anh Hùng & chị Hoa',cost:0,min:30,fx:{mental:8,team:3},once:true,spot:'hanami'},
{id:'yakisoba',icon:'🍝',jp:'焼きそば',vi:'Ăn mì xào Yakisoba quầy yatai',cost:600,min:15,fx:{health:4,mental:3},once:true,stall:'yakisoba'},
{id:'ringoame',icon:'🍎',jp:'りんご飴',vi:'Mua kẹo táo bọc đường',cost:300,min:10,fx:{mental:3,health:1},once:true,stall:'ringoame'},
{id:'amazake',icon:'🍶',jp:'甘酒',vi:'Uống Amazake ấm áp dưới tán anh đào',cost:0,min:10,fx:{health:3,mental:3,culture:2},once:true,stall:'amazake'},
],
},
natsumatsuri:{
id:'natsumatsuri',
icon:'🎆',
jp:'夏祭り・花火大会',
vi:'Lễ hội mùa hè & Đại hội pháo hoa',
where:'shrine',
time:'evening',
acts:[
{id:'yukata',icon:'🥻',jp:'浴衣レンタル',vi:'Thuê yukata mặc đi hội',cost:3000,min:20,fx:{mental:3,culture:2},once:true},
{id:'takoyaki',icon:'🐙',jp:'たこ焼き',vi:'Mua bánh bạch tuộc Takoyaki',cost:500,min:15,fx:{health:3,mental:3},once:true,stall:'takoyaki'},
{id:'yakisoba',icon:'🍝',jp:'焼きそば',vi:'Mua mì xào Yakisoba',cost:600,min:15,fx:{health:4,mental:3},once:true,stall:'yakisoba'},
{id:'kakigori',icon:'🍧',jp:'かき氷',vi:'Ăn đá bào siro mát lạnh',cost:400,min:10,fx:{health:5,mental:3},once:true,stall:'kakigori'},
{id:'ringoame',icon:'🍎',jp:'りんご飴',vi:'Mua kẹo táo đỏ Ringo-ame',cost:300,min:10,fx:{mental:3,health:1},once:true,stall:'ringoame'},
{id:'kingyo',icon:'🐠',jp:'金魚すくい',vi:'Chơi vớt cá vàng 金魚すくい',cost:300,min:20,fx:{mental:4,culture:2},once:false,stall:'kingyo'},
{id:'fireworks',icon:'🎆',jp:'花火大会',vi:'Ngồi xem pháo hoa & gửi ảnh về nhà LIME',cost:0,min:40,fx:{mental:8,team:3,culture:3},once:true},
],
},
obon:{
id:'obon',
icon:'🏮',
jp:'お盆・盆踊り',
vi:'Lễ hội Obon & Điệu múa Bon Odori',
where:'shrine',
time:'evening',
acts:[
{id:'bon_odori',icon:'🥁',jp:'盆踊り',vi:'Nhảy Bon Odori 16 nhịp quanh tháp Yagura',cost:0,min:30,fx:{culture:6,mental:8,team:3},once:false,spot:'yagura'},
{id:'takoyaki',icon:'🐙',jp:'たこ焼き',vi:'Mua bánh bạch tuộc Takoyaki',cost:500,min:15,fx:{health:3,mental:3},once:true,stall:'takoyaki'},
{id:'yakisoba',icon:'🍝',jp:'焼きそば',vi:'Mua mì xào Yakisoba',cost:600,min:15,fx:{health:4,mental:3},once:true,stall:'yakisoba'},
{id:'kakigori',icon:'🍧',jp:'かき氷',vi:'Ăn đá bào siro mát lạnh',cost:400,min:10,fx:{health:4,mental:3},once:true,stall:'kakigori'},
{id:'kingyo',icon:'🐠',jp:'金魚すくい',vi:'Chơi vớt cá vàng 金魚すくい',cost:300,min:20,fx:{mental:4,culture:2},once:false,stall:'kingyo'},
],
},
halloween:{
id:'halloween',
icon:'🎃',
jp:'ハロウィン',
vi:'Đêm hội Halloween',
where:'shrine',
time:'evening',
acts:[
{id:'costume',icon:'🎃',jp:'仮装カチューシャ',vi:'Mua bờm hóa trang đi dạo phố (giữ trật tự, không xả rác)',cost:1000,min:45,fx:{mental:6,culture:3,team:2},once:true},
{id:'takoyaki',icon:'🐙',jp:'たこ焼き',vi:'Mua bánh bạch tuộc Takoyaki',cost:500,min:15,fx:{health:3,mental:3},once:true,stall:'takoyaki'},
{id:'ringoame',icon:'🍎',jp:'りんご飴',vi:'Mua kẹo táo bọc đường',cost:300,min:10,fx:{mental:3,health:1},once:true,stall:'ringoame'},
],
},
kouyou:{
id:'kouyou',
icon:'🍁',
jp:'紅葉狩り',
vi:'Ngắm lá phong đỏ mùa thu',
where:'shrine',
time:'day',
acts:[
{id:'momiji',icon:'🍁',jp:'紅葉狩り・写真',vi:'Ngắm lá phong đỏ ở đền & chụp ảnh gửi về nhà',cost:0,min:40,fx:{mental:7,culture:3},once:true,spot:'hanami'},
{id:'yakisoba',icon:'🍝',jp:'焼きそば',vi:'Ăn mì xào Yakisoba dưới tán phong đỏ',cost:600,min:15,fx:{health:4,mental:3},once:true,stall:'yakisoba'},
{id:'amazake',icon:'🍶',jp:'甘酒',vi:'Uống Amazake nóng ấm lòng chiều thu',cost:0,min:10,fx:{health:3,mental:3,culture:2},once:true,stall:'amazake'},
],
},
bounenkai:{
id:'bounenkai',
icon:'🍻',
jp:'忘年会',
vi:'Tiệc tất niên công ty',
where:'izakaya',
time:'evening',
acts:[
{id:'kanpai',icon:'🍻',jp:'乾杯マナー',vi:'Tham dự tiệc tất niên 忘年会 & phép tắc nâng ly 乾杯',cost:4000,min:120,fx:{boss:6,team:6,mental:7,culture:4},once:true},
],
},
oomisoka:{
id:'oomisoka',
icon:'🔔',
jp:'大晦日・除夜の鐘',
vi:'Đêm giao thừa & 108 tiếng chuông chùa',
where:'shrine',
time:'evening',
acts:[
{id:'soba',icon:'🍜',jp:'年越しそば',vi:'Ăn mì trường thọ Toshikoshi Soba đón năm mới',cost:500,min:20,fx:{health:4,mental:5,culture:3},once:true,stall:'soba'},
{id:'joya_bell',icon:'🔔',jp:'除夜の鐘',vi:'Nghe 108 tiếng chuông giao thừa & gõ chuông cầu an',cost:0,min:30,fx:{mental:8,culture:5},once:true,spot:'bell'},
{id:'call_ny',icon:'📹',jp:'大晦日のビデオ通話',vi:'Gọi video về nhà (ở VN mới 22:00, lệch 2 tiếng)',cost:0,min:30,fx:{mental:6},once:true},
{id:'amazake',icon:'🍶',jp:'甘酒',vi:'Uống Amazake bên lửa trại giao thừa',cost:0,min:10,fx:{health:3,mental:3,culture:2},once:true,stall:'amazake'},
],
},
shogatsu:{
id:'shogatsu',
icon:'🎍',
jp:'正月・初詣',
vi:'Tết Năm mới & Đi lễ đầu năm Hatsumōde',
where:'shrine',
time:'day',
acts:[
{id:'hatsumode',icon:'⛩️',jp:'初詣（二礼二拍手一礼）',vi:'Đi lễ đầu năm 初詣 cầu sức khỏe và bình an',cost:5,min:15,fx:{culture:5,mental:5},once:true,spot:'pray'},
{id:'omikuji',icon:'🎋',jp:'おみくじ',vi:'Rút quẻ đầu năm mới',cost:100,min:10,fx:{mental:4},once:true,spot:'omikuji'},
{id:'amazake',icon:'🍶',jp:'甘酒（無料振る舞い）',vi:'Uống rượu ngọt Amazake miễn phí ở đền',cost:0,min:10,fx:{health:3,mental:4,culture:2},once:true,stall:'amazake'},
{id:'nengajo',icon:'📮',jp:'年賀状・お年玉メモ',vi:'Nhận thiệp chúc Tết 年賀状 từ công ty & ghi chú お年玉',cost:0,min:15,fx:{boss:2,team:2,culture:3,mental:4},once:true},
{id:'takoyaki',icon:'🐙',jp:'たこ焼き',vi:'Mua bánh bạch tuộc Takoyaki đầu năm',cost:500,min:15,fx:{health:3,mental:3},once:true,stall:'takoyaki'},
{id:'ringoame',icon:'🍎',jp:'りんご飴',vi:'Mua kẹo táo đỏ may mắn',cost:300,min:10,fx:{mental:3,health:1},once:true,stall:'ringoame'},
],
},
tet_vn:{
id:'tet_vn',
icon:'🧧',
jp:'テト（旧正月）',
vi:'Tết Nguyên Đán xa nhà',
where:'room',
time:'evening',
acts:[
{id:'tet_call',icon:'📹',jp:'テトのビデオ通話',vi:'Gọi video đón giao thừa cùng cả nhà',cost:0,min:45,fx:{mental:6},once:true},
{id:'tet_banhchung',icon:'🟩',jp:'バインチュン作り',vi:'Nấu bánh chưng đêm Tết với bạn phòng',cost:1500,min:90,fx:{mental:12,health:3,team:3},once:true},
{id:'tet_lixi',icon:'🧧',jp:'お年玉送金',vi:'Gửi tiền lì xì năm mới về quê',cost:5000,min:15,fx:{mental:5},once:true},
],
},
valentine:{
id:'valentine',
icon:'🍫',
jp:'バレンタイン',
vi:'Ngày Valentine & Sôcôla đồng nghiệp',
where:'work',
time:'day',
acts:[
{id:'giri_choco',icon:'🍫',jp:'義理チョコ',vi:'Mua sôcôla nghĩa vụ 義理チョコ tặng đồng nghiệp (500 ¥ × 3)',cost:1500,min:15,fx:{team:5,senpai:3,culture:3,mental:3},once:true},
{id:'skip_choco',icon:'🙂',jp:'買わない',vi:'Không mua (tìm hiểu văn hóa 14/2 & 14/3 ホワイトデー)',cost:0,min:5,fx:{mental:1,culture:2},once:true},
],
},
};
export const ANNUAL_FESTIVAL_IDS=[
'hanami',
'natsumatsuri',
'obon',
'halloween',
'kouyou',
'bounenkai',
'oomisoka',
'shogatsu',
];
export function buyYatai(S,itemId,weather='sunny'){
const f=ensureFestivalState(S);
const item=YATAI_ITEMS[itemId];
if(!S||!item)return{ok:false,why:'invalid',deltas:[]};
if((S.money||0)<item.cost){
return{ok:false,why:'money',cost:item.cost,deltas:[]};
}
const fx={...item.fx};
if(item.cost>0)fx.money=-item.cost;
const isHot=weather==='heat'||weather?.heat||S?.cal?.season===1;
let hotBonus=false;
if(itemId==='kakigori'&&isHot){
fx.health=(fx.health||0)+(item.hotHealthBonus||4);
hotBonus=true;
}
const deltas=applyFx(S,fx);
if(f){
f.acts[itemId]=true;
if(itemId==='amazake')f.amazake=true;
if(itemId==='soba')f.soba=true;
}
return{
ok:true,
item,
cost:item.cost,
min:item.min,
hotBonus,
deltas,
};
}
export const GOLDFISH_FEE=300;
export const POI_MAX_MISS=3;
export const SCOOP_WINDOW=0.25;
let _activeGoldfishRound=null;
export function goldfishRound(seed=1){
const times=[];
let cur=0.75;
for(let i=0;i<6;i++){
cur+=0.75+Math.round(hash01(seed,i+1,41)*65)/100;
times.push(Math.round(cur*100)/100);
}
Object.defineProperties(times,{
times:{value:times,enumerable:false},
seed:{value:seed,enumerable:false},
misses:{value:0,writable:true,enumerable:false},
caught:{value:0,writable:true,enumerable:false},
torn:{value:false,writable:true,enumerable:false},
maxMiss:{value:POI_MAX_MISS,enumerable:false},
window:{value:SCOOP_WINDOW,enumerable:false},
used:{value:new Set(),enumerable:false},
scoop:{
value:(t,S=null)=>scoop(times,t,S),
enumerable:false,
},
});
_activeGoldfishRound=times;
return times;
}
export function scoop(arg1,arg2=null,arg3=null){
let round=null,t=0,S=null;
if(typeof arg1==='number'){
t=arg1;
if(Array.isArray(arg2)||(arg2&&Array.isArray(arg2.times))){
round=arg2;
S=arg3;
}else{
round=_activeGoldfishRound||goldfishRound(1);
S=arg2;
}
}else if(Array.isArray(arg1)||(arg1&&Array.isArray(arg1.times))){
round=arg1;
t=Number(arg2)||0;
S=arg3;
}else{
round=_activeGoldfishRound||goldfishRound(1);
t=Number(arg1)||0;
}
const list=Array.isArray(round)?round:round.times;
if(round.torn||round.misses>=POI_MAX_MISS){
round.torn=true;
return{
ok:false,
hit:false,
torn:true,
misses:round.misses,
caught:round.caught,
};
}
const win=round.window||SCOOP_WINDOW;
let hitIdx=-1;
let bestDiff=Infinity;
for(let i=0;i<list.length;i++){
if(round.used&&round.used.has(i))continue;
const diff=Math.abs(t-list[i]);
if(diff<=win&&diff<bestDiff){
bestDiff=diff;
hitIdx=i;
}
}
if(hitIdx>=0){
if(round.used)round.used.add(hitIdx);
round.caught=(round.caught||0)+1;
let deltas=[];
if(S&&typeof S==='object'){
ensureFestivalState(S);
S.pets.goldfish+=1;
round._appliedCaught=(round._appliedCaught||0)+1;
deltas=applyFx(S,{mental:4,culture:2});
}
return{
ok:true,
hit:true,
torn:false,
misses:round.misses,
caught:round.caught,
time:list[hitIdx],
deltas,
};
}
round.misses=(round.misses||0)+1;
if(round.misses>=POI_MAX_MISS){
round.torn=true;
}
return{
ok:false,
hit:false,
torn:!!round.torn,
misses:round.misses,
caught:round.caught,
deltas:[],
};
}
export function finishGoldfish(S,round,payFee=true){
const f=ensureFestivalState(S);
if(!S)return{ok:false,deltas:[]};
if(payFee){
if((S.money||0)<GOLDFISH_FEE){
return{ok:false,why:'money',cost:GOLDFISH_FEE,deltas:[]};
}
applyFx(S,{money:-GOLDFISH_FEE});
}
const caught=round?.caught||0;
const unapplied=Math.max(0,caught-(round?._appliedCaught||0));
let deltas=[];
if(unapplied>0){
S.pets.goldfish+=unapplied;
if(round)round._appliedCaught=caught;
deltas=applyFx(S,{mental:4*unapplied,culture:2});
}else if(caught===0){
deltas=applyFx(S,{mental:2,culture:1});
}
if(f)f.acts.kingyo=true;
return{
ok:true,
caught,
goldfishTotal:S.pets.goldfish,
torn:!!round?.torn,
deltas,
};
}
export const BON_BEATS_COUNT=16;
export const BON_WINDOW_MS=150;
export function bonOdoriBeats(seed=1){
const beats=[];
let t=600;
for(let i=0;i<BON_BEATS_COUNT;i++){
beats.push(t);
const step=550+Math.round(hash01(seed,i+1,88)*180);
t+=step;
}
Object.defineProperties(beats,{
beats:{value:beats,enumerable:false},
windowMs:{value:BON_WINDOW_MS,enumerable:false},
judge:{
value:(idx,tapMs)=>judgeBonBeat(beats[idx],tapMs),
enumerable:false,
},
});
return beats;
}
export function judgeBonBeat(beatMs,tapMs){
const diff=Math.abs(Number(tapMs)-Number(beatMs));
return{
hit:diff<=BON_WINDOW_MS,
diff,
};
}
export function scoreBonOdori(arg1,arg2,arg3=null){
let S=null,beats=null,taps=null;
if(Array.isArray(arg1)){
beats=arg1;
taps=arg2;
S=arg3;
}else{
S=arg1;
beats=Array.isArray(arg2)?arg2:bonOdoriBeats(S?.seed||1);
taps=arg3;
}
let hits=0;
const total=Array.isArray(beats)?beats.length:BON_BEATS_COUNT;
if(typeof taps==='number'){
hits=Math.max(0,Math.min(total,Math.round(taps)));
}else if(Array.isArray(taps)){
for(let i=0;i<total;i++){
if(taps[i]!==undefined&&taps[i]!==null){
if(Math.abs(Number(taps[i])-Number(beats[i]))<=BON_WINDOW_MS){
hits+=1;
}
}
}
}
const score=Math.round((hits/Math.max(1,total))*100);
const fx={
culture:score>=80?6:score>=50?4:2,
mental:score>=80?8:score>=50?5:3,
team:3,
};
let deltas=[];
if(S&&typeof S==='object'){
const f=ensureFestivalState(S);
f.bonOdoriBest=Math.max(f.bonOdoriBest||0,score);
f.acts.bon_odori=true;
visitFestival(S,'obon');
deltas=applyFx(S,fx);
}
return{
ok:true,
hits,
total,
score,
fx,
deltas,
};
}
export const YUKATA_FEE=3000;
export const FIREWORK_CHEER='たまや〜！';
export function rentYukata(S){
const f=ensureFestivalState(S);
if(!S||(S.money||0)<YUKATA_FEE){
return{ok:false,why:'money',cost:YUKATA_FEE,deltas:[]};
}
const deltas=applyFx(S,{money:-YUKATA_FEE,mental:3,culture:2});
f.yukata=true;
f.acts.yukata=true;
return{ok:true,cost:YUKATA_FEE,min:20,deltas};
}
export function launchFirework(S=null){
if(S&&typeof S==='object'){
const f=ensureFestivalState(S);
f.launches=(f.launches||0)+1;
}
return{
ok:true,
cheer:FIREWORK_CHEER,
jp:FIREWORK_CHEER,
vi:'Tamaya~! (Pháo hoa nở sáng rực bầu trời đêm!)',
};
}
export function watchFireworks(S){
const f=ensureFestivalState(S);
const h=ensureHome(S);
if(!S)return{ok:false,deltas:[]};
const deltas=applyFx(S,{mental:8,team:3,culture:3});
f.fireworks=true;
f.acts.fireworks=true;
visitFestival(S,'natsumatsuri');
if(h){
h.homesick=clamp(h.homesick-6);
const dayNum=totalDays(S.cal);
const momReply={
id:'mom_fireworks',
uid:`msg-${dayNum}-mom_fireworks`,
from:'Mẹ',
text:'Ảnh pháo hoa bên Nhật đẹp quá con ơi! Nhìn con đi xem hội cùng anh chị đồng nghiệp vui vẻ thế này là bố mẹ ở nhà mừng lắm rồi.',
ask:0,
why:'Trả lời ảnh pháo hoa lễ hội mùa hè',
fx:{mental:3},
totalDay:dayNum,
read:false,
replied:false,
};
if(!h.inbox.some((m)=>m.id==='mom_fireworks'&&m.totalDay===dayNum)){
h.inbox.push(momReply);
}
}
return{
ok:true,
min:40,
cheer:FIREWORK_CHEER,
limeSent:true,
deltas,
};
}
export const HALLOWEEN_HEADBAND_FEE=1000;
export const HALLOWEEN_MANNER_NOTE='Ở Nhật dịp Halloween mọi người chỉ đeo bờm hóa trang nhẹ nhàng đi dạo chụp ảnh, tuyệt đối không xả rác ra đường (ゴミを持ち帰る) và không làm ồn trên tàu hay khu dân cư.';
export function doHalloween(S,buyHeadband=true){
const f=ensureFestivalState(S);
if(!S)return{ok:false,deltas:[]};
const wantBuy=typeof buyHeadband==='object'?buyHeadband.buyHeadband!==false:!!buyHeadband;
const cost=wantBuy?HALLOWEEN_HEADBAND_FEE:0;
if(cost>0&&(S.money||0)<cost){
return{ok:false,why:'money',cost,deltas:[]};
}
const fx=wantBuy
?{money:-cost,mental:6,culture:3,team:2}
:{mental:3,culture:2};
const deltas=applyFx(S,fx);
f.acts.costume=true;
visitFestival(S,'halloween');
return{
ok:true,
boughtHeadband:wantBuy,
cost,
min:45,
lesson:HALLOWEEN_MANNER_NOTE,
deltas,
};
}
export function doMomiji(S){
const f=ensureFestivalState(S);
const h=ensureHome(S);
if(!S)return{ok:false,deltas:[]};
const deltas=applyFx(S,{mental:7,culture:3});
f.acts.momiji=true;
visitFestival(S,'kouyou');
if(h){
h.homesick=clamp(h.homesick-5);
const dayNum=totalDays(S.cal);
const reply={
id:'mom_momiji',
uid:`msg-${dayNum}-mom_momiji`,
from:'Mẹ',
text:'Lá phong đỏ ở đền bên Nhật nhìn như tranh vẽ vậy con nhỉ! Trời sang thu se lạnh rồi, đi làm sớm nhớ mặc thêm áo ấm nhé con.',
ask:0,
why:'Trả lời ảnh mùa lá đỏ 紅葉',
fx:{mental:2},
totalDay:dayNum,
read:false,
replied:false,
};
if(!h.inbox.some((m)=>m.id==='mom_momiji'&&m.totalDay===dayNum)){
h.inbox.push(reply);
}
}
return{
ok:true,
min:40,
limeSent:true,
deltas,
};
}
export const BOUNENKAI_FEE=4000;
export const BOUNENKAI_QUESTIONS=[
{
id:'wait_kanpai',
jp:'乾杯のタイミング',
q:'Khi đồ uống vừa được mang ra bàn trong buổi tiệc 忘年会, phép lịch sự đúng là gì?',
choices:[
'Chờ mọi người có đủ đồ uống trên tay rồi cùng nâng ly hô 「乾杯！」 (お疲れ様でした)',
'Ai có đồ uống trước thì cứ uống trước cho mát rồi nói chuyện sau',
'Đứng lên tự cụng ly một mình rồi ngồi xuống ăn ngay',
],
ans:0,
},
{
id:'pour_boss',
jp:'お酌のマナー（お酒を注ぐ）',
q:'Khi thấy ly của quản lý hoặc tiền bối vơi đi, bạn nên làm thế nào?',
choices:[
'Cầm chai bằng hai tay, nhãn chai hướng lên trên và hỏi nhẹ nhàng trước khi rót thêm (お酌)',
'Cầm một tay rót thật đầy tràn miệng ly của sếp',
'Đẩy chai qua cho sếp tự rót',
],
ans:0,
},
{
id:'glass_lower',
jp:'グラスの高さ',
q:'Khi cụng ly 乾杯 với quản lý hoặc người lớn tuổi hơn, vị trí ly của bạn nên như thế nào?',
choices:[
'Nâng ly của mình thấp hơn miệng ly của quản lý một chút để thể hiện sự kính trọng',
'Nâng ly cao hơn đầu quản lý để tỏ sự nhiệt tình',
'Đặt ly dưới mặt bàn không cần nâng lên',
],
ans:0,
},
];
export const BOUNENKAI_OOLONG_NOTE='Ở Nhật hiện nay rất tôn trọng người không uống được rượu bia (không ép rượu — アルハラ防止). Gọi trà Ô Long (ウーロン茶) để cụng ly 乾杯 vẫn hoàn toàn lịch sự và hòa đồng cùng cả tổ!';
export function doBounenkai(S,answers=[0,0,0],drink='oolong'){
const f=ensureFestivalState(S);
if(!S)return{ok:false,deltas:[]};
if((S.money||0)<BOUNENKAI_FEE){
return{ok:false,why:'money',cost:BOUNENKAI_FEE,deltas:[]};
}
let correct=0;
for(let i=0;i<BOUNENKAI_QUESTIONS.length;i++){
const q=BOUNENKAI_QUESTIONS[i];
const a=Array.isArray(answers)?answers[i]:0;
if(a===q.ans||a===q.choices[q.ans])correct+=1;
}
const fx={
money:-BOUNENKAI_FEE,
boss:1+correct*2,
team:2+correct*2,
mental:4+correct,
culture:2+correct,
};
const deltas=applyFx(S,fx);
f.acts.kanpai=true;
visitFestival(S,'bounenkai');
return{
ok:true,
cost:BOUNENKAI_FEE,
min:120,
correct,
total:BOUNENKAI_QUESTIONS.length,
drink:drink==='beer'?'beer':'oolong',
drinkOk:true,
lesson:BOUNENKAI_OOLONG_NOTE,
deltas,
};
}
export const JOYA_BELL_COUNT=108;
export function eatToshikoshiSoba(S,free=false){
const f=ensureFestivalState(S);
if(!S)return{ok:false,deltas:[]};
const cost=free?0:YATAI_ITEMS.soba.cost;
if(cost>0&&(S.money||0)<cost){
return{ok:false,why:'money',cost,deltas:[]};
}
const fx={...YATAI_ITEMS.soba.fx};
if(cost>0)fx.money=-cost;
const deltas=applyFx(S,fx);
f.soba=true;
f.acts.soba=true;
visitFestival(S,'oomisoka');
return{
ok:true,
cost,
min:20,
deltas,
lesson:'Người Nhật ăn mì kiều mạch 年越しそば vào tối 31/12 vì sợi mì dài tượng trưng cho sự trường thọ và dễ cắt đứt những vất vả của năm cũ.',
};
}
export function ringJoyaBell(S){
const f=ensureFestivalState(S);
if(!S)return{ok:false,deltas:[]};
const deltas=applyFx(S,{mental:8,culture:5});
f.joyaBell=true;
f.acts.joya_bell=true;
visitFestival(S,'oomisoka');
return{
ok:true,
bells:JOYA_BELL_COUNT,
min:30,
sound:'ゴーン…',
lesson:'Đêm giao thừa ở Nhật, chuông chùa 除夜の鐘 được ngân vang đúng 108 tiếng để gột rửa 108 nỗi phiền não của con người trước khi bước sang năm mới.',
deltas,
};
}
export function callNewYearEve(S){
const f=ensureFestivalState(S);
if(!S)return{ok:false,deltas:[]};
const r=callHome(S,'video');
f.nyCall=true;
f.acts.call_ny=true;
visitFestival(S,'oomisoka');
return{
ok:true,
min:30,
jpTime:'00:00',
vnTime:'22:00',
diffHours:2,
homesick:r.homesick,
note:'Khi đồng hồ ở Nhật điểm 00:00 bước sang năm mới thì ở Việt Nam mới là 22:00 tối (lệch 2 tiếng). Cả nhà nhìn thấy con khỏe mạnh qua màn hình là vui nhất!',
deltas:r.deltas,
};
}
export const OTOSHIDAMA_NOTE='Ở Nhật Bản, tiền lì xì đầu năm お年玉 chỉ dành cho trẻ em; người trưởng thành đã đi làm không nhận お年玉 mà gửi thiệp chúc Tết 年賀状 (Nengajō) và chúc nhau 「あけましておめでとうございます」.';
export function drinkAmazake(S,free=true){
const f=ensureFestivalState(S);
if(!S)return{ok:false,deltas:[]};
const cost=free?0:200;
if(cost>0&&(S.money||0)<cost){
return{ok:false,why:'money',cost,deltas:[]};
}
const fx={health:3,mental:4,culture:2};
if(cost>0)fx.money=-cost;
const deltas=applyFx(S,fx);
f.amazake=true;
f.acts.amazake=true;
visitFestival(S,'shogatsu');
return{ok:true,cost,min:10,deltas};
}
export function receiveNengajo(S){
const f=ensureFestivalState(S);
if(!S)return{ok:false,deltas:[]};
const deltas=applyFx(S,{boss:2,team:2,culture:3,mental:4});
f.nengajo=true;
f.acts.nengajo=true;
visitFestival(S,'shogatsu');
return{
ok:true,
min:15,
nengajoJp:'「あけましておめでとうございます。いつも真面目に働いてくれてありがとう。今年もよろしくお願いします！」',
nengajoVi:'Chúc mừng năm mới! Cảm ơn bạn luôn chăm chỉ làm việc. Năm nay cũng mong bạn tiếp tục đồng hành cùng công ty nhé!',
otoshidamaNote:OTOSHIDAMA_NOTE,
deltas,
};
}
export const GIRI_CHOCO_PRICE=500;
export const VALENTINE_NOTE='Ở Nhật Bản, ngày 14/2 (バレンタイン) nữ giới thường tặng sôcôla cho nam giới; trong công sở có tục tặng sôcôla cảm ơn đồng nghiệp gọi là 義理チョコ (sôcôla nghĩa vụ/lịch sự). Một tháng sau, vào ngày 14/3 (ホワイトデー — White Day), người nhận sẽ tặng quà đáp lễ.';
export function doValentine(S,buyGiri=true,count=3){
const f=ensureFestivalState(S);
if(!S)return{ok:false,deltas:[]};
const n=Math.max(1,Math.round(Number(count)||3));
const cost=buyGiri?GIRI_CHOCO_PRICE*n:0;
if(cost>0&&(S.money||0)<cost){
return{ok:false,why:'money',cost,deltas:[]};
}
const fx=buyGiri
?{money:-cost,team:5,senpai:3,culture:3,mental:3}
:{mental:1,culture:2};
const deltas=applyFx(S,fx);
if(buyGiri)f.giriChoco=true;
f.acts.valentine=true;
visitFestival(S,'valentine');
return{
ok:true,
bought:!!buyGiri,
count:buyGiri?n:0,
cost,
min:15,
lesson:VALENTINE_NOTE,
deltas,
};
}
export const ACHIEVEMENTS=[
{
id:'debt_free',
icon:'💳',
jp:'借金完済',
vi:'Trả hết nợ môi giới',
hint:'Trả hết khoản nợ chi phí ban đầu 700.000 ¥ qua các kỳ lương.',
check:(S)=>(S?.debt??700000)<=0,
},
{
id:'savings_1m',
icon:'🏦',
jp:'貯金100万円',
vi:'Tiết kiệm 1.000.000 ¥',
hint:'Tích lũy tiền mặt trong tay đạt từ 1.000.000 ¥ trở lên.',
check:(S)=>(S?.money||0)>=1000000,
},
{
id:'jp_n3',
icon:'🗣️',
jp:'日本語能力 N3',
vi:'Tiếng Nhật trình độ N3',
hint:'Học tập và giao tiếp tiếng Nhật đạt mốc N3 (chỉ số Tiếng Nhật ≥ 50).',
check:(S)=>(S?.jp||0)>=50||['N3','N2','N1'].includes(jpLevel(S?.jp||0)),
},
{
id:'jp_n2',
icon:'🎓',
jp:'日本語能力 N2',
vi:'Tiếng Nhật trình độ N2',
hint:'Nâng cao trình độ tiếng Nhật đạt mốc N2 (chỉ số Tiếng Nhật ≥ 70).',
check:(S)=>(S?.jp||0)>=70||['N2','N1'].includes(jpLevel(S?.jp||0)),
},
{
id:'rank_10',
icon:'🏆',
jp:'熟練職人・ランク10',
vi:'Kỹ năng nghề bậc 10/10',
hint:'Rèn luyện tay nghề qua các ca làm việc đến bậc cao nhất (Bậc 10/10).',
check:(S)=>rankOf(S?.jobXp||0)>=9,
},
{
id:'tokutei_pass',
icon:'📜',
jp:'特定技能合格',
vi:'Đỗ kỳ thi kỹ năng đặc định 特定技能',
hint:'Học đủ 3 buổi tối và thi đỗ chứng chỉ chuyển ngành 特定技能 (≥ 4/5 câu).',
check:(S)=>!!(
S?.flags?.careerPassed
||S?.festLog?.tokuteiPassed
||(Array.isArray(S?.certs)&&S.certs.some((c)=>/特定技能|tokutei/i.test(c)))
),
},
{
id:'no_sick_season',
icon:'💪',
jp:'一季節無欠勤',
vi:'Không nghỉ ốm cả mùa',
hint:'Làm việc trọn vẹn ít nhất 1 mùa (28 ngày) mà không bị gục nghỉ ốm ngày nào.',
check:(S)=>{
const td=totalDays(S?.cal);
const lastSick=S?.festLog?.lastSickDay||0;
return td>=28&&(td-lastSick)>=28;
},
},
{
id:'all_festivals',
icon:'🏮',
jp:'年間祭り制覇',
vi:'Đi đủ các lễ hội một năm',
hint:'Tham gia đủ 8 lễ hội 4 mùa: お花見, 夏祭り, お盆, ハロウィン, 紅葉, 忘年会, 大晦日, 正月.',
check:(S)=>{
const vis=S?.festLog?.visited||[];
return ANNUAL_FESTIVAL_IDS.every((id)=>vis.includes(id));
},
},
{
id:'goldfish_catch',
icon:'🐠',
jp:'金魚すくい名人',
vi:'Vớt được cá vàng mang về phòng',
hint:'Chơi 金魚すくい ở quầy yatai lễ hội và vớt được ít nhất 1 chú cá vàng về nuôi.',
check:(S)=>(S?.pets?.goldfish||0)>=1,
},
{
id:'watch_fireworks',
icon:'🎆',
jp:'夏の花火大会',
vi:'Ngắm pháo hoa mùa hè',
hint:'Tham dự đêm hội mùa hè 夏祭り・花火大会, ngắm pháo hoa và gửi ảnh về cho gia đình.',
check:(S)=>!!S?.festLog?.fireworks,
},
{
id:'bon_odori_80',
icon:'🥁',
jp:'盆踊り達人',
vi:'Nhảy Bon Odori đạt ≥ 80 điểm',
hint:'Hoàn thành điệu múa 盆踊り dịp lễ Obon với số điểm nhịp điệu từ 80 trở lên.',
check:(S)=>(S?.festLog?.bonOdoriBest||0)>=80,
},
{
id:'joya_bell',
icon:'🔔',
jp:'除夜の鐘108回',
vi:'Nghe 108 tiếng chuông giao thừa',
hint:'Đến đền さくら神社 đêm giao thừa 大晦日 nghe và gõ tiếng chuông 除夜の鐘.',
check:(S)=>!!S?.festLog?.joyaBell,
},
{
id:'remit_10',
icon:'💸',
jp:'親孝行・送金10回',
vi:'Gửi tiền về nhà 10 lần',
hint:'Chăm chỉ làm việc và gửi tiền phụ giúp bố mẹ ở quê đủ 10 lần.',
check:(S)=>(S?.festLog?.remitCount||0)>=10,
},
{
id:'no_cheap_remit',
icon:'🛡️',
jp:'安全送金マイスター',
vi:'Không bao giờ chuyển tiền chui',
hint:'Gửi tiền về nhà ít nhất 5 lần hoàn toàn qua đường chính thức, không dùng chuyển chui.',
check:(S)=>(S?.festLog?.legalRemitCount||0)>=5&&(S?.festLog?.cheapRemitCount||0)===0,
},
{
id:'no_late_season',
icon:'🚃',
jp:'一季節無遅刻',
vi:'Không trễ tàu cả mùa',
hint:'Đi làm đúng giờ suốt cả mùa (28 ngày, kể cả dùng 遅延証明書 khi tàu chậm).',
check:(S)=>{
const td=totalDays(S?.cal);
const lastLate=S?.festLog?.lastLateDay||0;
return td>=28&&(td-lastLate)>=28;
},
},
{
id:'all_papers',
icon:'📋',
jp:'手続き完璧',
vi:'Hoàn tất thủ tục cư trú',
hint:'Hoàn thành đăng ký địa chỉ 転入届, bảo hiểm 国民健康保険 và mở tài khoản 郵便局の口座.',
check:(S)=>!!(S?.papers?.tennyu&&S?.papers?.hoken&&S?.papers?.yucho),
},
{
id:'emergency_ready',
icon:'🎒',
jp:'防災万全',
vi:'Túi khẩn cấp 5/5 món',
hint:'Chuẩn bị đầy đủ cả 5 món trong túi khẩn cấp 非常持ち出し袋 tại phòng ký túc xá.',
check:(S)=>prepScore(S)>=5,
},
{
id:'viet_chef',
icon:'🍜',
jp:'故郷の味',
vi:'Đầu bếp quê hương',
hint:'Cùng anh em cùng phòng nấu món ăn Việt Nam ít nhất 3 lần.',
check:(S)=>(S?.festLog?.vnCookCount||0)>=3,
},
];
for(const a of ACHIEVEMENTS)ACHIEVEMENTS[a.id]=a;
export function checkAchievements(S){
ensureFestivalState(S);
if(!S)return[];
const newlyUnlocked=[];
const cal=S.cal||{year:1,season:0,day:1};
const dateStr=calLabel(cal);
for(const ach of ACHIEVEMENTS){
if(S.notebook[ach.id])continue;
let passed=false;
try{
passed=!!ach.check(S);
}catch{
passed=false;
}
if(passed){
S.notebook[ach.id]={
id:ach.id,
at:dateStr,
year:cal.year||1,
season:cal.season||0,
day:cal.day||1,
};
newlyUnlocked.push(ach);
}
}
return newlyUnlocked;
}
