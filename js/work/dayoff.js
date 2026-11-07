/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{
PRAY_SEQ,PRAY_STEPS,createDayOff,tickDayOff,prayStep,drawOmikuji,tieOmikujiKyo,doHanami,
}from'../core/dayoff_rules.js';
import{
FESTIVALS,YATAI_ITEMS,visitFestival,buyYatai,goldfishRound,scoop,finishGoldfish,
bonOdoriBeats,judgeBonBeat,scoreBonOdori,rentYukata,launchFirework,watchFireworks,
doHalloween,doMomiji,eatToshikoshiSoba,ringJoyaBell,callNewYearEve,
drinkAmazake,receiveNengajo,festivalSky,
}from'../core/festival.js';
import{clock}from'../core/morning.js';
import{SEASONS,weatherOf,weatherFx}from'../core/calendar.js';
import{save}from'../core/state.js';
import{DORM}from'../gfx/dorm.js';
import{ROUTE}from'../gfx/site.js';
import{SHRINE}from'../gfx/shrine.js';
import{camera,isPortrait}from'../gfx/stage.js';
import{$,show,card,esc,deltaChips,deltaText,toast}from'../ui/ui.js';
const WALK=3.0,RUN_MUL=1.6;
function seatOnTarp(ch,x,z,yaw){
if(!ch)return;
ch.unpinAll();
ch.holder.rotation.x=0;
ch.sit=1;
ch.yaw=yaw;
ch.play('idle');
ch.holder.position.set(x,0,z);
if(ch.hipH===undefined){
ch.holder.updateMatrixWorld(true);
const hips=ch.root.getObjectByProperty('isBone',true);
const v=new THREE.Vector3();
(ch.hips||hips).getWorldPosition(v);
ch.hipH=v.y-ch.holder.position.y;
}
ch.holder.position.y=Math.max(-0.42,0.14-ch.hipH);
}
function standUp(ch){
if(!ch)return;
ch.sit=0;
ch.bendTo=0;
ch.reachTo=0;
ch.wristSway=0;
ch.holder.rotation.x=0;
ch.holder.position.y=0;
}
const BUTTON_DEFS=[
{id:'out',icon:'🚪',label:'Ra phố',jp:'お出かけ',main:true},
{id:'shrine',icon:'⛩️',label:'Tới đền',jp:'さくら神社',main:true},
{id:'coin',icon:'💴',label:'Bỏ tiền',jp:'お賽銭 5¥',main:true},
{id:'bow',icon:'🙇',label:'Cúi chào',jp:'礼'},
{id:'clap',icon:'👏',label:'Vỗ tay',jp:'拍手'},
{id:'omikuji',icon:'🎋',label:'Rút quẻ',jp:'おみくじ',main:true},
{id:'hanami',icon:'🌸',label:'Ngắm hoa',jp:'お花見',main:true},
{id:'yatai',icon:'🏮',label:'Quầy hàng',jp:'屋台',main:true},
{id:'kingyo',icon:'🐠',label:'Vớt cá',jp:'金魚すくい',main:true},
{id:'bon',icon:'💃',label:'Bon Odori',jp:'盆踊り',main:true},
{id:'hanabi',icon:'🎆',label:'Pháo hoa',jp:'打ち上げ',main:true},
{id:'yukata',icon:'🎇',label:'Hội pháo',jp:'花火大会',main:true},
{id:'joya',icon:'🔔',label:'Chuông 108',jp:'除夜の鐘',main:true},
{id:'festact',icon:'🎌',label:'Lễ hội',jp:'行事',main:true},
{id:'home',icon:'🏠',label:'Về nhà',jp:'帰る'},
{id:'run',icon:'🏃',label:'Chạy',jp:'走る'},
{id:'sleep',icon:'🛏️',label:'Đi ngủ',jp:'おやすみ',main:true},
];
function makeFestRing(r,x,z){
const m=new THREE.Mesh(
new THREE.RingGeometry(r-0.14,r,32),
new THREE.MeshBasicMaterial({color:0xffd54f,side:THREE.DoubleSide}),
);
m.rotation.x=-Math.PI/2;
m.position.set(x,0.032,z);
return m;
}
export class DayOff{
constructor({controls,overhead,camRig}){
Object.assign(this,{controls,overhead,camRig});
this.dir=new THREE.Vector3();
this.camPos=new THREE.Vector3();
this.camLook=new THREE.Vector3();
this.active=false;
this.paused=false;
this.running=false;
this.st=null;
this.poseT=0;
this.lie=-1;
this.toFuton=false;
this.toShrineSign=false;
this.bestD=Infinity;
this.stuckT=0;
this.btn={};
this.mine=BUTTON_DEFS.map((a)=>{
const b=document.createElement('button');
b.type='button';
b.className='act'+(a.main?' main':'');
b.dataset.id=a.id;
b.innerHTML=`<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.action(a.id);});
this.btn[a.id]=b;
return b;
});
this.fade=document.createElement('div');
this.fade.className='fade';
$('app').appendChild(this.fade);
$('sh-quit').addEventListener('click',()=>this.active&&this.skip());
addEventListener('keydown',(e)=>{
if(!this.active||this.paused)return;
const ph=this.st?.phase;
if(ph==='shrine'){
const spot=this.nearSpot();
if(spot==='pray'&&!this.st.prayed){
if(e.code==='Digit1'||e.code==='Space'){e.preventDefault();this.action('coin');}
else if(e.code==='Digit2'){e.preventDefault();this.action('bow');}
else if(e.code==='Digit3'){e.preventDefault();this.action('clap');}
return;
}
if(spot==='omikuji'&&!this.st.omikuji&&(e.code==='Digit1'||e.code==='Space')){
e.preventDefault();this.action('omikuji');return;
}
if(spot==='hanami'&&!this.st.hanami&&(e.code==='Digit1'||e.code==='Space')){
e.preventDefault();this.action('hanami');return;
}
}
if(e.code==='Space'||e.code==='Digit1'){
e.preventDefault();
if(ph==='roomDay')this.action('out');
else if(ph==='streetDay')this.action('shrine');
else if(ph==='shrine')this.action('home');
else if(ph==='roomNight')this.action('sleep');
}
});
}
start({
S,stages,who,setStage,storage=null,demo=false,hubReturn=false,
min=null,dayLabel=null,festival=null,directShrine=false,onNotify=null,onEnd,
}){
Object.assign(this,{
S,stages,who,setStage,storage,
demo:!!demo,hubReturn:!!hubReturn,festival:festival||null,onNotify,onEnd,
});
this.st=createDayOff(S);
if(typeof min==='number')this.st.min=min;
this.S.flags=this.S.flags||{};
this.S.flags.dayOff={...(this.S.flags.dayOff||{}),started:true};
if(this.festival){
visitFestival(this.S,this.festival);
}
if(this.storage)save(this.S,this.storage);
const box=$('acts');
if(!this.saved)this.saved=[...box.children];
box.replaceChildren(...this.mine);
show('dayhud',false);
show('shifthud');
show('sh-gust',false);
$('sh-rank').textContent=dayLabel||(demo?'🎮 Thử nhanh · 🎌 Ngày nghỉ ở đền':'🎌 Chủ nhật · 日曜日 (Ngày nghỉ)');
this.active=true;
this.paused=false;
this.running=false;
this.poseT=0;
this.lie=-1;
this.toFuton=false;
this.toShrineSign=false;
this.btn.run.classList.remove('on');
if(this.stages.shrine)this.stages.shrine.setKyoTied(false);
if(demo||directShrine){
this.enterShrine();
}else if(hubReturn){
this.enterStreetDay();
}else{
this.enterRoomDay();
}
}
_hide(){
this.active=false;
this.controls.enabled=false;
clearInterval(this.miniTimer);
this.miniTimer=null;
standUp(this.who?.player);
standUp(this.who?.hung);
standUp(this.who?.hoa);
if(this.stages?.shrine){
this.stages.shrine.fireworks?.(false);
this.stages.shrine.setFestival?.(null);
this.stages.shrine.setTime?.('day');
}
if(this.festRings)this.festRings.visible=false;
if(this.saved){
$('acts').replaceChildren(...this.saved);
this.saved=null;
}
show('shifthud',false);
show('sh-tip',false);
}
syncFestRings(){
const shrine=this.stages?.shrine;
if(!shrine?.scene||!SHRINE.festival)return;
if(!this.festRings){
const grp=new THREE.Group();
const map={};
for(const st of SHRINE.festival.stalls||[]){
const ring=makeFestRing(0.95,st.stand.x,st.stand.z);
grp.add(ring);
map[`stall:${st.id}`]=ring;
}
if(SHRINE.festival.yagura?.stand){
const rY=makeFestRing(1.2,SHRINE.festival.yagura.stand.x,SHRINE.festival.yagura.stand.z);
grp.add(rY);
map.yagura=rY;
}
if(SHRINE.festival.bell?.stand){
const rB=makeFestRing(1.15,SHRINE.festival.bell.stand.x,SHRINE.festival.bell.stand.z);
grp.add(rB);
map.bell=rB;
}
this.festRings=grp;
this.festRingMap=map;
}
if(this.festRings.parent!==shrine.scene){
shrine.scene.add(this.festRings);
}
const f=this.festival;
this.festRings.visible=Boolean(f);
if(!f)return;
const activeStalls=SHRINE.festival.show?.[f]||[];
for(const st of SHRINE.festival.stalls||[]){
const ring=this.festRingMap[`stall:${st.id}`];
if(ring)ring.visible=activeStalls.includes(st.id);
}
if(this.festRingMap.yagura)this.festRingMap.yagura.visible=f==='obon';
if(this.festRingMap.bell)this.festRingMap.bell.visible=f==='oomisoka';
}
fadeTo(fn){
this.paused=true;
this.fade.classList.add('on');
setTimeout(()=>{
fn();
this.fade.classList.remove('on');
this.paused=false;
},420);
}
tip(jp,vi,sec=6){
const t=$('sh-tip');
t.querySelector('b').textContent=jp;
t.querySelector('span').textContent=vi;
t.hidden=false;
clearTimeout(this.tipT);
if(sec>0)this.tipT=setTimeout(()=>{t.hidden=true;},sec*1000);
}
enterRoomDay(){
this.st.phase='roomDay';
const P=this.who.player;
this.setStage('dorm');
this.stages.dorm.setTime('day');
this.stages.dorm.onigiri.visible=false;
standUp(P);
P.look(this.S.look.colors);
P.holder.position.set(DORM.bed.x,0,DORM.bed.z+0.35);
P.yaw=0;
P.play('idle');
this.controls.reset({yaw:0,pitch:0.55,groundY:0,yawLimit:[-0.7,0.7]});
this.controls.enabled=true;
this.controls.target=null;
$('sh-place').querySelector('span').textContent='Ký túc xá さくら寮 · Chủ nhật';
this.tip('日曜日 · Ngày nghỉ','Hôm nay được nghỉ! Bấm 🚪 Ra phố để đi dạo tới đền ⛩ さくら神社.',6);
this.camRig.init=false;
this.hud();
}
enterStreetDay(){
this.st.phase='streetDay';
const P=this.who.player,site=this.stages.site;
this.setStage('site');
const cal=this.S?.cal;
const fx=cal&&!this.demo?weatherFx(weatherOf(cal,this.S?.seed||1)):{};
site.setWeather({rain:!!fx.rain,snow:!!fx.snow,wind:!!fx.wind});
site.setSeason?.(SEASONS[cal?.season??0]?.id||'spring');
site.setTime('day');
site.ring.visible=false;
standUp(P);
P.look(this.S.look.colors);
P.holder.position.set(ROUTE.start.x,0,ROUTE.start.z);
P.yaw=Math.PI/2;
P.play('idle');
this.controls.reset({yaw:-Math.PI/2,pitch:0.3,groundY:0,yawLimit:[-Infinity,Infinity]});
this.controls.enabled=true;
this.controls.target=null;
$('sh-place').querySelector('span').textContent='Đường tới ⛩ さくら神社';
this.tip('⛩ さくら神社 →','Đi dọc vỉa hè tới biển chỉ đường ⛩ さくら神社 → ở đầu phố (hoặc bấm ⛩️ Tới đền)',6);
this.camRig.init=false;
this.hud();
}
hasHanami(){
return(!this.festival||this.festival==='hanami')&&(!this.S?.cal||this.S.cal.season===0);
}
enterShrine(){
this.st.phase='shrine';
const P=this.who.player,shrine=this.stages.shrine;
this.setStage('shrine');
const cal=this.S?.cal;
const fx=cal&&!this.demo?weatherFx(weatherOf(cal,this.S?.seed||1)):{};
const festDef=this.festival?FESTIVALS[this.festival]:null;
shrine.setWeather?.({rain:!!fx.rain,snow:!!fx.snow,wind:!!fx.wind});
shrine.setSeason?.(SEASONS[cal?.season??0]?.id||'spring');
shrine.setFestival?.(this.festival||null);
const sky=festDef?festivalSky(festDef.time):'day';
shrine.setTime?.(sky);
shrine.fireworks?.(this.festival==='natsumatsuri');
if(sky!=='day'&&this.st.min<18*60+30){
this.st.min=19*60;
}
standUp(P);
P.look(this.S.look.colors);
P.holder.position.set(SHRINE.start.x,0,SHRINE.start.z);
P.yaw=SHRINE.start.yaw;
P.play('idle');
const showHanami=this.hasHanami();
if(this.who.hung){
if(showHanami){
this.stages.shrine.scene.add(this.who.hung.holder);
if(this.who.hung.helmet)this.who.hung.helmet.visible=false;
seatOnTarp(this.who.hung,SHRINE.seats.hung.x,SHRINE.seats.hung.z,SHRINE.seats.hung.yaw);
}else{
this.who.hung.holder.removeFromParent();
}
}
if(this.who.hoa){
if(showHanami){
this.stages.shrine.scene.add(this.who.hoa.holder);
seatOnTarp(this.who.hoa,SHRINE.seats.hoa.x,SHRINE.seats.hoa.z,SHRINE.seats.hoa.yaw);
}else{
this.who.hoa.holder.removeFromParent();
}
}
shrine.syncRings(this.st,showHanami);
this.syncFestRings();
this.controls.reset({yaw:0,pitch:0.38,groundY:0,yawLimit:[-Infinity,Infinity]});
this.controls.enabled=true;
this.controls.target=null;
const placeTitle=festDef
?`Đền さくら神社 · ${festDef.icon} ${festDef.jp}`
:'Đền さくら神社';
$('sh-place').querySelector('span').textContent=placeTitle;
if(festDef){
this.tip(
`${festDef.icon} ${festDef.jp} · ${festDef.vi}`,
'Bước vào các vòng vàng ở quầy 屋台, sảnh lễ hoặc bấm nút lễ hội bên dưới để tham gia!',
7,
);
}else{
this.tip('さくら神社','Bước vào 3 vòng vàng: 🙏 Đi lễ (二礼二拍手一礼) · 🎋 Rút quẻ (100¥) · 🌸 Ngắm hoa cùng anh Hùng & chị Hoa',7);
}
this.camRig.init=false;
this.hud();
}
enterStreetNight(){
this.st.phase='streetNight';
if(this.st.min<19*60)this.st.min=19*60+30;
const P=this.who.player,site=this.stages.site;
standUp(this.who.hung);
standUp(this.who.hoa);
this.setStage('site');
site.setWeather({});
site.setTime('night');
site.ring.visible=false;
standUp(P);
P.holder.position.set(ROUTE.shrine.x,0,ROUTE.shrine.z);
P.yaw=-Math.PI/2;
P.play('idle');
this.controls.reset({yaw:Math.PI/2,pitch:0.3,groundY:0,yawLimit:[-Infinity,Infinity]});
this.controls.enabled=true;
this.controls.target=new THREE.Vector3(ROUTE.start.x,0,ROUTE.start.z);
$('sh-place').querySelector('span').textContent='Đường về ký túc xá さくら寮';
this.tip('帰り道','Trời đã tối, đi bộ về ký túc xá nghỉ ngơi chuẩn bị cho tuần mới.',5);
this.camRig.init=false;
this.hud();
}
enterRoomNight(){
this.st.phase='roomNight';
const P=this.who.player;
this.setStage('dorm');
this.stages.dorm.setTime('night');
standUp(P);
P.holder.position.set(DORM.door.x-0.3,0,DORM.door.z);
P.yaw=-Math.PI/2;
P.play('idle');
this.controls.reset({yaw:0,pitch:0.55,groundY:0,yawLimit:[-0.7,0.7]});
this.controls.enabled=true;
this.controls.target=null;
$('sh-place').querySelector('span').textContent='Ký túc xá さくら寮 · Tối Chủ nhật';
this.tip('おやすみ','Ngày nghỉ thật vui! Bấm 🛏️ Đi ngủ để tổng kết tuần đầu tiên.',6);
this.camRig.init=false;
this.hud();
}
nearSpot(){
if(!this.st||this.st.phase!=='shrine')return null;
const p=this.who.player.holder.position;
for(const[k,sp]of Object.entries(SHRINE.spots)){
if(Math.hypot(p.x-sp.x,p.z-sp.z)<sp.r)return k;
}
return null;
}
nearFestSpot(){
if(!this.st||this.st.phase!=='shrine'||!this.festival||!SHRINE.festival)return null;
const p=this.who.player.holder.position;
const f=this.festival;
const activeStalls=SHRINE.festival.show?.[f]||[];
for(const st of SHRINE.festival.stalls||[]){
if(!activeStalls.includes(st.id))continue;
if(Math.hypot(p.x-st.stand.x,p.z-st.stand.z)<1.15)return{kind:'stall',id:st.id,jp:st.jp,stand:st.stand};
}
if(f==='obon'&&SHRINE.festival.yagura?.stand){
const y=SHRINE.festival.yagura.stand;
if(Math.hypot(p.x-y.x,p.z-y.z)<1.35)return{kind:'yagura',id:'yagura',jp:'盆踊り櫓',stand:y};
}
if(f==='oomisoka'&&SHRINE.festival.bell?.stand){
const b=SHRINE.festival.bell.stand;
if(Math.hypot(p.x-b.x,p.z-b.z)<1.3)return{kind:'bell',id:'bell',jp:'除夜の鐘',stand:b};
}
return null;
}
_setBtnText(id,icon,label,jp){
const b=this.btn[id];
if(!b)return;
const key=`${icon}|${label}|${jp}`;
if(b.dataset.labelKey===key)return;
b.dataset.labelKey=key;
b.innerHTML=`<span class="i">${icon}</span><span class="l">${label}</span><span class="j">${jp}</span>`;
}
hud(){
const st=this.st;
if(!st)return;
const ph=st.phase;
const icon=st.min>=18*60+30?'🌙':'☀️';
const showHanami=this.hasHanami();
const statusParts=[
`🙏 ${st.prayed ? '✓' : '—'}`,
`🎋 ${st.omikuji || '—'}`,
];
if(showHanami)statusParts.push(`🌸 ${st.hanami ? '✓' : '—'}`);
if(this.festival){
const fDef=FESTIVALS[this.festival];
if(fDef)statusParts.unshift(`${fDef.icon} ${fDef.jp}`);
}
const g=$('sh-goal');
const txt=`${icon} ${clock(st.min)} · ${statusParts.join(' · ')}`;
if(g.textContent!==txt)g.textContent=txt;
const spot=this.nearSpot();
const fSpot=this.nearFestSpot();
const visibleIds=new Set();
let hotFestId=null;
if(ph==='roomDay'){
visibleIds.add('out');
}else if(ph==='streetDay'){
visibleIds.add('shrine');
visibleIds.add('run');
}else if(ph==='shrine'){
if(spot==='pray'&&!st.prayed){
visibleIds.add('coin');
visibleIds.add('bow');
visibleIds.add('clap');
const want=PRAY_SEQ[st.prayIdx];
const stepInfo=PRAY_STEPS[want];
this.tip(
'二礼二拍手一礼 · Đi lễ (5 ¥)',
`Bước ${st.prayIdx + 1}/6: ${stepInfo.icon} ${stepInfo.hint} (Bỏ tiền → 2 Cúi → 2 Vỗ tay → 1 Cúi)`,
0,
);
}else if(spot==='omikuji'&&!st.omikuji){
visibleIds.add('omikuji');
}else if(this.festival&&fSpot){
if(fSpot.kind==='stall'){
if(fSpot.id==='kingyo'){
visibleIds.add('kingyo');
hotFestId='kingyo';
this.tip('金魚すくい · Vớt cá vàng (300 ¥)','Bấm 🐠 Vớt cá để dùng vợt giấy ポイ vớt cá vàng đem về nuôi!',0);
}else{
const it=YATAI_ITEMS[fSpot.id];
if(it){
const shortVi={takoyaki:'Takoyaki',yakisoba:'Yakisoba',kakigori:'Đá bào',ringo_ame:'Kẹo táo',amazake:'Rượu ngọt',soba:'Mì Soba'}[fSpot.id]||it.vi;
this._setBtnText('yatai',it.icon,shortVi,`${it.jp} ${it.cost}¥`);
visibleIds.add('yatai');
hotFestId='yatai';
this.tip(`${it.icon} ${it.jp} · ${it.vi}`,`Giá: ${it.cost.toLocaleString()} ¥ — Bấm để thưởng thức tại quầy!`,0);
}
}
}else if(fSpot.kind==='yagura'){
visibleIds.add('bon');
hotFestId='bon';
this.tip('盆踊り · Đài nhảy Bon Odori','Bấm 💃 Bon Odori để vỗ tay nhảy theo 16 nhịp trống Taiko!',0);
}else if(fSpot.kind==='bell'){
visibleIds.add('joya');
hotFestId='joya';
this.tip('除夜の鐘 · Tháp chuông giao thừa','Bấm 🔔 Chuông 108 để thỉnh tiếng chuông giao thừa xua tan 108 phiền não!',0);
}
}else if(spot==='hanami'&&showHanami&&!st.hanami){
visibleIds.add('hanami');
}else if(this.festival){
const f=this.festival;
const activeStalls=SHRINE.festival?.show?.[f]||[];
if(activeStalls.some((s)=>s!=='kingyo')){
this._setBtnText('yatai','🏮','Quầy hàng','屋台');
visibleIds.add('yatai');
}
if(activeStalls.includes('kingyo'))visibleIds.add('kingyo');
if(f==='natsumatsuri'){
visibleIds.add('hanabi');
visibleIds.add('yukata');
}else if(f==='obon'){
visibleIds.add('bon');
}else if(f==='oomisoka'){
visibleIds.add('joya');
this._setBtnText('festact','📹','Gọi về nhà','大晦日');
visibleIds.add('festact');
}else if(f==='shogatsu'){
this._setBtnText('festact','📮','Thiệp Tết','年賀状');
visibleIds.add('festact');
}else if(f==='halloween'){
this._setBtnText('festact','🎃','Hóa trang','ハロウィン');
visibleIds.add('festact');
}else if(f==='kouyou'){
this._setBtnText('festact','🍁','Ngắm lá đỏ','紅葉狩り');
visibleIds.add('festact');
}
}
visibleIds.add('home');
}else if(ph==='streetNight'){
visibleIds.add('run');
}else if(ph==='roomNight'){
visibleIds.add('sleep');
}
for(const a of BUTTON_DEFS){
const b=this.btn[a.id];
const wantHidden=!visibleIds.has(a.id);
if(b.hidden!==wantHidden)b.hidden=wantHidden;
let wantHot=false;
if(a.id==='coin'||a.id==='bow'||a.id==='clap'){
wantHot=visibleIds.has(a.id)&&PRAY_SEQ[st.prayIdx]===a.id;
}else if(a.id==='omikuji'||a.id==='hanami'){
wantHot=visibleIds.has(a.id);
}else{
wantHot=visibleIds.has(a.id)&&hotFestId===a.id;
}
if(b.classList.contains('hot')!==wantHot)b.classList.toggle('hot',wantHot);
}
}
action(id){
if(!this.active||this.paused||this.lie>=0)return;
const st=this.st,P=this.who.player;
if(id==='run'){
this.running=!this.running;
this.btn.run.classList.toggle('on',this.running);
return;
}
if(id==='out'&&st.phase==='roomDay'){
this.fadeTo(()=>this.enterStreetDay());
return;
}
if(id==='shrine'&&st.phase==='streetDay'){
const pos=P.holder.position;
if(Math.hypot(pos.x-ROUTE.shrine.x,pos.z-ROUTE.shrine.z)<2.2){
this.fadeTo(()=>this.enterShrine());
}else{
this.toShrineSign=true;
this.controls.target=new THREE.Vector3(ROUTE.shrine.x,0,ROUTE.shrine.z);
this.tip('⛩ さくら神社 →','Đang đi bộ tới lối vào đền さくら神社…',4);
}
return;
}
if((id==='coin'||id==='bow'||id==='clap')&&st.phase==='shrine'){
this.doPrayAction(id);
return;
}
if(id==='omikuji'&&st.phase==='shrine'){
this.doOmikujiAction();
return;
}
if(id==='hanami'&&st.phase==='shrine'){
this.doHanamiAction();
return;
}
if(id==='yatai'&&st.phase==='shrine'){
this.doYataiAction();
return;
}
if(id==='kingyo'&&st.phase==='shrine'){
this.doGoldfishAction();
return;
}
if(id==='bon'&&st.phase==='shrine'){
this.doBonOdoriAction();
return;
}
if(id==='hanabi'&&st.phase==='shrine'){
this.doHanabiAction();
return;
}
if(id==='yukata'&&st.phase==='shrine'){
this.doYukataWatchAction();
return;
}
if(id==='joya'&&st.phase==='shrine'){
this.doJoyaAction();
return;
}
if(id==='festact'&&st.phase==='shrine'){
this.doFestSpecialAction();
return;
}
if(id==='home'&&st.phase==='shrine'){
if(this.hubReturn){
this.fadeTo(()=>{
const endSt=this.st;
this._hide();
this.st=null;
if(this.onEnd)this.onEnd(endSt);
});
}else{
this.fadeTo(()=>this.enterStreetNight());
}
return;
}
if(id==='sleep'&&st.phase==='roomNight'){
show('sh-tip',false);
this.controls.target=new THREE.Vector3(DORM.bed.x,0,DORM.bed.z+0.3);
this.toFuton=true;
}
}
doPrayAction(actId){
const P=this.who.player;
P.yaw=Math.PI;
if(actId==='bow'){
P.bendTo=0.95;
P.reachTo=0;
this.poseT=0.55;
}else if(actId==='clap'){
P.bendTo=0;
P.reachTo=0.6;
this.poseT=0.45;
}else{
P.reachTo=0.65;
this.poseT=0.35;
}
const r=prayStep(this.st,actId,this.S);
if(!r.ok){
if(r.reason==='money'){
toast('💴 Không đủ 5 ¥','Bạn cần 5 ¥ để bỏ vào hộp 賽銭箱.');
}else if(r.reason==='wrong_step'){
this.overhead.say(P,`Nhầm thứ tự rồi! Phải là: ${r.hint}`,2.6);
toast('🙏 Sai thứ tự 二礼二拍手一礼',`Lẽ ra phải: ${r.hint}. Hãy làm lại từ đầu (không mất thêm 5 ¥).`);
}
this.hud();
return;
}
if(r.done){
if(this.festival==='shogatsu'||(this.S?.cal?.season===3&&this.S?.cal?.day<=3)){
this.S.festLog=this.S.festLog||{festivalsVisited:{}};
this.S.festLog.hatsumode=true;
this.S.festLog.festivalsVisited=this.S.festLog.festivalsVisited||{};
this.S.festLog.festivalsVisited.shogatsu=true;
}
if(this.storage)save(this.S,this.storage);
this.stages.shrine.syncRings(this.st,this.hasHanami());
this.overhead.say(P,'どうか健康で働けますように… — Mong luôn khỏe mạnh bình an!',3.5);
toast('⛩️ Đi lễ お参り hoàn tất!',`🎌 Văn hóa +${r.fx.culture} · 🧠 Tinh thần +${r.fx.mental}`);
this.tip('お参り完了','Bạn đã hành lễ đúng phép 二礼二拍手一礼!',4);
this.onNotify?.(this.S);
}else{
const label=actId==='coin'?'チャリン♪ (5 ¥)':actId==='bow'?'🙇 礼 (Cúi chào)':'👏 パチン！(Vỗ tay)';
this.overhead.say(P,`${label} · Tiếp: ${r.hint}`,1.8);
}
this.hud();
}
doOmikujiAction(){
const P=this.who.player;
const r=drawOmikuji(this.st,this.S);
if(!r.ok){
if(r.reason==='money')toast('💴 Không đủ 100 ¥','Rút quẻ おみくじ cần 100 ¥.');
return;
}
if(this.storage)save(this.S,this.storage);
this.stages.shrine.syncRings(this.st,this.hasHanami());
this.paused=true;
P.yaw=Math.PI;
P.reachTo=0.55;
this.poseT=0.4;
const isKyo=r.jp==='凶';
const renderSlip=(tied=false)=>{
const fxDelta=tied?[['mental',0]]:[['mental',r.fx.mental]];
const btns=[];
if(isKyo&&!tied){
btns.push({
label:'🪢 Buộc giấy lên giá おみくじ掛け (hóa giải → 🧠 ±0)',
on:()=>{
tieOmikujiKyo(this.st,this.S);
if(this.storage)save(this.S,this.storage);
this.stages.shrine.setKyoTied(true);
renderSlip(true);
},
});
}
btns.push({
label:'Cất quẻ & Tiếp tục →',
cls:isKyo&&!tied?'ghost':'',
on:()=>{
show('modal',false);
this.paused=false;
this.hud();
},
});
card(`
        <div class="omikuji-slip">
          <div class="omi-sub">さくら神社 · おみくじ</div>
          <div class="omi-kanji">${esc(r.jp)}</div>
          <p class="omi-vi">${esc(r.vi)}</p>
        </div>
        <div class="deltas">${
          tied ? '<span class="delta">🧠 Tinh thần ±0 (đã buộc hóa giải)</span>' : deltaChips(fxDelta)
        }</div>
        ${r.tieTip ? `<p class="lesson">🪢 ${esc(r.tieTip)}</p>` : ''}
      `,btns);
};
renderSlip(false);
}
doHanamiAction(){
const P=this.who.player,hung=this.who.hung,hoa=this.who.hoa;
const r=doHanami(this.st,this.S);
if(!r.ok)return;
visitFestival(this.S,'hanami');
this.S.festLog.hanami=true;
if(this.storage)save(this.S,this.storage);
this.stages.shrine.syncRings(this.st,this.hasHanami());
this.paused=true;
seatOnTarp(P,SHRINE.seats.player.x,SHRINE.seats.player.z,SHRINE.seats.player.yaw);
if(hung)this.overhead.say(hung,r.lines[0].jp.replace(/[「」]/g,''),5);
const deltas=Object.entries(r.fx).filter(([,v])=>v);
card(`<h2>🌸 Ngắm hoa anh đào · お花見</h2>
      <p class="jpline">${esc(r.lines[0].jp)}</p>
      <p><b>Anh Hùng:</b> ${esc(r.lines[0].vi)}</p>
      <p class="jpline">${esc(r.lines[1].jp)}</p>
      <p><b>Chị Hoa:</b> ${esc(r.lines[1].vi)}</p>
      <div class="deltas">${deltaChips(deltas)}</div>
      <p class="lesson">🌸 Ngồi dưới tán hoa anh đào 30 phút cùng đồng nghiệp giúp tinh thần nhẹ nhõm hẳn sau tuần làm việc đầu tiên.</p>`,[
{
label:'Đứng dậy đi tiếp →',
on:()=>{
show('modal',false);
standUp(P);
P.holder.position.set(SHRINE.spots.hanami.x,0,SHRINE.spots.hanami.z+0.35);
this.paused=false;
toast('🌸 Ngắm hoa お花見',`${deltaText(deltas)} · ${clock(this.st.min)}`);
this.onNotify?.(this.S);
this.hud();
},
},
]);
}
_eatYataiItem(itemId){
const P=this.who.player;
const w=this.S?.cal?weatherOf(this.S.cal,this.S.seed||1):'sunny';
const r=itemId==='amazake'
?drinkAmazake(this.S,true)
:itemId==='soba'
?eatToshikoshiSoba(this.S)
:buyYatai(this.S,itemId,w);
if(!r.ok){
toast('💴 Không đủ tiền','Bạn không đủ tiền mua món này ở quầy 屋台.');
return;
}
this.st.min+=10;
if(this.storage)save(this.S,this.storage);
P.reachTo=0.6;
this.poseT=0.5;
const it=YATAI_ITEMS[itemId]||{icon:'🏮',jp:itemId,vi:itemId};
this.overhead.say(P,`${it.icon} おいしい！— ${it.jp} ngon quá!`,3.0);
const deltas=Array.isArray(r.deltas)?r.deltas:Object.entries(r.fx||{}).filter(([,v])=>v);
toast(`${it.icon} ${it.vi} (${it.jp})`,deltaText(deltas));
this.onNotify?.(this.S);
this.hud();
}
doYataiAction(){
const fSpot=this.nearFestSpot();
if(fSpot?.kind==='stall'&&fSpot.id!=='kingyo'){
this._eatYataiItem(fSpot.id);
return;
}
const activeStalls=(SHRINE.festival?.show?.[this.festival]||[]).filter((id)=>id!=='kingyo');
if(!activeStalls.length)return;
this.paused=true;
const btns=activeStalls.map((id)=>{
const it=YATAI_ITEMS[id];
const costStr=it.cost>0?`${it.cost.toLocaleString()} ¥`:'Miễn phí 0 ¥';
return{
label:`${it.icon} ${it.vi} (${it.jp}) · ${costStr}`,
on:()=>{
const stDef=(SHRINE.festival?.stalls||[]).find((s)=>s.id===id);
if(stDef?.stand){
this.who.player.holder.position.set(stDef.stand.x,0,stDef.stand.z);
this.who.player.yaw=stDef.side<0?-Math.PI/2:Math.PI/2;
}
show('modal',false);
this.paused=false;
this._eatYataiItem(id);
},
};
});
btns.push({
label:'Đóng →',
cls:'ghost',
on:()=>{
show('modal',false);
this.paused=false;
this.hud();
},
});
card(`
      <h2>🏮 Quầy hàng lễ hội · 祭り屋台</h2>
      <p>Dọc lối vào đền さくら神社 các quầy <b>屋台 (やたい)</b> đang đỏ đèn thơm phức. Bạn cũng có thể đi bộ trực tiếp vào từng vòng vàng trước quầy!</p>
      <p class="sub">Ví hiện có: <b>${this.S.money.toLocaleString()} ¥</b></p>
    `,btns);
}
doGoldfishAction(){
const P=this.who.player;
const stDef=(SHRINE.festival?.stalls||[]).find((s)=>s.id==='kingyo');
if(stDef?.stand){
P.holder.position.set(stDef.stand.x,0,stDef.stand.z);
P.yaw=Math.PI/2;
}
if(this.S.money<300){
toast('💴 Không đủ 300 ¥','Chơi vớt cá vàng 金魚すくい cần 300 ¥.');
return;
}
this.paused=true;
clearInterval(this.miniTimer);
const seed=((this.S.seed||1)*97+(this.st.min||0)*13+(this.S.pets?.goldfish||0)*31)>>>0;
const round=goldfishRound(seed);
let t=0;
let paid=false;
const closeMini=()=>{
clearInterval(this.miniTimer);
this.miniTimer=null;
show('modal',false);
this.paused=false;
this.onNotify?.(this.S);
this.hud();
};
const renderDone=()=>{
clearInterval(this.miniTimer);
this.miniTimer=null;
const fin=finishGoldfish(this.S,round,!paid);
paid=true;
this.st.min+=15;
if(this.storage)save(this.S,this.storage);
const caught=round.caught;
const showDeltas=caught>0
?[['money',-300],['mental',4*caught],['culture',2*caught]]
:(fin.deltas||[['money',-300],['mental',1]]);
card(`
        <h2>🐠 Kết quả Vớt cá vàng · 金魚すくい</h2>
        <p>${caught > 0
          ? `Tuyệt vời! Bạn đã khéo léo vớt được <b>${caught} chú cá vàng 🐠</b> trước khi vợt giấy ポイ bị rách!`
          : 'Tiếc quá, vợt giấy ポイ đã bị rách hết hoặc cá đã lặn mất tiêu!'}</p>
        <div class="deltas">${deltaChips(showDeltas)}</div>
        <p class="lesson">🐠 Chú cá vàng vớt được ở lễ hội sẽ được đem về nuôi trong chậu nước ở phòng ký túc xá さくら寮 (Đang nuôi: <b>${this.S.pets?.goldfish || 0}</b> con).</p>
      `,[{label:'Tiếp tục dạo lễ hội →',on:closeMini}]);
};
card(`
      <h2>🐠 Vớt cá vàng · 金魚すくい (300 ¥)</h2>
      <p>Canh đúng lúc chú cá vàng <b>nổi lên mặt nước (✨ NỔI LÊN!)</b> rồi bấm <b>🥄 Vớt cá</b>! Bấm khi cá đang lặn sẽ làm rách vợt giấy <b>ポイ</b> (3 vết rách là hỏng vợt).</p>
      <div id="kg-pond" style="padding:14px;border-radius:12px;background:rgba(14,116,144,0.18);border:2px solid rgba(56,189,248,0.45);text-align:center;margin:10px 0">
        <div id="kg-fish" style="font-size:1.5rem;font-weight:700;min-height:2.2rem">🌊 Cá đang bơi dưới đáy…</div>
        <div id="kg-stat" style="margin-top:6px;font-size:0.92rem">Vợt ポイ: <b>0/3</b> vết rách · Đã vớt: <b>0</b> 🐠</div>
      </div>
    `,[
{
label:'🥄 Vớt cá ngay! (すくう)',
on:()=>{
if(round.done||round.torn)return;
P.reachTo=0.65;
this.poseT=0.35;
const r=scoop(round,t,this.S);
const fishEl=$('kg-fish');
const statEl=$('kg-stat');
if(r.hit){
if(fishEl)fishEl.innerHTML='✨ 🐠 VỚT TRÚNG CÁ VÀNG! やった！';
this.overhead.say(P,'🐠 やった！金魚とれた！',2.2);
}else{
if(fishEl)fishEl.innerHTML='💦 Trượt rồi! Vợt giấy ポイ bị rách thêm…';
}
if(statEl){
statEl.innerHTML=`Vợt ポイ: <b>${round.misses}/${round.maxMiss}</b> vết rách · Đã vớt: <b>${round.caught}</b> 🐠`;
}
if(round.torn||round.used.size>=round.length){
round.done=true;
setTimeout(renderDone,450);
}
},
},
{
label:'Dừng chơi →',
cls:'ghost',
on:()=>{
round.done=true;
renderDone();
},
},
]);
const stepMs=80;
const win=round.window||0.25;
const maxTime=((round[round.length-1]||6.5)+win)+0.8;
this.miniTimer=setInterval(()=>{
if(round.done||round.torn){
round.done=true;
renderDone();
return;
}
t+=stepMs/1000;
if(t>maxTime){
round.done=true;
renderDone();
return;
}
const up=round.some((t0,i)=>!round.used?.has(i)&&Math.abs(t-t0)<=win);
const fishEl=$('kg-fish');
if(fishEl){
fishEl.innerHTML=up
?'<span style="color:#facc15">✨ 🐠 CÁ NỔI LÊN MẶT NƯỚC! BẤM VỚT NGAY! ✨</span>'
:'🌊 〰️ Cá đang lặn dưới nước… chờ cá nổi lên!';
}
},stepMs);
}
doBonOdoriAction(){
const P=this.who.player;
if(SHRINE.festival?.yagura?.stand){
P.holder.position.set(SHRINE.festival.yagura.stand.x,0,SHRINE.festival.yagura.stand.z);
P.yaw=-Math.PI/2;
}
this.paused=true;
clearInterval(this.miniTimer);
const seed=((this.S.seed||1)*53+(this.st.min||0))>>>0;
const beats=bonOdoriBeats(seed);
const beatTime=(b)=>(typeof b==='number'?b:b.timeMs);
const beatCue=(b,i)=>(typeof b==='object'&&b?.cue?b.cue:(i%2===0?'ドン':'カッ'));
const taps=new Array(beats.length).fill(NaN);
let curIdx=0;
let startMs=performance.now()+700;
let finished=false;
const finishDance=()=>{
if(finished)return;
finished=true;
clearInterval(this.miniTimer);
this.miniTimer=null;
const res=scoreBonOdori(this.S,beats,taps);
this.st.min+=20;
if(this.storage)save(this.S,this.storage);
this.overhead.say(P,'💃 盆踊り楽しい！— Nhảy Bon Odori vui quá!',3.2);
const deltas=Array.isArray(res.deltas)?res.deltas:Object.entries(res.fx||{}).filter(([,v])=>v);
card(`
        <h2>💃 Kết quả Nhảy 盆踊り (Bon Odori)</h2>
        <p>Bạn đã vỗ tay & nhảy chuẩn <b>${res.hits} / ${res.total}</b> nhịp trống Taiko quanh đài 櫓 (Yagura)!</p>
        <div class="deltas">${deltaChips(deltas)}</div>
        <p class="lesson">🥁 Điệu múa <b>盆踊り (Bon Odori)</b> dịp lễ Obon vừa đón tổ tiên về thăm vừa gắn kết cả khu phố. Đạt từ 13/16 nhịp chuẩn sẽ mở khóa thành tựu <b>💃 Nhảy Bon Odori không trượt</b>!</p>
      `,[
{
label:'Tiếp tục dạo lễ hội →',
on:()=>{
show('modal',false);
this.paused=false;
this.onNotify?.(this.S);
this.hud();
},
},
]);
};
card(`
      <h2>💃 Nhảy 盆踊り · 16 nhịp trống Taiko</h2>
      <p>Canh lúc đèn nhịp báo <b>🥁 ドン！ BẤM NGAY!</b> (cửa sổ ±150 ms) để vỗ tay theo 16 nhịp trống Taiko!</p>
      <div id="bon-stage" style="padding:14px;border-radius:12px;background:rgba(180,83,9,0.2);border:2px solid rgba(251,191,36,0.5);text-align:center;margin:10px 0">
        <div id="bon-cue" style="font-size:1.35rem;font-weight:700;min-height:2.2rem">🏮 Chuẩn bị nghe nhịp trống…</div>
        <div id="bon-stat" style="margin-top:6px;font-size:0.92rem">Nhịp: <b>1 / 16</b> · Chuẩn nhịp: <b>0</b></div>
      </div>
    `,[
{
label:'👏 Vỗ tay theo nhịp! (ドン・カッ)',
on:()=>{
if(curIdx>=beats.length)return;
const nowElapsed=performance.now()-startMs;
let targetIdx=curIdx;
const b=beats[targetIdx];
const bMs=beatTime(b);
const bCue=beatCue(b,targetIdx);
const diff=Math.abs(nowElapsed-bMs);
taps[targetIdx]=diff<=260?bMs+(diff<=150?0:diff):nowElapsed;
const j=judgeBonBeat(bMs,taps[targetIdx]);
P.reachTo=0.65;
P.wristSway=0.8;
this.poseT=0.32;
curIdx++;
const hitsSoFar=beats.slice(0,curIdx).filter((bt,i)=>judgeBonBeat(beatTime(bt),taps[i]).hit).length;
const cueEl=$('bon-cue');
const statEl=$('bon-stat');
if(cueEl){
cueEl.innerHTML=j.hit
?`<span style="color:#4ade80">✨ Chuẩn nhịp ${targetIdx + 1}! (${bCue})</span>`
:`<span style="color:#fbbf24">💦 Hơi lệch nhịp ${targetIdx + 1}… nghe tiếp nhịp sau!</span>`;
}
if(statEl){
statEl.innerHTML=`Nhịp: <b>${Math.min(16, curIdx + 1)} / 16</b> · Chuẩn nhịp: <b>${hitsSoFar}</b>`;
}
if(curIdx>=beats.length){
setTimeout(finishDance,350);
}else{
startMs=performance.now()-beatTime(beats[curIdx])+420;
}
},
},
]);
this.miniTimer=setInterval(()=>{
if(curIdx>=beats.length){
finishDance();
return;
}
const elapsed=performance.now()-startMs;
const b=beats[curIdx];
const bMs=beatTime(b);
const bCue=beatCue(b,curIdx);
const delta=elapsed-bMs;
const cueEl=$('bon-cue');
const statEl=$('bon-stat');
if(delta>320){
taps[curIdx]=bMs+500;
curIdx++;
if(curIdx>=beats.length){
finishDance();
return;
}
startMs=performance.now()-beatTime(beats[curIdx])+480;
}else if(Math.abs(delta)<=150){
if(cueEl){
cueEl.innerHTML=`<span style="color:#facc15">🥁 ${bCue} — BẤM VỖ TAY NGAY! (Nhịp ${curIdx + 1}/16)</span>`;
}
}else if(delta<-150){
if(cueEl){
cueEl.innerHTML=`🏮 Sắp tới nhịp ${curIdx + 1}/16 (${bCue})…`;
}
}
if(statEl&&curIdx<beats.length){
const hitsSoFar=beats.slice(0,curIdx).filter((bt,i)=>judgeBonBeat(beatTime(bt),taps[i]).hit).length;
statEl.innerHTML=`Nhịp: <b>${curIdx + 1} / 16</b> · Chuẩn nhịp: <b>${hitsSoFar}</b>`;
}
},50);
}
doHanabiAction(){
const P=this.who.player;
this.stages.shrine?.launch?.();
const r=launchFirework(this.S);
P.yaw=Math.PI;
P.reachTo=0.7;
this.poseT=0.45;
this.overhead.say(P,`🎆 ${r.cheer} (Đẹp quá!)`,2.6);
if(this.storage)save(this.S,this.storage);
this.onNotify?.(this.S);
this.hud();
}
doYukataWatchAction(){
const P=this.who.player;
this.paused=true;
const hasYukata=Boolean(this.S.festLog?.yukata);
const watched=Boolean(this.S.festLog?.fireworks);
const btns=[];
if(!hasYukata){
btns.push({
label:'🥻 Thuê bộ Yukata mặc lễ hội (3.000 ¥ · 🧠 +3)',
on:()=>{
const r=rentYukata(this.S);
if(!r.ok){
toast('💴 Không đủ 3.000 ¥','Bạn cần 3.000 ¥ để thuê bộ Yukata.');
return;
}
P.look({...this.S.look.colors,shirt:0x1e3a8a});
if(this.storage)save(this.S,this.storage);
this.overhead.say(P,'🥻 浴衣、涼しくていいな！— Mặc Yukata mát thật!',3.0);
toast('🥻 Đã thuê Yukata lễ hội',deltaText(r.deltas||[['money',-3000],['mental',3]]));
show('modal',false);
this.paused=false;
this.onNotify?.(this.S);
this.hud();
},
});
}
btns.push({
label:'🎇 Ngắm pháo hoa cùng đồng nghiệp & chụp ảnh gửi về nhà (🧠 +8)',
on:()=>{
this.stages.shrine?.launch?.();
const r=watchFireworks(this.S);
this.st.min+=25;
if(this.storage)save(this.S,this.storage);
this.overhead.say(P,'🎆 たまや〜！きれいだなあ… — Pháo hoa rực rỡ quá!',3.5);
show('modal',false);
this.paused=false;
const deltas=Array.isArray(r.deltas)?r.deltas:[];
toast('🎆 Đã ngắm pháo hoa & gửi ảnh LIME cho Mẹ!',deltaText(deltas));
this.onNotify?.(this.S);
this.hud();
},
});
btns.push({
label:'Đóng →',
cls:'ghost',
on:()=>{
show('modal',false);
this.paused=false;
this.hud();
},
});
card(`
      <h2>🎇 Đại hội pháo hoa mùa hạ · 夏祭り・花火大会</h2>
      <p>Bầu trời đêm trên đền さくら神社 rực sáng từng chùm pháo hoa <b>打ち上げ花火</b>. Tiếng hô <b>「たまや〜！」(Tamaya~!)</b> vang khắp sân đền.</p>
      <p class="sub">${hasYukata ? '✅ Bạn đang mặc bộ Yukata lễ hội.' : '🥻 Bạn có thể thuê Yukata (3.000 ¥) để hòa mình vào đêm hội.'} ${watched ? '· 📱 Đã gửi ảnh pháo hoa về nhà qua LIME.' : ''}</p>
    `,btns);
}
doJoyaAction(){
const P=this.who.player;
if(SHRINE.festival?.bell?.stand){
P.holder.position.set(SHRINE.festival.bell.stand.x,0,SHRINE.festival.bell.stand.z);
P.yaw=Math.PI/2;
}
P.bendTo=0.55;
P.reachTo=0.7;
this.poseT=0.65;
const r=ringJoyaBell(this.S);
this.st.min+=15;
if(this.storage)save(this.S,this.storage);
this.overhead.say(P,'🔔 ゴーン… (Tiếng chuông giao thừa 108 tiếng)',3.5);
this.paused=true;
const deltas=Array.isArray(r.deltas)?r.deltas:Object.entries(r.fx||{}).filter(([,v])=>v);
card(`
      <h2>🔔 Thỉnh chuông giao thừa · 除夜の鐘 (108 tiếng)</h2>
      <p class="jpline">「ゴーン……」— Tiếng chuông đồng trầm hùng ngân vang giữa đêm tuyết cuối năm.</p>
      <div class="deltas">${deltaChips(deltas)}</div>
      <p class="lesson">🔔 ${esc(r.lesson || r.note || '')}</p>
    `,[
{
label:'Chắp tay cầu bình an năm mới →',
on:()=>{
show('modal',false);
this.paused=false;
this.onNotify?.(this.S);
this.hud();
},
},
]);
}
doFestSpecialAction(){
const P=this.who.player;
const f=this.festival;
if(f==='oomisoka'){
const r=callNewYearEve(this.S);
this.st.min+=20;
if(this.storage)save(this.S,this.storage);
this.paused=true;
const deltas=Array.isArray(r.deltas)?r.deltas:Object.entries(r.fx||{}).filter(([,v])=>v);
const diffHours=r.diffHours??r.tzDiffHours??2;
card(`
        <h2>📹 Gọi video về nhà đêm Giao thừa · 大晦日</h2>
        <p>Đồng hồ ở Nhật điểm <b>00:00 bước sang năm mới</b> — lúc này ở Việt Nam là <b>22:00 tối (lệch múi giờ ${diffHours} tiếng)</b>. Cả nhà ở quê vẫn đang thức quây quần và vẫy tay chúc mừng qua màn hình điện thoại!</p>
        <div class="deltas">${deltaChips(deltas)}</div>
        <p class="lesson">📱 Mẹ đã nhắn tin chúc năm mới trong hộp thư <b>LIME</b> của bạn.</p>
      `,[
{
label:'Ấm lòng quá! Tiếp tục →',
on:()=>{
show('modal',false);
this.paused=false;
this.onNotify?.(this.S);
this.hud();
},
},
]);
return;
}
if(f==='shogatsu'){
const r=receiveNengajo(this.S);
this.st.min+=10;
if(this.storage)save(this.S,this.storage);
this.paused=true;
const deltas=Array.isArray(r.deltas)?r.deltas:Object.entries(r.fx||{}).filter(([,v])=>v);
card(`
        <h2>📮 Thiệp chúc Tết 年賀状 & Phong tục お年玉</h2>
        <p class="jpline">「あけましておめでとうございます。今年もよろしくお願いします！」</p>
        <p>Công ty và tổ trưởng gửi tặng bạn tấm thiệp <b>年賀状 (Nengajō)</b> đầu xuân.</p>
        <div class="deltas">${deltaChips(deltas)}</div>
        <p class="lesson">🎍 ${esc(r.otoshidamaNote || r.note || '')}</p>
      `,[
{
label:'Cất thiệp kỷ niệm →',
on:()=>{
show('modal',false);
this.paused=false;
this.onNotify?.(this.S);
this.hud();
},
},
]);
return;
}
if(f==='halloween'){
this.paused=true;
card(`
        <h2>🎃 Lễ hội Halloween · ハロウィン</h2>
        <p>Sân đền và khu phố treo đèn bí ngô <b>かぼちゃ</b> ấm áp. Ở Nhật, nhiều bạn trẻ đeo băng đô hóa trang nhẹ đi dạo nhưng luôn chú ý giữ trật tự nơi công cộng.</p>
      `,[
{
label:'🎃 Mua băng đô hóa trang nhẹ (1.000 ¥ · 🧠 +5 · 🎌 +2)',
on:()=>{
const r=doHalloween(this.S,true);
if(!r.ok){
toast('💴 Không đủ 1.000 ¥','Bạn cần 1.000 ¥ để mua phụ kiện hóa trang.');
return;
}
this.st.min+=15;
if(this.storage)save(this.S,this.storage);
this.overhead.say(P,'🎃 ハッピーハロウィン！',2.8);
show('modal',false);
this.paused=false;
const deltas=Array.isArray(r.deltas)?r.deltas:[];
toast('🎃 Hóa trang Halloween vui vẻ!',`${deltaText(deltas)} (${r.lesson || r.note || ''})`);
this.onNotify?.(this.S);
this.hud();
},
},
{
label:'👀 Đi dạo ngắm phố đèn bí ngô (0 ¥ · 🧠 +2 · 🎌 +1)',
cls:'ghost',
on:()=>{
const r=doHalloween(this.S,false);
this.st.min+=15;
if(this.storage)save(this.S,this.storage);
show('modal',false);
this.paused=false;
const deltas=Array.isArray(r.deltas)?r.deltas:[];
toast('🎃 Dạo phố Halloween',`${deltaText(deltas)} (${r.lesson || r.note || ''})`);
this.onNotify?.(this.S);
this.hud();
},
},
]);
return;
}
if(f==='kouyou'){
const r=doMomiji(this.S);
this.st.min+=20;
if(this.storage)save(this.S,this.storage);
this.overhead.say(P,'🍁 紅葉が真っ赤できれい！— Lá phong đỏ rực đẹp quá!',3.2);
this.paused=true;
const deltas=Array.isArray(r.deltas)?r.deltas:Object.entries(r.fx||{}).filter(([,v])=>v);
card(`
        <h2>🍁 Ngắm lá phong đỏ mùa thu · 紅葉狩り</h2>
        <p>Hàng cây phong trong khuôn viên đền さくら神社 chuyển sắc đỏ cam rực rỡ dưới nắng thu. Bạn chụp một tấm ảnh dưới tán lá đỏ gửi về cho gia đình qua LIME.</p>
        <div class="deltas">${deltaChips(deltas)}</div>
        <p class="lesson">📱 Mẹ đã xem ảnh lá đỏ và gửi tin nhắn trả lời trong hộp thư <b>LIME</b> của bạn!</p>
      `,[
{
label:'Tiếp tục dạo dưới tán lá đỏ →',
on:()=>{
show('modal',false);
this.paused=false;
this.onNotify?.(this.S);
this.hud();
},
},
]);
}
}
skip(){
if(this.paused||!this.st)return;
const ph=this.st.phase;
if(ph==='roomDay')this.action('out');
else if(ph==='streetDay')this.fadeTo(()=>this.enterShrine());
else if(ph==='shrine')this.action('home');
else if(ph==='streetNight')this.fadeTo(()=>this.enterRoomNight());
else if(ph==='roomNight')this.action('sleep');
}
update(dt){
if(!this.active||!this.st)return;
const st=this.st,ph=st.phase,P=this.who.player,pos=P.holder.position,c=this.controls;
const portrait=isPortrait();
let moving=false,speed=0;
if(this.poseT>0){
this.poseT-=dt;
if(this.poseT<=0){
P.bendTo=0;
P.reachTo=0;
P.wristSway=0;
}
}
if(this.lie>=0){
this.lie=Math.min(1,this.lie+dt/0.9);
const k=this.lie*this.lie*(3-2*this.lie),a=k*Math.PI/2,h=0.55;
const hipY=h-(h-DORM.lieY)*k,hipZ=DORM.bed.z+0.3;
P.yaw=0;
P.holder.rotation.x=-a;
P.holder.position.set(DORM.bed.x,hipY-h*Math.cos(a),hipZ+h*Math.sin(a));
if(this.lie>=1){
this.lie=-1;
this.paused=true;
setTimeout(()=>this.fadeTo(()=>{
this.S.flags=this.S.flags||{};
this.S.flags.dayOff={
...(this.S.flags.dayOff||{}),
done:true,
prayed:st.prayed,
omikuji:st.omikuji,
hanami:st.hanami,
};
if(this.storage)save(this.S,this.storage);
this._hide();
this.st=null;
if(this.onEnd)this.onEnd();
}),650);
}
}else if(!this.paused){
let mag=c.input(this.dir);
if(mag<0.05&&c.target){
this.dir.set(c.target.x-pos.x,0,c.target.z-pos.z);
const d=this.dir.length();
if(d<this.bestD-0.02){this.bestD=d;this.stuckT=0;}else this.stuckT+=dt;
if(d<0.12||this.stuckT>0.45){
c.target=null;mag=0;this.bestD=Infinity;this.stuckT=0;
}else{
this.dir.multiplyScalar(1/d);mag=1;
}
}else if(mag>=0.05){
this.dir.multiplyScalar(1/Math.max(mag,1e-4));
this.toShrineSign=false;
}
if(mag>=0.05){
moving=true;
const ox=pos.x,oz=pos.z;
const isRoom=ph==='roomDay'||ph==='roomNight';
const isShrine=ph==='shrine';
const B=isRoom?DORM.bounds:isShrine?SHRINE.bounds:ROUTE.bounds;
const blocks=isRoom?DORM.blocks:isShrine?SHRINE.blocks:ROUTE.blocks;
const sp=WALK*(this.running&&!isRoom?RUN_MUL:1)*(isRoom?0.6:1)*mag*dt;
pos.x+=this.dir.x*sp;
pos.z+=this.dir.z*sp;
for(const o of blocks){
const dx=pos.x-o.x,dz=pos.z-o.z,dd=Math.hypot(dx,dz),rr=o.r+0.3;
if(dd<rr&&dd>1e-4){
pos.x=o.x+(dx/dd)*rr;
pos.z=o.z+(dz/dd)*rr;
}
}
pos.x=THREE.MathUtils.clamp(pos.x,B.x0,B.x1);
pos.z=THREE.MathUtils.clamp(pos.z,B.z0,B.z1);
speed=dt>0?Math.hypot(pos.x-ox,pos.z-oz)/dt:0;
let dy=Math.atan2(this.dir.x,this.dir.z)-P.yaw;
dy=Math.atan2(Math.sin(dy),Math.cos(dy));
P.yaw+=dy*Math.min(1,dt*12);
tickDayOff(st,dt);
}
if(ph==='streetDay'&&(Math.hypot(pos.x-ROUTE.shrine.x,pos.z-ROUTE.shrine.z)<1.8||(this.toShrineSign&&!c.target))){
this.toShrineSign=false;
this.fadeTo(()=>this.enterShrine());
return;
}
if(ph==='streetNight'&&(Math.hypot(pos.x-ROUTE.start.x,pos.z-ROUTE.start.z)<1.8||!c.target)){
this.fadeTo(()=>this.enterRoomNight());
return;
}
if(this.toFuton&&!c.target){
this.toFuton=false;
this.lie=0;
}
}
if(this.lie<0&&P.sit===0)P.moveAt(speed);
const wantFov=portrait?56:46;
if(camera.fov!==wantFov){
camera.fov=wantFov;
camera.updateProjectionMatrix();
}
if(ph==='roomDay'||ph==='roomNight'){
const fx=pos.x*0.5,fz=THREE.MathUtils.clamp(pos.z,-1.2,1.4);
this.camPos.set(fx,2.9*(portrait?1.25:1),fz+(portrait?4.9:3.9));
this.camLook.set(fx*1.2,0.55,fz-0.7);
this.camRig.to(this.camPos,this.camLook,dt,4);
}else if(ph==='shrine'){
const dist=5.4*(portrait?1.18:1);
this.camPos.set(pos.x*0.75,portrait?3.5:2.9,pos.z+dist);
this.camLook.set(pos.x*0.85,1.15,pos.z-2.6);
this.camRig.to(this.camPos,this.camLook,dt,5);
}else{
c.follow(P.yaw+Math.PI,moving,dt);
const dist=4.6*(portrait?1.15:1),cp=Math.cos(c.pitch);
this.camPos.set(pos.x+Math.sin(c.yaw)*dist*cp,1.5+Math.sin(c.pitch)*dist,pos.z+Math.cos(c.yaw)*dist*cp);
this.camLook.set(pos.x-Math.sin(c.yaw)*2,1.0,pos.z-Math.cos(c.yaw)*2);
this.camRig.to(this.camPos,this.camLook,dt,6);
}
if(this.active)this.hud();
}
}
