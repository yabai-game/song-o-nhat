/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export function stars({won,miss=0,maxMiss=0,timeLeft=0,limit=0,extra=false,hintUsed=false}={}){
if(!won)return 0;
let s=1;
const accOk=!hintUsed&&(miss===0||(maxMiss>=3&&miss<=1));
if(accOk)s++;
const bonusOk=limit>0?timeLeft>=0.30*limit-1e-6:!!extra;
if(bonusOk)s++;
return s;
}
export function formatStars(n){
const c=Math.max(0,Math.min(3,Math.round(n||0)));
return'★'.repeat(c)+'☆'.repeat(3-c);
}
export function starDetails(opts={}){
const{
won=false,
miss=0,
maxMiss=0,
timeLeft=0,
limit=0,
extra=false,
hintUsed=false,
extraLabel='Đạt điều kiện phụ của nghề',
}=opts;
const count=stars(opts);
const s1=!!won;
const s2=s1&&!hintUsed&&(miss===0||(maxMiss>=3&&miss<=1));
const s3=s1&&(limit>0?timeLeft>=0.30*limit-1e-6:!!extra);
let line2;
if(hintUsed){
line2='☆ Đã dùng 💡 Gợi ý (mất ★ chuẩn xác)';
}else if(maxMiss>=3){
line2=`${s2 ? '★' : '☆'} Ít sai sót (${miss} lỗi, cần ≤ 1 lỗi)`;
}else{
line2=`${s2 ? '★' : '☆'} Không mắc lỗi nào (${miss} lỗi)`;
}
let line3;
if(limit>0){
const needSec=Math.ceil(0.30*limit);
const leftSec=Math.max(0,Math.floor(timeLeft));
line3=`${s3 ? '★' : '☆'} Còn ≥ 30% thời gian (còn ${leftSec}s / cần ≥ ${needSec}s)`;
}else{
line3=`${s3 ? '★' : '☆'} ${extraLabel}`;
}
const starsText=formatStars(count);
return{
count,
stars:count,
starsText,
text:starsText,
lines:[
{ok:s1,text:`${s1 ? '★' : '☆'} Hoàn thành mục tiêu ca làm`},
{ok:s2,text:line2},
{ok:s3,text:line3},
],
};
}
export function recordStars(S,job,day,part,count){
if(!S||!job||day===undefined||day===null||!part)return count||0;
if(!S.flags)S.flags={};
if(!S.flags.stars)S.flags.stars={};
if(!S.flags.stars[job])S.flags.stars[job]={};
if(!S.flags.stars[job][day])S.flags.stars[job][day]={};
const prev=S.flags.stars[job][day][part]||0;
const best=Math.max(prev,Math.max(0,Math.min(3,Math.round(count||0))));
S.flags.stars[job][day][part]=best;
return best;
}
export function getStars(S,job,day,part='b'){
return S?.flags?.stars?.[job]?.[day]?.[part]||0;
}
