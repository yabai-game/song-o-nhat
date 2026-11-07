/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const KONBINI_STORE={
width:9.0,
depth:11.0,
bounds:{x0:-3.6,x1:3.6,z0:-3.6,z1:2.2},
start:{x:-2.6,z:-3.1,yaw:0.45},
greeterAt:{x:0.9,z:0.2,yaw:-2.5},
blocks:[
{x:-0.45,z:1.45,r:0.62},
{x:0.45,z:1.45,r:0.62},
{x:-2.3,z:-1.8,r:0.55},
{x:0.0,z:-2.2,r:0.55},
{x:2.3,z:-1.8,r:0.55},
],
player:{x:0,z:2.18,yaw:Math.PI},
tencho:{x:1.45,z:1.95,yaw:-2.6},
foreman:{x:1.45,z:1.95,yaw:-2.6},
talkPlayer:{x:-0.2,z:0.4},
door:{x:-2.8,z:-3.4},
queueSpot:{x:-0.32,z:-0.65,yaw:0},
counterCustomer:{x:0,z:0.55,yaw:0},
counterY:0.92,
counterZ:1.35,
itemSlots:[
[-0.22,0.95,1.35],
[-0.08,0.95,1.35],
[0.06,0.95,1.35],
[0.20,0.95,1.35],
],
registerPos:[-0.42,1.06,1.35],
hotCasePos:[0.44,1.08,1.35],
coffeePos:[1.18,1.08,1.55],
showcase:{pos:[-2.8,2.55,-2.6],look:[0.2,1.05,1.1]},
};
export function konbiniCamera(aspect=1){
if(aspect<1){
return{
eye:[0.02,2.06,3.32],
look:[0.02,1.02,0.55],
fov:62,
};
}
return{
eye:[0.02,1.66,3.05],
look:[0.02,0.84,0.55],
fov:50,
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
