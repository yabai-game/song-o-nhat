/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx}from'./state.js';
import{daysOf,EVENINGS,rankOf,rankPay}from'./jobs.js';
export const DAYS_PER_SEASON=28;
export const WEEKDAYS=['月','火','水','木','金','土','日'];
export const WEEKDAYS_VI=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ nhật'];
export const SEASONS=[
{idx:0,id:'spring',jp:'春',vi:'Xuân',icon:'🌸',months:'4–6'},
{idx:1,id:'summer',jp:'夏',vi:'Hạ',icon:'☀️',months:'7–9'},
{idx:2,id:'autumn',jp:'秋',vi:'Thu',icon:'🍁',months:'10–12'},
{idx:3,id:'winter',jp:'冬',vi:'Đông',icon:'❄️',months:'1–3'},
];
for(const s of SEASONS)SEASONS[s.id]=s;
export const newCalendar=()=>({year:1,season:0,day:1});
export const seasonOf=(cal)=>SEASONS[(cal?.season??0)&3]||SEASONS[0];
export const weekday=(cal)=>(((cal?.day||1)-1)%7+7)%7;
export function advance(cal){
if(!cal)return newCalendar();
if(cal.day<DAYS_PER_SEASON){
cal.day+=1;
}else{
cal.day=1;
if(cal.season<3)cal.season+=1;
else{
cal.season=0;
cal.year=(cal.year||1)+1;
}
}
return cal;
}
export const nextDay=(cal)=>advance({year:cal?.year||1,season:cal?.season||0,day:cal?.day||1});
export const EVENTS=[
{id:'hanami',season:0,days:[3,7],jp:'お花見',vi:'Ngắm hoa anh đào',kind:'event',icon:'🌸',fx:{mental:6,culture:3},
desc:'Hoa anh đào nở rộ khắp phố và sân đền さくら神社. Cùng đồng nghiệp trải bạt ngắm hoa!'},
{id:'showa',season:0,days:[15,15],jp:'昭和の日',vi:'Ngày Showa',kind:'red',icon:'🎌',fx:{mental:4,culture:2},
desc:'Ngày lễ quốc gia mở đầu kỳ nghỉ mùa xuân.'},
{id:'gw',season:0,days:[17,19],jp:'ゴールデンウィーク (憲法記念日・みどりの日・こどもの日)',vi:'Tuần lễ Vàng (Golden Week)',kind:'red',icon:'🎏',fx:{mental:6,culture:3},
desc:'Chuỗi ngày lễ lớn mùa xuân, cờ cá chép Koinobori 🎏 tung bay khắp khu phố.'},
{id:'tsuyu',season:0,days:[22,28],jp:'梅雨',vi:'Mùa mưa Tsuyu',kind:'season',icon:'🌧️',fx:{mental:2},
desc:'Mùa mưa đầu hạ (梅雨), trời mưa rả rích nhiều ngày liền.'},
{id:'umi',season:1,days:[6,6],jp:'海の日',vi:'Ngày của biển',kind:'red',icon:'🌊',fx:{mental:5,health:3},
desc:'Ngày lễ quốc gia tri ân biển cả và cầu chúc mùa hè bình an.'},
{id:'natsumatsuri',season:1,days:[10,10],jp:'夏祭り・花火大会',vi:'Lễ hội mùa hè & pháo hoa',kind:'event',time:'evening',icon:'🎆',fx:{mental:8,culture:4},
desc:'Đêm lễ hội mùa hè ở đền さくら神社 rực rỡ đèn lồng và pháo hoa.'},
{id:'yama',season:1,days:[12,12],jp:'山の日',vi:'Ngày của núi',kind:'red',icon:'⛰️',fx:{mental:4,health:3},
desc:'Ngày lễ quốc gia gần gũi với thiên nhiên núi rừng.'},
{id:'obon',season:1,days:[13,16],jp:'お盆',vi:'Nghỉ lễ Obon',kind:'off',icon:'🏮',fx:{mental:6,culture:3},
desc:'Kỳ nghỉ lễ Obon tưởng nhớ tổ tiên, công ty cho nghỉ dài ngày.'},
{id:'keiro',season:1,days:[22,22],jp:'敬老の日',vi:'Ngày kính lão',kind:'red',icon:'🍵',fx:{mental:5,culture:3},
desc:'Ngày lễ mừng thọ người cao tuổi trên toàn nước Nhật.'},
{id:'shubun',season:1,days:[26,26],jp:'秋分の日',vi:'Ngày Thu phân',kind:'red',icon:'🌾',fx:{mental:4,culture:2},
desc:'Ngày lễ Thu phân, nắng hè dịu dần chuyển sang thu.'},
{id:'sports',season:2,days:[4,4],jp:'スポーツの日',vi:'Ngày thể thao',kind:'red',icon:'🏃',fx:{health:6,mental:4},
desc:'Ngày lễ vận động rèn luyện sức khỏe dưới tiết trời mùa thu mát mẻ.'},
{id:'halloween',season:2,days:[10,10],jp:'ハロウィン',vi:'Lễ hội Halloween',kind:'event',icon:'🎃',fx:{mental:5,culture:2},
desc:'Các cửa hàng konbini và siêu thị bày bánh kẹo bí ngô nhộn nhịp.'},
{id:'bunka',season:2,days:[13,13],jp:'文化の日',vi:'Ngày văn hóa',kind:'red',icon:'🎨',fx:{culture:5,mental:4},
desc:'Ngày lễ tôn vinh văn hóa, nghệ thuật và truyền thống.'},
{id:'kouyou',season:2,days:[14,20],jp:'紅葉',vi:'Mùa lá đỏ Momiji',kind:'event',icon:'🍁',fx:{mental:6,culture:3},
desc:'Cây phong và ngân hạnh chuyển sắc đỏ vàng rực rỡ khắp phố.'},
{id:'kinro',season:2,days:[19,19],jp:'勤労感謝の日',vi:'Ngày cảm tạ lao động',kind:'red',icon:'🙏',fx:{mental:5,health:4},
desc:'Ngày lễ tri ân người lao động và thành quả mùa màng.'},
{id:'bounenkai',season:2,days:[25,25],jp:'忘年会',vi:'Tiệc tất niên công ty',kind:'event',time:'evening',icon:'🍻',fx:{mental:7,culture:3},
desc:'Buổi liên hoan cuối năm cùng cả tổ để gác lại vất vả năm cũ.'},
{id:'oomisoka',season:2,days:[28,28],jp:'大晦日',vi:'Đêm giao thừa (ăn mì Toshikoshi Soba)',kind:'event',time:'evening',icon:'🍜',fx:{mental:6,health:4,culture:3},
desc:'Đêm cuối năm ăn mì trường thọ 年越しそば và nghe chuông giao thừa.'},
{id:'shogatsu',season:3,days:[1,3],jp:'正月・初詣',vi:'Tết Năm mới & đi lễ đầu năm',kind:'red',icon:'🎍',fx:{mental:8,culture:5},
desc:'Ba ngày Tết Năm mới (三が日), đi lễ đầu năm 初詣 tại đền さくら神社 cầu bình an.'},
{id:'seijin',season:3,days:[8,8],jp:'成人の日',vi:'Lễ thành nhân',kind:'red',icon:'👘',fx:{mental:4,culture:3},
desc:'Ngày lễ chúc mừng các bạn trẻ bước sang tuổi trưởng thành 20.'},
{id:'tet_vn',season:3,days:[11,11],jp:'テト',vi:'Tết Nguyên Đán',kind:'event',time:'evening',icon:'🧧',fx:{mental:6,culture:3},
desc:'Đêm Tết cổ truyền Việt Nam nơi đất khách — vẫn phải đi làm ban ngày, tối gọi về nhà đón giao thừa.'},
{id:'kenkoku',season:3,days:[12,12],jp:'建国記念の日',vi:'Ngày Quốc khánh',kind:'red',icon:'🎌',fx:{mental:4,culture:2},
desc:'Ngày lễ kỷ niệm kiến quốc của Nhật Bản.'},
{id:'valentine',season:3,days:[13,13],jp:'バレンタイン',vi:'Ngày Valentine',kind:'event',icon:'🍫',fx:{mental:6,culture:2},
desc:'Đồng nghiệp chia sô-cô-la cảm ơn (義理チョコ) ấm lòng ngày đông.'},
{id:'tenno',season:3,days:[15,15],jp:'天皇誕生日',vi:'Sinh nhật Thiên hoàng',kind:'red',icon:'🎌',fx:{mental:4,culture:2},
desc:'Ngày lễ quốc gia mừng sinh nhật Thiên hoàng.'},
{id:'shunbun',season:3,days:[24,24],jp:'春分の日',vi:'Ngày Xuân phân',kind:'red',icon:'🌱',fx:{mental:5,health:3},
desc:'Ngày lễ Xuân phân, băng tuyết tan dần đón mùa xuân mới.'},
];
export const HOLIDAYS=EVENTS.filter((e)=>e.kind==='red'||e.kind==='off');
export function eventsOn(cal){
if(!cal)return[];
const s=cal.season??0,d=cal.day??1;
return EVENTS.filter((e)=>e.season===s&&d>=e.days[0]&&d<=e.days[1]);
}
export function isRedDay(cal){
return eventsOn(cal).some((e)=>e.kind==='red');
}
export function isOffDay(cal){
if(!cal)return false;
const w=weekday(cal);
if(w===5||w===6)return true;
if(isRedDay(cal))return true;
return eventsOn(cal).some((e)=>e.kind==='off');
}
export function isMandatoryOff(cal){
if(!cal)return false;
if(weekday(cal)===6)return true;
if(isRedDay(cal))return true;
return eventsOn(cal).some((e)=>e.kind==='off');
}
export function isSaturdayWorkable(cal){
return weekday(cal)===5&&!isMandatoryOff(cal);
}
export const WEATHER={
spring:{sunny:50,cloudy:28,rain:17,heavyRain:5},
tsuyu:{sunny:12,cloudy:18,rain:50,heavyRain:20},
summer:{sunny:36,heat:26,cloudy:16,rain:10,heavyRain:5,typhoon:7},
autumn:{sunny:48,cloudy:24,rain:14,heavyRain:6,typhoon:8},
winter:{sunny:42,cloudy:26,snow:24,rain:8},
};
const WEATHER_INFO={
sunny:{id:'sunny',icon:'☀️',jp:'晴れ',vi:'Nắng đẹp',rain:false,wind:false,snow:false,walk:1.0,heat:false,dayOff:false},
cloudy:{id:'cloudy',icon:'⛅',jp:'曇り',vi:'Nhiều mây',rain:false,wind:false,snow:false,walk:1.0,heat:false,dayOff:false},
rain:{id:'rain',icon:'🌧️',jp:'雨',vi:'Mưa',rain:true,wind:false,snow:false,walk:0.92,heat:false,dayOff:false},
heavyRain:{id:'heavyRain',icon:'⛈️',jp:'大雨',vi:'Mưa to gió lớn',rain:true,wind:true,snow:false,walk:0.88,heat:false,dayOff:false},
snow:{id:'snow',icon:'🌨️',jp:'雪',vi:'Tuyết rơi',rain:false,wind:false,snow:true,walk:0.85,heat:false,dayOff:false},
typhoon:{id:'typhoon',icon:'🌀',jp:'台風',vi:'Bão lớn (nghỉ)',rain:true,wind:true,snow:false,walk:0.80,heat:false,dayOff:true},
heat:{id:'heat',icon:'🥵',jp:'猛暑',vi:'Nắng gắt (35°C+)',rain:false,wind:false,snow:false,walk:0.95,heat:true,dayOff:false},
};
function hash01(year,season,day,seed){
let h=(year*73856093)^(season*19349663)^(day*83492791)^((seed||1)*2654435761);
h=Math.imul(h^(h>>>16),0x85ebca6b);
h=Math.imul(h^(h>>>13),0xc2b2ae35);
return((h^(h>>>16))>>>0)/4294967296;
}
function rawWeatherForDay(year,season,day,seed){
const table=season===0?(day>=22?WEATHER.tsuyu:WEATHER.spring)
:season===1?WEATHER.summer
:season===2?WEATHER.autumn
:WEATHER.winter;
const r=hash01(year,season,day,seed)*100;
let acc=0;
for(const[k,w]of Object.entries(table)){
acc+=w;
if(r<acc)return k;
}
return'sunny';
}
export function weatherOf(cal,seed=1){
if(!cal)return'sunny';
const y=cal.year||1,s=(cal.season??0)&3,d=Math.max(1,Math.min(DAYS_PER_SEASON,cal.day||1));
const raw=rawWeatherForDay(y,s,d,seed);
if(raw!=='typhoon')return raw;
let typhoonsBefore=0;
for(let prev=1;prev<d;prev++){
if(rawWeatherForDay(y,s,prev,seed)==='typhoon'){
typhoonsBefore+=1;
if(typhoonsBefore>=2)return'heavyRain';
}
}
return'typhoon';
}
export function weatherFx(w){
const info=WEATHER_INFO[w]||WEATHER_INFO.sunny;
return{...info};
}
export function label(cal,weather=null){
const s=seasonOf(cal);
const d=cal?.day||1;
const wd=WEEKDAYS[weekday(cal)];
const y=cal?.year||1;
if(weather){
const ic=typeof weather==='string'?weatherFx(weather).icon:(weather.icon||'☀️');
return`${s.icon} ${s.vi} · ${d} (${wd}) · ${ic} · Năm ${y}`;
}
return`${s.icon} ${s.vi} · ${d} (${wd}) · Năm ${y}`;
}
export const PAY={
DAYS:[10,19,28],
BASE:70000,
OVERTIME:12000,
RENT:15000,
TAX_RATE:0.12,
DEBT:25000,
REMIT_OPTIONS:[
{remit:0,mental:0,label:'Không gửi (giữ lại tiêu dùng)'},
{remit:10000,mental:5,label:'Gửi 10.000 ¥ về nhà (🧠 +5)'},
{remit:30000,mental:8,label:'Gửi 30.000 ¥ về nhà (🧠 +8)'},
],
};
export function paydayOn(cal){
return!!cal&&PAY.DAYS.includes(cal.day);
}
export function payslip(S={}){
const rk=rankOf(S.jobXp||0);
const base=PAY.BASE;
const skill=rankPay(rk);
const overtime=Math.max(0,S.overtime||0)*PAY.OVERTIME;
const gross=base+skill+overtime;
const rent=PAY.RENT;
const tax=Math.round(gross*PAY.TAX_RATE);
const debt=Math.min(Math.max(0,S.debt??0),PAY.DEBT);
const net=gross-rent-tax-debt;
return{base,skill,overtime,gross,rent,tax,debt,net,rank:rk+1};
}
export function applyPay(S,remit=0){
const p=payslip(S);
const maxRemit=Math.max(0,(S.money||0)+p.net);
const r=Math.max(0,Math.min(remit||0,maxRemit));
S.money=(S.money||0)+p.net-r;
S.debt=Math.max(0,(S.debt||0)-p.debt);
S.overtime=0;
S.remitted=(S.remitted||0)+r;
const mental=r>=30000?8:r>=10000?5:0;
if(mental>0)applyFx(S,{mental});
return{...p,remit:r,mental};
}
export function repayDebt(S,amount=50000){
const curDebt=Math.max(0,S.debt??0);
const curMoney=Math.max(0,S.money??0);
const want=Math.max(0,Math.round(amount||0));
if(curDebt<=0)return{ok:false,reason:'no_debt',paid:0,remaining:0,cleared:true,deltas:[]};
const pay=Math.min(want,curDebt);
if(curMoney<pay||pay<=0)return{ok:false,reason:'no_money',paid:0,remaining:curDebt,cleared:false,deltas:[]};
S.money=curMoney-pay;
S.debt=curDebt-pay;
const mental=pay>=100000?8:pay>=50000?4:2;
const deltas=[['money',-pay],...applyFx(S,{mental})];
return{ok:true,paid:pay,remaining:S.debt,cleared:S.debt===0,deltas};
}
export function scaleLifeShift(baseCfg,rank=1,weather='sunny'){
const tier=Math.min(3,Math.floor(Math.max(0,rank)/3));
const fx=weatherFx(weather);
const goal=(baseCfg.goal||3)+tier;
const rawLimit=baseCfg.limit?Math.round(baseCfg.limit*(1-0.05*tier)):0;
const limit=baseCfg.limit?Math.max(40,rawLimit):0;
return{
...baseCfg,
goal,
limit,
rain:!!(baseCfg.rain||fx.rain),
wind:!!(baseCfg.wind||fx.wind),
walk:fx.walk<1?fx.walk:(baseCfg.walk||1),
heat:!!fx.heat,
snow:!!fx.snow,
cold:!!(baseCfg.cold||fx.snow),
};
}
export function pickLifeTalk(S,job=S?.job||'site'){
const days=daysOf(job);
const pool=[];
for(let i=0;i<days.length;i++){
pool.push({id:`${job}:${i}:story`,dayIdx:i,kind:'story',data:days[i].story});
pool.push({id:`${job}:${i}:drama`,dayIdx:i,kind:'drama',data:days[i].drama});
}
const recent=Array.isArray(S?.recentTalks)?S.recentTalks.slice(-5):[];
const avail=pool.filter((item)=>!recent.includes(item.id));
const list=avail.length?avail:pool;
const cal=S?.cal||{year:1,season:0,day:1};
const idx=Math.floor(hash01(cal.year,cal.season,cal.day+recent.length*31,S?.seed||1)*list.length)%list.length;
const picked=list[idx];
if(S){
S.recentTalks=[...recent,picked.id].slice(-5);
}
return picked;
}
export function pickEveningTalk(S){
const recent=Array.isArray(S?.recentEvenings)?S.recentEvenings.slice(-3):[];
const indices=EVENINGS.map((_,i)=>i).filter((i)=>!recent.includes(i));
const list=indices.length?indices:EVENINGS.map((_,i)=>i);
const cal=S?.cal||{year:1,season:0,day:1};
const pickIdx=list[Math.floor(hash01(cal.year,cal.season,cal.day+97,S?.seed||1)*list.length)%list.length];
if(S){
S.recentEvenings=[...recent,pickIdx].slice(-3);
}
return EVENINGS[pickIdx];
}
