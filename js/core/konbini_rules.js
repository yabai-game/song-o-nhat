/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const KONBINI={
BAG_PRICE:3,
QUEUE_DELAY:9.0,
QUEUE_RELIEF:8.0,
};
export const GOODS={
onigiri:{id:'onigiri',icon:'🍙',jp:'おにぎり',vi:'Cơm nắm',price:140},
sandwich:{id:'sandwich',icon:'🥪',jp:'サンドイッチ',vi:'Bánh mì kẹp',price:298},
bento:{id:'bento',icon:'🍱',jp:'お弁当',vi:'Cơm hộp',price:498,bento:true},
cupmen:{id:'cupmen',icon:'🍜',jp:'カップ麺',vi:'Mì ly',price:228},
ocha:{id:'ocha',icon:'🍵',jp:'お茶',vi:'Trà xanh',price:150},
coffee:{id:'coffee',icon:'☕',jp:'コーヒー',vi:'Cà phê',price:120},
pan:{id:'pan',icon:'🥐',jp:'パン',vi:'Bánh ngọt',price:160},
ice:{id:'ice',icon:'🍦',jp:'アイス',vi:'Kem',price:180},
karaage_bou:{id:'karaage_bou',icon:'🍢',jp:'からあげ棒',vi:'Xiên gà rán',price:220,hot:true},
nikuman:{id:'nikuman',icon:'🥟',jp:'肉まん',vi:'Bánh bao nóng',price:180,hot:true},
};
export const GOOD_KEYS=Object.keys(GOODS);
export const ROUND_GOOD_KEYS=['onigiri','ocha','coffee','pan','ice'];
export const COUNTER_GOOD_KEYS=['onigiri','sandwich','cupmen','ocha','coffee','pan','ice'];
export const HOT_KEYS=['karaage_bou','nikuman'];
export const DENOMS=[10000,5000,1000,500,100,50,10,5,1];
export const PHRASES={
welcome:{id:'welcome',jp:'いらっしゃいませ',vi:'Xin kính chào quý khách'},
warm:{id:'warm',jp:'温めますか？',vi:'Có hâm nóng không ạ?'},
chopsticks:{id:'chopsticks',jp:'お箸はお付けしますか？',vi:'Có lấy đũa không ạ?'},
bag:{id:'bag',jp:'袋はご利用ですか？',vi:'Có cần túi không ạ?'},
wait:{id:'wait',jp:'少々お待ちください',vi:'Xin chờ một chút ạ'},
thanks:{id:'thanks',jp:'ありがとうございました',vi:'Cảm ơn quý khách rất nhiều'},
otsukare:{id:'otsukare',jp:'お疲れ様です',vi:'Anh/chị vất vả rồi ạ'},
itadaki:{id:'itadaki',jp:'いただきます',vi:'Xin phép dùng bữa'},
gochisou:{id:'gochisou',jp:'ごちそうさまでした',vi:'Cảm ơn vì bữa ăn'},
itterasshai:{id:'itterasshai',jp:'いってらっしゃい',vi:'Anh/chị đi nhé'},
};
const CUST_KINDS=['f_casual','hoodie','suit','f_office','sport','elder_m','elder_f'];
export function changeCoins(amount){
let rem=Math.max(0,Math.round(Number(amount)||0));
const out=[];
for(const d of DENOMS){
while(rem>=d){
out.push(d);
rem-=d;
}
}
return out;
}
function shuffle3(arr,rng){
const a=arr.slice();
for(let i=a.length-1;i>0;i--){
const j=Math.floor(rng()*(i+1))%(i+1);
const tmp=a[i];
a[i]=a[j];
a[j]=tmp;
}
return a;
}
function choicesForStep(cust,rng){
if(cust.step==='greet'){
return shuffle3(['welcome','otsukare','itadaki'],rng).map((id)=>PHRASES[id]);
}
if(cust.step==='ask'){
return shuffle3(['warm','chopsticks','bag'],rng).map((id)=>PHRASES[id]);
}
if(cust.step==='thanks'){
return shuffle3(['thanks','gochisou','itterasshai'],rng).map((id)=>PHRASES[id]);
}
return[];
}
function computeTendered(total,{roundCash=false,oddPay=false}={},rng=Math.random){
if(total<=0)return 0;
if(roundCash){
return total<=1000?1000:Math.ceil(total/1000)*1000;
}
const base1000=total<1000?1000:Math.ceil((total+1)/1000)*1000;
if(oddPay){
const rem100=total%100;
if(rem100>0)return base1000+rem100;
const rem500=total%500;
if(rem500>0)return base1000+rem500;
}
const ones=total%10;
if(ones>0&&ones<8&&rng()<0.5){
return base1000+ones;
}
if(total>1000&&total<4500&&rng()<0.25)return 5000;
return base1000;
}
function setupPayment(st,cust,rng=Math.random){
let sum=0;
for(const it of cust.items)sum+=it.price;
if(cust.bagAdded)sum+=KONBINI.BAG_PRICE;
cust.total=sum;
cust.subTotal=sum;
if(cust.payMethod==='ic'){
cust.tendered=sum;
cust.changeDue=0;
}else{
if(cust.fixedTendered!==undefined&&cust.fixedTendered!==null){
cust.tendered=cust.fixedTendered;
}else{
cust.tendered=computeTendered(sum,{roundCash:st.roundCash,oddPay:cust.oddPay},rng);
}
cust.changeDue=Math.max(0,cust.tendered-cust.total);
}
cust.changeTray=[];
cust.changeGiven=0;
}
function setPromptStep(st,cust,stepName,rng=Math.random){
cust.step=stepName;
cust.promptTimer=0;
cust.hintShown=st.hintDelay===0;
cust.choices=choicesForStep(cust,rng);
}
function advanceAfterScan(st,cust,rng=Math.random){
if(cust.questions.length>0){
cust.qIdx=0;
setPromptStep(st,cust,'ask',rng);
}else{
cust.step='pay';
setupPayment(st,cust,rng);
}
}
function buildQuestions(st,hasBento,forceBagYes,rng){
const qs=[];
if(hasBento){
const warmYes=rng()<0.65;
qs.push({
id:'warm',
jp:PHRASES.warm.jp,
vi:PHRASES.warm.vi,
promptVi:'Khách mua cơm hộp — hỏi hâm nóng',
yes:warmYes,
ansJp:warmYes?'はい、お願いします':'いいえ、大丈夫です',
ansVi:warmYes?'Vâng, làm ơn hâm giúp tôi':'Không cần hâm đâu ạ',
yesLabel:'🔥 Hâm nóng',
noLabel:'Không hâm',
});
const chopYes=rng()<0.75;
qs.push({
id:'chopsticks',
jp:PHRASES.chopsticks.jp,
vi:PHRASES.chopsticks.vi,
promptVi:'Khách mua cơm hộp — hỏi lấy đũa',
yes:chopYes,
ansJp:chopYes?'はい、お願いします':'いいえ、いりません',
ansVi:chopYes?'Vâng, cho tôi xin đũa':'Không, tôi có đũa rồi',
yesLabel:'🥢 Đưa đũa',
noLabel:'Không lấy đũa',
});
}
if(st.bag){
const bagYes=forceBagYes!==undefined?!!forceBagYes:(st.oddChange?true:rng()<0.6);
qs.push({
id:'bag',
jp:PHRASES.bag.jp,
vi:PHRASES.bag.vi,
promptVi:'Hỏi khách có lấy túi đựng (3円) không',
yes:bagYes,
ansJp:bagYes?'はい、袋お願いします':'いいえ、大丈夫です',
ansVi:bagYes?'Vâng, cho tôi lấy túi (+3円)':'Không cần túi đâu ạ',
yesLabel:'🛍️ Có túi (+3円)',
noLabel:'Không túi',
});
}
return qs;
}
export function makeCustomer(st,rng=Math.random,overrides={}){
const idx=++st.seq;
const[minIt,maxIt]=st.itemsRange;
const span=Math.max(0,maxIt-minIt);
let count=minIt+(span>0?Math.floor(rng()*(span+1))%(span+1):0);
const wantBento=overrides.forceBento!==undefined
?!!overrides.forceBento
:(st.bento&&st.bentoSpawned<1&&(idx===2||rng()<0.35));
let hotWant=null;
if(overrides.forceHot!==undefined){
hotWant=overrides.forceHot;
}else if(st.hot&&!wantBento&&st.hotSpawned<2&&(idx===1||idx===4||rng()<0.4)){
hotWant=HOT_KEYS[(idx+Math.floor(rng()*HOT_KEYS.length))%HOT_KEYS.length];
st.hotSpawned++;
}
const pool=st.roundCash?ROUND_GOOD_KEYS:COUNTER_GOOD_KEYS;
const itemIds=Array.isArray(overrides.items)?overrides.items.slice():[];
if(!itemIds.length){
if(wantBento){
itemIds.push('bento');
st.bentoSpawned++;
count=Math.min(count,2);
}
while(itemIds.length<count){
const k=pool[Math.floor(rng()*pool.length)%pool.length];
itemIds.push(k);
}
}
const items=itemIds.map((id,i)=>{
const g=GOODS[id]||GOODS.onigiri;
return{
idx:i,
id:g.id,
icon:g.icon,
jp:g.jp,
vi:g.vi,
price:g.price,
bento:!!g.bento,
hot:!!g.hot,
scanned:false,
};
});
const hasBento=items.some((it)=>it.bento);
const oddPay=overrides.forceOddChange!==undefined
?!!overrides.forceOddChange
:(st.oddChange&&(idx===1||idx===3||rng()<0.5));
let payMethod='cash';
if(overrides.forcePay){
payMethod=overrides.forcePay;
}else if(!oddPay&&st.icRate>0&&rng()<st.icRate){
payMethod='ic';
}
const questions=buildQuestions(st,hasBento,overrides.forceBagYes,rng);
let initialTotal=0;
for(const it of items)initialTotal+=it.price;
const cust={
id:idx,
kind:CUST_KINDS[(idx-1)%CUST_KINDS.length],
step:'greet',
patience:st.patience,
maxPatience:st.patience,
waitSaid:false,
items,
hotWant,
hotAdded:false,
hotSayJp:hotWant?`${GOODS[hotWant].jp}ひとつください`:null,
hotSayVi:hotWant?`Cho tôi thêm 1 ${GOODS[hotWant].vi.toLowerCase()}`:null,
subTotal:0,
total:initialTotal,
questions,
qIdx:0,
warmed:false,
chopsticks:false,
bagAdded:false,
payMethod,
oddPay,
fixedTendered:overrides.tendered!==undefined?overrides.tendered:null,
tendered:0,
changeDue:0,
changeTray:[],
changeGiven:0,
changeWrongOnce:false,
promptTimer:0,
hintShown:st.hintDelay===0,
choices:[],
};
cust.choices=choicesForStep(cust,rng);
return cust;
}
function addMiss(st,why='Sai quá nhiều lần!'){
st.miss++;
if(st.maxMiss>0&&st.miss>st.maxMiss){
st.over=true;
st.result='lose';
st.loseWhy=why;
}
}
function nextCustomer(st,rng=Math.random){
if(st.over){
st.cur=null;
return;
}
if(st.queue.length>0){
const next=st.queue.shift();
next.patience=Math.min(next.maxPatience,next.patience+KONBINI.QUEUE_RELIEF);
setPromptStep(st,next,'greet',rng);
st.cur=next;
}else{
st.cur=makeCustomer(st,rng);
}
st.queueTimer=KONBINI.QUEUE_DELAY;
}
export function createKonbini(opts={},rng=Math.random){
const itemsRange=Array.isArray(opts.items)
?opts.items
:typeof opts.items==='number'
?[1,opts.items]
:[1,2];
const patience=opts.patience||40;
const hintDelay=opts.hintDelay!==undefined?opts.hintDelay:0;
const st={
goal:opts.goal||4,
limit:opts.limit||0,
time:opts.limit||0,
maxMiss:opts.maxMiss||0,
patience,
hintDelay,
itemsRange,
bag:!!opts.bag,
bento:!!opts.bento,
icRate:opts.icRate||0,
hot:!!opts.hot,
queueEnabled:!!opts.queue,
oddChange:!!opts.oddChange,
roundCash:!!opts.roundCash,
seq:0,
bentoSpawned:0,
hotSpawned:0,
count:0,
miss:0,
hintUsed:false,
cashCount:0,
optimalChangeCount:0,
allOptimalChange:true,
warned10:false,
over:false,
result:null,
loseWhy:'',
cur:null,
queue:[],
queueTimer:KONBINI.QUEUE_DELAY,
};
st.cur=makeCustomer(st,rng,opts.firstCustomer||{});
if(opts.initialQueue){
const n=typeof opts.initialQueue==='number'?opts.initialQueue:1;
for(let i=0;i<n;i++){
st.queue.push(makeCustomer(st,rng));
}
}
return st;
}
export function step(st,dt,rng=Math.random){
if(!st||st.over)return st?.result?[st.result]:[];
const ev=[];
if(st.limit>0){
st.time=Math.max(0,st.time-dt);
if(!st.warned10&&st.time<=10&&st.time>0){
st.warned10=true;
ev.push('warn10');
}
if(st.time<=0){
st.over=true;
st.result='lose';
st.loseWhy='Hết giờ!';
ev.push('lose');
return ev;
}
}
if(st.queueEnabled&&st.cur&&st.queue.length===0&&st.count+1<st.goal){
st.queueTimer-=dt;
if(st.queueTimer<=0){
st.queue.push(makeCustomer(st,rng));
st.queueTimer=999;
ev.push('queue_arrive');
}
}
for(let i=st.queue.length-1;i>=0;i--){
const w=st.queue[i];
const rate=w.waitSaid?0.5:1.0;
w.patience=Math.max(0,w.patience-dt*rate);
if(w.patience<=0){
st.queue.splice(i,1);
ev.push('leave_angry');
addMiss(st,'Khách bỏ đi quá nhiều!');
if(st.over){
ev.push('lose');
return ev;
}
}
}
if(st.cur){
const c=st.cur;
c.patience=Math.max(0,c.patience-dt);
if(c.step==='greet'||c.step==='ask'||c.step==='thanks'){
c.promptTimer+=dt;
if(st.hintDelay>=0&&c.promptTimer>=st.hintDelay){
c.hintShown=true;
}
}
if(c.patience<=0){
ev.push('leave_angry');
addMiss(st,'Khách bỏ đi quá nhiều!');
if(st.over){
ev.push('lose');
return ev;
}
nextCustomer(st,rng);
if(st.cur)ev.push('arrive');
}
}
return ev;
}
export function useHint(st){
if(!st||st.over||!st.cur)return false;
st.cur.hintShown=true;
st.hintUsed=true;
return true;
}
export function say(st,phraseId,rng=Math.random){
if(!st||st.over||!st.cur)return'early';
if(phraseId==='wait'){
const waiting=st.queue.find((w)=>!w.waitSaid);
if(!waiting)return'early';
for(const w of st.queue)w.waitSaid=true;
return'good';
}
const c=st.cur;
if(c.step==='greet'){
if(phraseId==='welcome'){
c.step='scan';
return'good';
}
addMiss(st);
return'bad';
}
if(c.step==='ask'){
const q=c.questions[c.qIdx];
if(!q)return'early';
if(phraseId===q.id){
c.step='ans';
return'good';
}
addMiss(st);
return'bad';
}
if(c.step==='thanks'){
if(phraseId==='thanks'){
c.step='done';
st.count++;
if(st.count>=st.goal){
st.over=true;
st.result='win';
}else{
nextCustomer(st,rng);
}
return'good';
}
addMiss(st);
return'bad';
}
return'early';
}
function allScannedAndHotDone(c){
const allItems=c.items.every((it)=>it.scanned);
const hotDone=!c.hotWant||c.hotAdded;
return allItems&&hotDone;
}
export function scan(st,itemIdx,rng=Math.random){
if(!st||st.over||!st.cur)return'early';
const c=st.cur;
if(c.step!=='scan')return'early';
let idx=itemIdx;
if(idx===undefined||idx===null){
idx=c.items.findIndex((it)=>!it.scanned);
if(idx<0)return'early';
}
const item=c.items[idx];
if(!item)return'early';
if(item.scanned){
addMiss(st);
return'bad';
}
item.scanned=true;
c.subTotal+=item.price;
if(allScannedAndHotDone(c)){
advanceAfterScan(st,c,rng);
return'good';
}
return'step';
}
export function addHot(st,id,rng=Math.random){
if(!st||st.over||!st.cur)return'early';
const c=st.cur;
if(c.step!=='scan')return'early';
if(!c.hotWant||c.hotAdded||id!==c.hotWant||!GOODS[id]?.hot){
addMiss(st);
return'bad';
}
const g=GOODS[id];
c.hotAdded=true;
c.items.push({
idx:c.items.length,
id:g.id,
icon:g.icon,
jp:g.jp,
vi:g.vi,
price:g.price,
bento:false,
hot:true,
scanned:true,
});
c.subTotal+=g.price;
c.total+=g.price;
if(allScannedAndHotDone(c)){
advanceAfterScan(st,c,rng);
return'good';
}
return'step';
}
export function answer(st,yes,rng=Math.random){
if(!st||st.over||!st.cur)return'early';
const c=st.cur;
if(c.step!=='ans')return'early';
const q=c.questions[c.qIdx];
if(!q)return'early';
if(Boolean(yes)!==q.yes){
addMiss(st);
return'bad';
}
if(q.id==='warm'&&q.yes)c.warmed=true;
if(q.id==='chopsticks'&&q.yes)c.chopsticks=true;
if(q.id==='bag'&&q.yes){
c.bagAdded=true;
c.total+=KONBINI.BAG_PRICE;
c.subTotal+=KONBINI.BAG_PRICE;
}
c.qIdx++;
if(c.qIdx<c.questions.length){
setPromptStep(st,c,'ask',rng);
}else{
c.step='pay';
setupPayment(st,c,rng);
}
return'good';
}
export function payIC(st,rng=Math.random){
if(!st||st.over||!st.cur)return'early';
const c=st.cur;
if(c.step!=='pay')return'early';
if(c.payMethod!=='ic'){
addMiss(st);
return'bad';
}
setPromptStep(st,c,'thanks',rng);
return'good';
}
export function addChange(st,denom){
if(!st||st.over||!st.cur)return'early';
const c=st.cur;
if(c.step!=='pay'||c.payMethod!=='cash')return'early';
const d=Number(denom);
if(!DENOMS.includes(d))return'invalid';
c.changeTray.push(d);
c.changeGiven+=d;
return'ok';
}
export function clearChange(st){
if(!st||st.over||!st.cur)return'early';
const c=st.cur;
c.changeTray=[];
c.changeGiven=0;
return'ok';
}
export function giveChange(st,rng=Math.random){
if(!st||st.over||!st.cur)return'early';
const c=st.cur;
if(c.step!=='pay'||c.payMethod!=='cash')return'early';
if(c.changeGiven!==c.changeDue){
c.changeWrongOnce=true;
st.allOptimalChange=false;
addMiss(st);
return'wrong';
}
st.cashCount++;
const minCount=changeCoins(c.changeDue).length;
if(!c.changeWrongOnce&&c.changeTray.length===minCount){
st.optimalChangeCount++;
}else{
st.allOptimalChange=false;
}
setPromptStep(st,c,'thanks',rng);
return'good';
}
export const konbiniExtra=(st)=>Boolean(st&&st.result==='win'&&st.allOptimalChange);
export const konbiniFraction=(st)=>(st&&st.goal>0?Math.min(1,st.count/st.goal):0);
