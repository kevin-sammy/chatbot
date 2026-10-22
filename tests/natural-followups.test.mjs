import test from 'node:test';
import assert from 'node:assert/strict';
import tenants from '../data/tenants.json' with {type:'json'};
import {dialogueTurn} from '../lib/dialogue.mjs';
const turn=(q,s)=>dialogueTurn(q,tenants,s);
test('budget follow-ups preserve dining and language without claiming meal prices',()=>{
 for(const [first,budget,language] of [['food','I have KSh 500','en'],['kuna food','niko na 500','sw'],['food','under 500','en'],['chakula','bajeti 500','sw']]){
  let t=turn(first);t=turn(budget,t.state);assert.equal(t.result.topic,'dining-budget');assert.equal(t.state.language,language);assert.match(t.result.answer,language==='sw'?/sina bei za sasa/:/don’t have verified current menu prices/);assert(t.result.fixedAnswer);
  t=turn('Artcaffe',t.state);assert.equal(t.result.tenant,'Artcaffe');assert.match(t.result.answer,/men[uy]/);
 }
});
test('repeated cheaper follow-up remains a price comparison',()=>{
 let t=turn('food');for(const q of ['cheap','anything cheaper','most affordable']){t=turn(q,t.state);assert.equal(t.result.topic,'dining-price-comparison');assert.doesNotMatch(t.result.answer,/•/);}
 assert.notEqual(turn('shoes under 500',t.state).result.topic,'dining-budget');
 assert.notEqual(turn('parking under 500',t.state).result.topic,'dining-budget');
});
test('menu pronoun uses selected restaurant; explicit topics and coming-soon status win',()=>{
 let t=turn('where is Artcaffe');t=turn('what about their menu',t.state);assert.equal(t.result.tenant,'Artcaffe');assert.match(t.result.answer,/listing.*mentions.*bread/);assert(t.result.answer.includes(tenants.find(t=>t.name==='Artcaffe').phone));
 t=turn('menyu',t.state);assert.equal(t.state.language,'sw');assert.match(t.result.answer,/menyu/);
 const soon=tenants.find(t=>t.status==='opening-soon'&&/dining|restaurant|coffee/i.test(t.categories));if(soon)assert.match(turn(soon.name+' menu').result.answer,/Opening Soon/);
 assert.notEqual(turn('Safaricom menu',t.state).result.tenant,'Artcaffe');
});
test('out of range choice keeps the offered store and pending action',()=>{
 let t=turn('pizza');assert(t.state.options.length);const before=t.state;t=turn('the fourth one',before);assert.equal(t.result.topic,'clarification');assert.deepEqual(t.state,before);assert(t.result.answer.includes(before.options[0]));
 t=turn('yes',t.state);assert.match(t.result.answer,/published hours/);
});
test('undecided diner can request choices without restarting conversation',()=>{
 for(const q of ['anything','show me options','chochote']){const t=turn(q,turn('food').state);assert.equal(t.result.topic,'category');assert(t.result.context.length);}
});

test('English and Swahili expensive follow-ups stay with dining',()=>{
 for(const [first,followup,language] of [['food','too expensive','en'],['kuna food','ghali sana','sw'],['kuna food','ghali','sw'],['food','nafuu zaidi','sw']]){
  const t=turn(followup,turn(first).state);
  assert.equal(t.result.topic,'dining-price-comparison');assert.equal(t.state.language,language);
  assert.match(t.result.answer,language==='sw'?/bei za sasa/:/verified current menu prices/);
  assert.notEqual(turn('parking',t.state).result.topic,'dining-price-comparison');
 }
});
