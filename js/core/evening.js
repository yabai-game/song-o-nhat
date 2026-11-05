/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{applyFx}from'./state.js';
export const EVENING={
OUT:18*60+40,
MIN_PER_SEC:1,
TALK:25,
BATH:{min:20,fx:{health:2}},
CALL:{min:30,fx:{mental:3}},
LATE:23*60,
};
export function spotFor(ev){
if(ev.place==='konbini'||ev.place==='bank')return'konbini';
if(ev.place==='home')return ev.who?'dormFront':'room';
return'dormFront';
}
export function createEvening(spot){
return{min:EVENING.OUT,spot,phase:'toSpot',talked:false,bath:false,call:false,slept:false};
}
export function tick(ev,dt){if(ev.phase==='toSpot'||ev.phase==='toDorm'||ev.phase==='room')ev.min+=dt*EVENING.MIN_PER_SEC;}
export function talked(ev){
ev.talked=true;ev.min+=EVENING.TALK;
ev.phase=ev.spot==='room'?'room':'toDorm';
}
export function enterRoom(ev){if(ev.phase==='toDorm'||ev.phase==='toSpot')ev.phase='room';}
export function act(S,ev,id){
if(ev.phase!=='room')return{ok:false,why:'not-now'};
const A=id==='bath'?EVENING.BATH:id==='call'?EVENING.CALL:null;
if(!A)return{ok:false,why:'unknown'};
if(ev[id])return{ok:false,why:'done'};
ev[id]=true;ev.min+=A.min;
return{ok:true,deltas:applyFx(S,A.fx)};
}
export function toBed(ev){
if(ev.phase!=='room')return false;
ev.phase='bed';ev.slept=true;
return true;
}
