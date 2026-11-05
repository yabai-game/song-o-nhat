/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{BENTO}from'./bento_rules.js';
export const VIEW_SCALE=0.12;
export function beltToWorldX(u){
const zoneMid=(BENTO.ZONE0+BENTO.ZONE1)/2;
return(u-zoneMid)*VIEW_SCALE;
}
export function zoneWorld(){
return{
x0:beltToWorldX(BENTO.ZONE0),
x1:beltToWorldX(BENTO.ZONE1),
};
}
export function fpCamera(aspect){
if(aspect<1){
return{
eye:[0,1.75,1.05],
look:[0,0.90,0.15],
fov:70,
};
}
return{
eye:[0,1.50,0.75],
look:[0,0.90,0.02],
fov:45,
};
}
export function project(cam,aspect,p){
const px=Array.isArray(p)?p[0]:p.x;
const py=Array.isArray(p)?p[1]:p.y;
const pz=Array.isArray(p)?p[2]:p.z;
const[ex,ey,ez]=cam.eye;
const[lx,ly,lz]=cam.look;
let fx=lx-ex;
let fy=ly-ey;
let fz=lz-ez;
const fLen=Math.hypot(fx,fy,fz)||1;
fx/=fLen;
fy/=fLen;
fz/=fLen;
let rx=-fz;
let ry=0;
let rz=fx;
const rLen=Math.hypot(rx,ry,rz)||1;
rx/=rLen;
ry/=rLen;
rz/=rLen;
const ux=ry*fz-rz*fy;
const uy=rz*fx-rx*fz;
const uz=rx*fy-ry*fx;
const vx=px-ex;
const vy=py-ey;
const vz=pz-ez;
const xc=vx*rx+vy*ry+vz*rz;
const yc=vx*ux+vy*uy+vz*uz;
const depth=vx*fx+vy*fy+vz*fz;
const tanHalfFov=Math.tan((cam.fov*Math.PI)/360);
const denomY=depth*tanHalfFov;
const denomX=denomY*aspect;
const ndcX=denomX!==0?xc/denomX:0;
const ndcY=denomY!==0?yc/denomY:0;
return[ndcX,ndcY,depth];
}
