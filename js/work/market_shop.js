/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{tick}from'../core/evening.js';
import{clock}from'../core/morning.js';
import{yen,save}from'../core/state.js';
import{
CLERK_LINES,goodOf,discount,priceOf,addToCart,removeFromCart,cartTotal,checkout,
}from'../core/market_rules.js';
import{MARKET}from'../gfx/market.js';
import{camera,isPortrait}from'../gfx/stage.js';
import{$,show,card,esc,toast}from'../ui/ui.js';
const WALK=2.6;
export class MarketShop{
constructor({controls,overhead,camRig}){
Object.assign(this,{controls,overhead,camRig});
this.dir=new THREE.Vector3();
this.camPos=new THREE.Vector3();
this.camLook=new THREE.Vector3();
this.raycaster=new THREE.Raycaster();
this.ndc=new THREE.Vector2();
this.active=false;
this.paused=false;
this.cart=[];
this.toCounter=false;
this.toDoor=false;
this.bestD=Infinity;
this.stuckT=0;
this.btn={};
this.mine=[];
for(const a of[
{id:'pay',icon:'🧾',label:'Thanh toán',jp:'お会計',main:true},
{id:'out',icon:'🚪',label:'Ra phố',jp:'出る'},
]){
const b=document.createElement('button');
b.type='button';
b.className='act'+(a.main?' main':'');
b.dataset.id=a.id;
b.innerHTML=`<span class="i">${a.icon}</span><span class="l">${a.label}</span><span class="j">${a.jp}</span>`;
b.addEventListener('pointerdown',(e)=>{e.preventDefault();this.action(a.id);});
this.btn[a.id]=b;
this.mine.push(b);
}
this.cartBar=document.createElement('div');
this.cartBar.className='market-bar';
this.cartBar.hidden=true;
$('shifthud').appendChild(this.cartBar);
let down=null;
const canvas=$('c');
canvas.addEventListener('pointerdown',(e)=>{
if(!this.active||this.paused)return;
down={x:e.clientX,y:e.clientY,id:e.pointerId};
});
canvas.addEventListener('pointerup',(e)=>{
if(!down||e.pointerId!==down.id||!this.active||this.paused)return;
const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);
down=null;
if(moved<14)this.onCanvasTap(e.clientX,e.clientY);
});
$('sh-quit').addEventListener('click',()=>{
if(this.active&&!this.paused)this.leave();
});
}
start({S,ev,stage,who,setStage,dayLabel,storage=null,onExit}){
Object.assign(this,{S,ev,stage,who,setStage,dayLabel,storage,onExit});
this.cart=[];
this.active=true;
this.paused=false;
this.toCounter=false;
this.toDoor=false;
this.bestD=Infinity;
this.stuckT=0;
const box=$('acts');
if(!this.saved)this.saved=[...box.children];
box.replaceChildren(...this.mine);
show('dayhud',false);
show('shifthud');
show('sh-gust',false);
this.cartBar.hidden=false;
this.setStage('market');
const P=this.who.player;
P.unpinAll();
if(P.helmet)P.helmet.visible=false;
if(P.cap)P.cap.visible=false;
if(P.waders)P.waders.setVisible(false);
P.holder.rotation.x=0;
P.holder.position.set(MARKET.door.x,0,MARKET.door.z);
P.yaw=-0.5;
P.play('idle');
if(this.who.clerk){
const C=this.who.clerk;
C.holder.position.set(MARKET.clerk.x,0,MARKET.clerk.z);
C.yaw=Math.PI;
C.play('idle');
this.overhead.say(C,'いらっしゃいませ！ — Xin kính chào quý khách!',4);
}
this.stage.syncDiscounts(this.ev.min);
this.controls.reset({yaw:0,pitch:0.55,groundY:0,yawLimit:[-0.6,0.6]});
this.controls.enabled=true;
this.controls.onTap=null;
$('sh-place').querySelector('span').textContent='Siêu thị スーパー さくら';
this.camRig.init=false;
this.lastCartKey='';
this.hud(true);
}
_hide(){
this.active=false;
this.controls.enabled=false;
this.cartBar.hidden=true;
if(this.saved){
$('acts').replaceChildren(...this.saved);
this.saved=null;
}
show('shifthud',false);
show('sh-tip',false);
}
onCanvasTap(clientX,clientY){
if(!this.stage||!this.stage.pickTargets)return;
const rect=$('c').getBoundingClientRect();
this.ndc.x=((clientX-rect.left)/rect.width)*2-1;
this.ndc.y=-((clientY-rect.top)/rect.height)*2+1;
this.raycaster.setFromCamera(this.ndc,camera);
const hits=this.raycaster.intersectObjects(this.stage.pickTargets,true);
for(const h of hits){
let o=h.object;
while(o&&!o.userData?.goodId)o=o.parent;
const id=o?.userData?.goodId;
if(id&&goodOf(id)){
this.pickGood(id,h.point);
return;
}
}
}
pickGood(id,hitPoint=null){
const g=goodOf(id);
if(!g)return;
addToCart(this.cart,id);
const d=discount(id,this.ev.min);
const tagTxt=d.tag?` (${d.tag} -${Math.round(d.rate * 100)}%)`:'';
const P=this.who.player;
this.overhead.say(P,`${g.icon} ${g.jp} — ${g.vi} · ${d.price} ¥${tagTxt}`,2.2);
if(hitPoint){
const tx=THREE.MathUtils.clamp(hitPoint.x*0.7,-1.6,1.6);
const tz=THREE.MathUtils.clamp(hitPoint.z+0.65,-1.45,1.8);
this.controls.target=new THREE.Vector3(tx,0,tz);
this.toCounter=false;
this.toDoor=false;
}
this.hud(true);
}
action(id){
if(!this.active||this.paused)return;
if(id==='out'){
this.toCounter=false;
this.toDoor=true;
this.controls.target=new THREE.Vector3(MARKET.door.x,0,MARKET.door.z);
return;
}
if(id==='pay'){
if(this.cart.length===0){
toast('🛒 Giỏ hàng đang trống','Chạm vào món ăn trên kệ để bỏ vào giỏ trước khi thanh toán.');
return;
}
const pos=this.who.player.holder.position;
if(Math.hypot(pos.x-MARKET.checkout.x,pos.z-MARKET.checkout.z)<0.95){
this.openCheckout();
}else{
this.toDoor=false;
this.toCounter=true;
this.controls.target=new THREE.Vector3(MARKET.checkout.x,0,MARKET.checkout.z);
}
}
}
openCheckout(){
if(this.paused||this.cart.length===0)return;
this.paused=true;
this.toCounter=false;
this.controls.target=null;
const P=this.who.player;
P.yaw=0;
P.play('idle');
if(this.who.clerk){
this.who.clerk.play('talk');
this.overhead.say(this.who.clerk,CLERK_LINES.bag.jp.replace(/[「」]/g,''),4);
}
const min=this.ev.min;
const tot=cartTotal(this.cart,min);
card(`<h2>🧾 Quầy thanh toán · レジ</h2>
      <p class="jpline">${esc(CLERK_LINES.bag.jp)}</p>
      <p>${esc(CLERK_LINES.bag.vi)}</p>
      <p class="lesson">🛒 Giỏ hàng: <b>${this.cart.length} món · ${yen(tot)}</b> · Tiền hiện có: <b>${yen(this.S.money)}</b></p>`,[
{label:`${CLERK_LINES.bag.yes.jp} — ${CLERK_LINES.bag.yes.vi}`,on:()=>this.askCard(true)},
{label:`${CLERK_LINES.bag.no.jp} — ${CLERK_LINES.bag.no.vi}`,cls:'ghost',on:()=>this.askCard(false)},
]);
}
askCard(wantBag){
if(this.who.clerk){
this.who.clerk.play('talk');
this.overhead.say(this.who.clerk,CLERK_LINES.card.jp.replace(/[「」]/g,''),4);
}
const min=this.ev.min;
const tot=cartTotal(this.cart,min)+(wantBag?5:0);
card(`<h2>🧾 Quầy thanh toán · レジ</h2>
      <p class="jpline">${esc(CLERK_LINES.card.jp)}</p>
      <p>${esc(CLERK_LINES.card.vi)}</p>
      <p class="lesson">💴 Tổng thanh toán: <b>${yen(tot)}</b>${wantBag ? ' (đã gồm túi 5 ¥)' : ' (không lấy túi)'}</p>`,[
{label:`${CLERK_LINES.card.reply.jp} — ${CLERK_LINES.card.reply.vi}`,on:()=>this.finishCheckout(wantBag)},
]);
}
finishCheckout(wantBag){
show('modal',false);
if(this.who.clerk)this.who.clerk.play('idle');
const res=checkout(this.S,this.cart,this.ev.min,{bag:wantBag});
if(!res.ok){
this.paused=false;
toast('💴 Không đủ tiền!',`Cần ${yen(res.total)} nhưng bạn chỉ còn ${yen(this.S.money)}. Chạm món trong giỏ để bỏ bớt.`);
this.hud(true);
return;
}
if(this.storage)save(this.S,this.storage);
if(this.who.clerk)this.overhead.say(this.who.clerk,'ありがとうございます！ — Cảm ơn quý khách!',3);
toast('🛒 Đã mua đồ siêu thị',`-${yen(res.total)} · Đã cất ${res.bought.length} món vào tủ bếp ký túc xá`);
this.leave();
}
leave(){
show('modal',false);
this._hide();
if(this.onExit)this.onExit();
}
hud(force=false){
const min=this.ev.min;
const tot=cartTotal(this.cart,min);
const rem=this.S.money-tot;
const saleTag=min>=20*60?' · 🏷️ 半額 -50%':min>=19*60+30?' · 🏷️ 2割引 -20%':' · 🏷️ Giảm từ 19:30';
const goalTxt=`🌙 ${clock(min)}${saleTag}`;
const g=$('sh-goal');
if(g.textContent!==goalTxt)g.textContent=goalTxt;
const r=$('sh-rank');
const summaryTxt=`🛒 ${this.cart.length} món · ${yen(tot)} · 💴 còn ${yen(rem)}`;
if(r.textContent!==summaryTxt)r.textContent=summaryTxt;
this.btn.pay.disabled=this.cart.length===0;
const key=`${Math.floor(min)}:${this.cart.join(',')}:${this.S.money}`;
if(!force&&key===this.lastCartKey)return;
this.lastCartKey=key;
this.cartBar.textContent='';
if(this.cart.length===0){
const hint=document.createElement('span');
hint.className='market-hint';
hint.textContent='👆 Chạm món trên kệ để bỏ vào giỏ · 19:30 giảm 20% · 20:00 giảm 50%';
this.cartBar.appendChild(hint);
return;
}
this.cart.forEach((id,idx)=>{
const item=goodOf(id);
if(!item)return;
const pr=priceOf(id,min);
const chip=document.createElement('button');
chip.type='button';
chip.className='market-chip';
chip.innerHTML=`${item.icon} ${esc(item.vi)} <b>${pr}¥</b> <span>✕</span>`;
chip.addEventListener('click',(e)=>{
e.stopPropagation();
removeFromCart(this.cart,idx);
this.hud(true);
});
this.cartBar.appendChild(chip);
});
}
update(dt){
if(!this.active)return;
const P=this.who.player,pos=P.holder.position,c=this.controls;
const portrait=isPortrait();
let speed=0;
if(!this.paused){
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
this.toCounter=false;
this.toDoor=false;
}
if(mag>=0.05){
const ox=pos.x,oz=pos.z;
const sp=WALK*mag*dt;
pos.x+=this.dir.x*sp;
pos.z+=this.dir.z*sp;
for(const o of MARKET.blocks){
const dx=pos.x-o.x,dz=pos.z-o.z,dd=Math.hypot(dx,dz),rr=o.r+0.28;
if(dd<rr&&dd>1e-4){
pos.x=o.x+(dx/dd)*rr;
pos.z=o.z+(dz/dd)*rr;
}
}
pos.x=THREE.MathUtils.clamp(pos.x,MARKET.bounds.x0,MARKET.bounds.x1);
pos.z=THREE.MathUtils.clamp(pos.z,MARKET.bounds.z0,MARKET.bounds.z1);
speed=dt>0?Math.hypot(pos.x-ox,pos.z-oz)/dt:0;
let dy=Math.atan2(this.dir.x,this.dir.z)-P.yaw;
dy=Math.atan2(Math.sin(dy),Math.cos(dy));
P.yaw+=dy*Math.min(1,dt*12);
}
tick(this.ev,dt*0.65);
this.stage.syncDiscounts(this.ev.min);
if(this.toCounter&&(!c.target||Math.hypot(pos.x-MARKET.checkout.x,pos.z-MARKET.checkout.z)<0.85)){
this.toCounter=false;
this.openCheckout();
}else if(this.toDoor&&(!c.target||Math.hypot(pos.x-MARKET.door.x,pos.z-MARKET.door.z)<0.75)){
this.toDoor=false;
this.leave();
}
}
P.moveAt(speed);
const wantFov=portrait?56:46;
if(camera.fov!==wantFov){
camera.fov=wantFov;
camera.updateProjectionMatrix();
}
const fx=pos.x*0.35;
const fz=THREE.MathUtils.clamp(pos.z*0.35,-0.6,0.8);
this.camPos.set(fx,portrait?4.4:3.6,fz+(portrait?6.2:5.1));
this.camLook.set(fx*0.8,0.75,fz-1.15);
this.camRig.to(this.camPos,this.camLook,dt,5);
if(this.active)this.hud();
}
}
