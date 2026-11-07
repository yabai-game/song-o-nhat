/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const PLAY={
WARN_EVERY:30*60,
DAY_LIMIT:180*60,
MSG:'Chơi quá 180 phút một ngày sẽ ảnh hưởng xấu đến sức khỏe',
};
export function dayKey(d=new Date()){
const p=(n)=>String(n).padStart(2,'0');
return`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function tickPlay(rec,dt,today){
const r=rec&&rec.day===today?{...rec}:{day:today,sec:0,marks:0};
r.sec+=Math.max(0,dt);
const marks=Math.floor(r.sec/PLAY.WARN_EVERY);
let ev=null;
if(marks>r.marks){
r.marks=marks;
ev=r.sec>=PLAY.DAY_LIMIT?'over':'warn';
}
return{rec:r,ev};
}
