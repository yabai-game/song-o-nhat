/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx}from'./state.js';
export const BAG_FEE=5;
export const KONBINI_MEAL=600;
export const SPOIL_DAYS=3;
export const DISCOUNT_20_MIN=19*60+30;
export const DISCOUNT_50_MIN=20*60;
export const GOODS=[
{id:'meat',jp:'豚こま',vi:'thịt heo',icon:'🥩',model:'food_meat',price:398,perish:true},
{id:'eggs',jp:'卵',vi:'trứng',icon:'🥚',model:'food_eggs',price:248,perish:false},
{id:'eggplant',jp:'なす',vi:'cà tím',icon:'🍆',model:'food_eggplant',price:158,perish:false},
{id:'cucumber',jp:'きゅうり',vi:'dưa chuột',icon:'🥒',model:'food_cucumber',price:98,perish:false},
{id:'banana',jp:'バナナ',vi:'chuối',icon:'🍌',model:'food_banana',price:198,perish:false},
{id:'apple',jp:'りんご',vi:'táo',icon:'🍎',model:'food_apple',price:128,perish:false},
{id:'bento',jp:'お弁当',vi:'cơm hộp',icon:'🍱',model:'bento_box',price:498,perish:true},
{id:'moyashi',jp:'もやし',vi:'giá đỗ',icon:'🌱',model:null,price:39,perish:true},
];
export const GOODS_BY_ID=Object.fromEntries(GOODS.map((g)=>[g.id,g]));
export const RECIPES=[
{
id:'egg_eggplant',
icon:'🍳',
vi:'Trứng chiên cà tím',
jp:'なすと卵の炒め物',
items:['eggs','eggplant'],
stove:true,
fx:{health:6,mental:4},
},
{
id:'pork_cucumber',
icon:'🥒',
vi:'Thịt heo xào dưa chuột',
jp:'豚肉ときゅうりの炒め物',
items:['meat','cucumber'],
stove:true,
fx:{health:6,mental:4},
},
{
id:'fruit_bowl',
icon:'🍌',
vi:'Bữa sáng hoa quả',
jp:'フルーツ盛り',
items:['banana','apple'],
stove:false,
fx:{health:3,mental:2},
},
];
export const COOK_STEPS=[
{id:'cut',icon:'🔪',vi:'Thái',jp:'切る',sec:1.2,min:5},
{id:'fry',icon:'🔥',vi:'Xào',jp:'炒める',sec:1.5,min:5},
{id:'plate',icon:'🍚',vi:'Dọn ra',jp:'盛り付け',sec:0.6,min:5},
];
export function createCookStove(recipeId){
return{recipeId,idx:0,held:0,holding:null,minAdded:0,done:false};
}
export function cookStepProgress(st){
if(!st)return 0;
if(st.done)return 1;
const cur=COOK_STEPS[st.idx];
return cur?Math.max(0,Math.min(1,st.held/cur.sec)):0;
}
export function pressCookStep(st,stepId){
if(!st||st.done)return{ok:false,reason:'done'};
const cur=COOK_STEPS[st.idx];
if(!cur)return{ok:false,reason:'done'};
if(stepId!==cur.id){
st.holding=null;
return{
ok:false,
reason:'wrong_order',
want:cur,
jp:'「順番が違うよ」',
vi:'Sai thứ tự rồi',
};
}
st.holding=stepId;
return{ok:true,step:cur,idx:st.idx};
}
export function releaseCookStep(st){
if(st)st.holding=null;
return st;
}
export function tickCookStep(st,dt){
if(!st||st.done||!st.holding||!(dt>0)){
return{advanced:false,done:!!(st&&st.done),progress:cookStepProgress(st),minDelta:0};
}
const cur=COOK_STEPS[st.idx];
if(!cur||st.holding!==cur.id){
return{advanced:false,done:false,progress:cookStepProgress(st),minDelta:0};
}
st.held=Math.min(cur.sec,st.held+dt);
if(st.held+1e-6>=cur.sec){
st.held=0;
st.holding=null;
st.idx+=1;
st.minAdded+=cur.min;
if(st.idx>=COOK_STEPS.length)st.done=true;
return{
advanced:true,
completedStep:cur,
minDelta:cur.min,
done:st.done,
progress:1,
};
}
return{advanced:false,done:false,progress:st.held/cur.sec,minDelta:0};
}
export const CLERK_LINES={
bag:{
jp:'「袋はご利用ですか？」',
vi:'Bạn có lấy túi không? (5 ¥)',
yes:{jp:'はい、お願いします',vi:'Có, cho tôi 1 túi (+5 ¥)'},
no:{jp:'いいえ、結構です',vi:'Không cần túi (0 ¥)'},
},
card:{
jp:'「ポイントカードはお持ちですか？」',
vi:'Bạn có thẻ tích điểm không?',
reply:{jp:'いいえ、大丈夫です',vi:'Không có, cảm ơn'},
},
};
export function goodOf(id){
return GOODS_BY_ID[id]||null;
}
export function discount(id,min=0){
const g=goodOf(id);
if(!g)return{rate:0,tag:null,price:0,base:0};
if(!g.perish||min<DISCOUNT_20_MIN){
return{rate:0,tag:null,price:g.price,base:g.price};
}
if(min>=DISCOUNT_50_MIN){
return{rate:0.5,tag:'半額',price:Math.floor(g.price*0.5),base:g.price};
}
return{rate:0.2,tag:'2割引',price:Math.floor(g.price*0.8),base:g.price};
}
export function priceOf(id,min=0){
return discount(id,min).price;
}
export function addToCart(cart,id){
if(!Array.isArray(cart)||!goodOf(id))return cart;
cart.push(id);
return cart;
}
export function removeFromCart(cart,idOrIdx){
if(!Array.isArray(cart))return cart;
if(typeof idOrIdx==='number'){
if(idOrIdx>=0&&idOrIdx<cart.length)cart.splice(idOrIdx,1);
return cart;
}
const idx=cart.indexOf(idOrIdx);
if(idx>=0)cart.splice(idx,1);
return cart;
}
export function cartTotal(cart,min=0){
if(!Array.isArray(cart))return 0;
let sum=0;
for(const id of cart)sum+=priceOf(id,min);
return sum;
}
function itemId(entry){
return typeof entry==='string'?entry:entry&&entry.id;
}
export function checkout(S,cart,min=0,opts={}){
if(!S||!Array.isArray(cart)||cart.length===0){
return{ok:false,reason:'empty',total:0,bagFee:0};
}
const wantBag=typeof opts==='boolean'?opts:!!opts.bag;
const bagFee=wantBag?BAG_FEE:0;
const itemsTotal=cartTotal(cart,min);
const total=itemsTotal+bagFee;
if((S.money||0)<total){
return{ok:false,reason:'money',total,bagFee};
}
S.money-=total;
if(!Array.isArray(S.pantry))S.pantry=[];
if(!Array.isArray(S.pantryDays))S.pantryDays=[];
const day=S.story||0;
const bought=[];
for(const id of cart){
if(!goodOf(id))continue;
S.pantry.push(id);
S.pantryDays.push(day);
bought.push(id);
}
cart.length=0;
return{ok:true,total,bagFee,itemsTotal,bought};
}
export function cookable(pantryOrState){
const list=Array.isArray(pantryOrState)
?pantryOrState
:(pantryOrState&&Array.isArray(pantryOrState.pantry)?pantryOrState.pantry:[]);
const counts={};
for(const entry of list){
const id=itemId(entry);
if(id)counts[id]=(counts[id]||0)+1;
}
return RECIPES.filter((r)=>r.items.every((id)=>(counts[id]||0)>0));
}
export function recipeCost(recipeOrId){
const r=typeof recipeOrId==='string'?RECIPES.find((x)=>x.id===recipeOrId):recipeOrId;
if(!r)return 0;
return r.items.reduce((sum,id)=>sum+(goodOf(id)?.price||0),0);
}
export function savingVsKonbini(recipeOrId){
const r=typeof recipeOrId==='string'?RECIPES.find((x)=>x.id===recipeOrId):recipeOrId;
if(!r)return 0;
return KONBINI_MEAL-recipeCost(r);
}
export function canCookTonight(S){
if(!S)return false;
if(S.flags&&S.flags.cooked===(S.story??0))return false;
return cookable(S.pantry).length>0;
}
export function cook(S,pantry,recipeId){
if(typeof pantry==='string'&&recipeId===undefined){
recipeId=pantry;
pantry=S&&S.pantry;
}
const list=Array.isArray(pantry)?pantry:(S&&Array.isArray(S.pantry)?S.pantry:null);
const recipe=RECIPES.find((r)=>r.id===recipeId);
if(!S||!list||!recipe)return{ok:false,reason:'invalid'};
const avail=cookable(list);
if(!avail.some((r)=>r.id===recipe.id))return{ok:false,reason:'missing'};
const syncDays=list===S.pantry&&Array.isArray(S.pantryDays);
for(const need of recipe.items){
const idx=list.findIndex((entry)=>itemId(entry)===need);
if(idx>=0){
list.splice(idx,1);
if(syncDays&&idx<S.pantryDays.length)S.pantryDays.splice(idx,1);
}
}
S.flags=S.flags||{};
S.flags.cooked=S.story??0;
const delta=applyFx(S,recipe.fx);
const cost=recipeCost(recipe);
const saved=KONBINI_MEAL-cost;
return{ok:true,recipe,fx:recipe.fx,delta,cost,saved};
}
export function spoil(S,currentDay=S?.story??0){
if(!S||!Array.isArray(S.pantry)||S.pantry.length===0)return[];
if(!Array.isArray(S.pantryDays))S.pantryDays=[];
while(S.pantryDays.length<S.pantry.length){
const entry=S.pantry[S.pantryDays.length];
const d=typeof entry==='object'&&entry&&typeof entry.day==='number'?entry.day:currentDay;
S.pantryDays.push(d);
}
const spoiled=[];
for(let i=S.pantry.length-1;i>=0;i--){
const entry=S.pantry[i];
const id=itemId(entry);
const boughtDay=typeof entry==='object'&&entry&&typeof entry.day==='number'
?entry.day
:S.pantryDays[i];
if(currentDay-boughtDay>SPOIL_DAYS){
spoiled.unshift(id);
S.pantry.splice(i,1);
S.pantryDays.splice(i,1);
}
}
return spoiled;
}
