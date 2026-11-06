/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{CARE,NEEDS,createCare,nearestNeed,act,useHint,step,careFraction,careExtra}from'../core/care_rules.js';
import{starDetails}from'../core/stars.js';
import{CARE_ROOM}from'../gfx/care.js';
import{camera,isPortrait}from'../gfx/stage.js';
import{$,show,card,esc}from'../ui/ui.js';
const ACTIONS=[
{id:'feed',icon:'🥣',label:'Đút ăn',jp:'食事介助'},
{id:'wipe',icon:'🧻',label:'Lau miệng',jp:'口を拭く'},
{id:'talk',icon:'💬',label:'Trò chuyện',jp:'話す'},
{id:'comfort',icon:'❤️',label:'Dỗ dành',jp:'なだめる'},
{id:'support',icon:'🤲',label:'Đỡ cụ',jp:'支える'},
{id:'hint',icon:'💡',label:'Gợi ý',jp:'ヒント'},
];
const WALK=1.9,NEAR_TAG=4.2,SEAT=0.52;
const ANIM=1.6;
const STAND=0.96;
const REPLY={
feed:'おいしいねえ — Ngon quá cháu ạ',
wipe:'さっぱりしたよ — Sạch sẽ rồi',
talk:'そうだねえ、いい天気だ — Ừ, trời đẹp thật',
comfort:'ありがとう、安心したよ — Cảm ơn cháu, bà yên tâm rồi',
};
const _a=new THREE.Vector3(),_b=new THREE.Vector3();
function makeBowl(){
const g=new THREE.Group();
const prof=[[0,0],[0.034,0],[0.042,0.006],[0.052,0.022],[0.057,0.046],[0.059,0.05]].map(([x,y])=>new THREE.Vector2(x,y));
g.add(new THREE.Mesh(new THREE.LatheGeometry(prof,28),new THREE.MeshStandardMaterial({color:'#fbfaf6',roughness:0.35,side:THREE.DoubleSide})));
const rim=new THREE.Mesh(new THREE.TorusGeometry(0.058,0.0035,6,28),new THREE.MeshStandardMaterial({color:'#8fb3d9',roughness:0.4}));
rim.rotation.x=Math.PI/2;rim.position.y=0.049;g.add(rim);
const okayu=new THREE.Mesh(new THREE.CircleGeometry(0.05,24),new THREE.MeshStandardMaterial({color:'#f1e7cc',roughness:0.9}));
okayu.rotation.x=-Math.PI/2;okayu.position.y=0.038;g.add(okayu);
return g;
}
function makeSpoon(){
const g=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:'#d9dde2',metalness:0.85,roughness:0.25});
const handle=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.004,0.11),steel);handle.position.z=-0.03;g.add(handle);
const cup=new THREE.Mesh(new THREE.SphereGeometry(1,14,8),steel);cup.scale.set(0.017,0.006,0.025);cup.position.z=0.045;g.add(cup);
return g;
}
function heartTexture(){
const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
g.font='52px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('💗',32,36);
const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function alertUrgent(){
try{navigator.vibrate?.([90,50,90]);}catch{}
try{
const Ctx=window.AudioContext||window.webkitAudioContext;
if(!Ctx)return;
const ctx=alertUrgent.ctx||(alertUrgent.ctx=new Ctx());
if(ctx.state==='suspended')ctx.resume().catch(()=>{});
const now=ctx.currentTime;
for(const[f,t0]of[[660,0],[880,0.12]]){
const osc=ctx.createOscillator(),g=ctx.createGain();
osc.type='triangle';
osc.frequency.setValueAtTime(f,now+t0);
g.gain.setValueAtTime(0.08,now+t0);
g.gain.exponentialRampToValueAtTime(0.001,now+t0+0.1);
osc.connect(g);g.connect(ctx.destination);
osc.start(now+t0);osc.stop(now+t0+0.1);
}
}catch{}
}
function hookOverhead(overhead,fn){
if(!overhead)return;
if(!overhead._postHooks){
overhead._postHooks=[];
const orig=overhead.update.bind(overhead);
overhead.update=(dt)=>{
orig(dt);
for(const h of overhead._postHooks)h(dt);
};
}
overhead._postHooks.push(fn);
}
export class CareShift{
constructor({stage,controls,overhead,camRig}){
Object.assign(this,{stage,controls,overhead,camRig});
this.dir=new THREE.Vector3();this.camPos=new THREE.Vector3();this.camLook=new THREE.Vector3();this.tmp=new THREE.Vector3();
this.active=false;
this.btn={};
this.mine=ACTIONS.map((a)=>{
const b=document.createElement('button');b.type='button';b.className='act cream';b.dataset.id=a.id;
b.innerHTML=`<span class="i">${a.icon}</span><span class="l">${a.label}</span>`;b.title=a.jp;
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.action(a.id);});
this.btn[a.id]=b;
return b;
});
this.spots=CARE_ROOM.folk.map(([x,z])=>({x,z}));
this.bowl=makeBowl();this.spoon=makeSpoon();
this.towel=stage.towel?stage.towel.scene.clone(true):new THREE.Mesh(new THREE.BoxGeometry(0.1,0.02,0.16),new THREE.MeshStandardMaterial({color:'#8c9de0'}));
this.towel.scale.setScalar(0.5);
this.hearts=[];
for(let k=0;k<4;k++){
const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:heartTexture(),transparent:true,depthWrite:false}));
sp.scale.setScalar(0.16);sp.visible=false;this.hearts.push(sp);
}
$('sh-quit').addEventListener('click',()=>this.active&&this.askQuit());
addEventListener('resize',()=>{if(this.active)this.placeHud();});
hookOverhead(this.overhead,()=>{if(this.active)this.clampOverhead();});
addEventListener('keydown',(e)=>{
if(!this.active)return;
const k={
Digit1:'feed',Space:'feed',Digit2:'wipe',Digit3:'talk',Digit4:'comfort',
Digit5:'support',KeyE:'support',Digit6:'hint',KeyH:'hint',
}[e.code];
if(k){e.preventDefault();this.action(k);}
});
}
start(opts,who,meta,onEnd){
Object.assign(this,{opts,who,meta,onEnd});
this.st=createCare(opts,who.folk.length);
const p=who.player;
p.unpinAll();p.holder.rotation.x=0;p.bendTo=0;p.reachTo=0;if(p.helmet)p.helmet.visible=false;
p.holder.position.set(CARE_ROOM.start.x,0,CARE_ROOM.start.z);p.yaw=CARE_ROOM.start.yaw;p.play('idle');
who.nurse.holder.position.set(CARE_ROOM.nurse.x,0,CARE_ROOM.nurse.z);who.nurse.yaw=Math.PI/2;who.nurse.play('idle');
seatFolk(who.folk);
const box=$('acts');if(!this.saved)this.saved=[...box.children];box.replaceChildren(...this.mine);
show('dayhud',false);show('shifthud');show('sh-gust',false);show('sh-ticket',false);show('sh-bal',false);show('sh-gauge',false);
$('sh-place').querySelector('span').textContent='Viện dưỡng lão · 食堂';
$('sh-rank').textContent=meta.rankLabel;
this.tags=who.folk.map((f)=>{const it=this.overhead.tag(f,'',false,2.15);it.el.classList.add('care');it.text='';return it;});
this.controls.reset({yaw:0,pitch:0.42,groundY:0,yawLimit:[-1.2,1.2]});
this.controls.enabled=true;this.controls.onTap=null;
this.intro=2.6;this.active=true;this.paused=false;this.bestD=Infinity;this.stuckT=0;this.endT=-1;
this.anim=null;this.floats=[];this.close=0;
for(const h of this.hearts){if(!h.parent)this.stage.scene.add(h);h.visible=false;}
const hintMsg=this.st.hintDelay<0
?'Chỉ hiện câu tiếng Nhật — bấm 💡 Gợi ý nếu cần dịch (mất ★ thứ 2)'
:this.st.hintDelay>0
?`Câu tiếng Nhật hiện trước, ${this.st.hintDelay}s sau mới hiện nghĩa Việt. Ưu tiên cụ có ❤️ thấp!`
:'Đi tới cạnh các cụ, đọc câu tiếng Nhật rồi chọn việc phù hợp';
this.tip('お手伝いします',hintMsg,7);
this.overhead.say(who.nurse,'敬語を忘れないでね。 — Nhớ dùng kính ngữ nhé.',5);
this.camRig.init=false;
this.hud();
}
stop(){
this.active=false;this.controls.enabled=false;
$('acts').classList.remove('many');
if(this.saved){$('acts').replaceChildren(...this.saved);this.saved=null;}
for(const it of this.tags||[]){it.el.remove();const i=this.overhead.items.indexOf(it);if(i>=0)this.overhead.items.splice(i,1);}
this.tags=[];
if(this.who&&this.who.folk)seatFolk(this.who.folk);
show('shifthud',false);show('sh-tip',false);
if(this.anim)this.endAnim();
for(const f of this.floats||[])this.dropFloat(f);
this.floats=[];
this.who.player.bendTo=0;
this.who.player.reachTo=0;
}
tip(jp,vi,sec=6.5){
const t=$('sh-tip');t.querySelector('b').textContent=jp;t.querySelector('span').textContent=vi;
t.hidden=false;clearTimeout(this.tipT);this.tipT=setTimeout(()=>{t.hidden=true;},sec*1000);
this.placeHud();
}
hud(){
const s=this.st;
const sep=s.urgent?' ·':' · ';
let txt=s.urgent?`👵 ${s.count}/${s.goal}`:`👵 ${s.count}/${s.goal} lượt`;
if(s.limit)txt+=`${sep}⏱${Math.ceil(s.time)}s`;
if(s.maxMiss)txt+=`${sep}❌${s.miss}/${s.maxMiss}`;else if(s.miss)txt+=`${sep}❌${s.miss}`;
if(s.urgent)txt+=`${sep}🚨${Math.ceil(s.urgent.time)}s`;
const g=$('sh-goal');if(g.textContent!==txt)g.textContent=txt;
g.classList.toggle('warn',!!(s.urgent||(s.limit&&s.time<10)));
const showSupport=!!(s.urgent||s.urgentMax>0);
const showHint=s.hintDelay!==0;
this.btn.support.hidden=!showSupport;
this.btn.support.classList.toggle('hot',!!s.urgent);
this.btn.hint.hidden=!showHint;
$('acts').classList.toggle('many',showSupport||showHint);
this.placeHud();
}
placeHud(){
const hud=$('shifthud');
if(!hud||hud.hidden)return;
const H=hud.getBoundingClientRect();
if(!H.width)return;
const imp=(el,k,v)=>{if(el&&el.style.getPropertyValue(k)!==v)el.style.setProperty(k,v,'important');};
const vis=(el)=>el&&!el.hidden&&getComputedStyle(el).display!=='none';
const rank=$('sh-rank'),bars=$('sh-bars'),chips=$('sh-chips'),ticket=$('sh-ticket'),tip=$('sh-tip');
const L=Math.max(12,rank?(rank.getBoundingClientRect().left-H.left||12):12);
let y=0;
for(const el of[hud.querySelector('.top'),$('btn-menu'),$('btn-phone')]){
if(!el||el.hidden)continue;
const r=el.getBoundingClientRect();
if(r.height)y=Math.max(y,r.bottom-H.top);
}
y=Math.round(y+6);
const W=H.width,rankOn=vis(rank)&&rank.textContent.trim(),barsOn=vis(bars);
const rw=rankOn?rank.scrollWidth:0,bw=barsOn?bars.offsetWidth:0;
const inline=!rankOn||!barsOn||L+rw+8+bw+L<=W;
let bottom=y;
if(rankOn){
imp(rank,'top',y+'px');
imp(rank,'max-width',(inline&&barsOn?W-2*L-bw-8:W-2*L)+'px');
bottom=Math.max(bottom,y+rank.offsetHeight);
}
if(barsOn){
const by=inline?y:bottom+5;
imp(bars,'top',by+'px');
if(inline){imp(bars,'left','auto');imp(bars,'right',L+'px');}
else{imp(bars,'right','auto');imp(bars,'left',L+'px');}
bottom=Math.max(bottom,by+bars.offsetHeight);
}
let low=bottom;
for(const el of[chips,ticket]){
if(!vis(el))continue;
imp(el,'top',(bottom+6)+'px');
if(el===chips)imp(el,'max-width',(vis(ticket)?W-2*L-ticket.offsetWidth-8:W-2*L)+'px');
low=Math.max(low,bottom+6+el.offsetHeight);
}
if(vis(tip)){
imp(tip,'top',(low+6)+'px');
low=Math.max(low,low+6+tip.offsetHeight);
}
const place=$('sh-place');
if(vis(place))imp(place,'top',(low+6)+'px');
}
clampOverhead(){
if(!this.overhead||!this.overhead.items)return;
const W=window.innerWidth,H=window.innerHeight;
if(!W||!H)return;
const vis=(el)=>el&&!el.hidden&&getComputedStyle(el).display!=='none';
const obstacles=[];
let minY=10;
for(const el of[document.querySelector('#shifthud .top'),$('btn-menu'),$('btn-phone')]){
if(!vis(el))continue;
const r=el.getBoundingClientRect();
if(r.width&&r.height){
minY=Math.max(minY,Math.ceil(r.bottom+6));
obstacles.push({l:r.left,t:r.top,r:r.right,b:r.bottom});
}
}
for(const el of[$('sh-rank'),$('sh-bars'),$('sh-tip'),$('joy'),$('acts'),$('toast')]){
if(!vis(el))continue;
const r=el.getBoundingClientRect();
if(r.width&&r.height)obstacles.push({l:r.left,t:r.top,r:r.right,b:r.bottom});
}
const placed=[];
const hits=(l,t,r,b,pad=4)=>{
for(const o of obstacles){
if(r+pad>o.l&&l-pad<o.r&&b+pad>o.t&&t-pad<o.b)return true;
}
for(const p of placed){
if(r+pad>p.l&&l-pad<p.r&&b+pad>p.t&&t-pad<p.b)return true;
}
return false;
};
const overlapArea=(l,t,r,b)=>{
let area=0;
for(const o of obstacles){
const ox=Math.max(0,Math.min(r,o.r)-Math.max(l,o.l));
const oy=Math.max(0,Math.min(b,o.b)-Math.max(t,o.t));
area+=ox*oy;
}
for(const p of placed){
const ox=Math.max(0,Math.min(r,p.r)-Math.max(l,p.l));
const oy=Math.max(0,Math.min(b,p.b)-Math.max(t,p.t));
area+=ox*oy*2;
}
return area;
};
const visItems=[];
for(let i=this.overhead.items.length-1;i>=0;i--){
const it=this.overhead.items[i];
if(!it||!it.el||it.el.hidden||getComputedStyle(it.el).display==='none')continue;
visItems.push(it);
}
visItems.sort((a,b)=>{
const pa=a.el.classList.contains('urgent')?0:a.kind==='bubble'?1:(a.text&&a.text.length>4)?2:3;
const pb=b.el.classList.contains('urgent')?0:b.kind==='bubble'?1:(b.text&&b.text.length>4)?2:3;
return pa-pb;
});
for(const it of visItems){
const rect=it.el.getBoundingClientRect();
if(!rect.width||!rect.height)continue;
const w=Math.ceil(rect.width),h=Math.ceil(rect.height);
const maxX=Math.max(10,Math.floor(W-w-10));
const maxY=Math.max(minY,Math.floor(H-h-10));
const clampX=(v)=>Math.max(10,Math.min(maxX,Math.round(v)));
const clampY=(v)=>Math.max(minY,Math.min(maxY,Math.round(v)));
let bestX=clampX(rect.left),bestY=clampY(rect.top);
if(hits(bestX,bestY,bestX+w,bestY+h)){
const xs=new Set([bestX,10,Math.round((W-w)*0.5),maxX]);
const ys=new Set([bestY,minY,Math.round((minY+maxY)*0.5),maxY]);
for(const o of[...obstacles,...placed]){
xs.add(clampX(o.l-w-6));
xs.add(clampX(o.r+6));
ys.add(clampY(o.t-h-6));
ys.add(clampY(o.b+6));
}
let bestScore=Infinity;
for(const cy of ys){
for(const cx of xs){
const area=hits(cx,cy,cx+w,cy+h)?overlapArea(cx,cy,cx+w,cy+h)+1e6:0;
const dist=(cx-bestX)*(cx-bestX)+(cy-bestY)*(cy-bestY);
const score=area*1000+dist;
if(score<bestScore){
bestScore=score;
bestX=cx;
bestY=cy;
}
}
}
}
it.el.style.transform=`translate3d(${bestX}px, ${bestY}px, 0)`;
placed.push({l:bestX,t:bestY,r:bestX+w,b:bestY+h});
}
}
action(id){
if(!this.active||this.paused||this.intro>0||this.st.over)return;
const P=this.who.player,pos=P.holder.position,s=this.st;
if(s.busy>0)return;
if(id==='hint'){
let i=nearestNeed(s,this.spots,pos.x,pos.z);
if(i<0||!s.folk[i].need)i=s.folk.findIndex((f)=>f.need&&!f.hintShown);
if(i<0){
this.tip('ヒント','Hãy lại gần cụ đang cần giúp để xem gợi ý nghĩa tiếng Việt',3);
return;
}
useHint(s,i);
const fState=s.folk[i],N=Object.values(NEEDS).find((n)=>n.phrases.includes(fState.jp))||NEEDS[fState.need];
this.tip(fState.jp||N.jp,`💡 Gợi ý: “${N.vi}” (đã dùng gợi ý — mất ★ thứ 2)`,4);
this.hud();
return;
}
if(s.urgent){
const ui=s.urgent.i,sp=this.spots[ui];
const d=Math.hypot(pos.x-sp.x,pos.z-sp.z);
if(d>CARE.REACH){
this.tip('🚨 もっと近くに！','Mau chạy lại gần cụ đang đứng loạng choạng (🚨) rồi bấm 🤲 Đỡ cụ!',3);
return;
}
P.yaw=Math.atan2(sp.x-pos.x,sp.z-pos.z);
const r=act(s,ui,id);
if(r==='saved'){
seatFolk(this.who.folk);
P.bendTo=0.35;P.reachTo=0.85;
setTimeout(()=>{if(this.active){P.bendTo=0;P.reachTo=0;}},CARE.ACT_TIME*1000);
this.overhead.say(P,'大丈夫ですか？ゆっくり座ってください — Cụ có sao không ạ? Mời cụ ngồi xuống từ từ',3);
this.overhead.say(this.who.folk[ui],'😊 ありがとう、助かったよ — Cảm ơn cháu, may quá',3);
this.tip('支える','Đã đỡ cụ ngồi xuống an toàn!',3.5);
if(s.result==='win')this.endT=0.6;
}else if(r==='bad_urgent'){
this.tip('🚨 支えて！','Cụ đang đứng loạng choạng! Phải bấm 🤲 Đỡ cụ (支える) trước!',3.5);
if(s.result==='lose')this.lose();
}
this.hud();
return;
}
if(id==='support'){
this.tip('支える','Hiện không có cụ nào đứng loạng choạng cần đỡ',2.5);
return;
}
const i=nearestNeed(s,this.spots,pos.x,pos.z);
if(i<0){this.tip('もっと近くに！','Hãy lại gần một cụ đang cần giúp (có dấu ❗)',3);return;}
if(this.anim)return;
const fState=s.folk[i],need=fState.need,jpLine=fState.jp||NEEDS[need].jp,f=this.who.folk[i],N=NEEDS[need];
const r=act(s,i,id);
if(r!=='good'&&r!=='bad')return;
const sp=this.spots[i],dx=pos.x-sp.x,dz=pos.z-sp.z,d=Math.hypot(dx,dz)||1;
this.anim={kind:r==='good'?id:'wrong',i,t:0,from:pos.clone(),to:new THREE.Vector3(sp.x+dx/d*STAND,0,sp.z+dz/d*STAND)};
P.yaw=Math.atan2(sp.x-pos.x,sp.z-pos.z);
this.addFloat(f,r==='good'?`+${CARE.GOOD}`:`−${CARE.BAD}`,r==='good');
if(r==='good'){
this.overhead.say(P,`${N.say} — ${N.sayVi}`,2.6);
if(id==='feed'){P.pin(this.bowl,P.handL,0.02,0,0.04);P.pin(this.spoon,P.handR,0.01,0,0.05);}
if(id==='wipe')P.pin(this.towel,P.handR,0,0,0.04);
if(id==='talk')P.play('talk');
setTimeout(()=>this.active&&this.overhead.say(f,REPLY[id],2.4),id==='talk'?900:1200);
if(s.result==='win')this.endT=ANIM+0.3;
}else{
this.tip(jpLine,`Cụ đang nói: “${N.vi}” — chưa đúng việc rồi`,4);
this.overhead.say(f,'ちがうよ… — Không phải cái đó…',2);
if(s.result==='lose')setTimeout(()=>this.active&&this.lose(),900);
}
this.hud();
}
starInfo(won){
const s=this.st;
return starDetails({
won,
miss:s.miss,
maxMiss:s.maxMiss,
timeLeft:s.time,
limit:s.limit,
extra:careExtra(s),
hintUsed:s.hintUsed,
extraLabel:'Không để cụ nào tụt dưới 30% hài lòng',
});
}
starsHtml(info){
const rows=info.lines.map((l)=>`<div class="star-line${l.ok ? ' ok' : ''}">${esc(l.text)}</div>`).join('');
return`<div class="stars-box"><div class="stars-row">${info.text}</div><div class="stars-lines">${rows}</div></div>`;
}
runAnim(dt){
const A=this.anim,P=this.who.player,f=this.who.folk[A.i],pos=P.holder.position;
A.t+=dt;const u=Math.min(1,A.t/ANIM);
const k=Math.min(1,A.t/0.25);
pos.lerpVectors(A.from,A.to,k*k*(3-2*k));
const sp=this.spots[A.i];P.yaw=Math.atan2(sp.x-pos.x,sp.z-pos.z);
const wave=(n)=>Math.max(0,Math.sin(u*Math.PI*2*n));
if(A.kind==='feed'){
P.reachTo=0.55+0.42*wave(2);P.bendTo=0.15;f.bendTo=0.22*wave(2);
}else if(A.kind==='wipe'){
P.reachTo=0.85;P.bendTo=0.2;P.wristSway=1;
}else if(A.kind==='talk'){
f.bendTo=0.1*wave(3);
}else if(A.kind==='comfort'){
P.bendTo=0.3;P.reachTo=0.45+0.12*wave(4);
(f.head||f.holder).getWorldPosition(_a);
this.hearts.forEach((h,n)=>{
const ht=u*1.4-n*0.22;h.visible=ht>0&&ht<1;
if(h.visible){h.position.set(_a.x+Math.sin(n*2.1+ht*3)*0.18,_a.y+0.15+ht*0.55,_a.z);h.material.opacity=1-ht;}
});
}else if(A.kind==='wrong'){
f.yaw+=Math.sin(u*Math.PI*6)*0.12*(1-u);
}
if(A.t>=ANIM)this.endAnim();
}
endAnim(){
const A=this.anim,P=this.who.player,f=this.who.folk[A.i];
for(const o of[this.bowl,this.spoon,this.towel]){
const n=P.attach.findIndex((a)=>a.obj===o);
if(n>=0){o.parent?.remove(o);P.attach.splice(n,1);}
}
P.reachTo=0;P.bendTo=0;P.wristSway=0;f.bendTo=0;
if(A.kind==='talk')P.play('idle');
for(const h of this.hearts)h.visible=false;
this.anim=null;
}
addFloat(ch,text,good){
const it=this.overhead.tag(ch,text,false,2.0);
it.el.classList.add('care-float',good?'good':'bad');
this.floats.push({it,t:0});
}
clampCam(){
const B=CARE_ROOM.bounds;
this.camPos.x=THREE.MathUtils.clamp(this.camPos.x,B.x0-0.2,B.x1+0.2);
this.camPos.z=Math.max(this.camPos.z,B.z0-0.3);
}
dropFloat(fl){fl.it.el.remove();const i=this.overhead.items.indexOf(fl.it);if(i>=0)this.overhead.items.splice(i,1);}
askQuit(){
if(this.paused)return;
this.paused=true;
card(`<h2>Về sớm?</h2><p>Mới xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}. Về sớm thì chỉ được tính phần đã làm.</p>`,[
{label:'Làm tiếp',on:()=>{this.paused=false;}},
{label:'Về sớm',cls:'ghost',on:()=>this.finish({f:careFraction(this.st),done:this.st.count,fail:this.opts.hard,stars:0})},
]);
}
finish(r){this.stop();this.onEnd(r);}
lose(){
this.paused=true;
const info=this.starInfo(false);
card(`<div class="big">😣</div><h2>Chưa đạt</h2><p>${esc(this.st.loseWhy)}</p><p>Đã xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}.</p>${this.starsHtml(info)}`,[
{label:'🔁 Làm lại (🧠 −4)',on:()=>{this.meta.onRetry&&this.meta.onRetry();this.stop();this.start(this.opts,this.who,this.meta,this.onEnd);}},
{label:'Chịu thua, nhận phê bình',cls:'ghost',on:()=>this.finish({f:careFraction(this.st),done:this.st.count,fail:true,stars:info.stars,starLines:info.lines})},
]);
}
win(){
this.paused=true;
this.overhead.say(this.who.player,'お疲れ様でした！',3);
const info=this.starInfo(true);
card(`<div class="big">✅</div><h2>Hết ca! <span class="jp">お疲れ様でした</span></h2><p>Các cụ vui vẻ cả buổi.</p>${this.starsHtml(info)}`,[
{label:'Về thôi →',on:()=>this.finish({f:1,done:this.st.count,fail:false,stars:info.stars,starLines:info.lines})},
]);
}
update(dt){
if(!this.active)return;
const s=this.st,P=this.who.player,pos=P.holder.position,c=this.controls,portrait=isPortrait();
let speed=0;
if(this.anim&&s.urgent&&s.busy<=0)this.endAnim();
if(this.anim&&!this.paused)this.runAnim(dt);
else if(!this.paused&&this.intro<=0&&!s.over&&s.busy<=0){
let mag=c.input(this.dir);
if(mag<0.05&&c.target){
if(this.lastTx!==c.target.x||this.lastTz!==c.target.z){
this.lastTx=c.target.x;this.lastTz=c.target.z;
this.bestD=Infinity;this.stuckT=0;
}
this.dir.set(c.target.x-pos.x,0,c.target.z-pos.z);
const d=this.dir.length();
if(d<this.bestD-0.01){this.bestD=d;this.stuckT=0;}else this.stuckT+=dt;
if(d<0.1||this.stuckT>0.6){c.target=null;mag=0;this.bestD=Infinity;this.stuckT=0;}else{this.dir.multiplyScalar(1/d);mag=1;}
}else{
this.bestD=Infinity;this.stuckT=0;
if(mag>=0.05)this.dir.multiplyScalar(1/Math.max(mag,1e-4));
}
if(mag>=0.05){
const ox=pos.x,oz=pos.z;
const sp=WALK*mag*dt;
pos.x+=this.dir.x*sp;pos.z+=this.dir.z*sp;
for(const o of this.stage.blocks){
const dx=pos.x-o.x,dz=pos.z-o.z,dd=Math.hypot(dx,dz),rr=o.r+0.34;
if(dd<rr&&dd>1e-4){pos.x=o.x+dx/dd*rr;pos.z=o.z+dz/dd*rr;}
}
const B=CARE_ROOM.bounds;
pos.x=THREE.MathUtils.clamp(pos.x,B.x0,B.x1);pos.z=THREE.MathUtils.clamp(pos.z,B.z0,B.z1);
speed=dt>0?Math.hypot(pos.x-ox,pos.z-oz)/dt:0;
let dy=Math.atan2(this.dir.x,this.dir.z)-P.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
P.yaw+=dy*Math.min(1,dt*12);
}
}
if(!this.anim||this.anim.kind!=='talk')P.moveAt(speed);
if(!this.paused){
if(this.intro>0)this.intro-=dt;
else{
for(const[ev,idx]of step(s,dt)){
if(ev==='urgent'){
alertUrgent();
this.tip('🚨 あっ…！','Có cụ đứng dậy loạng choạng! Mau chạy tới bấm 🤲 Đỡ cụ ngay!',5);
}
if(ev==='urgent_fail'){
seatFolk(this.who.folk);
this.overhead.say(this.who.nurse,'危ない！すぐ支えて！ — Nguy hiểm! Phải đỡ cụ ngay!',3.5);
this.tip('🚨 間に合わなかった…','Không kịp đỡ cụ (+2 lỗi)!',4);
}
if(ev==='sat0'){
if(this.who.folk[idx])this.overhead.say(this.who.folk[idx],'もういいよ… — Thôi không cần nữa…',3);
this.tip('もういいよ…','Một cụ chờ lâu quá nên tụt hết hài lòng (+1 lỗi)!',4);
}
if(ev==='lose')this.lose();
if(ev==='warn10')this.tip('急いで！','Còn 10 giây!',3);
}
}
}
if(this.endT>=0){this.endT-=dt;if(this.endT<0)this.win();}
let focus=-1,fd=NEAR_TAG;
this.spots.forEach((sp,n)=>{const d=Math.hypot(pos.x-sp.x,pos.z-sp.z);if(d<fd){fd=d;focus=n;}});
s.folk.forEach((f,i)=>{
const ch=this.who.folk[i],sp=this.spots[i],d=Math.hypot(pos.x-sp.x,pos.z-sp.z);
const isUrgent=!!(s.urgent&&s.urgent.i===i);
if(isUrgent){
ch.sit=0;
ch.holder.position.y=0;
ch.holder.rotation.z=Math.sin(performance.now()*0.014)*0.09;
}else{
if(ch.sit!==1){
ch.sit=1;
ch.holder.rotation.z=0;
ch.holder.position.y=SEAT-(ch.hipH||0)+0.08;
}
if(d<NEAR_TAG){
let dy=Math.atan2(pos.x-sp.x,pos.z-sp.z)-ch.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
ch.yaw+=dy*Math.min(1,dt*(this.anim&&this.anim.i===i?6:2));
}
}
const wc=this.stage.wheels&&this.stage.wheels[i];
if(wc)wc.rotation.y=ch.yaw;
const satPct=Math.round(f.sat);
const heart=f.sat>=50?'💗':f.sat>=30?'🧡':'💔';
const pill=`${heart} Độ hài lòng • ${satPct}%`;
let txt='';
if(isUrgent){
txt=`🚨 「あっ…！」 (${Math.ceil(s.urgent.time)}s)\n🤲 Đỡ cụ ngay!`;
}else if(f.need){
const N=Object.values(NEEDS).find((n)=>n.phrases.includes(f.jp))||NEEDS[f.need];
const jpLine=f.jp||N.jp;
const viLine=f.hintShown?`\n（${N.vi}）`:'';
txt=i===focus?`${jpLine}${viLine}\n${pill}`:'❗';
}else if(i===focus&&d<2.6){
txt=pill;
}
if(this.intro>0&&!isUrgent)txt='';
const it=this.tags[i];
if(it){
it.el.classList.toggle('urgent',isUrgent);
if(it.text!==txt){it.text=txt;it.el.textContent=txt;it.w=0;}
if(it.el.hidden!==!txt)it.el.hidden=!txt;
}
});
for(let n=this.floats.length-1;n>=0;n--){
const fl=this.floats[n];fl.t+=dt;fl.it.y=2.0+fl.t*0.5;fl.it.el.style.opacity=String(Math.max(0,1-fl.t/1.1));
if(fl.t>1.1){this.dropFloat(fl);this.floats.splice(n,1);}
}
let near=-1,nd=Infinity;
this.spots.forEach((sp,n)=>{const d=Math.hypot(pos.x-sp.x,pos.z-sp.z);if(d<nd){nd=d;near=n;}});
const closeOn=this.intro<=0&&(!!this.anim||nd<CARE.REACH);
this.close+=((closeOn?1:0)-this.close)*Math.min(1,dt*3);
camera.fov=THREE.MathUtils.lerp(portrait?58:46,portrait?50:40,this.close);camera.updateProjectionMatrix();
if(this.intro>0){
this.tmp.set(...CARE_ROOM.showcase.look);
this.camPos.set(...CARE_ROOM.showcase.pos);
this.camRig.to(this.camPos,this.tmp,dt,3);
}else if(closeOn){
const i=this.anim?this.anim.i:near,sp=this.spots[i],f=this.who.folk[i];
let ux=pos.x-sp.x,uz=pos.z-sp.z;const ul=Math.hypot(ux,uz)||1;ux/=ul;uz/=ul;
const rx=-uz,rz=ux;
this.camPos.set(pos.x+ux*1.9-rx*1.55,2.05,pos.z+uz*1.9-rz*1.55);
(f.head||f.holder).getWorldPosition(_b);
this.camLook.set(THREE.MathUtils.lerp(pos.x,sp.x,0.45),_b.y-0.2,THREE.MathUtils.lerp(pos.z,sp.z,0.45));
this.clampCam();
this.camRig.to(this.camPos,this.camLook,dt,4);
}else{
const dist=6.4*(portrait?1.15:1),cp=Math.cos(c.pitch);
this.camPos.set(pos.x+Math.sin(c.yaw)*dist*cp,1.2+Math.sin(c.pitch)*dist,pos.z+Math.cos(c.yaw)*dist*cp);
this.camLook.set(pos.x,1.0,pos.z);
this.clampCam();
this.camRig.to(this.camPos,this.camLook,dt,5);
}
this.hud();
}
}
export function seatFolk(folk){
folk.forEach((ch,i)=>{
const[x,z,ry]=CARE_ROOM.folk[i];
ch.unpinAll();ch.sit=1;ch.yaw=ry;ch.play('idle');
ch.holder.position.set(x,0,z);
if(ch.hipH===undefined){
ch.holder.updateMatrixWorld(true);
const hips=ch.root.getObjectByProperty('isBone',true);
const v=new THREE.Vector3();(ch.hips||hips).getWorldPosition(v);
ch.hipH=v.y-ch.holder.position.y;
}
ch.holder.position.y=SEAT-ch.hipH+0.08;
});
}
