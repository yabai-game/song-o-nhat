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
constructor(){
this.items=[];
this._hudTs=-1e9;
this._minTop=6;
this._obs=[];
this._lastW=0;
this._lastH=0;
if(typeof addEventListener==='function'){
addEventListener('resize',()=>{this._hudTs=-1e9;});
}
}
tag(obj,text,me=false,y=1.95){
const el=document.createElement('div');el.className='tag'+(me?' me':'');el.textContent=text;
$('tags').appendChild(el);
const it={el,obj,y,kind:'tag',w:0,h:0,left:0,top:0,vis:false};this.items.push(it);return it;
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
this.items.push({el,obj,y:y+0.45,kind:'bubble',t:sec,w:0,h:0,left:0,top:0,vis:false});
}
clear(){for(const it of this.items)it.el.remove();this.items.length=0;}
_refreshHud(W,H,now){
if(now-this._hudTs<200&&W===this._lastW&&H===this._lastH)return;
this._hudTs=now;
this._lastW=W;
this._lastH=H;
let minTop=6;
const dayHud=$('dayhud'),shiftHud=$('shifthud');
const topCands=[];
if(dayHud&&!dayHud.hidden)topCands.push(dayHud.querySelector('.top'));
if(shiftHud&&!shiftHud.hidden){
topCands.push(
shiftHud.querySelector('.top'),
$('sh-place'),
$('sh-rank'),
$('sh-tip'),
$('sh-gust'),
$('sh-bars'),
);
}
for(const el of topCands){
if(!el||el.hidden)continue;
const r=el.getBoundingClientRect();
if(r.width>0&&r.height>0)minTop=Math.max(minTop,r.bottom+6);
}
this._minTop=minTop;
const obs=[];
for(const id of['joy','acts']){
const el=$(id);
if(!el||el.hidden)continue;
const r=el.getBoundingClientRect();
if(r.width>0&&r.height>0)obs.push({l:r.left,r:r.right,t:r.top,b:r.bottom});
}
this._obs=obs;
}
update(dt){
for(let i=this.items.length-1;i>=0;i--){
const it=this.items[i];
if(it.kind==='bubble'){
it.t-=dt;
if(it.t<=0){it.el.remove();this.items.splice(i,1);}
}
}
if(!this.items.length)return;
const W=window.innerWidth||canvas.clientWidth||375;
const H=window.innerHeight||canvas.clientHeight||812;
this._refreshHud(W,H,performance.now());
const minTop=this._minTop;
for(let i=this.items.length-1;i>=0;i--){
const it=this.items[i];
const txt=it.el.textContent;
if(it.el.hidden||!txt||!txt.trim()){
it._active=false;
continue;
}
it._active=true;
if(!it.w||!it.h||it.txt!==txt){
it.txt=txt;
it.w=it.el.offsetWidth;
it.h=it.el.offsetHeight;
}
}
const placed=this._obs.slice();
for(let i=this.items.length-1;i>=0;i--){
const it=this.items[i];
if(!it._active){
it.vis=false;
if(it._visStyle!=='hidden'){it._visStyle='hidden';it.el.style.visibility='hidden';}
continue;
}
const o=it.obj.holder||it.obj;
o.getWorldPosition(_v);_v.y+=it.y;_v.project(camera);
if(_v.z>1||!o.parent||!o.visible||!it.w||!it.h){
it.vis=false;
if(it._visStyle!=='hidden'){it._visStyle='hidden';it.el.style.visibility='hidden';}
continue;
}
const x=(_v.x*0.5+0.5)*W,y=(-_v.y*0.5+0.5)*H;
const left=Math.min(Math.max(x-it.w/2,8),Math.max(8,W-it.w-8));
const maxTop=Math.max(minTop,H-it.h-10);
let top=Math.min(Math.max(y-it.h-(it.kind==='bubble'?8:0),minTop),maxTop);
for(const r of placed){
if(!(left<r.r+4&&left+it.w>r.l-4&&top<r.b+4&&top+it.h>r.t-4))continue;
if(r.t-it.h-6>=minTop&&(it.kind!=='bubble'||r.b+6+it.h>H-10))top=r.t-it.h-6;
else top=Math.min(r.b+6,maxTop);
}
it.left=left;
it.top=top;
it.vis=true;
placed.push({l:left,r:left+it.w,t:top,b:top+it.h});
if(it._visStyle!=='visible'){it._visStyle='visible';it.el.style.visibility='visible';}
const tr=`translate(${left}px, ${top}px)`;
if(it._tr!==tr){it._tr=tr;it.el.style.transform=tr;}
if(it.kind==='bubble'){
const tail=`${Math.min(Math.max(x - left, 14), it.w - 14)}px`;
if(it._tail!==tail){it._tail=tail;it.el.style.setProperty('--tail',tail);}
}
}
}
}
