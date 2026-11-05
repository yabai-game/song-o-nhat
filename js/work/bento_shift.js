/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{ITEMS,DEFECTS,createBento,activeTray,act,step,queueView,bentoFraction,bentoExtra}from'../core/bento_rules.js';
import{fpCamera,beltToWorldX}from'../core/bento_view.js';
import{starDetails}from'../core/stars.js';
import{BENTO_ROOM}from'../gfx/bento.js';
import{camera,canvas,isPortrait}from'../gfx/stage.js';
import{$,show,card,esc}from'../ui/ui.js';
const ACTIONS=[
{id:'karaage',icon:ITEMS.karaage.icon,label:ITEMS.karaage.vi,jp:ITEMS.karaage.jp},
{id:'sausage',icon:ITEMS.sausage.icon,label:ITEMS.sausage.vi,jp:ITEMS.sausage.jp},
{id:'veg',icon:ITEMS.veg.icon,label:ITEMS.veg.vi,jp:ITEMS.veg.jp},
{id:'reject',icon:'🚫',label:'Loại',jp:'不良'},
];
const CAM_YAW=0.26,CAM_PITCH=0.42;
export class BentoShift{
constructor({stage,controls,overhead,camRig}){
Object.assign(this,{stage,controls,overhead,camRig});
this.camPos=new THREE.Vector3();
this.camLook=new THREE.Vector3();
this.tmp=new THREE.Vector3();
this.active=false;
this.btn={};
this.mine=ACTIONS.map((a)=>{
const b=document.createElement('button');b.type='button';b.className='act';b.dataset.id=a.id;
b.innerHTML=`<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.action(a.id);});
this.btn[a.id]=b;
return b;
});
let qEl=$('sh-queue');
if(!qEl){
qEl=document.createElement('div');
qEl.id='sh-queue';
qEl.className='bento-queue';
qEl.hidden=true;
$('shifthud').appendChild(qEl);
}
this.queueEl=qEl;
this.queueSig='';
$('sh-quit').addEventListener('click',()=>this.active&&this.askQuit());
addEventListener('keydown',(e)=>{
if(!this.active)return;
const k={Digit1:'karaage',Space:'karaage',Digit2:'sausage',Digit3:'veg',Digit4:'reject',KeyR:'reject'}[e.code];
if(k){e.preventDefault();this.action(k);}
});
}
start(opts,who,meta,onEnd){
Object.assign(this,{opts,who,meta,onEnd});
this.st=createBento(opts);
const P=who.player,F=who.foreman;
P.unpinAll();P.holder.rotation.x=0;P.bendTo=0;P.reachTo=0.28;P.reach=0.28;P.pickT=-1;
P.holder.position.set(BENTO_ROOM.player.x,0,BENTO_ROOM.player.z);
P.yaw=BENTO_ROOM.player.yaw;P.play('idle');
this.prevPlayerVis=P.holder.visible;
P.holder.visible=false;
if(F){
F.holder.position.set(BENTO_ROOM.foreman.x,0,BENTO_ROOM.foreman.z);
F.yaw=BENTO_ROOM.foreman.yaw;F.play('idle');
}
this.prevNear=camera.near;
this.prevFov=camera.fov;
camera.near=0.05;
camera.updateProjectionMatrix();
const box=$('acts');
if(!this.saved)this.saved=[...box.children];
box.replaceChildren(...this.mine);
box.classList.add('bento-acts');
this.queueSig='';
if(this.queueEl)this.queueEl.hidden=false;
show('dayhud',false);show('shifthud');show('sh-gust',false);show('joy',false);show('sh-bal',false);show('sh-gauge',false);show('sh-ticket',true);
$('sh-place').querySelector('span').textContent='Xưởng cơm hộp さくら食品';
$('sh-rank').textContent=meta.rankLabel;
this.controls.reset({yaw:CAM_YAW,pitch:CAM_PITCH,groundY:0,yawLimit:[-0.2,1]});
this.controls.enabled=false;
this.controls.target=null;
this.controls.onTap=null;
this.stage.syncTrays(this.st.trays);
this.stage.fpTongs?.setVisible(false);
this.intro=2.2;
this.active=true;
this.paused=false;
this.endT=-1;
const tipVi=this.st.defectRate>0
?'Bấm các món theo thứ tự trái → phải; gặp khay lỗi (💇/nắp lệch/thiếu cơm) bấm 🚫 Loại 不良!'
:this.st.multi[1]>1
?'Khay có 1–2 món: bấm lần lượt theo thứ tự từ trái sang phải khi vào vùng vàng'
:'Khay vào vùng vàng thì bấm đúng món được hiện trên khay';
this.tip('唐揚げ・ウインナー・野菜',tipVi,4);
if(F)this.overhead.say(F,'衛生第一！手を止めないで！ — Vệ sinh là số một! Đừng dừng tay!',4);
this.camRig.init=false;
this.hud();
}
stop(){
this.active=false;
this.controls.enabled=false;
show('joy',true);
show('sh-ticket',false);
const box=$('acts');
box.classList.remove('bento-acts');
if(this.saved){box.replaceChildren(...this.saved);this.saved=null;}
if(this.queueEl)this.queueEl.hidden=true;
for(const a of ACTIONS)this.btn[a.id].classList.remove('hot');
this.stage.clearTrays();
this.stage.fpTongs?.setVisible(false);
if(this.prevNear!==undefined)camera.near=this.prevNear;
if(this.prevFov!==undefined)camera.fov=this.prevFov;
camera.updateProjectionMatrix();
show('shifthud',false);show('sh-tip',false);
clearTimeout(this.reachT);
if(this.who&&this.who.player){
this.who.player.holder.visible=this.prevPlayerVis??true;
this.who.player.bendTo=0;
this.who.player.reachTo=0;
this.who.player.pickT=-1;
if(this.who.player.bentoGear){
this.who.player.bentoGear.setPinch(0);
this.who.player.bentoGear.setFood(null);
}
}
}
tip(jp,vi,sec=5.5){
const t=$('sh-tip');t.querySelector('b').textContent=jp;t.querySelector('span').textContent=vi;
t.hidden=false;clearTimeout(this.tipT);this.tipT=setTimeout(()=>{t.hidden=true;},sec*1000);
}
hud(){
const s=this.st;
let txt=`🍱 ${s.count}/${s.goal} ${this.meta.unit}`;
if(s.maxMiss)txt+=` · ❌ ${s.miss}/${s.maxMiss}`;else if(s.miss)txt+=` · ❌ ${s.miss}`;
const g=$('sh-goal');if(g.textContent!==txt)g.textContent=txt;
g.classList.toggle('warn',!!(s.maxMiss&&s.miss>=s.maxMiss));
const tk=$('sh-ticket');
if(tk){
const tkTxt=`🔥 Chuỗi: ${s.streak} (kỷ lục ${s.maxStreak}/5)`;
if(tk.textContent!==tkTxt)tk.textContent=tkTxt;
}
this.btn.reject.hidden=!(s.defectRate>0);
const cur=activeTray(s);
for(const a of ACTIONS){
const isHot=cur?(cur.defect?a.id==='reject':a.id===cur.need):false;
this.btn[a.id].classList.toggle('hot',isHot);
}
if(this.queueEl){
const q=queueView(s,2);
const curSig=q.cur
?`${q.cur.id}:${q.cur.defect || ''}:${q.cur.stepIdx}:${q.cur.order.join(',')}`
:'none';
const nextSig=q.next.map((nt)=>`${nt.id}:${nt.defect || ''}:${nt.order.join(',')}`).join('|');
const sig=`${curSig}//${nextSig}`;
if(this.queueSig!==sig){
this.queueSig=sig;
let curHtml;
if(!q.cur){
curHtml=`<span class="bq-wait">Chờ khay…</span>`;
}else if(q.cur.defect){
curHtml=`<span class="bq-defect">🚫 Khay lỗi: ${q.cur.defectIcon}</span>`;
}else{
curHtml=q.cur.items
.map((it)=>`<span class="bq-it${it.done ? ' done' : ''}${it.active ? ' next' : ''}">${it.icon}${it.done ? '✓' : ''}</span>`)
.join(' ');
}
const nextHtml=q.next.length
?q.next
.map((nt)=>nt.defect
?`<span class="bq-next-it defect">🚫${nt.defectIcon}</span>`
:`<span class="bq-next-it">${nt.items.map((it) => it.icon).join('')}</span>`)
.join('<span class="bq-sep">·</span>')
:`<span class="bq-wait">—</span>`;
this.queueEl.innerHTML=`<div class="bq-row"><b class="bq-lbl">Đang làm:</b> ${curHtml}</div><div class="bq-row"><b class="bq-lbl">Tiếp:</b> ${nextHtml}</div>`;
}
}
}
action(id){
if(!this.active||this.paused||this.intro>0||this.st.over)return;
const s=this.st,P=this.who.player,F=this.who.foreman;
const cur=activeTray(s);
const needBefore=cur?cur.need:null;
const defectBefore=cur?cur.defect:null;
const trayWorldX=cur?beltToWorldX(cur.x):0;
const compIdx=cur?(cur.placed?cur.placed.length:0):0;
const r=act(s,id);
if(r==='locked')return;
if(r==='early'){
this.tip('まだです','Chờ khay vào vùng vàng đã',2.0);
return;
}
if(r==='step'){
const it=ITEMS[id];
this.stage.fpTongs?.triggerPlace(id,trayWorldX,compIdx);
P.triggerPick(id,0.25);
const nextIt=cur&&cur.need?ITEMS[cur.need]:null;
this.tip(it.jp,nextIt?`Đã đặt ${it.vi} → tiếp: ${nextIt.icon} ${nextIt.vi}`:`Đã đặt ${it.vi}`,1.8);
this.stage.syncTrays(s.trays);
}else if(r==='good'){
const it=ITEMS[id];
this.stage.fpTongs?.triggerPlace(id,trayWorldX,compIdx);
P.triggerPick(id,0.25);
this.tip(it.jp,`Đúng rồi! ${it.vi} (${s.count}/${s.goal})`,1.8);
this.stage.syncTrays(s.trays);
if(s.result==='win')this.endT=0.5;
}else if(r==='rejected'){
const df=DEFECTS[defectBefore]||DEFECTS.hair;
this.stage.fpTongs?.triggerReject(trayWorldX);
this.stage.flickRejectTray?.(trayWorldX,defectBefore||'hair');
this.tip('不良品除去！',`Đã loại khay lỗi (${df.vi})!`,2.0);
if(F)this.overhead.say(F,'よく気づいたね！ — Tinh mắt đấy!',2);
this.stage.syncTrays(s.trays);
}else if(r==='bad_defect'){
const df=DEFECTS[defectBefore]||DEFECTS.hair;
this.tip('不良品だよ！',`Khay này bị lỗi (${df.vi}) — phải bấm 🚫 Loại 不良!`,3.0);
if(F)this.overhead.say(F,'不良品だよ！ — Khay lỗi kìa!',2);
this.stage.syncTrays(s.trays);
if(s.result==='lose')this.lose();
}else if(r==='bad_reject'){
this.tip('良品だよ！','Khay này bình thường! Đừng bấm 🚫 Loại nhầm nhé',3.0);
if(F)this.overhead.say(F,'もったいない！ — Khay tốt mà!',2);
if(s.result==='lose')this.lose();
}else if(r==='bad'){
const want=ITEMS[needBefore||id]||ITEMS.karaage,got=ITEMS[id]||ITEMS.karaage;
this.tip(`${want.jp} ですよ！`,`Món tiếp theo là ${want.vi}, không phải ${got.vi}`,3.0);
if(F)this.overhead.say(F,`${want.jp} ですよ！`,2);
if(s.result==='lose')this.lose();
}
this.hud();
}
starInfo(won){
const s=this.st;
return starDetails({
won,
miss:s.miss,
maxMiss:s.maxMiss,
timeLeft:0,
limit:0,
extra:bentoExtra(s),
extraLabel:'Đạt chuỗi ≥ 5 hộp liên tiếp không sai',
});
}
starsHtml(info){
const rows=info.lines.map((l)=>`<div class="star-line${l.ok ? ' ok' : ''}">${esc(l.text)}</div>`).join('');
return`<div class="stars-box"><div class="stars-row">${info.text}</div><div class="stars-lines">${rows}</div></div>`;
}
askQuit(){
if(this.paused)return;
this.paused=true;
card(`<h2>Về sớm?</h2><p>Mới xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}. Về sớm thì chỉ được tính phần đã làm.</p>`,[
{label:'Làm tiếp',on:()=>{this.paused=false;}},
{label:'Về sớm',cls:'ghost',on:()=>this.finish({f:bentoFraction(this.st),done:this.st.count,fail:this.opts.hard,stars:0})},
]);
}
finish(r){this.stop();this.onEnd(r);}
lose(){
this.paused=true;
const info=this.starInfo(false);
card(`<div class="big">😣</div><h2>Chưa đạt</h2><p>${esc(this.st.loseWhy)}</p><p>Đã xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}.</p>${this.starsHtml(info)}`,[
{label:'🔁 Làm lại (🧠 −4)',on:()=>{this.meta.onRetry&&this.meta.onRetry();this.stop();this.start(this.opts,this.who,this.meta,this.onEnd);}},
{label:'Chịu thua, nhận phê bình',cls:'ghost',on:()=>this.finish({f:bentoFraction(this.st),done:this.st.count,fail:true,stars:info.stars,starLines:info.lines})},
]);
}
win(){
this.paused=true;
this.overhead.say(this.who.player,'お疲れ様でした！',3);
const info=this.starInfo(true);
card(`<div class="big">✅</div><h2>Hết ca! <span class="jp">お疲れ様でした</span></h2><p>Khay cơm nào cũng đều tay và sạch sẽ.</p>${this.starsHtml(info)}`,[
{label:'Về thôi →',on:()=>this.finish({f:1,done:this.st.count,fail:false,stars:info.stars,starLines:info.lines})},
]);
}
update(dt){
if(!this.active)return;
const s=this.st,P=this.who.player,portrait=isPortrait();
P.holder.visible=false;
P.play('idle');
if(!this.paused){
if(this.intro>0)this.intro-=dt;
else{
const ev=step(s,dt);
if(ev.includes('miss_pass')){
this.tip('遅れてるよ！','“Chậm rồi đó!” — một khay đã trôi qua',2.8);
if(this.who.foreman)this.overhead.say(this.who.foreman,'遅れてるよ！ — Chậm rồi đó!',2.5);
}
if(ev.includes('lose'))this.lose();
if(ev.includes('win')&&this.endT<0)this.endT=0.5;
}
this.stage.syncTrays(s.trays);
}
if(this.endT>=0&&!this.paused){this.endT-=dt;if(this.endT<0)this.win();}
if(this.intro>0){
const fov=portrait?54:44;
if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
this.tmp.set(...BENTO_ROOM.showcase.look);
this.camPos.set(...BENTO_ROOM.showcase.pos);
this.camRig.to(this.camPos,this.tmp,dt,3);
this.stage.fpTongs?.setVisible(false);
}else{
const aspect=(canvas.clientWidth||375)/Math.max(1,canvas.clientHeight||812);
const fp=fpCamera(aspect);
if(camera.fov!==fp.fov){camera.fov=fp.fov;camera.updateProjectionMatrix();}
this.camPos.set(fp.eye[0],fp.eye[1],fp.eye[2]);
this.camLook.set(fp.look[0],fp.look[1],fp.look[2]);
this.camRig.to(this.camPos,this.camLook,dt,5);
this.stage.fpTongs?.setVisible(true);
this.stage.fpTongs?.syncCamera(camera,dt);
}
this.hud();
}
}
