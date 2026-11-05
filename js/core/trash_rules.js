/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{rng}from'./crowd.js';
export{rng};
export const TRASH_MIN={
ITEM:1,
SORT:5,
DROP:1,
TOTAL:6,
};
const KIND_LIST=[
{id:'burn',jp:'燃えるゴミ',vi:'Rác cháy được',icon:'🔥',color:'#e2574c'},
{id:'plastic',jp:'プラごみ',vi:'Nhựa bao bì',icon:'🧴',color:'#d9a43b'},
{id:'res',jp:'資源ゴミ',vi:'Lon · chai · chai nhựa',icon:'♻️',color:'#3f8f5a'},
{id:'nonburn',jp:'燃えないゴミ',vi:'Rác không cháy',icon:'🪨',color:'#5b86b8'},
];
for(const k of KIND_LIST){
Object.defineProperty(KIND_LIST,k.id,{value:k,enumerable:false});
}
export const KINDS=KIND_LIST;
const ITEM_LIST=[
{
id:'veg_peel',
jp:'野菜くず',
vi:'Vỏ rau',
icon:'🥬',
kind:'burn',
tip:'Vỏ rau củ và thức ăn thừa để ráo nước thuộc nhóm rác cháy được (燃えるゴミ).',
},
{
id:'tissue',
jp:'ティッシュ',
vi:'Khăn giấy',
icon:'🧻',
kind:'burn',
tip:'Khăn giấy đã qua sử dụng không tái chế giấy được nên bỏ vào rác cháy được (燃えるゴミ).',
},
{
id:'chopsticks',
jp:'割り箸',
vi:'Đũa dùng một lần',
icon:'🥢',
kind:'burn',
tip:'Đũa gỗ dùng một lần thuộc nhóm rác cháy được (燃えるゴミ).',
},
{
id:'socks',
jp:'古い靴下',
vi:'Tất cũ',
icon:'🧦',
kind:'burn',
tip:'Tất vải cũ rách nhỏ gọn bỏ vào rác cháy được (燃えるゴミ).',
},
{
id:'bento_box',
jp:'弁当の容器',
vi:'Hộp cơm nhựa',
icon:'🍱',
kind:'plastic',
tip:'Hộp cơm nhựa rửa sạch dầu mỡ có dấu プラ thuộc nhóm nhựa bao bì (プラごみ).',
},
{
id:'snack_bag',
jp:'お菓子の袋',
vi:'Túi bánh kẹo',
icon:'🍬',
kind:'plastic',
tip:'Vỏ túi nilon đựng bánh kẹo thuộc nhóm nhựa bao bì (プラごみ).',
},
{
id:'egg_pack',
jp:'卵のパック',
vi:'Vỉ trứng nhựa',
icon:'🥚',
kind:'plastic',
tip:'Vỉ đựng trứng bằng nhựa trong thuộc nhóm nhựa bao bì (プラごみ).',
},
{
id:'pet_cap',
jp:'ペットボトルのキャップ',
vi:'Nắp chai',
icon:'🔵',
kind:'plastic',
tip:'Nắp và nhãn chai nhựa phải tháo riêng rồi bỏ vào nhựa bao bì (プラごみ).',
},
{
id:'can',
jp:'空き缶',
vi:'Lon rỗng',
icon:'🥫',
kind:'res',
tip:'Lon nước uống tráng sạch được thu gom làm rác tái chế (資源ゴミ).',
},
{
id:'pet_bottle',
jp:'ペットボトル',
vi:'Chai nhựa (đã bóc nhãn)',
icon:'🍾',
kind:'res',
tip:'Thân chai PET đã tháo nắp, bóc nhãn và súc sạch thuộc rác tái chế (資源ゴミ).',
},
{
id:'glass_bottle',
jp:'びん',
vi:'Chai thủy tinh',
icon:'🫙',
kind:'res',
tip:'Chai lọ thủy tinh nguyên vẹn rửa sạch thuộc nhóm rác tái chế (資源ゴミ).',
},
{
id:'broken_bowl',
jp:'割れた茶碗',
vi:'Bát vỡ',
icon:'🥣',
kind:'nonburn',
tip:'Bát gốm sứ vỡ gói giấy dày ghi “キケン” rồi bỏ vào rác không cháy (燃えないゴミ).',
},
{
id:'battery',
jp:'電池',
vi:'Pin',
icon:'🔋',
kind:'nonburn',
tip:'Pin khô chứa kim loại không đốt được nên bỏ vào rác không cháy (燃えないゴミ).',
},
{
id:'umbrella',
jp:'壊れた傘',
vi:'Ô hỏng',
icon:'☂️',
kind:'nonburn',
tip:'Ô hỏng có khung kim loại thuộc nhóm rác không cháy (燃えないゴミ).',
},
];
for(const it of ITEM_LIST){
Object.defineProperty(ITEM_LIST,it.id,{value:it,enumerable:false});
}
export const ITEMS=ITEM_LIST;
export const SCHEDULE=['burn','plastic','res','burn','nonburn'];
export const DAY_JP=['月','火','水','木','金'];
export function todayKind(day=0){
const n=SCHEDULE.length;
const i=((day|0)%n+n)%n;
return SCHEDULE[i];
}
export function createSort(day=0,rand=rng((day+1)*709)){
const r=typeof rand==='function'?rand:rng(Number(rand)||1);
const tKind=todayKind(day);
const todayPool=ITEMS.filter((it)=>it.kind===tKind);
const first=todayPool[Math.floor(r()*todayPool.length)%todayPool.length];
const rest=ITEMS.filter((it)=>it.id!==first.id);
for(let i=rest.length-1;i>0;i--){
const j=Math.floor(r()*(i+1))%(i+1);
const tmp=rest[i];
rest[i]=rest[j];
rest[j]=tmp;
}
const picked=[first,...rest.slice(0,4)];
for(let i=picked.length-1;i>0;i--){
const j=Math.floor(r()*(i+1))%(i+1);
const tmp=picked[i];
picked[i]=picked[j];
picked[j]=tmp;
}
return{
day,
todayKind:tKind,
items:picked,
idx:0,
wrong:[],
done:false,
};
}
export function answer(st,kind){
if(!st||st.done||st.idx>=st.items.length){
return{ok:false,item:null,done:true};
}
const item=st.items[st.idx];
const ok=item.kind===kind;
if(!ok){
st.wrong.push({...item,chosen:kind});
}
st.idx++;
if(st.idx>=st.items.length){
st.done=true;
}
return{ok,item,done:st.done};
}
export function result(st){
const wrongCount=st.wrong.length;
const fx=wrongCount===0
?{culture:4,mental:2}
:{culture:-wrongCount};
const wrong=st.wrong.map((w)=>({
id:w.id,
jp:w.jp,
vi:w.vi,
icon:w.icon,
kind:w.kind,
chosen:w.chosen,
tip:w.tip,
}));
return{fx,perfect:wrongCount===0,wrong};
}
