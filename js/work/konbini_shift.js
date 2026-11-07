/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{
GOODS,HOT_KEYS,DENOMS,PHRASES,
createKonbini,step,useHint,say,scan,addHot,answer,
payIC,addChange,clearChange,giveChange,konbiniExtra,konbiniFraction,
}from'../core/konbini_rules.js';
import{KONBINI_STORE,konbiniCamera}from'../core/konbini_view.js';
import{starDetails}from'../core/stars.js';
import{camera,canvas}from'../gfx/stage.js';
import{$,show,card,esc}from'../ui/ui.js';
const PHRASE_SETS={
welcome:['welcome','otsukare','itadaki'],
warm:['warm','chopsticks','bag'],
chopsticks:['warm','chopsticks','bag'],
bag:['warm','chopsticks','bag'],
thanks:['thanks','gochisou','itterasshai'],
};
const ANS_UI={
warm:{
yesJp:'「はい、お願いします」',
yesVi:'Khách: Vâng, hâm nóng giúp tôi',
noJp:'「大丈夫です」',
noVi:'Khách: Không cần hâm đâu',
btnYes:{icon:'🔥',vi:'Hâm nóng',jp:'温める'},
btnNo:{icon:'❄️',vi:'Không hâm',jp:'そのまま'},
},
chopsticks:{
yesJp:'「はい、お願いします」',
yesVi:'Khách: Vâng, cho tôi xin đũa',
noJp:'「いりません」',
noVi:'Khách: Không cần đũa đâu',
btnYes:{icon:'🥢',vi:'Đưa đũa',jp:'お箸あり'},
btnNo:{icon:'✋',vi:'Không lấy đũa',jp:'お箸なし'},
},
bag:{
yesJp:'「はい、1枚お願いします」',
yesVi:'Khách: Vâng, lấy 1 túi (+3円)',
noJp:'「袋はいりません」',
noVi:'Khách: Không lấy túi',
btnYes:{icon:'🛍️',vi:'Có túi (+3円)',jp:'レジ袋 3円'},
btnNo:{icon:'♻️',vi:'Không túi',jp:'袋なし 0円'},
},
};
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
export class KonbiniShift{
constructor({stage,controls,overhead,camRig}){
Object.assign(this,{stage,controls,overhead,camRig});
this.camPos=new THREE.Vector3();
this.camLook=new THREE.Vector3();
this.raycaster=new THREE.Raycaster();
this.pointerNdc=new THREE.Vector2();
this.active=false;
this.uiSig='';
this.custAnchor=new THREE.Object3D();
this.custAnchor.position.set(KONBINI_STORE.counterCustomer.x,1.84,KONBINI_STORE.counterCustomer.z);
this.queueAnchor=new THREE.Object3D();
this.queueAnchor.position.set(KONBINI_STORE.queueSpot.x,1.82,KONBINI_STORE.queueSpot.z);
if(this.stage?.scene){
this.stage.scene.add(this.custAnchor,this.queueAnchor);
}
this.panel=document.createElement('div');
this.panel.className='kb-panel';
$('sh-quit').addEventListener('click',()=>this.active&&this.askQuit());
hookOverhead(this.overhead,()=>{if(this.active)this.clampOverhead();});
canvas.addEventListener('pointerdown',(e)=>{
if(!this.active||this.paused||!this.st||this.st.over)return;
this.onCanvasTap(e);
});
addEventListener('keydown',(e)=>{
if(!this.active||this.paused||!this.st||this.st.over)return;
this.onKey(e);
});
}
start(opts,who,meta,onEnd){
Object.assign(this,{opts,who,meta,onEnd});
this.st=createKonbini(opts);
const P=who.player,F=who.foreman;
P.unpinAll();
P.holder.rotation.x=0;
P.bendTo=0;
P.reachTo=0;
P.pickT=-1;
P.holder.position.set(KONBINI_STORE.player.x,0,KONBINI_STORE.player.z);
P.yaw=KONBINI_STORE.player.yaw;
P.play('idle');
this.prevPlayerVis=P.holder.visible;
P.holder.visible=false;
if(F){
F.holder.position.set(KONBINI_STORE.foreman.x,0,KONBINI_STORE.foreman.z);
F.yaw=KONBINI_STORE.foreman.yaw;
F.play('idle');
}
const box=$('acts');
if(!this.saved)this.saved=[...box.children];
box.replaceChildren(this.panel);
box.classList.add('konbini-acts');
show('dayhud',false);
show('shifthud');
show('sh-gust',false);
show('joy',false);
show('sh-bal',false);
show('sh-gauge',false);
show('sh-ticket',false);
show('toast',false);
$('sh-place').classList.remove('flash');
$('sh-place').querySelector('span').textContent='Cửa hàng サクラマート · レジ';
$('sh-rank').textContent=meta.rankLabel;
this.controls.reset({yaw:0,pitch:0.35,groundY:0,yawLimit:[0,0]});
this.controls.enabled=false;
this.controls.target=null;
this.controls.onTap=null;
this.removeTags();
this.custTag=this.overhead.tag(this.custAnchor,'',false,0);
this.custTag.el.classList.add('care','konbini-tag');
this.queueTag=this.overhead.tag(this.queueAnchor,'',false,0);
this.queueTag.el.classList.add('care','konbini-tag');
this.queueTag.el.hidden=true;
const aspect=camera.aspect||((window.innerWidth||375)/Math.max(1,window.innerHeight||812));
const kc=konbiniCamera(aspect);
this.prevFov=camera.fov;
camera.fov=kc.fov;
camera.updateProjectionMatrix();
this.camPos.set(...kc.eye);
this.camLook.set(...kc.look);
this.camRig.snap(this.camPos,this.camLook);
this.uiSig='';
this.active=true;
this.paused=false;
this.endT=-1;
this.stage.syncShift?.(this.st);
const tipVi=this.st.oddChange
?'Chào khách → Quét mã & hỏi hâm/đũa/túi → Khách đưa tiền lẻ để nhận chẵn, tính đúng お釣り!'
:this.st.hot
?'Chào khách → Quét mã & gắp đồ nóng (からあげ棒/肉まん) → Hỏi hâm/đũa/túi → Thối đúng tiền!'
:'Chào いらっしゃいませ → Quét mã vạch → Hỏi hâm nóng/đũa → Gom đúng tiền thối お釣り → Cảm ơn!';
this.tip('いらっしゃいませ！',tipVi,4.5);
this.hud();
}
removeTags(){
for(const t of[this.custTag,this.queueTag]){
if(!t)continue;
t.el.remove();
const idx=this.overhead.items.indexOf(t);
if(idx>=0)this.overhead.items.splice(idx,1);
}
this.custTag=null;
this.queueTag=null;
}
stop(){
this.active=false;
this.controls.enabled=false;
show('joy',true);
show('sh-ticket',false);
const box=$('acts');
box.classList.remove('konbini-acts');
if(this.saved){
box.replaceChildren(...this.saved);
this.saved=null;
}
this.removeTags();
this.stage.syncShift?.(null);
if(this.prevFov!==undefined){
camera.fov=this.prevFov;
camera.updateProjectionMatrix();
}
show('shifthud',false);
show('sh-tip',false);
clearTimeout(this.tipT);
if(this.who&&this.who.player){
this.who.player.holder.visible=this.prevPlayerVis??true;
this.who.player.bendTo=0;
this.who.player.reachTo=0;
}
}
tip(jp,vi,sec=4.0){
const t=$('sh-tip');
t.querySelector('b').textContent=jp;
t.querySelector('span').textContent=vi;
t.hidden=false;
clearTimeout(this.tipT);
this.tipT=setTimeout(()=>{t.hidden=true;},sec*1000);
}
phraseChoicesFor(c){
if(Array.isArray(c.choices)&&c.choices.length===3){
return c.choices.map((p)=>p.id);
}
const q=c.questions?.[c.qIdx];
const needId=c.step==='greet'?'welcome':c.step==='ask'?(q?.id||'bag'):'thanks';
const base=PHRASE_SETS[needId]||['welcome','warm','thanks'];
const shift=(c.id+(c.qIdx||0))%base.length;
return base.map((_,i)=>base[(i+shift)%base.length]);
}
showHintNow(c){
if(!c)return true;
return!!c.hintShown||this.st.hintDelay===0||(c.promptTimer||0)>=this.st.hintDelay;
}
updateTags(){
const s=this.st;
const c=s?.cur;
if(this.custTag){
if(!c||c.step==='done'){
this.custTag.el.hidden=true;
}else{
this.custTag.el.hidden=false;
const sec=Math.max(0,Math.ceil(c.patience));
const pct=Math.max(0,Math.min(100,Math.round((c.patience/Math.max(1,c.maxPatience))*100)));
const scannedCount=c.items.filter((it)=>it.scanned).length;
const curQ=c.questions?.[c.qIdx];
let statusTxt=`👤 Khách ${s.count + 1}/${s.goal}`;
if(c.step==='greet'){
statusTxt='🏪 Khách vào quầy';
}else if(c.step==='scan'){
if(c.hotWant&&!c.hotAdded){
const hGood=GOODS[c.hotWant];
statusTxt=`「${hGood.icon} ${hGood.jp}もください」`;
}else{
statusTxt=`「お願いします」 (${scannedCount}/${c.items.length})`;
}
}else if(c.step==='ask'){
const qId=curQ?.id||'bag';
const qIcon=qId==='warm'?'🔥':qId==='chopsticks'?'🥢':'🛍️';
statusTxt=`${qIcon} Hỏi khách (${c.qIdx + 1}/${c.questions.length})`;
}else if(c.step==='ans'){
const ui=ANS_UI[curQ?.id]||ANS_UI.warm;
statusTxt=curQ?.yes?ui.yesJp:ui.noJp;
}else if(c.step==='pay'){
statusTxt=c.payMethod==='ic'?'💳 「ICカードで」':`💴 Đưa ${c.tendered}円`;
}else if(c.step==='thanks'){
statusTxt='😊 Đã nhận tiền/hàng';
}
const sig=`${statusTxt}|${sec}|${pct < 30 ? 1 : 0}`;
if(this.custTag._sig!==sig){
this.custTag._sig=sig;
this.custTag.el.classList.toggle('urgent',pct<30);
this.custTag.el.innerHTML=`<span class="kt-line">${esc(statusTxt)} · <b>⏳${sec}s</b></span><span class="kt-bar"><i style="width:${pct}%"></i></span>`;
}
}
}
if(this.queueTag){
const q=s?.queue?.[0];
if(!q){
this.queueTag.el.hidden=true;
}else{
this.queueTag.el.hidden=false;
const qSec=Math.max(0,Math.ceil(q.patience));
const qPct=Math.max(0,Math.min(100,Math.round((q.patience/Math.max(1,q.maxPatience))*100)));
const qSig=`${qSec}|${q.waitSaid ? 1 : 0}`;
if(this.queueTag._sig!==qSig){
this.queueTag._sig=qSig;
this.queueTag.el.classList.toggle('urgent',qPct<35);
this.queueTag.el.innerHTML=`<span class="kt-line">${q.waitSaid ? '⏳ Đang chờ' : '💢 Khách xếp hàng'} · <b>${qSec}s</b></span>`;
}
}
}
}
_refreshHudBounds(W,H){
const now=performance.now();
if(now-(this._obsTs||0)<200&&this._obsW===W&&this._obsH===H)return;
this._obsTs=now;
this._obsW=W;
this._obsH=H;
let minTop=8;
for(const id of['sh-rank','sh-bars','sh-chips','sh-ticket','sh-tip']){
const el=$(id);
if(!el||el.hidden)continue;
const r=el.getBoundingClientRect();
if(r.height>0)minTop=Math.max(minTop,r.bottom+5);
}
const topBar=document.querySelector('#shifthud .top');
if(topBar&&!topBar.hidden){
const r=topBar.getBoundingClientRect();
if(r.height>0)minTop=Math.max(minTop,r.bottom+5);
}
const actsEl=$('acts');
const actsTop=actsEl&&!actsEl.hidden?actsEl.getBoundingClientRect().top:H-10;
this._minTop=minTop;
this._maxBottom=Math.max(minTop+28,actsTop-5);
}
clampOverhead(){
const W=window.innerWidth||canvas.clientWidth||375;
const H=window.innerHeight||canvas.clientHeight||812;
this._refreshHudBounds(W,H);
const minTop=this._minTop||8;
const maxBottom=this._maxBottom||(H-15);
const isLand=W>H;
const tags=[this.custTag,this.queueTag].filter((t)=>t&&t.el&&!t.el.hidden&&t.vis&&t.w&&t.h);
let r0Left=0,r0Right=0;
for(let i=0;i<tags.length;i++){
const t=tags[i];
const el=t.el;
const w=t.w,h=t.h;
let top=t.top;
let left=t.left;
if(isLand&&i===0){
left=14;
top=Math.max(minTop,96);
}else if(isLand&&i===1){
left=14;
top=Math.max(minTop+34,130);
}else if(i===1&&tags[0]){
if(left<r0Right+6&&left+w>r0Left-6){
left=Math.max(6,r0Left-w-8);
}
}
top=Math.max(minTop,Math.min(top,maxBottom-h));
const rx=Math.round(left),ry=Math.round(top);
if(i===0){
r0Left=rx;
r0Right=rx+w;
}
const tr=`translate(${rx}px, ${ry}px)`;
if(t._tr!==tr){
t._tr=tr;
el.style.transform=tr;
}
}
}
hud(){
const s=this.st;
if(!s)return;
let txt=`🏪 ${s.count}/${s.goal} khách`;
if(s.limit>0)txt+=` · ⏱${Math.max(0, Math.ceil(s.time))}s`;
if(s.maxMiss)txt+=` · ❌${s.miss}/${s.maxMiss}`;
else if(s.miss)txt+=` · ❌${s.miss}`;
const g=$('sh-goal');
if(g.textContent!==txt)g.textContent=txt;
g.classList.toggle('warn',!!((s.limit>0&&s.time<=15)||(s.maxMiss&&s.miss>=s.maxMiss-1)));
this.updateTags();
const c=s.cur;
const showHint=this.showHintNow(c);
const canHint=Boolean(c&&['greet','ask','thanks'].includes(c.step)&&!showHint);
const needWait=Boolean(s.queue&&s.queue.some((w)=>!w.waitSaid));
const itemsSig=c?c.items.map((it)=>`${it.id}:${it.scanned ? 1 : 0}`).join(','):'';
const curQ=c?c.questions?.[c.qIdx]:null;
const sig=c
?`${c.id}|${c.step}|${c.qIdx}|${curQ?.id || ''}|${curQ?.yes ? 1 : 0}|${itemsSig}|${c.hotWant || ''}:${c.hotAdded ? 1 : 0}|${c.payMethod}:${c.total}:${c.tendered}:${c.changeDue}:${c.changeGiven}|${showHint ? 1 : 0}|${canHint ? 1 : 0}|${needWait ? 1 : 0}`
:`none|${needWait ? 1 : 0}`;
if(this.uiSig===sig)return;
this.uiSig=sig;
this.renderPanel(c,{showHint,canHint,needWait});
}
renderPanel(c,{showHint,canHint,needWait}){
if(!c){
this.panel.innerHTML=`<div class="kb-head"><div class="kb-reg"><span>🏪 Quầy thu ngân レジ · Đang chờ khách…</span></div></div>`;
return;
}
const totalTxt=`合計 <b>${c.total}円</b>`;
const cashTxt=c.step==='pay'&&c.payMethod==='cash'
?` · お預かり <b>${c.tendered}円</b> · お釣り <b class="${c.changeGiven === c.changeDue ? 'ok' : 'warn'}">${c.changeGiven}/${c.changeDue}円</b>`
:c.step==='pay'&&c.payMethod==='ic'
?` · <b>💳 ICカード</b>`
:'';
let headBtns='';
if(needWait){
headBtns+=`<button type="button" class="kb-btn kb-wait hot" data-act="wait"><span class="jp">⏳ 少々お待ちください</span><span class="vi">Xin chờ một chút</span></button>`;
}
if(canHint){
headBtns+=`<button type="button" class="kb-btn kb-hint" data-act="hint">💡 Gợi ý</button>`;
}
let bodyHtml='';
if(c.step==='greet'||c.step==='ask'||c.step==='thanks'){
const choices=this.phraseChoicesFor(c);
const btns=choices.map((pid)=>{
const p=PHRASES[pid];
const viTxt=showHint?esc(p.vi):'••• (bấm 💡 Gợi ý nếu quên)';
return`<button type="button" class="kb-btn kb-phrase" data-act="say" data-id="${pid}">
          <span class="jp">🗣️ ${esc(p.jp)}</span>
          <span class="vi">${viTxt}</span>
        </button>`;
}).join('');
bodyHtml=`<div class="kb-phrases">${btns}</div>`;
}else if(c.step==='scan'){
const itemBtns=c.items.map((it,idx)=>{
const g=GOODS[it.id]||GOODS.onigiri;
return`<button type="button" class="kb-btn kb-item${it.scanned ? ' done' : ' hot'}" data-act="scan-idx" data-idx="${idx}" ${it.scanned ? 'disabled' : ''}>
          <span class="ic">${g.icon}</span>
          <span class="jp">${esc(g.jp)}</span>
          <span class="pr">${g.price}円${it.scanned ? ' ✓' : ''}</span>
        </button>`;
}).join('');
const scannedCount=c.items.filter((it)=>it.scanned).length;
const allScanned=scannedCount>=c.items.length;
const hotActive=Boolean(this.st.hot||c.hotWant);
const hotBtns=hotActive
?HOT_KEYS.map((hk)=>{
const hg=GOODS[hk];
const wanted=c.hotWant===hk&&!c.hotAdded;
return`<button type="button" class="kb-btn kb-hot${wanted ? ' hot' : ''}" data-act="hot" data-id="${hk}">
              <span class="jp">${hg.icon} ${esc(hg.jp)}</span>
              <span class="vi">${hg.price}円 · ${esc(hg.vi)}</span>
            </button>`;
}).join('')
:'';
bodyHtml=`
        <div class="kb-items">${itemBtns}</div>
        <div class="kb-scan-row${hotActive ? ' with-hot' : ''}">
          <button type="button" class="kb-btn kb-scan${!allScanned ? ' hot' : ''}" data-act="scan-next" ${allScanned ? 'disabled' : ''}>
            <span class="jp">📟 Quét mã vạch</span>
            <span class="vi">スキャン (${scannedCount}/${c.items.length})</span>
          </button>
          ${hotBtns}
        </div>`;
}else if(c.step==='ans'){
const curQ=c.questions?.[c.qIdx];
const ui=ANS_UI[curQ?.id]||ANS_UI.warm;
const wantYes=!!curQ?.yes;
const replyJp=wantYes?ui.yesJp:ui.noJp;
const replyVi=wantYes?ui.yesVi:ui.noVi;
bodyHtml=`
        <div class="kb-reply"><span class="jp">${esc(replyJp)}</span> <span class="vi">— ${esc(replyVi)}</span></div>
        <div class="kb-ans-row">
          <button type="button" class="kb-btn kb-ans${wantYes ? ' hot' : ''}" data-act="ans" data-val="yes">
            <span class="jp">${ui.btnYes.icon} ${esc(ui.btnYes.vi)}</span>
            <span class="vi">${esc(ui.btnYes.jp)}</span>
          </button>
          <button type="button" class="kb-btn kb-ans${!wantYes ? ' hot' : ''}" data-act="ans" data-val="no">
            <span class="jp">${ui.btnNo.icon} ${esc(ui.btnNo.vi)}</span>
            <span class="vi">${esc(ui.btnNo.jp)}</span>
          </button>
        </div>`;
}else if(c.step==='pay'){
const isIC=c.payMethod==='ic';
const exactMatch=!isIC&&c.changeGiven===c.changeDue;
const denomBtns=DENOMS.map((d)=>{
const isBill=d>=1000;
return`<button type="button" class="kb-btn kb-denom ${isBill ? 'bill' : 'coin'}" data-act="denom" data-val="${d}" ${isIC ? 'disabled' : ''}>
          <span class="dval">${d}</span><span class="dyen">円</span>
        </button>`;
}).join('');
const clearBtn=`<button type="button" class="kb-btn kb-clear" data-act="clear" ${isIC ? 'disabled' : ''}>
        <span class="dval">↩ Xoá</span><span class="dyen">クリア</span>
      </button>`;
bodyHtml=`
        <div class="kb-denoms">${denomBtns}${clearBtn}</div>
        <div class="kb-pay-acts">
          <button type="button" class="kb-btn kb-give${exactMatch ? ' hot' : ''}" data-act="give" ${isIC ? 'disabled' : ''}>
            <span class="jp">✔ Đưa tiền (${c.changeGiven}円)</span>
            <span class="vi">お渡し · Cần thối ${c.changeDue}円</span>
          </button>
          <button type="button" class="kb-btn kb-ic${isIC ? ' hot' : ''}" data-act="ic">
            <span class="jp">💳 Chạm thẻ IC (ピッ♪)</span>
            <span class="vi">ICカード決済</span>
          </button>
        </div>`;
}
this.panel.innerHTML=`
      <div class="kb-head">
        <div class="kb-reg">${totalTxt}${cashTxt}</div>
        ${headBtns ? `<div class="kb-head-btns">${headBtns}</div>` : ''}
      </div>
      ${bodyHtml}
    `;
for(const b of this.panel.querySelectorAll('button[data-act]')){
b.addEventListener('pointerdown',(e)=>{
e.preventDefault();
e.stopPropagation();
this.handleButton(b);
});
}
}
handleButton(b){
if(!this.active||this.paused||!this.st||this.st.over)return;
const actType=b.dataset.act;
if(actType==='hint'){
useHint(this.st);
this.tip('ヒント','Đã bật nghĩa tiếng Việt cho lượt này (mất ★2 chuẩn xác)',2.5);
}else if(actType==='wait'){
const r=say(this.st,'wait');
if(r==='good'){
this.tip('少々お待ちください！','Đã trấn an khách xếp hàng phía sau (+kiên nhẫn)',2.2);
}
}else if(actType==='say'){
this.onSay(b.dataset.id);
}else if(actType==='scan-idx'){
this.onScan(Number(b.dataset.idx));
}else if(actType==='scan-next'){
this.onScan();
}else if(actType==='hot'){
this.onHot(b.dataset.id);
}else if(actType==='ans'){
this.onAnswer(b.dataset.val==='yes');
}else if(actType==='denom'){
this.onDenom(Number(b.dataset.val));
}else if(actType==='clear'){
clearChange(this.st);
}else if(actType==='give'){
this.onGiveChange();
}else if(actType==='ic'){
this.onPayIC();
}
this.stage.syncShift?.(this.st);
this.hud();
}
onSay(phraseId){
const s=this.st;
const prevStep=s.cur?.step;
const prevCustId=s.cur?.id||1;
const r=say(s,phraseId);
if(r==='good'){
if(prevStep==='greet'){
this.tip('いらっしゃいませ！','Quét mã vạch các món trên quầy (và đồ nóng nếu khách gọi)',2.2);
}else if(prevStep==='ask'){
const q=PHRASES[phraseId];
this.tip(q?q.jp:'','Nghe khách trả lời はい / いいえ rồi chọn đúng hành động!',2.5);
}else if(prevStep==='thanks'){
this.stage.triggerLeave?.(prevCustId);
this.tip('ありがとうございました！',`Hoàn tất lượt khách (${s.count}/${s.goal})!`,2.2);
if(s.result==='win')this.endT=0.45;
}
}else if(r==='bad'){
this.onMistake('Câu nói chưa đúng với bước hiện tại!');
}
}
onScan(idx){
const s=this.st;
const r=scan(s,idx);
if(r==='step'||r==='good'){
const c=s.cur;
if(c&&c.step==='ask'){
this.tip('スキャン完了！','Đã quét xong! Hãy hỏi khách câu tiếp theo',2.2);
}else if(c&&c.step==='pay'){
this.tip(`お会計 ${c.total}円`,c.payMethod==='ic'?'Khách trả thẻ IC — bấm 💳 Chạm thẻ IC!':`Khách đưa ${c.tendered}円 — hãy gom ${c.changeDue}円 tiền thối!`,2.8);
}else if(c&&c.hotWant&&!c.hotAdded){
const hg=GOODS[c.hotWant];
this.tip(`${hg.icon} ${hg.jp}もください！`,`Khách gọi thêm ${hg.vi} (${hg.price}円) ở tủ kính đồ nóng!`,2.8);
}
}else if(r==='bad'){
this.onMistake('Món này đã quét mã vạch rồi!');
}
}
onHot(hotId){
const s=this.st;
const r=addHot(s,hotId);
if(r==='good'||r==='step'){
const hg=GOODS[hotId];
this.tip(`${hg.icon} ${hg.jp} (+${hg.price}円)`,`Đã gắp ${hg.vi} từ tủ đồ nóng!`,2.0);
}else if(r==='bad'){
this.onMistake('Khách không gọi món đồ nóng này!');
}
}
onAnswer(didYes){
const s=this.st;
const r=answer(s,didYes);
if(r==='good'){
const c=s.cur;
if(c&&c.step==='pay'){
this.tip(`合計 ${c.total}円`,c.payMethod==='ic'?'Khách trả bằng ICカード — bấm 💳 Chạm thẻ IC!':`Khách đưa ${c.tendered}円 — cần thối ${c.changeDue}円!`,3.0);
}else if(c&&c.step==='ask'){
this.tip('次のご確認','Tiếp tục hỏi khách câu tiếp theo!',2.2);
}
}else if(r==='bad'){
this.onMistake('Làm ngược ý khách vừa trả lời rồi!');
}
}
onDenom(value){
addChange(this.st,value);
}
onPayIC(){
const s=this.st;
const r=payIC(s);
if(r==='good'){
this.tip('ピッ♪ 決済完了','Thanh toán IC xong! Hãy chào cảm ơn ありがとうございました！',2.4);
}else if(r==='bad'){
this.onMistake('Khách này trả tiền mặt, không dùng thẻ IC!');
}
}
onGiveChange(){
const s=this.st;
const c=s.cur;
const due=c?c.changeDue:0;
const r=giveChange(s);
if(r==='good'){
this.tip(`${due}円のお返しです`,'Đã thối đúng tiền! Hãy chào cảm ơn ありがとうございました！',2.4);
}else if(r==='wrong'){
this.onMistake(`Thối sai tiền! Cần thối đúng ${due}円.`);
}
}
onMistake(viMsg){
const s=this.st;
this.tip('すみません！',viMsg,3.0);
if(this.who.foreman){
this.overhead.say(this.who.foreman,'落ち着いて確認してね！ — Bình tĩnh kiểm tra kỹ nhé!',2.4);
}
if(s.result==='lose')this.lose();
}
onCanvasTap(e){
const c=this.st?.cur;
if(!c||c.step!=='scan')return;
const rect=canvas.getBoundingClientRect();
if(!rect.width||!rect.height)return;
this.pointerNdc.x=((e.clientX-rect.left)/rect.width)*2-1;
this.pointerNdc.y=-((e.clientY-rect.top)/rect.height)*2+1;
this.raycaster.setFromCamera(this.pointerNdc,camera);
if(this.stage.itemMeshes){
const hits=this.raycaster.intersectObjects(this.stage.itemMeshes,false);
if(hits.length>0&&hits[0].object.visible){
const slotIdx=hits[0].object.userData?.slotIdx;
if(typeof slotIdx==='number'){
this.onScan(slotIdx);
this.stage.syncShift?.(this.st);
this.hud();
return;
}
}
}
if(this.stage.hotCaseMesh&&c.hotWant&&!c.hotAdded){
const hotHits=this.raycaster.intersectObject(this.stage.hotCaseMesh,false);
if(hotHits.length>0){
this.onHot(c.hotWant);
this.stage.syncShift?.(this.st);
this.hud();
}
}
}
onKey(e){
const c=this.st?.cur;
if(!c)return;
if(e.code==='KeyH'){
e.preventDefault();
useHint(this.st);
this.hud();
return;
}
if(e.code==='KeyW'&&this.st.queue?.some((w)=>!w.waitSaid)){
e.preventDefault();
say(this.st,'wait');
this.hud();
return;
}
if(c.step==='greet'||c.step==='ask'||c.step==='thanks'){
const idx={Digit1:0,Digit2:1,Digit3:2}[e.code];
if(idx!==undefined){
e.preventDefault();
const choices=this.phraseChoicesFor(c);
if(choices[idx]){
this.onSay(choices[idx]);
this.stage.syncShift?.(this.st);
this.hud();
}
}
}else if(c.step==='scan'){
if(e.code==='Space'){
e.preventDefault();
this.onScan();
this.stage.syncShift?.(this.st);
this.hud();
}else{
const idx={Digit1:0,Digit2:1,Digit3:2,Digit4:3}[e.code];
if(idx!==undefined){
e.preventDefault();
this.onScan(idx);
this.stage.syncShift?.(this.st);
this.hud();
}
}
}else if(c.step==='ans'){
if(e.code==='Digit1'||e.code==='Space'){
e.preventDefault();
this.onAnswer(true);
this.stage.syncShift?.(this.st);
this.hud();
}else if(e.code==='Digit2'){
e.preventDefault();
this.onAnswer(false);
this.stage.syncShift?.(this.st);
this.hud();
}
}else if(c.step==='pay'){
if(e.code==='Space'||e.code==='Enter'){
e.preventDefault();
if(c.payMethod==='ic')this.onPayIC();
else this.onGiveChange();
this.stage.syncShift?.(this.st);
this.hud();
}else if(e.code==='Backspace'){
e.preventDefault();
clearChange(this.st);
this.stage.syncShift?.(this.st);
this.hud();
}
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
extra:konbiniExtra(s),
hintUsed:s.hintUsed,
extraLabel:'Thối tiền tối ưu bằng ít tờ/xu nhất (お釣り最小枚数)',
});
}
starsHtml(info){
const rows=info.lines.map((l)=>`<div class="star-line${l.ok ? ' ok' : ''}">${esc(l.text)}</div>`).join('');
return`<div class="stars-box"><div class="stars-row">${info.text}</div><div class="stars-lines">${rows}</div></div>`;
}
askQuit(){
if(this.paused)return;
this.paused=true;
card(`<h2>Về sớm?</h2><p>Mới phục vụ ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}. Về sớm thì chỉ được tính phần đã làm.</p>`,[
{label:'Làm tiếp',on:()=>{this.paused=false;}},
{label:'Về sớm',cls:'ghost',on:()=>this.finish({f:konbiniFraction(this.st),done:this.st.count,fail:this.opts.hard,stars:0})},
]);
}
finish(r){
this.stop();
this.onEnd(r);
}
lose(){
this.paused=true;
const info=this.starInfo(false);
card(`<div class="big">😣</div><h2>Chưa đạt</h2><p>${esc(this.st.loseWhy)}</p><p>Đã phục vụ ${this.st.count}/${this.st.goal} ${esc(this.meta.unit)}.</p>${this.starsHtml(info)}`,[
{label:'🔁 Làm lại (🧠 −4)',on:()=>{this.meta.onRetry&&this.meta.onRetry();this.stop();this.start(this.opts,this.who,this.meta,this.onEnd);}},
{label:'Chịu thua, nhận phê bình',cls:'ghost',on:()=>this.finish({f:konbiniFraction(this.st),done:this.st.count,fail:true,stars:info.stars,starLines:info.lines})},
]);
}
win(){
this.paused=true;
this.overhead.say(this.who.player,'お疲れ様でした！',3);
const info=this.starInfo(true);
card(`<div class="big">✅</div><h2>Hết ca! <span class="jp">お疲れ様でした</span></h2><p>Quầy thu ngân サクラマート nhanh gọn, lịch sự và chính xác từng đồng xu!</p>${this.starsHtml(info)}`,[
{label:'Về thôi →',on:()=>this.finish({f:1,done:this.st.count,fail:false,stars:info.stars,starLines:info.lines})},
]);
}
update(dt){
if(!this.active)return;
const s=this.st,P=this.who.player;
P.holder.visible=false;
P.play('idle');
if(!this.paused){
const ev=step(s,dt);
if(ev.includes('leave_angry')){
this.tip('お待たせしました！','Khách chờ lâu quá nên đã bỏ đi (mất 1 lượt)!',3.0);
if(this.who.foreman){
this.overhead.say(this.who.foreman,'お客さんを待たせないで！ — Đừng để khách chờ lâu nhé!',2.5);
}
}
if(ev.includes('lose'))this.lose();
if(ev.includes('win')&&this.endT<0)this.endT=0.45;
this.stage.syncShift?.(s);
}
if(this.endT>=0&&!this.paused){
this.endT-=dt;
if(this.endT<0)this.win();
}
const aspect=camera.aspect||((window.innerWidth||375)/Math.max(1,window.innerHeight||812));
const kc=konbiniCamera(aspect);
this.camPos.set(kc.eye[0],kc.eye[1],kc.eye[2]);
this.camLook.set(kc.look[0],kc.look[1],kc.look[2]);
if(camera.fov!==kc.fov){
camera.fov=kc.fov;
camera.updateProjectionMatrix();
this.camRig.snap(this.camPos,this.camLook);
}else{
this.camRig.to(this.camPos,this.camLook,dt,6);
}
this.hud();
}
}
