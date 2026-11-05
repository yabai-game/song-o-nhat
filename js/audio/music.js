/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
const FILES='audio/';
const FADE=2.5;
const VOL=0.55;
const PREF='son-music';
export const TRACKS={
title:'Màn hình chính',
street_spring:'Phố mùa xuân',street_summer:'Phố mùa hạ',street_autumn:'Phố mùa thu',street_winter:'Phố mùa đông',
dorm_warm:'Ký túc xá (xuân hạ)',dorm_cold:'Ký túc xá (thu đông)',
work_site:'Công trường',work_care:'Viện dưỡng lão',work_bento:'Xưởng cơm hộp',work_lotus:'Ruộng sen',
market:'Siêu thị',station:'Ga tàu',
matsuri:'Lễ hội mùa hè / Obon',newyear:'Tết / giao thừa',halloween:'Halloween',
};
const FALLBACK={
street_summer:'street_spring',street_autumn:'street_spring',street_winter:'street_autumn',
dorm_cold:'dorm_warm',dorm_warm:'street_spring',station:'street_spring',market:'street_spring',
work_site:'street_summer',work_care:'dorm_warm',work_bento:'work_site',work_lotus:'street_summer',
matsuri:'street_summer',newyear:'street_winter',halloween:'street_autumn',title:'street_spring',
};
const SEASONS=['spring','summer','autumn','winter'];
const FEST={natsumatsuri:'matsuri',obon:'matsuri',hanami:'matsuri',shogatsu:'newyear',oomisoka:'newyear',halloween:'halloween'};
export function pickTrack({mode,stageId,season=0,festival=null,atWork=false}){
const s=SEASONS[season]||'spring';
if(mode==='title'||mode==='creator'||stageId==='town')return'title';
if(stageId==='shrine')return FEST[festival]||`street_${s}`;
if(stageId==='dorm')return season===2||season===3?'dorm_cold':'dorm_warm';
if(stageId==='station')return'station';
if(mode==='market'||stageId==='market')return'market';
if(stageId==='care'||stageId==='bento'||stageId==='lotus')return`work_${stageId}`;
if(stageId==='site')return mode==='shift'||atWork?'work_site':`street_${s}`;
return`street_${s}`;
}
export class Music{
constructor(){
this.ctx=null;this.bus=null;this.cur=null;this.want=null;this.buffers={};this.missing=new Set();
this.muted=false;try{this.muted=localStorage.getItem(PREF)==='0';}catch{}
this.loading={};this.raw={};
const unlock=()=>{this.start();window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);};
window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);
document.addEventListener('visibilitychange',()=>{if(!this.ctx)return;document.hidden?this.ctx.suspend():(!this.muted&&this.ctx.resume());});
}
start(){
if(this.ctx)return;
const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
this.ctx=new AC();this.bus=this.ctx.createGain();this.bus.gain.value=this.muted?0:VOL;this.bus.connect(this.ctx.destination);
if(this.want)this.play(this.want);
}
setMuted(m){
this.muted=!!m;try{localStorage.setItem(PREF,m?'0':'1');}catch{}
if(!this.ctx)return;
this.bus.gain.setTargetAtTime(m?0:VOL,this.ctx.currentTime,0.2);
if(!m)this.ctx.resume();
}
toggle(){this.setMuted(!this.muted);return!this.muted;}
resolve(id){let k=id,n=0;while(k&&this.missing.has(k)&&n++<6)k=FALLBACK[k];return k;}
async load(id){
if(this.buffers[id])return this.buffers[id];
if(!this.loading[id]){
const bytes=this.raw[id]?Promise.resolve(this.raw[id]):fetch(`${FILES}${id}.mp3`).then((r)=>{if(!r.ok)throw new Error(id);return r.arrayBuffer();});
this.loading[id]=bytes.then((b)=>{delete this.raw[id];return this.ctx.decodeAudioData(b);}).then((buf)=>{this.buffers[id]=buf;return buf;})
.catch(()=>{this.missing.add(id);return null;});
}
return this.loading[id];
}
async prefetch(onEach){
await Promise.all(Object.keys(TRACKS).map((id)=>fetch(`${FILES}${id}.mp3`).then((r)=>(r.ok?r.arrayBuffer():null))
.then((b)=>{if(b)this.raw[id]=b;else this.missing.add(id);}).catch(()=>this.missing.add(id)).finally(()=>onEach&&onEach())));
}
set(id){
if(id===this.want)return;
this.want=id;
if(this.ctx)this.play(id);
}
async play(id){
let k=this.resolve(id),buf=null;
while(k){buf=await this.load(k);if(buf)break;k=this.resolve(FALLBACK[k]);}
if(id!==this.want||!buf||(this.cur&&this.cur.id===k))return;
this.fadeOut(this.cur);
this.cur=this.voice(k,buf);
}
voice(id,buf){
const t0=this.ctx.currentTime,g=this.ctx.createGain();
g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(1,t0+FADE);g.connect(this.bus);
const v={id,buf,g,src:null,timer:0};
const startSrc=(at)=>{
const s=this.ctx.createBufferSource();s.buffer=buf;s.connect(g);s.start(at);v.src=s;
const next=at+Math.max(4,buf.duration-FADE);
clearTimeout(v.timer);
v.timer=setTimeout(()=>{if(this.cur===v){const old=s,og=this.ctx.createGain();old.disconnect();old.connect(og);og.connect(g);og.gain.setValueAtTime(1,next);og.gain.linearRampToValueAtTime(0,next+FADE);startSrc(next);}},(next-this.ctx.currentTime-0.3)*1000);
};
startSrc(t0);
return v;
}
fadeOut(v){
if(!v)return;
const t=this.ctx.currentTime;clearTimeout(v.timer);
v.g.gain.cancelScheduledValues(t);v.g.gain.setValueAtTime(v.g.gain.value,t);v.g.gain.linearRampToValueAtTime(0,t+FADE);
setTimeout(()=>{try{v.src.stop();}catch{}v.g.disconnect();},(FADE+0.2)*1000);
}
}
