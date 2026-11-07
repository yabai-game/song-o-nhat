/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const DPR_LEVELS=[1.5,1.25,1.0];
export function createAdaptiveDpr({
levels=DPR_LEVELS,
downThresholdMs=22,
downWindowMs=2000,
upThresholdMs=14,
upWindowMs=4000,
cooldownWindowMs=2000,
startIdx=0,
}={}){
let idx=Math.max(0,Math.min(levels.length-1,startIdx));
let downMsSum=0;
let downFrames=0;
let upMsSum=0;
let upFrames=0;
let cooldownMs=0;
return{
get dpr(){
return levels[idx];
},
get idx(){
return idx;
},
get cooldownMs(){
return cooldownMs;
},
reset(newIdx=0){
idx=Math.max(0,Math.min(levels.length-1,newIdx));
downMsSum=0;
downFrames=0;
upMsSum=0;
upFrames=0;
cooldownMs=0;
return levels[idx];
},
tick(rawDtMs){
if(!(rawDtMs>0)){
return{changed:false,dpr:levels[idx],idx};
}
const dtMs=Math.min(rawDtMs,250);
if(cooldownMs>0){
cooldownMs=Math.max(0,cooldownMs-dtMs);
downMsSum=0;
downFrames=0;
upMsSum=0;
upFrames=0;
return{changed:false,dpr:levels[idx],idx};
}
downMsSum+=dtMs;
downFrames+=1;
upMsSum+=dtMs;
upFrames+=1;
if(downMsSum>=downWindowMs){
const downAvg=downMsSum/downFrames;
downMsSum=0;
downFrames=0;
if(downAvg>downThresholdMs&&idx<levels.length-1){
idx+=1;
upMsSum=0;
upFrames=0;
cooldownMs=cooldownWindowMs;
return{changed:true,dpr:levels[idx],idx,avgMs:downAvg,dir:'down'};
}
}
if(upMsSum>=upWindowMs){
const upAvg=upMsSum/upFrames;
upMsSum=0;
upFrames=0;
if(upAvg<upThresholdMs&&idx>0){
idx-=1;
downMsSum=0;
downFrames=0;
cooldownMs=cooldownWindowMs;
return{changed:true,dpr:levels[idx],idx,avgMs:upAvg,dir:'up'};
}
}
return{changed:false,dpr:levels[idx],idx};
},
};
}
export function charStepInterval(distSq,lowMem=false){
if(distSq>484)return 3;
if(distSq>144)return lowMem?3:2;
if(lowMem&&distSq>49)return 2;
return 1;
}
export function shouldCullByFog(distSq,maxDist=38){
return distSq>maxDist*maxDist;
}
