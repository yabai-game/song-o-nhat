/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{
LOTUS,STEPS,STEP_KEYS,ALL_STEP_KEYS,createLotus,nearestSpot,nextStepId,
spotOrderText,pullNeedle,inPullZone,startWash,endWash,act,step,lotusFraction,lotusExtra,
}from'../core/lotus_rules.js';
import{starDetails}from'../core/stars.js';
import{LOTUS_FIELD}from'../gfx/lotus.js';
import{camera,isPortrait}from'../gfx/stage.js';
import{$,show,card,esc}from'../ui/ui.js';
export class LotusShift{
constructor({stage,controls,overhead,camRig}){
Object.assign(this,{stage,controls,overhead,camRig});
this.dir=new THREE.Vector3();
this.camPos=new THREE.Vector3();
this.camLook=new THREE.Vector3();
this.active=false;
this.btn={};
this.mine=ALL_STEP_KEYS.map((k)=>{
const a=STEPS[k];
const b=document.createElement('button');
b.type='button';
b.className='act';
b.dataset.id=a.id;
b.innerHTML=`<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
if(a.id==='wash'){
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.beginWash();});
b.addEventListener('pointerup',(e)=>{e.preventDefault();this.releaseWash();});
b.addEventListener('pointercancel',()=>this.releaseWash());
b.addEventListener('pointerleave',()=>{if(this.st&&this.st.washing)this.releaseWash();});
}else{
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.action(a.id);});
}
this.btn[a.id]=b;
return b;
});
$('sh-quit').addEventListener('click',()=>this.active&&this.askQuit());
addEventListener('pointerup',()=>{if(this.active&&this.st&&this.st.washing)this.releaseWash();});
addEventListener('keydown',(e)=>{
if(!this.active)return;
if(e.code==='Digit2'){
if(!e.repeat){e.preventDefault();this.beginWash();}
return;
}
const k={Digit5:'cut',KeyC:'cut',Digit1:'dig',Space:'dig',Digit3:'pull',Digit4:'collect'}[e.code];
if(k&&!e.repeat){e.preventDefault();this.action(k);}
});
addEventListener('keyup',(e)=>{
if(!this.active)return;
if(e.code==='Digit2'){e.preventDefault();this.releaseWash();}
});
addEventListener('resize',()=>{
if(this.active&&!$('sh-gauge').hidden)requestAnimationFrame(()=>this.placeGauge());
});
}
placeGauge(){
const gauge=$('sh-gauge');
if(!gauge||gauge.hidden)return;
const imp=(el,k,v)=>{if(el.style.getPropertyValue(k)!==v)el.style.setProperty(k,v,'important');};
const vis=(el)=>el&&!el.hidden&&getComputedStyle(el).display!=='none';
const W=window.innerWidth||375,H=window.innerHeight||812;
const acts=$('acts'),joy=$('joy');
const ar=vis(acts)?acts.getBoundingClientRect():null;
const jr=vis(joy)?joy.getBoundingClientRect():null;
if(W>H&&jr&&ar&&jr.width>0&&ar.width>0&&ar.left-jr.right>=200){
const gap=ar.left-jr.right;
const w=Math.round(Math.min(280,gap-20));
const left=Math.round(jr.right+(gap-w)/2);
imp(gauge,'width',`${w}px`);
imp(gauge,'left',`${left}px`);
imp(gauge,'bottom','18px');
imp(gauge,'top','auto');
imp(gauge,'transform','none');
return;
}
const w=Math.round(Math.min(300,W-32));
const left=Math.round((W-w)/2);
let minTop=H;
if(ar&&ar.height>0)minTop=Math.min(minTop,ar.top);
if(jr&&jr.height>0)minTop=Math.min(minTop,jr.top);
let bottom=Math.round(H-minTop+10);
let topFloor=0;
const hud=$('shifthud');
for(const el of[hud&&hud.querySelector('.top'),$('sh-ticket'),$('sh-bars')]){
if(!vis(el))continue;
const r=el.getBoundingClientRect();
if(r.height>0)topFloor=Math.max(topFloor,r.bottom);
}
imp(gauge,'width',`${w}px`);
imp(gauge,'left',`${left}px`);
imp(gauge,'bottom',`${bottom}px`);
imp(gauge,'top','auto');
imp(gauge,'transform','none');
if(topFloor>0){
const gr=gauge.getBoundingClientRect();
if(gr.height>0&&gr.top<topFloor+6){
bottom=Math.max(10,Math.round(H-(topFloor+6+gr.height)));
imp(gauge,'bottom',`${bottom}px`);
}
}
}
start(opts,who,meta,onEnd){
Object.assign(this,{opts,who,meta,onEnd});
this.st=createLotus(opts);
const P=who.player,F=who.foreman;
P.unpinAll();
P.holder.rotation.x=0;
P.bendTo=0;
P.reachTo=0;
P.reach=0;
P.wristSway=0;
P.holder.position.set(LOTUS_FIELD.player.x,LOTUS.GROUND_Y,LOTUS_FIELD.player.z);
P.yaw=LOTUS_FIELD.player.yaw;
P.moveAt(0);
if(F){
F.holder.position.set(LOTUS_FIELD.foreman.x,0,LOTUS_FIELD.foreman.z);
F.yaw=LOTUS_FIELD.foreman.yaw;
F.play('idle');
}
const box=$('acts');
if(!this.saved)this.saved=[...box.children];
box.replaceChildren(...this.mine);
this.btn.cut.hidden=!this.st.weeds;
box.classList.toggle('many',!!this.st.weeds);
show('dayhud',false);
show('shifthud');
show('sh-gust',false);
show('sh-ticket',false);
show('sh-bal',false);
show('sh-gauge',false);
show('joy',true);
$('sh-place').querySelector('span').textContent='Ruộng sen 霞ヶ浦 · Ibaraki';
$('sh-rank').textContent=meta.rankLabel;
this.stage.setWeather({rain:!!opts.rain,cold:(opts.walk||1)<1&&!opts.rain,pm:!!opts.hard});
this.stage.setCollected(0);
this.stage.setSpray(false);
this.stage.syncSpots(this.st.spots,nearestSpot(this.st,P.holder.position.x,P.holder.position.z));
this.tags=(this.stage.spotGroups||[]).map((grp)=>{
const it=this.overhead.tag(grp,'',false,0.55);
it.el.classList.add('care');
it.text='';
return it;
});
this.controls.reset({yaw:0.15,pitch:0.42,groundY:LOTUS.GROUND_Y,yawLimit:[-Infinity,Infinity]});
this.controls.enabled=true;
this.controls.target=null;
this.controls.onTap=null;
this.intro=2.2;
this.active=true;
this.paused=false;
this.endT=-1;
const tipVi=this.st.weeds
?'Gốc có 🌿 phải ✂️ Cắt cỏ trước khi ⛏️ Đào · Giữ 💦 Xịt nước đến 80–100% rồi thả · Căn kim xanh khi 🪴 Nhổ!'
:'Đào → Giữ 💦 Xịt nước thả ở 80–100% → Căn kim xanh bấm 🪴 Nhổ → 🧺 Nhặt';
this.tip(this.st.weeds?'刈る → 掘る → 洗う → 抜く → 拾う':'掘る → 洗う → 抜く → 拾う',tipVi,7);
if(F){
const line=opts.jp
?`${opts.jp.replace(/[「」]/g, '')} — ${opts.vi || 'Làm đúng thứ tự các bước nhé!'}`
:'順番通りにね！折らないように！ — Làm đúng thứ tự nhé, cẩn thận kẻo gãy củ!';
this.overhead.say(F,line,5);
}
this.camRig.init=false;
this.hud();
}
stop(){
this.active=false;
this.controls.enabled=false;
this.stage.setSpray(false);
$('acts').classList.remove('many');
if(this.saved){$('acts').replaceChildren(...this.saved);this.saved=null;}
for(const k of ALL_STEP_KEYS){this.btn[k].classList.remove('hot','on');}
for(const it of this.tags||[]){
it.el.remove();
const i=this.overhead.items.indexOf(it);
if(i>=0)this.overhead.items.splice(i,1);
}
this.tags=[];
show('shifthud',false);
show('sh-tip',false);
show('sh-gauge',false);
clearTimeout(this.pullPoseT);
if(this.who&&this.who.player){
this.who.player.bendTo=0;
this.who.player.reachTo=0;
this.who.player.reach=0;
this.who.player.wristSway=0;
this.who.player.holder.position.y=0;
}
}
tip(jp,vi,sec=5.5){
const t=$('sh-tip');
t.querySelector('b').textContent=jp;
t.querySelector('span').textContent=vi;
t.hidden=false;
clearTimeout(this.tipT);
this.tipT=setTimeout(()=>{t.hidden=true;},sec*1000);
}
hud(){
const s=this.st,pos=this.who.player.holder.position;
let txt=`🪷 ${s.count}/${s.goal} ${this.meta.unit}`;
if(s.limit)txt+=` · ⏱ ${Math.ceil(s.time)}s`;
if(s.maxMiss)txt+=` · ❌ ${s.miss}/${s.maxMiss}`;
else if(s.miss)txt+=` · ❌ ${s.miss}`;
const g=$('sh-goal');
if(g.textContent!==txt)g.textContent=txt;
g.classList.toggle('warn',(s.limit&&s.time<=10)||!!(s.maxMiss&&s.miss>=s.maxMiss));
const near=nearestSpot(s,pos.x,pos.z);
const wantId=near&&s.busy<=0?nextStepId(near):null;
const showHintHot=!!(near&&(!s.weeds||near.seenT<=LOTUS.PREVIEW_TIME));
for(const k of ALL_STEP_KEYS){
const hot=k==='pull'&&wantId==='pull'?inPullZone(s):(k===wantId&&showHintHot);
this.btn[k].classList.toggle('hot',hot);
this.btn[k].classList.toggle('on',k==='wash'&&!!s.washing);
}
const gauge=$('sh-gauge');
const wasHidden=gauge.hidden;
if(s.washing){
show('sh-gauge',true);
if(wasHidden)this.placeGauge();
const pct=Math.min(100,s.washProg*100);
const inZone=s.washProg>=LOTUS.WASH_MIN&&s.washHold<=LOTUS.WASH_OVER;
$('lg-lbl').textContent=s.washProg>=1
?'⚠️ Thả ngay kẻo trầy củ!'
:inZone
?`💦 Thả ngay! (${Math.round(pct)}%)`
:`💦 Giữ để xịt… ${Math.round(pct)}%`;
const z=$('lg-zone');z.style.left='80%';z.style.width='20%';
$('lg-fill').style.width=`${pct.toFixed(1)}%`;
$('lg-needle').style.left=`${pct.toFixed(1)}%`;
}else if(near&&near.state===2&&s.busy<=0&&!s.over){
show('sh-gauge',true);
if(wasHidden)this.placeGauge();
const needle=pullNeedle(s)*100;
const zW=s.pullZone*100;
const zL=50-zW/2;
$('lg-lbl').textContent=inPullZone(s)
?'🪴 Bấm Nhổ ngay!'
:'🪴 Chờ kim vào vùng xanh';
const z=$('lg-zone');z.style.left=`${zL.toFixed(1)}%`;z.style.width=`${zW.toFixed(1)}%`;
$('lg-fill').style.width='0%';
$('lg-needle').style.left=`${needle.toFixed(1)}%`;
}else{
show('sh-gauge',false);
}
}
beginWash(){
if(!this.active||this.paused||this.intro>0||this.st.over)return;
const s=this.st,P=this.who.player,F=this.who.foreman,pos=P.holder.position;
const nearBefore=nearestSpot(s,pos.x,pos.z);
const r=startWash(s,pos.x,pos.z);
if(r==='busy')return;
if(r==='far'){
this.tip('もっと近くに！','Lại gần gốc sen có vòng vàng đã',2.5);
return;
}
if(r==='bad'){
const wantKey=nextStepId(nearBefore)||'dig';
const want=STEPS[wantKey];
this.tip(want.tipJp,`Sai thứ tự! Bước này phải: ${want.vi}`,4);
if(F)this.overhead.say(F,`${want.jp}が先だよ！ — Phải ${want.label.toLowerCase()} trước đã!`,2.5);
if(s.result==='lose')this.lose();
this.hud();
return;
}
if(r==='washing'){
const sp=s.spots[s.washSpot];
this.controls.target=null;
P.yaw=Math.atan2(sp.x-pos.x,sp.z-pos.z);
P.bendTo=0.35;
P.reachTo=0.7;
P.wristSway=1;
this.overhead.say(P,'洗う…',1.2);
this.hud();
}
}
releaseWash(){
if(!this.st||!this.st.washing)return;
const s=this.st,P=this.who.player,pos=P.holder.position;
const r=endWash(s);
P.bendTo=0;
P.reachTo=0;
P.wristSway=0;
if(r==='good'){
this.overhead.say(P,'よし、きれい！',1.2);
this.tip(STEPS.wash.tipJp,'Sạch bùn rồi! Tiếp theo: căn kim vùng xanh bấm 🪴 Nhổ',3.2);
this.stage.syncSpots(s.spots,nearestSpot(s,pos.x,pos.z));
}else if(r==='short'){
this.tip('もっと洗って！','Chưa sạch bùn (< 80%) — giữ nút 💦 Xịt nước đến vùng xanh (80–100%) rồi thả!',3.2);
}
this.hud();
}
action(id){
if(!this.active||this.paused||this.intro>0||this.st.over)return;
if(id==='wash'){this.beginWash();return;}
const s=this.st,P=this.who.player,F=this.who.foreman,pos=P.holder.position;
const nearBefore=nearestSpot(s,pos.x,pos.z);
const r=act(s,id,pos.x,pos.z);
if(r==='busy')return;
if(r==='far'){
this.tip('もっと近くに！','Lại gần gốc sen có vòng vàng đã',2.5);
return;
}
if(r==='broken'){
this.controls.target=null;
P.bendTo=0.45;P.reachTo=0.8;
clearTimeout(this.pullPoseT);
this.pullPoseT=setTimeout(()=>{if(this.active){P.bendTo=0;P.reachTo=0;P.reach=0;}},320);
this.overhead.say(P,'あっ、折れた…',2);
if(F)this.overhead.say(F,'折れちゃったよ！タイミングを見て！ — Gãy củ rồi! Căn kim vào vùng xanh chứ!',3);
this.tip('折れた！','Bấm lệch vùng xanh làm gãy củ sen (+1 lỗi, hỏng gốc này)!',4);
this.stage.syncSpots(s.spots,nearestSpot(s,pos.x,pos.z));
if(s.result==='lose')this.lose();
this.hud();
return;
}
if(r==='bad'){
const wantKey=nextStepId(nearBefore)||'dig';
const want=STEPS[wantKey];
this.tip(want.tipJp,`Sai thứ tự! Bước này phải: ${want.vi}`,4);
if(F)this.overhead.say(F,`${want.jp}が先だよ！ — Phải ${want.label.toLowerCase()} trước đã!`,2.5);
if(s.result==='lose')this.lose();
this.hud();
return;
}
if(r==='good'){
const sp=s.busySpot>=0?s.spots[s.busySpot]:nearBefore;
this.controls.target=null;
if(sp)P.yaw=Math.atan2(sp.x-pos.x,sp.z-pos.z);
P.bendTo=0.65;
if(id==='cut'){
P.reachTo=0.85;
P.wristSway=1;
}else if(id==='dig'){
P.reachTo=1;
P.wristSway=0;
}else if(id==='pull'){
P.reach=1;
P.reachTo=1;
P.wristSway=0;
clearTimeout(this.pullPoseT);
this.pullPoseT=setTimeout(()=>{if(this.active){P.bendTo=0;P.reachTo=0;P.reach=0;}},280);
}else if(id==='collect'){
P.reachTo=0.6;
P.wristSway=0;
}
const stp=STEPS[id];
this.overhead.say(P,`${stp.jp}！`,1.1);
if(sp&&sp.state<4){
const next=STEPS[nextStepId(sp)];
this.tip(stp.tipJp,`${stp.vi} — tiếp theo: ${next.icon} ${next.label}`,3.2);
}else{
this.stage.setCollected(s.count);
this.overhead.say(P,`蓮根！(${s.count}/${s.goal})`,2);
if(F){
this.overhead.say(
F,
s.count>=s.goal?'よし、終わり！ — Tốt lắm, đủ số củ rồi!':'いい蓮根だ！ — Củ sen đẹp đấy!',
2.5,
);
}
this.tip('よし、一本！',`Đào được 1 củ sen (${s.count}/${s.goal})!`,3.5);
if(s.result==='win')this.endT=0.6;
}
this.stage.syncSpots(s.spots,nearestSpot(s,pos.x,pos.z));
this.hud();
}
}
starInfo(won){
const s=this.st;
return starDetails({
won,
miss:s.miss,
maxMiss:s.maxMiss,
timeLeft:s.time,
limit:s.limit,
extra:lotusExtra(s),
extraLabel:'Không làm gãy củ sen nào',
});
}
starsHtml(info){
const rows=info.lines.map((l)=>`<div class="star-line${l.ok ? ' ok' : ''}">${esc(l.text)}</div>`).join('');
return`<div class="stars-box"><div class="stars-row">${info.text}</div><div class="stars-lines">${rows}</div></div>`;
}
askQuit(){
if(this.paused)return;
this.paused=true;
card(`<h2>Về sớm?</h2><p>Mới đào được ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}. Về sớm thì chỉ được tính phần đã làm.</p>`,[
{label:'Làm tiếp',on:()=>{this.paused=false;}},
{label:'Về sớm',cls:'ghost',on:()=>this.finish({f:lotusFraction(this.st),done:this.st.count,fail:this.opts.hard,stars:0})},
]);
}
finish(r){this.stop();this.onEnd(r);}
lose(){
this.paused=true;
const info=this.starInfo(false);
card(`<div class="big">😣</div><h2>Chưa đạt</h2><p>${esc(this.st.loseWhy)}</p><p>Đã đào ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}.</p>${this.starsHtml(info)}`,[
{label:'🔁 Làm lại (🧠 −4)',on:()=>{this.meta.onRetry&&this.meta.onRetry();this.stop();this.start(this.opts,this.who,this.meta,this.onEnd);}},
{label:'Chịu thua, nhận phê bình',cls:'ghost',on:()=>this.finish({f:lotusFraction(this.st),done:this.st.count,fail:true,stars:info.stars,starLines:info.lines})},
]);
}
win(){
this.paused=true;
this.overhead.say(this.who.player,'お疲れ様でした！',3);
const info=this.starInfo(true);
card(`<div class="big">✅</div><h2>Hết ca! <span class="jp">お疲れ様でした</span></h2><p>Những củ sen nguyên vẹn đã được xếp gọn vào giỏ trên bờ.</p>${this.starsHtml(info)}`,[
{label:'Về thôi →',on:()=>this.finish({f:1,done:this.st.count,fail:false,stars:info.stars,starLines:info.lines})},
]);
}
update(dt){
if(!this.active)return;
const s=this.st,P=this.who.player,pos=P.holder.position,c=this.controls;
const portrait=isPortrait();
let moving=false,speed=0;
if(!this.paused){
if(this.intro>0)this.intro-=dt;
else{
const ev=step(s,dt,pos.x,pos.z);
if(ev.includes('ready')){
P.bendTo=0;
P.reachTo=0;
P.wristSway=0;
}
if(ev.includes('overwash')){
P.bendTo=0;
P.reachTo=0;
P.wristSway=0;
if(this.who.foreman)this.overhead.say(this.who.foreman,'洗いすぎ！傷がついたよ！ — Xịt mạnh quá làm trầy củ rồi!',3);
this.tip('洗いすぎ！','Giữ vòi xịt quá 1.6s sau khi đầy làm củ sen bị trầy (+1 lỗi)! Tiếp theo: 🪴 Nhổ',4);
}
if(ev.includes('warn10'))this.tip('あと10秒！','Còn 10 giây!',3);
if(ev.includes('lose'))this.lose();
if(s.busy<=0&&!s.washing&&!s.over){
let mag=c.input(this.dir);
if(mag<0.05&&c.target){
this.dir.set(c.target.x-pos.x,0,c.target.z-pos.z);
const d=this.dir.length();
if(d<0.14){c.target=null;mag=0;}
else{this.dir.multiplyScalar(1/d);mag=1;}
}else if(mag>=0.05){
this.dir.multiplyScalar(1/Math.max(mag,1e-4));
}
if(mag>=0.05){
moving=true;
const ox=pos.x,oz=pos.z;
const stepDist=LOTUS.WALK*(s.walk||1)*(s.rain?0.92:1)*mag*dt;
const B=LOTUS.BOUNDS;
pos.x=THREE.MathUtils.clamp(pos.x+this.dir.x*stepDist,B.x0,B.x1);
pos.z=THREE.MathUtils.clamp(pos.z+this.dir.z*stepDist,B.z0,B.z1);
pos.y=LOTUS.GROUND_Y;
speed=dt>0?Math.hypot(pos.x-ox,pos.z-oz)/dt:0;
let dy=Math.atan2(this.dir.x,this.dir.z)-P.yaw;
dy=Math.atan2(Math.sin(dy),Math.cos(dy));
P.yaw+=dy*Math.min(1,dt*10);
}
}
}
if(s.washing&&s.washSpot>=0){
const sp=s.spots[s.washSpot];
this.stage.setSpray(true,pos,sp.x,sp.z,dt);
}else{
this.stage.setSpray(false);
}
const near=nearestSpot(s,pos.x,pos.z);
this.stage.syncSpots(s.spots,near);
for(let i=0;i<s.spots.length;i++){
const sp=s.spots[i],it=this.tags&&this.tags[i];
if(!it)continue;
let txt='';
if(sp.state<4){
const isNear=!!(near&&near.i===i);
if(isNear&&sp.seenT<=LOTUS.PREVIEW_TIME){
txt=`${sp.state < 0 ? '🌿 ' : ''}${spotOrderText(sp)}`;
}else if(sp.state<0){
txt='🌿';
}
}
if(it.text!==txt){
it.text=txt;
it.el.textContent=txt;
it.el.hidden=!txt;
it.w=0;
}
}
}else{
this.stage.setSpray(false);
}
if(this.endT>=0&&!this.paused){
this.endT-=dt;
if(this.endT<0)this.win();
}
P.moveAt(speed);
camera.fov=portrait?56:46;
camera.updateProjectionMatrix();
if(this.intro>0){
this.camRig.to(this.stage.showcase.pos,this.stage.showcase.look,dt,3);
}else{
c.follow(P.yaw+Math.PI,moving,dt);
const dist=5.4*(portrait?1.16:1),cp=Math.cos(c.pitch);
this.camPos.set(
pos.x+Math.sin(c.yaw)*dist*cp,
pos.y+1.55+Math.sin(c.pitch)*dist,
pos.z+Math.cos(c.yaw)*dist*cp,
);
this.camLook.set(pos.x-Math.sin(c.yaw)*1.8,pos.y+0.9,pos.z-Math.cos(c.yaw)*1.8);
this.camRig.to(this.camPos,this.camLook,dt,6);
}
this.hud();
}
}
