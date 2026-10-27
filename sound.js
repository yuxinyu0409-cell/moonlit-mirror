// Locally stored, softened recordings replace oscillator beeps. Source credits: AUDIO-SOURCES.md.
export class RitualSound{
 constructor(){this.enabled=false;this.ctx=null;this.buffers={};this.loading=null;this.volume=.42;this.active=new Set();this.lastLift=0;this.lastStir=-Infinity;this.lastMotion=-Infinity;this.waterVoice=null;this.stirIndex=0}
 async load(){if(this.loading)return this.loading;this.loading=Promise.all(['rise','settle','reveal','stir','stir2','stir3'].map(async key=>{const r=await fetch(({rise:'assets/audio/hand-lift-soft.wav',stir:'assets/audio/hand-stir-1-soft.wav',stir2:'assets/audio/hand-stir-2-soft.wav',stir3:'assets/audio/hand-stir-3-soft.wav'})[key]||`assets/audio/moon-${key}.wav`);if(!r.ok)throw new Error('音效素材加载失败');const decoded=await this.ctx.decodeAudioData(await r.arrayBuffer());this.buffers[key]=decoded})).catch(e=>{this.loading=null;throw e});return this.loading}
 async setEnabled(value){this.enabled=value;if(value){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination)}await this.ctx.resume();await this.load()}if(this.master)this.master.gain.setTargetAtTime(value?this.volume:0,this.ctx.currentTime,.035);if(!value){this.stopStir();for(const source of this.active){try{source.stop()}catch{}}this.active.clear()}}
 tone(){/* Focus and toggles stay silent. */}
 stir(speed,now=performance.now()){
  if(!this.enabled||!this.ctx||!this.buffers.stir)return;
  if(speed<.3){this.stopStir();return}
  this.lastMotion=now;
  if(this.waterVoice){this.waterVoice.gain.gain.setTargetAtTime(.45+Math.min(1,speed/3)*.2,this.ctx.currentTime,.08);return}
  if(now-this.lastStir<450)return;
  this.lastStir=now;this.stopStir();
  const t=this.ctx.currentTime,volume=.45+Math.min(1,(speed-.3)/2.4)*.2;
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers[['stir','stir2','stir3'][this.stirIndex++%3]]||this.buffers.stir;source.loop=false;
  gain.gain.setValueAtTime(volume,t);
  source.connect(gain);gain.connect(this.master);this.active.add(source);this.waterVoice={source,gain};
  source.onended=()=>{this.active.delete(source);source.disconnect();gain.disconnect();if(this.waterVoice?.source===source)this.waterVoice=null};source.start(t);
 }
 stopStir(){const voice=this.waterVoice;if(!voice||!this.ctx)return;this.waterVoice=null;const t=this.ctx.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(0,t,.035);try{voice.source.stop(t+.14)}catch{}}
 update(now=performance.now()){if(now-this.lastMotion>180)this.stopStir()}

 play(key,gain=1,delay=0){if(!this.enabled||!this.ctx||!this.buffers[key])return;const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=this.buffers[key];g.gain.value=gain;s.connect(g);g.connect(this.master);s.onended=()=>{this.active.delete(s);s.disconnect();g.disconnect()};this.active.add(s);s.start(this.ctx.currentTime+delay)}
 lift(){this.stopStir();this.lastLift=performance.now();this.play('rise')}
 release(){this.play('settle',.6)}
 reveal(){this.play('reveal',.85)}
 async preview(){await this.setEnabled(true);for(const source of this.active){try{source.stop()}catch{}}this.active.clear();this.play('rise');this.play('settle',.6,.75);this.play('reveal',.8,1.65)}
}
