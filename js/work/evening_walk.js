/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{EVENING,createEvening,tick,talked,enterRoom,act,toBed}from'../core/evening.js';
import{
COOK_STEPS,goodOf,cookable,canCookTonight,cook,savingVsKonbini,
createCookStove,pressCookStep,releaseCookStep,tickCookStep,cookStepProgress,
}from'../core/market_rules.js';
import{yen,save}from'../core/state.js';
import{clock}from'../core/morning.js';
import{DORM}from'../gfx/dorm.js';
import{ROUTE}from'../gfx/site.js';
import{camera,isPortrait}from'../gfx/stage.js';
import{$,show,card,esc,deltaChips,deltaText,toast}from'../ui/ui.js';
import{CAREER,study,examReady,examQuestions,takeExam}from'../core/career.js';
import{JOBS}from'../core/jobs.js';
import{
SEASONS,nextDay,weatherOf,weatherFx,label as calLabel,
eventsOn,isMandatoryOff,isSaturdayWorkable,paydayOn,
}from'../core/calendar.js';
import{ensureHome,callHome,wash,dutyToday,clean}from'../core/home_life.js';
import{illWalkMul,buyMedicine}from'../core/clinic.js';
import{commuteMul,commuteExtraMin}from'../core/bicycle.js';
import{QUAKE_STEPS,SHELTER_QUESTION,quakeToday,resolveQuake,markStormReady,answerShelter}from'../core/disaster.js';
const BUTTONS=[
{id:'sleep',icon:'🛏️',label:'Đi ngủ',jp:'おやすみ',main:true},
{id:'cook',icon:'🍳',label:'Nấu cơm',jp:'自炊'},
{id:'bath',icon:'🛁',label:'Tắm',jp:'お風呂'},
{id:'call',icon:'📱',label:'Gọi về nhà',jp:'電話'},
{id:'wash',icon:'🧺',label:'Giặt đồ',jp:'洗濯'},
{id:'clean',icon:'🧹',label:'Dọn phòng',jp:'掃除当番'},
{id:'tv',icon:'📺',label:'Dự báo',jp:'天気予報'},
{id:'study',icon:'📚',label:'Học chứng chỉ',jp:'勉強'},
{id:'market',icon:'🛒',label:'Siêu thị',jp:'スーパー'},
{id:'run',icon:'🏃',label:'Chạy',jp:'走る'},
];
const SHOW={
toSpot:['market','run'],
toDorm:['market','run'],
talk:[],
room:['sleep','cook','bath','call','wash','clean','tv','study'],
bed:[],
};
const WALK=3.0,RUN_MUL=1.6;
const SPOT={
konbini:{...ROUTE.konbini,name:'Konbini サクラマート'},
dormFront:{...ROUTE.start,name:'Trước ký túc xá'},
};
export class EveningWalk{
constructor({controls,overhead,camRig}){
Object.assign(this,{controls,overhead,camRig});
this.dir=new THREE.Vector3();this.camPos=new THREE.Vector3();this.camLook=new THREE.Vector3();
this.active=false;this.ev=null;
this.btn={};this.mine=[];
for(const a of BUTTONS){
const b=document.createElement('button');b.type='button';b.className='act'+(a.main?' main':'');b.dataset.id=a.id;
b.innerHTML=`<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.action(a.id);});
this.btn[a.id]=b;this.mine.push(b);
}
this.cookBtn={};this.cookBars={};
this.cookMine=COOK_STEPS.map((s)=>{
const b=document.createElement('button');
b.type='button';
b.className='act hold-act';
b.dataset.id=s.id;
b.innerHTML=`<span class="hold-bar"></span><span class="i">${s.icon}</span><span class="l">${s.vi}</span><span class="j">${s.jp}</span>`;
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.pressCook(s.id);});
for(const ev of['pointerup','pointercancel','pointerleave']){
b.addEventListener(ev,()=>this.releaseCook(s.id));
}
this.cookBtn[s.id]=b;
this.cookBars[s.id]=b.querySelector('.hold-bar');
return b;
});
this.fade=document.createElement('div');this.fade.className='fade';$('app').appendChild(this.fade);
$('sh-quit').addEventListener('click',()=>this.active&&this.skip());
addEventListener('keydown',(e)=>{
if(!this.active)return;
if(this.cookState&&this.cookState.phase==='step'){
if(e.repeat)return;
const map={Digit1:'cut',Space:'cut',Digit2:'fry',Digit3:'plate'};
if(map[e.code]){e.preventDefault();this.pressCook(map[e.code]);}
return;
}
if(e.code==='Space'||e.code==='Digit1'){e.preventDefault();this.action('sleep');}
if(e.code==='Digit2'||e.code==='ShiftLeft')this.action(this.ev.phase==='room'?'bath':'run');
if(e.code==='Digit3')this.action('call');
if(e.code==='Digit4')this.action(this.ev.phase==='room'?'cook':'market');
});
addEventListener('keyup',(e)=>{
if(!this.active||!this.cookState||this.cookState.phase!=='step')return;
const map={Digit1:'cut',Space:'cut',Digit2:'fry',Digit3:'plate'};
if(map[e.code])this.releaseCook(map[e.code]);
});
}
_show(dayLabel){
const box=$('acts');
if(!this.saved)this.saved=[...box.children];
box.replaceChildren(...this.mine);
show('dayhud',false);show('shifthud');show('sh-gust',false);
$('sh-rank').textContent=dayLabel;
this.active=true;this.paused=false;this.busy=0;this.bestD=Infinity;this.stuckT=0;
this.running=false;this.lie=-1;this.toFuton=false;this.toMarket=false;this.cookState=null;this.quakeShakeT=0;clearInterval(this.quakeTimer);
if(this.stages?.dorm?.setSteam)this.stages.dorm.setSteam(false);
this.btn.run.classList.remove('on');
}
_hide(){
this.active=false;this.controls.enabled=false;clearInterval(this.quakeTimer);
if(this.stages?.dorm?.setSteam)this.stages.dorm.setSteam(false);
if(this.saved){$('acts').replaceChildren(...this.saved);this.saved=null;}
show('shifthud',false);show('sh-tip',false);
}
start({S,spot,stages,who,setStage,dayLabel,onArrive,onMarket=null,storage=null,from='gate'}){
Object.assign(this,{S,stages,who,setStage,onArrive,onMarket,storage,dayLabel});
this.ev=createEvening(spot);
this._show(dayLabel);
if(spot==='room')this.target={...ROUTE.start,name:'Ký túc xá さくら寮',enter:true};
else this.target=SPOT[spot];
if(from==='station')this.street('dusk',ROUTE.bounds.x1-0.5,24.6,-Math.PI/2);
else this.street('dusk',ROUTE.gate.x-0.5,ROUTE.gate.z+0.9,-Math.PI/2);
this.tip('お疲れ様でした！',spot==='room'?'Hết ca rồi. Về ký túc xá thôi (có thể ghé 🛒 Siêu thị).':`Hết ca rồi. Ghé ${this.target.name} trên đường về.`,5);
}
home({S,stages,who,setStage,dayLabel,onSleep,onMarket=null,storage=null,demoCook=false}){
Object.assign(this,{S,stages,who,setStage,onSleep,onMarket,storage,dayLabel});
if(!this.ev){this.ev=createEvening('room');this.ev.talked=true;this.ev.phase='room';this.ev.min=20*60+30;}
else if(!this.ev.talked)talked(this.ev);
if(S?.bike?.owned&&!S.bike.stolen&&!this.ev.bikeBonus){
this.ev.min=Math.max(18*60,this.ev.min-commuteExtraMin(S));
this.ev.bikeBonus=true;
}
this._show(dayLabel);
if(this.ev.phase==='room'){
this.room();
if(demoCook)setTimeout(()=>this.active&&this.action('cook'),250);
return;
}
this.target={...ROUTE.start,name:'Ký túc xá さくら寮',enter:true};
const p=this.who.player.holder.position;
this.street('night',p.x,p.z,this.who.player.yaw);
this.tip('ただいま','Trời tối rồi. Ghé 🛒 Siêu thị săn sale hoặc về ký túc xá nghỉ ngơi.',4);
}
resumeFromMarket(){
this._show(this.dayLabel);
const tone=this.ev.min>=19*60+45||this.ev.talked?'night':'dusk';
this.street(tone,ROUTE.market.x,ROUTE.market.z+0.45,-Math.PI/2);
this.tip('スーパー さくら','Đã rời siêu thị. Tiếp tục đi về ký túc xá.',3.5);
}
street(time,x,z,yaw){
const P=this.who.player,site=this.stages.site;
this.setStage('site');
const cal=this.S?.cal;
const fx=cal?weatherFx(weatherOf(cal,this.S?.seed||1)):{};
site.setWeather({rain:!!fx.rain,snow:!!fx.snow,wind:!!fx.wind});
site.setSeason?.(SEASONS[cal?.season??0]?.id||'spring');
site.setTime(time);site.ring.visible=false;
P.holder.rotation.x=0;P.holder.position.set(x,0,z);P.yaw=yaw;P.play('idle');P.unpinAll();
if(P.helmet)P.helmet.visible=false;
this.controls.reset({yaw:yaw+Math.PI,pitch:0.3,groundY:0,yawLimit:[-Infinity,Infinity]});
this.controls.enabled=true;this.controls.onTap=null;
$('sh-place').querySelector('span').textContent=this.target.name;
this.camRig.init=false;
this.ev.phase=this.ev.talked?'toDorm':'toSpot';
}
room(){
const P=this.who.player;
this.setStage('dorm');this.stages.dorm.setTime('night');
if(this.stages.dorm.setSteam)this.stages.dorm.setSteam(false);
P.look(this.S.look.colors);P.unpinAll();if(P.helmet)P.helmet.visible=false;
P.holder.rotation.x=0;P.holder.position.set(DORM.door.x-0.3,0,DORM.door.z);P.yaw=-Math.PI/2;P.play('idle');
enterRoom(this.ev);
this.controls.reset({yaw:0,pitch:0.55,groundY:0,yawLimit:[-0.7,0.7]});
this.controls.enabled=true;this.controls.onTap=null;
$('sh-place').querySelector('span').textContent='Ký túc xá さくら寮';
this.camRig.init=false;
if(this.ev.talked){
const hasCook=canCookTonight(this.S);
if(this.S?.lDay?.planDrugstore&&this.S?.ill){
delete this.S.lDay.planDrugstore;
const mRes=buyMedicine(this.S);
if(mRes.ok){
this.ev.min+=mRes.min;
if(this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
toast('💊 Đã ghé ドラッグストア さくら mua thuốc',`${mRes.note} (−${yen(mRes.cost)})`,5);
}
}
if(this.S?.life&&!this.S?.lDay?.quakeDone&&quakeToday(this.S,this.S.cal,this.S.seed)){
this.S.lDay.quakeDone=true;
setTimeout(()=>this.active&&this.triggerQuake(),550);
}
this.tip('ただいま！',hasCook?'Có nguyên liệu trong bếp! Bấm 🍳 Nấu cơm, 🛁 Tắm, 📱 Gọi về nhà, rồi 🛏️ Đi ngủ':'Tắm 🛁, gọi về nhà 📱, rồi lên futon đi ngủ 🛏️',6);
}else{
this.paused=true;this._hide();this.onArrive();
}
}
studyOrExam(){
const S=this.S,e=this.ev,P=this.who.player;
if(!S.career)return;
if(!examReady(S)){
if(e.studied)return;
const r=study(S);if(!r)return;
e.studied=true;e.min+=CAREER.LESSON_MIN;this.busy=1.4;
this.overhead.say(P,'頑張ろう… — Cố lên nào…',2.5);
toast(`📚 Học chứng chỉ ${r.lessons}/${CAREER.LESSONS}`,`🧠 ${CAREER.LESSON_MENTAL} · ${clock(e.min)}${r.ready ? ' · Đủ buổi, có thể thi!' : ''}`);
if(this.storage&&!S.flags.demo)save(S,this.storage);
return;
}
const target=S.career.target,qs=examQuestions(target),answers=[];
this.paused=true;
const ask=(i)=>{
if(i>=qs.length){
const r=takeExam(S,qs,answers);
if(this.storage&&!S.flags.demo)save(S,this.storage);
const J=JOBS[target];
card(r.pass
?`<div class="big">🎓</div><h2>Đỗ chứng chỉ! ${r.score}/${qs.length}</h2><p>Từ ngày mai bạn làm ${J.icon} <b>${esc(J.name)}</b> ở ${esc(J.place.toLowerCase())}, ${esc(J.area)}. Kỹ năng làm lại từ bậc 1.</p>`
:`<div class="big">📕</div><h2>Chưa đỗ: ${r.score}/${qs.length}</h2><p>Cần đúng ${CAREER.PASS} câu. Học thêm 1 buổi tối rồi thi lại (đóng lại lệ phí ${yen(CAREER.FEE)}).</p>`,
[{label:'Tiếp →',on:()=>{this.paused=false;}}]);
return;
}
const q=qs[i];
card(`<h2>📝 Câu ${i + 1}/${qs.length}</h2><p class="jpline" style="text-align:center;font-size:30px">${esc(q.jp)}</p><p style="text-align:center">nghĩa là gì?</p>`,
q.options.map((o)=>({label:o,on:()=>{answers.push(o);ask(i+1);}})));
};
ask(0);
}
tip(jp,vi,sec=6){
const t=$('sh-tip');t.querySelector('b').textContent=jp;t.querySelector('span').textContent=vi;
t.hidden=false;clearTimeout(this.tipT);this.tipT=setTimeout(()=>{t.hidden=true;},sec*1000);
}
hud(){
const e=this.ev,g=$('sh-goal');
const icon=e.min>=21*60?'🌙':'🌆';
let suffix=e.phase==='room'?(e.min>=EVENING.LATE?' · khuya rồi!':' · nghỉ ngơi'):' · về nhà';
if(this.cookState&&this.cookState.phase==='step'){
const st=this.cookState.stove;
const cur=COOK_STEPS[st.idx];
if(cur)suffix=` · Bấm giữ ${cur.icon} ${cur.vi} ${cur.jp} (${st.idx + 1}/${COOK_STEPS.length})`;
for(let i=0;i<COOK_STEPS.length;i++){
const s=COOK_STEPS[i];
const b=this.cookBtn[s.id];
const bar=this.cookBars[s.id];
b.classList.toggle('hot',i===st.idx);
const pct=i<st.idx?100:i===st.idx?Math.round(cookStepProgress(st)*100):0;
bar.style.width=`${pct}%`;
}
}
const txt=`${icon} ${clock(e.min)}${suffix}`;
if(g.textContent!==txt)g.textContent=txt;
g.classList.toggle('warn',e.min>=EVENING.LATE);
for(const a of BUTTONS){
if(a.id==='cook'){
this.btn.cook.hidden=e.phase!=='room'||!canCookTonight(this.S)||!!this.cookState;
}else if(a.id==='tv'){
this.btn.tv.hidden=e.phase!=='room'||!!this.cookState;
}else if(a.id==='bath'){
this.btn.bath.hidden=e.phase!=='room'||!!e.bath||!!this.cookState;
}else if(a.id==='call'){
this.btn.call.hidden=e.phase!=='room'||!!e.call||!!this.cookState;
}else if(a.id==='wash'){
this.btn.wash.hidden=e.phase!=='room'||!!e.washed||!!this.cookState;
}else if(a.id==='clean'){
this.btn.clean.hidden=e.phase!=='room'||!dutyToday(this.S,this.S?.cal)||!!this.S?.home?.cleanedToday||!!this.cookState;
}else if(a.id==='market'){
this.btn.market.hidden=!SHOW[e.phase]?.includes('market')||!this.onMarket;
}else{
this.btn[a.id].hidden=!SHOW[e.phase]?.includes(a.id);
}
}
this.btn.bath.disabled=e.bath||!!this.cookState;
{
const c=this.S&&this.S.career,b=this.btn.study;
b.hidden=e.phase!=='room'||!c||!!this.cookState;
if(c){const ready=examReady(this.S);b.querySelector('.i').textContent=ready?'📝':'📚';b.querySelector('.l').textContent=ready?'Thi chứng chỉ':`Học ${c.lessons}/${CAREER.LESSONS}`;b.disabled=!ready&&!!e.studied;}
}
this.btn.call.disabled=e.call||!!this.cookState;
this.btn.sleep.disabled=!!this.cookState;
for(const overflowId of['tv','wash','study']){
if(this.mine.filter((b)=>!b.hidden).length<=6)break;
if(this.btn[overflowId]&&!this.btn[overflowId].hidden)this.btn[overflowId].hidden=true;
}
const visCount=this.mine.filter((b)=>!b.hidden).length;
$('acts').classList.toggle('many',visCount>=5);
}
fadeTo(fn){
this.paused=true;this.fade.classList.add('on');
setTimeout(()=>{fn();this.fade.classList.remove('on');this.paused=false;},450);
}
action(id){
if(!this.active||this.paused||this.busy>0||this.lie>=0||this.cookState)return;
const e=this.ev,P=this.who.player;
if(id==='run'){this.running=!this.running;this.btn.run.classList.toggle('on',this.running);return;}
if(id==='market'){
if(!this.onMarket)return;
const pos=P.holder.position;
if(Math.hypot(pos.x-ROUTE.market.x,pos.z-ROUTE.market.z)<1.8){
this.enterMarket();
}else{
this.toMarket=true;
this.controls.target=new THREE.Vector3(ROUTE.market.x,0,ROUTE.market.z);
this.tip('スーパー さくら','Đang đi tới siêu thị… (19:30 giảm 20%, 20:00 giảm 50%)',4);
}
return;
}
if(id==='cook'){
this.openCookMenu();
return;
}
if(id==='tv'){this.openTvForecast();return;}
if(id==='wash'){this.openWashMenu();return;}
if(id==='clean'){this.doCleanDuty();return;}
if(id==='call'){this.openCallMenu();return;}
if(id==='study'){this.studyOrExam();return;}
if(id==='bath'||id==='call'){
const r=act(this.S,e,id);if(!r.ok)return;
this.busy=1.4;
if(id==='bath'){this.overhead.say(P,'ふぅ〜、気持ちいい… — Dễ chịu quá…',2.5);toast('🛁 Tắm nước nóng',`${deltaText(r.deltas)} · ${clock(e.min)}`);}
else{P.play('talk');this.overhead.say(P,'Mẹ ơi, con khỏe! — 元気だよ',3);toast('📱 Gọi video về nhà',`${deltaText(r.deltas)} · ${clock(e.min)}`);}
return;
}
if(id==='sleep'){
if(!toBed(e))return;
if(dutyToday(this.S,this.S?.cal)&&!this.S?.home?.cleanedToday){
ensureHome(this.S).missedDutyPending=true;
if(this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
}
show('sh-tip',false);
this.controls.target=new THREE.Vector3(DORM.bed.x,0,DORM.bed.z+0.3);
this.toFuton=true;
}
}
openTvForecast(){
this.paused=true;
const cal=this.S?.cal||{year:1,season:0,day:1};
const tom=nextDay(cal);
const w=weatherOf(tom,this.S?.seed||1);
const fx=weatherFx(w);
const evs=eventsOn(tom);
const notes=[];
if(paydayOn(tom))notes.push('💴 Ngày nhận lương định kỳ (給与明細)');
for(const ev of evs)notes.push(`${ev.icon} ${ev.jp} — ${ev.vi}`);
if(fx.dayOff)notes.push('🌀 Dự báo bão lớn: công ty cho nghỉ ở nhà');
else if(isMandatoryOff(tom))notes.push('🎌 Ngày mai được nghỉ');
else if(isSaturdayWorkable(tom))notes.push('👷 Thứ Bảy: có thể đăng ký tăng ca (+12.000 ¥) hoặc nghỉ');
const advice=fx.dayOff?'Bão lớn mưa to gió giật, ngày mai ở yên trong ký túc xá nhé.'
:fx.heat?'Trời nắng gắt trên 35°C, đi làm nhớ uống nước tránh say nắng (熱中症).'
:fx.snow?'Trời có tuyết rơi đường trơn, nhớ mặc ấm và đi cẩn thận.'
:fx.rain?'Ngày mai có mưa, nhớ mang theo ô và chú ý sàn trơn.'
:'Thời tiết thuận lợi cho công việc và đi lại ngày mai.';
card(`<h2>📺 Dự báo thời tiết · 明日の天気予報</h2>
      <div class="big">${fx.icon}</div>
      <p class="jpline" style="text-align:center">${esc(fx.jp)} — ${esc(fx.vi)}</p>
      <p style="text-align:center"><b>Ngày mai:</b> ${esc(calLabel(tom, fx))}</p>
      ${notes.length ? `<ul>${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      <p class="lesson">📡 ${esc(advice)}</p>`,(()=>{
const b=[];
if(fx.dayOff&&!this.S?.prep?.stormReady){
b.push({label:'🌀 Chuẩn bị đón bão: mua nước, dán kính, sạc pin (500 ¥)',on:()=>{
markStormReady(this.S,500);
if(this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
toast('🌀 Đã chuẩn bị đón bão!','Đã tích nước, dán băng keo cửa kính và sạc đầy pin dự phòng!');
this.openTvForecast();
}});
}
if(!this.S?.prep?.shelterKnown){
b.push({label:'🏫 Kiểm tra nơi sơ tán 避難所 gần nhà (🎌 +2)',on:()=>this.openShelterQuiz()});
}
b.push({label:'🧺 Tiện thể giặt đồ',cls:'ghost',on:()=>{show('modal',false);this.paused=false;this.openWashMenu();}});
b.push({label:'Đã xem →',on:()=>{show('modal',false);this.paused=false;}});
return b;
})());
}
openShelterQuiz(){
this.paused=true;
card(`<h2>🏫 Nơi sơ tán khẩn cấp · ${esc(SHELTER_QUESTION.jp)}</h2>
      <p>${esc(SHELTER_QUESTION.q)}</p>`,
SHELTER_QUESTION.options.map((opt,idx)=>({
label:opt,
on:()=>{
const r=answerShelter(this.S,idx);
if(this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
if(r.ok)toast('🏫 Chính xác! Trường học gần nhà là 避難所','🎌 Văn hóa +2 · Khi có lệnh sơ tán hãy tới trường công lập gần nhất',4.5);
else toast('💡 Chưa đúng!','Ở Nhật, trường tiểu học / trung học công lập gần khu dân cư là nơi sơ tán 避難所 chính thức.',4.5);
this.openTvForecast();
},
})));
}
triggerQuake(){
if(!this.active)return;
this.paused=true;
this.quakeShakeT=2.0;
const answers=[];
const runQuakeStep=(idx)=>{
clearInterval(this.quakeTimer);
if(idx>=QUAKE_STEPS.length){
const res=resolveQuake(this.S,answers[0],answers[1]);
if(this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
card(`<div class="big">${res.ok ? '😮‍💨' : '🚨'}</div>
          <h2>${res.ok ? 'An toàn qua cơn động đất!' : 'Bị va đập trong lúc động đất!'}</h2>
          <p>${res.ok
            ? 'Bạn đã bình tĩnh trốn dưới gầm bàn bảo vệ đầu, sau đó tắt bếp ga và mở hé cửa thoát hiểm đúng chuẩn phòng灾 Nhật Bản!'
            : 'Khi động đất xảy ra, tuyệt đối không chạy vội ra đường, không đứng gần kính và không đi thang máy! Hãy chui xuống gầm bàn rồi tắt lửa, mở cửa thoát hiểm.'}</p>
          <div class="deltas">${deltaChips(res.deltas)}</div>`,[
{label:'Bình tĩnh tiếp tục buổi tối →',on:()=>{show('modal',false);this.paused=false;this.hud();}},
]);
return;
}
const st=QUAKE_STEPS[idx];
let secLeft=st.countdownSec||4;
const pick=(optId)=>{
clearInterval(this.quakeTimer);
answers.push(optId);
if(idx===0)this.quakeShakeT=1.2;
runQuakeStep(idx+1);
};
card(`<div class="big">📳</div><h2>🚨 ${esc(st.title)}</h2>
        <p>${esc(st.prompt)}</p>
        <p class="jpline" id="quake-cd" style="text-align:center;color:var(--bad);font-size:22px">⏱ Còn ${secLeft} giây!</p>`,
st.options.map((o)=>({label:`${o.vi}`,on:()=>pick(o.id)})));
this.quakeTimer=setInterval(()=>{
secLeft-=1;
const el=$('quake-cd');
if(el)el.textContent=`⏱ Còn ${Math.max(0, secLeft)} giây!`;
if(secLeft<=0){
clearInterval(this.quakeTimer);
pick('timeout');
}
},1000);
};
runQuakeStep(0);
}
openCallMenu(){
const e=this.ev,P=this.who.player;
if(e.call)return;
this.paused=true;
const h=ensureHome(this.S);
const runCall=(kind)=>{
show('modal',false);
this.paused=false;
const r=callHome(this.S,kind);
if(!r.ok)return;
e.call=true;
e.min+=r.min;
this.busy=1.4;
P.play('talk');
this.overhead.say(P,kind==='video'?'Cả nhà ơi, con khỏe lắm! — みんな元気？':'Mẹ ơi, con khỏe! — 元気だよ',3);
toast(kind==='video'?'📹 Gọi video cả nhà':'📞 Gọi thoại về nhà',`${deltaText(r.deltas)} · Nhớ nhà còn ${r.homesick}/100 · ${clock(e.min)}`);
if(this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
this.hud();
};
card(`<h2>📱 Gọi điện về nhà · 家族に電話</h2>
      <p>Độ nhớ nhà hiện tại: <b>🏠 ${h?.homesick || 0}/100</b>${(h?.homesick || 0) >= 60 ? ' (đang nhớ nhà nhiều, dễ tụt tinh thần!)' : ''}.</p>
      <p class="lesson">Nghe giọng người thân giúp vơi nỗi nhớ quê sau ngày làm việc vất vả.</p>`,[
{label:'📞 Gọi thoại (30 phút · 🧠 +3, nhớ nhà −10)',on:()=>runCall('voice')},
{label:'📹 Gọi video cả nhà (60 phút · 🧠 +6, nhớ nhà −30)',on:()=>runCall('video')},
{label:'Đóng',cls:'ghost',on:()=>{show('modal',false);this.paused=false;}},
]);
}
openWashMenu(){
const e=this.ev,P=this.who.player;
this.paused=true;
const h=ensureHome(this.S);
const cal=this.S?.cal||{year:1,season:0,day:1};
const w=weatherOf(cal,this.S?.seed||1);
const fx=weatherFx(w);
const doWash=(way)=>{
show('modal',false);
this.paused=false;
const r=wash(this.S,way,w);
if(!r.ok){
toast('💴 Không đủ tiền giặt đồ',`Cần ${yen(r.cost)}`);
return;
}
e.washed=true;
e.min+=r.min;
this.busy=1.4;
this.overhead.say(P,'洗濯完了！ — Quần áo sạch thơm rồi!',2.5);
const dryNote=r.drying?' · Trời mưa nên phơi trong phòng qua đêm mới khô':' · Khô ráo sạch sẽ';
toast(way==='coin'?'🧺 Tiệm giặt コインランドリー':'🧺 Giặt máy ký túc xá',`${deltaText(r.deltas)}${dryNote} · ${clock(e.min)}`);
if(this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
this.hud();
};
const btns=[
{label:`🧺 Máy giặt ký túc xá (200 ¥ · 60 phút${fx.rain || fx.snow ? ' · phơi trong phòng qua đêm' : ''})`,on:()=>doWash('dorm')},
{label:'🏪 Ra tiệm コインランドリー (500 ¥ · 90 phút · sấy khô ngay)',on:()=>doWash('coin')},
];
if(dutyToday(this.S,cal)&&!h?.cleanedToday){
btns.push({label:'🧹 Trực nhật dọn phòng 掃除当番 (30 phút · 🤝 +2)',on:()=>{show('modal',false);this.paused=false;this.doCleanDuty();}});
}
btns.push({label:'📺 Xem dự báo thời tiết ngày mai',cls:'ghost',on:()=>{show('modal',false);this.paused=false;this.openTvForecast();}});
btns.push({label:'Đóng',cls:'ghost',on:()=>{show('modal',false);this.paused=false;}});
card(`<h2>🧺 Giặt quần áo · 洗濯</h2>
      <p>Độ bẩn quần áo đi làm: <b>👕 ${h?.dirty || 0}/100</b> · Thời tiết: <b>${fx.icon} ${esc(fx.vi)}</b></p>
      <p class="lesson">Quần áo bẩn từ 60 trở lên sẽ hiện nhắc nhở; nếu để tới 100 đi làm sẽ bị quản lý nhắc nhở (🧠 −3, 👷 −1).</p>`,btns);
}
doCleanDuty(){
const e=this.ev,P=this.who.player;
const r=clean(this.S);
if(!r.ok)return;
e.min+=r.min;
this.busy=1.3;
this.overhead.say(P,'掃除当番終わり！ — Dọn phòng trực nhật xong rồi!',2.5);
toast('🧹 Đã trực nhật 掃除当番',`${deltaText(r.deltas)} · ${clock(e.min)}`);
if(this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
this.hud();
}
enterMarket(){
if(!this.onMarket||this.paused)return;
this.toMarket=false;
this.controls.target=null;
this.paused=true;
this._hide();
this.onMarket(this.ev);
}
openCookMenu(){
const avail=cookable(this.S.pantry);
if(!avail.length)return;
this.paused=true;
const pantrySummary=(this.S.pantry||[])
.map((id)=>goodOf(id))
.filter(Boolean)
.map((g)=>`${g.icon} ${g.vi}`)
.join(', ');
const btns=avail.map((r)=>{
const ing=r.items.map((id)=>`${goodOf(id).icon} ${goodOf(id).vi}`).join(' + ');
const sav=savingVsKonbini(r);
return{
label:`${r.icon} ${r.vi} · ${r.jp} (${ing} · tiết kiệm ~${yen(sav)})`,
on:()=>{
show('modal',false);
this.paused=false;
this.beginCook(r);
},
};
});
btns.push({
label:'Đóng',
cls:'ghost',
on:()=>{show('modal',false);this.paused=false;},
});
card(`<h2>🍳 Tự nấu cơm tại ký túc xá · 自炊</h2>
      <p>Chọn món muốn nấu từ nguyên liệu trong tủ bếp:</p>
      <p class="lesson">🧺 Đang có: <b>${esc(pantrySummary)}</b><br>⏱ Nấu trên bếp ga gồm 3 bước (🔪 Thái → 🔥 Xào → 🍚 Dọn ra), tốn 15 phút.</p>`,btns);
}
beginCook(recipe){
show('sh-tip',false);
if(recipe.stove){
this.cookState={recipe,phase:'toStove',stove:createCookStove(recipe.id)};
this.controls.target=new THREE.Vector3(DORM.stove.x,0,DORM.stove.z);
}else{
this.cookState={recipe,phase:'toTable',stove:null};
this.controls.target=new THREE.Vector3(DORM.table.x-0.35,0,DORM.table.z+0.35);
}
this.hud();
}
enterStoveMode(){
const cs=this.cookState;
if(!cs)return;
cs.phase='step';
const P=this.who.player;
P.yaw=Math.PI;
P.play('idle');
$('acts').replaceChildren(...this.cookMine);
const first=COOK_STEPS[0];
this.tip('切る → 炒める → 盛り付け',`Bấm và giữ từng nút theo thứ tự: 1. ${first.icon} ${first.vi} → 2. 🔥 Xào → 3. 🍚 Dọn ra`,6);
this.hud();
}
pressCook(stepId){
const cs=this.cookState;
if(!cs||cs.phase!=='step')return;
const P=this.who.player;
const r=pressCookStep(cs.stove,stepId);
if(!r.ok){
if(r.reason==='wrong_order'){
P.reachTo=0;
P.wristSway=0;
if(this.stages.dorm?.setSteam)this.stages.dorm.setSteam(false);
this.overhead.say(P,`${r.jp} — ${r.vi}`,2.2);
this.tip('順番が違うよ',`Sai thứ tự rồi! Bước tiếp theo phải là: ${r.want.icon} ${r.want.vi} (${r.want.jp})`,3.5);
}
this.hud();
return;
}
P.yaw=Math.PI;
P.reachTo=0.7;
P.wristSway=stepId==='plate'?0.35:1.0;
if(this.stages.dorm?.setSteam)this.stages.dorm.setSteam(stepId==='fry');
this.overhead.say(P,`${r.step.icon} ${r.step.jp} — Đang ${r.step.vi.toLowerCase()}…`,2);
this.hud();
}
releaseCook(stepId){
const cs=this.cookState;
if(!cs||cs.phase!=='step')return;
if(stepId&&cs.stove.holding&&cs.stove.holding!==stepId)return;
releaseCookStep(cs.stove);
const P=this.who.player;
P.reachTo=0;
P.wristSway=0;
if(this.stages.dorm?.setSteam)this.stages.dorm.setSteam(false);
this.hud();
}
finishCookAtTable(){
const cs=this.cookState;
if(!cs)return;
const recipe=cs.recipe;
this.cookState=null;
const P=this.who.player;
P.reachTo=0;
P.wristSway=0;
if(this.stages.dorm?.setSteam)this.stages.dorm.setSteam(false);
$('acts').replaceChildren(...this.mine);
if(!recipe.stove)this.ev.min+=5;
const res=cook(this.S,this.S.pantry,recipe.id);
if(this.storage)save(this.S,this.storage);
P.yaw=Math.atan2(DORM.table.x-P.holder.position.x,DORM.table.z-P.holder.position.z);
P.play('idle');
this.busy=1.2;
this.overhead.say(P,`いただきます！ — ${recipe.vi} ngon quá!`,3);
if(res.ok){
toast(
`${recipe.icon} ${recipe.vi} · ${recipe.jp}`,
`${deltaText(res.delta)} · Tiết kiệm ~${yen(res.saved)} so với ăn konbini`,
4.5,
);
}
this.hud();
}
skip(){
if(this.paused)return;
const e=this.ev;
if(e.phase==='toSpot'){this.who.player.holder.position.set(this.target.x,0,this.target.z);}
else if(e.phase==='toDorm')this.fadeTo(()=>this.room());
else if(e.phase==='room'&&!this.cookState)this.action('sleep');
}
arrived(){
const e=this.ev;
if(this.target.enter){this.fadeTo(()=>this.room());return;}
this.paused=true;e.phase='talk';
this._hide();
this.onArrive();
}
update(dt){
if(!this.active||!this.ev)return;
const e=this.ev,P=this.who.player,pos=P.holder.position,c=this.controls;
const portrait=isPortrait();
let moving=false,speed=0;
if(this.lie>=0){
this.lie=Math.min(1,this.lie+dt/0.9);
const k=this.lie*this.lie*(3-2*this.lie),a=k*Math.PI/2,h=0.55;
const hipY=h-(h-DORM.lieY)*k,hipZ=DORM.bed.z+0.3;
P.yaw=0;P.holder.rotation.x=-a;
P.holder.position.set(DORM.bed.x,hipY-h*Math.cos(a),hipZ+h*Math.sin(a));
if(this.lie>=1){this.lie=-1;this.paused=true;setTimeout(()=>this.fadeTo(()=>{this._hide();this.ev=null;this.onSleep();}),700);}
}else if(!this.paused){
if(this.cookState&&this.cookState.phase==='step'){
P.yaw=Math.PI;
const tr=tickCookStep(this.cookState.stove,dt);
if(tr.advanced){
e.min+=tr.minDelta;
P.reachTo=0;
P.wristSway=0;
if(this.stages.dorm?.setSteam)this.stages.dorm.setSteam(false);
if(tr.done){
$('acts').replaceChildren(...this.mine);
this.cookState.phase='toTable';
this.controls.target=new THREE.Vector3(DORM.table.x-0.35,0,DORM.table.z+0.35);
}else{
const nxt=COOK_STEPS[this.cookState.stove.idx];
if(nxt)this.overhead.say(P,`✓ Xong ${tr.completedStep.vi}! Tiếp: ${nxt.icon} ${nxt.vi} (${nxt.jp})`,2.2);
}
}
}else if(this.busy>0){
this.busy-=dt;
if(this.busy<=0&&P.cur==='talk')P.play('idle');
}else{
let mag=c.input(this.dir);
if(mag<0.05&&c.target){
this.dir.set(c.target.x-pos.x,0,c.target.z-pos.z);
const d=this.dir.length();
if(d<this.bestD-0.02){this.bestD=d;this.stuckT=0;}else this.stuckT+=dt;
if(d<0.1||this.stuckT>0.4){c.target=null;mag=0;this.bestD=Infinity;this.stuckT=0;}else{this.dir.multiplyScalar(1/d);mag=1;}
}else if(mag>=0.05){
this.dir.multiplyScalar(1/Math.max(mag,1e-4));
if(!this.cookState)this.toMarket=false;
}
if(mag>=0.05){
moving=true;
const ox=pos.x,oz=pos.z;
const room=e.phase==='room'||e.phase==='bed',B=room?DORM.bounds:ROUTE.bounds,blocks=room?DORM.blocks:ROUTE.blocks;
const hasBike=!room&&!!(this.S?.bike?.owned&&!this.S.bike.stolen);
const streetMul=!room?(hasBike?commuteMul(this.S):(this.running?RUN_MUL:1)):1;
const sp=WALK*streetMul*illWalkMul(this.S)*(room?0.6:1)*mag*dt;
pos.x+=this.dir.x*sp;pos.z+=this.dir.z*sp;
for(const o of blocks){
const dx=pos.x-o.x,dz=pos.z-o.z,dd=Math.hypot(dx,dz),rr=o.r+0.3;
if(dd<rr&&dd>1e-4){pos.x=o.x+dx/dd*rr;pos.z=o.z+dz/dd*rr;}
}
pos.x=THREE.MathUtils.clamp(pos.x,B.x0,B.x1);pos.z=THREE.MathUtils.clamp(pos.z,B.z0,B.z1);
speed=dt>0?Math.hypot(pos.x-ox,pos.z-oz)/dt:0;
let dy=Math.atan2(this.dir.x,this.dir.z)-P.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
P.yaw+=dy*Math.min(1,dt*12);
tick(e,dt);
}
}
if(this.toMarket&&(!c.target||Math.hypot(pos.x-ROUTE.market.x,pos.z-ROUTE.market.z)<1.5)){
this.enterMarket();
return;
}
if(this.cookState){
if(this.cookState.phase==='toStove'&&(!c.target||Math.hypot(pos.x-DORM.stove.x,pos.z-DORM.stove.z)<0.32)){
c.target=null;
this.enterStoveMode();
}else if(this.cookState.phase==='toTable'&&(!c.target||Math.hypot(pos.x-(DORM.table.x-0.35),pos.z-(DORM.table.z+0.35))<0.35)){
c.target=null;
this.finishCookAtTable();
}
}
if((e.phase==='toSpot'||e.phase==='toDorm')&&!this.toMarket&&Math.hypot(pos.x-this.target.x,pos.z-this.target.z)<1.6)this.arrived();
if(this.toFuton&&!c.target){this.toFuton=false;this.lie=0;}
}
if(this.lie<0)P.moveAt(speed);
camera.fov=portrait?56:46;camera.updateProjectionMatrix();
if(e.phase==='room'||e.phase==='bed'){
const fx=pos.x*0.5,fz=THREE.MathUtils.clamp(pos.z,-1.2,1.4);
this.camPos.set(fx,2.9*(portrait?1.25:1),fz+(portrait?4.9:3.9));
this.camLook.set(fx*1.2,0.55,fz-0.7);
this.camRig.to(this.camPos,this.camLook,dt,4);
if(this.quakeShakeT>0){
this.quakeShakeT=Math.max(0,this.quakeShakeT-dt);
const sx=Math.sin(this.quakeShakeT*44)*0.14;
const sy=Math.cos(this.quakeShakeT*58)*0.08;
this.camRig.pos.x+=sx;
this.camRig.pos.y+=sy;
camera.position.copy(this.camRig.pos);
}
}else if(e.phase!=='talk'){
c.follow(P.yaw+Math.PI,moving,dt);
const dist=4.6*(portrait?1.15:1),cp=Math.cos(c.pitch);
this.camPos.set(pos.x+Math.sin(c.yaw)*dist*cp,1.5+Math.sin(c.pitch)*dist,pos.z+Math.cos(c.yaw)*dist*cp);
this.camLook.set(pos.x-Math.sin(c.yaw)*2,1.0,pos.z-Math.cos(c.yaw)*2);
this.camRig.to(this.camPos,this.camLook,dt,6);
}
if(this.active)this.hud();
}
}
