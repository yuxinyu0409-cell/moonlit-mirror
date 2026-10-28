import {CardPool} from './pool.js';
import {createPersonalReading} from './reading.js?v=20261028-reading-focused';
import * as THREE from './assets/vendor/three.module.js';
import {cards} from './cards.js';
import {Ritual,describeHand,handToWater} from './gesture.js';
import {Spread,positions,interpretation,summarizeSpread} from './spread.js';
import {RitualSound} from './sound.js?v=natural-water-soft-5';
import {WaterMagic} from './magic.js';
const spread=new Spread(cards),sounds=new RitualSound();let settling=false,settleTimer,revealTimer,liftSoundPlayed=false;const parked=[];
const $=s=>document.querySelector(s),ritual=new Ritual();
const personalReading=createPersonalReading(cards);
$('#retry-reading').onclick=()=>personalReading.retry();
let cameraTimeout=null,paused=false;
let mode='idle',stream,worker,workerReady=false,busy=false,starting=false,session=0,lastDetect=0,lastVideo=-1,lastHandTime=0,lastUpdate=0,hand=null,shadowHand=null,selected=null,finished=false,audioOn=true;
let pointer={x:.5,y:.57,fist:false,open:true},pointerInside=false,waterMotion=0,prevPosition=null,rippleIndex=0,trailIndex=0,frameId;
function status(text){$('#status').textContent=text;if(paused)$('#resume-feedback').textContent=text;if(mode==='idle'||starting){$('#camera-feedback').textContent=text;$('#camera-feedback').hidden=false;$('#camera-actions').hidden=false;$('#cancel-camera').hidden=!starting;}}
function cameraDeadline(ms,message){clearTimeout(cameraTimeout);cameraTimeout=setTimeout(()=>{if(starting)cameraFailure(message)},ms)}

try{audioOn=localStorage.getItem('moonlit-audio')!=='off'}catch{}
function reflectSound(){ $('#sound').setAttribute('aria-pressed',String(audioOn));$('#sound span').textContent=audioOn?'音效开':'音效关'; }
reflectSound();
function activateSound(){if(audioOn)sounds.setEnabled(true).catch(()=>{audioOn=false;reflectSound();status('音效未能加载，可点击音效按钮重试。')})}
function tone(f=330,d=.8){sounds.tone(f,d)}
$('#sound').onclick=async function(){audioOn=!audioOn;try{localStorage.setItem('moonlit-audio',audioOn?'on':'off')}catch{}this.setAttribute('aria-pressed',String(audioOn));this.querySelector('span').textContent=audioOn?'音效开':'音效关';try{await sounds.setEnabled(audioOn)}catch(e){audioOn=false;this.setAttribute('aria-pressed','false');this.querySelector('span').textContent='音效未就绪';status('音效加载失败，可点击重试');console.warn(e)}};
const soundOptions=$('#sound-options'),soundPopover=$('#sound-popover');
function closeSoundMenu(){soundPopover.hidden=true;soundOptions.setAttribute('aria-expanded','false')}
soundOptions.onclick=()=>{soundPopover.hidden=!soundPopover.hidden;soundOptions.setAttribute('aria-expanded',String(!soundPopover.hidden))};
document.addEventListener('click',event=>{if(!event.target.closest('.sound-menu'))closeSoundMenu()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!soundPopover.hidden){closeSoundMenu();soundOptions.focus()}});
let gestureLearned=false;try{gestureLearned=localStorage.getItem('moonlit-gesture-learned')==='true'}catch{}
function showGestureDemo(){ $('#gesture-demo').hidden=false;$('#ritual').classList.add('showing-demo'); }
function hideGestureDemo(){ $('#gesture-demo').hidden=true;$('#ritual').classList.remove('showing-demo'); }
$('#skip-demo').onclick=hideGestureDemo;
$('#replay-demo').onclick=()=>{$('#guide').close();if(mode==='idle'){ $('#guide').showModal();return; }showGestureDemo()};
$('#sound-preview').onclick=async function(){this.disabled=true;this.textContent='试听中…';try{await sounds.preview();audioOn=true;$('#sound').setAttribute('aria-pressed','true');$('#sound span').textContent='音效开'}catch(e){status('音效加载失败，请刷新后再试');console.warn(e)}finally{setTimeout(()=>{this.disabled=false;this.textContent='试听'},4700)}};
$('#help').onclick=()=>{$('#replay-demo').hidden=mode==='idle'||finished;$('#guide').showModal()};$('#close-help').onclick=$('#guide-ok').onclick=()=>$('#guide').close();
const canvas=$('#world');let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'})}catch(e){status('当前浏览器未能开启 3D，请使用支持 WebGL 的浏览器');$('#camera').disabled=true;throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const scene=new THREE.Scene();scene.background=null;renderer.setClearColor(0x000000,0);
const camera=new THREE.OrthographicCamera(-6,6,3.75,-3.75,.1,80);camera.position.set(0,5.37,20);camera.lookAt(0,.12,0);
scene.add(new THREE.HemisphereLight('#cad6ff','#332332',2));const moonLight=new THREE.DirectionalLight('#b8d3ff',3);moonLight.position.set(-4,8,-4);scene.add(moonLight);
const bronze=new THREE.MeshStandardMaterial({color:'#63553e',roughness:.38,metalness:.78});const darkBronze=new THREE.MeshStandardMaterial({color:'#282a32',roughness:.42,metalness:.7});
function mesh(geo,mat,x=0,y=0,z=0,parent=scene){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m}
function ring(r,t,y,mat=bronze){const m=mesh(new THREE.TorusGeometry(r,t,16,160),mat,0,y,0);m.rotation.x=Math.PI/2;return m}
const rippleData=Array.from({length:14},()=>new THREE.Vector4(0,0,-100,0));
const waterUniforms={uTime:{value:0},uWake:{value:0},uMotion:{value:0},uHand:{value:new THREE.Vector2(0,0)},uRipples:{value:rippleData}};
const waterMaterial=new THREE.ShaderMaterial({uniforms:waterUniforms,transparent:true,side:THREE.DoubleSide,vertexShader:`varying vec2 vP; uniform float uTime; uniform float uMotion; uniform vec4 uRipples[14];void main(){vP=position.xy;vec3 p=position;float h=sin(p.x*5.+uTime*.65)*cos(p.y*4.-uTime*.5)*.012;for(int i=0;i<14;i++){float age=uTime-uRipples[i].z;float d=distance(p.xy,uRipples[i].xy);float f=exp(-pow(d-age*1.05,2.)*18.)*exp(-age*.9)*step(0.,age);h+=sin(d*15.-age*13.)*f*.045*uRipples[i].w;}p.z+=h;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying vec2 vP;uniform float uTime;uniform float uWake;uniform float uMotion;uniform vec2 uHand;uniform vec4 uRipples[14];float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 p=vP;float wave=sin(p.x*7.+uTime*.5)*sin(p.y*8.-uTime*.6)*.012;float rip=0.;for(int i=0;i<14;i++){float age=uTime-uRipples[i].z;float d=distance(p,uRipples[i].xy);rip+=sin(d*15.-age*13.)*exp(-pow(d-age*1.05,2.)*14.)*exp(-max(age,0.)*.8)*step(0.,age)*uRipples[i].w;}vec2 q=p+vec2(wave+rip*.06);float moon=1.-smoothstep(.42,.48,length((q-vec2(-.45,1.15))*vec2(1.,1.1)));float cut=1.-smoothstep(.41,.46,length((q-vec2(-.25,1.28))*vec2(1.,1.1)));float crescent=max(0.,moon-cut);float glow=exp(-length(q-vec2(-.4,1.1))*1.6);float caustic=pow(abs(sin(p.x*8.+sin(p.y*4.+uTime*.3))+cos(p.y*7.+uTime*.3))*.5,9.);float star=step(.9988,hash(floor((q+5.)*65.)))*(.6+.4*sin(uTime+q.x*5.));vec3 col=mix(vec3(.018,.035,.065),vec3(.07,.14,.23),glow);col+=vec3(.33,.48,.6)*abs(rip)*.5;col+=vec3(.85,.85,.71)*crescent*(.35+.65*uWake);col+=vec3(.5,.6,.7)*star*.7;col+=vec3(.14,.3,.35)*caustic*(.15+uMotion);col+=vec3(.1,.17,.2)*exp(-distance(p,uHand)*2.)*uWake;float edge=smoothstep(2.6,3.28,length(p));col+=vec3(.13,.19,.23)*edge;float a=min(.6,abs(rip)*.48+caustic*.045+exp(-distance(p,uHand)*5.)*uMotion*.12);gl_FragColor=vec4(vec3(.6,.72,.95)+vec3(.25,.12,0.)*uWake,a);}`});
const water=mesh(new THREE.CircleGeometry(2.92,120),waterMaterial,0,-.09,0);water.rotation.x=-Math.PI/2;
const flames=[];
// Dust above the mirror.
const dustPos=new Float32Array(240*3);for(let i=0;i<240;i++){dustPos[i*3]=(Math.random()-.5)*16;dustPos[i*3+1]=Math.random()*6;dustPos[i*3+2]=(Math.random()-.5)*12}const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=32;const gc=glowCanvas.getContext('2d'),gg=gc.createRadialGradient(16,16,0,16,16,16);gg.addColorStop(0,'#fff9e2');gg.addColorStop(.18,'#ffe6b5');gg.addColorStop(.45,'#eec8a14d');gg.addColorStop(1,'#eec8a100');gc.fillStyle=gg;gc.fillRect(0,0,32,32);const glowTexture=new THREE.CanvasTexture(glowCanvas);
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#ead2a4',map:glowTexture,size:.065,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(dust);
// The delayed hand shadow lives on the water, not on the video.
const shadowGeo=new THREE.BufferGeometry();shadowGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(21*3),3));const shadowDots=new THREE.Points(shadowGeo,new THREE.PointsMaterial({color:'#849cac',size:.065,transparent:true,opacity:.45}));scene.add(shadowDots);shadowDots.visible=false;
const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
const shadowLinesGeo=new THREE.BufferGeometry();shadowLinesGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(connections.length*6),3));const shadowLines=new THREE.LineSegments(shadowLinesGeo,new THREE.LineBasicMaterial({color:'#81999e',transparent:true,opacity:.18}));scene.add(shadowLines);shadowLines.visible=false;
const trailGeo=new THREE.BufferGeometry();const trailPoints=new Float32Array(160*3);trailPoints.fill(100);trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPoints,3));const trail=new THREE.Points(trailGeo,new THREE.PointsMaterial({color:'#f8d698',map:glowTexture,size:.055,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(trail);
function cardTexture(c,back=false){const cv=document.createElement('canvas');cv.width=512;cv.height=800;const g=cv.getContext('2d');if(!back&&c.reversed){g.translate(512,800);g.rotate(Math.PI);}const grad=g.createLinearGradient(0,0,512,800);grad.addColorStop(0,back?'#1b2939':'#344755');grad.addColorStop(1,'#171d2d');g.fillStyle=grad;g.fillRect(0,0,512,800);g.strokeStyle='#bdad7d';g.lineWidth=3;g.strokeRect(20,20,472,760);g.lineWidth=1;g.strokeRect(32,32,448,736);g.strokeStyle='#b3a47566';for(let j=0;j<5;j++){g.beginPath();g.ellipse(256,340,160-j*13,240-j*19,0,0,Math.PI*2);g.stroke()}g.fillStyle='#d5c9a4';g.textAlign='center';g.font='24px "Moon Roman",Georgia';g.fillText(back?'THE HIDDEN MOON':c[2],256,94);for(let i=0;i<55;i++){const x=50+(Math.sin(i*127.3)+1)*206,y=120+(Math.cos(i*63.2)+1)*240;g.fillStyle=i%3?'#d4d6c655':'#d6cfad';g.beginPath();g.arc(x,y,i%4===0?2:1,0,Math.PI*2);g.fill()}g.fillStyle='#e1d2a5';g.font='175px Georgia';g.fillText(back?'☾':c[3],256,410);if(back){g.strokeStyle='#ddc48b';g.lineWidth=1.5;for(let n=0;n<32;n++){const a=n/32*Math.PI*2,r=n%4===0?108:n%2===0?75:57;g.beginPath();g.moveTo(256+Math.sin(a)*22,340+Math.cos(a)*22);g.lineTo(256+Math.sin(a)*r,340+Math.cos(a)*r);g.stroke()}for(const r of [122,134,145]){g.beginPath();g.arc(256,340,r,0,Math.PI*2);g.stroke()}for(let n=0;n<12;n++){const a=n/12*Math.PI*2;g.font='16px Georgia';g.fillText(['✧','☽','·'][n%3],256+Math.sin(a)*171,345+Math.cos(a)*171)}}g.lineWidth=1;g.strokeStyle='#d2c397';g.beginPath();g.moveTo(95,575);g.lineTo(417,575);g.stroke();g.font='42px "Moon Script","Songti SC",serif';g.fillText(back?'月下水镜':c[0],256,650);g.font='16px "Moon Roman",Georgia';g.fillText(back?'TRUST THE QUIET WITHIN':c[1],256,705);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;if(!back&&c[9]){const img=new Image();img.onload=()=>{g.fillStyle='#192333';g.fillRect(58,115,396,450);const scale=Math.min(350/img.width,440/img.height),w=img.width*scale,h=img.height*scale;g.drawImage(img,256-w/2,340-h/2,w,h);tex.needsUpdate=true};img.onerror=()=>console.warn('牌面图像加载失败',c[9]);img.src=c[9]}return tex}
const cardGroup=new THREE.Group();scene.add(cardGroup);const frontMat=new THREE.MeshStandardMaterial({map:cardTexture(cards[18]),roughness:.55,metalness:.15,transparent:true,opacity:0});const backMat=new THREE.MeshBasicMaterial({map:cardTexture(null,true),transparent:true,opacity:0,toneMapped:false});const cardFront=mesh(new THREE.PlaneGeometry(1.06,1.66),frontMat,0,0,.03,cardGroup);const cardBack=mesh(new THREE.PlaneGeometry(1.06,1.66),backMat,0,0,-.03,cardGroup);cardBack.rotation.y=Math.PI;cardGroup.position.set(0,-.04,.1);cardGroup.rotation.x=Math.PI/2;
const cardEdgeMat=new THREE.MeshBasicMaterial({color:'#bc9b61',transparent:true,opacity:0,toneMapped:false});
mesh(new THREE.BoxGeometry(1.06,1.66,.048),cardEdgeMat,0,0,0,cardGroup);
const splashRings=Array.from({length:3},()=>{const r=mesh(new THREE.TorusGeometry(.32,.009,6,80),new THREE.MeshBasicMaterial({color:'#d5ecff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));r.rotation.x=-Math.PI/2;return r});let splashAge=5;
function splashAt(position){splashAge=0;splashRings.forEach(r=>r.position.set(position.x,.04,position.z));rippleData[rippleIndex++%14].set(position.x,-position.z,performance.now()/1000,1.8)}
Promise.all([document.fonts.load('42px "Moon Script"'),document.fonts.load('24px "Moon Roman"')]).then(()=>{const old=backMat.map;backMat.map=cardTexture(null,true);old.dispose();backMat.needsUpdate=true}).catch(()=>{});
const halo=mesh(new THREE.TorusGeometry(.85,.006,6,100),new THREE.MeshBasicMaterial({color:'#d1c38d',transparent:true,opacity:0}),0,0,-.025,cardGroup);halo.scale.y=1.4;
const tetherGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const tether=new THREE.Line(tetherGeo,new THREE.LineBasicMaterial({color:'#c5d5da',transparent:true,opacity:0}));scene.add(tether);
const dropPositions=new Float32Array(48*3),dropGeo=new THREE.BufferGeometry();dropGeo.setAttribute('position',new THREE.BufferAttribute(dropPositions,3));const drops=new THREE.Points(dropGeo,new THREE.PointsMaterial({color:'#e0eaff',map:glowTexture,size:.055,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(drops);let dropAge=5;const velocities=[];
function emitDrops(){dropAge=0;for(let i=0;i<48;i++){dropPositions[i*3]=cardGroup.position.x+(Math.random()-.5)*.7;dropPositions[i*3+1]=Math.max(.2,cardGroup.position.y);dropPositions[i*3+2]=cardGroup.position.z+(Math.random()-.5)*.55;velocities[i]=new THREE.Vector3((Math.random()-.5)*.65,.8+Math.random()*.8,(Math.random()-.5)*.65)}dropGeo.attributes.position.needsUpdate=true}
function animateDrops(dt){if(dropAge>2)return;dropAge+=dt;drops.material.opacity=Math.max(0,.8-dropAge*.4);for(let i=0;i<48;i++){velocities[i].y-=dt*3;dropPositions[i*3]+=velocities[i].x*dt;dropPositions[i*3+1]=Math.max(-.06,dropPositions[i*3+1]+velocities[i].y*dt);dropPositions[i*3+2]+=velocities[i].z*dt}dropGeo.attributes.position.needsUpdate=true}
const filaments=Array.from({length:3},()=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(32*3),3));const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#d7e5ff',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(line);return line});
const focusRing=mesh(new THREE.TorusGeometry(.16,.014,8,40),new THREE.MeshBasicMaterial({color:'#f8d59b',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));focusRing.rotation.x=-Math.PI/2;
const aimGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
const aimLine=new THREE.Line(aimGeometry,new THREE.LineBasicMaterial({color:'#ffe1a3',transparent:true,opacity:0,depthWrite:false}));scene.add(aimLine);
const magic=new WaterMagic(scene,glowTexture);
const pool=new CardPool(cards),poolRoot=new THREE.Group();scene.add(poolRoot);
const poolGeometry=new THREE.PlaneGeometry(.40,.64);
const poolVisuals=Array.from({length:cards.length},()=>{const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({map:backMat.map,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});const face=new THREE.Mesh(poolGeometry,material);face.rotation.x=-Math.PI/2;group.add(face);const rim=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.21,.012,-.33),new THREE.Vector3(.21,.012,-.33),new THREE.Vector3(.21,.012,.33),new THREE.Vector3(-.21,.012,.33)]),new THREE.LineBasicMaterial({color:'#f5d59b',transparent:true,opacity:.45,depthWrite:false}));group.add(rim);poolRoot.add(group);return {group,face,material,rim};});
const lockRing=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.24,0,-.37),new THREE.Vector3(.24,0,-.37),new THREE.Vector3(.24,0,.37),new THREE.Vector3(-.24,0,.37)]),new THREE.LineBasicMaterial({color:'#fff0bd',transparent:true,opacity:0,depthWrite:false}));scene.add(lockRing);
let lockAge=1;
let liftOrigin=new THREE.Vector3();

const worldPoint=(h)=>{const p=mode==='camera'?handToWater(h):{x:(h.x-.5)*5.6,z:(h.y-.57)*6};return new THREE.Vector3(p.x,.02,p.z);};
function ripple(h,strength=1){const p=worldPoint(h);rippleData[rippleIndex++%14].set(p.x,-p.z,performance.now()/1000,strength)}
function chooseCard(card){selected=spread.draw(card);if(!selected)return;hideGestureDemo();gestureLearned=true;try{localStorage.setItem('moonlit-gesture-learned','true')}catch{}const old=frontMat.map;frontMat.map=cardTexture(selected);old.dispose();frontMat.emissive.set('#ffffff');frontMat.emissiveIntensity=.3;frontMat.emissiveMap=frontMat.map;frontMat.needsUpdate=true}
function clearSpread(){sounds.stopStir();splashAge=5;splashRings.forEach(r=>r.visible=false);hideGestureDemo();pool.reset();lockAge=1;lockRing.material.opacity=0;poolRoot.visible=false;personalReading.reset();magic.clear();clearTimeout(settleTimer);clearTimeout(revealTimer);settling=false;spread.reset();parked.forEach(p=>{scene.remove(p.group);p.front.map.dispose();p.front.dispose();p.back.dispose();p.edge.dispose();p.group.children.forEach(m=>m.geometry.dispose())});parked.length=0;document.body.classList.remove('reading');window.scrollTo({top:0,behavior:'instant'});$('#spread-slots').hidden=true;$('#spread-slots').innerHTML='';}
function updateSlots(){const n=spread.drawn.length;$('#spread-slots').hidden=false;$('#spread-slots').innerHTML=positions.map((p,i)=>`<span class="${i<n?'filled':i===n?'current':''}"><b>${i<n?'✦':'○'}</b> ${p.title}<small>${i<n?'已捞起':i===n?'等待你选择':'静候水中'}</small></span>`).join('');$('#draw-count').textContent=`${n} / 3 张已捞起`;}
function resetRitual(){clearSpread();ritual.reset();finished=false;selected=null;hand=null;prevPosition=null;liftSoundPlayed=false;waterMotion=0;frontMat.opacity=backMat.opacity=0;cardGroup.position.set(0,-.04,.1);cardGroup.rotation.set(Math.PI/2,0,0);$('#result').hidden=true;$('#ritual').hidden=false;$('#instruction').textContent=mode==='demo'?'移动鼠标靠近牌背，等它亮起后点击。':'张开手拨动水面，靠近牌背，握拳捞起。';poolRoot.visible=true;$('#progress i').style.transform='scaleX(0)';status(mode==='demo'?'移动鼠标靠近，牌影会自动回应':'伸手靠近，牌影会自动回应');trailPoints.fill(100);trailGeo.attributes.position.needsUpdate=true;updateSlots()}
function inputLabels(type){$('[data-step="wake"]').textContent=type==='demo'?'01 移动寻牌':'01 拨水寻牌';$('[data-step="fist"]').textContent=type==='demo'?'02 点击选牌':'02 握拳选牌'}
function begin(type){activateSound();inputLabels(type);if(paused){resumeRitual(type);return}clearTimeout(cameraTimeout);$('#camera-feedback').hidden=true;$('#camera-actions').hidden=true;mode=type;document.body.classList.add('in-ritual');$('#welcome').hidden=true;$('#ritual').hidden=false;$('#demo-badge').hidden=type!=='demo';resetRitual();if(type==='demo')$('#instruction').textContent='移动鼠标靠近牌影，等它亮起后点击。';if(type==='camera')showGestureDemo()}
function finish(){
 if(settling||finished||!spread.commit())return;
 settling=true;magic.release();sounds.release();ripple({x:.5,y:.57},1.7);emitDrops();
 const group=new THREE.Group();group.position.copy(cardGroup.position);group.rotation.copy(cardGroup.rotation);group.scale.copy(cardGroup.scale);scene.add(group);
 const fm=frontMat.clone();fm.map=frontMat.map.clone();fm.emissiveMap=fm.map;fm.opacity=1;const bm=backMat.clone();bm.opacity=1;
 mesh(new THREE.PlaneGeometry(1.06,1.66),fm,0,0,.03,group);const back=mesh(new THREE.PlaneGeometry(1.06,1.66),bm,0,0,-.03,group);back.rotation.y=Math.PI;
 const edge=cardEdgeMat.clone();edge.opacity=1;mesh(new THREE.BoxGeometry(1.06,1.66,.048),edge,0,0,0,group);parked.push({group,front:fm,back:bm,edge,index:parked.length});frontMat.opacity=backMat.opacity=0;updateSlots();
 status(spread.complete?'三张牌已齐 · 月光正在揭晓':'牌已落位 · 下一张仍在水中');
 $('#instruction').textContent=spread.complete?'让三段低语，连成一段属于你的故事。':mode==='demo'?'移动鼠标寻找下一张牌，亮起后点击。':'张开手，拨水寻找下一张牌，再握拳捞起。';
 settleTimer=setTimeout(()=>{
  if(spread.complete){finished=true;settling=false;closeCamera();document.body.classList.add('reading');$('#ritual').hidden=true;sounds.reveal();
   revealTimer=setTimeout(()=>{if(!finished)return;$('#result').hidden=false;window.scrollTo({top:0,behavior:'instant'});$('#result-question').textContent=$('#question').value;$('#result-question').hidden=!$('#question').value;$('#reading-grid').innerHTML=spread.drawn.map((c,i)=>{const r=interpretation(c,i);return `<article class="oracle-card" aria-labelledby="oracle-card-${i}"><div class="oracle-crest" aria-hidden="true">${["☼","☽","✧"][i]}</div><div class="oracle-art oracle-art-${i}"><img class="drawn-card ${c.reversed?'card-reversed':''}" src="${c[9]}" alt="${r.name} · ${r.orientation}的韦特塔罗牌面" width="180" height="310"></div><div class="oracle-copy"><p class="position-title">0${i+1} · ${r.title}</p><h3 id="oracle-card-${i}">${r.name}</h3><p class="oracle-status"><span>${r.orientation}</span></p><p class="keywords">${r.keywords}</p><details><summary>牌义与思考</summary><div class="traditional-card"><p class="oracle-description">${r.text}</p><div><p>${r.meaning}</p><p>图像：${r.symbols}</p></div><p class="reflection">${r.reflection}</p></div></details></div></article>`}).join('');$('#synthesis').textContent=summarizeSpread(spread.drawn);personalReading.start($('#question').value,spread.drawn);status('三张牌，映照同一个你')},1000);
  }else{settling=false;selected=null;ritual.reset(true);liftSoundPlayed=false;cardGroup.position.set(0,-.04,.1);cardGroup.rotation.set(Math.PI/2,0,0);$('#progress i').style.transform='scaleX(0)';}
 },520);
}
function updateInput(h,dt,lm){
 lastHandTime=performance.now();const oldStage=ritual.stage;
 const rawPoint=worldPoint(h);
 const selectionPoint=ritual.position?worldPoint({...h,x:ritual.position.x*.65+h.x*.35,y:ritual.position.y*.65+h.y*.35}):rawPoint;
 if(!settling&&!finished&&!['lift','done'].includes(ritual.stage)){if(!(h.fist||(!h.open&&h.grip>=.25))||!pool.focus)pool.hover(selectionPoint);pool.stir(rawPoint,dt,h.open);h={...h,targetAvailable:!!pool.focus};ritual.update(h,dt);}
hand={...h,...ritual.position};h=hand;
 const p=worldPoint(h);waterUniforms.uHand.value.set(p.x,-p.z);
 if(prevPosition){const speed=p.distanceTo(prevPosition);sounds.stir(!paused&&!finished&&!settling&&h.open&&['seek','ready'].includes(ritual.stage)?speed/Math.max(.016,dt):0);waterMotion=THREE.MathUtils.lerp(waterMotion,Math.min(1,speed*10),.3);if(speed>.025&&ritual.stage!=='done')ripple(h,.4+waterMotion)}prevPosition=p;
 if(ritual.stage!=='wake'){trailPoints.set([p.x,.03,p.z],(trailIndex++%160)*3);trailGeo.attributes.position.needsUpdate=true}
 if(lm){shadowHand??=lm.map(v=>({...v}));for(let i=0;i<21;i++){shadowHand[i].x+=(lm[i].x-shadowHand[i].x)*.13;shadowHand[i].y+=(lm[i].y-shadowHand[i].y)*.13;const sp=worldPoint({x:1-shadowHand[i].x,y:shadowHand[i].y});shadowGeo.attributes.position.setXYZ(i,sp.x,.015,sp.z)}shadowGeo.attributes.position.needsUpdate=true;const a=shadowGeo.attributes.position.array,b=shadowLinesGeo.attributes.position.array;connections.forEach(([i,j],n)=>{b.set(a.slice(i*3,i*3+3),n*6);b.set(a.slice(j*3,j*3+3),n*6+3)});shadowLinesGeo.attributes.position.needsUpdate=true;shadowDots.visible=shadowLines.visible=true}
 if(ritual.stage==='lift'&&ritual.lift>.15&&!liftSoundPlayed){sounds.lift();emitDrops();liftSoundPlayed=true}if(ritual.stage==='ready')liftSoundPlayed=false;
 if(oldStage!==ritual.stage){if(ritual.stage==='lift'){const picked=pool.take();if(!picked){ritual.reset(true);return}lockAge=0;lockRing.position.set(picked.x,.22,picked.z);lockRing.rotation.y=picked.angle;chooseCard(picked.card);liftOrigin.set(picked.x,.035,picked.z);cardGroup.position.copy(liftOrigin);cardGroup.rotation.set(Math.PI/2,Math.PI,picked.angle);cardGroup.scale.setScalar(.74);magic.trigger(liftOrigin);splashAt(liftOrigin);}tone(ritual.stage==='ready'?440:ritual.stage==='lift'?523:293,.65);if(ritual.stage==='done')finish()}
 if(settling||finished)return;
 $('#progress i').style.transform=`scaleX(${ritual.progress})`;
 const instructions={wake:'张开手，让掌心映入水镜。',seek:'左右拨动水面，寻找水下的牌。',ready:!ritual.armed?'先张开手，再靠近牌影。':pool.focus?'这张牌正在回应你 · 握拳即可捞起。':'拨水寻牌，靠近牌影，握拳捞起。',lift:'已握拳选中 · 水镜正在捞起',done:'牌已离水，正在落位。'};
 if(mode==='demo'){Object.assign(instructions,{wake:'移动鼠标，让光圈靠近水下的牌。',seek:'移动鼠标拨动水面，寻找牌影。',ready:pool.focus?'这张牌正在回应你 · 点击即可捞起。':'移动鼠标靠近牌影，等它亮起后点击。',lift:'已点击选中 · 水镜正在捞起'});}
 $('#instruction').textContent=instructions[ritual.stage];if(!finished)status({wake:'水镜看见了你的手',seek:'水下展开一整副牌',ready:pool.focus?(mode==='demo'?'牌影已亮起 · 点击选中':'牌影已亮起 · 握拳选中'):(mode==='demo'?'移动鼠标 · 拨水寻牌':'张开手掌 · 拨水寻牌'),lift:'已锁定 · 自动捞起',done:'听见水中的低语'}[ritual.stage]);
 const active={wake:'wake',seek:'wake',ready:'fist',lift:'flow',done:'flow'}[ritual.stage];document.querySelectorAll('[data-step]').forEach(el=>el.classList.toggle('active',el.dataset.step===active));
}
// Camera lifecycle: model loading and inference are isolated in a worker.
const video=$('#video'),skeleton=$('#skeleton'),sk=skeleton.getContext('2d');skeleton.width=640;skeleton.height=480;
function drawLandmarks(lm){sk.clearRect(0,0,640,480);if(!lm)return;sk.strokeStyle='#c269ff';sk.lineWidth=5;sk.shadowColor='#a742ff';sk.shadowBlur=9;connections.forEach(([a,b])=>{sk.beginPath();sk.moveTo(lm[a].x*640,lm[a].y*480);sk.lineTo(lm[b].x*640,lm[b].y*480);sk.stroke()});sk.fillStyle='#efd5ff';lm.forEach(p=>{sk.beginPath();sk.arc(p.x*640,p.y*480,5,0,Math.PI*2);sk.fill()})}
function closeCamera(){clearTimeout(cameraTimeout);session++;starting=false;workerReady=false;busy=false;worker?.terminate();worker=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;$('#camera-panel').hidden=true;shadowDots.visible=shadowLines.visible=false;shadowHand=null;$('#camera').disabled=false;$('#resume-camera').disabled=false;$('#resume-cancel').hidden=true;$('#question').readOnly=false;$('#welcome').removeAttribute('aria-busy');$('#camera').innerHTML='<span class="launch-label">开始抽牌</span><span class="launch-arrow" aria-hidden="true">→</span>'}
function returnWelcome(message){paused=false;$('#resume-dialog').close();document.body.classList.remove('in-ritual');clearSpread();closeCamera();mode='idle';finished=false;ritual.reset();$('#result').hidden=true;$('#ritual').hidden=true;$('#welcome').hidden=false;$('#demo-badge').hidden=true;frontMat.opacity=backMat.opacity=0;$('#progress i').style.transform='scaleX(0)';status(message)}
$('#stop').onclick=()=>pauseRitual('摄像头已关闭，已选牌会为你保留。');
$('#cancel-camera').onclick=()=>cameraFailure('已取消启动，可重新开启摄像头。');
$('#copy-camera-link').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname);$('#copy-camera-link').textContent='已复制 · 可粘贴到 Chrome / Safari'}catch{$('#camera-feedback').textContent='请复制地址栏链接，在 Chrome 或 Safari 中打开。'}};

function requireQuestion(){
 const input=$('#question');
 if(input.value.trim()){input.removeAttribute('aria-invalid');return true;}
 input.setAttribute('aria-invalid','true');$('#question-hint').textContent='先写下一个问题，再让水镜为你抽牌。';input.focus();return false;
}
$('#question').addEventListener('input',()=>{const ready=!!$('#question').value.trim();$('#question').removeAttribute('aria-invalid');$('#welcome').classList.toggle('question-ready',ready);$('#question-hint').textContent=ready?'问题已写好，可以开始抽牌了。':'请先写下你的问题，再开始抽牌。';});
$('#welcome').onsubmit=event=>{event.preventDefault();requireQuestion();};
$('#question').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();$('#question').blur();}});
async function startCamera(){if(!paused&&!requireQuestion())return;activateSound();
 if(!paused&&new URLSearchParams(location.search).get('interaction')==='mouse'){closeCamera();begin('demo');pointerInside=true;return;}
 if(starting)return;starting=true;$('#resume-camera').disabled=true;$('#resume-cancel').hidden=!paused;const id=++session;$('#camera').disabled=true;$('#question').readOnly=true;$('#question').blur();$('#welcome').setAttribute('aria-busy','true');$('#camera').innerHTML='<span class="launch-label">正在开启摄像头…</span><span class="launch-spinner" aria-hidden="true">☾</span>';status('正在连接摄像头。若出现权限提示，请选择允许。');cameraDeadline(25000,'等待摄像头授权超时。请检查浏览器与系统的摄像头权限，再点击重试。');
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('UNSUPPORTED');

  const acquiredStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
  if(id!==session){acquiredStream.getTracks().forEach(t=>t.stop());return}
  stream=acquiredStream;status('摄像头已获授权，正在启动画面…');cameraDeadline(12000,'摄像头已授权，但没有取得画面。请关闭占用摄像头的应用后重试。');video.srcObject=stream;await video.play();
  if(id!==session)return;$('#camera-panel').hidden=false;status('画面已开启，正在加载本地手势模型…');cameraDeadline(45000,'手部模型加载超时。请刷新页面后重试。');

  worker=new Worker('./hand-worker.js');
  const modelTimeout=setTimeout(()=>{if(id===session&&!workerReady)cameraFailure('手部模型加载超时，请刷新页面后重试')},45000);
  worker.onmessage=({data})=>{
   if(id!==session)return;
   if(data.type==='ready'){clearTimeout(modelTimeout);workerReady=true;starting=false;lastVideo=-1;lastUpdate=0;lastHandTime=performance.now();begin('camera');$('#tracking').textContent='等待手掌';stream.getVideoTracks()[0].onended=()=>pauseRitual('摄像头连接已结束，进度已保留。')}
   else if(data.type==='result'){busy=false;drawLandmarks(data.landmarks);if(data.landmarks){const h=describeHand(data.landmarks);if(h){const now=performance.now();updateInput(h,Math.min(.12,lastUpdate?(now-lastUpdate)/1000:.05),data.landmarks);lastUpdate=now;$('#tracking').textContent=h.fist?'● 握拳':h.open?'● 张开手掌':'● 请张开手或握拳'}}else{$('#tracking').textContent='等待手掌';lastUpdate=0;ritual.missing(.065);if(ritual.missingTime>.4){hand=null;shadowDots.visible=shadowLines.visible=false;shadowHand=null;}}}
   else if(data.type==='error'){clearTimeout(modelTimeout);console.error('Hand recognition:',data.message);cameraFailure('手部模型未能启动，请刷新页面后重试')}
  };worker.onerror=e=>{clearTimeout(modelTimeout);console.error('识别组件启动失败',e.message,e.filename,e.lineno);if(id===session)cameraFailure('识别脚本加载失败。请刷新页面重试；若仍失败，可复制链接到 Chrome 或 Safari 打开。')};worker.postMessage({type:'init'});
 }catch(e){if(id!==session)return;console.error(e);const message=e.message==='PREVIEW_OFFLINE'?'本地预览服务未连接，无法加载识别组件。请先启动作品服务，再刷新重试。':e.name==='NotAllowedError'?'摄像头权限未获允许。请在浏览器和系统设置中允许摄像头，或复制链接到 Chrome / Safari 重试。':e.name==='NotFoundError'?'未找到摄像头，请连接摄像头后重试':e.name==='NotReadableError'?'摄像头被其他应用占用，请关闭占用后重试':'摄像头无法启动，请使用 localhost 或 HTTPS 打开';cameraFailure(message)}
}
$('#camera').onclick=startCamera;

function cameraFailure(message){if(paused){closeCamera();status(message+' 可重试，或改用鼠标继续。')}else returnWelcome(message)}
function pauseRitual(message='暂离期间，摄像头已关闭。'){
 if(mode==='idle'){if(starting)cameraFailure('启动已暂停，可重新开启摄像头。');return}
 sounds.stopStir();closeCamera();pointerInside=false;pointer.fist=false;pointer.open=true;hand=null;prevPosition=null;pool.hover(null);pool.stir(null,0);hideGestureDemo();
 if(finished||spread.complete)return;
 // A confirmed card is committed exactly once before pausing, even mid-lift.
 if(spread.pending){ritual.lift=1;ritual.stage='done';finish();}
 if(spread.complete)return;
 clearTimeout(settleTimer);settling=false;ritual.reset(true);frontMat.opacity=backMat.opacity=0;paused=true;
 const n=spread.drawn.length;$('#resume-description').textContent=n?`已选的 ${n} 张牌仍在原位，还剩 ${3-n} 张。`:'你的问题与水下牌池仍在原位。';
 $('#resume-cards').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<n?'saved-card':'empty-card'}" aria-label="第${i+1}张${i<n?'已选':'待选'}">${i<n?'✧':'＋'}</span>`).join('');
 $('#resume-feedback').textContent=message;$('#demo-badge').hidden=true;if(!$('#resume-dialog').open)$('#resume-dialog').showModal();
}
function resumeRitual(type){activateSound();
 inputLabels(type);
 if(type==='demo')closeCamera();paused=false;mode=type;$('#resume-dialog').close();$('#welcome').hidden=true;$('#camera-feedback').hidden=true;$('#camera-actions').hidden=true;document.body.classList.add('in-ritual');
 hand=null;prevPosition=null;pointer.fist=false;pointer.open=true;pointerInside=false;lastUpdate=0;lastHandTime=performance.now();ritual.reset(true);$('#ritual').hidden=false;$('#instruction').textContent=type==='demo'?'移动鼠标靠近牌影，等它亮起后点击。':'张手靠近牌影，亮起后握拳选中。';$('#demo-badge').hidden=type!=='demo';updateSlots();status(type==='demo'?'移动鼠标靠近牌影，点击即可捞起。':'进度已接回 · 张手靠近，再握拳选牌');
 if(type==='camera')showGestureDemo();
}
$('#resume-dialog').addEventListener('cancel',event=>event.preventDefault());
$('#resume-camera').onclick=()=>startCamera();
$('#resume-mouse').onclick=()=>resumeRitual('demo');
$('#resume-cancel').onclick=()=>cameraFailure('已取消摄像头启动。');
$('#pause-ritual').onclick=()=>pauseRitual();
$('#mouse-entry').onclick=()=>{if(!requireQuestion())return;closeCamera();begin('demo')};

$('#reset').onclick=$('#again').onclick=()=>{if(mode==='camera'||mode==='demo'){resetRitual();if(mode==='camera'&&!workerReady)pauseRitual('准备好后开启摄像头，或改用鼠标。')}else returnWelcome('水镜静候你的到来')};
$('#change-question').onclick=()=>{returnWelcome('写下新的问题，让水镜再次回应。');$('#question').focus();$('#question').select();};
$('#save').onclick=()=>{if(!spread.complete)return;const text=['月下水镜 · 隐月',new Date().toLocaleString('zh-CN'),$('#question').value||'与此刻的自己对话',...spread.drawn.map((c,i)=>{const r=interpretation(c,i);return `\n${r.title}：${r.name} · ${r.orientation}\n${r.keywords}\n${r.text}\n本次方向牌义：${r.meaning}\n图像：${r.symbols}\n${r.reflection}`}), '\n'+$('#synthesis').textContent,personalReading.exportText(),'\n仅供娱乐与自我探索。'].join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='月下水镜-今夜的低语.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function pointerMove(e){const r=canvas.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const p=new THREE.Vector3();if(ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),p)){pointer.x=p.x/5.6+.5;pointer.y=p.z/6+.57;}pointerInside=true}
canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerdown',e=>{if(paused||mode!=='demo')return;pointerMove(e);pointer.fist=true;pointer.open=false;updateInput(pointer,.1,null);canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointerup',()=>{pointer.fist=false;pointer.open=true});canvas.addEventListener('pointercancel',()=>{pointer.fist=false;pointer.open=true;pointerInside=false;ritual.missing()});canvas.addEventListener('pointerleave',()=>{if(!pointer.fist)pointerInside=false});
function resize(){renderer.setSize(innerWidth,innerHeight);const aspect=innerWidth/innerHeight,viewWidth=12*Math.min(1,aspect/1.6);camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewWidth/aspect/2;camera.bottom=-camera.top;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
let lastFrame=performance.now();
function animate(now){frameId=requestAnimationFrame(animate);const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;const t=now/1000;waterUniforms.uTime.value=t;waterUniforms.uWake.value=THREE.MathUtils.damp(waterUniforms.uWake.value,ritual.stage==='wake'?.15:1,2,dt);waterMotion*=.97;waterUniforms.uMotion.value=waterMotion;
 flames.forEach(({f,light},i)=>{f.scale.y=1.6+Math.sin(t*7+i)*.17;light.intensity=4.5+Math.sin(t*5+i)*.4});dust.rotation.y=t*.008;
 if(!paused&&mode==='demo'&&pointerInside)updateInput(pointer,dt,null);
 if(!paused&&mode==='camera'&&workerReady&&!busy&&video.readyState>=2&&now-lastDetect>45&&video.currentTime!==lastVideo){busy=true;lastDetect=now;lastVideo=video.currentTime;const activeWorker=worker;createImageBitmap(video).then(frame=>{if(worker===activeWorker&&workerReady)activeWorker.postMessage({type:'frame',frame,time:performance.now()},[frame]);else{frame.close();busy=false}}).catch(()=>{busy=false})}
 if(!paused&&mode==='camera'&&now-lastHandTime>700&&!finished&&!settling&&ritual.stage!=='lift'){pool.hover(null);pool.stir(null,dt);status('等你的手回来 · 已选的牌会保留');$('#instruction').textContent='把手自然放回镜头即可继续。'}
 if(!paused&&!settling&&!finished&&ritual.stage==='lift'){ritual.advance(dt);if(ritual.lift>.15&&!liftSoundPlayed){sounds.lift();emitDrops();liftSoundPlayed=true}if(ritual.stage==='done')finish()}
 pool.update(dt);poolRoot.visible=mode!=='idle'&&!finished;
 poolVisuals.forEach((v,i)=>{const c=pool.items[i],focus=c===pool.focus&&!settling&&ritual.stage==='ready';v.group.visible=!c.removed;v.group.position.set(c.x,THREE.MathUtils.damp(v.group.position.y,.055+c.depth*.25+Math.sin(t*1.35+i*1.7)*.045+(focus?.27:0),6,dt),c.z);v.group.rotation.set(Math.sin(t*1.1+i)*.045,c.angle+Math.sin(t*.55+i)*.055,Math.cos(t*.9+i)*.035);v.material.map=backMat.map;v.material.opacity=THREE.MathUtils.damp(v.material.opacity,focus?1:pool.focus?.65:.85+(i%3)*.05,5,dt);v.rim.material.opacity=THREE.MathUtils.damp(v.rim.material.opacity,focus?1:.35+Math.sin(t*1.5+i)*.12,7,dt);v.rim.position.y=.025;v.group.scale.setScalar(THREE.MathUtils.damp(v.group.scale.x,focus?1.22:1,9,dt));});
 const cardVisible=mode==='idle'||(!settling&&!finished&&ritual.stage==='lift');frontMat.opacity=backMat.opacity=THREE.MathUtils.damp(frontMat.opacity,cardVisible?1:0,10,dt);
 if(!settling&&!finished&&ritual.stage==='lift'){const f=ritual.lift,rise=Math.min(1,f/.56),ease=1-Math.pow(1-rise,3),reduced=magic.reduced;cardGroup.position.set(liftOrigin.x*(1-ease*.65),liftOrigin.y+ease*2.05,liftOrigin.z*(1-ease*.6));cardGroup.rotation.set(Math.PI/2*(1-ease)-.12*ease,Math.PI+(reduced?0:Math.sin(f*Math.PI)*.16),.04*Math.sin(f*Math.PI));cardGroup.scale.setScalar(.74+ease*(innerWidth<700?.35:.58));}
 cardEdgeMat.opacity=frontMat.opacity;
 halo.material.opacity=cardVisible?.22+Math.sin(t)*.06:0;tether.material.opacity=!settling&&ritual.stage==='lift'?.5:0;if(ritual.stage==='lift'){tetherGeo.attributes.position.setXYZ(0,liftOrigin.x,-.06,liftOrigin.z);tetherGeo.attributes.position.setXYZ(1,cardGroup.position.x,cardGroup.position.y-.4,cardGroup.position.z);tetherGeo.attributes.position.needsUpdate=true;}
 if(mode==='idle'){cardGroup.position.set(Math.sin(t*.4)*.045,1.25+Math.sin(t*.8)*.075,0);cardGroup.rotation.set(-.16,Math.PI+Math.sin(t*.4)*.08,-.12);cardGroup.scale.setScalar(.92);halo.material.opacity=.14+Math.sin(t)*.04;}
 filaments.forEach((line,j)=>{const show=mode==='idle'||(!settling&&ritual.stage==='lift');line.material.opacity=show?(mode==='idle'?.6:.8):0;const a=line.geometry.attributes.position;const height=Math.max(.05,cardGroup.position.y-.45);for(let k=0;k<32;k++){const f=k/31,r=(1-f)*(.22+j*.065),angle=f*7-t*.7+j*2;a.setXYZ(k,(mode==='idle'?0:liftOrigin.x)*(1-f)+cardGroup.position.x*f+Math.sin(angle)*r,.02+f*height,Math.cos(angle)*r+(mode==='idle'?0:liftOrigin.z)*(1-f)+cardGroup.position.z*f)}a.needsUpdate=true});
 parked.forEach((p,i)=>{const mobile=innerWidth<700;const target=new THREE.Vector3((i-1)*(mobile?.96:1.65),finished?1.15:.6,finished?-.25:-.8);p.group.position.lerp(target,1-Math.exp(-dt*3));p.group.rotation.x=THREE.MathUtils.damp(p.group.rotation.x,-.36,4,dt);p.group.rotation.y=THREE.MathUtils.damp(p.group.rotation.y,finished?Math.PI*2:Math.PI,3,dt);p.group.scale.lerp(new THREE.Vector3().setScalar(finished?(mobile?.78:1.1):.75),1-Math.exp(-dt*3))});
 if(hand&&mode!=='idle'&&!finished){const hp=worldPoint(hand);focusRing.position.lerp(hp,1-Math.exp(-dt*28));
 const target=pool.focus;aimLine.material.opacity=target&&ritual.stage==='ready'?.5:0;
 if(target){aimGeometry.attributes.position.setXYZ(0,hp.x,.055,hp.z);aimGeometry.attributes.position.setXYZ(1,target.x,.055,target.z);aimGeometry.attributes.position.needsUpdate=true;}
 focusRing.material.color.set(target?'#ffe1a3':'#c1e0f3');focusRing.material.opacity=THREE.MathUtils.damp(focusRing.material.opacity,ritual.stage==='ready'?.9:.35,10,dt);focusRing.scale.setScalar(ritual.stage==='ready'?1.1+Math.sin(t*4)*.1:1.5)}else{focusRing.material.opacity=THREE.MathUtils.damp(focusRing.material.opacity,0,8,dt);aimLine.material.opacity=0;}
 lockAge+=dt;lockRing.material.opacity=lockAge<.42?(1-lockAge/.42):0;lockRing.scale.setScalar(Math.max(.15,1-lockAge/.48));
 splashAge+=dt;splashRings.forEach((ring,i)=>{const a=splashAge-i*.09;ring.visible=a>=0&&a<.85&&!paused;ring.scale.setScalar(1+Math.max(0,a)*(magic.reduced?1:3.8));ring.material.opacity=ring.visible?(1-a/.85)*.65:0;});
 sounds.update(now);
 magic.update(dt,t);document.body.classList.toggle('casting',magic.active);
 animateDrops(dt);renderer.render(scene,camera);
}frameId=requestAnimationFrame(animate);
addEventListener('pagehide',()=>{sounds.stopStir();cancelAnimationFrame(frameId);closeCamera()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode!=='idle'||starting))pauseRitual()});
