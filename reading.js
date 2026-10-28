// All generated text is rendered with textContent, never HTML.
export function createPersonalReading(deck,{fetcher=globalThis.fetch,doc=document}={}){
 const $=id=>doc.getElementById(id);
 let controller=null,followController=null,generation=0,last=null,result=null;const history=[];
 function reset(){generation++;followController?.abort();followController=null;history.length=0;$('followup').hidden=true;$('followup-thread').replaceChildren();$('followup-status').textContent='';$('followup-question').value='';$('followup-submit').disabled=false;$('followup-question').disabled=false;controller?.abort();controller=null;last=null;result=null;$('personal-content').replaceChildren();$('personal-content').hidden=true;$('retry-reading').hidden=true;$('reading-status').textContent='';$('personal-reading').removeAttribute('aria-busy');}
 function paragraph(parent,label,text){const section=doc.createElement('section');const heading=doc.createElement('h4');heading.textContent=label;const p=doc.createElement('p');p.textContent=text;section.append(heading,p);parent.append(section);return section;}
 function span(parent,text,className){const node=doc.createElement('span');node.textContent=text;node.setAttribute('class',className);parent.append(node);return node;}
 async function start(question,drawn){
  reset();question=question.trim();
  last={question:question||'这三张牌对当下有什么提示？',cards:drawn.map(c=>({id:c.cardId??deck.indexOf(c),reversed:c.reversed===true}))};
  if(!question){result={answer:'请结合本次三张牌回应追问。',card_readings:drawn.map(c=>c.reversed?c[10].meaning:c[4]),actions:[],reflection:''};$('followup').hidden=false;$('reading-status').textContent='这次你没有填写问题，可以先看牌义，也可以在下方继续追问。';return;}
  const current=generation,body=last;
  controller=new AbortController();const activeController=controller;
  const timer=setTimeout(()=>activeController.abort(),125000);
  $('reading-status').textContent='正在结合你的问题与三张牌解读，如有缺漏会自动重新生成…';
  $('personal-reading').setAttribute('aria-busy','true');
  try{
   let data;
   const valid=value=>{
    const text=s=>typeof s==='string'&&s.trim().length>0&&s.length<=2500;
    return value&&text(value.answer)&&text(value.synthesis)&&text(value.reflection)&&Array.isArray(value.card_readings)&&value.card_readings.length===3&&value.card_readings.every(text)&&Array.isArray(value.actions)&&value.actions.length>=2&&value.actions.length<=3&&value.actions.every(text);
   };
   for(let attempt=0;attempt<3;attempt++){
    if(current!==generation)return;
    if(activeController.signal.aborted)throw new DOMException('Cancelled','AbortError');
    if(attempt)$('reading-status').textContent='正在自动重新生成完整解读，请稍候…';
    try{
     const response=await fetcher('/api/reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:activeController.signal});
     data=await response.json();if(current!==generation)return;
     if(!response.ok){const error=new Error(data.error||'解读暂时无法完成，请稍后重试。');error.serverResponse=true;throw error;}
     if(valid(data))break;
     if(attempt===2)throw new Error('已自动重新生成，解读仍不完整。三张牌已保留，请稍后再试。');
    }catch(error){
     if(current!==generation||activeController.signal.aborted)throw error;
     // The server already retries generation. Do not multiply exhausted or configuration errors.
     if(error.serverResponse||attempt===2||!(error instanceof TypeError||error instanceof SyntaxError))throw error;
    }
   }
   result=data;const content=$('personal-content');
   const answer=paragraph(content,'水镜给你的占示',data.answer);answer.setAttribute('class','reading-answer');
   const first=paragraph(content,'此刻的一步',data.actions[0]);first.setAttribute('class','reading-first-step');
   const details=doc.createElement('details'),summary=doc.createElement('summary');details.setAttribute('class','reading-details');
   const seal=span(summary,'☽','reading-seal');seal.setAttribute('aria-hidden','true');
   const name=doc.createElement('span');name.setAttribute('class','reading-summary-name');
   span(name,'三牌逐个解读','reading-summary-title');span(name,'查看三张牌如何得出这个判断','reading-summary-hint');summary.append(name);
   const toggle=doc.createElement('span');toggle.setAttribute('class','reading-toggle');
   span(toggle,'展开解读','reading-closed');span(toggle,'收起解读','reading-open');const arrow=span(toggle,'⌄','reading-arrow');arrow.setAttribute('aria-hidden','true');summary.append(toggle);
   details.append(summary);content.append(details);
   data.card_readings.forEach((text,i)=>paragraph(details,`${['过去的回声','此刻的倒影','前方的微光'][i]} · ${deck[body.cards[i].id][0]} · ${body.cards[i].reversed?'逆位':'正位'}`,text));
   const section=doc.createElement('section'),heading=doc.createElement('h4'),list=doc.createElement('ol');section.setAttribute('class','reading-actions');heading.textContent='更多行动提示';
   data.actions.slice(1).forEach(text=>{const li=doc.createElement('li');li.textContent=text;list.append(li);});section.append(heading,list);details.append(section);
   const reflection=paragraph(details,'留给自己的一个问题',data.reflection);reflection.setAttribute('class','reading-reflection');
   $('followup').hidden=false;
   content.hidden=false;$('reading-status').textContent='已结合你的问题完成解读';
  }catch(error){if(current!==generation)return;$('reading-status').textContent=error.name==='AbortError'?'等待解读超时，可以保留这三张牌重试。':error instanceof SyntaxError?'解读接口未能返回有效内容，自动重试后仍未恢复。请检查本机服务。':error.message||'连接失败，请检查网络后重试。';$('retry-reading').hidden=false;}
  finally{clearTimeout(timer);if(current===generation){$('personal-reading').removeAttribute('aria-busy');controller=null;}}
 }
 async function followup(question){
  question=question.trim();if(!last||!result||!question||question.length>100||followController)return;
  const current=generation,active=new AbortController();followController=active;
  const timer=setTimeout(()=>active.abort(),125000);
  $('followup-submit').disabled=true;$('followup-question').disabled=true;$('followup-status').textContent='水镜正在回应你的追问…';
  try{
   const response=await fetcher('/api/reading',{method:'POST',headers:{'Content-Type':'application/json'},signal:active.signal,body:JSON.stringify({...last,followup:question,previous_answer:result.answer.slice(0,700),history:history.slice(-4).map(turn=>({question:turn.question,answer:turn.answer.slice(0,700)}))})});
   const data=await response.json();if(current!==generation)return;
   if(!response.ok)throw new Error(data.error||'追问暂时无法完成，请重试。');
   if(typeof data.answer!=='string'||!data.answer.trim()||data.answer.length>2500)throw new Error('追问回应不完整，请重试。');
   const turn=doc.createElement('article');turn.setAttribute('class','followup-turn');
   paragraph(turn,'你问',question);paragraph(turn,'水镜回应',data.answer);
   $('followup-thread').append(turn);history.push({question,answer:data.answer});
   $('followup-question').value='';$('followup-status').textContent='仍沿用本次三张牌，可以继续追问。';
  }catch(error){if(current===generation)$('followup-status').textContent=error.name==='AbortError'?'追问等待超时，问题已保留，可以重试。':error.message||'连接失败，问题已保留，可以重试。';}
  finally{clearTimeout(timer);if(current===generation){followController=null;$('followup-submit').disabled=false;$('followup-question').disabled=false;}}
 }
 const form=$('followup-form');if(form)form.onsubmit=event=>{event.preventDefault();followup($('followup-question').value);};
 return {start,reset,followup,retry(){if(last){const saved=last;return start(saved.question,saved.cards.map(c=>Object.assign([...deck[c.id]],{cardId:c.id,reversed:c.reversed})));}},exportText(){if(!result)return '\n问题解读：'+$('reading-status').textContent;return ['\n水镜回应你的问题',result.answer,...result.card_readings.map((text,i)=>`${['过去','现在','未来'][i]} · ${deck[last.cards[i].id][0]} · ${last.cards[i].reversed?'逆位':'正位'}：${text}`),'下一步：',...result.actions.map((text,i)=>`${i+1}. ${text}`),'反思：'+result.reflection,...history.flatMap(turn=>['追问：'+turn.question,'水镜回应：'+turn.answer]),'依据：韦特78张牌，按实际正逆位解读；传统图录 https://www.gutenberg.org/ebooks/43548'].join('\n');}};
}
