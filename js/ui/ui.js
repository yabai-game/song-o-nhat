/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{camera,canvas}from'../gfx/stage.js';
import{STAT_LABELS,yen}from'../core/state.js';
export const $=(id)=>document.getElementById(id);
export const show=(id,on=true)=>{$(id).hidden=!on;};
const esc=(s)=>String(s).replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export{esc};
export function card(html,buttons=[]){
const c=$('card');c.innerHTML=html;
const row=document.createElement('div');row.className='col';
for(const b of buttons){
const el=document.createElement('button');el.className=b.cls||'go';el.textContent=b.label;
el.addEventListener('click',()=>{show('modal',false);b.on&&b.on();});
row.appendChild(el);
}
c.appendChild(row);show('modal');
row.querySelector('button')?.focus();
}
export const closeCard=()=>show('modal',false);
let toastT=0;
export function toast(title,sub='',sec=3){
const t=$('toast');t.innerHTML=esc(title)+(sub?`<small>${esc(sub)}</small>`:'');
t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},sec*1000);
}
export function deltaText(list){
return list.filter(([,v])=>v).map(([k,v])=>`${STAT_LABELS[k] || k} ${v > 0 ? '+' : ''}${k === 'money' ? yen(v) : v}`).join(' · ');
}
export function deltaChips(list){
return list.filter(([,v])=>v).map(([k,v])=>`<span class="delta${v < 0 ? ' neg' : ''}">${esc(STAT_LABELS[k] || k)} ${v > 0 ? '+' : ''}${k === 'money' ? yen(v) : v}</span>`).join('');
}
const _v=new THREE.Vector3();
export class Overhead{
static MAX_BUBBLES=2;
constructor(){this.items=[];}
tag(obj,text,me=false,y=1.95){
const el=document.createElement('div');el.className='tag'+(me?' me':'');el.textContent=text;
$('tags').appendChild(el);
const it={el,obj,y,kind:'tag'};this.items.push(it);return it;
}
say(obj,text,sec=3,y=1.95){
const[jp,vi]=String(text).split(' — ');
const tip=document.getElementById('sh-tip');
if(tip&&!tip.hidden&&tip.querySelector('b')&&tip.querySelector('b').textContent.trim()===jp.trim())return;
for(const it of this.items)if(it.kind==='bubble'&&it.obj===obj){it.t=0;}
const live=this.items.filter((it)=>it.kind==='bubble'&&it.t>0&&it.obj!==obj);
if(live.length>=Overhead.MAX_BUBBLES)live.slice(0,live.length-Overhead.MAX_BUBBLES+1).forEach((it)=>{it.t=0;});
sec=Math.min(vi?4:2,sec);
const el=document.createElement('div');el.className='bubble';
el.innerHTML=vi?`<span class="jp">${esc(jp)}</span><span class="vi">${esc(vi)}</span>`:esc(text);
$('tags').appendChild(el);
this.items.push({el,obj,y:y+0.45,kind:'bubble',t:sec});
}
clear(){for(const it of this.items)it.el.remove();this.items.length=0;}
update(dt){
const W=canvas.clientWidth,H=canvas.clientHeight;
let minTop=6;
for(const el of document.querySelectorAll('#dayhud:not([hidden]) .top, #shifthud:not([hidden]) .top, #shifthud:not([hidden]) .place, #shifthud:not([hidden]) .rank, #shifthud:not([hidden]) .tip:not([hidden]), #shifthud:not([hidden]) .gust:not([hidden]), #shifthud:not([hidden]) .mini-bars:not([hidden])')){
const r=el.getBoundingClientRect();if(r.height)minTop=Math.max(minTop,r.bottom+6);
}
const placed=[];
for(let i=this.items.length-1;i>=0;i--){
const it=this.items[i];
if(it.kind==='bubble'){it.t-=dt;if(it.t<=0){it.el.remove();this.items.splice(i,1);continue;}}
const o=it.obj.holder||it.obj;
o.getWorldPosition(_v);_v.y+=it.y;_v.project(camera);
if(_v.z>1||!o.parent||!o.visible){it.el.style.visibility='hidden';continue;}
const txt=it.el.textContent;
if(!it.w||it.txt!==txt){it.txt=txt;it.w=it.el.offsetWidth;it.h=it.el.offsetHeight;}
const x=(_v.x*0.5+0.5)*W,y=(-_v.y*0.5+0.5)*H;
const left=Math.min(Math.max(x-it.w/2,8),W-it.w-8);
let top=Math.max(y-it.h-(it.kind==='bubble'?8:0),minTop);
for(const r of placed){
if(!(left<r.r+4&&left+it.w>r.l-4&&top<r.b+4&&top+it.h>r.t-4))continue;
if(it.kind==='bubble'||r.t-it.h-6<minTop)top=r.b+6;else top=r.t-it.h-6;
}
placed.push({l:left,r:left+it.w,t:top,b:top+it.h});
it.el.style.visibility='visible';
it.el.style.transform=`translate(${left}px, ${top}px)`;
if(it.kind==='bubble')it.el.style.setProperty('--tail',`${Math.min(Math.max(x - left, 14), it.w - 14)}px`);
}
}
}
