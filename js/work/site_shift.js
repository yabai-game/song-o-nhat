/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{
createShift,step,hold,toggleRun,nudgeBalance,speedOf,
nearStack,nearRack,nearestStackKind,nearestRackSlot,
fraction,siteExtra,SITE,PIPE_KINDS,PIPE_ORDER,
}from'../core/site_rules.js';
import{starDetails}from'../core/stars.js';
import{DECK_Y,SITE_BOUNDS}from'../gfx/site.js';
import{camera,isPortrait}from'../gfx/stage.js';
import{$,show,card,esc}from'../ui/ui.js';
const ACTIONS=[
{id:'hold',icon:'🤲',label:'Nhấc / Đặt',jp:'持つ・置く',main:true},
{id:'run',icon:'🏃',label:'Chạy',jp:'走る'},
{id:'hi',icon:'🙋',label:'Chào',jp:'ご安全に'},
];
function starBoxHtml(info){
const rows=info.lines.map((l)=>`<div class="star-line${l.ok ? ' ok' : ''}">${esc(l.text)}</div>`).join('');
return`<div class="stars-box"><div class="stars-row">${info.starsText}</div><div class="stars-lines">${rows}</div></div>`;
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
export class SiteShift{
constructor({site,controls,overhead,camRig}){
Object.assign(this,{site,controls,overhead,camRig});
this.dir=new THREE.Vector3();this.tmp=new THREE.Vector3();this.camPos=new THREE.Vector3();this.camLook=new THREE.Vector3();
this.active=false;
this.tippedBal=false;
this.tippedTicket=false;
this._buildActions();
$('sh-quit').addEventListener('click',()=>this.askQuit());
addEventListener('resize',()=>{if(this.active)this.placeHud();});
hookOverhead(this.overhead,()=>{if(this.active)this.clampOverhead();});
}
_buildActions(){
const box=$('acts');box.textContent='';
this.btn={};
for(const a of ACTIONS){
const b=document.createElement('button');b.type='button';b.className='act'+(a.main?' main':'');b.dataset.id=a.id;
b.innerHTML=`<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.action(a.id);});
box.appendChild(b);this.btn[a.id]=b;
}
const bl=$('bal-l'),br=$('bal-r');
if(bl)bl.addEventListener('pointerdown',(e)=>{e.preventDefault();if(this.active&&this.st)nudgeBalance(this.st,-1);});
if(br)br.addEventListener('pointerdown',(e)=>{e.preventDefault();if(this.active&&this.st)nudgeBalance(this.st,1);});
addEventListener('keydown',(e)=>{
if(!this.active)return;
if(e.code==='Space'||e.code==='Digit1'){e.preventDefault();this.action('hold');}
if(e.code==='Digit2'||e.code==='ShiftLeft')this.action('run');
if(e.code==='Digit3')this.action('hi');
if(this.st&&this.st.carry){
if(e.code==='KeyA'||e.code==='ArrowLeft')nudgeBalance(this.st,-1);
if(e.code==='KeyD'||e.code==='ArrowRight')nudgeBalance(this.st,1);
}
});
}
start(opts,who,meta,onEnd){
this.opts=opts;this.who=who;this.meta=meta;this.onEnd=onEnd;
this.st=createShift(opts);
const p=who.player;
p.holder.position.set(-3,DECK_Y,1);p.yaw=-Math.PI/2;p.play('idle');
who.foreman.holder.position.set(1.4,DECK_Y,-1.4);who.foreman.yaw=0.3;
this.site.setPlaced(0);
if(this.site.setActiveKinds)this.site.setActiveKinds(this.st.pipeKinds);
if(this.site.setBundleKind)this.site.setBundleKind(this.st.ticket.kind);
this.site.setWeather({rain:opts.rain,pm:opts.hard});
this.bundle=this.site.bundle;this.bundle.visible=false;
p.unpinAll();
p.pin(this.bundle,p.armR,0.12,-0.04,-0.1);
if(p.helmet)p.helmet.visible=true;
this.controls.reset({yaw:Math.PI/2,pitch:0.34,groundY:DECK_Y,yawLimit:[-Infinity,Infinity]});
this.controls.enabled=true;
this.controls.onTap=(pt)=>this.onTap(pt);
this.pending=null;this.bowT=0;this.warned=false;
this.intro=2.8;this.active=true;this.paused=false;
this.btn.run.classList.remove('on');
show('dayhud',false);show('shifthud');show('sh-gust',false);show('sh-ticket',true);show('sh-bal',false);show('sh-gauge',false);
$('sh-place').querySelector('span').textContent='Công trường Saitama';
$('sh-rank').textContent=meta.rankLabel;
if(this.st.pipeKinds>=2&&!this.tippedTicket){
this.tippedTicket=true;
this.tip('指示書を確認！',`Nhấc đúng cỡ ống (${this.st.ticket.text}) và đặt đúng ô!`,6.5);
}else{
this.tip(opts.jp?opts.jp.replace(/[「」]/g,''):'持つ (motsu)',opts.vi||'Đi tới đống ống thép bên trái, nhấc đúng cỡ trên phiếu rồi vác sang giá bên phải');
}
this.hud();
this.overhead.say(who.foreman,'ご安全に！バランスに気をつけろ！ — Chúc an toàn! Chú ý giữ thăng bằng nhé!',5);
}
stop(){
this.active=false;this.controls.enabled=false;
show('shifthud',false);show('sh-tip',false);show('sh-gust',false);show('sh-ticket',false);show('sh-bal',false);
this.bundle.visible=false;this.who.player.unpinAll();this.who.player.shoulderTo=0;this.who.player.bendTo=0;
}
tip(jp,vi,sec=6.5){
const t=$('sh-tip');t.querySelector('b').textContent=jp;t.querySelector('span').textContent=vi;
t.hidden=false;clearTimeout(this.tipT);
this.tipT=setTimeout(()=>{t.hidden=true;this._hudSig='';this._obsTs=0;if(this.active)this.placeHud();},sec*1000);
this._hudSig='';
this._obsTs=0;
this.placeHud();
}
hud(){
const s=this.st;
let txt=`👷 ${s.count}/${s.goal} bó`;
if(s.limit)txt+=` · ⏱${Math.ceil(s.time)}s`;
if(s.maxMiss)txt+=` · ❌${s.miss}/${s.maxMiss}`;
else if(s.miss)txt+=` · ❌${s.miss}`;
const g=$('sh-goal');if(g.textContent!==txt)g.textContent=txt;
g.classList.toggle('warn',!!(s.limit&&s.time<10));
const tk=$('sh-ticket');
if(tk){
const tTxt=`📋 Phiếu: ${s.ticket.text}`;
if(tk.textContent!==tTxt)tk.textContent=tTxt;
}
const balOn=!!(s.carry&&!s.over);
show('sh-bal',balOn);
if(s.carry){
const needle=$('bal-needle');
if(needle)needle.style.left=`${Math.max(2, Math.min(98, (s.bal * 0.5 + 0.5) * 100)).toFixed(1)}%`;
const meter=document.querySelector('#sh-bal .bal-meter');
if(meter)meter.classList.toggle('danger',Math.abs(s.bal)>=0.65);
}
const tipEl=$('sh-tip'),gustEl=$('sh-gust'),barsEl=$('sh-bars'),rankEl=$('sh-rank');
const sig=`${window.innerWidth}x${window.innerHeight}|${rankEl?.textContent || ''}|${barsEl?.hidden ? 0 : 1}|${tk?.hidden ? 0 : (tk?.textContent || '')}|${tipEl?.hidden ? 0 : (tipEl?.textContent || '')}|${gustEl?.hidden ? 0 : 1}|${balOn ? 1 : 0}`;
if(this._hudSig!==sig){
this._hudSig=sig;
this.placeHud();
}
}
placeHud(){
const hud=$('shifthud');
if(!hud||hud.hidden)return;
this._obsTs=0;
const H=hud.getBoundingClientRect();
if(!H.width)return;
const imp=(el,k,v)=>{if(el&&el.style.getPropertyValue(k)!==v)el.style.setProperty(k,v,'important');};
const vis=(el)=>el&&!el.hidden;
const rank=$('sh-rank'),bars=$('sh-bars'),chips=$('sh-chips'),ticket=$('sh-ticket'),tip=$('sh-tip'),gust=$('sh-gust'),bal=$('sh-bal');
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
let tipBottom=low;
if(vis(tip)){
imp(tip,'top',(low+6)+'px');
tipBottom=Math.max(low,low+6+tip.offsetHeight);
}
if(vis(gust)){
imp(gust,'top',Math.ceil(tipBottom+8)+'px');
tipBottom=Math.max(tipBottom,tipBottom+8+gust.offsetHeight);
}
const place=$('sh-place');
if(vis(place)){
imp(place,'top',Math.ceil(tipBottom+6)+'px');
}
if(vis(bal)){
const bl=$('bal-l'),br=$('bal-r'),meter=bal.querySelector('.bal-meter');
const acts=$('acts'),joy=$('joy');
const ar=acts?acts.getBoundingClientRect():null;
const jr=joy?joy.getBoundingClientRect():null;
const gapL=jr&&jr.width?jr.right-H.left:150;
const gapR=ar&&ar.width?ar.left-H.left:W-160;
const gap=gapR-gapL;
const btnSize=52;
if(W>H.height&&gap>=300){
const cx=(gapL+gapR)*0.5;
const meterW=Math.min(184,Math.max(120,Math.floor(gap-136)));
const meterLeft=Math.round(cx-meterW*0.5);
const blLeft=Math.round(meterLeft-10-btnSize);
const brLeft=Math.round(meterLeft+meterW+10);
if(bl){imp(bl,'left',blLeft+'px');imp(bl,'right','auto');imp(bl,'bottom','14px');imp(bl,'width',btnSize+'px');imp(bl,'height',btnSize+'px');}
if(meter){imp(meter,'left',meterLeft+'px');imp(meter,'transform','none');imp(meter,'bottom','14px');imp(meter,'width',meterW+'px');}
if(br){imp(br,'left',brLeft+'px');imp(br,'right','auto');imp(br,'bottom',btnSize===52?'14px':'14px');imp(br,'width',btnSize+'px');imp(br,'height',btnSize+'px');}
}else{
const minControlTop=Math.min(
ar&&ar.height?ar.top-H.top:H.height,
jr&&jr.height?jr.top-H.top:H.height,
);
const bottomPx=Math.max(198,Math.round(H.height-minControlTop+10));
const meterW=Math.min(192,Math.max(120,Math.floor(W-152)));
const meterLeft=Math.round((W-meterW)*0.5);
if(bl){imp(bl,'left','16px');imp(bl,'right','auto');imp(bl,'bottom',bottomPx+'px');imp(bl,'width',btnSize+'px');imp(bl,'height',btnSize+'px');}
if(meter){imp(meter,'left',meterLeft+'px');imp(meter,'transform','none');imp(meter,'bottom',bottomPx+'px');imp(meter,'width',meterW+'px');}
if(br){imp(br,'left',Math.round(W-16-btnSize)+'px');imp(br,'right','auto');imp(br,'bottom',bottomPx+'px');imp(br,'width',btnSize+'px');imp(br,'height',btnSize+'px');}
}
}
}
_refreshObstacles(W,H){
const now=performance.now();
if(this._obstacles&&now-(this._obsTs||0)<200&&this._obsW===W&&this._obsH===H)return;
this._obsTs=now;
this._obsW=W;
this._obsH=H;
const vis=(el)=>el&&!el.hidden;
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
const hudEls=[
$('sh-rank'),$('sh-bars'),$('sh-ticket'),$('sh-tip'),$('sh-gust'),
$('joy'),$('acts'),$('toast'),
];
if(vis($('sh-bal'))){
hudEls.push($('bal-l'),document.querySelector('#sh-bal .bal-meter'),$('bal-r'));
}
for(const el of hudEls){
if(!vis(el))continue;
const r=el.getBoundingClientRect();
if(r.width&&r.height)obstacles.push({l:r.left,t:r.top,r:r.right,b:r.bottom});
}
this._obstacles=obstacles;
this._minY=minY;
}
clampOverhead(){
if(!this.overhead||!this.overhead.items||!this.overhead.items.length)return;
const W=window.innerWidth,H=window.innerHeight;
if(!W||!H)return;
this._refreshObstacles(W,H);
const obstacles=this._obstacles;
const minY=this._minY;
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
for(let i=this.overhead.items.length-1;i>=0;i--){
const it=this.overhead.items[i];
if(!it||!it.el||it.el.hidden||!it.vis||!it.w||!it.h)continue;
const w=Math.ceil(it.w),h=Math.ceil(it.h);
const maxX=Math.max(10,Math.floor(W-w-10));
const maxY=Math.max(minY,Math.floor(H-h-10));
const clampX=(v)=>Math.max(10,Math.min(maxX,Math.round(v)));
const clampY=(v)=>Math.max(minY,Math.min(maxY,Math.round(v)));
let bestX=clampX(it.left),bestY=clampY(it.top);
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
const tr=`translate3d(${bestX}px, ${bestY}px, 0)`;
if(it._tr!==tr){it._tr=tr;it.el.style.transform=tr;}
placed.push({l:bestX,t:bestY,r:bestX+w,b:bestY+h});
}
}
action(id){
if(!this.active||this.paused||this.intro>0)return;
const p=this.who.player.holder.position,s=this.st;
if(id==='run'){
const on=toggleRun(s);this.btn.run.classList.toggle('on',on);
on?this.tip('走る (hashiru)','Đang chạy — kim thăng bằng lệch nhanh ×1.4!',3):this.tip('歩く (aruku)','Đi bộ, dễ giữ thăng bằng hơn',3);
}else if(id==='hi'){
this.bowT=0.9;
this.overhead.say(this.who.player,'ご安全に！',2.5);
setTimeout(()=>this.active&&this.overhead.say(this.who.foreman,'ご安全に！いい挨拶だ。 — Chúc an toàn! Chào hay lắm.',3),600);
this.tip('ご安全に！','“Chúc an toàn!” — câu chào đặc trưng ở công trường Nhật',4);
}else if(id==='hold'){
const r=hold(s,p.x,p.z);
if(r==='far-stack')this.tip('もっと近くに！',`Lại gần đống ống ${s.ticket.icon} ${s.ticket.jp} (${s.ticket.vi}) bên trái đã`,3);
else if(r==='far-rack')this.tip('もっと奥へ',`Giá để ống ô ${s.ticket.slot} ở bên phải, đi tiếp nhé`,3);
else if(r==='wrong-kind'){
this.tip('サイズが違うぞ！',`Sai cỡ ống! Phiếu yêu cầu: ${s.ticket.text}`,3.8);
this.overhead.say(this.who.foreman,`違う！${s.ticket.jp}のパイプだ！`,2.5);
if(s.over==='lose')this.lose();
}else if(r==='wrong-slot'){
this.tip('置き場所が違う！',`Sai ô! Bó này phải đặt vào ô ${s.ticket.slot} (${s.ticket.text})`,3.8);
this.overhead.say(this.who.foreman,`${s.ticket.slot}の枠に置け！`,2.5);
if(s.over==='lose')this.lose();
}else if(r==='bend'){
const info=PIPE_KINDS[s.ticket.kind];
const t=s.carry?info.rack:info.stack;
this.who.player.yaw=Math.atan2(t.x-p.x,t.z-p.z);
this.controls.target=null;this.pending=null;
}
this.hud();
}
}
onTap(pt){
if(!this.active||this.st.over)return;
const s=this.st;
const n=Math.max(1,Math.min(3,s.pipeKinds||1));
let target=null;
for(let i=0;i<n;i++){
const k=PIPE_ORDER[i];
const spot=s.carry?PIPE_KINDS[k].rack:PIPE_KINDS[k].stack;
if(Math.hypot(pt.x-spot.x,pt.z-spot.z)<2.1){target=spot;break;}
}
if(!target){this.pending=null;return;}
this.pending=target;
const p=this.who.player.holder.position,dx=p.x-target.x,dz=p.z-target.z,d=Math.hypot(dx,dz)||1;
this.controls.target.set(target.x+dx/d*1.6,DECK_Y,target.z+dz/d*1.6);
}
computeStars(won){
const s=this.st;
return starDetails({
won,
miss:s.miss,
maxMiss:s.maxMiss,
timeLeft:s.time,
limit:s.limit,
extra:siteExtra(s),
extraLabel:'Không làm rơi bó ống nào',
});
}
askQuit(){
if(!this.active||this.paused)return;
this.paused=true;
card(`<h2>Về sớm?</h2><p>Mới xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}. Về sớm thì chỉ được tính phần đã làm.</p>`,[
{label:'Làm tiếp',on:()=>{this.paused=false;}},
{label:'Về sớm',cls:'ghost',on:()=>this.finish({f:fraction(this.st),done:this.st.count,fail:this.opts.hard,starInfo:this.computeStars(false)})},
]);
}
finish(r){this.stop();this.onEnd(r);}
update(dt,t){
if(!this.active)return;
const s=this.st,p=this.who.player,pos=p.holder.position;
const c=this.controls;
let moving=false,speed=0;
if(!this.paused&&this.intro<=0&&s.busy<=0&&!s.over){
let mag=c.input(this.dir);
if(mag<0.05&&c.target){
this.dir.set(c.target.x-pos.x,0,c.target.z-pos.z);
const d=this.dir.length();
if(d<0.08){c.target=null;mag=0;}else{this.dir.multiplyScalar(1/d);mag=1;}
}else if(mag>=0.05){this.dir.multiplyScalar(1/Math.max(mag,1e-4));}
if(mag>=0.05){
moving=true;
const ox=pos.x,oz=pos.z;
const sp=speedOf(s,this.opts.walk)*mag*dt;
pos.x+=this.dir.x*sp;pos.z+=this.dir.z*sp;
const n=Math.max(1,Math.min(3,s.pipeKinds||1));
for(let i=0;i<n;i++){
const k=PIPE_ORDER[i];
for(const o of[PIPE_KINDS[k].stack,PIPE_KINDS[k].rack]){
const dx=pos.x-o.x,dz=pos.z-o.z,dd=Math.hypot(dx,dz),rr=0.92;
if(dd<rr&&dd>1e-4){pos.x=o.x+dx/dd*rr;pos.z=o.z+dz/dd*rr;}
}
}
const f=this.who.foreman.holder.position,dx=pos.x-f.x,dz=pos.z-f.z,dd=Math.hypot(dx,dz);
if(dd<0.7&&dd>1e-4){pos.x=f.x+dx/dd*0.7;pos.z=f.z+dz/dd*0.7;}
pos.x=THREE.MathUtils.clamp(pos.x,SITE_BOUNDS.x0,SITE_BOUNDS.x1);
pos.z=THREE.MathUtils.clamp(pos.z,SITE_BOUNDS.z0,SITE_BOUNDS.z1);
speed=dt>0?Math.hypot(pos.x-ox,pos.z-oz)/dt:0;
const want=Math.atan2(this.dir.x,this.dir.z);
let dy=want-p.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
p.yaw+=dy*Math.min(1,dt*12);
}
}
p.moveAt(speed);
p.shoulderTo=s.carry?1:0;
if(!this.paused){
if(this.intro>0)this.intro-=dt;
else this.events(step(s,dt,moving));
}
if(this.pending&&!c.target&&s.busy<=0){
const tgt=this.pending;
this.pending=null;
if(Math.hypot(pos.x-tgt.x,pos.z-tgt.z)<=SITE.REACH)this.action('hold');
}
if(this.bowT>0)this.bowT-=dt;
p.bendTo=s.busy>0?1:this.bowT>0?0.55:0;
this.bundle.visible=s.carry;
const risk=s.carry?Math.min(1,Math.abs(s.bal)):0;
const gusty=s.gust>0?1:0;
const tilt=this.bundle.userData.tilt;
tilt.rotation.z=s.bal*0.32+Math.sin(t*(10+risk*16))*(0.02+risk*0.14+gusty*0.12);
tilt.rotation.x=-0.3+Math.sin(t*7.3)*(risk*0.1+gusty*0.06);
if(risk>0.65&&!this.warned){this.warned=true;this.tip('バランス注意！','Ống đang nghiêng mạnh — bấm ◀ ▶ (A/D) hoặc đứng yên!',2.0);}
if(risk<0.35)this.warned=false;
const tkInfo=PIPE_KINDS[s.ticket.kind]||PIPE_KINDS.short;
const goal=s.carry?tkInfo.rack:tkInfo.stack;
this.site.ring.position.set(goal.x,DECK_Y+0.03,goal.z);
this.site.ring.scale.setScalar(1+Math.sin(t*6)*0.05);
const inReach=s.carry
?nearestRackSlot(pos.x,pos.z,s.pipeKinds,SITE.REACH)!==null
:nearestStackKind(pos.x,pos.z,s.pipeKinds,SITE.REACH)!==null;
this.btn.hold.classList.toggle('hot',inReach);
const lbl=s.carry?(inReach?`Đặt ô ${s.ticket.slot}`:'Đang vác'):(inReach?`Nhấc ${s.ticket.jp}`:'Nhấc / Đặt');
if(this.btn.hold.dataset.l!==lbl){
this.btn.hold.dataset.l=lbl;
this.btn.hold.querySelector('.l').textContent=lbl;
this.btn.hold.querySelector('.j').textContent=s.carry?'置く':'持つ';
}
const fp=this.who.foreman.holder.position;
this.who.foreman.yaw=Math.atan2(pos.x-fp.x,pos.z-fp.z);
const portrait=isPortrait();
const wantFov=portrait?56:46;
if(camera.fov!==wantFov){camera.fov=wantFov;camera.updateProjectionMatrix();}
if(this.intro>0){
this.camRig.to(this.site.showcase.pos,this.site.showcase.look,dt,3);
}else{
c.follow(p.yaw+Math.PI,moving,dt);
const dist=4.6*(portrait?1.1:1);
const cp=Math.cos(c.pitch);
this.camPos.set(pos.x+Math.sin(c.yaw)*dist*cp,pos.y+1.45+Math.sin(c.pitch)*dist,pos.z+Math.cos(c.yaw)*dist*cp);
this.camLook.set(pos.x-Math.sin(c.yaw)*2.2,pos.y+0.75,pos.z-Math.cos(c.yaw)*2.2);
this.camRig.to(this.camPos,this.camLook,dt,6);
}
this.hud();
}
events(list){
const s=this.st,who=this.who;
for(const e of list){
if(e==='pick'){
if(this.site.setBundleKind)this.site.setBundleKind(s.carryKind||s.ticket.kind);
if(!this.tippedBal){
this.tippedBal=true;
this.tip('バランスを取れ！','Giữ kim thăng bằng ở giữa bằng 2 nút ◀ ▶ (hoặc phím A / D)!',5);
}else{
this.tip('置く (oku)',`Vác sang giá bên phải, đặt vào ô ${s.ticket.slot} (${s.ticket.text})`,4);
}
}else if(e==='place'){
this.site.setPlaced(s.count);
if(this.site.setBundleKind)this.site.setBundleKind(s.ticket.kind);
this.overhead.say(who.foreman,'よし、次！ — Tốt, bó tiếp!',2);
if(s.count<s.goal)this.tip('次の指示！',`Tốt lắm! Phiếu tiếp theo: ${s.ticket.text}`,3.5);
}else if(e==='drop-balance'||e==='drop-run'||e==='drop-gust'){
this.tmp.copy(who.player.holder.position);this.tmp.y+=1.3;this.site.dropAt(this.tmp);
this.btn.run.classList.remove('on');
if(e==='drop-gust'){
this.overhead.say(who.foreman,'止まれって言っただろ！ — Đã bảo dừng lại mà!',3);
this.tip('止まれ！','“Dừng lại!” — gió giật làm rơi ống',4);
}else{
this.overhead.say(who.foreman,'バランス崩したぞ！ — Mất thăng bằng kìa!',4);
this.tip('危ない！','Mất thăng bằng làm rơi ống — nhớ bấm ◀ ▶ (A/D) giữ kim ở giữa!',4.5);
}
}else if(e==='gust-start'){show('sh-gust',true);this.placeHud();}
else if(e==='gust-end'){show('sh-gust',false);this.placeHud();}
else if(e==='lose')this.lose();
else if(e==='win')this.win();
}
}
lose(){
this.paused=true;
const starInfo=this.computeStars(false);
card(`<div class="big">😣</div><h2>Chưa đạt</h2><p>${esc(this.st.loseWhy)}</p><p>Đã xong ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}.</p>${starBoxHtml(starInfo)}`,[
{label:'🔁 Làm lại (🧠 −4)',on:()=>{this.meta.onRetry&&this.meta.onRetry();this.stop();this.start(this.opts,this.who,this.meta,this.onEnd);}},
{label:'Chịu thua, nhận phê bình',cls:'ghost',on:()=>this.finish({f:fraction(this.st),done:this.st.count,fail:true,stars:starInfo.stars,starLines:starInfo.lines,starInfo})},
]);
}
win(){
this.paused=true;
const starInfo=this.computeStars(true);
this.overhead.say(this.who.player,'お疲れ様でした！',3);
card(`<div class="big">✅</div><h2>Hết ca! <span class="jp">お疲れ様でした</span></h2>${starBoxHtml(starInfo)}`,[
{label:'Về thôi →',on:()=>this.finish({f:1,done:this.st.count,fail:false,stars:starInfo.stars,starLines:starInfo.lines,starInfo})},
]);
}
}
