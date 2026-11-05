/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{JOBS}from'./jobs.js';
export const CAREER={FEE:8000,LESSONS:3,LESSON_MIN:60,LESSON_MENTAL:-4,JP_MIN:30,QUESTIONS:5,PASS:4};
export const TERMS={
site:[['足場','Giàn giáo'],['安全帯','Dây an toàn'],['鉄筋','Cốt thép'],['資材','Vật tư'],['朝礼','Họp buổi sáng'],['危険予知','Dự đoán nguy hiểm'],['ヘルメット','Mũ bảo hộ']],
care:[['食事介助','Hỗ trợ ăn uống'],['車椅子','Xe lăn'],['入浴介助','Hỗ trợ tắm'],['利用者','Người dùng dịch vụ (các cụ)'],['転倒','Té ngã'],['口腔ケア','Vệ sinh răng miệng'],['敬語','Kính ngữ']],
bento:[['盛り付け','Bày món ăn'],['異物混入','Dị vật lẫn vào'],['手洗い','Rửa tay'],['衛生','Vệ sinh'],['賞味期限','Hạn sử dụng'],['不良品','Hàng lỗi'],['弁当','Cơm hộp']],
lotus:[['掘る','Đào'],['洗う','Rửa'],['抜く','Nhổ'],['蓮根','Củ sen'],['収穫','Thu hoạch'],['泥','Bùn'],['蓮田','Ruộng sen']],
};
export const targets=(S)=>Object.keys(JOBS).filter((j)=>JOBS[j].ready&&j!==S.job);
export function cannotStudy(S){
if(S.career&&S.career.target)return'studying';
if((S.jp||0)<CAREER.JP_MIN)return'jp';
if(S.money<CAREER.FEE)return'money';
return null;
}
export function startStudy(S,target){
if(cannotStudy(S)||!targets(S).includes(target))return false;
S.money-=CAREER.FEE;
S.career={target,lessons:0,tries:0};
return true;
}
export function study(S){
const c=S.career;if(!c||c.lessons>=CAREER.LESSONS)return null;
c.lessons++;
S.mental=Math.max(0,S.mental+CAREER.LESSON_MENTAL);
return{lessons:c.lessons,ready:c.lessons>=CAREER.LESSONS};
}
export const examReady=(S)=>!!(S.career&&S.career.lessons>=CAREER.LESSONS);
export function examQuestions(target,rng=Math.random){
const pool=TERMS[target].slice();
const pick=[];
while(pick.length<CAREER.QUESTIONS&&pool.length)pick.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
return pick.map(([jp,vi])=>{
const wrong=TERMS[target].filter(([j])=>j!==jp).map(([,v])=>v);
const opts=[vi];
while(opts.length<4&&wrong.length)opts.push(wrong.splice(Math.floor(rng()*wrong.length),1)[0]);
for(let i=opts.length-1;i>0;i--){const k=Math.floor(rng()*(i+1));[opts[i],opts[k]]=[opts[k],opts[i]];}
return{jp,answer:vi,options:opts};
});
}
export function takeExam(S,questions,answers){
const score=questions.reduce((n,q,i)=>n+(answers[i]===q.answer?1:0),0);
const pass=score>=CAREER.PASS;
const c=S.career;c.tries++;
if(pass){
const from=S.job;
S.job=c.target;
S.jobXp=0;
S.career=null;
S.flags=S.flags||{};
S.flags.careerPassed=true;
S.festLog=S.festLog||{};
S.festLog.tokuteiPassed=true;
return{pass,score,from,to:S.job};
}
c.lessons=CAREER.LESSONS-1;
S.money-=CAREER.FEE;
return{pass,score};
}
export function quitStudy(S){S.career=null;}
