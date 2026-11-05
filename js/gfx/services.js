/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{canvasTexture,signTexture}from'./stage.js';
export const SERVICES={
clinic:{x:12.5,z:34.2,door:{x:12.5,z:28.4},jp:'さくらクリニック',vi:'Phòng khám'},
drug:{x:12.5,z:34.2,door:{x:11.4,z:28.4},jp:'ドラッグストア さくら',vi:'Nhà thuốc'},
post:{x:19.2,z:34.3,door:{x:19.2,z:28.4},jp:'郵便局',vi:'Bưu điện'},
cityhall:{x:31,z:36.4,door:{x:28.5,z:28.4},jp:'さくら市役所',vi:'Tòa thị chính'},
};
function verticalSign(text,bg,fg,w=96,cell=92){
const chars=[...text],h=cell*chars.length+24;
return{tex:canvasTexture(w,h,(g)=>{
g.fillStyle=bg;g.fillRect(0,0,w,h);
g.strokeStyle=fg;g.lineWidth=6;g.strokeRect(5,5,w-10,h-10);
g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
g.font=`800 ${Math.round(cell * 0.72)}px "Zen Maru Gothic", "Yu Gothic", sans-serif`;
chars.forEach((c,i)=>g.fillText(c,w/2,12+cell*(i+0.5)));
}),aspect:w/h};
}
export function buildServices(scene,gl,placeModel){
const put=(m,x,front)=>{
if(!m)return;
m.scene.updateMatrixWorld(true);
const bb=new THREE.Box3().setFromObject(m.scene);
placeModel(m,[[x+(bb.min.x+bb.max.x)/2,front+bb.max.z,Math.PI,1]],{cast:true,y:0.02});
};
const board=(tex,w,h,x,y,z,ry=Math.PI,emissive=false)=>{
const m=new THREE.MeshStandardMaterial({map:tex,roughness:0.8,emissive:emissive?'#ffffff':'#000000',emissiveMap:emissive?tex:null,emissiveIntensity:emissive?0.25:0});
const b=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);b.position.set(x,y,z);b.rotation.y=ry;scene.add(b);return b;
};
const box=(w,h,d,c,x,y,z)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:0.6}));b.position.set(x,y,z);b.castShadow=true;scene.add(b);return b;};
const C=SERVICES.clinic,cf=31.6;
put(gl.clinic_bldg,C.x,cf);
board(signTexture('ドラッグストア さくら',640,150,'#1f8a4c','#ffffff'),4.9,1.2,C.x,3.75,cf-0.08,Math.PI,true);
board(signTexture('',32,32,'#2a2a2a','#000'),4.9,0.5,C.x,4.55,cf-0.07);
board(signTexture('薬',120,120,'#ffffff','#1f8a4c'),0.62,0.62,C.x-1.85,2.25,cf-0.08);
const vs=verticalSign('クリニック','#ffffff','#2f6fb0');
board(vs.tex,0.7,0.7/vs.aspect,C.x-2.55,6.9,cf-0.4,-Math.PI/2,true);
board(vs.tex,0.7,0.7/vs.aspect,C.x-2.55,6.9,cf-0.4,Math.PI/2,true);
board(signTexture('さくらクリニック 内科・整形外科 2F',900,110,'#2f6fb0','#ffffff'),4.6,0.56,C.x,5.12,cf-0.06);
const P=SERVICES.post,pf=31.6;
put(gl.post_office,P.x,pf);
board(signTexture('〒 郵便局',520,120,'#ffffff','#d33b2c'),3.0,0.95,P.x-0.6,4.0,pf-0.1,Math.PI,true);
board(signTexture('郵便・貯金・ATM',700,100,'#d33b2c','#ffffff'),4.6,0.62,P.x,2.05,pf-0.12);
box(0.42,1.0,0.36,'#d33b2c',P.x-2.0,0.52,29.0);
box(0.46,0.06,0.4,'#b02f22',P.x-2.0,1.05,29.0);
board(signTexture('〒',64,64,'#d33b2c','#ffffff'),0.2,0.2,P.x-2.0,0.85,28.81);
const H=SERVICES.cityhall;
put(gl.city_hall,H.x,32.4);
board(signTexture('さくら市役所',520,110,'#f4f1ea','#2a2a2a'),3.4,0.72,H.door.x,0.95,30.1,Math.PI);
box(3.6,1.3,0.5,'#9a968e',H.door.x,0.65,30.4);
for(const dx of[-4,-3.2]){
box(0.08,6.5,0.08,'#c9ccd0',H.x+dx,3.25,30.8);
board(signTexture('',32,20,dx<-3.5?'#ffffff':'#3d7fbf','#000'),1.1,0.7,H.x+dx+0.6,6.0,30.8);
}
board(signTexture('開庁 平日 8:30–17:15',520,90,'#2f6fb0','#ffffff'),2.4,0.42,H.door.x+2.4,1.0,30.2);
}
