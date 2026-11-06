/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{pageview,track}from'./net/stats.js';
import*as THREE from'three';
import{renderer,camera,resize,isPortrait,CamRig,loadModel,loadBrand,loadStats,LOW_MEM,trimShadowCasters}from'./gfx/stage.js';
import{OUTFITS,SWATCH,ensureSrc,makeCharacter,makeHelmet,makeSanitaryCap,wearHelmet,wearWaders,refHex}from'./gfx/chars.js';
import{buildTown}from'./gfx/town.js';
import{buildSite,DECK_Y,WANDER,ROUTE}from'./gfx/site.js';
import{SERVICES}from'./gfx/services.js';
import{Controls}from'./gfx/controls.js';
import{SiteShift}from'./work/site_shift.js';
import{MorningWalk}from'./work/morning_walk.js';
import{EveningWalk}from'./work/evening_walk.js';
import{MarketShop}from'./work/market_shop.js';
import{spotFor,createEvening}from'./core/evening.js';
import{spoil,goodOf}from'./core/market_rules.js';
import{buildDorm}from'./gfx/dorm.js';
import{buildMarket}from'./gfx/market.js';
import{buildShrine}from'./gfx/shrine.js';
import{buildCare}from'./gfx/care.js';
import{buildBento,BENTO_ROOM}from'./gfx/bento.js';
import{buildLotus,LOTUS_FIELD}from'./gfx/lotus.js';
import{buildStation}from'./gfx/station.js';
import{Crowd}from'./gfx/crowd.js';
import{CareShift,seatFolk}from'./work/care_shift.js';
import{BentoShift}from'./work/bento_shift.js';
import{LotusShift}from'./work/lotus_shift.js';
import{DayOff}from'./work/dayoff.js';
import{dayOffSummary}from'./core/dayoff_rules.js';
import{$,show,card,toast,deltaChips,esc,Overhead}from'./ui/ui.js';
import{newState,save,load,clearSave,yen,jpLevel,applyFx}from'./core/state.js';
import{JOBS,NPCS,INTRO,rankOf,rankPay,daysOf,ranksOf}from'./core/jobs.js';
import{WELL,checkCollapse,lowBars,sickLeave,skillInfo}from'./core/wellbeing.js';
import{CAREER,targets,cannotStudy,startStudy,quitStudy}from'./core/career.js';
import{daySteps,lifeDaySteps,shiftOpts,shiftEnd,chooseTalk,completeStep,weekEval,sleep,retryCost,DAYS}from'./core/story.js';
import{stars,formatStars,recordStars,getStars}from'./core/stars.js';
import{clock as fmtClock}from'./core/morning.js';
import{
SEASONS,DAYS_PER_SEASON,WEEKDAYS,WEEKDAYS_VI,PAY,
newCalendar,advance,nextDay,weekday,seasonOf,label as calLabel,
eventsOn,isRedDay,isOffDay,isMandatoryOff,isSaturdayWorkable,
weatherOf,weatherFx,paydayOn,payslip,applyPay,repayDebt,
}from'./core/calendar.js';
import{
REMIT_ROUTES,ensureHome,inboxFor,unreadCount,sendMoney,callHome,
dayTick,afterShift,wash,missedDuty,availableVnDishes,cookVietnamese,homeChips,totalDays,
}from'./core/home_life.js';
import{
HOLI,ensureHolidayState,holidayActs,openFukubukuro,
buyBox,openBox,sellToShop,marketPrice,sellOnApp,buyFromStranger,
sideJobOffer,takeSideJob,refuseSideJob,checkCaught,
}from'./core/holiday.js';
import{
PAPER_DOCS,HANKYU_COST,ensurePapers,isOpen as isPaperOpen,
paperTodo,overdue as checkPaperOverdue,takeHankyu,waitTime,formFields,checkForm,completePaper,
}from'./core/paperwork.js';
import{
ILLNESSES,CLINIC,isClinicOpen,illWalkMul,catchIll,illDayTick,visitClinic,buyMedicine,
}from'./core/clinic.js';
import{
BIKE,bikeRules,buyBike,register as registerBike,
commuteMul,commuteExtraMin,policeStop,answerBikeRules,checkBikeTheft,reportStolenBike,
}from'./core/bicycle.js';
import{
PREP_ITEMS,QUAKE_STEPS,SHELTER_QUESTION,
ensurePrep,prepScore,buyPrep,quakeToday,resolveQuake,markStormReady,stormPrep,answerShelter,
}from'./core/disaster.js';
import{
FESTIVALS,ANNUAL_FESTIVAL_IDS,BOUNENKAI_QUESTIONS,doBounenkai,doValentine,
ACHIEVEMENTS,checkAchievements,ensureFestivalState,visitFestival,
}from'./core/festival.js';
const storage=(()=>{try{return window.localStorage;}catch{return{getItem:()=>null,setItem(){},removeItem(){}};}})();
import{Music,pickTrack}from'./audio/music.js';
const music=new Music();
let musicT=0;
const G={
S:null,demoState:{flags:{}},stage:null,stages:{},player:null,own:null,wardrobe:{},folk:[],npcs:{},workers:[],streetCrowd:null,stationCrowd:null,demoJob:null,activeShift:null,
draft:{gender:'m',outfit:'hoodie',colors:{top:null,bottom:null,hair:null,skin:null},name:''},
mode:'loading',yaw:0,spin:0.5,camRig:new CamRig(),overhead:new Overhead(),t:0,
};
window.__game=G;
G.music=music;
const NPC_LOOK={
tanaka:{kind:'hoodie',colors:{top:'#2e5a44',bottom:'#2b2b30',hair:'#2a2420'},helmet:'#f2c230'},
hung:{kind:'suit',colors:{top:'#3c5a86',bottom:'#2b2b30',hair:'#3a2a20'},helmet:'#f4f4f0'},
sato:{kind:'f_casual',colors:{top:'#6b8f9e',bottom:'#2b2b30',hair:'#5a3a24'},helmet:'#f4f4f0'},
hoa:{kind:'f_office',colors:{}},
tencho:{kind:'hoodie',colors:{top:'#3f8f5a',bottom:'#2b2b30'}},
suzuki:{kind:'f_casual',colors:{top:'#7a5236',bottom:'#5d6168',hair:'#e9e2d4'}},
clerk:{kind:'suit',colors:{}},
yamada:{kind:'care_f',colors:{top:'#8fc7d9',hair:'#3a2a20'}},
};
const FOLK_LOOK=[['elder_m','#4f7f8f'],['elder_f','#a0605f'],['elder_m','#8a7a4f'],['elder_f','#6d6a9a']];
const WORK_COLORS={top:'#1f3148',bottom:'#1c2c42'};
const BENTO_COLORS={top:'#f2f2ee',bottom:'#f2f2ee'};
const LOTUS_COLORS={top:'#2b3a36',bottom:'#3f5a3c'};
{
const installed=matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches||navigator.standalone===true;
const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(ios&&!installed){
if(/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent))document.documentElement.classList.add('ios-tb');
const hint=document.getElementById('ios-home');if(hint)hint.hidden=false;
}
const goFull=()=>{
if(installed||!matchMedia('(pointer: coarse)').matches)return;
const el=document.documentElement,req=el.requestFullscreen||el.webkitRequestFullscreen;
if(!req||document.fullscreenElement||document.webkitFullscreenElement)return;
try{
const p=req.call(el,{navigationUI:'hide'});
const lock=()=>screen.orientation?.lock?.('portrait').catch(()=>{});
if(p&&p.then)p.then(lock,()=>{});else lock();
}catch{}
};
addEventListener('pointerup',goFull,{once:true});
for(const id of['btn-new','btn-continue'])document.getElementById(id)?.addEventListener('click',goFull);
}
async function boot(){
pageview();
const bootT0=performance.now();
try{
const fontReady=document.fonts?document.fonts.load('700 48px "Zen Maru Gothic"','ラーメン安全第一'):Promise.resolve();
let stagesDone=0,musicDone=0,best=0;
const STAGES=9,TRACKS_N=16,EST_MODELS=64;
const step=(p)=>p.then((v)=>{stagesDone++;return v;});
const paint=(label)=>{
const total=Math.max(loadStats.started,EST_MODELS)+TRACKS_N+STAGES;
best=Math.max(best,Math.min(0.97,(loadStats.done+musicDone+stagesDone)/total));
$('bar').style.width=`${Math.round(best * 100)}%`;
$('loadpct').textContent=`${Math.round(best * 100)}%`;
$('loadmsg').textContent=label||`Đang tải mô hình ${loadStats.done}/${Math.max(loadStats.started, loadStats.done)} · nhạc ${musicDone}/${TRACKS_N}`;
};
const painter=setInterval(()=>paint(),150);
const musicP=music.prefetch(()=>{musicDone++;});
const outfitsP=Promise.all(Object.keys(OUTFITS).map((k)=>ensureSrc(k).catch(()=>null)));
const[town,site,care,bento,lotus]=await Promise.all([step(buildTown()),step(buildSite()),step(buildCare()),step(buildBento()),step(buildLotus()),
step(ensureShrine()),step(ensureStation()),step(ensureMarket()),outfitsP,musicP,fontReady.catch(()=>{})]);
G.stages.town=town;
G.stages.site=site;
G.stages.care=care;
G.stages.bento=bento;
G.stages.lotus=lotus;
const[lowtable,gas_stove,brandWhite,futon,washing_machine,drying_rack,rice_cooker,cooking_pot]=await Promise.all([loadModel('lowtable'),loadModel('gas_stove'),loadBrand('white'),loadModel('futon'),loadModel('washing_machine'),loadModel('drying_rack'),loadModel('rice_cooker'),loadModel('cooking_pot')]);
G.stages.dorm=buildDorm({lowtable,gas_stove,brandWhite,futon,washing_machine,drying_rack,rice_cooker,cooking_pot});stagesDone++;
clearInterval(painter);
{const sec=(performance.now()-bootT0)/1000;track(`loaded-${sec < 10 ? 'under-10s' : sec < 30 ? '10-30s' : sec < 60 ? '30-60s' : 'over-60s'}`,'Tải xong game');}
paint('Đang chuẩn bị đồ hoạ…');
await new Promise((r)=>setTimeout(r,30));
for(const st of Object.values(G.stages)){
if(!st?.scene)continue;
try{
if(!LOW_MEM)st.scene.traverse((o)=>{if(o.isMesh)for(const m of[].concat(o.material))for(const k of['map','emissiveMap','alphaMap','normalMap'])if(m&&m[k])renderer.initTexture(m[k]);});
trimShadowCasters(st.scene);
renderer.compile(st.scene,camera);
}catch(e){console.warn('warm-up',e);}
await new Promise((r)=>setTimeout(r,0));
}
$('bar').style.width='100%';$('loadpct').textContent='100%';
G.controls=new Controls($('joy'));
G.shift=new SiteShift({site:G.stages.site,controls:G.controls,overhead:G.overhead,camRig:G.camRig});
G.morning=new MorningWalk({controls:G.controls,overhead:G.overhead,camRig:G.camRig});
G.evening=new EveningWalk({controls:G.controls,overhead:G.overhead,camRig:G.camRig});
G.market=new MarketShop({controls:G.controls,overhead:G.overhead,camRig:G.camRig});
G.care=new CareShift({stage:G.stages.care,controls:G.controls,overhead:G.overhead,camRig:G.camRig});
G.bento=new BentoShift({stage:G.stages.bento,controls:G.controls,overhead:G.overhead,camRig:G.camRig});
G.lotus=new LotusShift({stage:G.stages.lotus,controls:G.controls,overhead:G.overhead,camRig:G.camRig});
G.dayoff=new DayOff({controls:G.controls,overhead:G.overhead,camRig:G.camRig});
G.streetCrowd=await new Crowd(G.stages.site.scene,{mode:'street',seed:331}).spawnStreet();
G.streetCrowd.setVisible(false);
await setPlayer();
setStage('town');
bindUi();
show('loading',false);
titleScreen();
requestAnimationFrame(frame);
}catch(e){
$('loadmsg').textContent='Không tải được ('+(e&&e.message?e.message:e)+'). Tải lại trang để thử lại.';
console.error(e);
}
}
function setStage(id){
const st=G.stages[id];
if(!st)return;
const cal=G.S?.cal;
if(cal)st.setSeason?.(seasonOf(cal).id);
if(G.stage===st)return;
G.overhead.clear();
G.player&&st.scene.add(G.player.holder);
G.stage=st;G.stageId=id;
G.camRig.init=false;
}
async function setPlayer(){
const d=G.draft;
const ch=await makeCharacter(d.outfit,d.colors);
if(d.outfit!==G.draft.outfit)return;
const old=G.player;
if(old){ch.holder.position.copy(old.holder.position);ch.yaw=old.yaw;old.holder.parent?.remove(old.holder);old.unpinAll();}
else ch.holder.position.set(0,0,1.2);
G.player=ch;G.own=ch;
const h=makeHelmet(ch);wearHelmet(ch,h.group);ch.helmet=h.group;h.group.visible=G.stageId==='site';
const c=makeSanitaryCap(ch);wearHelmet(ch,c.group);ch.cap=c.group;c.group.visible=G.stageId==='bento';
ch.waders=wearWaders(ch);ch.waders.setVisible(G.stageId==='lotus');
G.stage&&G.stage.scene.add(ch.holder);
}
async function npc(id,where){
const L=NPC_LOOK[id]||NPC_LOOK.tanaka;
if(!G.npcs[id]){
const ch=await makeCharacter(L.kind,L.colors);
if(L.helmet){const h=makeHelmet(ch,L.helmet);wearHelmet(ch,h.group);ch.helmet=h.group;}
if(id==='tanaka'||id==='sato'){const c=makeSanitaryCap(ch);wearHelmet(ch,c.group);ch.cap=c.group;c.group.visible=false;}
if(id==='tanaka'||id==='sato'||id==='hung'){ch.waders=wearWaders(ch);ch.waders.setVisible(false);}
G.npcs[id]=ch;
}
const ch=G.npcs[id];
G.stages[where].scene.add(ch.holder);
ch.unpinAll();
if(ch.helmet)ch.helmet.visible=where==='site';
if(ch.cap)ch.cap.visible=where==='bento';
if(ch.waders)ch.waders.setVisible(where==='lotus');
if(id==='tanaka'||id==='sato'||id==='hung'){
ch.look(where==='bento'?{...L.colors,...BENTO_COLORS}:where==='lotus'?{...L.colors,...LOTUS_COLORS}:L.colors);
}
return ch;
}
function hideNpcs(){for(const ch of Object.values(G.npcs)){ch.holder.parent?.remove(ch.holder);ch.unpinAll();}}
const jobOf=()=>G.demoJob||(G.S&&G.S.job)||'site';
const lookOf=()=>(G.S?G.S.look:{gender:G.draft.gender,colors:G.draft.colors});
function swapPlayer(ch){
if(!ch||G.player===ch)return G.player;
const old=G.player;
if(old){ch.holder.position.copy(old.holder.position);ch.yaw=old.yaw;old.holder.parent?.remove(old.holder);old.unpinAll();old.holder.rotation.x=0;}
ch.holder.rotation.x=0;ch.holder.visible=true;
G.player=ch;G.stage&&G.stage.scene.add(ch.holder);
return ch;
}
async function dress(atWork){
const job=jobOf();
const kind=atWork&&job==='care'?(lookOf().gender==='f'?'care_f':'care_m'):null;
if(!kind){
const ch=swapPlayer(G.own);
if(ch){
if(ch.helmet)ch.helmet.visible=false;
if(ch.cap)ch.cap.visible=!!(atWork&&job==='bento');
if(ch.waders)ch.waders.setVisible(!!(atWork&&job==='lotus'));
ch.look(
atWork&&job==='bento'?{...lookOf().colors,...BENTO_COLORS}
:atWork&&job==='lotus'?{...lookOf().colors,...LOTUS_COLORS}
:lookOf().colors,
);
}
return ch;
}
if(!G.wardrobe[kind])G.wardrobe[kind]=await makeCharacter(kind,{hair:lookOf().colors.hair,skin:lookOf().colors.skin});
return swapPlayer(G.wardrobe[kind]);
}
async function spawnFolk(){
if(!G.folk.length)G.folk=await Promise.all(FOLK_LOOK.map(([kind,top])=>makeCharacter(kind,{top})));
for(const ch of G.folk)G.stages.care.scene.add(ch.holder);
seatFolk(G.folk);
}
async function spawnWorkers(){
if(G.workers.length)return;
for(let i=0;i<WANDER.length;i++){
const kind=i%2?'suit':'hoodie';
const ch=await makeCharacter(kind,{top:['#1f3148','#5d6168','#2e5a44'][i%3],bottom:'#2b2b30',hair:'#2a2420'});
const h=makeHelmet(ch,i%2?'#f4f4f0':'#f2c230');
wearHelmet(ch,h.group);
const[x,z,xr,zr]=WANDER[i];
ch.holder.position.set(x,0,z);
G.stages.site.scene.add(ch.holder);
ch.w={x,z,xr,zr,tx:x,tz:z,wait:Math.random()*3};
G.workers.push(ch);
}
}
function updateWorkers(dt){
for(const ch of G.workers){
const w=ch.w,p=ch.holder.position;
if(w.wait>0){w.wait-=dt;ch.moveAt(0);if(w.wait<=0){w.tx=w.x+(Math.random()-0.5)*w.xr;w.tz=w.z+(Math.random()-0.5)*w.zr;}}
else{
const dx=w.tx-p.x,dz=w.tz-p.z,d=Math.hypot(dx,dz);
if(d<0.1){w.wait=1+Math.random()*3;ch.moveAt(0);continue;}
const ox=p.x,oz=p.z;
p.x+=dx/d*1.5*dt;p.z+=dz/d*1.5*dt;
ch.yaw=Math.atan2(dx,dz);
ch.moveAt(dt>0?Math.hypot(p.x-ox,p.z-oz)/dt:0);
}
}
}
function bindUi(){
$('btn-new').addEventListener('click',()=>creatorScreen());
$('btn-continue').addEventListener('click',()=>{const S=load(storage);if(S){track('continue','⏯ Chơi tiếp');G.S=S;G.draft.colors=S.look.colors;G.draft.outfit=S.look.outfit;setPlayer().then(runStep);}});
$('btn-demo').addEventListener('click',demoScreen);
$('btn-career').addEventListener('click',careerScreen);
const musicLabel=()=>{const b=$('btn-music');if(b)b.textContent=music.muted?'🔇 Nhạc nền: tắt':'🎵 Nhạc nền: bật';};
musicLabel();
$('btn-music')?.addEventListener('click',()=>{music.start();music.toggle();musicLabel();});
$('btn-menu').addEventListener('click',pauseMenu);
$('btn-cal').addEventListener('click',calendarModal);
$('btn-note')?.addEventListener('click',notebookModal);
$('btn-phone')?.addEventListener('click',phoneModal);
$('day-label').parentElement?.addEventListener('click',calendarModal);
const imp=(el,k,v)=>{if(el.style.getPropertyValue(k)!==v)el.style.setProperty(k,v,'important');};
function layoutHud(){
const hud=$('shifthud');if(hud.hidden)return;
const H=hud.getBoundingClientRect();if(!H.width)return;
const rank=$('sh-rank'),bars=$('sh-bars'),chips=$('sh-chips'),ticket=$('sh-ticket'),tip=$('sh-tip');
const vis=(el)=>el&&!el.hidden&&getComputedStyle(el).display!=='none';
const L=Math.max(12,rank.getBoundingClientRect().left-H.left||12);
let y=0;
for(const el of[hud.querySelector('.top'),$('btn-menu'),$('btn-phone')]){
if(!el||el.hidden)continue;const r=el.getBoundingClientRect();if(r.height)y=Math.max(y,r.bottom-H.top);
}
y=Math.round(y+6);
const W=H.width,rankOn=vis(rank)&&rank.textContent.trim(),barsOn=vis(bars);
const rw=rankOn?rank.scrollWidth:0,bw=barsOn?bars.offsetWidth:0;
const inline=!rankOn||!barsOn||L+rw+8+bw+L<=W;
let bottom=y;
if(rankOn){imp(rank,'top',y+'px');imp(rank,'max-width',(inline&&barsOn?W-2*L-bw-8:W-2*L)+'px');bottom=Math.max(bottom,y+rank.offsetHeight);}
if(barsOn){
const by=inline?y:bottom+5;
imp(bars,'top',by+'px');
if(inline){imp(bars,'left','auto');imp(bars,'right',L+'px');}else{imp(bars,'right','auto');imp(bars,'left',L+'px');}
bottom=Math.max(bottom,by+bars.offsetHeight);
}
let low=bottom;
for(const el of[chips,ticket]){
if(!vis(el))continue;
imp(el,'top',(bottom+6)+'px');
if(el===chips)imp(el,'max-width',(vis(ticket)?W-2*L-ticket.offsetWidth-8:W-2*L)+'px');
low=Math.max(low,bottom+6+el.offsetHeight);
}
if(vis(tip))imp(tip,'top',(low+6)+'px');
}
$('sh-rank').style.pointerEvents='auto';
$('sh-rank').addEventListener('click',()=>{if(G.S)calendarModal();});
{
const place=$('sh-place'),tip=$('sh-tip');
let placeT=0,tipT=0,lastPlace='',lastTip='';
const flash=()=>{place.classList.add('flash');clearTimeout(placeT);placeT=setTimeout(()=>place.classList.remove('flash'),3200);};
const fresh=()=>{tip.classList.remove('mini');clearTimeout(tipT);tipT=setTimeout(()=>tip.classList.add('mini'),6000);};
tip.style.pointerEvents='auto';
tip.addEventListener('click',fresh);
setInterval(()=>{
const p=place.textContent.trim();
if(p!==lastPlace){lastPlace=p;if(p)flash();}
const t=tip.hidden?'':tip.textContent.trim();
if(t!==lastTip){lastTip=t;if(t)fresh();}
layoutHud();
},200);
addEventListener('resize',()=>requestAnimationFrame(layoutHud));
}
setInterval(()=>{
const on=!['title','creator','jobs'].includes(G.mode)&&$('title').hidden&&$('creator').hidden;
$('btn-menu').hidden=!on;
$('btn-cal').hidden=!on||!G.S;
if($('btn-note'))$('btn-note').hidden=!on||!G.S;
if($('btn-phone'))$('btn-phone').hidden=!on||!G.S;
$('app').classList.toggle('has-menu',on);
if(G.S){
const cal=ensureCal(G.S);
const red=isRedPill(cal);
$('day-label').parentElement?.classList.toggle('red-day',red);
$('sh-rank')?.classList.toggle('red-day',red);
const u=unreadCount(G.S,cal);
const bd=$('phone-badge');
if(bd){bd.hidden=u<=0;bd.textContent=u>9?'9+':String(u);}
renderHomeChips(G.S,cal);
{const k=`y${cal.year}-s${cal.season}`;if(G.S.flags.gcSeason&&G.S.flags.gcSeason!==k)track(`season-${k}`,`Tới mùa ${['xuân', 'hạ', 'thu', 'đông'][cal.season]} năm ${cal.year}`);G.S.flags.gcSeason=k;}
notifyAchievements(G.S);
}
},300);
$('stats').addEventListener('click',onStatsTap);
$('sh-bars').addEventListener('click',onStatsTap);
setInterval(()=>{
const box=$('sh-bars'),hud=$('shifthud');
if(!G.S||hud.hidden||G.S.flags.demo){box.hidden=true;return;}
box.hidden=false;
const S=G.S,sk=skillInfo(S,jobOf()),lvl=(v)=>(v<WELL.WARN?'bad':v<60?'mid':'ok');
const m=(k,icon,v,cls)=>`<button type="button" class="sbar mini ${cls}" data-k="${k}" aria-label="${k}"><span class="sb-i">${icon}</span><span class="sb-t"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span></button>`;
const html=m('health','❤️',S.health,lvl(S.health))+m('mental','🧠',S.mental,lvl(S.mental))+m('skill','🛠️',sk.pct,sk.maxed?'max':'skill');
if(box.dataset.h!==html){box.dataset.h=html;box.innerHTML=html;}
},250);
$('btn-credits').addEventListener('click',creditsScreen);
$('cr-back').addEventListener('click',titleScreen);
$('cr-next').addEventListener('click',jobScreen);
$('jobs-back').addEventListener('click',creatorScreen);
for(const b of document.querySelectorAll('#gender button')){
b.addEventListener('click',()=>{
if(G.draft.gender===b.dataset.g)return;
G.draft.gender=b.dataset.g;
for(const x of document.querySelectorAll('#gender button'))x.setAttribute('aria-pressed',String(x===b));
$('name').placeholder=G.draft.gender==='f'?'Ví dụ: Lan':'Ví dụ: Minh';
outfitList();pickOutfit(Object.keys(OUTFITS).find((k)=>OUTFITS[k].g===G.draft.gender&&!OUTFITS[k].uniform&&!OUTFITS[k].npc));
});
}
let drag=null;
$('c').addEventListener('pointerdown',(e)=>{if(G.mode==='creator')drag={x:e.clientX,yaw:G.yaw};});
addEventListener('pointermove',(e)=>{if(drag&&G.mode==='creator'){G.yaw=drag.yaw+(e.clientX-drag.x)*0.012;G.spin=0;}});
addEventListener('pointerup',()=>{drag=null;});
}
function activeModule(){
return{shift:G.activeShift||G.shift,morning:G.morning,evening:G.evening,market:G.market,dayoff:G.dayoff}[G.mode]||null;
}
function pauseMenu(){
const overCard=!$('modal').hidden&&G.mode==='talk'&&!!G.S?.life;
if(!$('modal').hidden&&!overCard)return;
const mod=activeModule(),was=mod?mod.paused:false;
if(mod)mod.paused=true;
const demo=!G.S||G.S.flags.demo||G.demoJob;
card(`<h2>⏸ Tạm dừng</h2><p>${demo ? 'Đang ở chế độ thử, không lưu.' : 'Tiến độ đã lưu tới bước gần nhất. Về màn hình chính thì phần đang làm dở (ca làm, đường đi) sẽ làm lại từ đầu bước này.'}</p>`,[
{label:'▶ Tiếp tục',on:()=>{if(mod)mod.paused=was;if(overCard)runStep();}},
...(G.S?[
{label:'📅 Lịch 4 mùa',cls:'ghost',on:()=>{if(mod)mod.paused=was;calendarModal(overCard);}},
{label:'📒 Sổ tay thành tựu',cls:'ghost',on:()=>{if(mod)mod.paused=was;notebookModal(overCard);}},
]:[]),
{label:music.muted?'🔈 Bật nhạc nền':'🔇 Tắt nhạc nền',cls:'ghost',on:()=>{music.toggle();if(mod)mod.paused=was;toast(music.muted?'🔇 Đã tắt nhạc nền':'🎵 Đã bật nhạc nền');if(overCard)runStep();}},
{label:'🏠 Về màn hình chính',cls:'ghost',on:()=>{
try{if(mod&&mod.stop)mod.stop();}catch(e){console.warn(e);}
if(mod)mod.active=false;
if(G.player){G.player.unpinAll();G.player.holder.rotation.x=0;G.player.bendTo=0;G.player.reachTo=0;}
titleScreen();
}},
]);
}
function hideAll(){for(const id of['title','creator','jobs','dayhud','talk','shifthud','modal'])show(id,false);G.talkPair=null;}
function titleScreen(){
hideAll();hideNpcs();setStage('town');G.stages.town.setTime('day');
G.demoJob=null;swapPlayer(G.own);
if(G.own){if(G.own.helmet)G.own.helmet.visible=false;if(G.own.cap)G.own.cap.visible=false;if(G.own.waders)G.own.waders.setVisible(false);G.own.look(G.draft.colors);}
G.mode='title';G.player.holder.visible=true;
G.player.holder.position.set(0,0,1.2);G.player.play('idle');
const S=load(storage);
const c=$('btn-continue');
c.hidden=!S;
$('btn-career').hidden=!S;
if(S)c.textContent=`⏯ Chơi tiếp với ${S.name || 'Bạn'} · ${S.life && S.cal ? calLabel(S.cal) : S.week ? 'Tháng ' + S.week : 'Ngày ' + Math.min(DAYS, S.story + 1) + '/5'}`;
G.stages.town.setSeason?.(S&&S.life&&S.cal?seasonOf(S.cal).id:'spring');
show('title');
}
function ensureCal(S=G.S){
if(!S)return newCalendar();
if(!S.cal)S.cal=newCalendar();
if(!S.life)S.cal.day=S.story<DAYS?(S.story||0)+1:7;
return S.cal;
}
const curDayKey=(S=G.S)=>(S?.life&&S?.cal?`${S.cal.year}-${S.cal.season}-${S.cal.day}`:(S?.story||0));
const curWeather=(S=G.S)=>weatherOf(ensureCal(S),S?.seed||1);
const curWeatherFx=(S=G.S)=>weatherFx(curWeather(S));
const isRedPill=(cal)=>weekday(cal)===6||isRedDay(cal)||eventsOn(cal).some((e)=>e.kind==='off');
function hudCalText(S=G.S,sub=''){
const cal=ensureCal(S);
const base=calLabel(cal,curWeather(S));
return sub?`${base} · ${sub}`:base;
}
function calendarModal(forceOver=false){
const overCard=forceOver||(!$('modal').hidden&&G.mode==='talk'&&!!G.S?.life);
if((!$('modal').hidden&&!overCard)||!G.S)return;
const mod=activeModule(),was=mod?mod.paused:false;
if(mod)mod.paused=true;
const cur=ensureCal(G.S);
let vYear=cur.year,vSeason=cur.season,selDay=cur.day;
const tom=nextDay(cur);
const renderCal=()=>{
const sInfo=SEASONS[vSeason]||SEASONS[0];
const cells=[];
for(let d=1;d<=DAYS_PER_SEASON;d++){
const c={year:vYear,season:vSeason,day:d};
const wd=weekday(c);
const isToday=vYear===cur.year&&vSeason===cur.season&&d===cur.day;
const isTom=vYear===tom.year&&vSeason===tom.season&&d===tom.day;
const isPast=vYear<cur.year||(vYear===cur.year&&vSeason<cur.season)||(vYear===cur.year&&vSeason===cur.season&&d<cur.day);
const evs=eventsOn(c);
const pay=paydayOn(c);
const wIcon=(isPast||isToday||isTom)?weatherFx(weatherOf(c,G.S.seed||1)).icon:'';
const badge=(evs[0]?.icon||'')+(pay?'💴':'')||wIcon;
const cls=[
'cal-cell',
wd===5?'sat':'',
isRedPill(c)?'red':'',
isToday?'today':'',
d===selDay?'sel':'',
].filter(Boolean).join(' ');
cells.push(`<button type="button" class="${cls}" data-d="${d}"><span class="d">${d}</span><span class="ic">${badge}</span></button>`);
}
const selCal={year:vYear,season:vSeason,day:selDay};
const selEvs=eventsOn(selCal);
const selPay=paydayOn(selCal);
const isNear=(vYear===cur.year&&vSeason===cur.season&&selDay<=cur.day+1)
||(vYear===tom.year&&vSeason===tom.season&&selDay===tom.day)
||vYear<cur.year||(vYear===cur.year&&vSeason<cur.season);
const selW=isNear?weatherFx(weatherOf(selCal,G.S.seed||1)):null;
const statusTxt=isRedDay(selCal)?'🎌 Ngày lễ quốc gia (nghỉ làm)'
:isMandatoryOff(selCal)?'🎌 Ngày nghỉ'
:isSaturdayWorkable(selCal)?'👷 Thứ Bảy (nghỉ hoặc đăng ký tăng ca +12.000 ¥)'
:'🧰 Ngày đi làm (T2–T6)';
card(`<h2>📅 Lịch 4 mùa · カレンダー</h2>
      <div class="cal-nav">
        <button type="button" id="cal-prev" aria-label="Mùa trước">◀</button>
        <b>${sInfo.icon} Mùa ${sInfo.vi} (${sInfo.jp} · tháng ${sInfo.months}) · Năm ${vYear}</b>
        <button type="button" id="cal-next" aria-label="Mùa sau">▶</button>
      </div>
      <div class="cal-wk">
        <span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span class="sat">土</span><span class="sun">日</span>
      </div>
      <div class="cal-grid" id="cal-grid">${cells.join('')}</div>
      <div class="cal-info">
        <div><b>${sInfo.icon} ${sInfo.vi} · Ngày ${selDay} (${WEEKDAYS[weekday(selCal)]} · ${WEEKDAYS_VI[weekday(selCal)]}) · Năm ${vYear}</b></div>
        <div>${statusTxt}${selW ? ` · Thời tiết: <b>${selW.icon} ${esc(selW.jp)} (${esc(selW.vi)})</b>` : ' · 📺 Xem dự báo trên TV tối hôm trước'}</div>
        ${selPay ? '<div>💴 <b>Ngày nhận lương định kỳ (給与明細):</b> nhận lương kỳ + phụ cấp bậc nghề + tăng ca, trừ tiền nhà 15.000 ¥, thuế 12% và trả nợ 25.000 ¥.</div>' : ''}
        ${selEvs.map((ev) => `<div>${ev.icon} <b>${esc(ev.jp)} — ${esc(ev.vi)}:</b> ${esc(ev.desc)}</div>`).join('')}
      </div>`,[
{label:'Đóng lịch',on:()=>{if(mod)mod.paused=was;if(overCard)runStep();}},
]);
$('cal-prev')?.addEventListener('click',()=>{
if(vSeason>0)vSeason--;
else if(vYear>1){vYear--;vSeason=3;}
selDay=1;
renderCal();
});
$('cal-next')?.addEventListener('click',()=>{
if(vSeason<3)vSeason++;
else{vYear++;vSeason=0;}
selDay=1;
renderCal();
});
for(const b of document.querySelectorAll('#cal-grid .cal-cell')){
b.addEventListener('click',()=>{
selDay=Number(b.dataset.d)||1;
renderCal();
});
}
};
renderCal();
}
let achToastTimer=null;
function notifyAchievements(S=G.S){
if(!S||S.flags?.demo)return;
const newly=checkAchievements(S);
if(!newly.length)return;
save(S,storage);
const el=$('ach-toast');
const msg=`📒 ピロン♪ Thành tựu mới: ${newly.map((a) => `${a.icon} ${a.vi} (${a.jp})`).join(' · ')}`;
if(el){
el.textContent=msg;
el.hidden=false;
clearTimeout(achToastTimer);
achToastTimer=setTimeout(()=>{el.hidden=true;},4500);
}
}
function notebookModal(forceOver=false){
const overCard=forceOver||(!$('modal').hidden&&G.mode==='talk'&&!!G.S?.life);
if((!$('modal').hidden&&!overCard)||!G.S)return;
const mod=activeModule(),was=mod?mod.paused:false;
if(mod)mod.paused=true;
const S=G.S;
ensureFestivalState(S);
notifyAchievements(S);
const nb=S.notebook||{};
const visited=Array.isArray(S.festLog?.visited)?S.festLog.visited:[];
const unlockedList=ACHIEVEMENTS.filter((a)=>nb[a.id]);
const lockedList=ACHIEVEMENTS.filter((a)=>!nb[a.id]);
const stampCount=ANNUAL_FESTIVAL_IDS.filter((id)=>visited.includes(id)).length;
const goldfishCount=S.pets?.goldfish||0;
const stampsHtml=ANNUAL_FESTIVAL_IDS.map((id)=>{
const f=FESTIVALS[id];
const done=visited.includes(id);
return`<div class="nb-stamp ${done ? 'stamped' : ''}">
      <span class="ic">${f.icon}</span>
      <div><b>${esc(f.jp)}</b></div>
      <div>${esc(f.vi)}</div>
      <div style="margin-top:2px;font-weight:800">${done ? '💮 Đã đóng dấu' : '⬜ Chưa tham gia'}</div>
    </div>`;
}).join('');
const itemsHtml=[
...unlockedList.map((a)=>`<div class="nb-item unlocked">
      <div>${a.icon} <b>${esc(a.vi)}</b> · <span class="jp">${esc(a.jp)}</span></div>
      <div>${esc(a.desc || a.hint || '')}</div>
      <div class="at">📅 Đã mở: ${esc(nb[a.id]?.at || '')}</div>
    </div>`),
...lockedList.map((a)=>`<div class="nb-item locked">
      <div>🔒 <b>${esc(a.vi)}</b> · <span class="jp">${esc(a.jp)}</span></div>
      <div>💡 Gợi ý: ${esc(a.hint)}</div>
    </div>`),
].join('');
card(`
    <h2>📒 Sổ tay thành tựu & Lễ hội</h2>
    <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px">
      <span class="delta">🏆 Thành tựu: ${unlockedList.length}/${ACHIEVEMENTS.length}</span>
      <span class="delta">💮 Dấu lễ hội: ${stampCount}/${ANNUAL_FESTIVAL_IDS.length}</span>
      <span class="delta">🐠 Cá vàng ở phòng: ${goldfishCount} con</span>
    </div>
    <div style="font-size:13px;font-weight:700;margin-top:2px">🎌 Bảng đóng dấu 8 lễ hội lớn trong năm (祭りスタンプ帳)</div>
    <div class="nb-stamps">${stampsHtml}</div>
    <div style="font-size:13px;font-weight:700">🏆 Danh sách thành tựu (${unlockedList.length}/${ACHIEVEMENTS.length})</div>
    <div class="nb-list">${itemsHtml}</div>
  `,[
{label:'Đóng sổ tay',on:()=>{if(mod)mod.paused=was;if(overCard)runStep();}},
]);
}
function renderHomeChips(S=G.S,cal=ensureCal(S)){
if(!S||S.flags?.demo){
if($('day-chips'))$('day-chips').hidden=true;
if($('sh-chips'))$('sh-chips').hidden=true;
return;
}
const chips=homeChips(S,cal);
const html=chips.map((c)=>`<span class="hchip" data-c="${c.id}">${esc(c.text)}</span>`).join('');
for(const id of['day-chips','sh-chips']){
const el=$(id);
if(!el)continue;
el.hidden=chips.length===0;
if(el.dataset.h!==html){
el.dataset.h=html;
el.innerHTML=html;
}
}
}
function revealBox(S,box,after){
const r=openBox(S,box);
if(!S.flags?.demo)save(S,storage);
const price=box.price||HOLI.BOX_PRICE;
let t=0.35;
const flips=r.cards.map((c)=>{
const d=t;t+=c.best?0:0.45;if(c.best)t+=0.3;
return`<div class="tcard t-${c.tier}${c.best ? ' best' : ''}" style="animation-delay:${(c.best ? d + 0.5 : d).toFixed(2)}s">
      <div class="tc-in"><div class="tc-back">モンスター<br>カード</div><div class="tc-face"><span class="tc-ic">${c.icon}</span><b>${esc(c.jp)}</b><small>${esc(c.vi)}</small><i>${c.tier}</i></div></div></div>`;
}).join('');
const shop=Math.round(r.value*HOLI.SHOP_BUY_RATE),pf=(n)=>(n>=0?`lãi +${yen(n)}`:`lỗ −${yen(-n)}`);
const result=()=>{
const b=box.best||r.cards[4];
const app=Math.max(0,r.value-Math.round(r.value*HOLI.APP_FEE_RATE)-HOLI.APP_SHIP_FEE);
const head=r.rare
?`<div class="rare-hit t-${r.tier}"><div class="rh-glow"></div><div class="rh-card"><span class="tc-ic">${b.icon}</span><b>${esc(b.jp)}</b><small>${esc(b.vi)}</small><i>${r.tier}</i></div></div>
         <h2 class="rh-title">${r.tier === 'UR' ? '🎉 TRÚNG THẺ SIÊU HIẾM!!' : '✨ Trúng thẻ hiếm!'}</h2>`
:`<div class="big">😮‍💨</div><h2>Toàn thẻ thường…</h2><p>5 lá chỉ có <b>${esc(b.jp)}</b> là đáng chút tiền. Ngoài đời bóc thẻ cũng vậy: đa số hộp lỗ.</p>`;
card(`${head}
      <div class="rh-price">Định giá cả hộp: <b>${yen(r.value)}</b><small>Giá mua ${yen(price)} → ${pf(r.value - price)}</small></div>
      <p class="lesson">💴 Tiệm thẻ カードショップ 買取 trả ngay <b>${yen(shop)}</b> (${pf(shop - price)}). 📱 Chợ Cũ được khoảng ${yen(app)} sau phí 10 % + ship, nhưng phải chờ người mua.</p>`,[
{label:`💴 Bán ngay cho tiệm thẻ (${yen(shop)})`,on:()=>{
const sres=sellToShop(S,box);if(!S.flags?.demo)save(S,storage);
toast(`💴 Tiệm thẻ trả ${yen(sres.net)}`,sres.profit>=0?`Lãi +${yen(sres.profit)} 🎉`:`Lỗ −${yen(-sres.profit)} so với giá hộp`,4.5);
if(after)after();
}},
{label:'📱 Giữ lại, đăng Chợ Cũ sau',cls:'ghost',on:()=>{toast('📱 Đã cất thẻ','Mở 📱 → tab Chợ Cũ để đăng bán khi muốn');if(after)after();}},
{label:'🗂 Giữ sưu tầm (🧠 +2)',cls:'ghost',on:()=>{if(after)after();}},
]);
$('card').classList.toggle('rare-card',!!r.rare);
};
card(`<h2>🃏 Bóc hộp モンスターカード 限定BOX</h2><div class="tflip">${flips}</div>
    <p class="hint" style="text-align:center">Lá cuối là lá quyết định…</p>`,[{label:'Xem kết quả →',on:result}]);
$('card').classList.remove('rare-card');
}
function phoneModal(startTab='lime'){
const overCard=!$('modal').hidden&&G.mode==='talk'&&!!G.S?.life;
if((!$('modal').hidden&&!overCard)||!G.S)return;
const mod=activeModule(),was=mod?mod.paused:false;
if(mod)mod.paused=true;
const S=G.S,cal=ensureCal(S);
const h=ensureHome(S);
ensureHolidayState(S);
ensurePapers(S);
ensurePrep(S);
let tab=startTab==='chocu'?'chocu':startTab==='todo'?'todo':'lime';
const renderPhone=()=>{
const todos=paperTodo(S,cal);
const tabBar=`<div class="seg" style="margin-bottom:6px;width:100%;justify-content:center">
      <button type="button" id="tab-lime" aria-pressed="${tab === 'lime'}">💬 LIME</button>
      <button type="button" id="tab-chocu" aria-pressed="${tab === 'chocu'}">🛒 Chợ Cũ (${S.cards.length})</button>
      <button type="button" id="tab-todo" aria-pressed="${tab === 'todo'}">📋 Việc cần làm (${todos.length})</button>
    </div>`;
if(tab==='todo'){
const todoRows=todos.map((d)=>{
const red=d.daysLeft<=3;
const leftTxt=d.daysLeft<0?`Quá hạn ${-d.daysLeft} ngày!`:`Còn ${d.daysLeft} ngày`;
return`<div class="lime-msg${red ? ' unread' : ''}">
          <div class="lime-head"><b>📋 ${esc(d.jp)} — ${esc(d.vi)}</b><span style="${red ? 'color:var(--bad);font-weight:700' : ''}">${esc(leftTxt)}</span></div>
          <div>Nơi làm: <b>${esc(d.placeVi)}</b> · Hạn: <b>${esc(d.dueLabel)}</b>${d.cost ? ` · Phí: <b>${yen(d.cost)}</b>` : ''}</div>
          <div style="font-size:12px;color:var(--ink-dim)">${esc(d.desc)}</div>
        </div>`;
}).join('');
const doneRows=Object.values(PAPER_DOCS).filter((d)=>S.papers?.[d.id]).map((d)=>
`<div style="font-size:12.5px;color:var(--ink-dim);padding:3px 0">✅ <b>${esc(d.jp)}</b> — ${esc(d.vi)}: Đã hoàn thành</div>`,
).join('');
const bikeTxt=S.bike?.owned
?`🚲 Đang có xe (${S.bike.registered ? 'đã đăng ký 防犯登録' : '⚠️ chưa đăng ký 防犯登録 600 ¥'})`
:S.bike?.stolen?'🚲 Xe đạp đang bị mất (báo お巡りさん)':'🚶 Chưa mua xe đạp';
card(`<h2>📋 Việc cần làm · 手続き・メモ</h2>
        ${tabBar}
        <p style="font-size:12.5px;color:var(--ink-dim)">🎒 Túi khẩn cấp 非常持ち出し袋: <b>${prepScore(S)}/5</b> · ${bikeTxt}</p>
        <div class="lime-list" id="todo-list">
          ${todoRows || '<p>🎉 Bạn đã hoàn thành hết các giấy tờ cần làm hiện tại!</p>'}
          ${doneRows ? `<div style="margin-top:8px;border-top:1px solid rgba(0,0,0,0.08);padding-top:6px">${doneRows}</div>` : ''}
        </div>
        <p class="lesson">🏛️ <b>市役所</b> mở T2–T6 (8:30–17:15) và sáng thứ Bảy ngày 13 mỗi mùa (<b>土曜開庁</b> 9:00–12:00). <b>郵便局</b> mở T2–T6 (9:00–17:00).</p>`,[
{label:'Đóng điện thoại',on:()=>{if(mod)mod.paused=was;if(overCard)runStep();}},
]);
$('tab-lime')?.addEventListener('click',()=>{tab='lime';renderPhone();});
$('tab-chocu')?.addEventListener('click',()=>{tab='chocu';renderPhone();});
$('tab-todo')?.addEventListener('click',()=>{tab='todo';renderPhone();});
return;
}
if(tab==='chocu'){
const today=totalDays(cal);
const cardRows=S.cards.map((c,idx)=>{
const daysHeld=Math.max(0,today-(c.boughtDay||today));
const est=c.opened?c.value:marketPrice(c,daysHeld,()=>((idx*37+today*13)%100)/100);
c.askPrice=est;
const net=Math.max(0,est-Math.round(est*HOLI.APP_FEE_RATE)-HOLI.APP_SHIP_FEE);
return`<div class="lime-msg">
          <div class="lime-head"><b>🃏 ${c.opened ? `Thẻ đã mở · ${esc(c.rarity || 'Thường')}` : 'モンスターカード 限定BOX (Nguyên seal)'}</b><span>Mua: ${yen(c.price || 5500)}</span></div>
          <div>Giá thị trường Chợ Cũ: <b>${yen(est)}</b> · Thực nhận sau phí 10% + ship 700 ¥: <b>${yen(net)}</b></div>
          <div class="lime-acts">
            ${!c.opened ? `<button type="button" class="pri" data-cidx="${idx}" data-cact="open">✨ Bóc hộp xem thẻ</button>` : ''}
            <button type="button" class="pri" data-cidx="${idx}" data-cact="sell">💰 Đăng bán (nhận ${yen(net)})</button>
          </div>
        </div>`;
}).join('');
card(`<h2>🛒 フリマ App "Chợ Cũ"</h2>
        ${tabBar}
        <p style="font-size:12.5px;color:var(--ink-dim)">Sàn mua bán đồ cũ & thẻ sưu tầm モンスターカード (phí sàn 10% + phí ship 700 ¥) · 💴 Tiền mặt: <b>${yen(S.money)}</b></p>
        <div class="lime-list" id="chocu-list">${cardRows || '<p>Bạn chưa có hộp thẻ hay món đồ nào trong kho. Sáng ngày lễ có thể xếp hàng mua モンスターカード 限定BOX trước 10:00!</p>'}</div>`,[
{label:'🤝 Mua lại hộp từ người lạ trên Chợ Cũ (4.800 ¥ · coi chừng hàng giả)',cls:'ghost',on:()=>{
const r=buyFromStranger(S,4800);
if(!r.ok){toast('💴 Chưa đủ tiền','Cần 4.800 ¥');renderPhone();return;}
if(!S.flags?.demo)save(S,storage);
if(r.fake)toast('😱 Mua phải hộp giả dán lại seal!','Bên trong toàn giấy vụn! Mất trắng 4.800 ¥ · 🧠 −6',5);
else toast('📦 Đã mua 1 hộp モンスターカード 限定BOX!','May quá, hộp thật nguyên seal!');
if(!$('dayhud').hidden)$('stats').innerHTML=statsHtml();
renderPhone();
}},
{label:'Đóng điện thoại',on:()=>{if(mod)mod.paused=was;if(overCard)runStep();}},
]);
$('tab-lime')?.addEventListener('click',()=>{tab='lime';renderPhone();});
$('tab-chocu')?.addEventListener('click',()=>{tab='chocu';renderPhone();});
$('tab-todo')?.addEventListener('click',()=>{tab='todo';renderPhone();});
for(const b of document.querySelectorAll('#chocu-list button[data-cidx]')){
b.addEventListener('click',()=>{
const idx=Number(b.dataset.cidx);
const item=S.cards[idx];
if(!item)return;
if(b.dataset.cact==='open'){
if(mod)mod.paused=was;
revealBox(S,item,()=>phoneModal('chocu'));
return;
}else if(b.dataset.cact==='sell'){
const r=sellOnApp(S,item);
const pf=r.profit>=0?`Lãi +${yen(r.profit)}`:`Lỗ −${yen(-r.profit)}`;
toast(`💰 Đã bán trên Chợ Cũ +${yen(r.net)}`,`Phí 10% (${yen(r.fee)}) + ship 700 ¥ · ${pf}`,4.5);
}
if(!S.flags?.demo)save(S,storage);
if(!$('dayhud').hidden)$('stats').innerHTML=statsHtml();
renderPhone();
});
}
return;
}
const list=inboxFor(S,cal).slice().reverse();
let marked=false;
for(const m of list){
if(!m.read){m.read=true;marked=true;}
}
if(marked&&!S.flags?.demo)save(S,storage);
const sj=S.life?sideJobOffer(S,cal,S.seed):null;
const sjHtml=sj&&!S.lDay?.sideJobHandled?`<div class="lime-msg unread">
      <div class="lime-head"><b>🕵️ Người quen giới thiệu việc chui</b><span>Ngày nghỉ · Tiền mặt</span></div>
      <div>「${esc(sj.jp)}」 — Ê, hôm nay nghỉ có chỗ cần người phụ dọn kho trả tiền mặt <b>${yen(sj.pay)}</b> liền tay không qua sổ sách. Đi không?</div>
      <div class="lime-acts">
        <button type="button" class="pri" id="sj-refuse">🙅 Từ chối (giữ đúng luật 資格外活動 · 🧠 +1)</button>
        <button type="button" id="sj-take">⚠️ Đi làm chui (+${yen(sj.pay)}, ❤️ −10 · rủi ro bị phát hiện)</button>
      </div>
    </div>`:'';
const rows=list.slice(0,12).map((m)=>{
let acts='';
if(!m.replied){
if(m.ask>0){
acts=`<div class="lime-acts">
            <button type="button" class="pri" data-uid="${esc(m.uid)}" data-act="legal">💸 Gửi qua dịch vụ chính thức (${yen(m.ask)} + phí 1.500 ¥)</button>
            <button type="button" class="pri" data-uid="${esc(m.uid)}" data-act="cheap">💸 Nhờ người quen chuyển chui (${yen(m.ask)} + phí 300 ¥, tỉ giá tốt)</button>
            <button type="button" data-uid="${esc(m.uid)}" data-act="later">Nhắn lại: tháng sau con gửi</button>
          </div>`;
}else{
acts=`<div class="lime-acts">
            <button type="button" data-uid="${esc(m.uid)}" data-act="reply">💬 Nhắn lại hỏi thăm gia đình</button>
          </div>`;
}
}else{
acts=`<div style="font-size:11.5px;color:var(--ink-dim)">✓ ${esc(m.replyNote || 'Đã phản hồi')}</div>`;
}
return`<div class="lime-msg">
        <div class="lime-head"><b>💬 ${esc(m.from)}</b><span>Ngày ${m.totalDay}${m.why ? ` · ${esc(m.why)}` : ''}</span></div>
        <div>${esc(m.text)}</div>
        ${acts}
      </div>`;
}).join('');
card(`<h2>📱 Điện thoại · LIME & Chợ Cũ</h2>
      ${tabBar}
      <p style="font-size:12.5px;color:var(--ink-dim)">🏠 Nhớ nhà: <b>${h.homesick}/100</b> · 👕 Quần áo bẩn: <b>${h.dirty}/100</b> · 💴 Tiền mặt: <b>${yen(S.money)}</b></p>
      <div class="lime-list" id="lime-list">${sjHtml}${rows || '<p>Chưa có tin nhắn mới.</p>'}</div>`,[
{label:'Đóng LIME',on:()=>{if(mod)mod.paused=was;if(overCard)runStep();}},
]);
$('tab-lime')?.addEventListener('click',()=>{tab='lime';renderPhone();});
$('tab-chocu')?.addEventListener('click',()=>{tab='chocu';renderPhone();});
$('tab-todo')?.addEventListener('click',()=>{tab='todo';renderPhone();});
$('sj-refuse')?.addEventListener('click',()=>{
const r=refuseSideJob(S);
S.lDay=S.lDay||{};
S.lDay.sideJobHandled='refused';
if(!S.flags?.demo)save(S,storage);
toast('🙅 Đã từ chối làm thêm chui',`${r.lesson} · 🧠 +1`,5);
if(!$('dayhud').hidden)$('stats').innerHTML=statsHtml();
renderPhone();
});
$('sj-take')?.addEventListener('click',()=>{
takeSideJob(S);
S.lDay=S.lDay||{};
S.lDay.sideJobHandled='taken';
if(S.lDay.min)S.lDay.min+=240;
if(!S.flags?.demo)save(S,storage);
toast('⚠️ Đã đi làm thêm chui ngày nghỉ',`Nhận +${yen(HOLI.SIDE_JOB_PAY)} tiền mặt · ❤️ −10 · Nơm nớp lo bị phát hiện trong 10 ngày tới!`,5);
if(!$('dayhud').hidden)$('stats').innerHTML=statsHtml();
renderPhone();
});
for(const b of document.querySelectorAll('#lime-list button[data-uid]')){
b.addEventListener('click',()=>{
const uid=b.dataset.uid,act=b.dataset.act;
const msg=h.inbox.find((x)=>x.uid===uid);
if(!msg||msg.replied)return;
if(act==='legal'||act==='cheap'){
const r=sendMoney(S,msg.ask,act);
if(!r.ok){
toast('💴 Chưa đủ tiền gửi',`Cần ${yen(msg.ask + r.fee)} (gồm phí ${yen(r.fee)})`);
return;
}
msg.replied=true;
if(r.lost){
msg.replyNote=`Bị lừa mất ${yen(msg.ask + r.fee)} khi chuyển chui!`;
toast('😱 Bị lừa chuyển tiền chui!',`Kẻ trung gian chặn LIME! Mất trắng ${yen(msg.ask + r.fee)} · 🧠 −10`,5);
}else{
msg.replyNote=`Đã gửi ${yen(msg.ask)} (${act === 'legal' ? 'chính thức' : 'nhờ người quen'})`;
toast(`💸 Đã gửi ${yen(msg.ask)} cho ${msg.from}`,`Phí ${yen(r.fee)} · Gia đình mừng rỡ cảm ơn!`,4.5);
}
}else if(act==='later'){
msg.replied=true;
msg.replyNote='Đã hẹn tháng sau gửi';
h.homesick=Math.min(100,(h.homesick||0)+3);
toast(`💬 Đã nhắn lại cho ${msg.from}`,'Hẹn tháng sau lĩnh lương con gửi về nhé');
}else if(act==='reply'){
msg.replied=true;
msg.replyNote='Đã nhắn hỏi thăm';
applyFx(S,msg.fx||{mental:2});
h.homesick=Math.max(0,(h.homesick||0)-4);
toast(`💬 Đã nhắn cho ${msg.from}`,'Cả nhà yên tâm hơn · 🧠 +2');
}
if(!S.flags?.demo)save(S,storage);
if(!$('dayhud').hidden)$('stats').innerHTML=statsHtml();
renderHomeChips(S,cal);
renderPhone();
});
}
};
renderPhone();
}
function careerScreen(){
const S=load(storage);if(!S)return;
hideAll();
const back={label:'← Quay lại',cls:'ghost',on:titleScreen};
if(S.career&&S.career.target){
const J=JOBS[S.career.target];
return card(`<h2>📚 Đang học chuyển ngành</h2><p>Ngành mới: ${J.icon} <b>${esc(J.name)}</b>.</p><p>Đã học ${S.career.lessons}/${CAREER.LESSONS} buổi tối. Học ở phòng ký túc xá buổi tối (nút 📚). Học đủ thì thi 5 câu, đúng từ 4 câu là đỗ.</p>`,[
back,{label:'Bỏ học (mất lệ phí)',cls:'ghost',on:()=>{quitStudy(S);save(S,storage);titleScreen();}},
]);
}
card(`<h2>🔄 Đổi nghề?</h2>
    <p class="lesson">Ở Nhật, thực tập sinh <b>không được tự ý đổi sang ngành khác</b>. Muốn chuyển ngành phải <b>học và thi đỗ chứng chỉ kỹ năng của ngành mới</b> (<span class="jp">特定技能 技能試験</span>) và có tiếng Nhật <b>N4</b> trở lên.</p>
    <p>Lệ phí thi ${yen(CAREER.FEE)} · học ${CAREER.LESSONS} buổi tối ở ký túc xá (mỗi buổi 🧠 ${CAREER.LESSON_MENTAL}) · thi 5 câu từ chuyên ngành. Đỗ thì làm nghề mới từ bậc 1.</p>
    <h2 style="font-size:18px">Bạn có muốn học chuyển ngành không?</h2>`,[
{label:'📚 Có, học chuyển ngành',on:()=>careerPick(S)},
{label:'Không, ở lại nghề cũ',cls:'ghost',on:titleScreen},
]);
}
function careerPick(S){
const why=cannotStudy(S);
if(why==='jp')return card(`<h2>🗣️ Chưa đủ tiếng Nhật</h2><p>Cần N4 trở lên (hiện tại ${jpLevel(S.jp)}). Học tiếng Nhật buổi tối và nói chuyện nhiều hơn ở chỗ làm rồi quay lại nhé.</p>`,[{label:'← Quay lại',on:titleScreen}]);
if(why==='money')return card(`<h2>💴 Chưa đủ tiền</h2><p>Lệ phí thi ${yen(CAREER.FEE)}, bạn đang có ${yen(S.money)}.</p>`,[{label:'← Quay lại',on:titleScreen}]);
card('<h2>Chọn ngành muốn chuyển sang</h2>',[
...targets(S).map((j)=>({label:`${JOBS[j].icon} ${JOBS[j].name} · ${JOBS[j].area}`,on:()=>{
startStudy(S,j);save(S,storage);
card(`<h2>📚 Bắt đầu học!</h2><p>Đã đóng lệ phí ${yen(CAREER.FEE)}. Mỗi tối về phòng ký túc xá bấm <b>📚 Học chứng chỉ</b>. Học đủ ${CAREER.LESSONS} buổi thì nút đổi thành <b>📝 Thi</b>.</p><p>Trong lúc học bạn vẫn đi làm nghề cũ.</p>`,[{label:'Tiếp tục chơi →',on:()=>{G.S=S;setPlayer().then(runStep);}}]);
}})),
{label:'← Quay lại',cls:'ghost',on:titleScreen},
]);
}
function swatchRow(slot){
const box=$('sw-'+slot);box.textContent='';
for(const hex of SWATCH[slot]){
const b=document.createElement('button');b.type='button';
if(hex===null){b.style.background=refHex(G.draft.outfit,slot);b.classList.add('orig');b.setAttribute('aria-label','Màu gốc');}
else{b.style.background=hex;b.setAttribute('aria-label',hex);}
b.setAttribute('aria-pressed',String(G.draft.colors[slot]===hex));
b.addEventListener('click',()=>{G.draft.colors[slot]=hex;G.player.look(G.draft.colors);swatchRow(slot);});
box.appendChild(b);
}
}
function outfitList(){
const box=$('outfits');box.textContent='';
for(const[id,o]of Object.entries(OUTFITS)){
if(o.g!==G.draft.gender||o.uniform||o.npc)continue;
const b=document.createElement('button');b.type='button';b.className='outfit';b.dataset.o=id;
b.innerHTML=`<b>${esc(o.name)}</b><span>${esc(o.desc)}</span>`;
b.setAttribute('aria-pressed',String(id===G.draft.outfit));
b.addEventListener('click',()=>pickOutfit(id));
box.appendChild(b);
}
}
async function pickOutfit(id){
G.draft.outfit=id;G.draft.colors.top=null;G.draft.colors.bottom=null;
for(const b of document.querySelectorAll('.outfit')){b.setAttribute('aria-pressed',String(b.dataset.o===id));if(b.dataset.o===id)b.setAttribute('aria-busy','true');}
$('lbl-bottom').textContent=OUTFITS[id].bottomLabel;
await setPlayer();
for(const b of document.querySelectorAll('.outfit'))b.removeAttribute('aria-busy');
['top','bottom','hair','skin'].forEach(swatchRow);
}
function creatorScreen(){
hideAll();setStage('town');G.stages.town.setTime('day');swapPlayer(G.own);
if(G.own){if(G.own.helmet)G.own.helmet.visible=false;if(G.own.cap)G.own.cap.visible=false;if(G.own.waders)G.own.waders.setVisible(false);G.own.look(G.draft.colors);}
G.mode='creator';G.spin=0.5;
outfitList();['top','bottom','hair','skin'].forEach(swatchRow);
$('lbl-bottom').textContent=OUTFITS[G.draft.outfit].bottomLabel;
show('creator');
}
function jobScreen(){
G.draft.name=$('name').value.trim();
hideAll();G.mode='creator';
const box=$('joblist');box.textContent='';
for(const[id,j]of Object.entries(JOBS)){
const b=document.createElement('button');b.type='button';b.className='job';b.disabled=!j.ready;
b.innerHTML=`<span class="ic">${j.icon}</span><b>${esc(j.sector)} — ${esc(j.name)}</b><span class="meta">📍 ${esc(j.place)} · ${esc(j.area)}</span><span class="d">${esc(j.desc)}${j.ready ? '' : ' <span class="soon">· Sắp mở</span>'}</span>`;
b.addEventListener('click',()=>startGame(id));
box.appendChild(b);
}
show('jobs');
}
function startGame(job){
const d=G.draft;
G.S=newState({name:d.name,job,look:{gender:d.gender,outfit:d.outfit,colors:{...d.colors}}});
track(`new-game-${job}`,`Bắt đầu mới · ${JOBS[job]?.place || job}`);
save(G.S,storage);
hideAll();
card(`<h2>${JOBS[job].icon} ${esc(JOBS[job].place)} · ${esc(JOBS[job].area)}</h2>
    <p><b>${esc(NPCS[INTRO.who].name)}</b> (${esc(NPCS[INTRO.who].role)}): ${esc(INTRO.text)}</p>
    <p class="lesson">💸 Bạn đang mang khoản nợ phí môi giới khoảng <b>${yen(G.S.debt)}</b>.</p>`,[
{label:'Đi làm thôi →',on:runStep},
]);
}
function statsHtml(){
const S=G.S,sk=skillInfo(S,jobOf());
const lvl=(v)=>(v<WELL.WARN?'bad':v<60?'mid':'ok');
const bar=(k,icon,name,v,cls,txt)=>`<button type="button" class="sbar ${cls}" data-k="${k}"><span class="sb-h">${icon} ${name}<b>${txt}</b></span><span class="sb-t"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span></button>`;
const st=(t)=>`<span class="stat">${t}</span>`;
return`<div class="sbars">${bar('health', '❤️', 'Thể lực', S.health, lvl(S.health), `${Math.round(S.health)}/100`)}${bar('mental', '🧠', 'Tinh thần', S.mental, lvl(S.mental), `${Math.round(S.mental)}/100`)}`
+`${bar('skill', '🛠️', 'Kỹ năng', sk.pct, sk.maxed ? 'max' : 'skill', sk.maxed ? 'MAX' : `Bậc ${sk.rank + 1}/10 · ${sk.xp}/${sk.need}`)}</div>`
+`<div class="schips">${st(`💴 ${yen(S.money)}`)}${st(`🗣️ ${jpLevel(S.jp)}`)}${st(`⭐ Lv ${S.lv}`)}</div>`;
}
const BAR_HELP={
health:()=>`<h2>❤️ Thể lực</h2><p>Sức khỏe của bạn. <b>Giảm</b> sau mỗi ca làm (ca chiều mệt hơn), khi bị thương, khi thức khuya. <b>Tăng</b> khi ngủ, tắm, tự nấu ăn, ngày nghỉ.</p>
    <p class="lesson">Dưới ${WELL.WARN}: thanh đỏ, sắp kiệt sức.<br>Tụt xuống ${WELL.COLLAPSE}: <b>phải nghỉ làm, đi viện</b>. Mất 1 ngày lương (${yen(WELL.DAY_PAY)}) + viện phí ${yen(WELL.HOSPITAL)}, bảo hiểm y tế 国民健康保険 trả 70 % nên bạn trả 30 % (${yen(WELL.HOSPITAL * WELL.COPAY)}).</p>`,
mental:()=>`<h2>🧠 Tinh thần</h2><p>Tâm trạng, độ vững vàng. <b>Giảm</b> khi làm sai, bị mắng, thua ca, học khuya. <b>Tăng</b> khi gọi về nhà, ngủ đủ, được khen, đi chơi ngày nghỉ.</p>
    <p class="lesson">Dưới ${WELL.WARN}: thanh đỏ.<br>Tụt xuống ${WELL.COLLAPSE}: <b>phải nghỉ làm ở nhà</b> và gọi tư vấn. Mất 1 ngày lương (${yen(WELL.DAY_PAY)}).</p>`,
skill:()=>{const sk=skillInfo(G.S,jobOf());return`<h2>🛠️ Kỹ năng nghề</h2><p>Tay nghề ở ${esc(JOBS[jobOf()].place.toLowerCase())}. Tăng sau mỗi ca (ca chiều thắng được nhiều hơn).</p>
    <p class="lesson">Đầy thanh: <b>lên bậc, lên chức, tăng lương</b> (+${yen(4000)}/tháng mỗi bậc).<br>Hiện tại: Bậc ${sk.rank + 1}/10 · ${esc(sk.title)} · phụ cấp ${yen(sk.pay)}/tháng.${sk.maxed ? '<br>🏆 Đã MAX: bạn là trụ cột của tổ!' : ''}</p>`;},
};
function onStatsTap(e){
const b=e.target.closest('.sbar');if(!b||!G.S)return;
const back=G.mode;const html=BAR_HELP[b.dataset.k]();card(html,[{label:'Đã hiểu',on:()=>{G.mode=back;}}]);
}
function dayHud(label){
const S=G.S;
const cal=ensureCal(S);
$('day-label').textContent=hudCalText(S,label);
$('day-label').parentElement?.classList.toggle('red-day',isRedPill(cal));
$('stats').innerHTML=statsHtml();
show('dayhud');
const wk=curDayKey(S);
if(lowBars(S).length&&S.flags.warnDay!==wk&&!S.flags.demo){
S.flags.warnDay=wk;
setTimeout(()=>toast('⚠️ Sắp kiệt sức!','Ngủ sớm, ăn uống đủ, đừng cố quá. Tụt xuống 15 là phải nghỉ làm.',5),600);
}
}
async function runStep(){
const S=G.S;hideAll();
ensureCal(S);
if(!S.life){
if(S.story>=DAYS)return S.flags.dayOff?.done?weekEnd():dayOffStep();
const out=S.sStep<5?checkCollapse(S):null;
if(out)return sickDay(out);
const st=daySteps(S.story,jobOf())[S.sStep];
if(S.sStep===0&&S.flags.morningDay!==curDayKey(S))return morningStep(st);
if(S.sStep===4)return S.flags.eveningDay===curDayKey(S)?talkStep(st,eveningPlace(st)):eveningStep(st);
if(st.t==='talk')return talkStep(st);
if(st.t==='shift')return shiftStep(st);
return sleepStep(st);
}
S.lDay=S.lDay||{};
ensurePapers(S);
ensurePrep(S);
if(S.lDay.caughtReport)return caughtSideJobCard();
if(S.lDay.stolenBikeReport)return stolenBikeCard();
if(S.sStep===0&&!S.lDay.overdueChecked){
S.lDay.overdueChecked=true;
const oRes=checkPaperOverdue(S,S.cal);
if(oRes.items.length){
S.lDay.hankyuAsked=true;
save(S,storage);
return overdueAlertCard(oRes);
}
}
if(S.sStep===0&&paydayOn(S.cal)&&!S.lDay.paid)return paydayCard();
const out=S.sStep<5?checkCollapse(S):null;
if(out)return sickDay(out);
if(!S.lDay.kind){
const fx=curWeatherFx(S);
if(fx.dayOff)return typhoonCard();
if(isMandatoryOff(S.cal)){
S.lDay.kind='dayoff';
S.lDay.min=9*60;
save(S,storage);
}else if(isSaturdayWorkable(S.cal)){
return saturdayPrompt();
}else{
S.lDay.kind='work';
save(S,storage);
}
}
if(S.sStep===0&&S.ill&&!S.lDay.illPrompted)return morningIllCard();
if(S.lDay.kind==='work'&&S.sStep===0&&!S.lDay.hankyuAsked){
const urgentDocs=paperTodo(S,S.cal).filter((d)=>d.daysLeft>=0&&d.daysLeft<=5&&isPaperOpen(d.place,S.cal,600));
if(urgentDocs.length){
S.lDay.hankyuAsked=true;
save(S,storage);
return morningHankyuCard(urgentDocs);
}
}
if(S.lDay.kind==='dayoff'||S.lDay.kind==='typhoonOff'){
if(S.sStep>=5||(S.lDay.min||540)>=21*60){
S.sStep=5;
return sleepStep({label:'Đêm · Ký túc xá',xp:5,data:{}});
}
return lifeDayOffHub();
}
const evs=eventsOn(S.cal).filter((e)=>e.kind==='event');
if(S.sStep===4&&evs.length&&!S.lDay.eventDone)return seasonalWorkEventCard(evs[0]);
const st=lifeDaySteps(S,jobOf())[S.sStep];
if(S.sStep===0&&S.flags.morningDay!==curDayKey(S))return morningStep(st);
if(S.sStep===4)return S.flags.eveningDay===curDayKey(S)?talkStep(st,eveningPlace(st)):eveningStep(st);
if(st.t==='talk')return talkStep(st);
if(st.t==='shift')return shiftStep(st);
return sleepStep(st);
}
function paydayCard(){
const S=G.S,p=payslip(S);
if(!S.flags.gcPay){S.flags.gcPay=true;track('first-payday','Nhận lương lần đầu');}
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('💴 Ngày lương · 給与明細');
const P=G.player;P.holder.rotation.x=0;P.holder.position.set(0.2,0,0.8);P.yaw=0;P.play('idle');
const remDebt=Math.max(0,(S.debt||0)-p.debt);
const avail=(S.money||0)+p.net;
const noYucho=!!(S.papers&&!S.papers.yucho);
const finishNoRemit=()=>{
applyPay(S,0);
if(noYucho)applyFx(S,{mental:-2});
S.lDay.paid=true;
save(S,storage);
notifyAchievements(S);
toast(`💴 Nhận lương thực lĩnh +${yen(p.net)}`,noYucho?'Lương tiền mặt, phải tự đi nhận (🧠 −2)':remDebt>0?`Còn nợ ${yen(remDebt)}`:'🎉 Đã trả hết nợ môi giới!',4);
runStep();
};
const chooseExtraDebt=()=>{
const doExtra=(amt)=>{
applyPay(S,0);
if(noYucho)applyFx(S,{mental:-2});
const r=repayDebt(S,amt);
S.lDay.paid=true;
save(S,storage);
notifyAchievements(S);
toast(
r.cleared?'🎉 Đã trả hết toàn bộ nợ môi giới!':`💳 Đã trả thêm nợ ${yen(r.paid)}`,
r.cleared?'Thành tựu: 🆓 Trả hết nợ môi giới!':`Còn nợ ${yen(r.remaining)} · 🧠 Tinh thần nhẹ nhõm hơn`,
4.5,
);
runStep();
};
const dBtns=[];
if(avail>=Math.min(100000,remDebt)&&remDebt>50000){
dBtns.push({label:`💳 Trả thêm ${yen(Math.min(100000, remDebt))} (🧠 +8)`,on:()=>doExtra(100000)});
}
dBtns.push({
label:`💳 Trả thêm ${yen(Math.min(50000, remDebt))} (🧠 +4)`,
cls:dBtns.length>0?'ghost':'',
on:()=>doExtra(50000),
});
dBtns.push({label:'← Quay lại phiếu lương',cls:'ghost',on:paydayCard});
card(`<h2>💳 Trả nợ trước hạn · 繰上返済</h2>
      <p>Sau khi trừ kỳ lương này, dư nợ còn <b>${yen(remDebt)}</b> và bạn có <b>${yen(avail)}</b> tiền mặt.</p>
      <p class="lesson">💡 Trả nợ trước hạn giúp giảm nhanh áp lực tài chính và mở khóa thành tựu <b>🆓 Trả hết nợ môi giới</b> ngay khi dư nợ về 0 ¥.</p>`,dBtns);
};
const chooseRouteFor=(amount)=>{
const doSend=(route)=>{
applyPay(S,0);
if(noYucho)applyFx(S,{mental:-2});
const r=sendMoney(S,amount,route);
S.lDay.paid=true;
save(S,storage);
notifyAchievements(S);
if(r.lost){
card(`<div class="big">😱</div><h2>Bị lừa mất tiền chuyển chui!</h2>
          <p>Người nhận chuyển tiền tay ba đột nhiên khóa tài khoản LIME và biến mất. Bạn mất trắng <b>${yen(amount + r.fee)}</b>!</p>
          <p class="lesson">⚠️ Chuyển tiền chui (<span class="jp">地下銀行</span>) tuy phí rẻ và tỉ giá cao hơn chút nhưng vừa phạm luật vừa có nguy cơ mất trắng toàn bộ tiền mồ hôi nước mắt.</p>`,[
{label:'Đau xót tiếp tục →',on:runStep},
]);
return;
}
toast(`💸 Đã gửi ${yen(amount)} về nhà`,`Phí ${yen(r.fee)} · Gia đình nhắn cảm ơn!`,4.5);
runStep();
};
card(`<h2>💸 Chọn cách gửi ${yen(amount)} về quê · 海外送金</h2>
      <p>Chọn dịch vụ chuyển tiền cho gia đình:</p>
      <ul>
        <li>🏦 <b>${esc(REMIT_ROUTES.legal.vi)}:</b> phí <b>${yen(REMIT_ROUTES.legal.fee)}</b>, tỉ giá chuẩn 100%, an toàn tuyệt đối.</li>
        <li>🤝 <b>${esc(REMIT_ROUTES.cheap.vi)}:</b> phí <b>${yen(REMIT_ROUTES.cheap.fee)}</b>, tỉ giá +3%, nhưng có rủi ro 15% bị bùng mất trắng!</li>
      </ul>`,[
{label:`🏦 Dịch vụ chính thức / 郵便局の口座 (phí ${yen(REMIT_ROUTES.legal.fee)})`,on:()=>doSend('legal')},
{label:`🤝 Nhờ người quen chuyển chui (phí ${yen(REMIT_ROUTES.cheap.fee)}, tỉ giá tốt)`,on:()=>doSend('cheap')},
{label:'← Chọn lại mức tiền',cls:'ghost',on:paydayCard},
]);
};
const canExtraDebt=remDebt>0&&avail>=Math.min(50000,remDebt);
const remitOpts=[];
if(avail>=50000+REMIT_ROUTES.legal.fee)remitOpts.push({amt:50000,label:'💸 Gửi 50.000 ¥ về nhà (🧠 +9)'});
if(avail>=30000+REMIT_ROUTES.legal.fee)remitOpts.push({amt:30000,label:'💸 Gửi 30.000 ¥ về nhà (🧠 +6)'});
if(avail>=10000+REMIT_ROUTES.legal.fee)remitOpts.push({amt:10000,label:'💸 Gửi 10.000 ¥ về nhà (🧠 +3)'});
const visibleRemit=remitOpts.slice(0,canExtraDebt?2:3);
const btns=visibleRemit.map((opt,idx)=>({
label:opt.label,
cls:idx===0?'':'ghost',
on:()=>chooseRouteFor(opt.amt),
}));
if(canExtraDebt){
btns.push({
label:'💳 Trả thêm nợ 50.000 ¥ / 100.000 ¥',
cls:'ghost',
on:chooseExtraDebt,
});
}
btns.push({label:'Không gửi (giữ lại tiêu dùng)',cls:'ghost',on:finishNoRemit});
card(`<h2>💴 Phiếu lương · 給与明細</h2>
    <div class="payslip">
      <div class="prow"><span>Lương cơ bản kỳ (基本給)</span><b class="pos">+${yen(p.base)}</b></div>
      <div class="prow"><span>Phụ cấp bậc nghề (Bậc ${p.rank}/10)</span><b class="pos">+${yen(p.skill)}</b></div>
      <div class="prow"><span>Tăng ca thứ Bảy (${S.overtime || 0} ca × ${yen(PAY.OVERTIME)})</span><b class="pos">+${yen(p.overtime)}</b></div>
      <div class="prow sub"><span>Tổng thu nhập (総支給額)</span><b>${yen(p.gross)}</b></div>
      <div class="prow"><span>Tiền nhà ký túc xá (寮費)</span><span class="neg">−${yen(p.dorm ?? p.rent ?? 0)}</span></div>
      <div class="prow"><span>Thuế & bảo hiểm (12%)</span><span class="neg">−${yen(p.tax)}</span></div>
      <div class="prow"><span>Trả nợ môi giới (返済)</span><span class="neg">−${yen(p.debt)}</span></div>
      ${noYucho ? '<div class="prow"><span class="neg">⚠️ Chưa mở tài khoản 郵便局の口座: lương tiền mặt, phải tự đi nhận</span><span class="neg">🧠 −2</span></div>' : ''}
      <div class="prow net"><span>Thực lĩnh (手取り)</span><span>+${yen(p.net)}</span></div>
    </div>
    <p class="lesson">💳 Dư nợ còn lại: <b>${yen(remDebt)}</b> · Tiền mặt sau lương: <b>${yen(avail)}</b>.<br>Bạn có muốn gửi tiền về cho gia đình (海外送金) kỳ này không?</p>`,btns);
}
function typhoonCard(){
const S=G.S;
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('🌀 Nghỉ bão');
const P=G.player;P.holder.rotation.x=0;P.holder.position.set(0.2,0,0.8);P.yaw=0;P.play('idle');
if(!S.lDay.stormChecked){
S.lDay.stormChecked=stormPrep(S);
save(S,storage);
}
const sRes=S.lDay.stormChecked;
const prepNote=sRes.prepared
?'✅ Tối qua bạn đã mua nước, dán băng keo cửa kính và sạc đầy pin nên ở trong phòng rất yên tâm (🧠 không giảm).'
:`⚠️ Bạn chưa kịp chuẩn bị nước và sạc pin trước bão nên khá lo lắng khi gió rít ngoài cửa sổ (🧠 ${sRes.mentalDelta}).`;
card(`<div class="big">🌀</div><h2>台風で会社は休みです — Bão, công ty cho nghỉ</h2>
    <p>Ngoài trời mưa to gió giật mạnh. Quản lý nhắn tin cho cả tổ ở yên trong ký túc xá, hôm nay được nghỉ ở nhà.</p>
    <p class="lesson">${esc(prepNote)}</p>
    ${sRes.deltas?.length ? `<div class="deltas">${deltaChips(sRes.deltas)}</div>` : ''}`,[
{label:'Ở trong phòng nghỉ ngơi →',on:()=>{
S.lDay.kind='typhoonOff';
S.lDay.min=9*60;
save(S,storage);
runStep();
}},
]);
}
function saturdayPrompt(){
const S=G.S;
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('👷 Thứ Bảy · 土曜日');
const P=G.player;P.holder.rotation.x=0;P.holder.position.set(0.2,0,0.8);P.yaw=0;P.play('idle');
card(`<div class="big">👷</div><h2>休日出勤 — Tăng ca thứ Bảy?</h2>
    <p>Hôm nay là thứ Bảy. Quản lý hỏi bạn có muốn đăng ký làm 1 ca tăng ca cuối tuần không:</p>
    <ul>
      <li>💰 Phụ cấp tăng ca: <b>+${yen(PAY.OVERTIME)}</b> (cộng vào phiếu lương kỳ tới)</li>
      <li>❤️ Thể lực <b>−8</b> · 🧠 Tinh thần <b>−4</b></li>
    </ul>`,[
{label:`💪 Đi tăng ca (+${yen(PAY.OVERTIME)}, ❤️ −8, 🧠 −4)`,on:()=>{
applyFx(S,{health:-8,mental:-4});
S.overtime=(S.overtime||0)+1;
S.lDay.kind='overtime';
save(S,storage);
toast('💪 Đăng ký tăng ca thứ Bảy',`+${yen(PAY.OVERTIME)} vào kỳ lương tới · ❤️ −8, 🧠 −4`);
runStep();
}},
{label:'🎌 Nghỉ thứ Bảy',cls:'ghost',on:()=>{
S.lDay.kind='dayoff';
S.lDay.min=9*60;
save(S,storage);
runStep();
}},
]);
}
function seasonalWorkEventCard(ev){
const S=G.S;
if(ev.id==='tet_vn'){
return tetVnEveningCard(ev,()=>{
S.lDay.eventDone=true;
S.flags.eveningDay=curDayKey(S);
save(S,storage);
notifyAchievements(S);
finishStep('🧧 Đêm Giao thừa Tết Việt');
});
}
if(ev.id==='bounenkai'){
return bounenkaiEveningCard(ev,()=>{
S.lDay.eventDone=true;
S.flags.eveningDay=curDayKey(S);
save(S,storage);
notifyAchievements(S);
finishStep('🍻 Tiệc 忘年会 cuối năm');
});
}
if(ev.id==='valentine'){
return valentineCard(ev,()=>{
S.lDay.eventDone=true;
save(S,storage);
notifyAchievements(S);
runStep();
});
}
if(FESTIVALS[ev.id]?.where==='shrine'){
return lifeFestivalShrineVisit(ev.id,()=>{
S.lDay.eventDone=true;
if(ev.time==='evening'){
S.flags.eveningDay=curDayKey(S);
save(S,storage);
notifyAchievements(S);
finishStep(`${ev.icon} ${ev.vi}`);
}else{
save(S,storage);
notifyAchievements(S);
runStep();
}
});
}
setStage('town');G.stages.town.setTime(ev.time==='evening'?'night':'day');hideNpcs();
G.mode='talk';
dayHud(`${ev.icon} ${ev.vi}`);
const deltas=applyFx(S,ev.fx||{mental:5,culture:3});
S.lDay.eventDone=true;
save(S,storage);
notifyAchievements(S);
card(`<div class="big">${ev.icon}</div><h2>🎉 ${esc(ev.jp)} — ${esc(ev.vi)}</h2>
    <p>${esc(ev.desc)}</p>
    <div class="deltas">${deltaChips(deltas)}</div>`,[
{label:'Tiếp tục →',on:()=>runStep()},
]);
}
function bounenkaiEveningCard(ev,onDone=()=>runStep()){
const S=G.S;
setStage('dorm');G.stages.dorm.setTime('night');hideNpcs();
G.mode='talk';
dayHud('🍻 Tiệc tất niên · 忘年会');
const startQuiz=(drink)=>{
const answers=[];
const askQ=(idx)=>{
if(idx>=BOUNENKAI_QUESTIONS.length){
const r=doBounenkai(S,answers,drink);
save(S,storage);
notifyAchievements(S);
const deltas=Array.isArray(r.deltas)?r.deltas:Object.entries(r.fx||{}).filter(([,v])=>v);
card(`<div class="big">🍻</div><h2>お開き — Tan tiệc 忘年会 vui vẻ!</h2>
          <p>Bạn đã trả lời đúng <b>${r.correct}/${r.total}</b> phép ứng xử bàn tiệc Nhật Bản và chọn <b>${drink === 'oolong' ? '🍵 Trà Ô long (ウーロン茶)' : '🍺 Bia tươi (生ビール)'}</b> khi cụng ly 乾杯.</p>
          <div class="deltas">${deltaChips(deltas)}</div>
          <p class="lesson">🍻 ${esc(r.lesson || r.note || '')}</p>`,[
{label:'Về ký túc xá nghỉ ngơi →',on:onDone},
]);
return;
}
const q=BOUNENKAI_QUESTIONS[idx];
const btns=q.choices.map((ch,cIdx)=>({
label:ch,
on:()=>{
answers[idx]=cIdx;
askQ(idx+1);
},
}));
card(`<h2>🍻 Tiệc tất niên 忘年会 · Ứng xử (${idx + 1}/${BOUNENKAI_QUESTIONS.length})</h2>
        <p class="jpline">「お疲れ様でした！乾杯！」</p>
        <p>${esc(q.q)}</p>`,btns);
};
askQ(0);
};
card(`<div class="big">🍻</div><h2>忘年会 — Tiệc tổng kết cuối năm cùng công ty</h2>
    <p>Tối nay cả tổ tập trung ở quán ăn dự tiệc <b>忘年会 (Bounenkai)</b> để nhìn lại một năm làm việc vất vả (phí tham dự: <b>4.000 ¥</b>).</p>
    <p class="lesson">💡 Khi hô <b>乾杯 (Kanpai)</b>, nếu bạn không uống được rượu bia thì hoàn toàn có thể gọi <b>🍵 Trà Ô long (ウーロン茶)</b> để cụng ly — rất lịch sự và không bị trừ bất kỳ điểm quan hệ nào!</p>`,[
{
label:'🍺 Tham dự & chọn Bia cụng ly (4.000 ¥)',
on:()=>{
if((S.money||0)<4000){toast('💴 Chưa đủ 4.000 ¥','Phí dự tiệc 忘年会 là 4.000 ¥');return;}
startQuiz('beer');
},
},
{
label:'🍵 Tham dự & chọn Trà Ô long ウーロン茶 (4.000 ¥ · không trừ điểm)',
on:()=>{
if((S.money||0)<4000){toast('💴 Chưa đủ 4.000 ¥','Phí dự tiệc 忘年会 là 4.000 ¥');return;}
startQuiz('oolong');
},
},
{
label:'🏠 Xin phép cáo từ về nghỉ sớm (0 ¥)',
cls:'ghost',
on:onDone,
},
]);
}
function valentineCard(ev,onDone=()=>runStep()){
const S=G.S;
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('🍫 Ngày Valentine · バレンタイン');
const pick=(buyGiri,count)=>{
const r=doValentine(S,buyGiri,count);
if(!r.ok){
toast('💴 Chưa đủ tiền',`Cần ${yen(500 * count)} để mua 義理チョコ`);
return;
}
save(S,storage);
notifyAchievements(S);
const deltas=Array.isArray(r.deltas)
?r.deltas
:[
...(r.cost?[['money',-r.cost]]:[]),
...Object.entries(r.fx||{}).filter(([,v])=>v),
];
card(`<div class="big">🍫</div><h2>バレンタインデー — Ngày Valentine ở Nhật</h2>
      <p>${buyGiri
        ? `Bạn đã tặng <b>${count} hộp 義理チョコ</b> cảm ơn các đồng nghiệp trong tổ. Ai cũng mỉm cười cảm ơn 「ありがとう！」.`
        : 'Bạn mỉm cười chúc mọi người trong tổ một ngày làm việc vui vẻ.'}</p>
      <div class="deltas">${deltaChips(deltas)}</div>
      <p class="lesson">🍫 ${esc(r.lesson || r.note || '')}</p>`,[
{label:'Tiếp tục →',on:onDone},
]);
};
card(`<div class="big">🍫</div><h2>バレンタイン — Phong tục Valentine tại Nhật</h2>
    <p>Ở chỗ làm, mọi người trao nhau những hộp sô-cô-la nhỏ <b>義理チョコ (Giri-choco — sô-cô-la lịch sự cảm ơn đồng nghiệp)</b> giá 500 ¥/phần.</p>
    <p class="lesson">💡 Văn hóa Nhật Bản phân biệt <b>14/2 バレンタイン</b> và <b>14/3 ホワイトデー (White Day — ngày đáp lễ)</b>. Bạn có thể mua 義理チョコ tặng đồng nghiệp hoặc bỏ qua đều được.</p>`,[
{label:'🍫 Mua 3 phần 義理チョコ tặng đồng nghiệp (1,500 ¥ · 🤝 +6, 👷 +3, 🧠 +3, 🎌 +2)',on:()=>pick(true,3)},
{label:'🍫 Mua 1 phần 義理チョコ (500 ¥ · 🤝 +2, 👷 +1, 🧠 +3, 🎌 +2)',cls:'ghost',on:()=>pick(true,1)},
{label:'😊 Không mua, chỉ chúc mọi người vui vẻ (0 ¥ · 🧠 +1, 🎌 +1)',cls:'ghost',on:()=>pick(false,0)},
]);
}
function tetVnEveningCard(ev,onDone=null){
const S=G.S;
setStage('dorm');G.stages.dorm.setTime('night');hideNpcs();
G.mode='talk';
dayHud(`🧧 ${ev.vi}`);
visitFestival(S,'tet_vn');
if(!S.lDay.tetBaseFx){
applyFx(S,ev.fx||{mental:6,culture:3});
S.lDay.tetBaseFx=true;
save(S,storage);
notifyAchievements(S);
}
const sendTetLixi=(amount)=>{
card(`<h2>🧧 Gửi lì xì Tết ${yen(amount)} về quê</h2>
      <p>Chọn cách gửi tiền lì xì năm mới cho gia đình:</p>`,[
{label:`🏦 Dịch vụ chính thức / 郵便局の口座 (phí ${yen(REMIT_ROUTES.legal.fee)})`,on:()=>{
const r=sendMoney(S,amount,'legal');
if(!r.ok){toast('💴 Không đủ tiền',`Cần ${yen(amount + r.fee)}`);tetVnEveningCard(ev,onDone);return;}
S.lDay.tetLixi=true;save(S,storage);notifyAchievements(S);
toast(`🧧 Đã gửi lì xì ${yen(amount)} về nhà!`,'Cả nhà chúc Tết rộn ràng qua LIME!');
tetVnEveningCard(ev,onDone);
}},
{label:`🤝 Nhờ người quen chuyển chui (phí ${yen(REMIT_ROUTES.cheap.fee)}, tỉ giá tốt)`,on:()=>{
const r=sendMoney(S,amount,'cheap');
if(!r.ok){toast('💴 Không đủ tiền',`Cần ${yen(amount + r.fee)}`);tetVnEveningCard(ev,onDone);return;}
S.lDay.tetLixi=true;save(S,storage);notifyAchievements(S);
if(r.lost)toast('😱 Bị lừa mất tiền lì xì!',`Mất trắng ${yen(amount + r.fee)} · 🧠 −10`,5);
else toast(`🧧 Đã gửi lì xì ${yen(amount)} về nhà!`,'Cả nhà mừng tuổi đầu xuân!');
tetVnEveningCard(ev,onDone);
}},
{label:'← Quay lại đêm Tết',cls:'ghost',on:()=>tetVnEveningCard(ev,onDone)},
]);
};
const btns=[];
if(!S.lDay.tetCalled){
btns.push({
label:'📹 Gọi video đón giao thừa cùng cả nhà (🧠 +6, nhớ nhà −30)',
on:()=>{
const r=callHome(S,'video');
S.lDay.tetCalled=true;
save(S,storage);
toast('📹 Đón giao thừa qua màn hình điện thoại',`Chúc mừng năm mới cả nhà! · Nhớ nhà còn ${r.homesick}/100`);
tetVnEveningCard(ev,onDone);
},
});
}
if(!S.lDay.tetLixi){
btns.push({
label:'🧧 Gửi lì xì 5.000 ¥ về nhà',
cls:btns.length>0?'ghost':'',
on:()=>sendTetLixi(5000),
});
}
if(!S.lDay.tetCooked){
btns.push({
label:'🟩 Nấu bánh chưng với bạn phòng (góp 1.500 ¥ · 🧠 +12, ❤️ +3, 🤝 +3)',
cls:btns.length>0?'ghost':'',
on:()=>{
const r=cookVietnamese(S,'banh_chung');
if(!r.ok){toast('💴 Chưa đủ tiền góp','Cần 1.500 ¥');return;}
S.lDay.tetCooked=true;
save(S,storage);
notifyAchievements(S);
toast('🟩 Cắt bánh chưng đêm Tết nơi đất khách','Ấm lòng hương vị quê nhà · 🧠 +12, ❤️ +3, 🤝 +3');
tetVnEveningCard(ev,onDone);
},
});
}
btns.push({
label:'Tiếp tục buổi tối →',
cls:btns.length>0?'ghost':'',
on:()=>{
S.lDay.eventDone=true;
save(S,storage);
notifyAchievements(S);
if(onDone)onDone();
else runStep();
},
});
card(`<div class="big">🧧</div><h2>🎉 ${esc(ev.jp)} — ${esc(ev.vi)}</h2>
    <p>${esc(ev.desc)}</p>
    <p class="lesson">Ở Nhật ngày mùng 1 Tết âm lịch vẫn là ngày đi làm bình thường. Tối về ký túc xá, anh em thực tập sinh mới quây quần gọi về quê đón giao thừa và cắt bánh chưng.</p>`,btns);
}
function activeCalendarFestivalId(cal){
if(!cal)return null;
const ev=eventsOn(cal)[0];
if(ev&&FESTIVALS[ev.id])return ev.id;
if(cal.season===1&&cal.day>=13&&cal.day<=16)return'obon';
if(cal.season===3&&cal.day>=1&&cal.day<=3)return'shogatsu';
return null;
}
async function lifeDayOffHub(group=null){
const S=G.S,d=S.lDay,isTyphoon=d.kind==='typhoonOff';
d.min=d.min||9*60;
await dress(false);
setStage('dorm');G.stages.dorm.setTime(d.min>=18*60?'night':'day');hideNpcs();
G.mode='talk';
const P=G.player;P.holder.rotation.x=0;P.holder.position.set(0.2,0,0.8);P.yaw=0;P.play('idle');
const evs=eventsOn(S.cal);
const ev=evs[0]||null;
const festId=!isTyphoon?activeCalendarFestivalId(S.cal):null;
dayHud(isTyphoon?'🌀 Nghỉ bão ở nhà':ev?`${ev.icon} ${ev.vi}`:'🎌 Ngày nghỉ');
const fx=curWeatherFx(S);
const hActs=!isTyphoon?holidayActs(S,S.cal).filter((a)=>!d['holi_'+a.id]||a.id==='cards'):[];
const hasHolidayGroup=!!(ev&&!d.eventDone)||Boolean(festId&&!d.eventDone)||hActs.length>0;
const openDocs=!isTyphoon
?paperTodo(S,S.cal).filter((doc)=>isPaperOpen(doc.place,S.cal,d.min)||doc.id==='juminzei')
:[];
if(group==='holiday'){
const btns=[];
if(festId&&FESTIVALS[festId]){
const fDef=FESTIVALS[festId];
if(fDef.where==='shrine'){
btns.push({
label:`⛩️ Vào lễ hội 3D đền さくら神社: ${fDef.icon} ${fDef.jp} — ${fDef.vi}`,
on:()=>lifeFestivalShrineVisit(festId,()=>{
d.eventDone=true;
save(S,storage);
notifyAchievements(S);
runStep();
}),
});
}else if(festId==='bounenkai'&&!d.eventDone){
btns.push({
label:`🍻 Dự tiệc tất niên 忘年会 cùng công ty (4.000 ¥ · +2h)`,
on:()=>bounenkaiEveningCard(ev||fDef,()=>{
d.eventDone=true;
d.min+=120;
save(S,storage);
notifyAchievements(S);
runStep();
}),
});
}else if(festId==='tet_vn'&&!d.eventDone){
btns.push({
label:`🧧 Đón Tết Nguyên Đán tại ký túc xá (+2h)`,
on:()=>tetVnEveningCard(ev||fDef,()=>{
d.eventDone=true;
d.min+=120;
save(S,storage);
notifyAchievements(S);
runStep();
}),
});
}else if(festId==='valentine'&&!d.eventDone){
btns.push({
label:`🍫 Ngày Valentine バレンタイン (+1h)`,
on:()=>valentineCard(ev||fDef,()=>{
d.eventDone=true;
d.min+=60;
save(S,storage);
notifyAchievements(S);
runStep();
}),
});
}
}else if(ev&&!d.eventDone){
btns.push({
label:`🎉 ${ev.jp} — ${ev.vi} (+1h)`,
on:()=>{
const deltas=applyFx(S,ev.fx||{mental:5,culture:3});
d.eventDone=true;
d.min+=60;
save(S,storage);
notifyAchievements(S);
card(`<div class="big">${ev.icon}</div><h2>🎉 ${esc(ev.jp)} — ${esc(ev.vi)}</h2>
            <p>${esc(ev.desc)}</p>
            <div class="deltas">${deltaChips(deltas)}</div>`,[
{label:'Tiếp tục ngày nghỉ →',on:()=>runStep()},
]);
},
});
}
for(const hAct of hActs){
if(btns.length>=5)break;
const effCost=(hAct.id==='hanabi'&&S.bike?.owned)?0:(hAct.cost||0);
btns.push({
label:`${hAct.icon} ${hAct.vi} (${effCost ? yen(effCost) : (hAct.id === 'hanabi' && S.bike?.owned ? '🚲 Đạp xe miễn phí' : 'Miễn phí')} · +${Math.round(hAct.min / 60 * 10) / 10}h)`,
on:()=>runHolidayAct(hAct),
});
}
btns.push({label:'← Quay lại nhóm ngày nghỉ',cls:'ghost',on:()=>lifeDayOffHub(null)});
card(`<h2>🎉 Dịp lễ & Sự kiện mùa</h2>
      <p>⏰ Bây giờ là <b>${fmtClock(d.min)}</b> · Chọn hoạt động ngày lễ:</p>`,btns);
return;
}
if(group==='out'&&!isTyphoon){
const btns=[
{label:'⛩ Đền さくら神社 (dạo phố, đi lễ, rút quẻ)',on:()=>lifeShrineVisit()},
{label:'🛒 Siêu thị スーパー さくら (mua đồ ăn · túi khẩn cấp)',on:()=>{
card(`<h2>🛒 Siêu thị スーパー さくら & ホームセンター</h2><p>Chọn khu vực muốn mua sắm:</p>`,[
{label:'🥦 Vào quầy thực phẩm スーパー さくら (mua đồ nấu ăn)',on:()=>{
const mEv=createEvening('room');
mEv.min=Math.min(18*60,Math.max(15*60,d.min));
openMarket(mEv,()=>{
d.min=Math.max(d.min+90,mEv.min);
save(S,storage);
runStep();
});
}},
{label:`🎒 Mua túi khẩn cấp 非常持ち出し袋 (${prepScore(S)}/5 món)`,on:()=>emergencyBagModal(()=>lifeDayOffHub('out'))},
{label:'← Quay lại',cls:'ghost',on:()=>lifeDayOffHub('out')},
]);
}},
{label:S.bike?.owned?'🚲 Xe đạp & Luật giao thông (リサイクルショップ)':'🚲 Tiệm xe cũ リサイクルショップ (mua xe đạp)',on:()=>townBikeShopVisit(()=>lifeDayOffHub(null))},
{label:S.ill?`🏥 Đi khám クリニック / 💊 Mua thuốc (${S.ill.vi})`:'💊 Nhà thuốc ドラッグストア さくら & 🏥 Phòng khám',on:()=>townMedicalVisit(()=>lifeDayOffHub(null))},
];
if(!d.washed){
btns.push({
label:'🧺 Tiệm giặt コインランドリー (500 ¥ · +1h30 · sấy khô ngay)',
on:()=>{
const r=wash(S,'coin',curWeather(S));
if(!r.ok){toast('💴 Chưa đủ tiền','Cần 500 ¥ để giặt sấy tại コインランドリー');return;}
d.washed=true;
d.min+=r.min;
save(S,storage);
toast('🧺 Đã giặt sấy sạch thơm ở コインランドリー','−500 ¥ · Quần áo bẩn về 0/100 · ⏰ '+fmtClock(d.min));
runStep();
},
});
}
btns.push({label:'← Quay lại nhóm ngày nghỉ',cls:'ghost',on:()=>lifeDayOffHub(null)});
card(`<h2>🚶 Ra ngoài dạo phố</h2>
      <p>⏰ Bây giờ là <b>${fmtClock(d.min)}</b> · Chọn địa điểm trong khu phố:</p>`,btns);
return;
}
if(group==='home'){
const btns=[];
if(!d.cookedVn){
btns.push({
label:'🍜 Nấu món Việt với bạn phòng (+2h–3h · 🧠 +8..+12, ❤️ +3)',
on:()=>lifeVnCookPicker(),
});
}
btns.push({
label:'📚 Học tiếng Nhật ở nhà (+2h · 🗣️ +2, 🧠 −2)',
on:()=>{
applyFx(S,{jp:3,mental:-2});
d.min+=120;
save(S,storage);
toast('📚 Tự học tiếng Nhật ở nhà',`🗣️ +2 · 🧠 −2 · ⏰ ${fmtClock(d.min)}`);
runStep();
},
});
if(!d.napped){
btns.push({
label:'🛌 Ngủ bù (+3h · ❤️ +12, 🧠 +6)',
on:()=>{
applyFx(S,{health:12,mental:6});
d.napped=true;
d.min+=180;
save(S,storage);
toast('🛌 Ngủ bù khỏe người',`❤️ +12 · 🧠 +6 · ⏰ ${fmtClock(d.min)}`);
runStep();
},
});
}
if(!d.called){
btns.push({
label:'📱 Gọi về nhà (+30p–1h · giảm nhớ nhà)',
on:()=>{
card('<h2>📱 Gọi điện về nhà ngày nghỉ</h2><p>Chọn cách gọi cho gia đình:</p>',[
{label:'📞 Gọi thoại (30 phút · 🧠 +3, nhớ nhà −10)',on:()=>{
const r=callHome(S,'voice');
d.called=true;d.min+=r.min;save(S,storage);
toast('📞 Đã gọi thoại về nhà',`🧠 +3 · Nhớ nhà còn ${r.homesick}/100 · ⏰ ${fmtClock(d.min)}`);
runStep();
}},
{label:'📹 Gọi video cả nhà (60 phút · 🧠 +6, nhớ nhà −30)',on:()=>{
const r=callHome(S,'video');
d.called=true;d.min+=r.min;save(S,storage);
toast('📹 Đã gọi video cả nhà',`🧠 +6 · Nhớ nhà còn ${r.homesick}/100 · ⏰ ${fmtClock(d.min)}`);
runStep();
}},
{label:'← Quay lại',cls:'ghost',on:()=>lifeDayOffHub('home')},
]);
},
});
}
if(btns.length<5){
btns.push({
label:`🎒 Kiểm tra túi khẩn cấp 非常持ち出し袋 (${prepScore(S)}/5)`,
on:()=>emergencyBagModal(()=>lifeDayOffHub('home')),
});
}
btns.push({label:'← Quay lại nhóm ngày nghỉ',cls:'ghost',on:()=>lifeDayOffHub(null)});
card(`<h2>🏠 Ở nhà · Ký túc xá さくら寮</h2>
      <p>⏰ Bây giờ là <b>${fmtClock(d.min)}</b> · Nghỉ ngơi và sinh hoạt tại phòng:</p>`,btns);
return;
}
if(group==='paper'){
townPaperworkVisit(()=>lifeDayOffHub(null));
return;
}
const btns=[];
if(hasHolidayGroup){
btns.push({
label:`🎉 Dịp lễ (${ev && !d.eventDone ? ev.vi : `${hActs.length} hoạt động`})`,
on:()=>lifeDayOffHub('holiday'),
});
}
if(!isTyphoon){
btns.push({
label:'🚶 Ra ngoài (đền, siêu thị, tiệm giặt, xe đạp, khám bệnh)',
on:()=>lifeDayOffHub('out'),
});
}
btns.push({
label:'🏠 Ở nhà (học tiếng Nhật, ngủ bù, gọi về, nấu món Việt)',
on:()=>lifeDayOffHub('home'),
});
if(openDocs.length>0){
btns.push({
label:`📋 Giấy tờ (${openDocs.map((x) => x.jp).join(' · ')})`,
on:()=>lifeDayOffHub('paper'),
});
}
btns.push({
label:'🌙 Kết thúc ban ngày → Nghỉ tối tại phòng',
cls:'ghost',
on:()=>{
d.min=21*60;
S.sStep=5;
save(S,storage);
runStep();
},
});
const pendingPapers=paperTodo(S,S.cal);
const paperHint=pendingPapers.length&&!openDocs.length
?`<p style="font-size:12px;color:var(--ink-dim)">📋 Còn ${pendingPapers.length} giấy tờ cần làm (${pendingPapers.map((x) => x.jp).join(', ')}). 市役所 mở T2–T6 (8:30–17:15) & sáng T7 ngày 13 (土曜開庁 9:00–12:00).</p>`
:'';
card(`<h2>${isTyphoon ? '🌀 Nghỉ bão tại phòng' : '🎌 Hôm nay đi đâu?'}</h2>
    <p>⏰ Bây giờ là <b>${fmtClock(d.min)}</b> (tới 21:00 về phòng) · Thời tiết: <b>${fx.icon} ${esc(fx.vi)}</b></p>
    ${ev ? `<p class="lesson">🎉 <b>${esc(ev.jp)} — ${esc(ev.vi)}:</b> ${esc(ev.desc)}</p>` : ''}
    ${paperHint}`,btns);
}
function lifeVnCookPicker(){
const S=G.S,d=S.lDay;
const dishes=availableVnDishes(ensureCal(S));
const btns=dishes.slice(0,3).map((dish,idx)=>({
label:`${dish.icon || '🍜'} ${dish.vi} (góp ${yen(dish.share)} · +${Math.round(dish.min / 60)}h · 🧠 +${dish.fx.mental}, ❤️ +${dish.fx.health}, 🤝 +${dish.fx.team})`,
cls:idx===0?'':'ghost',
on:()=>{
const r=cookVietnamese(S,dish);
if(!r.ok){
toast('💴 Không đủ tiền góp nấu ăn',`Cần ${yen(dish.share)}`);
return;
}
d.cookedVn=true;
d.min=(d.min||540)+dish.min;
save(S,storage);
toast(`${dish.icon || '🍜'} Đã nấu ${dish.vi} cùng bạn phòng!`,`🧠 +${dish.fx.mental} · ❤️ +${dish.fx.health} · 🤝 +${dish.fx.team} · ⏰ ${fmtClock(d.min)}`,4.5);
runStep();
},
}));
btns.push({label:'← Quay lại',cls:'ghost',on:()=>runStep()});
card(`<h2>🍜 Nấu món Việt cuối tuần · ベトナム料理</h2>
    <p>Góp tiền mua nguyên liệu nấu bữa cơm quê hương cùng anh em cùng phòng ký túc xá:</p>
    <p class="lesson">Nấu ăn chung giúp vơi nỗi nhớ nhà, hồi phục thể lực và gắn kết tình anh em cùng phòng.</p>`,btns);
}
function overdueAlertCard(oRes){
const S=G.S;
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('⚠️ Quá hạn giấy tờ hành chính');
card(`<div class="big">⚠️</div><h2>Quá hạn thủ tục hành chính!</h2>
    <p>Bạn có giấy tờ hành chính đã quá hạn quy định:</p>
    <ul>${(oRes.notes || []).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    <p class="lesson">💡 Mở <b>📱 Điện thoại → 📋 Việc cần làm</b> để kiểm tra hạn giấy tờ. <b>市役所</b> mở T2–T6 (8:30–17:15) và sáng T7 ngày 13 (<b>土曜開庁 9:00–12:00</b>), hoặc bạn có thể xin nghỉ nửa buổi sáng (<b>半休</b>) để đi làm thủ tục.</p>`,[
{label:'Đã hiểu →',on:()=>runStep()},
]);
}
function morningIllCard(){
const S=G.S;
if(!S.ill){runStep();return;}
S.lDay=S.lDay||{dayKey:curDayKey(S),min:9*60};
S.lDay.illPrompted=true;
save(S,storage);
const meta=ILLNESSES[S.ill.id]||ILLNESSES.kaze;
const cal=ensureCal(S);
const hoken=!!S.papers?.hoken;
const fullFee=CLINIC.BASE_FEE||5000;
const insuredFee=Math.round(fullFee*(CLINIC.HOKEN_RATE||0.3));
const clinicFee=hoken?insuredFee:fullFee;
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud(`${meta.icon} Đang bị ${meta.vi}`);
const btns=[];
if(isClinicOpen(cal,9*60)){
btns.push({
label:`🏥 Đi khám Phòng khám さくら (${yen(clinicFee)} · ${hoken ? 'có 保険証 30%' : 'chưa có 保険証'} · khỏi sau 1–2 ngày)`,
on:()=>{
if(!cal.isOff)takeHankyu(S);
S.lDay=S.lDay||{dayKey:curDayKey(S),min:9*60};
S.lDay.illPrompted=true;
save(S,storage);
townMedicalVisit(()=>runStep());
},
});
}
btns.push({
label:`💊 Ghé ドラッグストア さくら mua thuốc (${yen(1200)} · 30 phút)`,
cls:btns.length>0?'ghost':'',
on:()=>{
S.lDay=S.lDay||{dayKey:curDayKey(S),min:9*60};
S.lDay.illPrompted=true;
save(S,storage);
townMedicalVisit(()=>runStep());
},
});
btns.push({
label:'🚶 Tiếp tục ngày hôm nay (đi bộ ×0.9)',
cls:'ghost',
on:()=>runStep(),
});
card(`<div class="big">${meta.icon}</div><h2>${esc(meta.jp)} — ${esc(meta.vi)}</h2>
    <p>${esc(meta.symptom || meta.desc || '')} (Còn khoảng <b>${S.ill.daysLeft}</b> ngày · mỗi ngày không điều trị <b>❤️ −3</b>, đi bộ <b>×0.9</b>).</p>
    <p class="lesson">💡 Có thẻ bảo hiểm y tế (<b>健康保険証</b>) đi khám chỉ trả 30% (${yen(insuredFee)} thay vì ${yen(fullFee)}) và nhanh khỏi hơn thuốc tự mua.</p>`,btns);
}
function morningHankyuCard(urgentDocs){
const S=G.S;
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('📋 Sắp tới hạn giấy tờ');
const names=urgentDocs.map((d)=>`${d.icon} ${d.jp} (${d.vi})`).join(', ');
card(`<div class="big">📋</div><h2>Giấy tờ hành chính sắp hết hạn!</h2>
    <p>Còn không quá 2 ngày là tới hạn: <b>${esc(names)}</b>.</p>
    <p class="lesson">💡 <b>市役所</b> và <b>郵便局</b> làm việc giờ hành chính T2–T6 (riêng <b>市役所</b> có mở sáng T7 ngày 13 <b>土曜開庁 9:00–12:00</b>). Bạn có muốn xin nghỉ nửa buổi sáng (<b>半休 · 👷 −2</b>) để đi làm giấy tờ ngay không?</p>`,[
{
label:'📋 Xin nghỉ nửa buổi sáng (半休 · 👷 −2) đi làm giấy tờ ngay',
on:()=>{
takeHankyu(S);
S.lDay=S.lDay||{dayKey:curDayKey(S),min:9*60};
S.lDay.min=9*60;
save(S,storage);
townPaperworkVisit(()=>runStep());
},
},
{
label:'🚶 Đi làm bình thường',
cls:'ghost',
on:()=>runStep(),
},
]);
}
function stolenBikeCard(){
const S=G.S;
if(S.lDay)delete S.lDay.stolenBikeReport;
save(S,storage);
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('🚲 Mất xe đạp!');
card(`<div class="big">🚲</div><h2>Xe đạp để quên không khoá đã bị lấy mất!</h2>
    <p>Sáng nay xuống nhà để xe ký túc xá, bạn phát hiện chiếc xe đạp để quên không bấm khoá (<b>🔓</b>) tối qua đã biến mất.</p>
    <p class="lesson">💡 Nếu đã đăng ký mã chống trộm <b>防犯登録 (600 ¥)</b>, bạn có thể ra Đồn cảnh sát (<b>交番</b>) trình báo để có 50% cơ hội tìm lại xe.</p>`,[
{
label:'🚓 Ra Đồn cảnh sát (交番) báo mất xe',
on:()=>{
const r=reportStolenBike(S);
save(S,storage);
if(r.recovered){
card(`<div class="big">🎉</div><h2>Tìm lại được xe đạp nhờ tem 防犯登録!</h2>
            <p>Cảnh sát (<b>お巡りさん</b>) tra mã <b>防犯登録</b> và tìm thấy xe của bạn bị bỏ lại gần nhà ga! Xe đã được khoá lại cẩn thận.</p>`,[
{label:'Mừng quá, tiếp tục →',on:()=>runStep()},
]);
}else{
card(`<div class="big">😔</div><h2>Chưa tìm lại được xe đạp</h2>
            <p>${r.registered || r.hasReg ? 'Dù đã tra mã 防犯登録 nhưng hiện chưa tìm thấy xe của bạn.' : 'Vì xe chưa đăng ký 防犯登録 nên cảnh sát không có mã số khung để tra cứu.'} (<b>🧠 −5</b>)</p>`,[
{label:'Đành chịu, tiếp tục →',on:()=>runStep()},
]);
}
},
},
{
label:'Đành chịu (🧠 −5)',
cls:'ghost',
on:()=>{
applyFx(S,{mental:-5});
save(S,storage);
runStep();
},
},
]);
}
function positionPlayerTown(placeKey='cityhall'){
setStage('site');
G.stages.site.setTime('day');
hideNpcs();
G.mode='talk';
const P=G.player;
const door=SERVICES?.[placeKey]?.door;
if(P&&P.holder){
P.holder.rotation.x=0;
if(door){
P.holder.position.set(door.x,0,door.z);
}else{
P.holder.position.set(ROUTE.station.x+1.2,0,ROUTE.station.z+1.5);
}
P.yaw=0;
P.play('idle');
}
}
function townPaperworkVisit(returnTo){
const S=G.S;
S.lDay=S.lDay||{dayKey:curDayKey(S),min:9*60};
const d=S.lDay;
const cal=ensureCal(S);
const min=d.min??9*60;
positionPlayerTown('cityhall');
dayHud('🏛️ Tòa hành chính / Bưu điện');
const todos=paperTodo(S,cal);
const shiyakuOpen=isPaperOpen('shiyakusho',cal,min);
const yubinOpen=isPaperOpen('yubinkyoku',cal,min);
const btns=[];
for(const doc of todos.slice(0,5)){
const open=isPaperOpen(doc.place,cal,min);
const placeLabel=doc.place==='shiyakusho'?'市役所':'郵便局';
const wMin=waitTime(doc.id,cal,min);
btns.push({
label:`${doc.icon} ${doc.jp} — ${doc.vi} (${placeLabel} · ${open ? `chờ ~${wMin}p` : 'Đóng cửa'})`,
cls:open&&btns.filter((b)=>!b.cls).length===0?'':'ghost',
on:()=>{
if(!open){
toast(`🚪 ${placeLabel} đang đóng cửa`,doc.place==='shiyakusho'?'Mở T2–T6 (8:30–17:15) & T7 ngày 13 (9:00–12:00)':'Mở T2–T6 (9:00–17:00)');
return;
}
runPaperworkForm(doc,()=>townPaperworkVisit(returnTo));
},
});
}
btns.push({label:'← Quay lại',cls:'ghost',on:()=>returnTo()});
card(`<h2>🏛️ Tòa hành chính (市役所) & Bưu điện (郵便局)</h2>
    <p>⏰ Giờ hiện tại: <b>${fmtClock(min)}</b> · <b>市役所:</b> ${shiyakuOpen ? '🟢 Đang mở' : '🔴 Đóng cửa'} · <b>郵便局:</b> ${yubinOpen ? '🟢 Đang mở' : '🔴 Đóng cửa'}</p>
    ${todos.length ? '<p>Chọn thủ tục cần điền tờ khai tiếng Nhật (5–6 mục):</p>' : '<p class="lesson">✅ Bạn đã hoàn thành tất cả giấy tờ hành chính cần thiết!</p>'}`,btns);
}
function runPaperworkForm(doc,onDone){
const S=G.S;
S.lDay=S.lDay||{dayKey:curDayKey(S),min:9*60};
const d=S.lDay;
const cal=ensureCal(S);
positionPlayerTown(doc.place==='shiyakusho'?'cityhall':'post');
const fields=formFields(doc.id,S);
const wMin=waitTime(doc.id,cal,d.min??9*60);
const answers={};
function askField(idx){
if(idx>=fields.length){
const res=checkForm(doc.id,answers,S);
if(!res.ok){
d.min=(d.min??540)+res.extraMin;
save(S,storage);
const wrongLabels=res.wrong.map((fid)=>{
const f=fields.find((x)=>x.id===fid);
return f?`${f.jp} (${f.vi})`:fid;
}).join(', ');
card(`<div class="big">📝</div><h2>Tờ khai có mục điền chưa đúng!</h2>
          <p>Nhân viên quầy kiểm tra và gạch đỏ mục cần sửa: <b>${esc(wrongLabels)}</b>.</p>
          <p class="lesson">⏳ Bạn mất thêm <b>+${res.extraMin} phút</b> để điền lại và xếp hàng nộp lại.</p>`,[
{label:'✍️ Điền lại tờ khai →',on:()=>askField(0)},
{label:'← Để lúc khác',cls:'ghost',on:()=>onDone()},
]);
return;
}
const done=completePaper(S,doc.id,wMin);
d.min=(d.min??540)+done.min;
save(S,storage);
card(`<div class="big">✅</div><h2>Hoàn tất: ${esc(doc.jp)} (${esc(doc.vi)})</h2>
        <p>${esc(doc.benefit)} · Thời gian chờ & làm thủ tục: <b>${done.min} phút</b> (⏰ ${fmtClock(d.min)}).</p>
        <div class="deltas"><span class="chip pos">🎌 Tiếng Nhật +${done.jpGain}</span></div>`,[
{label:'Tiếp tục →',on:()=>onDone()},
]);
return;
}
const f=fields[idx];
const btns=f.options.slice(0,4).map((opt)=>({
label:opt,
on:()=>{
answers[f.id]=opt;
askField(idx+1);
},
}));
btns.push({label:'← Hủy tờ khai',cls:'ghost',on:()=>onDone()});
card(`<h2>${doc.icon} Tờ khai ${esc(doc.jp)} (${idx + 1}/${fields.length})</h2>
      <p>Điền mục <b>${esc(f.jp)}</b> (${esc(f.vi)}):</p>
      <p class="lesson">⏳ Thời gian chờ tại quầy dự kiến: ~${wMin} phút.</p>`,btns);
}
askField(0);
}
function townMedicalVisit(returnTo){
const S=G.S;
S.lDay=S.lDay||{dayKey:curDayKey(S),min:9*60};
const d=S.lDay;
const cal=ensureCal(S);
const min=d.min??9*60;
positionPlayerTown('clinic');
dayHud('🏥 Phòng khám & Hiệu thuốc');
const illMeta=S.ill?(ILLNESSES[S.ill.id]||ILLNESSES.kaze):null;
const clinicOpen=isClinicOpen(cal,min);
const hasHoken=!!S.papers?.hoken;
const fullFee=CLINIC.BASE_FEE||5000;
const insuredFee=Math.round(fullFee*(CLINIC.HOKEN_RATE||0.3));
const clinicFee=hasHoken?insuredFee:fullFee;
const clinicNameJp=CLINIC.name?.jp||CLINIC.jp||'さくらクリニック';
const btns=[];
if(illMeta){
btns.push({
label:`🏥 Khám Phòng khám さくら (${yen(clinicFee)} · ${hasHoken ? 'có 保険証 30%' : 'chưa có 保険証'} · ${clinicOpen ? '60–120p' : 'Đóng cửa'})`,
cls:clinicOpen?'':'ghost',
on:()=>{
if(!clinicOpen){
toast('🚪 Phòng khám さくら đang đóng cửa','Mở T2–T6 (9:00–12:30, 14:00–18:00) & sáng T7 (9:00–12:30)');
return;
}
const r=visitClinic(S,hasHoken);
if(!r.ok){
toast('💴 Không đủ tiền khám',`Cần ${yen(clinicFee)}`);
return;
}
d.min=min+r.min;
save(S,storage);
card(`<div class="big">🏥</div><h2>Đã khám tại ${esc(clinicNameJp)}</h2>
          <p>Bác sĩ khám <b>${esc(illMeta.jp)} (${esc(illMeta.vi)})</b> và kê đơn thuốc. Viện phí: <b>${yen(r.cost)}</b> (${r.hasHoken || r.insured ? 'đã giảm còn 30% nhờ 保険証' : '100% do chưa có 保険証'}).</p>
          <p class="lesson">✅ Bệnh sẽ khỏi hẳn sau <b>${r.daysLeft} ngày</b> · <b>❤️ +8</b> · <b>🎌 +2</b> (⏰ ${fmtClock(d.min)}).</p>`,[
{label:'Tiếp tục →',on:()=>returnTo()},
]);
},
});
btns.push({
label:`💊 Mua thuốc tại ドラッグストア さくら (${yen(1200)} · 30p)`,
cls:clinicOpen?'ghost':'',
on:()=>{
const r=buyMedicine(S,1200);
if(!r.ok){
toast('💴 Không đủ tiền mua thuốc','Cần 1.200 ¥');
return;
}
d.min=min+r.min;
save(S,storage);
card(`<div class="big">💊</div><h2>Mua thuốc tại ドラッグストア さくら</h2>
          <p>${r.effective
            ? `Dược sĩ tư vấn thuốc hợp triệu chứng. Bệnh giảm còn <b>${r.daysLeft} ngày</b> (<b>❤️ +3</b>).`
            : `Uống thuốc tự mua chưa đỡ rõ rệt (còn <b>${r.daysLeft} ngày</b>).`}</p>
          ${r.reminder ? `<p class="lesson">⚠️ ${esc(r.reminder)}.</p>` : ''}`,[
{label:'Tiếp tục →',on:()=>returnTo()},
]);
},
});
}
btns.push({label:'← Quay lại',cls:'ghost',on:()=>returnTo()});
card(`<h2>🏥 Phòng khám さくら & ドラッグストア さくら</h2>
    <p>⏰ Giờ hiện tại: <b>${fmtClock(min)}</b> · Phòng khám: ${clinicOpen ? '🟢 Đang mở' : '🔴 Đóng cửa (T2–T6 9:00–12:30 & 14:00–18:00; T7 9:00–12:30)'}</p>
    ${illMeta
      ? `<p>Tình trạng: <b>${illMeta.icon} ${esc(illMeta.jp)} — ${esc(illMeta.vi)}</b> (còn ~${S.ill.daysLeft} ngày).</p>`
      : '<p class="lesson">💪 Hiện tại sức khỏe của bạn bình thường, không có triệu chứng ốm.</p>'}`,btns);
}
function townBikeShopVisit(returnTo){
const S=G.S;
S.lDay=S.lDay||{dayKey:curDayKey(S),min:9*60};
const d=S.lDay;
const min=d.min??9*60;
positionPlayerTown();
dayHud('🚲 Cửa hàng xe đạp さくら');
const b=S.bike||{};
const regFee=BIKE.REGISTER_FEE||BIKE.REG_FEE||600;
const btns=[];
if(!b.owned){
btns.push({
label:`🚲 Mua xe đạp cũ 中古自転車 (${yen(BIKE.USED_PRICE)} · đi bộ ×1.6, +10p dư giờ đi làm)`,
on:()=>{
const r=buyBike(S,'used');
if(!r.ok){toast('💴 Chưa đủ tiền',`Cần ${yen(BIKE.USED_PRICE)}`);return;}
d.min=min+30;
save(S,storage);
toast('🚲 Đã mua xe đạp cũ!','Nhớ đăng ký chống trộm 防犯登録 (600 ¥) nhé!');
townBikeShopVisit(returnTo);
},
});
btns.push({
label:`✨ Mua xe đạp mới 新車 (${yen(BIKE.NEW_PRICE)} · đi bộ ×1.6, 🧠 +3)`,
cls:'ghost',
on:()=>{
const r=buyBike(S,'new');
if(!r.ok){toast('💴 Chưa đủ tiền',`Cần ${yen(BIKE.NEW_PRICE)}`);return;}
d.min=min+30;
save(S,storage);
toast('✨ Đã mua xe đạp mới!','🧠 +3 · Nhớ đăng ký 防犯登録 (600 ¥) nhé!');
townBikeShopVisit(returnTo);
},
});
}else{
if(!b.registered){
btns.push({
label:`🛡️ Đăng ký chống trộm 防犯登録 (${yen(regFee)} · bắt buộc tại Nhật)`,
on:()=>{
const r=registerBike(S);
if(!r.ok){toast('💴 Chưa đủ tiền',`Cần ${yen(regFee)}`);return;}
d.min=min+15;
save(S,storage);
toast('🛡️ Đã dán tem 防犯登録!','Được cảnh sát kiểm tra hợp lệ & 50% tìm lại nếu mất xe.');
townBikeShopVisit(returnTo);
},
});
}
btns.push({
label:`${b.locked !== false ? '🔒 Đỗ xe: Luôn khoá (An toàn)' : '🔓 Đỗ xe: Quên khoá (3%/ngày mất xe)'}`,
cls:btns.length>0?'ghost':'',
on:()=>{
S.bike.locked=b.locked===false;
save(S,storage);
townBikeShopVisit(returnTo);
},
});
}
btns.push({
label:`📘 Ôn 5 quy tắc đi xe đạp ở Nhật (${b.quizPassed || b.rulesDone ? 'đã đạt 5/5' : 'đạt 5/5 lần đầu: 🎌 +3'})`,
cls:'ghost',
on:()=>runBikeRulesQuiz(()=>townBikeShopVisit(returnTo)),
});
btns.push({label:'← Quay lại',cls:'ghost',on:()=>returnTo()});
card(`<h2>🚲 Cửa hàng xe đạp さくら · サイクルショップ</h2>
    <p>Trạng thái xe: <b>${b.owned ? (b.kind === 'new' ? '✨ Xe đạp mới' : '🚲 Xe đạp cũ') : 'Chưa có xe đạp'}</b>
      ${b.owned ? ` · 防犯登録: <b>${b.registered ? '✅ Đã đăng ký' : '⚠️ Chưa đăng ký'}</b>` : ''}</p>
    <p class="lesson">💡 Có xe đạp giúp đi làm & đi chợ nhanh gấp <b>×1.6</b> (+10 phút dư giờ buổi sáng) và đi hội pháo hoa mùa hè ở xa không tốn 600 ¥ tiền tàu.</p>`,btns);
}
function runBikeRulesQuiz(onDone){
const S=G.S;
const rules=Array.isArray(bikeRules)?bikeRules:bikeRules();
const answers=[];
function askRule(idx){
if(idx>=rules.length){
const res=answerBikeRules(S,answers);
save(S,storage);
card(`<div class="big">${res.ok ? '🎉' : '📘'}</div><h2>Kết quả luật đi xe đạp: ${res.score}/${res.total}</h2>
        <p>${res.ok
          ? 'Bạn đã nắm vững cả 5 quy tắc an toàn khi đi xe đạp tại Nhật Bản!'
          : 'Hãy chú ý: đi bên trái, bật đèn buổi tối, không vừa đi vừa cầm ô/điện thoại, không chở đôi và không uống rượu bia.'}</p>
        ${res.deltas?.length ? `<div class="deltas">${deltaChips(res.deltas)}</div>` : ''}`,[
{label:'Hoàn tất →',on:()=>onDone()},
]);
return;
}
const q=rules[idx];
const opts=q.options||q.choices||[];
const btns=opts.map((c,cIdx)=>({
label:c,
on:()=>{
answers[idx]=cIdx;
askRule(idx+1);
},
}));
btns.push({label:'← Quay lại',cls:'ghost',on:()=>onDone()});
card(`<h2>📘 Luật xe đạp Nhật Bản (${idx + 1}/${rules.length})</h2>
      ${q.jp ? `<p><b>${esc(q.jp)}</b></p>` : ''}
      <p>${esc(q.q)}</p>`,btns);
}
askRule(0);
}
function emergencyBagModal(returnTo){
const S=G.S;
ensurePrep(S);
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('🎒 Túi khẩn cấp 非常持出袋');
const score=prepScore(S);
const unowned=PREP_ITEMS.filter((it)=>!S.prep[it.id]);
const btns=[];
for(const[idx,it]of unowned.slice(0,2).entries()){
btns.push({
label:`${it.icon} Mua ${it.vi} (${it.jp} · ${yen(it.cost)})`,
cls:idx===0?'':'ghost',
on:()=>{
const r=buyPrep(S,it.id);
if(!r.ok){
toast('💴 Chưa đủ tiền',`Cần ${yen(it.cost)}`);
return;
}
save(S,storage);
toast(`${it.icon} Đã thêm vào túi khẩn cấp!`,`Mức chuẩn bị: ${r.score}/5`);
emergencyBagModal(returnTo);
},
});
}
if(!S.prep.shelterKnown){
btns.push({
label:'🪧 Học biển báo Nơi sơ tán (避難所 · 🎌 +2)',
cls:btns.length>0?'ghost':'',
on:()=>{
const q=SHELTER_QUESTION;
const opts=q.options||q.choices||[];
const qBtns=opts.map((c,idx)=>({
label:c,
on:()=>{
const res=answerShelter(S,idx);
save(S,storage);
toast(
res.ok?'✅ Chính xác! 避難所 = Nơi sơ tán':'💡 避難所 nghĩa là Nơi sơ tán khẩn cấp',
res.deltas?.length?'🎌 Văn hóa +2 · 🗣️ Tiếng Nhật +1':'',
);
emergencyBagModal(returnTo);
},
}));
qBtns.push({label:'← Quay lại',cls:'ghost',on:()=>emergencyBagModal(returnTo)});
card(`<h2>🪧 Biển báo phòng chống thiên tai (${esc(q.jp || '避難所')})</h2><p>${esc(q.q || q.prompt || '')}</p>`,qBtns);
},
});
}
btns.push({label:'← Quay lại',cls:'ghost',on:()=>returnTo()});
const listHtml=PREP_ITEMS.map((it)=>
`<li style="line-height:1.35">${S.prep[it.id] ? '✅' : '⬜'} ${it.icon} <b>${esc(it.jp)}</b> — ${esc(it.vi)} (${yen(it.cost)})</li>`
).join('');
card(`<h2>🎒 Túi khẩn cấp · 非常持出袋 (${score}/5 món)</h2>
    <p>Chuẩn bị ≥ 4/5 món thiết yếu giúp giảm một nửa tổn thất tinh thần khi động đất hoặc bão lớn:</p>
    <ul style="font-size:13px">${listHtml}</ul>`,btns);
}
function caughtSideJobCard(){
const S=G.S,rep=S.lDay.caughtReport;
delete S.lDay.caughtReport;
save(S,storage);
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('🚨 Vi phạm quy định');
if(rep.lostJob){
card(`<div class="big">🚨</div><h2>Bị chấm dứt hợp đồng vì tái phạm làm thêm chui!</h2>
      <p>Nghiệp đoàn và công ty phát hiện bạn tiếp tục đi làm thêm ngoài tư cách lưu trú (<span class="jp">資格外活動違反</span>) lần thứ ${rep.count}. Bạn bị buộc thôi việc tại nơi làm hiện tại (👷 −30, 🧠 −20).</p>
      <p class="lesson">⚠️ Để không phải về nước giữa chừng, bạn bắt buộc phải đăng ký chuyển sang ngành khác và làm lại từ bậc 1.</p>`,[
{label:'🔄 Chuyển ngành bắt buộc →',on:()=>{
const nextJob=targets(S)[0]||'bento';
S.job=nextJob;
S.jobXp=0;
S.risk.lostJob=false;
save(S,storage);
careerScreen();
}},
]);
return;
}
card(`<div class="big">🚨</div><h2>Bị phát hiện làm thêm chui · 資格外活動違反</h2>
    <p>Nghiệp đoàn nhận được tin báo bạn đi làm thêm nhận tiền mặt ngày nghỉ. Bạn bị lập biên bản kỷ luật lần 1:</p>
    <ul>
      <li>💸 Phạt vi phạm hợp đồng: <b>−${yen(rep.fine || 30000)}</b></li>
      <li>👷 Uy tín với quản lý <b>−20</b> · 🧠 Tinh thần <b>−15</b></li>
    </ul>
    <p class="lesson">⚠️ Thực tập sinh chỉ được làm việc tại đúng đơn vị tiếp nhận đã đăng ký. Tái phạm lần 2 sẽ bị mất việc ngay lập tức!</p>`,[
{label:'Xin lỗi và tiếp tục →',on:()=>runStep()},
]);
}
function runHolidayAct(hAct){
const S=G.S,d=S.lDay;
ensureHolidayState(S);
if(hAct.id==='cards'){
const r=buyBox(S,d.min||540);
if(!r.ok){
if(r.soldOut){
card(`<div class="big">🪧</div><h2>売り切れ！ — Đã bán hết sạch!</h2>
          <p>Bạn tới cửa hàng lúc <b>${fmtClock(d.min || 600)}</b> (sau 10:00 sáng), toàn bộ hộp <b>モンスターカード — Thẻ Quái Thú 限定BOX</b> đã bị dân xếp hàng mua sạch từ sớm!</p>
          <p class="lesson">💡 Muốn mua giá gốc ${yen(HOLI.BOX_PRICE)} phải đi xếp hàng ngay đầu buổi sáng (trước 10:00). Ngoài cổng có người lạ rao bán lại hộp lẻ với giá 4.800 ¥ nhưng có 25% nguy cơ hàng giả dán lại seal.</p>`,[
{label:'🤝 Mua liều từ người lạ ngoài cổng (4.800 ¥)',on:()=>{
const sr=buyFromStranger(S,4800);
if(!sr.ok){toast('💴 Chưa đủ tiền','Cần 4.800 ¥');runStep();return;}
d.min=(d.min||540)+45;
save(S,storage);
if(sr.fake)toast('😱 Bị lừa hộp giả dán lại seal!','Bên trong toàn giấy bìa! Mất 4.800 ¥ · 🧠 −6',5);
else toast('📦 Mua được hộp thật!','Đã cất vào túi đồ Chợ Cũ (📱)!');
runStep();
}},
{label:'← Quay lại',cls:'ghost',on:()=>runStep()},
]);
return;
}
if(r.limit){
toast('🃏 Giới hạn 1 hộp/người/dịp','Hôm nay bạn đã xếp hàng mua 1 hộp rồi. Mở 📱 Chợ Cũ để xem hoặc bán!');
return;
}
toast('💴 Chưa đủ tiền',`Cần ${yen(HOLI.BOX_PRICE)} để mua モンスターカード 限定BOX`);
return;
}
d.min=(d.min||540)+r.min;
save(S,storage);
card(`<div class="big">🃏</div><h2>Mua được モンスターカード 限定BOX!</h2>
      <p>Sau 1 tiếng rưỡi xếp hàng từ sớm, bạn đã mua được 1 hộp <b>Thẻ Quái Thú 限定BOX</b> nguyên seal với giá gốc <b>${yen(HOLI.BOX_PRICE)}</b>!</p>
      <p class="lesson">Bạn muốn giữ nguyên seal chờ đăng bán trên <b>📱 Chợ Cũ (フリマ)</b> hay bóc ngay thử vận may?</p>`,[
{label:'✨ Bóc hộp ngay xem thẻ bên trong! (giữ sưu tầm 🧠 +2)',on:()=>{
revealBox(S,r.box,()=>runStep());
}},
{label:'📦 Giữ nguyên seal (cất vào 📱 Chợ Cũ chờ được giá)',cls:'ghost',on:()=>{
toast('📦 Đã cất hộp nguyên seal','Mở nút 📱 trên góc trái → tab Chợ Cũ để theo dõi giá và đăng bán!');
runStep();
}},
]);
return;
}
if(hAct.id==='fukubukuro'){
const r=openFukubukuro(S);
if(!r.ok){toast('💴 Chưa đủ tiền','Cần 3.000 ¥ để mua túi may mắn 福袋');return;}
d['holi_'+hAct.id]=true;
d.min=(d.min||540)+hAct.min;
save(S,storage);
card(`<div class="big">🛍️</div><h2>福袋 — Mở túi may mắn đầu năm!</h2>
      <p>Bạn mua túi may mắn <b>福袋</b> giá <b>3.000 ¥</b>. Khi mở ra, bên trong là món đồ trị giá <b>${yen(r.value)}</b> (${r.net >= 0 ? `lời +${yen(r.net)}` : `lỗ −${yen(-r.net)}`})!</p>
      <div class="deltas">${deltaChips(r.deltas)}</div>`,[
{label:'Tiếp tục ngày Tết →',on:()=>runStep()},
]);
return;
}
const festMap={
hanami:'hanami',
hanabi:'natsumatsuri',
bon:'obon',
momiji:'kouyou',
joya:'oomisoka',
hatsumode:'shogatsu',
};
if(festMap[hAct.id]){
d['holi_'+hAct.id]=true;
save(S,storage);
lifeFestivalShrineVisit(festMap[hAct.id],()=>{
d.min=(d.min||540)+(hAct.min||120);
save(S,storage);
notifyAchievements(S);
runStep();
});
return;
}
const effCost=(hAct.id==='hanabi'&&S.bike?.owned)?0:(hAct.cost||0);
if((S.money||0)<effCost){
toast('💴 Chưa đủ tiền',`Cần ${yen(effCost)} cho hoạt động này`);
return;
}
const fx={...(hAct.fx||{})};
if(effCost)fx.money=-effCost;
const deltas=applyFx(S,fx);
d['holi_'+hAct.id]=true;
d.min=(d.min||540)+(hAct.min||120);
save(S,storage);
notifyAchievements(S);
card(`<div class="big">${hAct.icon}</div><h2>${esc(hAct.jp)} — ${esc(hAct.vi)}</h2>
    <p>${esc(hAct.desc || '')}</p>
    <div class="deltas">${deltaChips(deltas)}</div>`,[
{label:'Tiếp tục ngày nghỉ →',on:()=>runStep()},
]);
}
async function lifeFestivalShrineVisit(festId,onDone=null){
const S=G.S;
S.lDay=S.lDay||{dayKey:curDayKey(S),min:10*60};
const d=S.lDay;
const fDef=FESTIVALS[festId]||{icon:'⛩️',jp:'さくら神社',vi:'Đền Sakura',time:'day'};
if(!G.stages.shrine){toast(`⛩️ Đang vào lễ hội ${fDef.jp}…`,fDef.vi);await ensureShrine();}
hideNpcs();
await dress(false);
const[hung,hoa]=[await npc('hung','shrine'),await npc('hoa','shrine')];
await spawnWorkers();
G.mode='dayoff';
const startMin=(fDef.time==='night'||fDef.time==='dusk')
?Math.max(d.min||19*60,19*60)
:(d.min||10*60);
G.dayoff.start({
S,
stages:G.stages,
who:{player:G.player,hung,hoa},
setStage,
storage,
hubReturn:true,
directShrine:true,
festival:festId,
min:startMin,
dayLabel:hudCalText(S,`${fDef.icon} ${fDef.jp}`),
onNotify:notifyAchievements,
onEnd:(endSt)=>{
d.min=Math.max((d.min||540)+120,endSt?.min||720);
save(S,storage);
notifyAchievements(S);
if(onDone)onDone(endSt);
else runStep();
},
});
}
async function lifeShrineVisit(){
const S=G.S,d=S.lDay;
const todayFest=activeCalendarFestivalId(S.cal);
if(todayFest&&FESTIVALS[todayFest]?.where==='shrine'){
return lifeFestivalShrineVisit(todayFest);
}
if(!G.stages.shrine){toast('⛩️ Đang vào đền さくら神社…','休日 · Ngày nghỉ');await ensureShrine();}
hideNpcs();
await dress(false);
const[hung,hoa]=[await npc('hung','shrine'),await npc('hoa','shrine')];
await spawnWorkers();
G.mode='dayoff';
G.dayoff.start({
S,
stages:G.stages,
who:{player:G.player,hung,hoa},
setStage,
storage,
hubReturn:true,
min:d.min||10*60,
dayLabel:hudCalText(S,'Đền さくら神社'),
onNotify:notifyAchievements,
onEnd:(endSt)=>{
d.min=Math.max((d.min||540)+180,endSt?.min||720);
save(S,storage);
notifyAchievements(S);
runStep();
},
});
}
function sickDay(kind){
const S=G.S,r=sickLeave(S,kind);
setStage('dorm');G.stages.dorm.setTime('day');hideNpcs();
G.mode='talk';
dayHud('🏥 Nghỉ ốm');
const P=G.player;P.holder.rotation.x=-Math.PI/2;P.holder.position.set(-0.5,0.3,-0.1);P.yaw=0;P.play('idle');
card(`<div class="big">${r.hospital ? '🏥' : '🛌'}</div><h2>Bạn phải nghỉ làm hôm nay</h2>
    <p>${kind === 'mental' ? '🧠 Tinh thần cạn kiệt, không thể tập trung làm việc.' : kind === 'both' ? '❤️ 🧠 Kiệt sức cả thân lẫn tâm.' : '❤️ Cơ thể kiệt sức, sáng nay bạn không đứng dậy nổi.'}${r.hospital ? ' Bạn được đưa tới <span class="jp">病院</span> (bệnh viện).' : ''}</p>
    <ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="lesson">Ở Nhật, nghỉ ốm phải báo quản lý trước giờ làm 「体調が悪いので休みます」. Đừng cố quá sức!</p>`,[
{label:'Nghỉ ngơi →',on:()=>{P.holder.rotation.x=0;S.sStep=5;S.flags.morningDay=curDayKey(S);finishStep();}},
]);
}
function finishStep(extraHtml=''){
const S=G.S;
const hadMissedDuty=!!S?.home?.missedDutyPending;
const r=completeStep(S);
const spoiled=r.dayEnd?spoil(S):[];
let dutyNote='';
if(r.dayEnd&&!r.weekEnd){
if(hadMissedDuty){
missedDuty(S);
dutyNote=' · 🧹 Quên trực nhật 掃除当番 (🤝 −3, 🧠 −2)';
}
dayTick(S,ensureCal(S));
const cRes=checkCaught(S);
if(cRes.caught){
S.lDay=S.lDay||{};
S.lDay.caughtReport=cRes;
}
if(S.ill){
illDayTick(S);
}else if(S.life){
catchIll(S,ensureCal(S),curWeather(S),jobOf());
}
if(S.bike?.owned){
const bRes=checkBikeTheft(S);
if(bRes.stolen){
S.lDay=S.lDay||{};
S.lDay.stolenBikeReport=true;
}
}
}
save(S,storage);
if(r.levels)toast(`⬆️ Lên cấp ${S.lv}!`,'Hồi ❤️ 🧠 +15 · làm việc bớt mệt hơn');
else toast(`⭐ +${r.xp} XP`,extraHtml);
if(r.dayEnd&&!r.weekEnd){
const spoilNote=spoiled.length
?` · 🥀 Hỏng: ${spoiled.map((id) => `${goodOf(id)?.icon || ''} ${goodOf(id)?.vi || id}`).join(', ')}`
:'';
toast('🌅 Sáng hôm sau · おはようございます！',`${hudCalText(S)}${spoilNote}${dutyNote}`);
}
runStep();
}
let stationP=null;
function ensureStation(){
if(!stationP){
stationP=buildStation().then(async(s)=>{
G.stages.station=s;
G.stationCrowd=await new Crowd(s.scene,{mode:'station',stage:s,seed:7}).spawnStation();
return s;
});
}
return stationP;
}
let marketP=null;
function ensureMarket(){
if(!marketP){
marketP=buildMarket().then((m)=>{
G.stages.market=m;
return m;
});
}
return marketP;
}
async function openMarket(ev,onExit){
if(!G.stages.market){toast('🛒 Đang vào siêu thị…','スーパー さくら');await ensureMarket();}
hideNpcs();
await dress(false);
const clerk=await npc('clerk','market');
G.mode='market';
G.market.start({
S:G.S,
ev,
stage:G.stages.market,
who:{player:G.player,clerk},
setStage,
storage,
dayLabel:hudCalText(G.S,'Siêu thị'),
onExit,
});
}
async function morningStep(st){
const S=G.S,job=jobOf();
hideNpcs();await dress(false);
G.mode='morning';
const train=job==='care'||job==='bento'||job==='lotus';
if(train&&!G.stages.station){toast('🚉 Đang tải ga tàu…','さくら駅');await ensureStation();}
if(train&&G.stationCrowd)G.stationCrowd.reset();
const[suzuki,hung]=[await npc('suzuki','site'),await npc('hung','site')];
const nurse=job==='care'?await npc('yamada','care'):null;
const foreman=job==='bento'?await npc('tanaka','bento'):job==='lotus'?await npc('tanaka','lotus'):null;
if(job==='care')await spawnFolk();
await spawnWorkers();
G.morning.start({
S,stages:G.stages,who:{player:G.player,suzuki,hung,nurse,foreman},
commute:train?'train':'walk',
storage,
setStage,dayLabel:hudCalText(S,'Buổi sáng'),
onResetCrowd:()=>{if(G.stationCrowd)G.stationCrowd.reset();},
onEnd:()=>{S.flags.morningDay=curDayKey(S);save(S,storage);hideAll();talkStep(st);},
});
}
function eveningPlace(st){
const spot=spotFor(st.data);
if(spot==='room')return{stage:'dorm',pos:{x:0.3,z:0.9},cam:'room'};
const p=spot==='konbini'?ROUTE.konbini:ROUTE.start;
return{stage:'site',pos:{x:p.x-0.7,z:p.z-0.3},cam:'street'};
}
async function eveningStep(st){
const S=G.S,job=jobOf();
hideNpcs();await dress(false);
G.mode='evening';
await spawnWorkers();
G.evening.start({
S,spot:spotFor(st.data),stages:G.stages,who:{player:G.player},setStage,
storage,
from:job==='care'||job==='bento'||job==='lotus'?'station':'gate',
dayLabel:hudCalText(S,'Buổi tối'),
onMarket:(ev)=>openMarket(ev,()=>{hideNpcs();G.mode='evening';G.evening.resumeFromMarket();}),
onArrive:()=>{S.flags.eveningDay=curDayKey(S);save(S,storage);talkStep(st,eveningPlace(st));},
});
}
async function talkStep(st,where=null){
const d=st.data,job=jobOf(),atWork=st.at==='work'&&!where;
const atCare=atWork&&job==='care',atBento=atWork&&job==='bento',atLotus=atWork&&job==='lotus';
await dress(atWork);
setStage(where?where.stage:atCare?'care':atBento?'bento':atLotus?'lotus':atWork?'site':'town');
hideNpcs();
G.mode='talk';
G.talkCam=where?where.cam:atCare?'care':atBento?'bento':atLotus?'lotus':atWork?'deck':'town';
const P=G.player;P.play('idle');
const fx=curWeatherFx(G.S);
if(atCare){
P.unpinAll();P.holder.rotation.x=0;
await spawnFolk();
P.holder.position.set(0.4,0,3.6);
}else if(atBento){
P.unpinAll();P.holder.rotation.x=0;
G.stages.bento.clearTrays();
P.holder.position.set(BENTO_ROOM.talkPlayer.x,0,BENTO_ROOM.talkPlayer.z);
}else if(atLotus){
P.unpinAll();P.holder.rotation.x=0;
G.stages.lotus.setWeather({rain:!!fx.rain,snow:!!fx.snow,wind:!!fx.wind,cold:!!((d.title||'').includes('lạnh')||fx.snow)});
G.stages.lotus.setSpray(false);
P.holder.position.set(LOTUS_FIELD.talkPlayer.x,0,LOTUS_FIELD.talkPlayer.z);
}else if(atWork){
P.look({...G.S.look.colors,...WORK_COLORS});P.unpinAll();P.helmet.visible=true;
G.stages.site.setWeather({rain:!!fx.rain,snow:!!fx.snow,wind:!!fx.wind});G.stages.site.setTime('day');G.stages.site.ring.visible=false;
await spawnWorkers();
P.holder.position.set(-1.2,DECK_Y,1.9);
}else if(where){
P.look(G.S.look.colors);P.unpinAll();if(P.helmet)P.helmet.visible=false;if(P.cap)P.cap.visible=false;if(P.waders)P.waders.setVisible(false);P.holder.rotation.x=0;
if(where.stage==='site'){G.stages.site.setWeather({rain:!!fx.rain,snow:!!fx.snow,wind:!!fx.wind});G.stages.site.setTime('dusk');G.stages.site.ring.visible=false;}
else G.stages.dorm.setTime('night');
P.holder.position.set(where.pos.x,0,where.pos.z);
}else{
P.look(G.S.look.colors);P.unpinAll();if(P.helmet)P.helmet.visible=false;if(P.cap)P.cap.visible=false;if(P.waders)P.waders.setVisible(false);
G.stages.town.setTime(st.data.place==='konbini'||st.data.place==='bank'?'dusk':'night');
P.holder.position.set(-0.6,0,2.2);
}
let N=null;
if(d.who){
N=await npc(d.who,where?where.stage:atCare?'care':atBento?'bento':atLotus?'lotus':atWork?'site':'town');
if(where&&job!=='site'&&N.helmet)N.helmet.visible=false;
const off=atWork&&!atCare&&!atBento&&!atLotus?[-0.5,-1.5]:G.talkCam==='street'?[1.4,0.15]:[1.5,-0.6];
N.holder.position.set(P.holder.position.x+off[0],P.holder.position.y,P.holder.position.z+off[1]);
N.yaw=Math.atan2(P.holder.position.x-N.holder.position.x,P.holder.position.z-N.holder.position.z);
P.yaw=Math.atan2(N.holder.position.x-P.holder.position.x,N.holder.position.z-P.holder.position.z);
N.play('talk');
G.overhead.say(N,d.jp.replace(/[「」]/g,''),6);
}else P.yaw=0;
G.talkPair={P,N};
dayHud(st.label);
const who=d.who?NPCS[d.who]:{name:G.S.name||'Bạn',role:''};
$('talk-name').textContent=who.name;$('talk-role').textContent=who.role;$('talk-step').textContent=`+${st.xp} XP`;
$('talk-title').textContent=d.title;$('talk-jp').textContent=d.jp;$('talk-text').textContent=d.text;
const box=$('talk-choices');box.textContent='';box.hidden=false;show('talk-result',false);
d.choices.forEach((c)=>{
const b=document.createElement('button');b.type='button';b.textContent=c.t;
b.addEventListener('click',()=>{
const deltas=chooseTalk(G.S,c);
box.hidden=true;
$('talk-r').textContent=c.r||'';
$('talk-deltas').innerHTML=deltaChips(deltas)+(c.ally?'<span class="delta">🤝 Có thêm người sẵn sàng giúp bạn</span>':'')+(c.watch?'<span class="delta neg">👀 Bạn đang bị để ý</span>':'');
const L=$('talk-lesson');L.hidden=!c.lesson;L.textContent=c.lesson?'📘 '+c.lesson:'';
show('talk-result');
$('stats').innerHTML=statsHtml();
if(N)N.play('idle');
$('talk-next').onclick=()=>{show('talk',false);finishStep();};
});
box.appendChild(b);
});
show('talk');
}
async function shiftStep(st){
if(jobOf()==='care')return careShiftStep(st);
if(jobOf()==='bento')return bentoShiftStep(st);
if(jobOf()==='lotus')return lotusShiftStep(st);
const S=G.S;
await dress(true);
setStage('site');hideNpcs();
G.mode='shift';G.activeShift=G.shift;
const P=G.player;P.look({...S.look.colors,...WORK_COLORS});
await spawnWorkers();
const foreman=await npc('tanaka','site');
G.stages.site.ring.visible=true;
G.stages.site.setFloors(1+Math.floor((S.jobXp||0)/16));
const opts=shiftOpts(st.data,st.hard,S);
G.stages.site.setWeather({rain:!!opts.rain,snow:!!opts.snow,wind:!!opts.wind});
G.stages.site.setSeason?.(seasonOf(ensureCal(S)).id);
const rk=rankOf(S.jobXp||0);
card(`<h2>${st.hard ? '🔥 ' : ''}${esc(opts.label)}</h2>
    ${opts.jp ? `<p class="jpline">${esc(opts.jp)}</p>` : ''}
    <p>${esc(opts.vi || 'Đi tới đống ống thép bên trái, nhấc lên, rồi vác sang giá bên phải.')}</p>
    <ul><li>🎯 Vác ${opts.goal} bó ống thép</li>${opts.limit ? `<li>⏱ ${opts.limit} giây</li>` : '<li>⏱ Không giới hạn giờ</li>'}${opts.maxMiss ? `<li>❌ Sai tối đa ${opts.maxMiss} lần</li>` : ''}${opts.wind ? '<li>💨 Có gió giật: kim thăng bằng trôi nhanh hơn</li>' : ''}${opts.rain ? '<li>🌧️ Mưa, sàn trơn: đi chậm hơn</li>' : ''}${opts.snow ? '<li>🌨️ Tuyết rơi: đường trơn (đi chậm ×0.85)</li>' : ''}${opts.heat ? '<li>🥵 Nắng gắt (猛暑): mỗi ca mất thêm ❤️ −3</li>' : ''}</ul>
    <p class="lesson">⚖️ Giữ thanh thăng bằng bằng 2 nút ◀ ▶ (hoặc phím A / D) khi đang vác ống · Xem 📋 Phiếu giao việc để lấy đúng loại ống và đặt đúng ô A / B / C.</p>`,[
{label:'Bắt đầu ca →',on:()=>{
G.shift.start(opts,{player:P,foreman},{
unit:JOBS.site.unit,rankLabel:`${hudCalText(S)} · 🎖️ ${rk + 1}/10 ${ranksOf('site')[rk]}`,
onRetry:()=>{retryCost(G.S);save(G.S,storage);},
},(r)=>shiftDone(st,r));
}},
]);
dayHud(st.label);
G.camRig.snap(G.stages.site.showcase.pos,G.stages.site.showcase.look);
}
function finishDemoShift(job,day,r){
const n=typeof r?.stars==='number'?r.stars:(r?.fail?0:1);
recordStars(G.demoState,job,day,'b',n);
if(G.S&&!G.S.flags?.demo){
recordStars(G.S,job,day,'b',n);
save(G.S,storage);
}
demoScreen();
}
async function careShiftStep(st,demo=false,demoDay=0){
const S=G.S||{jobXp:0,ally:0,watch:0};
await dress(true);
setStage('care');hideNpcs();
G.mode='shift';G.activeShift=G.care;
const P=G.player;
await spawnFolk();
const nurse=await npc('yamada','care');
const opts=shiftOpts(st.data,st.hard,S);
const rk=rankOf(S.jobXp||0);
const meta={unit:JOBS.care.unit,rankLabel:demo?'🎮 Chế độ thử':`${hudCalText(S)} · 🎖️ ${rk + 1}/10 ${ranksOf('care')[rk]}`,
onRetry:()=>{if(!demo){retryCost(G.S);save(G.S,storage);}}};
const begin=()=>G.care.start(opts,{player:P,nurse,folk:G.folk},meta,(r)=>(demo?finishDemoShift('care',demoDay,r):shiftDone(st,r)));
if(demo){begin();return;}
card(`<h2>${st.hard ? '🔥 ' : ''}${esc(opts.label)}</h2>
    ${opts.jp ? `<p class="jpline">${esc(opts.jp)}</p>` : ''}
    <p>${esc(opts.vi || 'Đi tới cạnh từng cụ, nghe cụ nói gì rồi chọn việc phù hợp.')}</p>
    <ul><li>🎯 Chăm sóc ${opts.goal} lượt</li>${opts.limit ? `<li>⏱ ${opts.limit} giây</li>` : '<li>⏱ Không giới hạn giờ</li>'}${opts.maxMiss ? `<li>❌ Sai tối đa ${opts.maxMiss} lần</li>` : ''}</ul>
    <p class="lesson">👂 Đọc câu tiếng Nhật của cụ (ưu tiên cụ có ❤️ thấp, khi có 🚨 chạy lại bấm 🤲 Đỡ cụ trong 6s).<br>お腹がすいた → 🥣 Đút ăn · 口が汚れた → 🧻 Lau miệng · さみしい → 💬 Trò chuyện · 家に帰りたい → ❤️ Dỗ dành</p>`,[
{label:'Bắt đầu ca →',on:begin},
]);
dayHud(st.label);
G.camRig.snap(G.stages.care.showcase.pos,G.stages.care.showcase.look);
}
async function bentoShiftStep(st,demo=false,demoDay=0){
const S=G.S||{jobXp:0,ally:0,watch:0};
await dress(true);
setStage('bento');hideNpcs();
G.mode='shift';G.activeShift=G.bento;
const P=G.player;
const foreman=await npc('tanaka','bento');
const opts={...shiftOpts(st.data,st.hard,S),speed:st.data.speed};
const rk=rankOf(S.jobXp||0);
const meta={unit:JOBS.bento.unit,rankLabel:demo?'🎮 Chế độ thử':`${hudCalText(S)} · 🎖️ ${rk + 1}/10 ${ranksOf('bento')[rk]}`,
onRetry:()=>{if(!demo){retryCost(G.S);save(G.S,storage);}}};
const begin=()=>G.bento.start(opts,{player:P,foreman},meta,(r)=>(demo?finishDemoShift('bento',demoDay,r):shiftDone(st,r)));
if(demo){begin();return;}
card(`<h2>${st.hard ? '🔥 ' : ''}${esc(opts.label)}</h2>
    ${opts.jp ? `<p class="jpline">${esc(opts.jp)}</p>` : ''}
    <p>${esc(opts.vi || 'Đứng trước băng chuyền, nhìn biểu tượng trên khay rồi bấm đúng món khi khay vào vùng vàng.')}</p>
    <ul><li>🎯 Đóng gói ${opts.goal} hộp cơm</li>${opts.maxMiss ? `<li>❌ Sai/trôi qua tối đa ${opts.maxMiss} khay</li>` : ''}</ul>
    <p class="lesson">🍱 Phím 1 / 2 / 3 (🍗 Gà rán · 🌭 Xúc xích · 🥦 Rau) theo thứ tự trái → phải khi khay vào vùng vàng · Gặp khay lỗi bấm 4 / 🚫 Loại 不良.</p>`,[
{label:'Bắt đầu ca →',on:begin},
]);
dayHud(st.label);
G.camRig.snap(G.stages.bento.showcase.pos,G.stages.bento.showcase.look);
}
async function lotusShiftStep(st,demo=false,demoDay=0){
const S=G.S||{jobXp:0,ally:0,watch:0};
await dress(true);
setStage('lotus');hideNpcs();
G.mode='shift';G.activeShift=G.lotus;
const P=G.player;
const foreman=await npc('tanaka','lotus');
const opts=shiftOpts(st.data,st.hard,S);
G.stages.lotus.setWeather({rain:!!opts.rain,snow:!!opts.snow,wind:!!opts.wind,cold:!!(opts.cold||opts.snow)});
G.stages.lotus.setSeason?.(seasonOf(ensureCal(S)).id);
const rk=rankOf(S.jobXp||0);
const meta={unit:JOBS.lotus.unit,rankLabel:demo?'🎮 Chế độ thử':`${hudCalText(S)} · 🎖️ ${rk + 1}/10 ${ranksOf('lotus')[rk]}`,
onRetry:()=>{if(!demo){retryCost(G.S);save(G.S,storage);}}};
const begin=()=>G.lotus.start(opts,{player:P,foreman},meta,(r)=>(demo?finishDemoShift('lotus',demoDay,r):shiftDone(st,r)));
if(demo){begin();return;}
card(`<h2>${st.hard ? '🔥 ' : ''}${esc(opts.label)}</h2>
    ${opts.jp ? `<p class="jpline">${esc(opts.jp)}</p>` : ''}
    <p>${esc(opts.vi || 'Lội bùn lại gần gốc sen có vòng vàng, làm đúng các bước theo thứ tự để thu hoạch củ sen.')}</p>
    <ul><li>🎯 Đào ${opts.goal} củ sen</li>${opts.limit ? `<li>⏱ ${opts.limit} giây</li>` : '<li>⏱ Không giới hạn giờ</li>'}${opts.maxMiss ? `<li>❌ Sai tối đa ${opts.maxMiss} lần</li>` : ''}${opts.rain ? '<li>🌧️ Mưa lớn: bùn nặng chân</li>' : ''}</ul>
    <p class="lesson">🪷 Gốc có 🌿 bấm ✂️ Cắt cỏ trước → ⛏️ Đào → Giữ 💦 Xịt nước đến 80–100% rồi thả → Căn kim vùng xanh bấm 🪴 Nhổ → 🧺 Nhặt.</p>`,[
{label:'Bắt đầu ca →',on:begin},
]);
dayHud(st.label);
G.camRig.snap(G.stages.lotus.showcase.pos,G.stages.lotus.showcase.look);
}
function shiftDone(st,r){
const S=G.S,job=jobOf();
const starCount=typeof r.stars==='number'?r.stars:stars({won:!r.fail&&r.f>=1,miss:0,maxMiss:st.data.maxMiss||0,timeLeft:0,limit:0,extra:false});
const starDay=S.life?(((S.cal?.day||1)-1)%5+5)%5:S.story;
recordStars(S,job,starDay,st.hard?'b':'a',starCount);
const res=shiftEnd(S,r,st.hard);
afterShift(S,job,curWeather(S));
const isHeat=!!(st.data?.heat||curWeather(S)==='heat');
if(isHeat){
applyFx(S,{health:-3});
res.deltas.push(['health',-3]);
setTimeout(()=>toast('🥵 水分補給！','Uống nước kẻo say nắng (❤️ −3)',4.5),350);
}
save(S,storage);
G.mode='talk';
const P=G.player;P.play('idle');
if(st.hard)G.overhead.say(P,r.fail?'悔しい… — Tiếc quá…':'やった！ — Làm được rồi!',3);
const rk=rankOf(S.jobXp);
const linesHtml=(r.starLines||[]).map((l)=>`<div class="star-line${l.ok ? ' ok' : ''}">${esc(l.text)}</div>`).join('');
const starsBox=`<div class="stars-box"><div class="stars-row">${formatStars(starCount)}</div>${linesHtml ? `<div class="stars-lines">${linesHtml}</div>` : ''}</div>`;
card(`<h2>${res.title}</h2>
    <p>Xong ${r.done}/${st.data.goal} ${esc(JOBS[job].unit)}.</p>
    ${starsBox}
    <div class="deltas">${deltaChips(res.deltas)}<span class="delta">🛠️ Tay nghề +${res.jobXp}</span></div>
    ${isHeat ? '<p class="lesson">🥵 <b>水分補給！</b> Uống nước kẻo say nắng (trời nắng gắt làm mất thêm ❤️ −3).</p>' : ''}
    ${res.rankUp ? `<p class="lesson">🎖️ Lên mốc ${res.rankUp + 1}/10: ${esc(ranksOf(job)[res.rankUp])}<br>Quản lý: 「任せるよ！」 “Từ giờ việc này giao cho em.” · 💰 Phụ cấp tay nghề: +${yen(rankPay(res.rankUp + 1))}/tháng</p>` : ''}
    <p style="color:var(--ink-dim);font-size:12.5px">Tay nghề ${S.jobXp} · Mốc ${rk + 1}/10</p>`,[
{label:'Tiếp →',on:()=>finishStep()},
]);
$('stats').innerHTML=statsHtml();
}
async function sleepStep(st){
G.mode='evening';
await dress(false);
const dayIdx=G.S.life?(((G.S.cal?.day||1)-1)%5+5)%5:G.S.story;
const after=st?.data?.after||daysOf(jobOf())[dayIdx]?.story?.after;
G.evening.home({
S:G.S,stages:G.stages,who:{player:G.player},setStage,
storage,
dayLabel:hudCalText(G.S,st.label),
onMarket:(ev)=>openMarket(ev,()=>{hideNpcs();G.mode='evening';G.evening.resumeFromMarket();}),
onSleep:()=>{
const d=sleep(G.S);
toast('😴 Ngủ một giấc · おやすみなさい',d.map(([k,v])=>`${k === 'health' ? '❤️' : '🧠'} +${v}`).join(' · '),4);
hideNpcs();
finishStep();
},
});
if(after)setTimeout(()=>G.mode==='evening'&&G.evening.tip('今日の一言',after,6),900);
}
let shrineP=null;
function ensureShrine(){
if(!shrineP){
shrineP=buildShrine().then((sh)=>{
G.stages.shrine=sh;
return sh;
});
}
return shrineP;
}
async function dayOffStep(demo=false){
if(!G.stages.shrine){toast('⛩️ Đang vào đền さくら神社…','日曜日 · Ngày nghỉ');await ensureShrine();}
hideNpcs();
await dress(false);
const[hung,hoa]=[await npc('hung','shrine'),await npc('hoa','shrine')];
await spawnWorkers();
G.mode='dayoff';
G.dayoff.start({
S:G.S,
stages:G.stages,
who:{player:G.player,hung,hoa},
setStage,
storage:demo?null:storage,
demo,
onEnd:()=>weekEnd(),
});
}
function weekEnd(){
const S=G.S,e=weekEval(S);
if(e.bonus&&!S.flags.weekBonus){applyFx(S,{money:e.bonus});S.flags.weekBonus=true;if(!S.flags.demo)save(S,storage);}
setStage('town');G.stages.town.setTime('day');hideNpcs();
G.mode='talk';
dayHud('Đánh giá tuần đầu');
$('day-label').textContent=`📋 Tuần đầu ở ${JOBS[S.job].place.toLowerCase()}`;
const btns=S.flags.demo
?[{label:'← Về chế độ thử',on:demoScreen},{label:'Về màn hình chính',cls:'ghost',on:titleScreen}]
:[
{label:'▶ Tiếp tục cuộc sống ở Nhật',on:()=>{
S.life=true;
S.cal={year:1,season:0,day:8};
S.sStep=0;
S.lDay={};
save(S,storage);
toast('🌸 Bước sang tuần mới!',calLabel(S.cal,curWeather(S)));
runStep();
}},
{label:'🏠 Về màn hình chính',cls:'ghost',on:titleScreen},
{label:'Chơi lại từ đầu',cls:'ghost',on:()=>{clearSave(storage);creatorScreen();}},
];
card(`<h2>📋 Tuần đầu ở ${esc(JOBS[S.job].place)}</h2>
    <div class="big">${e.grade.split(' ')[0]}</div>
    <h2 style="text-align:center">${esc(e.grade.split(' ').slice(1).join(' '))}</h2>
    <p class="jpline" style="text-align:center">「${esc(e.jp)}」</p>
    <ul><li>🏆 Thử thách vượt qua: ${e.win}/5</li><li>🤝 Người sẵn sàng giúp bạn: ${e.ally}</li><li>👀 Lần bị để ý: ${e.watch}</li><li>${esc(dayOffSummary(S))}</li>${e.bonus ? `<li>💰 Thưởng: +${yen(e.bonus)}</li>` : ''}</ul>
    <p class="lesson">🌸 Bạn đã vượt qua tuần đầu tiên! Bấm <b>▶ Tiếp tục cuộc sống ở Nhật</b> để bước vào nhịp sống 4 mùa (Xuân · Hạ · Thu · Đông, nhận lương định kỳ ngày 10/19/28, trả nợ, tăng ca thứ Bảy và lễ hội quanh năm).</p>`,btns);
}
const CREDITS=[
['Máy bán nước','Japanese Vending Machine (Game Ready)','erlangga da','ad6fbf4844504b4f8321a990fcc4d3bf','CC BY 4.0'],
['Đèn lồng giấy','Japanese Paper Lantern','WIsEman_Tavern','f993239d99304992aef9701af1f31a3c','CC BY 4.0'],
['Ký túc xá','PSX Japanese Apartment','Shazly','0a12452df55c4e3687759732c81a8437','CC BY 4.0'],
['Konbini','Mini mart','Pasha','a8d45543eaf24658bde28cf6dda49e22','Sketchfab Free Standard'],
['Toà nhà đang xây','Construction','Stas Gunko','84e65d542fa9456593b10ffb0d0802ec','CC BY 4.0'],
['Đèn đường','Stylized Traditional Japanese Street Lamp','dayuchuu','64eab2d23d824420abd35c53a40c3d58','CC BY 4.0'],
['Nhà dân','Japanese Residential Home 01, 02, 03','Morrissey Alexander','d690f83d8e8d48e6a532bebe84901595','CC BY 4.0'],
['Chung cư xa','LOW POLY - ASIAN TOWER BLOCK','Colin.Greenall','694adf5094fa41f99a245ed822293f47','CC BY 4.0'],
['Máy xúc','Excavator','Anton Krupnov','3c4d505819294b4982a67218fa8baaa2','CC BY 4.0'],
['Sân ga','Nazo no eki (Mystery Station)','Thomas Nguyen','6cbd6ce6354f44a4b6517e8176d8741b','CC BY 4.0'],
['Cổng soát vé','Animated Ticket Gate','€r!c','19a605237de941edbd9fe829ca0cfedf','CC BY 4.0'],
['Ghế sân ga','Japan Train Station Bench','ditovirnantio','e23d79c1014a431bb913d15fc395b4f0','CC BY 4.0'],
['Băng chuyền','Conveyor Belt','Cianon','55f0d0f9b3384ea4b49cfc8aef97dcf9','CC BY 4.0'],
['Hộp cơm bento','Low Poly Bento 弁当','SaltySaveState','f27d78a4526a4fe685b5ae2f75f60c11','CC BY 4.0'],
['Lá sen','Water lily','Mariia Melnik','04dd636204cd4b0db45a4fc82efa4385','CC BY 4.0'],
['Củ sen','Scan Lotus Root-Freepoly.org','Freepoly.org','f4fa4b58b6514440bdc2d90817a42083','CC BY 4.0'],
['Túi rác','Garbage bags','DJMaesen','9e769751ac3a4b6a893a5719349b78ca','CC BY 4.0'],
['Kệ siêu thị','Low Poly Store Shelves and Supermarket Rack Pack','Ankitimation','3c5ec087909140c2a9483bb9bb838a25','CC BY 4.0'],
['Đồ siêu thị','Super market asset [low poly] [pixel]','Kanna-Nakajima','9d6158220c894c2a8e28e48178f72a6c','CC BY 4.0'],
['Bếp ga','Gas Stove','Xin','acf506540b6a4c25b6836d6e12aac57b','CC BY 4.0'],
['Cổng torii','Japanese Torii gate Game Asset','Bazylonator','e12d2fa1b2b94928b8b87cb7787e2462','CC BY 4.0'],
['Đèn đá','Japanese Stone Lantern','Sahir Virmani','e0417d1e05984727a50f9ab1451d162d','CC BY 4.0'],
['Đền','Japanese shrine','GreenG','56baeb7b13ba4238a2f54c363e7a3e0b','CC BY 4.0'],
['Futon','Japanese futon/bed','nicolas_solo','0d5590d1d2184aa98797c3d6382afd7e','CC BY 4.0'],
['Bộ ấm trà','Japanese Tea Set','Geraldo Pratama Wahyu Teddy','99c0bcbb59fa4efebbb918df747e86a5','CC BY 4.0'],
['Khăn','Folded Towel','Nicothin','c5f9e72edf7d4b5eaa2ec9b95c3b099d','CC BY 4.0'],
['Máy giặt','[Stylized] Washing machine','metrosp','5ee9aa73c0344183ac2b14355b32e5ed','CC BY 4.0'],
['Giá phơi đồ','Drying Rack FREE Low Poly','LadyLionStudios','b2bcc6bd61d24d4b843fa78f75a4a8ca','CC BY 4.0'],
['Nồi cơm điện','Rice Cooker','AyunFat','3f70c8b7cf704bdb952e09c0d5f5ab65','CC BY 4.0'],
['Nồi','Kitchen Cooking Pot','Replexx','c2acd4b4956c4a04a7bd7402bf918743','CC BY 4.0'],
['Tòa thị chính','Modern Building - Gallery - Office','cjmitchell','5546323923cf4b539071809d87a3e3b8','CC BY 4.0'],
['Bưu điện','Japanese Store','Valentin.Gonzalez','736b4ce139584ce6a8c48da118684b81','CC BY 4.0'],
['Phòng khám, nhà thuốc','Old Japanese Store - Lowpoly','Fridqeir','baa1a12ed0984143adde52b5e165e288','CC BY 4.0'],
['Xe đạp','Low Poly Bicycles','EdwiixGG','c256e970e2874ad0ac04dcef730863af','CC BY 4.0'],
['Xe tải nhỏ','Simple Kei Truck','Spookyghostboo','fb477a6082c5442ca060dfcdf8eae928','CC BY 4.0'],
['Hàng rào cây','Shrub tiles pack (3 vars, seamless)','LOLIPOP','ce2fce219f634f328abc6280b2409613','CC BY 4.0'],
['Gương cầu lồi','Blind spot traffic mirror','Insane Ninja','6b7baf381f6c45ef8d92411e0467492b','CC BY 4.0'],
['Biển 止まれ','Japanese Street Props','AlienKat','fc52f80909ba466c8b786bb2dada5dab','CC BY 4.0'],
['Bồn rửa inox','Low poly commercial sink','christian','2d0cade455614fd989b2e81878fd7764','CC BY 4.0'],
['Khay inox đựng món','Gastronorm_Basic_1_2','MPS Porcellane di Saronno','9fec684962424c8186b075dd99f9bef6','CC BY 4.0'],
['Gà rán karaage (xưởng cơm hộp)','Chicken Nugget fried chicken','noemyssima7','55aaf01b3fa648c4a848029b63fa7948','CC BY 4.0'],
['Xúc xích (xưởng cơm hộp)','Sausages','Evanz','4402d5db61a44feb840ecf48692729c1','CC BY 4.0'],
['Bông cải xanh (xưởng cơm hộp)','Broccoli','meerschaumdigital','0fb58ca488b64298ab8af6f0372e66b9','CC BY 4.0'],
['Kẹp gắp inox','metal tongs','kosicky.jozef2308','86628581455a4c5d85faae2511076afe','CC BY 4.0'],
['Tay đeo găng (đổi màu, đổi tư thế)','Hand With Gloves','teenjust500','5a6a434b8ec943ffacc581358781eecb','CC BY 4.0'],
];
function creditsScreen(){
hideAll();
const rows=CREDITS.map(([what,name,by,uid,lic])=>`<li><b>${esc(what)}</b>: <a href="https://sketchfab.com/3d-models/${uid}" target="_blank" rel="noopener">${esc(name)}</a> — ${esc(by)} <small>(${esc(lic)})</small></li>`).join('');
card(`<h2>📜 Ghi công mô hình 3D</h2>
    <p>Các mô hình dưới đây lấy từ Sketchfab (giấy phép <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> hoặc Sketchfab Free Standard):</p>
    <ul class="credits">${rows}</ul>
    <p class="lesson">Các mô hình khác: thư viện cộng đồng Meshy (CC0) và mô hình tạo riêng cho game.</p>`,[
{label:'← Quay lại',cls:'ghost',on:titleScreen},
]);
}
function demoScreen(){
hideAll();G.demoJob=null;
const saved=(!G.S||G.S.flags?.demo)?load(storage):G.S;
const starStr=(job,i)=>{
const best=Math.max(getStars(saved,job,i,'b'),getStars(G.S,job,i,'b'),getStars(G.demoState,job,i,'b'));
return` · ${formatStars(best)}`;
};
const name=(d)=>d.b.label.replace(/^Ca chiều: |^Thử thách cuối tuần: /,'');
const rows=[
{label:'🎌 Ngày nghỉ ở đền',on:()=>demoDayOff()},
{label:'🗑️ Phân loại rác',on:()=>demoTrash()},
{label:'🛒 Siêu thị (20:05)',on:()=>demoMarket()},
{label:'🍳 Nấu cơm',on:()=>demoCook()},
...daysOf('site').map((d,i)=>({label:`👷 Ngày ${i + 1}: ${name(d)}${d.b.wind ? ' 💨' : ''}${d.b.rain ? ' 🌧️' : ''}${starStr('site', i)}`,on:()=>demoShift('site',i)})),
...daysOf('care').map((d,i)=>({label:`👵 Ngày ${i + 1}: ${name(d)}${starStr('care', i)}`,on:()=>demoShift('care',i)})),
...daysOf('bento').map((d,i)=>({label:`🍱 Ngày ${i + 1}: ${name(d)}${starStr('bento', i)}`,on:()=>demoShift('bento',i)})),
...daysOf('lotus').map((d,i)=>({label:`🪷 Ngày ${i + 1}: ${name(d)}${d.b.rain ? ' 🌧️' : ''}${starStr('lotus', i)}`,on:()=>demoShift('lotus',i)})),
];
card('<h2>🎮 Thử ca làm 3D</h2><p>🎌 Ngày nghỉ ở đền · 🗑️ Phân loại rác · 🛒 Siêu thị · 🍳 Nấu cơm · 👷 Công trường · 👵 Viện dưỡng lão · 🍱 Xưởng cơm hộp · 🪷 Ruộng sen · không tính điểm.</p>',[...rows,{label:'← Quay lại',cls:'ghost',on:titleScreen}]);
}
async function demoDayOff(){
hideAll();hideNpcs();
const demoS=newState({name:G.draft.name||'Bạn',job:'site',look:{gender:G.draft.gender,outfit:G.draft.outfit,colors:{...G.draft.colors}}});
demoS.story=DAYS;
demoS.flags.demo=true;
G.S=demoS;
await dayOffStep(true);
}
async function demoMarket(){
hideAll();hideNpcs();
await dress(false);
if(!G.stages.market){toast('🛒 Đang vào siêu thị…','スーパー さくら');await ensureMarket();}
const clerk=await npc('clerk','market');
const demoS=newState({name:G.draft.name||'Bạn',job:'site',look:{gender:G.draft.gender,outfit:G.draft.outfit,colors:{...G.draft.colors}}});
const ev=createEvening('room');
ev.min=20*60+5;
G.mode='market';
G.market.start({
S:demoS,
ev,
stage:G.stages.market,
who:{player:G.player,clerk},
setStage,
dayLabel:'🎮 Thử nhanh · 🛒 Siêu thị (20:05 · 半額)',
onExit:()=>{hideNpcs();demoScreen();},
});
}
async function demoCook(){
hideAll();hideNpcs();
await dress(false);
const demoS=newState({name:G.draft.name||'Bạn',job:'site',look:{gender:G.draft.gender,outfit:G.draft.outfit,colors:{...G.draft.colors}}});
demoS.pantry=['eggs','eggplant','meat','cucumber','banana','apple'];
G.mode='evening';
G.evening.ev=null;
G.evening.home({
S:demoS,
stages:G.stages,
who:{player:G.player},
setStage,
demoCook:true,
dayLabel:'🎮 Thử nhanh · 🍳 Nấu cơm ký túc xá',
onSleep:()=>demoScreen(),
});
}
async function demoTrash(){
hideAll();hideNpcs();
await dress(false);
G.mode='morning';
const[suzuki,hung]=[await npc('suzuki','site'),await npc('hung','site')];
await spawnWorkers();
const demoS=newState({name:G.draft.name||'Bạn',job:'site',look:{gender:G.draft.gender,outfit:G.draft.outfit,colors:{...G.draft.colors}}});
demoS.story=0;
G.morning.start({
S:demoS,
stages:G.stages,
who:{player:G.player,suzuki,hung},
commute:'walk',
demoTrash:true,
setStage,
dayLabel:'🎮 Thử nhanh · 🗑️ Phân loại rác (Ngày 1)',
onEnd:()=>demoScreen(),
});
}
async function demoShift(job,i){
G.demoJob=job;
const W=daysOf(job)[i].b;
if(job==='care')return careShiftStep({data:W,hard:true,label:W.label},true,i);
if(job==='bento')return bentoShiftStep({data:W,hard:true,label:W.label},true,i);
if(job==='lotus')return lotusShiftStep({data:W,hard:true,label:W.label},true,i);
await dress(true);
setStage('site');hideNpcs();G.mode='shift';G.activeShift=G.shift;
G.player.look({...G.draft.colors,...WORK_COLORS});
await spawnWorkers();
const foreman=await npc('tanaka','site');
G.stages.site.ring.visible=true;G.stages.site.setFloors(3);
G.camRig.snap(G.stages.site.showcase.pos,G.stages.site.showcase.look);
const opts=shiftOpts(W,true,{ally:0,watch:0});
G.shift.start(opts,{player:G.player,foreman},{unit:JOBS.site.unit,rankLabel:'🎮 Chế độ thử'},(r)=>finishDemoShift('site',i,r));
}
const clock=new THREE.Clock();
const vPos=new THREE.Vector3(),vLook=new THREE.Vector3();
function frame(){
requestAnimationFrame(frame);
const dt=Math.min(clock.getDelta(),0.05),t=(G.t+=dt);
resize();
const st=G.stage,P=G.player;
if(G.mode==='title'){
const a=t*0.08;
camera.fov=isPortrait()?52:42;camera.updateProjectionMatrix();
vPos.set(Math.sin(a)*9,4.2,4+Math.cos(a)*9);vLook.set(0,1.4,-1);
G.camRig.to(vPos,vLook,dt,2);
P.yaw=Math.sin(t*0.4)*0.6;
}else if(G.mode==='creator'){
G.yaw+=G.spin*dt;P.yaw=G.yaw;
const b=P.holder.position,portrait=isPortrait();
camera.fov=portrait?48:38;camera.updateProjectionMatrix();
if(portrait){vPos.set(b.x,b.y+1.1,b.z+6.6);vLook.set(b.x,b.y-0.75,b.z);}
else{vPos.set(b.x+1.2,b.y+1.2,b.z+4.6);vLook.set(b.x+1.2,b.y+0.8,b.z);}
G.camRig.to(vPos,vLook,dt,6);
}else if(G.mode==='talk'&&G.talkPair&&G.talkPair.N){
const a=G.talkPair.P.holder.position,b=G.talkPair.N.holder.position,portrait=isPortrait();
camera.fov=portrait?50:40;camera.updateProjectionMatrix();
vLook.set((a.x+b.x)/2,a.y+(portrait?0.4:1.0),(a.z+b.z)/2);
if(G.talkCam==='street'){
if(!portrait)vLook.x-=1.2;
vPos.set(vLook.x+0.8,a.y+2.2,vLook.z-(portrait?6.2:4.6));
}else if(G.talkCam==='deck'){
if(!portrait)vLook.z-=1.2;
vPos.set(vLook.x+(portrait?6.2:4.6),a.y+2.1,vLook.z+0.9);
}
else vPos.set(vLook.x-1.2,a.y+2.3,vLook.z+(portrait?6.4:4.8));
G.camRig.to(vPos,vLook,dt,4);
}else if(G.mode==='talk'){
const a=P.holder.position;
vLook.set(a.x,a.y+0.6,a.z);vPos.set(a.x,a.y+2.4,a.z+6);
G.camRig.to(vPos,vLook,dt,4);
}
if(G.mode==='shift')(G.activeShift||G.shift).update(dt,t);
if(G.mode==='morning')G.morning.update(dt,t);
if(G.mode==='evening')G.evening.update(dt,t);
if(G.mode==='market')G.market.update(dt,t);
if(G.mode==='dayoff')G.dayoff.update(dt,t);
if(G.stageId==='dorm')st.setDrying?.(!!G.S?.home?.drying);
if((musicT-=dt)<=0){
musicT=0.5;
const atWork=G.mode==='shift'||(G.mode==='talk'&&(G.talkCam==='deck'||!!G.player?.helmet?.visible));
music.set(pickTrack({mode:G.mode,stageId:G.stageId,season:G.S?.life&&G.S?.cal?G.S.cal.season:0,festival:G.stages.shrine?.festival,atWork}));
}
if(G.streetCrowd){
const onStreet=G.stageId==='site'&&(G.mode==='morning'||G.mode==='evening'||G.mode==='dayoff');
G.streetCrowd.setVisible(onStreet);
if(onStreet)G.streetCrowd.update(dt,P.holder.position);
}
if(G.stationCrowd){
const onStation=G.stageId==='station'&&G.mode==='morning';
G.stationCrowd.setVisible(onStation);
if(onStation)G.stationCrowd.update(dt);
}
if(G.stageId==='site'){updateWorkers(dt);for(const w of G.workers)w.update(dt);}
P.update(dt);
for(const ch of Object.values(G.npcs))if(ch.holder.parent)ch.update(dt);
if(G.stageId==='care')for(const ch of G.folk)ch.update(dt);
st.update(dt,t,P.holder.position);
st.sun.userData.follow(P.holder.position);
renderer.render(st.scene,camera);
G.overhead.update(dt);
}
boot();
