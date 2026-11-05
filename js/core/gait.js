/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const GAIT={
WALK_CLIP:0.93,
RUN_CLIP:1.51,
WALK_MAX:3.5,
TS_MIN:0.6,
WALK_TS_MAX:1.8,
TS_MAX:2.2,
TURN_RATE:6,
};
const clamp=(v,lo,hi)=>(v<lo?lo:v>hi?hi:v);
export function gait(speed){
if(!(speed>=0.05))return{clip:'idle',timeScale:1};
if(speed<=GAIT.WALK_MAX){
return{
clip:'walk',
timeScale:clamp(speed/GAIT.WALK_CLIP,GAIT.TS_MIN,GAIT.WALK_TS_MAX),
};
}
return{
clip:'run',
timeScale:clamp(speed/GAIT.RUN_CLIP,1,GAIT.TS_MAX),
};
}
export function turnYaw(yaw,targetYaw,dt,rate=GAIT.TURN_RATE){
let dy=Math.atan2(Math.sin(targetYaw-yaw),Math.cos(targetYaw-yaw));
const step=Math.max(0,rate*dt);
if(Math.abs(dy)<=step||Math.abs(dy)<1e-4){
return{yaw:targetYaw,turning:false};
}
return{yaw:yaw+Math.sign(dy)*step,turning:true};
}
