/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx,clamp}from'./state.js';
import{DAYS_PER_SEASON,weekday,eventsOn}from'./calendar.js';
import{markDinner}from'./wellbeing.js';
export function totalDays(cal){
if(!cal)return 1;
const y=Math.max(1,cal.year||1);
const s=Math.max(0,Math.min(3,cal.season||0));
const d=Math.max(1,Math.min(DAYS_PER_SEASON,cal.day||1));
return(y-1)*4*DAYS_PER_SEASON+s*DAYS_PER_SEASON+d;
}
export const FAMILY_MSGS=[
{id:'tuition_sis',from:'Mẹ',text:'Con ơi, tháng này em gái vào học kỳ mới, trường thu tiền học phí với sách vở. Con có dư gửi về phụ mẹ một ít nhé.',ask:15000,why:'Đóng học phí cho em gái',fx:{mental:4}},
{id:'med_grandma',from:'Bố',text:'Bà nội mấy hôm nay trở trời đau khớp phải mua thêm thuốc bổ xương. Con bên đó giữ gìn sức khỏe, nếu tiện gửi về cho bà nhé.',ask:10000,why:'Mua thuốc cho bà nội',fx:{mental:4}},
{id:'roof_repair',from:'Bố',text:'Đợt mưa bão vừa rồi mái tôn sau bếp bị dột, bố định kêu thợ sửa lại trước mùa mưa tới.',ask:25000,why:'Sửa lại mái nhà',fx:{mental:5}},
{id:'exam_bro',from:'Em trai',text:'Anh/chị ơi, em sắp đăng ký lớp luyện thi cuối cấp với lệ phí thi thử. Tháng này anh/chị giúp em được không ạ?',ask:15000,why:'Tiền học ôn thi cho em trai',fx:{mental:4}},
{id:'tet_prep',from:'Mẹ',text:'Sắp tới dịp giỗ chạp với sắm sửa trong nhà, mẹ tính mua ít lễ vật với gói quà biếu nội ngoại.',ask:20000,why:'Phụ mẹ sắm sửa lễ Tết ở quê',fx:{mental:5}},
{id:'bike_fix',from:'Em gái',text:'Xe đạp điện của em đi học bị hỏng bình ắc quy rồi, phải thay bình mới mới đi học xa được.',ask:10000,why:'Thay ắc quy xe đi học cho em',fx:{mental:3}},
{id:'checkup_mom',from:'Bố',text:'Tuần tới bố đưa mẹ lên viện tỉnh khám tổng quát định kỳ, bác sĩ dặn làm thêm mấy xét nghiệm.',ask:20000,why:'Chi phí khám sức khỏe cho mẹ',fx:{mental:5}},
{id:'water_pump',from:'Mẹ',text:'Máy bơm nước giếng ở nhà tự dưng cháy tụ, bố con đang hỏi mua máy mới để bơm nước sinh hoạt.',ask:15000,why:'Mua máy bơm nước mới ở quê',fx:{mental:4}},
{id:'mom_weather',from:'Mẹ',text:'Bên Nhật mùa này lạnh không con? Đi làm về nhớ nấu cơm ăn nóng, đừng ăn mì gói mãi xót ruột nhé.',ask:0,why:'',fx:{mental:2}},
{id:'dad_proud',from:'Bố',text:'Hôm qua bác Tư sang chơi hỏi thăm con, bố khoe con bên Nhật chịu khó làm ăn lắm. Cố gắng lên con nhé!',ask:0,why:'',fx:{mental:2}},
{id:'grandma_miss',from:'Bà nội',text:'Bà nhờ cái Lan nhắn tin cho cháu đây. Bà khỏe lắm, tối nào cũng xem dự báo thời tiết bên Nhật xem chỗ cháu nắng hay mưa.',ask:0,why:'',fx:{mental:3}},
{id:'sis_score',from:'Em gái',text:'Khoe với anh/chị nè, bài kiểm tra Toán tuần này em được 9 điểm đó! Khi nào rảnh gọi video cho em nha.',ask:0,why:'',fx:{mental:2}},
{id:'bro_football',from:'Em trai',text:'Đội bóng lớp em vừa vào chung kết trường! Bên Nhật có gì vui kể em nghe với.',ask:0,why:'',fx:{mental:2}},
{id:'mom_garden',from:'Mẹ',text:'Cây ổi sau vườn năm nay sai quả lắm, mẹ nhìn lại nhớ hồi ở nhà con hay trèo hái. Giữ ấm cổ họng nhé con.',ask:0,why:'',fx:{mental:2}},
{id:'dad_safety',from:'Bố',text:'Đi làm ở xưởng hay ngoài công trường nhớ tuân thủ an toàn lao động con nhé, chậm một chút mà chắc chắn.',ask:0,why:'',fx:{mental:2}},
{id:'grandma_sweet',from:'Bà nội',text:'Hôm nay mẹ cháu nấu chè đậu đen, bà phần cháu một bát trong lòng. Cháu ở bên đó nhớ ngủ sớm.',ask:0,why:'',fx:{mental:3}},
{id:'sis_photo',from:'Em gái',text:'Em mới chụp ảnh cả nhà ăn cơm tối gửi qua LIME nè. Mẹ cứ nhắc anh/chị suốt buổi!',ask:0,why:'',fx:{mental:2}},
{id:'mom_rain',from:'Mẹ',text:'Ở quê mưa rào mát trời lắm. Con đi làm về mệt nhớ ngâm chân nước ấm cho dễ ngủ nha.',ask:0,why:'',fx:{mental:2}},
{id:'bro_japanese',from:'Em trai',text:'Em đang tập học bảng chữ cái Hiragana theo anh/chị đây, khó phết mà vui ghê!',ask:0,why:'',fx:{mental:2}},
{id:'dad_tea',from:'Bố',text:'Sáng sớm bố pha ấm trà nóng ngồi ngoài hiên, mong con bên xứ người chân cứng đá mềm.',ask:0,why:'',fx:{mental:2}},
{id:'mom_market',from:'Mẹ',text:'Hôm nay phiên chợ quê đông vui lắm, mẹ mua được mớ cá đồng tươi. Bên đó siêu thị tối có giảm giá không con?',ask:0,why:'',fx:{mental:2}},
{id:'grandma_warm',from:'Bà nội',text:'Đêm nằm nhớ đắp chăn kín vai nhé cháu, đừng thức khuya bấm điện thoại hại mắt.',ask:0,why:'',fx:{mental:2}},
{id:'sis_draw',from:'Em gái',text:'Em vẽ bức tranh hoa anh đào tặng anh/chị dán ở góc học tập nè. Cuối tuần gọi về nhé!',ask:0,why:'',fx:{mental:2}},
{id:'mom_neighbors',from:'Mẹ',text:'Cả xóm ai cũng gửi lời hỏi thăm con. Có đồng nghiệp tốt thì rủ nhau nấu bữa cơm cho đỡ quạnh nhé con.',ask:0,why:'',fx:{mental:2}},
];
export const REMIT_ROUTES={
legal:{
id:'legal',
vi:'Dịch vụ chuyển tiền chính thức / Bưu điện 郵便局',
jp:'公式送金・郵便局の口座',
fee:1500,
rate:1.0,
scam:0,
},
cheap:{
id:'cheap',
vi:'Nhờ người quen chuyển chui (phí rẻ, tỉ giá cao)',
jp:'地下銀行・個人送金',
fee:300,
rate:1.03,
scam:0.15,
},
};
const VN_DISH_LIST=[
{id:'pho',icon:'🍜',vi:'Phở bò quê nhà',jp:'ベトナム料理',share:1000,min:150,fx:{mental:10,health:8,team:3}},
{id:'nem',icon:'🌯',vi:'Nem rán giòn',jp:'ベトナム料理',share:900,min:120,fx:{mental:9,health:8,team:3}},
{id:'canh_chua',icon:'🍲',vi:'Canh chua cá',jp:'ベトナム料理',share:800,min:120,fx:{mental:8,health:8,team:3}},
{id:'bun_cha',icon:'🥣',vi:'Bún chả Hà Nội',jp:'ベトナム料理',share:1100,min:150,fx:{mental:11,health:8,team:3}},
{id:'banh_chung',icon:'🟩',vi:'Bánh chưng ngày Tết',jp:'ベトナム料理',share:1500,min:180,tetOnly:true,fx:{mental:12,health:8,team:3}},
];
for(const d of VN_DISH_LIST)VN_DISH_LIST[d.id]=d;
export const VN_DISHES=VN_DISH_LIST;
export const HOME={
FAMILY_MSGS,
REMIT_ROUTES,
VN_DISHES,
HOMESICK_DAILY:5,
HOMESICK_HOLIDAY:8,
HOMESICK_WARN:60,
HOMESICK_MENTAL:-2,
CALL_VOICE:{min:30,homesick:-10,fx:{mental:3}},
CALL_VIDEO:{min:60,homesick:-30,fx:{mental:6}},
DIRTY_BASE:12,
DIRTY_HEAVY:20,
DIRTY_RAIN:5,
DIRTY_WARN:60,
DIRTY_FULL_FX:{mental:-3,boss:-1},
WASH:{
dorm:{cost:200,min:60},
coin:{cost:500,min:90},
},
CLEAN_MIN:30,
CLEAN_FX:{team:2},
MISSED_DUTY_FX:{team:-3,mental:-2},
};
function hashInt(seed,a,b=0){
let x=(Math.trunc(seed||1)*2654435761)^(Math.trunc(a)*2246822519)^(Math.trunc(b)*3266489917);
x=Math.imul(x^(x>>>16),2246822507);
x=Math.imul(x^(x>>>13),3266489909);
return(x^(x>>>16))>>>0;
}
export function ensureHome(S){
if(!S)return null;
if(!S.home||typeof S.home!=='object'){
S.home={
homesick:0,
dirty:0,
drying:false,
calledToday:false,
cleanedToday:false,
missedDutyPending:false,
lastCheckedDay:0,
nextMsgDay:1,
inbox:[],
recentMsgs:[],
};
}
const h=S.home;
if(typeof h.homesick!=='number')h.homesick=0;
if(typeof h.dirty!=='number')h.dirty=0;
if(typeof h.drying!=='boolean')h.drying=false;
if(typeof h.calledToday!=='boolean')h.calledToday=false;
if(typeof h.cleanedToday!=='boolean')h.cleanedToday=false;
if(typeof h.missedDutyPending!=='boolean')h.missedDutyPending=false;
if(typeof h.lastCheckedDay!=='number')h.lastCheckedDay=0;
if(typeof h.nextMsgDay!=='number'||h.nextMsgDay<1)h.nextMsgDay=1;
if(!Array.isArray(h.inbox))h.inbox=[];
if(!Array.isArray(h.recentMsgs))h.recentMsgs=[];
return h;
}
export function inboxFor(S,cal=S?.cal){
const h=ensureHome(S);
if(!h)return[];
const targetDay=cal?totalDays(cal):1;
const seed=S?.seed||1;
for(let d=h.lastCheckedDay+1;d<=targetDay;d++){
if(d>=h.nextMsgDay){
const recentSet=new Set(h.recentMsgs.slice(-20));
const pool=FAMILY_MSGS.filter((m)=>!recentSet.has(m.id));
const candidates=pool.length?pool:FAMILY_MSGS;
const idx=hashInt(seed,d,h.inbox.length+1)%candidates.length;
const tpl=candidates[idx];
const msg={
...tpl,
uid:`msg-${d}-${tpl.id}`,
totalDay:d,
read:false,
replied:false,
};
h.inbox.push(msg);
h.recentMsgs.push(tpl.id);
if(h.recentMsgs.length>20)h.recentMsgs.shift();
const gap=2+(hashInt(seed,d,99)%2);
h.nextMsgDay=d+gap;
}
}
if(targetDay>h.lastCheckedDay)h.lastCheckedDay=targetDay;
return h.inbox;
}
export function unreadCount(S,cal=S?.cal){
const list=inboxFor(S,cal);
return list.filter((m)=>!m.read).length;
}
function remitMentalBonus(amount){
if(amount>=50000)return 9;
if(amount>=30000)return 6;
if(amount>=10000)return 3;
return 2;
}
export function sendMoney(S,amount,route='legal',rng=Math.random){
const h=ensureHome(S);
const r=REMIT_ROUTES[route]||REMIT_ROUTES.legal;
const amt=Math.max(0,Math.round(Number(amount)||0));
const totalCost=amt+r.fee;
if(!S||amt<=0||(S.money||0)<totalCost){
return{ok:false,lost:false,fee:r.fee,deltas:[]};
}
const scammed=r.scam>0&&rng()<r.scam;
S.festLog=S.festLog||{};
if(r.id==='cheap'){
S.festLog.cheapRemitCount=(S.festLog.cheapRemitCount||0)+1;
}else{
S.festLog.legalRemitCount=(S.festLog.legalRemitCount||0)+1;
}
if(scammed){
const deltas=applyFx(S,{money:-totalCost,mental:-10});
return{ok:true,lost:true,fee:r.fee,amount:amt,deltas};
}
S.festLog.remitCount=(S.festLog.remitCount||0)+1;
const mental=remitMentalBonus(amt);
const deltas=applyFx(S,{money:-totalCost,mental});
if(h)h.homesick=clamp(h.homesick-5);
return{
ok:true,
lost:false,
fee:r.fee,
amount:amt,
received:Math.round(amt*r.rate),
deltas,
};
}
export function callHome(S,kind='voice'){
const h=ensureHome(S);
if(!h)return{ok:false,min:0,deltas:[]};
const cfg=kind==='video'?HOME.CALL_VIDEO:HOME.CALL_VOICE;
h.homesick=clamp(h.homesick+cfg.homesick);
h.calledToday=true;
const deltas=applyFx(S,cfg.fx);
return{ok:true,kind,min:cfg.min,homesick:h.homesick,deltas};
}
export function isBigHomesickHoliday(cal){
if(!cal)return false;
return eventsOn(cal).some((e)=>e.id==='tet_vn'||e.id==='obon'||e.id==='shogatsu');
}
export function dayTick(S,cal=S?.cal){
const h=ensureHome(S);
if(!h)return{homesick:0,dirty:0,deltas:[]};
if(h.drying)h.drying=false;
if(!h.calledToday){
h.homesick=clamp(h.homesick+HOME.HOMESICK_DAILY);
}
if(isBigHomesickHoliday(cal)){
h.homesick=clamp(h.homesick+HOME.HOMESICK_HOLIDAY);
}
const fx={};
if(h.homesick>=HOME.HOMESICK_WARN){
fx.mental=(fx.mental||0)+HOME.HOMESICK_MENTAL;
}
if(h.dirty>=100){
fx.mental=(fx.mental||0)+HOME.DIRTY_FULL_FX.mental;
fx.boss=(fx.boss||0)+HOME.DIRTY_FULL_FX.boss;
}
const deltas=Object.keys(fx).length?applyFx(S,fx):[];
h.calledToday=false;
h.cleanedToday=false;
inboxFor(S,cal);
return{homesick:h.homesick,dirty:h.dirty,deltas};
}
function isWetWeather(weather){
if(!weather)return false;
if(typeof weather==='string'){
return weather==='rain'||weather==='snow'||weather==='typhoon';
}
return!!(weather.rain||weather.snow||weather.dayOff);
}
export function afterShift(S,job=S?.job||'site',weather='sunny'){
const h=ensureHome(S);
if(!h)return{dirty:0,added:0};
const base=job==='site'||job==='lotus'?HOME.DIRTY_HEAVY:HOME.DIRTY_BASE;
const rainAdd=isWetWeather(weather)?HOME.DIRTY_RAIN:0;
const added=base+rainAdd;
h.dirty=clamp(h.dirty+added);
return{dirty:h.dirty,added,warn:h.dirty>=HOME.DIRTY_WARN,full:h.dirty>=100};
}
export function wash(S,way='dorm',weather='sunny'){
const h=ensureHome(S);
const cfg=way==='coin'?HOME.WASH.coin:HOME.WASH.dorm;
if(!S||(S.money||0)<cfg.cost){
return{ok:false,why:'money',cost:cfg.cost,min:cfg.min,deltas:[]};
}
const deltas=applyFx(S,{money:-cfg.cost});
h.dirty=0;
h.drying=way==='dorm'&&isWetWeather(weather);
return{
ok:true,
way:way==='coin'?'coin':'dorm',
cost:cfg.cost,
min:cfg.min,
dirty:h.dirty,
drying:h.drying,
deltas,
};
}
export function dutyToday(S,cal=S?.cal){
if(!cal)return false;
const targetWd=Math.abs(Math.trunc(S?.seed||1))%7;
return weekday(cal)===targetWd;
}
export function clean(S){
const h=ensureHome(S);
if(!h)return{ok:false,min:0,deltas:[]};
if(h.cleanedToday)return{ok:false,why:'done',min:0,deltas:[]};
h.cleanedToday=true;
h.missedDutyPending=false;
const deltas=applyFx(S,HOME.CLEAN_FX);
return{ok:true,min:HOME.CLEAN_MIN,deltas};
}
export function missedDuty(S){
ensureHome(S);
const deltas=applyFx(S,HOME.MISSED_DUTY_FX);
if(S?.home)S.home.missedDutyPending=false;
return{ok:true,deltas};
}
export function availableVnDishes(cal){
const isTet=cal?eventsOn(cal).some((e)=>e.id==='tet_vn'||e.id==='shogatsu'):false;
return VN_DISHES.filter((d)=>!d.tetOnly||isTet);
}
export function cookVietnamese(S,dish){
const h=ensureHome(S);
const d=typeof dish==='string'?VN_DISHES.find((x)=>x.id===dish):dish;
if(!S||!d)return{ok:false,why:'dish',deltas:[]};
if((S.money||0)<d.share){
return{ok:false,why:'money',cost:d.share,min:d.min,deltas:[]};
}
const deltas=applyFx(S,{money:-d.share,...d.fx});
markDinner(S);
if(h)h.homesick=clamp(h.homesick-8);
S.festLog=S.festLog||{};
S.festLog.vnCookCount=(S.festLog.vnCookCount||0)+1;
return{ok:true,dish:d,cost:d.share,min:d.min,deltas};
}
export function homeChips(S,cal=S?.cal){
const h=ensureHome(S);
if(!h)return[];
const chips=[];
if(S?.ill&&S.ill.daysLeft>0)chips.push({id:'ill',text:S.ill.chip||`${S.ill.icon || '🤒'} ${S.ill.vi}`});
if((S?.hungry||0)>=1)chips.push({id:'hungry',text:'🍙 Đói'});
if(h.homesick>=HOME.HOMESICK_WARN)chips.push({id:'homesick',text:'🏠 Nhớ nhà'});
if(h.dirty>=HOME.DIRTY_WARN)chips.push({id:'dirty',text:'👕 Quần áo bẩn'});
if(dutyToday(S,cal)&&!h.cleanedToday)chips.push({id:'duty',text:'🧹 Trực nhật'});
return chips;
}
