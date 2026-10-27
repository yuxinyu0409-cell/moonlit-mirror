import assert from 'node:assert/strict';import{Ritual,describeHand,handToWater}from'./gesture.js';
const h={x:.5,y:.55,fist:false,open:true,targetAvailable:true},r=new Ritual();
for(let i=0;i<12;i++)r.update({...h,x:.4+i*.015},.05);assert.equal(r.stage,'ready');
r.update({...h,fist:true,open:false},.05);assert.equal(r.stage,'ready');r.update(h,.05);
for(let i=0;i<4;i++)r.update({...h,fist:true,open:false},.05);assert.equal(r.stage,'lift');r.missing(1);assert.equal(r.stage,'lift');r.advance(.7);assert.equal(r.stage,'lift');r.advance(.75);assert.equal(r.stage,'done');
r.reset(true);for(let i=0;i<12;i++)r.update({...h,fist:true,open:false},.05);assert.equal(r.stage,'ready','held fist cannot select again');for(let i=0;i<4;i++)r.update(h,.05);for(let i=0;i<4;i++)r.update({...h,fist:true,open:false,targetAvailable:false},.05);assert.equal(r.stage,'ready','no card means no selection');
r.reset();r.update(h,.05);r.missing(.1);assert.ok(r.position);r.missing(.5);assert.equal(r.position,null);
const landmarks=(closed)=>{const lm=Array.from({length:21},()=>({x:.5,y:.8,z:0}));lm[0]={x:.5,y:.85,z:0};for(let f=0;f<4;f++){const m=5+f*4;lm[m]={x:.4+f*.065,y:.62,z:0};lm[m+1]={x:lm[m].x,y:.48,z:0};lm[m+2]={x:lm[m].x,y:closed?.55:.36,z:0};lm[m+3]={x:lm[m].x,y:closed?.64:.25,z:0};}return lm;};
assert.equal(describeHand(landmarks(true)).fist,true);assert.equal(describeHand(landmarks(false)).open,true);assert.equal(describeHand(landmarks(false)).fist,false);const pointing=landmarks(true),extended=landmarks(false);for(let i=5;i<=8;i++)pointing[i]=extended[i];assert.equal(describeHand(pointing).fist,false,'pointing is not a clenched fist');assert.equal(describeHand([]),null);
console.log('PASS: fist detection, open-palm arming, noise rejection, no-target protection, held-fist lock, dropout grace');

for(const [x,y] of [[.23,.6],[.77,.6],[.5,.33],[.5,.87]]){const p=handToWater({x,y});assert.ok(Math.hypot(p.x,p.z)>2.3,'central camera area reaches mirror edges');assert.ok(Math.hypot(p.x,p.z)<=2.42001);}
assert.deepEqual(handToWater({x:.5,y:.6}),{x:0,z:0});
const openHand=describeHand(landmarks(false)),closedHand=describeHand(landmarks(true));assert.equal(openHand.x,closedHand.x);assert.equal(openHand.y,closedHand.y,'palm cursor does not jump as fingertips curl');
