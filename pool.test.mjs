import assert from 'node:assert/strict';import {CardPool} from './pool.js';import {Spread} from './spread.js';
const deck=Array.from({length:22},(_,i)=>({id:i})),p=new CardPool(deck,()=>.4);
assert.equal(p.items.length,22);assert.equal(new Set(p.items.map(c=>c.card)).size,22);
const first=p.items[0],far=p.items.reduce((a,b)=>Math.hypot(a.x-first.x,a.z-first.z)>Math.hypot(b.x-first.x,b.z-first.z)?a:b);p.stir({x:first.x-.1,z:first.z},.05);p.stir({x:first.x+.1,z:first.z},.05);assert.ok(Math.abs(first.vx)>Math.abs(far.vx)*3,'local current fades with distance');const x=first.x;p.update(.05);assert.notEqual(first.x,x);const speed=Math.hypot(first.vx,first.vz);for(let i=0;i<80;i++)p.update(.05);assert.ok(Math.hypot(first.vx,first.vz)<speed);
p.hover({x:first.x,z:first.z});const chosen=p.take();assert.equal(chosen,first);assert.equal(chosen.removed,true);assert.equal(p.take(),null);assert.notEqual(p.hover({x:first.x,z:first.z}),first);
const s=new Spread(deck,()=>0);const card=p.items[1].card;assert.equal(s.draw(card).cardId,deck.indexOf(card));assert.ok(s.commit());assert.equal(s.draw(card),null,'consumed identity cannot be redrawn');assert.equal(s.draw({id:99}),null);p.reset();assert.equal(p.items.filter(c=>!c.removed).length,22);
console.log('PASS: distinct identities, local water force, inertia and damping, consume, reset, explicit no-repeat draw');

const assist=new CardPool(deck,()=>.4),focus=assist.items[0];assist.hover({x:focus.x,z:focus.z});assist.stir({x:focus.x-.03,z:focus.z},.065);assist.stir({x:focus.x+.03,z:focus.z},.065);assert.equal(focus.vx,0,'slow approach must not push selected card away');focus.vx=1;assist.update(.1);assert.ok(focus.vx<.2,'focused target brakes quickly');
