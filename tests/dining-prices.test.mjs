import test from 'node:test';
import assert from 'node:assert/strict';
import tenants from '../data/tenants.json' with {type:'json'};
import {dialogueTurn} from '../lib/dialogue.mjs';
import {handle} from '../api/index.mjs';
test('reported mixed-language food and cheapest sequence answers the actual question',()=>{
 let t=dialogueTurn('hi',tenants);t=dialogueTurn('kuna food?',tenants,t.state);assert.equal(t.state.language,'sw');assert.equal(t.result.topic,'dining-preference');assert.match(t.result.answer,/Ungependa/);
 t=dialogueTurn('cheapest restaurant',tenants,t.state);assert.equal(t.result.topic,'dining-price-comparison');assert.match(t.result.answer,/Sina bei/);assert.doesNotMatch(t.result.answer,/•|Here are/);
 t=dialogueTurn('Artcaffe',tenants,t.state);assert.equal(t.result.tenant,'Artcaffe');assert.match(t.result.answer,/menyu/);assert(t.result.answer.includes(tenants.find(t=>t.name==='Artcaffe').phone));
});
test('English and Kiswahili price comparisons never invent a ranking or menu price',()=>{
 for(const q of ['cheapest restaurant','Which restaurant is most affordable?','Where can I get cheap food?']){const t=dialogueTurn(q,tenants);assert.equal(t.result.topic,'dining-price-comparison',q);assert.match(t.result.answer,/verified current menu prices/);assert(t.result.fixedAnswer);}
 const sw=dialogueTurn('Mkahawa wenye bei nafuu zaidi',tenants);assert.equal(sw.state.language,'sw');
});
test('contextual cheaper followup is scoped to dining',()=>{
 let t=dialogueTurn('Where is Artcaffe?',tenants);t=dialogueTurn('anything cheaper?',tenants,t.state);assert.equal(t.result.topic,'dining-price-comparison');
 const shopping=dialogueTurn('Where can I buy cheap shoes?',tenants);assert.notEqual(shopping.result.topic,'dining-price-comparison');
});
test('price comparison uses its verified fallback even with an AI key configured',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>{throw Error('AI must not rank unverified prices');};
 try{const r=await handle(new Request('https://test.local/api/chat',{method:'POST',body:JSON.stringify({message:'cheapest restaurant'})}),{AI_PROVIDER:'groq',GROQ_API_KEY:'test'});const d=await r.json();assert.equal(d.aiStatus,'not-needed');assert.equal(d.topic,'dining-price-comparison');assert.match(d.answer,/can’t reliably name/);}finally{globalThis.fetch=previous;}
});
