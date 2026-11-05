/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx}from'./state.js';
import{weekday,isRedDay}from'./calendar.js';
import{totalDays}from'./home_life.js';
import{WELL}from'./wellbeing.js';
export const PAPER_DOCS={
tennyu:{
id:'tennyu',
icon:'🏠',
jp:'転入届',
vi:'Đăng ký địa chỉ cư trú (転入届)',
place:'shiyakusho',
placeJp:'市役所',
placeVi:'Tòa thị chính 市役所',
startDay:1,
dueDay:14,
dueLabel:'Xuân 14 (trong 14 ngày từ khi đến)',
cost:0,
benefit:'Đã ghi địa chỉ ký túc xá lên mặt sau thẻ cư trú 在留カード',
desc:'Khi mới chuyển đến ký túc xá, phải mang thẻ cư trú (在留カード) ra 市役所 đăng ký địa chỉ trong vòng 14 ngày.',
},
hoken:{
id:'hoken',
icon:'🪪',
jp:'国民健康保険',
vi:'Nhận thẻ bảo hiểm y tế (国民健康保険)',
place:'shiyakusho',
placeJp:'市役所',
placeVi:'Tòa thị chính 市役所',
startDay:1,
dueDay:28,
dueLabel:'Xuân 28 (chưa có thì khám bệnh trả 100%)',
cost:0,
benefit:'Đi khám ở phòng khám クリニック hoặc bệnh viện chỉ trả 30% viện phí',
desc:'Thẻ bảo hiểm y tế giúp chỉ phải trả 30% viện phí khi đi khám ở phòng khám クリニック hoặc bệnh viện.',
},
yucho:{
id:'yucho',
icon:'🏦',
jp:'郵便局の口座開設',
vi:'Mở tài khoản bưu điện (郵便局の口座)',
place:'yubinkyoku',
placeJp:'郵便局',
placeVi:'Bưu điện 郵便局',
startDay:1,
dueDay:19,
dueLabel:'Xuân 19 (chưa có thì nhận lương tiền mặt, 🧠 −2/kỳ)',
cost:0,
benefit:'Nhận lương chuyển khoản tự động, không mất công đi nhận tiền mặt',
desc:'Mở sổ tài khoản 郵便局の口座 tại bưu điện để công ty chuyển khoản lương và gửi tiền về quê.',
},
juminzei:{
id:'juminzei',
icon:'🧾',
jp:'住民税納付',
vi:'Đóng thuế cư trú (住民税)',
place:'yubinkyoku',
placeJp:'郵便局・コンビニ',
placeVi:'Bưu điện 郵便局 / Konbini',
startDay:29,
dueDay:56,
dueLabel:'Hạ 28 (quá hạn phạt 延滞金 +10%)',
cost:12000,
benefit:'Hoàn tất nghĩa vụ thuế cư trú năm đầu, không bị phạt chậm 10%',
desc:'Giấy báo thuế cư trú (住民税) gửi tới hộp thư đầu mùa Hạ, cần mang ra bưu điện hoặc konbini đóng trước Hạ 28.',
},
zairyu:{
id:'zairyu',
icon:'💳',
jp:'在留カード更新',
vi:'Gia hạn thẻ cư trú (在留カード)',
place:'shiyakusho',
placeJp:'市役所',
placeVi:'Tòa thị chính 市役所',
startDay:57,
dueDay:104,
dueLabel:'Đông 20 Năm 1 (được nộp từ Thu 1)',
cost:4000,
benefit:'Gia hạn tư cách lưu trú hợp lệ để tiếp tục làm việc sang năm tiếp theo',
desc:'Hồ sơ gia hạn tư cách lưu trú và thẻ 在留カード (lệ phí tem 収入印紙 4.000 ¥). Tuyệt đối không được để quá hạn!',
},
};
export const HANKYU_COST=Math.round(WELL.DAY_PAY/2);
export const JUMINZEI_BASE=12000;
export const JUMINZEI_LATE_RATE=1.1;
const LAST_FIELDS={};
export function ensurePapers(S,migrated=false){
if(!S)return null;
if(!S.papers||typeof S.papers!=='object'){
S.papers={
tennyu:!!migrated,
hoken:!!migrated,
yucho:!!migrated,
juminzei:false,
zairyu:false,
tennyuWarned:false,
juminzeiLate:false,
zairyuWarned:false,
};
}
return S.papers;
}
export function isOpen(place,cal,min=600){
if(!cal)return false;
const wd=weekday(cal);
if(place==='shiyakusho'||place==='市役所'){
if(wd===5&&cal.day===13){
return min>=9*60&&min<=12*60;
}
if(wd>=0&&wd<=4&&!isRedDay(cal)){
return min>=8*60+30&&min<=17*60+15;
}
return false;
}
if(place==='yubinkyoku'||place==='郵便局'){
if(wd>=0&&wd<=4&&!isRedDay(cal)){
return min>=9*60&&min<=17*60;
}
return false;
}
return false;
}
export function paperTodo(S,cal=S?.cal){
const p=ensurePapers(S);
if(!p)return[];
const today=totalDays(cal);
const out=[];
for(const doc of Object.values(PAPER_DOCS)){
if(p[doc.id])continue;
if(today<doc.startDay)continue;
const daysLeft=doc.dueDay-today;
const isJuminzeiLate=doc.id==='juminzei'&&today>doc.dueDay;
const cost=isJuminzeiLate?Math.round(JUMINZEI_BASE*JUMINZEI_LATE_RATE):doc.cost;
out.push({
...doc,
cost,
daysLeft,
soon:daysLeft>=0&&daysLeft<=5,
urgent:daysLeft>=0&&daysLeft<=3,
overdue:daysLeft<0,
});
}
return out;
}
export function overdue(S,cal=S?.cal){
const p=ensurePapers(S);
const today=totalDays(cal);
const items=[];
const deltas=[];
let tennyuOverdue=false;
let juminzeiOverdue=false;
let zairyuOverdue=false;
let taxAmount=JUMINZEI_BASE;
if(p&&(!p.lastOverdueAlertDay||typeof p.lastOverdueAlertDay!=='object')){
p.lastOverdueAlertDay={};
}
const canAlert=(id)=>!p?.lastOverdueAlertDay||p.lastOverdueAlertDay[id]===undefined||(today-p.lastOverdueAlertDay[id])>=3;
if(p&&!p.tennyu&&today>PAPER_DOCS.tennyu.dueDay){
tennyuOverdue=true;
p.tennyuWarned=true;
if(canAlert('tennyu')){
p.lastOverdueAlertDay.tennyu=today;
deltas.push(...applyFx(S,{mental:-3}));
items.push({
id:'tennyu',
jp:'転入届期限超過',
vi:'Quá hạn 14 ngày đăng ký địa chỉ 転入届: có thư nhắc nhở từ 市役所 (🧠 −3).',
urgent:false,
});
}
}
if(p&&!p.juminzei&&today>PAPER_DOCS.juminzei.dueDay){
juminzeiOverdue=true;
p.juminzeiLate=true;
taxAmount=Math.round(JUMINZEI_BASE*JUMINZEI_LATE_RATE);
if(canAlert('juminzei')){
p.lastOverdueAlertDay.juminzei=today;
items.push({
id:'juminzei',
jp:'住民税延滞金 +10%',
vi:`Quá hạn nộp thuế cư trú 住民税: bị tính thêm tiền phạt chậm 延滞金 +10% (tổng ${taxAmount.toLocaleString('ja-JP')} ¥).`,
taxAmount,
urgent:false,
});
}
}
if(p&&!p.zairyu&&today>PAPER_DOCS.zairyu.dueDay){
zairyuOverdue=true;
p.zairyuWarned=true;
if(canAlert('zairyu')){
p.lastOverdueAlertDay.zairyu=today;
deltas.push(...applyFx(S,{boss:-30}));
items.push({
id:'zairyu',
jp:'在留カード期限切れ警告',
vi:'Quá hạn gia hạn 在留カード! Quản lý và nghiệp đoàn gọi khẩn cấp (👷 −30), bắt buộc phải đi làm thủ tục ngay lập tức!',
urgent:true,
});
}
}
return{
items,
notes:items.map((x)=>x.vi),
deltas,
tennyuOverdue,
juminzeiOverdue,
zairyuOverdue,
taxAmount,
};
}
export function takeHankyu(S){
const deltas=applyFx(S,{money:-HANKYU_COST,boss:-2});
return{ok:true,cost:HANKYU_COST,min:180,deltas};
}
export function waitTime(calOrDoc,minOrCal=540,maybeMin){
const cal=(calOrDoc&&typeof calOrDoc==='object'&&'day'in calOrDoc)?calOrDoc:minOrCal;
const min=typeof maybeMin==='number'?maybeMin:(typeof minOrCal==='number'?minOrCal:540);
const wd=cal&&typeof cal==='object'?weekday(cal):0;
if(wd===0&&min<11*60+30)return 55;
if(wd===5&&cal?.day===13)return 45;
if(min>=11*60+30&&min<=13*60+30)return 40;
return 25;
}
export function formFields(doc='tennyu',S={},rng=Math.random){
const playerName=(S?.name||'Minh').trim()||'Minh';
const baseFields=[
{
id:'氏名',
key:'name',
jp:'氏名（ローマ字・フリガナ）',
vi:'Họ và tên (ghi đúng trên thẻ cư trú)',
correct:`${playerName}（本人）`,
wrongs:['田中 太郎（代理人）','（空欄 — Để trống）'],
},
{
id:'住所',
key:'address',
jp:'住所（現住所）',
vi:'Địa chỉ nơi ở hiện tại',
correct:'埼玉県・さくら寮 203号室',
wrongs:['東京都・さくら駅北口 1-1','ベトナム・ハノイ市'],
},
{
id:'生年月日',
key:'dob',
jp:'生年月日（年・月・日）',
vi:'Ngày tháng năm sinh (theo thứ tự Năm – Tháng – Ngày)',
correct:'2003年05月12日',
wrongs:['12/05/2003（Viết ngược ngày/tháng/năm）','令和99年00月00日'],
},
{
id:'国籍',
key:'nation',
jp:'国籍・地域',
vi:'Quốc tịch',
correct:'ベトナム（越南）',
wrongs:['日本（Nhật Bản）','未記入（Không điền）'],
},
{
id:'在留資格',
key:'status',
jp:'在留資格',
vi:'Tư cách lưu trú',
correct:'技能実習（Thực tập sinh kỹ năng）',
wrongs:['短期滞在（Du lịch ngắn hạn）','留学（Du học sinh）'],
},
{
id:'署名',
key:'sign',
jp:'届出人署名',
vi:'Chữ ký xác nhận của người nộp đơn',
correct:`${playerName}（自署）`,
wrongs:['友達のサイン（Nhờ bạn ký hộ）','署名なし（Bỏ trống chữ ký）'],
},
];
const count=doc==='hoken'||doc==='juminzei'?5:6;
const picked=baseFields.slice(0,count).map((f)=>{
const opts=[f.correct,f.wrongs[0],f.wrongs[1]];
const shift=Math.floor((typeof rng==='function'?rng():0)*3)%3;
const rotated=opts.slice(shift).concat(opts.slice(0,shift));
const correctIdx=rotated.indexOf(f.correct);
return{
id:f.id,
key:f.key,
jp:f.jp,
vi:f.vi,
options:rotated,
correct:f.correct,
correctIdx,
};
});
if(typeof doc==='string'){
LAST_FIELDS[doc]=picked;
}
return picked;
}
export function checkForm(docOrFields,answers=[],S={}){
const fields=Array.isArray(docOrFields)
?docOrFields
:(LAST_FIELDS[docOrFields]||formFields(docOrFields,S));
const wrong=[];
const wrongIndices=[];
for(let i=0;i<fields.length;i++){
const f=fields[i];
const given=Array.isArray(answers)
?answers[i]
:(answers&&typeof answers==='object'?(answers[f.id]??answers[f.key]??answers[i]):undefined);
const isOk=given===f.correct||given===f.correctIdx;
if(!isOk){
wrong.push(f.id);
wrongIndices.push(i);
}
}
return{
ok:wrong.length===0,
wrong,
wrongIndices,
extraMin:wrong.length===0?0:30,
};
}
export function completePaper(S,docId,calOrWaitMin=S?.cal){
const p=ensurePapers(S);
const doc=PAPER_DOCS[docId];
if(!p||!doc)return{ok:false,why:'invalid',deltas:[]};
if(p[docId])return{ok:false,why:'done',deltas:[]};
const cal=(calOrWaitMin&&typeof calOrWaitMin==='object')?calOrWaitMin:S?.cal;
const min=typeof calOrWaitMin==='number'?calOrWaitMin:35;
const today=totalDays(cal);
const cost=docId==='juminzei'&&(p.juminzeiLate||today>doc.dueDay)
?Math.round(JUMINZEI_BASE*JUMINZEI_LATE_RATE)
:(doc.cost||0);
if(cost>0&&(S.money||0)<cost){
return{ok:false,why:'money',cost,deltas:[]};
}
p[docId]=true;
const fx={culture:4,mental:2};
if(cost>0)fx.money=-cost;
const deltas=applyFx(S,fx);
return{ok:true,doc,cost,min,jpGain:2,deltas};
}
