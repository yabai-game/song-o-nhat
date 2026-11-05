/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{
MORNING,createMorning,clock,wake,tick,act,leaveRoom,arrive,
toPlatform,board,alight,nextTrain,followingTrain,lastSafeTrain,
missTrain,delayToday,takeDelayCert,
}from'../core/morning.js';
import{applyFx,save}from'../core/state.js';
import{KINDS,DAY_JP,TRASH_MIN,createSort,answer,result,rng}from'../core/trash_rules.js';
import{SEASONS,weekday,weatherOf,weatherFx}from'../core/calendar.js';
import{illWalkMul}from'../core/clinic.js';
import{commuteMul,commuteExtraMin,policeStop}from'../core/bicycle.js';
import{DORM}from'../gfx/dorm.js';
import{ROUTE}from'../gfx/site.js';
import{STATION}from'../gfx/station.js';
import{CARE_ROOM}from'../gfx/care.js';
import{BENTO_ROOM}from'../gfx/bento.js';
import{LOTUS_FIELD}from'../gfx/lotus.js';
import{camera,isPortrait}from'../gfx/stage.js';
import{$,show,card,esc,deltaChips,deltaText,toast}from'../ui/ui.js';
const BUTTONS=[
{id:'wake',icon:'⏰',label:'Dậy ngay',jp:'起きる',main:true},
{id:'snooze',icon:'😴',label:'Ngủ thêm 10 phút',jp:'あと10分'},
{id:'eat',icon:'🍙',label:'Ăn sáng',jp:'朝ご飯'},
{id:'trash',icon:'🗑️',label:'Phân loại rác',jp:'ゴミ分別'},
{id:'out',icon:'🚪',label:'Ra ngoài',jp:'行ってきます',main:true},
{id:'drop',icon:'🗑️',label:'Bỏ rác',jp:'ゴミ出し',main:true},
{id:'drink',icon:'🥤',label:'Mua nước',jp:'自販機'},
{id:'greet',icon:'🙋',label:'Chào',jp:'おはよう'},
{id:'run',icon:'🏃',label:'Chạy',jp:'走る'},
{id:'cert',icon:'📄',label:'Lấy 遅延証明書',jp:'遅延証明書'},
{id:'board',icon:'🚃',label:'Lên tàu',jp:'乗る',main:true},
];
const SHOW={
wake:['wake','snooze'],
room:['out','eat','trash'],
street:['drop','greet','drink','run'],
platform:['cert','board'],
ride:[],
walkin:['greet'],
};
const NURSE_AT={x:-1.4,z:2.6};
const WALK=3.0,RUN_MUL=1.6,NEAR=1.7;
function walkinFor(job,stages){
if(job==='bento'){
return{
stage:'bento',
start:BENTO_ROOM.start,
greeter:'foreman',
greeterAt:BENTO_ROOM.greeterAt,
bounds:BENTO_ROOM.bounds,
blocks:stages.bento?stages.bento.blocks:[],
place:'Xưởng cơm hộp さくら食品',
tip:'Vào xưởng, chào tổ trưởng Tanaka trước giờ họp đầu ca',
};
}
if(job==='lotus'){
return{
stage:'lotus',
start:LOTUS_FIELD.start,
greeter:'foreman',
greeterAt:LOTUS_FIELD.greeterAt,
bounds:LOTUS_FIELD.bounds,
blocks:stages.lotus?stages.lotus.blocks:[],
place:'Ruộng sen 霞ヶ浦 · Ibaraki',
tip:'Đi dọc bờ ruộng, chào quản lý Tanaka trước giờ họp đầu ca',
};
}
return{
stage:'care',
start:{x:0.6,z:CARE_ROOM.bounds.z1-0.2,yaw:Math.PI},
greeter:'nurse',
greeterAt:{x:NURSE_AT.x,z:NURSE_AT.z,yaw:0.5},
bounds:CARE_ROOM.bounds,
blocks:stages.care?stages.care.blocks:[],
place:'Viện dưỡng lão さくら苑',
tip:'Vào phòng ăn, chào chị Yamada trước giờ họp đầu ca',
};
}
export class MorningWalk{
constructor({controls,overhead,camRig}){
Object.assign(this,{controls,overhead,camRig});
this.dir=new THREE.Vector3();this.camPos=new THREE.Vector3();this.camLook=new THREE.Vector3();
this.active=false;this.running=false;
this.btn={};this.mine=[];
for(const a of BUTTONS){
const b=document.createElement('button');b.type='button';b.className='act'+(a.main?' main':'');b.dataset.id=a.id;
b.innerHTML=`<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.action(a.id);});
this.btn[a.id]=b;this.mine.push(b);
}
this.fade=document.createElement('div');this.fade.className='fade';$('app').appendChild(this.fade);
$('sh-quit').addEventListener('click',()=>this.active&&this.askSkip());
addEventListener('keydown',(e)=>{
if(!this.active)return;
const ph=this.st.phase;
if(e.code==='Space'||e.code==='Digit1'){e.preventDefault();this.action(ph==='wake'?'wake':ph==='room'?(this.near(DORM.table)?'eat':'out'):ph==='platform'?'board':ph==='walkin'?'greet':this.nearV()?'drink':'greet');}
if(e.code==='Digit2'||e.code==='ShiftLeft')this.action(this.st.phase==='wake'?'snooze':(this.st.phase==='platform'?'cert':'run'));
});
}
start({S,stages,who,setStage,dayLabel,onEnd,commute='walk',walkin=null,demoTrash=false,demoDelay=null,onResetCrowd=null,storage=null}){
Object.assign(this,{S,stages,who,setStage,onEnd,commute,demoTrash:!!demoTrash,demoDelay,onResetCrowd,storage});
this.walkin=walkin||walkinFor(S&&S.job,stages);
const cal=S?.cal||{year:1,season:0,day:((S?.story||0)%28)+1};
const weather=S?.cal?weatherOf(S.cal,S?.seed||1):'sunny';
const dInfo=commute==='train'?(demoDelay||delayToday(cal,weather,S?.seed||1)):null;
this.st=createMorning({delay:dInfo,useTimetable:commute==='train'});
this.active=true;this.paused=false;this.running=false;this.rise=-1;this.busy=0;this.bestD=Infinity;this.stuckT=0;
this.platT=0;this.rideT=-1;this.boarding=false;this.warned=false;this.greetT=-1;this.pendingGreet=false;
this.sorted=false;this.carryingBag=false;this.trashSt=null;this.pendingDrop=false;
this.ridingBike=false;this.policeChecked=false;
this.curTrain=null;this.doorCloseT=-1;this.arrivedSent=false;this.melodyShown=false;
this.hurryWarned=false;this.delayGateTipShown=false;
if(this.stages.site){
if(this.stages.site.trashRing)this.stages.site.trashRing.visible=false;
if(this.stages.site.setTrashDropped)this.stages.site.setTrashDropped(false);
}
const box=$('acts');this.saved=[...box.children];box.replaceChildren(...this.mine);
show('shifthud');show('sh-gust',false);show('sh-ticket',false);
$('sh-rank').textContent=dayLabel;
this.enterRoom();
if(this.demoTrash){
wake(this.S,this.st,false);
const P=this.who.player;
P.holder.rotation.x=0;
P.holder.position.set(DORM.bed.x,0,DORM.bed.z+0.85);
P.yaw=Math.PI/2;
this.controls.enabled=true;
this.controls.onTap=(pt)=>{if(Math.hypot(pt.x-DORM.door.x,pt.z-DORM.door.z)<1)this.pendingOut=true;};
this.tip('ゴミ分別・ゴミ出し','Bấm 🗑️ Phân loại rác (5 món), rồi mang túi rác ra cửa (🚪) bỏ vào điểm tập kết',7);
this.hud();
}
}
stop(){
this.active=false;this.controls.enabled=false;
clearTimeout(this.sortTimer);
const P=this.who.player;P.unpinAll();P.bendTo=0;P.reachTo=0;P.holder.rotation.x=0;P.holder.visible=true;
if(this.who.hung)this.who.hung.holder.visible=true;
if(this.stages.station)this.stages.station.sendTrain('reset');
if(this.stages.site&&this.stages.site.trashRing)this.stages.site.trashRing.visible=false;
$('acts').replaceChildren(...this.saved);
show('shifthud',false);show('sh-tip',false);show('sh-ticket',false);
this.btn.run.classList.remove('on');
}
trashKey(){
const S=this.S;
if(!S)return 0;
return S.life&&S.cal?`${S.cal.year}-${S.cal.season}-${S.cal.day}`:S.story;
}
trashDone(){
if(this.sorted)return true;
if(this.demoTrash)return false;
return!!(this.S&&this.S.flags&&this.S.flags.trashDay===this.trashKey());
}
tip(jp,vi,sec=6){
const t=$('sh-tip');t.querySelector('b').textContent=jp;t.querySelector('span').textContent=vi;
t.hidden=false;clearTimeout(this.tipT);this.tipT=setTimeout(()=>{t.hidden=true;},sec*1000);
}
hud(){
const s=this.st,g=$('sh-goal');
const isTrain=this.commute==='train';
const safeTrain=isTrain?lastSafeTrain(0):null;
const remSafe=safeTrain?(safeTrain.schedDep-s.min):99;
const hurry=isTrain&&(s.phase==='street'||s.phase==='room')&&remSafe>=0&&remSafe<=3;
const missedLastSafe=isTrain&&(s.phase==='street'||s.phase==='platform')&&s.min>(safeTrain?safeTrain.dep:MORNING.CHOREI);
const late=s.min>MORNING.CHOREI;
const close=s.min>MORNING.EARLY||hurry||missedLastSafe;
let trainPill='';
if(isTrain&&s.phase==='street'){
const nt=nextTrain(s.min,s.delay||0);
trainPill=` · 🚃 次 ${nt.label}${s.delay ? ` (+${s.delay}p)` : ''}${hurry ? ' · 急いで！' : ''}`;
if(hurry&&!this.hurryWarned){
this.hurryWarned=true;
this.tip('急いで！',`Còn ≤ 3 phút tới chuyến cuối kịp giờ (${safeTrain.label}) — nhanh chân ra ga!`,4.5);
}
}
const txt=`⏰ ${clock(s.min)} · 朝礼 ${clock(MORNING.CHOREI)}${trainPill}${late ? ' · muộn rồi!' : ''}`;
if(g.textContent!==txt)g.textContent=txt;
g.classList.toggle('warn',close);
const tk=$('sh-ticket');
if(tk){
if(s.phase==='platform'){
const t1=this.curTrain||nextTrain(s.min,s.delay||0);
const t2=followingTrain(t1.dep,s.delay||0);
const delayTag=s.delay>0?` · 🚨遅れ+${s.delay}分 (${s.delayReasonJp})`:(t1.crowded?' (混雑)':'');
const certTag=s.delayCert?' · 📄済':'';
const boardTxt=`🚉 次発 ${t1.label} 普通${delayTag} · 次々発 ${t2.label}${certTag}`;
if(tk.textContent!==boardTxt)tk.textContent=boardTxt;
tk.hidden=false;
}else{
tk.hidden=true;
}
}
for(const a of BUTTONS)this.btn[a.id].hidden=!SHOW[s.phase].includes(a.id);
if(s.phase==='room'){
this.btn.eat.disabled=s.ate;
this.btn.eat.classList.toggle('hot',!s.ate&&this.near(DORM.table,1.4));
const tDone=this.trashDone();
this.btn.trash.hidden=tDone;
this.btn.trash.classList.toggle('hot',!tDone&&this.demoTrash);
const hasBike=!!(this.S?.bike?.owned&&!this.S.bike.stolen);
this.btn.out.querySelector('.i').textContent=hasBike?'🚲':'🚪';
this.btn.out.querySelector('.l').textContent=hasBike?'Đạp xe đi làm':'Ra ngoài';
this.btn.out.querySelector('.j').textContent=hasBike?'自転車で出勤':'行ってきます';
this.btn.out.classList.toggle('hot',this.near(DORM.door)||(this.demoTrash&&this.carryingBag));
}else if(s.phase==='street'){
this.btn.run.hidden=!!this.ridingBike;
this.btn.drop.hidden=!this.carryingBag;
this.btn.drop.classList.toggle('hot',this.carryingBag&&this.near(ROUTE.trash,1.9));
this.btn.drink.disabled=s.drank;
this.btn.drink.classList.toggle('hot',!s.drank&&this.nearV());
const suzPos=this.who.suzuki?this.who.suzuki.holder.position:ROUTE.suzuki;
this.btn.greet.classList.toggle('hot',!s.greeted&&this.near(suzPos,2.2));
}else if(s.phase==='platform'){
const stopped=this.stages.station.trainState()==='stopped';
this.btn.board.disabled=!stopped;
this.btn.board.classList.toggle('hot',stopped);
const showCert=s.delay>0&&!s.delayCert;
this.btn.cert.hidden=!showCert;
this.btn.cert.classList.toggle('hot',showCert);
}else if(s.phase==='walkin'){
this.btn.greet.classList.toggle('hot',this.near(this.walkin.greeterAt,2.2));
}
}
near(pt,r=NEAR){const p=this.who.player.holder.position;return Math.hypot(p.x-pt.x,p.z-pt.z)<r;}
nearV(){return this.near(ROUTE.vending,1.9);}
fadeTo(fn){
this.paused=true;this.fade.classList.add('on');
setTimeout(()=>{fn();this.fade.classList.remove('on');this.paused=false;},450);
}
enterRoom(){
const P=this.who.player;
this.setStage('dorm');
this.stages.dorm.setTime('day');this.stages.dorm.onigiri.visible=true;
P.unpinAll();if(P.helmet)P.helmet.visible=false;if(P.cap)P.cap.visible=false;if(P.waders)P.waders.setVisible(false);
P.look(this.S.look.colors);
P.yaw=0;P.play('idle');P.holder.rotation.x=-Math.PI/2;
P.holder.position.set(DORM.bed.x,DORM.lieY,DORM.bed.z+0.85);
this.controls.reset({yaw:0,pitch:0.55,groundY:0,yawLimit:[-0.7,0.7]});
this.controls.enabled=false;
$('sh-place').querySelector('span').textContent='Ký túc xá さくら寮';
this.tip('ピピピ… 6:30','Chuông báo thức! Dậy luôn hay ngủ thêm 10 phút?',30);
this.overhead.say(P,'ピピピ…！',3);
this.hud();
this.camRig.init=false;
}
getUp(){
this.rise=0;
show('sh-tip',false);
}
enterStreet(){
const P=this.who.player,site=this.stages.site;
this.setStage('site');
const cal=this.S?.cal;
const fx=cal?weatherFx(weatherOf(cal,this.S?.seed||1)):{};
site.setWeather({rain:!!fx.rain,snow:!!fx.snow,wind:!!fx.wind});
site.setSeason?.(SEASONS[cal?.season??0]?.id||'spring');
site.setTime('day');site.ring.visible=false;
P.unpinAll();
if(this.carryingBag&&site.handBag){
site.handBag.visible=true;
P.pin(site.handBag,P.handR,-0.02,-0.06,0.06);
}
if(site.trashRing)site.trashRing.visible=!!this.carryingBag;
P.look({...this.S.look.colors,top:'#1f3148',bottom:'#1c2c42'});
P.holder.rotation.x=0;
P.holder.position.set(ROUTE.start.x,0,ROUTE.start.z);P.yaw=Math.PI/2;P.play('idle');
const{suzuki,hung}=this.who,train=this.commute==='train';
if(this.carryingBag){
suzuki.holder.position.set(ROUTE.trash.x+1.25,0,ROUTE.trash.z+0.55);
suzuki.yaw=-Math.PI/2;
}else{
suzuki.holder.position.set(ROUTE.suzuki.x,0,ROUTE.suzuki.z+0.6);
suzuki.yaw=Math.PI;
}
suzuki.play('idle');
hung.holder.position.set(ROUTE.hung.x,0,ROUTE.hung.z);hung.yaw=-Math.PI/2;hung.play('idle');
if(hung.helmet)hung.helmet.visible=true;
hung.holder.visible=!train;
this.controls.reset({yaw:-Math.PI/2,pitch:0.3,groundY:0,yawLimit:[-Infinity,Infinity]});
this.controls.enabled=true;
this.controls.onTap=(pt)=>{
if(this.carryingBag&&Math.hypot(pt.x-ROUTE.trash.x,pt.z-ROUTE.trash.z)<1.8){
this.controls.target=new THREE.Vector3(ROUTE.trash.x,0,ROUTE.trash.z);
this.pendingDrop=true;
}
};
if(this.carryingBag){
$('sh-place').querySelector('span').textContent='Trước ký túc xá · ゴミ集積所';
this.tip('ゴミ集積所','Lại gần vòng vàng cạnh cửa ký túc xá rồi bấm 🗑️ Bỏ rác',5);
}else if(train){
const dest=this.walkin.stage==='bento'?'xưởng':this.walkin.stage==='lotus'?'ruộng sen':'viện';
const nt=nextTrain(this.st.min,this.st.delay||0);
$('sh-place').querySelector('span').textContent='Đường ra ga さくら駅';
this.tip('駅はあっち',`Ra ga さくら駅 đón tàu (chuyến kế ${nt.label}, chuyến cuối kịp giờ 7:34) tới ${dest}`,5);
}else{
$('sh-place').querySelector('span').textContent='Đường tới công trường';
this.tip('行ってきます！','Đi bộ tới cổng công trường trước 7:45 (họp đầu ca 朝礼)',5);
}
this.camRig.init=false;
}
openSortCard(){
const st=this.trashSt;
if(!st||st.done)return;
this.paused=true;
const it=st.items[st.idx];
const tKind=KINDS[st.todayKind];
const dayJp=DAY_JP[((st.day|0)%5+5)%5];
const c=$('card');
c.innerHTML=`
      <div class="trash-head">
        <span>🗑️ Phân loại rác · <b>${st.idx + 1}/${st.items.length}</b></span>
        <span>Hôm nay (${dayJp}): <b>${tKind.icon} ${esc(tKind.jp)}</b></span>
      </div>
      <div class="trash-item" id="trash-item-box">
        <div class="ic">${it.icon}</div>
        <div class="jp">${esc(it.jp)}</div>
        <div class="vi">${esc(it.vi)}</div>
      </div>
      <div class="trash-tip" id="trash-fb" hidden></div>
      <div class="trash-grid" id="trash-grid"></div>
    `;
const grid=$('trash-grid');
for(const k of KINDS){
const b=document.createElement('button');
b.type='button';
b.className='trash-btn';
b.innerHTML=`<span class="ic">${k.icon}</span><span class="jp">${esc(k.jp)}</span><span class="vi">${esc(k.vi)}</span>`;
b.addEventListener('click',()=>this.pickTrashKind(k.id));
grid.appendChild(b);
}
show('modal',true);
}
pickTrashKind(kindId){
const st=this.trashSt,P=this.who.player;
if(!st||st.done)return;
for(const b of document.querySelectorAll('#trash-grid button'))b.disabled=true;
const r=answer(st,kindId);
this.st.min+=TRASH_MIN.ITEM;
this.hud();
P.reachTo=0.7;
setTimeout(()=>{if(this.active)P.reachTo=0;},220);
const box=$('trash-item-box'),fb=$('trash-fb');
if(r.ok){
box.classList.add('good');
const rightK=KINDS[r.item.kind];
fb.className='trash-tip good';
fb.textContent=`✓ Đúng rồi! ${rightK.icon} ${rightK.jp} (${rightK.vi})`;
fb.hidden=false;
clearTimeout(this.sortTimer);
this.sortTimer=setTimeout(()=>{
if(!this.active)return;
if(st.done)this.finishSort();
else this.openSortCard();
},360);
}else{
box.classList.add('bad');
fb.className='trash-tip';
fb.textContent=`❌ ${r.item.tip}`;
fb.hidden=false;
clearTimeout(this.sortTimer);
this.sortTimer=setTimeout(()=>{
if(!this.active)return;
if(st.done)this.finishSort();
else this.openSortCard();
},2000);
}
}
finishSort(){
show('modal',false);
this.paused=false;
this.sorted=true;
this.carryingBag=true;
if(this.S&&this.S.flags&&!this.demoTrash){
this.S.flags.trashDay=this.trashKey();
if(this.storage)save(this.S,this.storage);
}
const P=this.who.player,site=this.stages.site;
P.unpinAll();
if(site&&site.handBag){
site.handBag.visible=true;
P.pin(site.handBag,P.handR,-0.02,-0.06,0.06);
}
this.overhead.say(P,'ゴミをまとめた！',2);
toast('🗑️ Đã buộc túi rác',`Tốn ${TRASH_MIN.SORT} phút · ⏰ ${clock(this.st.min)} · Mang ra điểm tập kết trước nhà`);
this.tip('ゴミ集積所へ','Ra ngoài (🚪) rồi mang túi rác tới vòng vàng cạnh cửa ký túc xá',6);
this.hud();
}
enterPlatform(){
const P=this.who.player,stn=this.stages.station,s=this.st;
this.carryingBag=false;P.unpinAll();
if(this.stages.site&&this.stages.site.trashRing)this.stages.site.trashRing.visible=false;
this.setStage('station');stn.sendTrain('reset');
P.holder.position.set(STATION.start.x,STATION.floor,STATION.start.z);P.yaw=STATION.start.yaw;P.play('idle');
this.controls.reset({yaw:-Math.PI/2+0.5,pitch:0.3,groundY:STATION.floor,yawLimit:[-Infinity,Infinity]});
this.controls.enabled=true;this.controls.target=null;
this.platT=0;this.warned=false;this.boarding=false;this.gated=false;
this.curTrain=nextTrain(s.min,s.delay||0);
this.doorCloseT=-1;this.arrivedSent=false;this.melodyShown=false;this.delayGateTipShown=false;
$('sh-place').querySelector('span').textContent='Ga さくら駅 · sân ga 1番線';
if(s.delay>0){
this.tip(
`🚨 ただいま電車が${s.delay}分遅れています（${s.delayReasonJp}）`,
`Tàu đang chậm ${s.delay} phút (${s.delayReasonVi}) — nhớ bấm 📄 Lấy 遅延証明書 ở cổng soát vé!`,
7,
);
}else{
this.tip('改札を通って',`Qua cổng soát vé 改札, đứng chờ chuyến ${this.curTrain.label} ở vạch xanh 乗車位置 sau vạch vàng`,5);
}
this.camRig.init=false;
}
ride(){
const s=this.st,P=this.who.player,dest=this.walkin.stage==='bento'?'xưởng':this.walkin.stage==='lotus'?'ruộng sen':'viện';
const tr=this.curTrain||nextTrain(s.min,s.delay||0);
const bRes=board(s,tr,this.S);
if(!this.demoTrash&&this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
P.holder.visible=false;this.controls.enabled=false;this.controls.target=null;
this.stages.station.sendTrain('leave');this.rideT=0;
show('sh-tip',false);show('sh-ticket',false);
const crowdNote=bRes.crowd?.kind==='rush'
?' · 満員電車 đông nghẹt (🧠 −2)'
:bRes.crowd?.kind==='quiet'
?' · Tàu sớm vắng (🧠 +1)'
:'';
toast(`🚃 Chuyến ${tr.label} (${MORNING.TRAIN} phút)`,`Đi tàu ${MORNING.TRAIN} phút tới ga gần ${dest} · ⏰ ${clock(s.min)}${crowdNote}`,4);
}
greeterNpc(){
const g=this.walkin.greeter;
return typeof g==='string'?(this.who[g]||this.who.greeter):(g||this.who.greeter||this.who.nurse);
}
enterCare(){
const s=this.st,P=this.who.player,w=this.walkin,N=this.greeterNpc();
alight(s);this.rideT=-1;
this.setStage(w.stage);
if(w.stage==='bento'){
P.look({...this.S.look.colors,top:'#f2f2ee',bottom:'#f2f2ee'});
if(P.cap)P.cap.visible=true;
}else if(w.stage==='lotus'){
P.look({...this.S.look.colors,top:'#2b3a36',bottom:'#3f5a3c'});
if(P.waders)P.waders.setVisible(true);
const cal=this.S?.cal;
const fx=cal?weatherFx(weatherOf(cal,this.S?.seed||1)):{};
this.stages.lotus.setWeather({rain:!!fx.rain,snow:!!fx.snow,wind:!!fx.wind,cold:!!(fx.snow||cal?.season===3)});
this.stages.lotus.setSeason?.(SEASONS[cal?.season??0]?.id||'spring');
this.stages.lotus.setCollected(0);
this.stages.lotus.setSpray(false);
}
P.holder.visible=true;
P.holder.position.set(w.start.x,0,w.start.z);
P.yaw=w.start.yaw??Math.PI;
P.play('idle');
if(N){
this.stages[w.stage].scene.add(N.holder);
N.holder.position.set(w.greeterAt.x,0,w.greeterAt.z);
N.yaw=w.greeterAt.yaw??0.5;
N.play('idle');
}
this.controls.reset({yaw:0.25,pitch:0.36,groundY:0,yawLimit:[-Infinity,Infinity]});
this.controls.enabled=true;
$('sh-place').querySelector('span').textContent=w.place;
if(Array.isArray(w.tip))this.tip(w.tip[0],w.tip[1],5);
else this.tip('おはようございます',w.tip,5);
this.camRig.init=false;
}
greetNurse(){
const P=this.who.player,N=this.greeterNpc(),s=this.st;
if(this.greetT>=0)return;
this.greetT=0;this.busy=1.6;P.bendTo=0.45;setTimeout(()=>{P.bendTo=0;},700);
if(N){
P.yaw=Math.atan2(N.holder.position.x-P.holder.position.x,N.holder.position.z-P.holder.position.z);
N.yaw=Math.atan2(P.holder.position.x-N.holder.position.x,P.holder.position.z-N.holder.position.z);
N.play('talk');
const excused=s.delay>0&&s.delayCert&&Math.floor(s.min)>MORNING.CHOREI;
const line=excused
?'遅延証明書ありがとう。電車大変だったね。 — Cảm ơn giấy xác nhận tàu trễ nhé.'
:'おはよう！今日もよろしくね。 — Chào em! Hôm nay nhờ em nhé.';
setTimeout(()=>this.active&&this.overhead.say(N,line,3),600);
}
this.overhead.say(P,s.delay>0&&s.delayCert&&Math.floor(s.min)>MORNING.CHOREI?'すみません、遅延証明書です！':'おはようございます！',2.2);
}
action(id){
if(!this.active||this.paused)return;
if(this.rise>=0||(this.busy>0&&id!=='run'&&id!=='cert'))return;
const S=this.S,s=this.st,P=this.who.player;
if(id==='wake'||id==='snooze'){
if(s.phase!=='wake'||this.rise>=0)return;
const d=wake(S,s,id==='snooze');
toast(id==='snooze'?'😴 Ngủ thêm 10 phút…':'🌅 おはよう！',`Đánh răng, rửa mặt, thay đồ · ${clock(s.min)}${d.length ? ' · 🧠 +2' : ''}`);
this.getUp();
}else if(id==='eat'){
if(!this.near(DORM.table,1.4)){this.controls.target=new THREE.Vector3(DORM.table.x-1.0,0,DORM.table.z);this.pendingEat=true;return;}
const r=act(S,s,'eat');if(!r.ok)return;
this.stages.dorm.onigiri.visible=false;
this.busy=1.2;P.bendTo=0.5;
this.overhead.say(P,'いただきます！',2.5);
toast('🍙 Ăn sáng',`${deltaText(r.deltas)} · ⏰ ${clock(s.min)}`);
}else if(id==='trash'){
if(s.phase!=='room'||this.trashDone())return;
const day=S&&S.life&&S.cal?weekday(S.cal)%5:((S&&S.story)||0);
const seed=(day+1)*709+((S&&S.cal&&S.cal.day)||0)*37+((S&&S.seed)||0);
this.trashSt=createSort(day,rng(seed));
this.openSortCard();
}else if(id==='out'){
if(!this.near(DORM.door,2.4)){this.controls.target=new THREE.Vector3(DORM.door.x,0,DORM.door.z);this.pendingOut=true;return;}
const hasBike=!!(S?.bike?.owned&&!S.bike.stolen);
this.ridingBike=hasBike;
if(hasBike){
s.min=Math.max(MORNING.READY,s.min-commuteExtraMin(S));
toast('🚲 Đạp xe đi làm · 自転車通勤',`Đi nhanh ×1,6 · Dư thêm 10 phút buổi sáng (⏰ ${clock(s.min)})`);
}
this.overhead.say(P,hasBike?'自転車で行ってきます！':'行ってきます！',1.5);
leaveRoom(s);
this.fadeTo(()=>this.enterStreet());
}else if(id==='drop'){
if(s.phase!=='street'||!this.carryingBag)return;
if(!this.near(ROUTE.trash,1.9)){
this.controls.target=new THREE.Vector3(ROUTE.trash.x,0,ROUTE.trash.z);
this.pendingDrop=true;
return;
}
this.carryingBag=false;
this.pendingDrop=false;
P.unpinAll();
if(this.stages.site){
if(this.stages.site.trashRing)this.stages.site.trashRing.visible=false;
if(this.stages.site.setTrashDropped)this.stages.site.setTrashDropped(true);
}
P.yaw=0;
this.busy=0.9;
P.bendTo=0.55;
P.reachTo=0.8;
setTimeout(()=>{if(this.active){P.bendTo=0;P.reachTo=0;}},550);
s.min+=TRASH_MIN.DROP;
const res=result(this.trashSt);
const deltas=applyFx(S,res.fx);
if(!this.demoTrash&&this.storage)save(S,this.storage);
toast('🗑️ ゴミ出し完了',`${deltaText(deltas) || 'Đã đổ rác'} · ⏰ ${clock(s.min)}`,4);
this.overhead.say(P,'ゴミ出し完了！',2);
const suz=this.who.suzuki;
if(res.wrong.length>0){
if(suz){
suz.yaw=Math.atan2(P.holder.position.x-suz.holder.position.x,P.holder.position.z-suz.holder.position.z);
suz.play('talk');
setTimeout(()=>this.active&&suz.play('idle'),3000);
this.overhead.say(suz,'分別、ちゃんとしてね。 — Nhớ phân loại cẩn thận nhé.',4.5);
}
setTimeout(()=>{
if(!this.active)return;
this.paused=true;
const itemsHtml=res.wrong.map((w)=>{
const rightK=KINDS[w.kind];
return`<li><b>${w.icon} ${esc(w.jp)} (${esc(w.vi)})</b> → ${rightK.icon} ${esc(rightK.jp)} (${esc(rightK.vi)})<br><small style="color:var(--ink-dim)">${esc(w.tip)}</small></li>`;
}).join('');
card(`<h2>👵 Bà Suzuki nhắc nhở</h2>
            <p class="jpline">「分別、ちゃんとしてね。」</p>
            <p>Nhớ phân loại cẩn thận nhé. Các món phân loại chưa đúng:</p>
            <ul>${itemsHtml}</ul>
            <div class="deltas">${deltaChips(deltas)}</div>`,[
{label:this.demoTrash?'Về menu thử ca →':'Đã hiểu, đi làm thôi →',on:()=>{
this.paused=false;
if(this.demoTrash){this.stop();this.onEnd();}
}},
]);
},650);
}else if(this.demoTrash){
setTimeout(()=>{
if(!this.active)return;
this.paused=true;
card(`<div class="big">🗑️✨</div><h2>Phân loại chuẩn xác!</h2>
            <p>Bạn đã chia đúng cả 5 món rác và bỏ đúng điểm tập kết trước 8:00 sáng.</p>
            <div class="deltas">${deltaChips(deltas)}</div>`,[
{label:'Về menu thử ca →',on:()=>{this.stop();this.onEnd();}},
]);
},700);
}else{
const train=this.commute==='train';
const dest=this.walkin.stage==='bento'?'xưởng':this.walkin.stage==='lotus'?'ruộng sen':'viện';
$('sh-place').querySelector('span').textContent=train?'Đường ra ga さくら駅':'Đường tới công trường';
this.tip('ゴミ出し完了！',train?`Đã bỏ rác xong! Đi bộ tới biển 🚉 さくら駅 để tới ${dest} trước 7:45`:'Đã bỏ rác xong! Đi bộ tới cổng công trường trước 7:45',4.5);
}
}else if(id==='drink'){
if(!this.nearV()){this.tip('自販機','Máy bán nước ở ngay cạnh cửa ký túc xá',3);return;}
const r=act(S,s,'drink');
if(!r.ok){if(r.why==='money')this.tip('お金が足りない','Không đủ tiền mua nước',3);return;}
this.busy=0.8;P.yaw=Math.PI;
this.overhead.say(P,'ガコン！ 缶コーヒー',2);
toast('🥤 Cà phê lon',deltaText(r.deltas));
}else if(id==='cert'){
if(s.phase!=='platform'||!s.delay||s.delayCert)return;
takeDelayCert(s);
this.overhead.say(P,'遅延証明書をもらった！',2);
toast('📄 Đã lấy 遅延証明書',`Giấy chứng nhận tàu chậm ${s.delay} phút (${s.delayReasonJp}) — nộp cho công ty sẽ không bị tính đi muộn!`,4.5);
this.hud();
}else if(id==='board'){
if(s.phase!=='platform'||this.boarding||this.stages.station.trainState()!=='stopped')return;
this.boarding=true;this.controls.target=new THREE.Vector3(STATION.door.x,0,STATION.door.z);
this.overhead.say(P,'乗ります！',1.2);
}else if(id==='greet'&&s.phase==='walkin'){
const gAt=this.walkin.greeterAt;
if(!this.near(gAt,2.2)){this.controls.target=new THREE.Vector3(gAt.x+0.9,0,gAt.z+0.6);this.pendingGreet=true;return;}
this.greetNurse();
}else if(id==='greet'){
const suz=this.who.suzuki;
const suzPos=suz?suz.holder.position:ROUTE.suzuki;
if(!this.st.greeted&&this.near(suzPos,2.6)){
const r=act(S,s,'greet');
P.yaw=Math.atan2(suz.holder.position.x-P.holder.position.x,suz.holder.position.z-P.holder.position.z);
suz.yaw=Math.atan2(P.holder.position.x-suz.holder.position.x,P.holder.position.z-suz.holder.position.z);
suz.play('talk');setTimeout(()=>this.active&&suz.play('idle'),2500);
this.busy=1.2;P.bendTo=0.45;setTimeout(()=>{P.bendTo=0;},700);
this.overhead.say(P,'おはようございます！',2.5);
setTimeout(()=>this.active&&this.overhead.say(suz,'おはよう！いってらっしゃい！ — Chào cháu! Đi làm vui nhé!',3.5),700);
toast('🙋 Chào bà Suzuki',deltaText(r.deltas));
this.tip('おはようございます','Chào hỏi hàng xóm mỗi sáng giúp bạn hòa nhập nhanh hơn',4);
}else this.overhead.say(P,'おはようございます！',2);
}else if(id==='run'){
this.running=!this.running;this.btn.run.classList.toggle('on',this.running);
}
}
askSkip(){
if(this.paused)return;
if(this.demoTrash){this.stop();this.onEnd();return;}
this.paused=true;
const place=this.commute==='train'?(this.walkin.stage==='bento'?'xưởng cơm hộp':this.walkin.stage==='lotus'?'ruộng sen':'viện dưỡng lão'):'công trường';
card(`<h2>Bỏ qua buổi sáng?</h2><p>Đi thẳng tới ${place}, đến vừa kịp giờ.</p>`,[
{label:'Đi tiếp',on:()=>{this.paused=false;}},
{label:'Bỏ qua →',cls:'ghost',on:()=>{
this.st.phase='street';
if(this.commute==='train'&&!this.st.trainTaken)this.st.trainTaken='7:28';
this.st.min=Math.min(this.st.min,MORNING.CHOREI-3);
this.finish();
}},
]);
}
finish(){
const r=arrive(this.S,this.st),P=this.who.player;
this.carryingBag=false;P.unpinAll();
if(this.stages.site&&this.stages.site.trashRing)this.stages.site.trashRing.visible=false;
this.paused=true;
const train=this.commute==='train';
const head=r.kind==='early'
?'👍 Đến sớm 5 phút'
:r.kind==='ontime'
?'🙂 Vừa kịp giờ'
:r.kind==='excused'
?'📄 Đến muộn có 遅延証明書 (Được miễn trừ)'
:'😓 Đến muộn';
const lesson=train
?'Ở Nhật tàu chạy đúng từng phút; nên ra ga sớm 1 chuyến. Tàu chậm thì nhớ xin 遅延証明書 nộp cho công ty.'
:(r.kind==='late'
?'Ở Nhật, “đúng giờ” nghĩa là có mặt trước giờ hẹn. Đến muộn họp đầu ca là cả đội phải chờ bạn.'
:r.kind==='early'?'5分前行動 (gofun-mae kōdō): có mặt trước 5 phút — người Nhật rất quý điều này.':'Lần sau thử đến sớm hơn 5 phút nhé (5分前行動).');
const hungLine=r.kind==='late'?'遅いぞ！みんな待ってる。 — Muộn rồi! Mọi người đang chờ.':'おはよう！今日も頑張ろう。 — Chào em! Hôm nay cố lên nhé.';
if(!train){this.overhead.say(this.who.hung,hungLine,4);if(P.helmet)P.helmet.visible=true;}
const whereTxt=train?(this.walkin.stage==='bento'?'Bạn tới xưởng cơm hộp':this.walkin.stage==='lotus'?'Bạn tới ruộng sen':'Bạn tới viện dưỡng lão'):'Bạn tới cổng công trường';
const trainMetaHtml=train
?`<p>🚃 Chuyến đã đi: <b>${esc(r.trainTaken || '—')}</b> · Lỡ tàu: <b>${r.missed || 0} lần</b> · 遅延証明書: <b>${r.delayCert ? '✅ Có' : (r.delay > 0 ? '❌ Quên lấy' : 'Không')}</b></p>
         ${r.kind === 'excused' ? '<p class="jpline" style="text-align:center">「遅延証明書ありがとう。」 — Quản lý nhận giấy xác nhận tàu trễ, không trừ điểm chuyên cần.</p>' : ''}`
:'';
card(`<h2>${head}</h2><p>${whereTxt} lúc <b>${clock(r.min)}</b> · 朝礼 ${clock(MORNING.CHOREI)}.</p>
      ${trainMetaHtml}
      <div class="deltas">${deltaChips(r.deltas) || '<span class="delta">—</span>'}</div>
      <p class="lesson">${esc(lesson)}</p>`,[
{label:'Vào họp đầu ca →',on:()=>{this.stop();this.onEnd(r);}},
]);
}
platform(dt){
const stn=this.stages.station,P=this.who.player,pos=P.holder.position,s=this.st;
const state=stn.trainState();
this.platT+=dt;
if(!this.curTrain)this.curTrain=nextTrain(s.min,s.delay||0);
const tr=this.curTrain;
if(!this.gated&&pos.x>STATION.gateX){
this.gated=true;
this.overhead.say(P,'ピッ♪',1.2);
if(s.delay>0&&!s.delayCert&&!this.delayGateTipShown){
this.delayGateTipShown=true;
this.tip(
`🚨 ただいま電車が${s.delay}分遅れています（${s.delayReasonJp}）`,
'Bấm nút 📄 Lấy 遅延証明書 trước khi lên tàu để không bị trừ điểm đi muộn!',
6,
);
}
}
if(state==='away'){
const waitFast=this.gated&&(s.delayCert||!s.delay)&&(tr.arr-s.min>3);
tick(s,dt*(waitFast?2.5:1));
if(s.min>=tr.arr-0.6&&!this.arrivedSent){
this.arrivedSent=true;
stn.sendTrain('arrive');
this.tip('まもなく電車が参ります',`Chuyến ${tr.label} đang vào ga — đứng sau vạch vàng (黄色い線の内側)`,4);
}
}else if(state==='in'){
stn.update(dt*6);
if(s.min<tr.arr)tick(s,dt);
else s.min=tr.arr;
if(pos.z>STATION.line-0.15){
pos.z=STATION.line-0.35;
if(!this.warned){this.warned=true;this.tip('黄色い線の内側までお下がりください','Lùi vào sau vạch vàng! Tàu đang vào ga',3.5);}
}
}else if(state==='stopped'){
if(!this.melodyShown){
this.melodyShown=true;
s.min=Math.max(s.min,tr.arr);
this.overhead.say(P,'♪ 発車メロディー',2);
this.tip(`🚃 Chuyến ${tr.label} mở cửa (đứng 1 phút)`,`Bấm 🚃 Lên tàu (乗る) trước giờ chạy ${tr.depLabel}!`,4);
}
if(this.doorCloseT<0){
tick(s,dt*0.25);
if(s.min>=tr.dep){
s.min=tr.dep;
this.doorCloseT=0;
this.tip('🔔 ドアが閉まります',`Cửa tàu chuyến ${tr.label} sắp đóng! Nhanh chân lên tàu!`,3);
}
}else{
s.min=tr.dep;
this.doorCloseT+=dt;
if(this.doorCloseT>=3.0&&!this.boarding){
this.doorCloseT=-1;
stn.sendTrain('leave');
const mRes=missTrain(s,tr);
this.curTrain=mRes.next;
this.arrivedSent=false;
this.melodyShown=false;
this.paused=true;
card(`<div class="big">🚃💨</div><h2>電車が行ってしまった… — Lỡ tàu rồi!</h2>
            <p>Chuyến tàu <b>${tr.label}</b> đã đóng cửa và rời ga. Chuyến sau: <b>${mRes.next.label}</b>${s.delay ? ` (chậm +${s.delay}p → ${mRes.next.depLabel})` : ''}.</p>
            <p class="lesson">${mRes.next.safe
              ? `💡 Chuyến ${mRes.next.label} vẫn còn kịp giờ họp 朝礼 7:45 nếu bạn lên tàu ngay khi tàu tới.`
              : `⚠️ Đã qua chuyến cuối kịp giờ (7:34)! Đi chuyến ${mRes.next.label} sẽ tới nơi sau 7:45 (muộn họp 朝礼).`}</p>`,[
{
label:`Chờ chuyến ${mRes.next.label} →`,
on:()=>{
this.paused=false;
stn.sendTrain('reset');
if(this.onResetCrowd)this.onResetCrowd();
},
},
]);
return;
}
}
}
if(this.boarding&&!this.controls.target){
if(Math.hypot(pos.x-STATION.door.x,pos.z-STATION.door.z)<0.9){this.boarding=false;this.ride();}
else this.controls.target=new THREE.Vector3(STATION.door.x,0,STATION.door.z);
}
}
update(dt){
if(!this.active)return;
const s=this.st,P=this.who.player,pos=P.holder.position,c=this.controls;
const portrait=isPortrait();
if(this.rise>=0){
this.rise=Math.min(1,this.rise+dt/0.9);
const k=this.rise*this.rise*(3-2*this.rise),a=(1-k)*Math.PI/2,h=0.55;
const hipY=DORM.lieY+(h-DORM.lieY)*k,hipZ=DORM.bed.z+0.85-h;
P.holder.rotation.x=-a;
P.holder.position.set(DORM.bed.x,hipY-h*Math.cos(a),hipZ+h*Math.sin(a));
if(this.rise>=1){
this.rise=-1;P.holder.rotation.x=0;P.holder.position.y=0;P.yaw=Math.PI/2;
this.controls.enabled=true;
this.controls.onTap=(pt)=>{if(Math.hypot(pt.x-DORM.door.x,pt.z-DORM.door.z)<1)this.pendingOut=true;};
this.tip('朝ご飯は？','Ăn sáng (🍙), phân loại rác (🗑️) hoặc ra cửa đi làm (🚪)',5);
}
}
let moving=false,speed=0;
if(!this.paused&&s.phase!=='wake'&&this.rise<0&&!s.over){
if(this.busy>0)this.busy-=dt;
else{
P.bendTo=0;
let mag=c.input(this.dir);
if(mag<0.05&&c.target){
this.dir.set(c.target.x-pos.x,0,c.target.z-pos.z);
const d=this.dir.length();
if(d<this.bestD-0.02){this.bestD=d;this.stuckT=0;}else this.stuckT=(this.stuckT||0)+dt;
if(d<0.1||this.stuckT>0.4){c.target=null;mag=0;this.bestD=Infinity;this.stuckT=0;}else{this.dir.multiplyScalar(1/d);mag=1;}
}else if(mag>=0.05){this.dir.multiplyScalar(1/Math.max(mag,1e-4));this.bestD=Infinity;}
if(!c.target)this.bestD=Infinity;
if(mag>=0.05){
moving=true;
const ox=pos.x,oz=pos.z;
const room=s.phase==='room',plat=s.phase==='platform',inside=s.phase==='walkin';
const B=room?DORM.bounds:plat?STATION.bounds:inside?this.walkin.bounds:ROUTE.bounds;
const blocks=room?DORM.blocks:plat?STATION.blocks:inside?(this.walkin.blocks||[]):ROUTE.blocks;
const streetMul=s.phase==='street'?(this.ridingBike?commuteMul(this.S):(this.running?RUN_MUL:1)):1;
const sp=WALK*streetMul*illWalkMul(this.S)*(room?0.6:inside?0.75:1)*mag*dt;
pos.x+=this.dir.x*sp;pos.z+=this.dir.z*sp;
for(const o of blocks){
const dx=pos.x-o.x,dz=pos.z-o.z,dd=Math.hypot(dx,dz),rr=o.r+0.3;
if(dd<rr&&dd>1e-4){pos.x=o.x+dx/dd*rr;pos.z=o.z+dz/dd*rr;}
}
pos.x=THREE.MathUtils.clamp(pos.x,B.x0,B.x1);pos.z=THREE.MathUtils.clamp(pos.z,B.z0,B.z1);
speed=dt>0?Math.hypot(pos.x-ox,pos.z-oz)/dt:0;
let dy=Math.atan2(this.dir.x,this.dir.z)-P.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
P.yaw+=dy*Math.min(1,dt*12);
if(!plat)tick(s,dt);
}
}
if(this.pendingOut&&!c.target&&this.near(DORM.door,2.4)){this.pendingOut=false;this.action('out');}
if(this.pendingEat&&!c.target){this.pendingEat=false;if(this.near(DORM.table,1.4)){P.yaw=Math.PI/2;this.action('eat');}}
if(this.pendingDrop&&!c.target){this.pendingDrop=false;if(this.near(ROUTE.trash,1.9))this.action('drop');}
if(s.phase==='street'&&this.ridingBike&&!this.policeChecked&&pos.x>(ROUTE.start.x+ROUTE.gate.x)*0.5){
this.policeChecked=true;
const pStop=policeStop(this.S,this.S?.cal,false);
if(pStop.stopped){
s.min+=pStop.min;
if(this.storage&&!this.S?.flags?.demo)save(this.S,this.storage);
this.paused=true;
card(`<div class="big">👮</div><h2>お巡りさん kiểm tra xe đạp</h2>
            <p class="jpline" style="text-align:center">「${esc(pStop.jp)}」</p>
            <p>${esc(pStop.vi)}</p>
            ${pStop.deltas?.length ? `<div class="deltas">${deltaChips(pStop.deltas)}</div>` : ''}`,[
{label:'Tiếp tục đi làm →',on:()=>{this.paused=false;}},
]);
}
}
if(s.phase==='street'&&!this.demoTrash&&this.commute!=='train'&&this.near(ROUTE.gate,1.9))this.finish();
if(s.phase==='street'&&!this.demoTrash&&this.commute==='train'&&this.near(ROUTE.station,1.6)){toPlatform(s);this.fadeTo(()=>this.enterPlatform());}
if(s.phase==='platform')this.platform(dt);
if(this.pendingGreet&&!c.target){this.pendingGreet=false;if(this.near(this.walkin.greeterAt,2.2))this.greetNurse();}
if(s.phase==='walkin'&&this.greetT<0&&this.near(this.walkin.greeterAt,1.3))this.greetNurse();
}
if(this.greetT>=0&&!this.paused){this.greetT+=dt;if(this.greetT>2.4&&!s.over){this.greetT=-1;this.finish();}}
if(this.rideT>=0&&!this.paused){this.rideT+=dt;if(this.rideT>3.4){this.rideT=-1;this.fadeTo(()=>this.enterCare());}}
if(this.rise<0&&s.phase!=='wake'&&s.phase!=='ride')P.moveAt(speed);
camera.fov=portrait?56:46;camera.updateProjectionMatrix();
if(s.phase==='wake'||s.phase==='room'){
const fx=pos.x*0.5,fz=THREE.MathUtils.clamp(pos.z,-1,1.4);
this.camPos.set(fx,2.9*(portrait?1.25:1),fz+(portrait?4.9:3.9));
this.camLook.set(fx*1.2,0.55,fz-0.7);
if(s.phase==='wake'&&this.rise<0){this.camPos.set(DORM.bed.x+0.4,2.3,DORM.bed.z+2.6+(portrait?0.8:0));this.camLook.set(DORM.bed.x,0.1,DORM.bed.z-0.1);}
this.camRig.to(this.camPos,this.camLook,dt,4);
}else if(s.phase==='platform'){
this.camPos.set(pos.x-5.0,STATION.floor+2.0,THREE.MathUtils.clamp(pos.z+0.4,3.3,5.3));
this.camLook.set(pos.x+2,STATION.floor+0.9,pos.z+0.6);
c.yaw=Math.atan2(this.camPos.x-this.camLook.x,this.camPos.z-this.camLook.z);
this.camRig.to(this.camPos,this.camLook,dt,5);
}else if(s.phase==='ride'){
const tx=Math.max(this.stages.station.trainX()-4,-40);
this.camPos.set(tx+14,4.6,STATION.trackZ+13);this.camLook.set(tx,1.8,STATION.trackZ);
this.camRig.to(this.camPos,this.camLook,dt,3);
}else{
c.follow(P.yaw+Math.PI,moving,dt);
const dist=4.6*(portrait?1.15:1),cp=Math.cos(c.pitch);
this.camPos.set(pos.x+Math.sin(c.yaw)*dist*cp,pos.y+1.5+Math.sin(c.pitch)*dist,pos.z+Math.cos(c.yaw)*dist*cp);
this.camLook.set(pos.x-Math.sin(c.yaw)*2,pos.y+1.0,pos.z-Math.cos(c.yaw)*2);
this.camRig.to(this.camPos,this.camLook,dt,6);
}
this.hud();
}
}
