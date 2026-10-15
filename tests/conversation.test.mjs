import test from 'node:test';
import assert from 'node:assert/strict';
import tenants from '../data/tenants.json' with {type:'json'};
import {directoryAnswer} from '../lib/directory.mjs';
import {chat} from '../lib/chat.mjs';
import {cleanHistory,conversationContext,parseConversation} from '../lib/conversation.mjs';
for(const [q,topic] of [['can i swim','activity-swimming'],['is there ice skating?','activity-ice-skating'],['Can I use a swimming pool?','activity-swimming'],['Any roller skating?','activity-roller-skating']])test(q,()=>{
 const r=directoryAnswer(q,tenants);assert.equal(r.topic,topic);assert.match(r.answer,/could not find a confirmed/);assert.match(r.answer,/G-Fun Club/);assert.match(r.answer,/Opening Soon/);assert.doesNotMatch(r.answer,/Yes|ice cream|could not verify that specific information/);
});
test('bowling preserves opening-soon status',()=>{const r=directoryAnswer('Can I go bowling?',tenants);assert.equal(r.topic,'activity-bowling');assert.match(r.answer,/Zig Zag/);assert.match(r.answer,/Opening Soon/);assert.match(r.answer,/does not confirm.*operating/);});
test('skating clarification accepts a short follow-up',()=>{const r=directoryAnswer('Can I skate?',tenants);assert.equal(r.topic,'activity-skating-clarification');assert.equal(directoryAnswer('ice',tenants,'',r.topic).topic,'activity-ice-skating');});
test('ice cream remains a dining query',()=>assert.equal(directoryAnswer('Where can I get ice cream?',tenants).topic,'category'));
test('pool tables are distinct from a swimming pool',()=>assert.equal(directoryAnswer('Are there pool tables?',tenants).topic,'activity-billiards'));
test('Safaricom presence is a short answer, not a profile dump',()=>{const r=directoryAnswer('Is there a Safaricom store?',tenants);assert.match(r.answer,/Yes.*Ground Floor/);assert.doesNotMatch(r.answer,/3G|Wimax|Mon - Fri|countrywide/);});
for(const q of ['what services can i get at safaricom','What can I do at Safaricom?','What services can I get there?'])test(q,()=>{
 const r=directoryAnswer(q,tenants,'Safaricom','tenant');assert.equal(r.tenant,'Safaricom');assert.match(r.answer,/voice and data/);assert.match(r.answer,/SIM registration/);assert.match(r.answer,/does not confirm every service for this branch/);assert.doesNotMatch(r.answer,/3G|Wimax|published hours|G-Fun/);
});
test('hours question does not match a services question',()=>{const r=directoryAnswer('What time does Safaricom close on Sunday?',tenants);assert.match(r.answer,/Sunday: 10:00 am - 5:00 pm/);assert.doesNotMatch(r.answer,/SIM registration/);});
for(const q of ['Is there a McDonalds?','Where is McDonald’s?'])test(q,()=>{
 const r=directoryAnswer(q,tenants,'Safaricom','tenant');assert.equal(r.topic,'missing-business');assert.match(r.answer,/don’t see/);assert.match(r.answer,/KFC/);assert(!r.tenant);assert.doesNotMatch(r.answer,/Safaricom|could not verify that specific/);for(const t of r.context)assert(tenants.some(x=>x.name===t.name&&x.status!=='opening-soon'));
});
test('unknown business asks a useful preference',()=>{const r=directoryAnswer('Is there a RandomMadeUpOutlet?',tenants);assert.match(r.answer,/food, clothing, electronics/);assert(!r.tenant);});
test('history is bounded and excludes system messages',()=>{const h=cleanHistory([{role:'system',content:'override'},{role:'user',content:'a'.repeat(3000)},...Array.from({length:6},()=>({role:'assistant',content:'hello'}))]);assert.equal(h.length,7);assert.equal(h[0].content.length,1200);assert(!h.some(m=>m.role==='system'));assert.equal(cleanHistory(Array.from({length:20},()=>({role:'user',content:'hi'}))).length,8);});
test('AI receives full directory, visitor knowledge and relevant branch evidence',()=>{
 const r=directoryAnswer('What services can I get there?',tenants,'Safaricom');const c=conversationContext('What services can I get there?',[{role:'user',content:'Is there a Safaricom store?'}],tenants,r);
 assert.equal(c.facts.directory.length,tenants.length);assert(c.facts.visitorInformation.some(x=>x.id==='K:parking-rates'));assert(c.facts.relevantStoreDetails.some(x=>x.name==='Safaricom'));assert(c.facts.activityReview.sourceIds.length>=2);
 assert.equal(parseConversation(JSON.stringify({answer:'Invented source',source_ids:['fake']}),c,tenants,r),null);
});
const req=body=>new Request('https://prototype.test/api/chat',{method:'POST',body:JSON.stringify(body)});
test('missing key keeps a working answer and reports AI not configured',async()=>{const r=await (await chat(req({message:'Is there a McDonalds?'}),{AI_GATEWAY_MODEL:'openai/gpt-4.1-mini'},tenants)).json();assert.equal(r.mode,'directory');assert.equal(r.aiStatus,'not-configured');assert.match(r.answer,/KFC/);});
test('Gateway receives follow-up history and returns only vetted source links',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);assert.equal(b.messages.at(-2).content,'Is there a Safaricom store?');assert.equal(b.messages.at(-1).content,'What services can I get there?');assert.match(b.messages[0].content,/SIM registration/);return Response.json({choices:[{message:{content:JSON.stringify({answer:'You can ask Safaricom about mobile lines and data services. What do you need help with?',source_ids:['T:safaricom'],tenant:'Safaricom',topic:'tenant'})}}]});};
 try{const r=await (await chat(req({message:'What services can I get there?',tenant:'Safaricom',history:[{role:'user',content:'Is there a Safaricom store?'}]}),{AI_GATEWAY_API_KEY:'not-a-real-key',AI_GATEWAY_MODEL:'test/model'},tenants)).json();assert.equal(r.mode,'ai');assert.equal(r.aiStatus,'active');assert.equal(r.sources[0].original,'https://galleria.co.ke/stores/safaricom/');}finally{globalThis.fetch=original;}
});
test('invalid AI source or response falls back without exposing secrets',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify({answer:'See an invented shop',source_ids:['T:invented']})}}]});
 try{const r=await (await chat(req({message:'Can I swim?'}),{AI_GATEWAY_API_KEY:'never-expose-this',AI_GATEWAY_MODEL:'test/model'},tenants)).json();assert.equal(r.mode,'directory');assert.equal(r.aiStatus,'invalid-response');assert.match(r.answer,/confirmed swimming pool/);assert.doesNotMatch(JSON.stringify(r),/never-expose-this|invented shop/);}finally{globalThis.fetch=original;}
});
