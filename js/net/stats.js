/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
const queue=[];
let timer=0;
function flush(){
const gc=window.goatcounter;
if(!gc||typeof gc.count!=='function')return false;
while(queue.length){try{gc.count(queue.shift());}catch{}}
return true;
}
function send(v){
queue.push(v);
if(flush()||timer)return;
let tries=0;
timer=setInterval(()=>{if(flush()||++tries>40){clearInterval(timer);timer=0;}},500);
}
export function pageview(){send({path:location.pathname.replace(/[^/]*$/,'')||'/',title:document.title});}
export function track(name,title=name){send({path:name,title,event:true});}
