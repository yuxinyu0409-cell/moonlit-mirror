import * as THREE from './assets/vendor/three.module.js';
// Shared textures and fixed buffers: no per-frame mesh creation or network assets.
export class WaterMagic{
 constructor(scene,glow){
  this.age=10;this.releaseAge=10;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.root=new THREE.Group();scene.add(this.root);this.root.visible=false;
  const cv=document.createElement('canvas');cv.width=cv.height=1024;const g=cv.getContext('2d');g.translate(512,512);g.strokeStyle='#f5dca0';g.fillStyle='#ffe9b6';g.lineWidth=4;
  for(const r of [258,270,341,356,414]){g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke()}
  for(let i=0;i<96;i++){const a=i/96*Math.PI*2,r=i%8===0?386:i%4===0?397:406;g.beginPath();g.moveTo(Math.sin(a)*r,Math.cos(a)*r);g.lineTo(Math.sin(a)*414,Math.cos(a)*414);g.stroke()}
  g.font='28px Georgia';g.textAlign='center';g.textBaseline='middle';const glyphs=['☽','✧','♃','☉','♀','✦','♄','☿'];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;g.save();g.rotate(a);g.fillText(glyphs[i%8],0,-307);g.restore()}
  for(const offset of [0,Math.PI]){g.beginPath();for(let i=0;i<3;i++){const a=offset+i*Math.PI*2/3;const x=Math.sin(a)*252,y=Math.cos(a)*252;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.stroke()}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;g.beginPath();g.moveTo(Math.sin(a)*45,Math.cos(a)*45);g.lineTo(Math.sin(a)*170,Math.cos(a)*170);g.stroke()}
  this.sigilTexture=new THREE.CanvasTexture(cv);
  const mat=()=>new THREE.MeshBasicMaterial({map:this.sigilTexture,color:'#ffe0a4',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
  this.waterSeal=new THREE.Mesh(new THREE.PlaneGeometry(2.9,2.9),mat());this.waterSeal.rotation.x=-Math.PI/2;this.waterSeal.position.y=.035;this.root.add(this.waterSeal);
  this.halo=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),mat());this.halo.position.set(0,.8,-.14);this.halo.rotation.x=-.22;this.halo.material.color.set('#d8c0ff');this.root.add(this.halo);
  this.echo=new THREE.Mesh(new THREE.RingGeometry(.97,1,96),new THREE.MeshBasicMaterial({color:'#cfb6ff',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false}));this.echo.rotation.x=-Math.PI/2;this.echo.position.y=.045;this.root.add(this.echo);
  const n=240;this.positions=new Float32Array(n*3);this.seeds=Array.from({length:n},()=>({angle:Math.random()*Math.PI*2,phase:Math.random(),radius:.15+Math.random()*.5}));const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.positions,3));const colors=new Float32Array(n*3);for(let i=0;i<n;i++){const c=new THREE.Color(i%3===0?'#c9b2ff':i%3===1?'#ffe2a8':'#e5f4ff');c.toArray(colors,i*3)}geo.setAttribute('color',new THREE.BufferAttribute(colors,3));this.sparks=new THREE.Points(geo,new THREE.PointsMaterial({map:glow,vertexColors:true,size:.09,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));this.root.add(this.sparks);
  this.streams=Array.from({length:3},()=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(48*3),3));const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#d8ddff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));this.root.add(line);return line});
  const starCv=document.createElement('canvas');starCv.width=starCv.height=128;const sc=starCv.getContext('2d');sc.translate(64,64);sc.fillStyle='#fff3ca';sc.shadowColor='#e2c4ff';sc.shadowBlur=15;sc.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?6:51;i?sc.lineTo(Math.cos(a)*r,Math.sin(a)*r):sc.moveTo(Math.cos(a)*r,Math.sin(a)*r)}sc.closePath();sc.fill();const starTex=new THREE.CanvasTexture(starCv);this.stars=Array.from({length:9},(_,i)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:starTex,color:i%2?'#edceff':'#fff0bd',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));this.root.add(s);return s});
 }
 get active(){return this.age<2.1}
 trigger(position){this.age=0;this.releaseAge=10;this.root.position.set(position.x,0,position.z);this.root.visible=true}
 release(){if(this.active)this.releaseAge=0}
 clear(){this.age=10;this.releaseAge=10;this.root.visible=false}
 update(dt,time){
  if(!this.active){this.root.visible=false;return}this.age+=dt;this.releaseAge+=dt;const a=this.age,fade=Math.max(0,Math.min(a/.15,(2.1-a)/.7)),rise=Math.min(1,a/.68),intensity=this.reduced?.45:1;
  this.waterSeal.material.opacity=fade*.42*intensity;this.waterSeal.rotation.z=time*(this.reduced?.035:.23);this.waterSeal.scale.setScalar(.78+Math.min(a,1)*.5);
  this.halo.material.opacity=fade*.18*intensity;this.halo.rotation.z=-time*.19;this.halo.position.y=.4+rise*1.1;this.halo.scale.setScalar(.75+rise*.25);
  const wave=Math.min(1,this.releaseAge/1.2);this.echo.scale.setScalar(.5+wave*1.65);this.echo.material.opacity=this.releaseAge<1.2?(1-wave)*.55*intensity:0;
  const disperse=Math.max(0,a-.65);for(let i=0;i<this.seeds.length;i++){const s=this.seeds[i],angle=s.angle+a*(1.7+s.phase),r=s.radius*(.6+rise*.5)+disperse*s.phase*.8;this.positions[i*3]=Math.cos(angle)*r;this.positions[i*3+1]=.06+rise*(.2+s.phase*1.65)-disperse*.16;this.positions[i*3+2]=Math.sin(angle)*r}this.sparks.geometry.attributes.position.needsUpdate=true;this.sparks.material.opacity=fade*.42*intensity;
  this.streams.forEach((line,j)=>{line.material.opacity=fade*Math.max(0,1-disperse)*.7*intensity;const p=line.geometry.attributes.position;for(let k=0;k<48;k++){const f=k/47,angle=f*11-a*4+j*2.1,r=(.1+Math.sin(f*Math.PI)*.2)*(1-disperse*.35);p.setXYZ(k,Math.cos(angle)*r,.03+f*(.25+rise*1.6),Math.sin(angle)*r)}p.needsUpdate=true});
  this.stars.forEach((star,i)=>{const angle=i*2.4+a*.5,r=.5+disperse*.7;star.position.set(Math.cos(angle)*r,.25+rise*(.35+i*.15),Math.sin(angle)*r);star.scale.setScalar((.16+Math.sin(i+a*3)*.035)*intensity);star.material.rotation=-angle*.2;star.material.opacity=fade*(.45+.4*Math.sin(i+a*3)**2)*intensity});
 }
}
