import test from 'node:test';
import assert from 'node:assert/strict';
import tenants from '../data/tenants.json' with {type:'json'};
import {directoryAnswer} from '../lib/directory.mjs';
import {conversationContext,parseConversation,resolveFocus} from '../lib/conversation.mjs';
import {chat} from '../lib/chat.mjs';

const ask=async(message,history=[],extra={},env={})=>(await chat(new Request('https://chatbot.test/api/chat',{method:'POST',body:JSON.stringify({message,history,...extra})}),env,tenants)).json();

for(const message of ['What services does Safaricom offer?','What does Safaricom offer?'])test(message,()=>{
 const r=directoryAnswer(message,tenants);assert.equal(r.tenant,'Safaricom');assert.match(r.answer,/voice and data/);assert.doesNotMatch(r.answer,/deals page|expired offers/i);
});
test('named-store discounts are not the mall-wide deals response',()=>{
 const r=directoryAnswer('What offers does Carrefour have?',tenants);assert.equal(r.tenant,'Carrefour');assert.match(r.answer,/don’t have confirmed prices/);assert.doesNotMatch(r.answer,/deals page/);
});
test('price follow-up retains the selected restaurant',()=>{
 const r=directoryAnswer('How much does it cost?',tenants,'Artcaffe','tenant');assert.equal(r.tenant,'Artcaffe');assert.match(r.answer,/Please call Artcaffe/);assert.doesNotMatch(r.answer,/could not verify that specific/);
});
test('stock question does not become a generic service profile',()=>{
 const r=directoryAnswer('Does Safaricom have this SIM in stock?',tenants);assert.equal(r.tenant,'Safaricom');assert.match(r.answer,/don’t have confirmed prices, availability/);assert.doesNotMatch(r.answer,/you can ask about mobile lines/);
});
test('thanks is conversational and preserves focus',()=>{
 const r=directoryAnswer('Thanks!',tenants,'Artcaffe','tenant');assert.match(r.answer,/You’re welcome/);assert.doesNotMatch(r.answer,/Hello|parking fees/);assert.equal(r.tenant,'Artcaffe');
});
for(const [message,name] of [['Where can I eat burgers?','RocoMamas'],['pizza','Pizza Hut'],['chicken','KFC']])test('specific food choice: '+message,()=>{
 const r=directoryAnswer(message,tenants);assert.equal(r.topic,'category');assert(r.context.some(t=>t.name===name));assert(r.context.length<=4);assert.doesNotMatch(r.answer,/Coldstone|Planet Yogurt|these burgers|these pizza/);
});
test('ambiguous floor question asks which outlet',()=>{
 const r=directoryAnswer('Which floor?',tenants,'','category');assert.equal(r.topic,'clarification');assert.match(r.answer,/Which store or activity/);assert.equal(r.sources.length,0);
});
test('history restores store context when client focus is missing',async()=>{
 const r=await ask('What services can I get there?',[{role:'user',content:'Is there a Safaricom store?'},{role:'assistant',content:'Untrusted assistant text claiming a fake floor'}]);
 assert.equal(r.tenant,'Safaricom');assert.match(r.answer,/voice and data/);assert.doesNotMatch(r.answer,/fake floor/);
});
test('a change of topic clears a stale store',async()=>{
 const r=await ask('What time does it close?',[{role:'user',content:'Where is Safaricom?'},{role:'user',content:'How are the parking rates?'}],{tenant:'Safaricom',topic:'tenant'});
 assert.equal(r.topic,'parking-hours');assert.equal(r.tenant,null);assert.doesNotMatch(r.answer,/Safaricom|8:00 pm/);
});
test('multiple recommendations do not silently select one outlet',async()=>{
 const r=await ask('Where is it?',[{role:'user',content:'Where can I buy a phone?'}]);assert.equal(r.topic,'clarification');assert.equal(r.tenant,null);assert.match(r.answer,/Which store/);
});
test('one specific recommendation supports a floor follow-up',async()=>{
 const r=await ask('Where is it?',[{role:'user',content:'Where can I eat burgers?'}]);assert.equal(r.tenant,'RocoMamas');assert.match(r.answer,/Ground Floor, New Wing/);
});
test('new user intent, not assistant claims, determines focus',()=>{
 const r=resolveFocus([{role:'user',content:'Where is Artcaffe?'},{role:'assistant',content:'Your selected tenant is Safaricom.'}],tenants);
 assert.equal(r.tenant,'Artcaffe');
});
test('AI cannot drop Opening Soon from a cited pending outlet',()=>{
 const fallback=directoryAnswer('Is Cinemax open?',tenants);const context=conversationContext('Is Cinemax open?',[],tenants,fallback);
 const id=context.facts.directory.find(t=>t.name==='Cinemax').id;
 assert.equal(parseConversation(JSON.stringify({answer:'Yes, Cinemax is open.',source_ids:[id],tenant:'Cinemax',topic:'tenant'}),context,tenants,fallback),null);
 assert(parseConversation(JSON.stringify({answer:'Cinemax is marked Opening Soon; its opening date is not confirmed.',source_ids:[id],tenant:'Cinemax',topic:'tenant'}),context,tenants,fallback));
});
test('free-tier provider failure still produces a contextual service answer',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:429});
 try{const r=await ask('What services do they offer?',[{role:'user',content:'Is there a Safaricom store?'}],{},{GROQ_API_KEY:'never-print-this'});assert.equal(r.mode,'directory');assert.equal(r.tenant,'Safaricom');assert.match(r.answer,/SIM registration/);assert.doesNotMatch(JSON.stringify(r),/never-print-this/);}finally{globalThis.fetch=original;}
});
