import assert from 'node:assert/strict';
import {Spread,interpretation} from './spread.js';
const deck=Array.from({length:22},(_,i)=>[String(i),'','','','meaning','question']);const s=new Spread(deck,()=>0);
assert.equal(s.commit(),false);const first=s.draw();assert.equal(s.draw(),first,'early release retains selected card');assert.equal(s.commit(),true);assert.equal(s.commit(),false);
for(let i=0;i<2;i++){s.draw();s.commit()}
assert.equal(s.complete,true);assert.equal(new Set(s.drawn.map(c=>c.cardId)).size,3);assert.equal(s.draw(),null);assert.equal(s.pool.length,19);assert.match(interpretation(s.drawn[2],2).text,/行动方向/);s.reset();assert.equal(s.pool.length,22);assert.equal(s.drawn.length,0);console.log('PASS: pending draw, early release, 3 distinct cards, completion, positions, reset');
// Direction is sampled exactly once per selected card, never on retry/commit.
const randomCalls=[];const mixed=new Spread(deck,n=>{randomCalls.push(n);return n===2?1:0;});
const reversed=mixed.draw(deck[21]);assert.equal(reversed.reversed,true);assert.equal(reversed.cardId,21);
assert.equal(mixed.draw(),reversed);assert.deepEqual(randomCalls,[2]);mixed.commit();assert.equal(mixed.draw(deck[21]),null);
assert.equal(mixed.drawn[0].reversed,true);mixed.reset();assert.equal(mixed.pending,null);assert.equal(deck[21].reversed,undefined);
const up=new Spread(deck,()=>0);assert.equal(up.draw().reversed,false);
// Real random source reaches all 78 identities, permits all-upright and all-reversed
// spreads, and remains approximately balanced without enforcing either direction.
const completeDeck=Array.from({length:78},(_,i)=>[String(i)]),randomSpread=new Spread(completeDeck);
const seen=new Set();let reversals=0,allUp=0,allDown=0;
for(let round=0;round<10000;round++){
 randomSpread.reset();for(let p=0;p<3;p++){randomSpread.draw();randomSpread.commit();}
 assert.equal(new Set(randomSpread.drawn.map(c=>c.cardId)).size,3);
 const n=randomSpread.drawn.filter(c=>c.reversed).length;reversals+=n;allUp+=n===0;allDown+=n===3;randomSpread.drawn.forEach(c=>seen.add(c.cardId));
}
assert.equal(seen.size,78);assert.ok(reversals/30000>.47&&reversals/30000<.53);assert.ok(allUp>800&&allDown>800);
console.log(`PASS: 10000 spreads, all 78 identities reached, ${(reversals/30000*100).toFixed(1)}% reversed, all-upright and all-reversed allowed`);
