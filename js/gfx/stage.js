/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
export const MODEL_V='21';
export const canvas=document.getElementById('c');
export const LOW_MEM=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
export const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,LOW_MEM?1.5:2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
export const camera=new THREE.PerspectiveCamera(46,1,0.3,400);
export const isPortrait=()=>canvas.clientWidth<canvas.clientHeight;
export function resize(){
const w=canvas.clientWidth,h=canvas.clientHeight,pr=renderer.getPixelRatio();
if(canvas.width!==Math.floor(w*pr)||canvas.height!==Math.floor(h*pr))renderer.setSize(w,h,false);
camera.aspect=w/h;camera.updateProjectionMatrix();
}
export function makeSun(scene,{color=0xfff0dc,intensity=2.3,size=11,offset=[6,12,7]}={}){
const sun=new THREE.DirectionalLight(color,intensity);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-size,right:size,top:size,bottom:-size,near:1,far:60});
sun.shadow.bias=-0.0012;sun.shadow.normalBias=0.05;
scene.add(sun,sun.target);
const texel=(size*2)/1024;
sun.userData.follow=(p)=>{
const sx=Math.round(p.x/texel)*texel,sz=Math.round(p.z/texel)*texel;
sun.position.set(sx+offset[0],p.y+offset[1],sz+offset[2]);sun.target.position.set(sx,p.y,sz);
};
return sun;
}
const loader=new GLTFLoader();
const cache={};
const texLoader=new THREE.TextureLoader();
const brandCache={};
export const BRAND_ASPECT=845/213;
export function loadBrand(v='black'){
const key=v==='white'?'white':'black';
if(!brandCache[key]){
brandCache[key]=new Promise((res,rej)=>{
texLoader.load(
`img/brand/yabai_logo_${key}.png?v=${MODEL_V}`,
(tex)=>{
tex.colorSpace=THREE.SRGBColorSpace;
tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
res(tex);
},
undefined,
rej,
);
});
}
return brandCache[key];
}
function b64ToBuffer(s){
const bin=atob(s),out=new Uint8Array(bin.length);
for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
return out.buffer;
}
export const loadStats={started:0,done:0};
export function loadModel(name){
if(!cache[name]){
loadStats.started++;
const get=(tries)=>fetch(`models/${name}.json?v=${MODEL_V}`)
.then((r)=>{if(!r.ok)throw new Error(`${name}: ${r.status}`);return r.json();})
.catch((e)=>(tries>0?new Promise((res)=>setTimeout(res,800)).then(()=>get(tries-1)):Promise.reject(e)));
cache[name]=get(2)
.then((j)=>new Promise((res,rej)=>loader.parse(b64ToBuffer(j.b64),'',res,rej)))
.then((gltf)=>{
gltf.scene.traverse((o)=>{
if(o.isMesh&&/^glass/i.test(o.material.name))Object.assign(o.material,{transparent:true,opacity:0.16,depthWrite:false});
});
return gltf;
});
cache[name].then(()=>{loadStats.done++;},()=>{loadStats.done++;});
}
return cache[name];
}
export function shadowAll(root,{cast=true,receive=false}={}){
root.traverse((o)=>{if(o.isMesh){o.castShadow=cast;o.receiveShadow=receive;}});
return root;
}
export function canvasTexture(w,h,draw,repeat){
const c=document.createElement('canvas');c.width=w;c.height=h;
draw(c.getContext('2d'),w,h);
const t=new THREE.CanvasTexture(c);
t.colorSpace=THREE.SRGBColorSpace;
if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat[0],repeat[1]);}
t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
return t;
}
export function signTexture(text,w,h,bg,fg,font='"Zen Maru Gothic", "Yu Gothic", sans-serif'){
return canvasTexture(w,h,(g)=>{
g.fillStyle=bg;g.fillRect(0,0,w,h);
g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
g.font=`700 ${Math.round(h * 0.62)}px ${font}`;
g.fillText(text,w/2,h/2+h*0.04);
});
}
export function skyDome(scene,top='#6fa8d6',horizon='#dfe8ea',radius=240){
const mat=new THREE.ShaderMaterial({
side:THREE.BackSide,depthWrite:false,fog:false,
uniforms:{top:{value:new THREE.Color(top)},horizon:{value:new THREE.Color(horizon)}},
vertexShader:'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
fragmentShader:'uniform vec3 top;\nuniform vec3 horizon;\nvarying vec3 vP;\nvoid main() {\n  float h = clamp(vP.y * 3.2, 0.0, 1.0);\n  gl_FragColor = vec4(mix(horizon, top, pow(h, 0.6)), 1.0);\n  #include <colorspace_fragment>\n}',
});
const dome=new THREE.Mesh(new THREE.SphereGeometry(radius,32,16),mat);
dome.renderOrder=-1;dome.frustumCulled=false;
scene.add(dome);
return{dome,setColors(t,h){mat.uniforms.top.value.set(t);mat.uniforms.horizon.value.set(h);}};
}
export class CamRig{
constructor(){this.pos=new THREE.Vector3();this.look=new THREE.Vector3();this.init=false;}
to(pos,look,dt,rate=5){
if(!this.init){this.pos.copy(pos);this.look.copy(look);this.init=true;}
const k=1-Math.exp(-dt*rate);
this.pos.lerp(pos,k);this.look.lerp(look,k);
camera.position.copy(this.pos);camera.lookAt(this.look);
}
snap(pos,look){this.pos.copy(pos);this.look.copy(look);this.init=true;camera.position.copy(pos);camera.lookAt(look);}
}
