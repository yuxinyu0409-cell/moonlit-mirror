import assert from 'node:assert/strict';
import {cards} from './cards.js';
import {createPersonalReading} from './reading.js';
import fs from 'node:fs';
class Element {
 constructor(tagName=''){this.tagName=tagName;this.children=[];this.textContent='';this.hidden=false;this.attributes={};}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(k,v){this.attributes[k]=v;}
 removeAttribute(k){delete this.attributes[k];}
}
const elements=new Map();const doc={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement(tagName){return new Element(tagName);}};
const response={answer:'换工作先看条件',card_readings:['过去','现在','未来'],synthesis:'牌之间有张力',actions:['核实岗位','评估资源'],reflection:'最看重什么？'};
let requests=[];
const reading=createPersonalReading(cards,{doc,fetcher:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>response};}});
await reading.start('我该换工作吗？',[cards[0],cards[6],cards[18]]);
assert.deepEqual(requests[0],{question:'我该换工作吗？',cards:[{id:0,reversed:false},{id:6,reversed:false},{id:18,reversed:false}]});
assert.equal(elements.get('personal-content').hidden,false);
assert.match(reading.exportText(),/换工作先看条件/);
await reading.retry();assert.equal(requests.length,2);
await reading.start(' ',[cards[0],cards[1],cards[2]]);assert.equal(requests.length,2);assert.match(elements.get('reading-status').textContent,/没有填写问题/);
let resolve;
const stale=createPersonalReading(cards,{doc,fetcher:()=>new Promise(r=>resolve=r)});
const pending=stale.start('问题',[cards[0],cards[1],cards[2]]);stale.reset();resolve({ok:true,json:async()=>response});await pending;
assert.equal(elements.get('personal-content').children.length,0);
const failing=createPersonalReading(cards,{doc,fetcher:async()=>({ok:false,json:async()=>({error:'服务尚未配置'})})});
await failing.start('问题',[cards[0],cards[1],cards[2]]);assert.equal(elements.get('retry-reading').hidden,false);assert.match(failing.exportText(),/尚未配置/);
const knowledge=JSON.parse(fs.readFileSync('tarot-knowledge.json','utf8'));
cards.forEach((c,i)=>{assert.equal(knowledge.cards[i].name,c[0]);assert.equal(knowledge.cards[i].meaning,c[4]);assert.deepEqual(knowledge.cards[i].positions,c[8]);});
console.log('PASS: question payload, rendering, export, retry, empty question, stale response, errors and knowledge parity');

const draws=[Object.assign([...cards[77]],{cardId:77,reversed:true}),Object.assign([...cards[22]],{cardId:22,reversed:false}),Object.assign([...cards[18]],{cardId:18,reversed:true})];
await reading.start('如何改善合作？',draws);const original=structuredClone(requests.at(-1));await reading.retry();assert.deepEqual(requests.at(-1),original);assert.equal(original.cards[0].id,77);assert.equal(original.cards[0].reversed,true);assert.match(reading.exportText(),/星币国王 · 逆位/);assert.match(reading.exportText(),/圣杯|权杖首牌 · 正位/);
cards.forEach((c,i)=>assert.deepEqual(knowledge.cards[i].reversed,c[10]));

// Invalid successful HTTP responses must never reach the visible result.
let autoRequests=[];
const invalids=[{...response,card_readings:['一','二','三','四']},{...response,actions:[{text:'错误类型'},'行动']},response];
const auto=createPersonalReading(cards,{doc,fetcher:async(url,options)=>{autoRequests.push(JSON.parse(options.body));assert.equal(elements.get('personal-content').hidden,true);return {ok:true,json:async()=>invalids.shift()};}});
await auto.start('如何改善合作？',draws);
assert.equal(autoRequests.length,3);
autoRequests.forEach(body=>assert.deepEqual(body,autoRequests[0]));
assert.equal(elements.get('personal-content').hidden,false);
assert.equal(elements.get('retry-reading').hidden,true);
let exhaustedCount=0;
const exhausted=createPersonalReading(cards,{doc,fetcher:async()=>{exhaustedCount++;return {ok:true,json:async()=>({...response,reflection:' '})};}});
await exhausted.start('问题',draws);
assert.equal(exhaustedCount,3);
assert.equal(elements.get('personal-content').hidden,true);
assert.equal(elements.get('retry-reading').hidden,false);
let serverCount=0;
const serverFailure=createPersonalReading(cards,{doc,fetcher:async()=>{serverCount++;return {ok:false,json:async()=>({error:'已自动尝试4次'})};}});
await serverFailure.start('问题',draws);
assert.equal(serverCount,1); // Never multiply the server's four provider attempts.
let networkCount=0;
const network=createPersonalReading(cards,{doc,fetcher:async()=>{networkCount++;if(networkCount===1)throw new TypeError('fetch failed');return {ok:true,json:async()=>response};}});
await network.start('问题',draws);
assert.equal(networkCount,2);
let cancelledCount=0,resolveCancelled;
const cancelled=createPersonalReading(cards,{doc,fetcher:async()=>{cancelledCount++;return new Promise(resolve=>resolveCancelled=resolve);}});
const cancelledPending=cancelled.start('问题',draws);cancelled.reset();resolveCancelled({ok:true,json:async()=>({})});await cancelledPending;
assert.equal(cancelledCount,1);
assert.equal(elements.get('personal-content').hidden,true);
console.log('PASS: invalid output auto-regeneration, strict text validation, fixed orientations, retry caps, network recovery, cancellation');

// The collapsed view must keep the entire answer, synthesis, actions and reflection.
const full={...response,answer:'建议先核实岗位条件。薪资与职责明确后，再决定是否离开。',actions:['确认职责与薪资范围','检查储蓄能否覆盖过渡期','拿到书面邀约再决定']};
const complete=createPersonalReading(cards,{doc,fetcher:async()=>({ok:true,json:async()=>full})});
await complete.start('我该换工作吗？',draws);
const content=elements.get('personal-content');
const flatten=node=>[node.textContent,...node.children.map(flatten)].join(' ');
const outsideDetails=content.children.filter(node=>node.tagName!=='details').map(flatten).join(' ');
for(const value of ['建议先核实岗位条件。','薪资与职责明确后，再决定是否离开。',full.synthesis,...full.actions,full.reflection])assert.ok(outsideDetails.includes(value));
const cardDetails=content.children.find(node=>node.tagName==='details');
assert.equal(cardDetails.children.filter(node=>node.tagName==='section').length,3);
assert.match(flatten(cardDetails),/三牌逐个解读/);
assert.match(flatten(cardDetails),/星币国王 · 逆位/);
assert.match(outsideDetails,/按这3步做/);
console.log('PASS: complete answer, visible synthesis/actions/reflection, and exactly three expandable card readings');
