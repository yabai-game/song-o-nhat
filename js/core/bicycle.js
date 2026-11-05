/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx}from'./state.js';
export const BIKE={
USED_PRICE:8000,
NEW_PRICE:16000,
REGISTER_FEE:600,
COMMUTE_MUL:1.6,
EXTRA_MIN:10,
STOP_CHANCE_DAY:0.08,
STOP_CHANCE_NIGHT:0.14,
THEFT_CHANCE:0.03,
RECOVER_CHANCE:0.5,
};
export const bikeRules=[
{
id:'left',
q:'Ở Nhật Bản, khi đi xe đạp trên đường bạn phải đi về phía bên nào?',
options:[
'Đi bên trái làn đường (左側通行)',
'Đi bên phải làn đường như ở Việt Nam',
'Đi tự do cả hai bên tùy ý',
],
answer:'Đi bên trái làn đường (左側通行)',
correctIdx:0,
},
{
id:'umbrella_phone',
q:'Khi trời mưa hoặc có tin nhắn điện thoại lúc đang đạp xe thì phải làm gì?',
options:[
'Mặc áo mưa và dừng hẳn xe vào lề đường mới dùng điện thoại',
'Một tay cầm ô che, một tay lái xe đạp',
'Vừa đạp xe vừa cầm điện thoại xem tin nhắn',
],
answer:'Mặc áo mưa và dừng hẳn xe vào lề đường mới dùng điện thoại',
correctIdx:0,
},
{
id:'tandem',
q:'Bạn cùng phòng nhờ bạn đèo phía sau xe đạp thường (二人乗り) ra ga, có được phép không?',
options:[
'Không được, luật giao thông Nhật cấm chở 2 người trên xe đạp thường',
'Được phép nếu đi trong ngõ nhỏ vắng người',
'Được phép vào ngày nghỉ cuối tuần',
],
answer:'Không được, luật giao thông Nhật cấm chở 2 người trên xe đạp thường',
correctIdx:0,
},
{
id:'parallel',
q:'Khi đạp xe đi dạo cùng bạn bè, có được đi dàn hàng ngang song song (並進) để trò chuyện không?',
options:[
'Không được đi song song, phải đi nối đuôi thành một hàng dọc',
'Được đi song song 2 xe miễn không vượt đèn đỏ',
'Được đi song song nếu đường rộng',
],
answer:'Không được đi song song, phải đi nối đuôi thành một hàng dọc',
correctIdx:0,
},
{
id:'light',
q:'Quy định về việc bật đèn xe đạp (ライト点灯) vào buổi tối ở Nhật là gì?',
options:[
'Bắt buộc phải bật đèn trước khi đạp xe vào buổi tối',
'Chỉ cần bật đèn ở đoạn đường không có đèn cao áp',
'Không bắt buộc nếu đi chậm trên vỉa hè',
],
answer:'Bắt buộc phải bật đèn trước khi đạp xe vào buổi tối',
correctIdx:0,
},
];
export const BIKE_RULES=bikeRules;
export function buyBike(S,kind='used'){
if(!S)return{ok:false,why:'state'};
const isNew=kind==='new';
const cost=isNew?BIKE.NEW_PRICE:BIKE.USED_PRICE;
if((S.money||0)<cost){
return{ok:false,why:'money',cost,deltas:[]};
}
const deltas=applyFx(S,{money:-cost});
S.bike={
owned:true,
kind:isNew?'new':'used',
registered:false,
light:true,
lock:true,
locked:true,
stolen:false,
quizTried:false,
quizPassed:false,
};
return{ok:true,cost,bike:S.bike,deltas};
}
export function register(S){
if(!S||!S.bike||(!S.bike.owned&&!S.bike.stolen)){
return{ok:false,why:'no_bike',cost:BIKE.REGISTER_FEE,deltas:[]};
}
if(S.bike.registered){
return{ok:false,why:'already',cost:0,deltas:[]};
}
if((S.money||0)<BIKE.REGISTER_FEE){
return{ok:false,why:'money',cost:BIKE.REGISTER_FEE,deltas:[]};
}
const deltas=applyFx(S,{money:-BIKE.REGISTER_FEE});
S.bike.registered=true;
return{ok:true,cost:BIKE.REGISTER_FEE,registered:true,deltas};
}
export const registerBike=register;
export function commuteMul(S){
return S?.bike?.owned&&!S.bike.stolen?BIKE.COMMUTE_MUL:1.0;
}
export function commuteExtraMin(S){
return S?.bike?.owned&&!S.bike.stolen?BIKE.EXTRA_MIN:0;
}
export function policeStop(S,cal=S?.cal,night=false,rng=Math.random){
if(!S?.bike?.owned||S.bike.stolen){
return{stopped:false,min:0,deltas:[]};
}
const chance=night?BIKE.STOP_CHANCE_NIGHT:BIKE.STOP_CHANCE_DAY;
const roll=typeof rng==='function'?rng():0.5;
if(roll>=chance){
return{stopped:false,min:0,deltas:[]};
}
if(!S.bike.registered){
const deltas=applyFx(S,{boss:-3});
return{
stopped:true,
outcome:'unregistered',
min:30,
late:true,
jp:'防犯登録がされていませんね',
vi:'Xe chưa dán tem đăng ký chống trộm 防犯登録! お巡りさん giữ lại 30 phút xác minh nguồn gốc xe, làm bạn trễ giờ làm (👷 −3).',
deltas,
};
}
if(night&&!S.bike.light){
return{
stopped:true,
outcome:'no_light',
min:5,
late:false,
jp:'夜間はライトを点灯してくださいね',
vi:'Trời tối đạp xe quên bật đèn! お巡りさん nhắc nhở bạn bật đèn ngay để đảm bảo an toàn.',
deltas:[],
};
}
return{
stopped:true,
outcome:'ok',
min:1,
late:false,
jp:'ご協力ありがとうございます',
vi:'お巡りさん kiểm tra tem 防犯登録 và đèn xe hợp lệ: 「ご協力ありがとうございます」 (Chỉ mất 1 phút).',
deltas:[],
};
}
export function answerBikeRules(S,answers=[]){
let score=0;
for(let i=0;i<bikeRules.length;i++){
const q=bikeRules[i];
const a=Array.isArray(answers)?answers[i]:answers?.[q.id];
if(a===q.answer||a===q.correctIdx)score+=1;
}
const allRight=score===bikeRules.length;
const firstTry=!S?.bike?.quizTried;
if(S?.bike){
S.bike.quizTried=true;
if(allRight)S.bike.quizPassed=true;
}
let deltas=[];
if(allRight&&firstTry&&S){
deltas=applyFx(S,{culture:6});
}
return{
ok:allRight,
score,
total:bikeRules.length,
firstTry,
deltas,
};
}
export function checkBikeTheft(S,rng=Math.random){
if(!S?.bike?.owned||S.bike.stolen)return{stolen:false};
const isLocked=S.bike.lock!==false&&S.bike.locked!==false;
if(isLocked)return{stolen:false};
const roll=typeof rng==='function'?rng():0.5;
if(roll<BIKE.THEFT_CHANCE){
S.bike.stolen=true;
S.bike.owned=false;
return{
stolen:true,
jp:'自転車がなくなった！',
vi:'Quên khóa xe đạp! Khi quay ra thì chiếc xe đã bị ai đó lấy mất.',
};
}
return{stolen:false};
}
export function reportStolenBike(S,rng=Math.random){
if(!S?.bike)return{ok:false,recovered:false};
const registered=!!S.bike.registered;
const roll=typeof rng==='function'?rng():0.5;
const recovered=registered&&roll<BIKE.RECOVER_CHANCE;
if(recovered){
S.bike.stolen=false;
S.bike.owned=true;
S.bike.lock=true;
S.bike.locked=true;
}
return{
ok:true,
registered,
recovered,
vi:recovered
?'Nhờ có mã số 防犯登録, お巡りさん đã tìm thấy xe bị bỏ lại gần ga và trả lại cho bạn!'
:registered
?'Đã báo mã 防犯登録 cho お巡りさん nhưng hiện vẫn chưa tìm lại được xe.'
:'Vì xe chưa đăng ký 防犯登録 nên お巡りさん không có số khung để truy tìm giúp bạn.',
};
}
