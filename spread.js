export const positions=[{title:'过去的回声',label:'过去',prompt:'回望形成此刻的经历',lead:'回看过去，这张牌邀请你辨认：'},{title:'此刻的倒影',label:'现在',prompt:'看清当下的感受与处境',lead:'放在当下的位置，这张牌提醒你留意：'},{title:'前方的微光',label:'未来',prompt:'探索可以尝试的发展方向',lead:'面向未来，可以把这张牌看作一个行动方向：'}];
// Rejection sampling avoids modulo bias; orientation is an independent draw.
function secureIndex(n){const limit=4294967296-4294967296%n,a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
export class Spread{
 constructor(deck,random=secureIndex){this.deck=deck;this.random=random;this.reset()}
 reset(){this.pool=[...this.deck];this.drawn=[];this.pending=null}
 draw(card=null){
  if(this.drawn.length===3)return null;
  if(this.pending)return this.pending;
  if(card&&!this.pool.includes(card))return null;
  const original=this.pool.splice(card?this.pool.indexOf(card):this.random(this.pool.length),1)[0];
  this.pending=Object.assign(Array.isArray(original)?[...original]:{...original},{cardId:this.deck.indexOf(original),reversed:this.random(2)===1});
  return this.pending;
 }
 commit(){if(!this.pending||this.drawn.length>=3)return false;this.drawn.push(this.pending);this.pending=null;return true}
 get complete(){return this.drawn.length===3}
}
export function interpretation(card,index){const p=positions[index],rev=card.reversed?card[10]:null;return {title:p.title,name:card[0],orientation:card.reversed?'逆位':'正位',text:rev?.positions[index]||card[8]?.[index]||p.lead+card[4],meaning:rev?.meaning||card[4],keywords:rev?.keywords||card[6]||'',symbols:card[7]||'',reflection:rev?.reflection||card[5]}}
export function summarizeSpread(drawn){
 const lines=drawn.map((c,i)=>{const r=interpretation(c,i);return `${positions[i].label}「${r.name}·${r.orientation}」：${r.keywords}`;});
 return lines.join('；')+'。以上是牌面基础线索；针对问题的三牌关系与判断见“水镜回应你的问题”。';
}
