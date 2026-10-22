import test from 'node:test';
import assert from 'node:assert/strict';
import tenants from '../data/tenants.json' with {type:'json'};
import {dialogueTurn} from '../lib/dialogue.mjs';
import {offeringAnswer} from '../lib/offerings.mjs';
import {handle} from '../api/index.mjs';
const turn=(q,s)=>dialogueTurn(q,tenants,s);
for(const q of ["what's on the menu",'what about their menu','send me the menu','what do they serve','what can I order','what can I eat there'])test('menu after location and hours: '+q,()=>{
 let t=turn('Where is Art Caffe?');t=turn('sure',t.state);t=turn(q,t.state);
 assert.equal(t.result.tenant,'Artcaffe');assert(t.result.fixedAnswer);
 assert.match(t.result.answer,/listing.*mentions.*bread.*pastries.*coffee/i);
 assert.match(t.result.answer,/complete current menu|Confirm particular/);
 assert.doesNotMatch(t.result.answer,/I can’t verify current menu prices/);
 assert.equal(t.result.sources[0].url,'https://galleria.co.ke/stores/artcaffe/');
 assert.equal(turn('on Sunday?',t.state).result.tenant,'Artcaffe');
});
for(const q of ['menyu','wanauza nini','wanapika nini','naweza kuagiza nini'])test('Swahili menu overview: '+q,()=>{
 const t=turn(q,turn('Artcaffe iko wapi').state);assert.equal(t.result.tenant,'Artcaffe');assert.equal(t.state.language,'sw');assert.match(t.result.answer,/inataja.*mikate.*kahawa/);assert.doesNotMatch(t.result.answer,/Galleria’s listing|current menu prices/);
});
test('explicit menu prices get the supported overview and a price limitation',()=>{
 const t=turn('Artcaffe menu prices');assert.match(t.result.answer,/bread/);assert.match(t.result.answer,/verified prices/);assert.doesNotMatch(t.result.answer,/Ksh\s*\d/);
});
test('another restaurant replaces the previous one without sharing its dishes',()=>{
 let t=turn('Artcaffe menu');t=turn('RocoMamas menu',t.state);assert.equal(t.result.tenant,'RocoMamas');assert.match(t.result.answer,/burgers.*ribs.*wings/i);assert.doesNotMatch(t.result.answer,/pastries/);
});
test('unpublished items are uncertain, rather than false yes or false no',()=>{
 const t=turn('do they serve pasta',turn('Artcaffe menu').state);assert.equal(t.result.tenant,'Artcaffe');assert.match(t.result.answer,/listing does not confirm pasta/);assert.doesNotMatch(t.result.answer,/do not serve|serves pasta/);
 const coffee=turn('do they have coffee',t.state);assert.match(coffee.result.answer,/listing.*mentions coffee/);
});
test('dietary and allergen questions never become guarantees from broad descriptions',()=>{
 for(const q of ['Is their food halal?','Do they have vegan options?','Is it safe for a nut allergy?']){
  const t=turn(q,turn('Artcaffe menu').state);assert.match(t.result.answer,/don’t have verified dietary or allergen assurances/);assert.match(t.result.answer,/ingredients and preparation/);
 }
});
test('ambiguous menus clarify instead of silently selecting a restaurant',()=>{
 let t=turn('Where can I get coffee and cake?');assert(t.state.options.length>1);t=turn('their menu',t.state);assert.equal(t.result.topic,'clarification');assert.equal(t.state.tenant,'');assert(t.result.answer.includes('Artcaffe'));
 assert.match(turn('menu').result.answer,/Which restaurant/);
});
test('coming-soon menus never imply an operating restaurant',()=>{
 const soon=tenants.find(t=>t.status==='opening-soon'&&/restaurant/i.test(t.categories));assert(soon);const t=turn(soon.name+' menu');assert.match(t.result.answer,/Opening Soon/);
});
test('retail follow-ups describe official offerings rather than confusing menu prices',()=>{
 const t=turn('what can I buy there',turn('where is Panda Mart').state);assert.equal(t.result.tenant,'Panda Mart');assert.match(t.result.answer,/furniture.*homeware.*electronics/);assert.doesNotMatch(t.result.answer,/menu prices/);
});
test('absent or negative evidence never creates dishes',()=>{
 const t={name:'Example Cafe',categories:'Dining',description:'We do not serve pizza.',url:'https://galleria.co.ke/stores/example/',status:'listed'};
 assert.doesNotMatch(offeringAnswer(t,'menu','menu').answer,/mentions.*pizza/);
 assert.doesNotMatch(offeringAnswer({...t,description:''},'menu','menu').answer,/bread|pastries|burgers/);
});
test('explicit topic switches and facility enquiries leave menu handling',()=>{
 const state=turn('Artcaffe menu').state;
 assert.equal(turn('parking',state).result.topic,'parking-rates');
 assert.equal(turn('What is their phone number?',state).result.tenant,'Artcaffe');
 assert.match(turn('Do they have wifi?',state).result.answer,/could not verify/);
});
test('menu summaries work through the API with an AI key without generation',async()=>{
 const r=await handle(new Request('https://test.local/api/chat',{method:'POST',body:JSON.stringify({message:'Artcaffe menu'})}),{AI_PROVIDER:'groq',GROQ_API_KEY:'unused'});const data=await r.json();assert.equal(data.aiStatus,'not-needed');assert.match(data.answer,/listing.*mentions.*bread/);
});
