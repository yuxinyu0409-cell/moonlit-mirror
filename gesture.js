// A comfortable central camera area covers the entire mirror, with circular bounds.
export function handToWater(h){let x=(h.x-.5)*9,z=(h.y-.6)*10;const r=Math.hypot(x,z);if(r>2.42){x*=2.42/r;z*=2.42/r}return {x,z};}
export function describeHand(lm){
 if(!lm||lm.length<21)return null;
 const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0)),scale=d(lm[0],lm[9]);
 if(scale<.03)return null;
 const tips=[8,12,16,20];
 const extended=tips.filter(i=>d(lm[i],lm[0])>d(lm[i-2],lm[0])*1.18).length;
 const curled=tips.filter(i=>d(lm[i],lm[0])<d(lm[i-2],lm[0])*1.08&&d(lm[i],lm[i-3])/scale<.85).length;
 return {x:1-[0,5,9,17].reduce((sum,i)=>sum+lm[i].x,0)/4,y:[0,5,9,17].reduce((sum,i)=>sum+lm[i].y,0)/4,fist:curled>=3&&Math.max(...tips.map(i=>d(lm[i],lm[i-3])/scale))<1.45,open:extended>=3,grip:curled/4};
}
export class Ritual{
 constructor(){this.reset()}
 reset(awake=false){this.stage=awake?'seek':'wake';this.time=0;this.progress=0;this.lift=0;this.position=null;this.missingTime=0;this.releaseTime=0;this.gripTime=0;this.armed=false;}
 missing(dt=.065){if(this.stage==='lift'||this.stage==='done')return;this.missingTime+=dt;if(this.missingTime>.4){this.position=null;this.gripTime=0;this.releaseTime=0;this.armed=false;if(this.stage==='wake')this.time=0}}
 update(h,dt){this.missingTime=0;if(this.stage==='lift'||this.stage==='done')return;
 if(!this.position)this.position={x:h.x,y:h.y};const alpha=1-Math.exp(-28*dt);this.position.x+=(h.x-this.position.x)*alpha;this.position.y+=(h.y-this.position.y)*alpha;
 if(h.open&&!h.fist){this.releaseTime+=dt;if(this.releaseTime>=.1)this.armed=true;this.gripTime=0}else if(h.fist&&h.targetAvailable){this.releaseTime=0;this.gripTime+=dt}else{this.releaseTime=0;this.gripTime=Math.max(0,this.gripTime-dt*.5)}
 if(this.stage==='wake'){this.time+=dt;this.progress=Math.min(1,this.time/.18);if(this.time>=.18){this.stage='seek';this.time=0;this.progress=0}}
 else if(this.stage==='seek'){this.time+=dt;if(this.time>=.2){this.stage='ready';this.progress=0;this.gripTime=0}}
 else if(this.stage==='ready'){this.progress=h.fist&&this.armed&&h.targetAvailable?Math.min(1,this.gripTime/.1):0;if(this.armed&&h.fist&&h.targetAvailable&&this.gripTime>=.1){this.stage='lift';this.lift=0;this.progress=0;this.armed=false}}
 }
 advance(dt){if(this.stage!=='lift')return;this.lift=Math.min(1,this.lift+dt/1.45);this.progress=this.lift;if(this.lift>=1)this.stage='done'}
}
