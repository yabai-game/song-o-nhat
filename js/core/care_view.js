/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const CARE_ROOM={
bounds:{x0:-8.4,x1:8.4,z0:-6.3,z1:6.3},
start:{x:0,z:4.2,yaw:Math.PI},
nurse:{x:-7.2,z:-0.2},
folk:[[-2.6,1.1,0.9],[2.8,2.9,-2.2],[3.2,-1.8,-1],[-1.6,-1.6,0.4]],
tables:[[-5.4,-2,0],[0.2,-3.6,0],[5.4,0.2,0],[-5.8,3.2,0]],
showcase:{pos:[1.5,2.6,7.6],look:[-0.6,1.0,-2.4]},
};
export const CARE_BLOCKS=(()=>{
const blocks=[];
for(const[x,z]of CARE_ROOM.tables){
blocks.push({x:x-0.7,z,r:0.8},{x:x+0.7,z,r:0.8});
}
for(const[x,z]of CARE_ROOM.folk)blocks.push({x,z,r:0.68});
blocks.push(
{x:-8.1,z:-3.2,r:0.7},
{x:-7.9,z:-5.8,r:0.45},
{x:8,z:-6,r:0.45},
{x:6.6,z:-3.8,r:0.7},
);
return blocks;
})();
export const CARE_FOLLOW=0.30;
export function careCamera(aspect,player={x:0,z:0}){
const px=Array.isArray(player)?(player[0]||0):(player?.x??0);
const pz=Array.isArray(player)?(player[2]??player[1]??0):(player?.z??0);
const lx=px*CARE_FOLLOW;
const lz=pz*CARE_FOLLOW;
if(aspect<1){
return{
eye:[lx,13.8,20.6+lz],
look:[lx,-0.35,lz],
fov:70,
};
}
return{
eye:[lx,6.6,12.0+lz],
look:[lx,0.95,lz],
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
