import test from 'node:test';
import assert from 'node:assert/strict';
import faq from '../data/directory-faq.json' with {type:'json'};
import tenants from '../data/tenants.json' with {type:'json'};
import {dialogueTurn} from '../lib/dialogue.mjs';
import {directoryFAQAnswer,directoryFAQQuery} from '../lib/directory-faq.mjs';
const turn=(q,s)=>dialogueTurn(q,tenants,s);
for(const section of faq.sections)for(const language of ['en','sw'])test(`directory FAQ ${section.id} ${language}`,()=>{
 const t=turn(section[language==='en'?'questionEn':'questionSw']);
 assert.equal(t.result.topic,'directory-faq');assert.equal(t.state.language,language);
 assert.equal(t.state.pending,'choose-store');assert.equal(t.state.tenant,'');assert(t.result.fixedAnswer);
 assert(t.result.context.length>0&&t.result.context.length<=6);
 for(const store of t.result.context){
  assert(tenants.some(t=>t.url===store.url));assert(t.result.answer.includes(store.name));
  if(store.status==='opening-soon')assert.match(t.result.answer.split('\n').find(line=>line.includes(store.name)),language==='sw'?/inafunguliwa hivi karibuni/:/Coming soon/);
 }
 for(const source of t.result.sources)assert.match(source.original,/^https:\/\/galleria\.co\.ke\/stores\//);
 assert.doesNotMatch(t.result.answer,/in stock|authorized|authentic Apple|watch repair|account opening|teller services|size 42/i);
});
test('FAQ follows current directory status and never adds a missing store',()=>{
 const section=directoryFAQQuery(faq.sections[1].questionEn);
 const synthetic=[{name:'Miniso',url:'https://galleria.co.ke/stores/miniso/',categories:'Homeware',floor:'First Floor',status:'opening-soon'}];
 let r=directoryFAQAnswer(section,synthetic);assert.equal(r.context.length,1);assert.match(r.answer,/Coming soon/);assert.doesNotMatch(r.answer,/Panda Mart/);
 r=directoryFAQAnswer(section,[{...synthetic[0],status:'listed',floor:'Ground Floor'}]);assert.match(r.answer,/Ground Floor/);assert.doesNotMatch(r.answer,/Coming soon/);
 assert.equal(directoryFAQAnswer(section,[]),null);
});
test('FAQ choices resolve pronouns, ordinal selection, hours and topic changes',()=>{
 let t=turn(faq.sections[5].questionSw);
 t=turn('huko',t.state);assert.equal(t.result.topic,'clarification');
 t=turn('la kwanza',t.state);assert.equal(t.state.tenant,'Bata');
 t=turn('ndiyo',t.state);assert.equal(t.state.tenant,'Bata');assert.match(t.result.answer,/Saa za kazi/);
 t=turn('parking',t.state);assert.equal(t.result.topic,'parking-rates');assert.equal(t.state.tenant,'');
});
test('selecting coming-soon FAQ outlet cannot make it operational',()=>{
 let t=turn(faq.sections[1].questionEn);t=turn('Miniso',t.state);assert.equal(t.result.tenant,'Miniso');
 if(tenants.find(t=>t.name==='Miniso').status==='opening-soon')assert.match(t.result.answer,/Opening Soon/);
});
test('Wina Classic is a repair service, never an FAQ menswear recommendation',()=>{
 const t=turn(faq.sections[4].questionEn);assert(!t.result.context.some(t=>t.name==='Wina Classic'));
 const w=turn('What does Wina Classic offer?');assert.match(w.result.answer,/repair|leather/i);assert.doesNotMatch(w.result.answer,/menswear|suits|formal shirts/i);
});
const products=[
 ['Where can I buy wigs?','wigs and hair extensions','en'],['Natafuta wigi','wigs and hair extensions','sw'],
 ['Where can I buy carpets?','carpets and rugs','en'],['Natafuta mazulia','carpets and rugs','sw'],
 ['Where can I buy camping gear?','camping and hiking','en'],['Where can I send a parcel?','courier services','en'],
 ['Natafuta miwani','eyecare and opticians','sw'],['Where can I get an eye test?','eyecare and opticians','en'],
 ['Where can I buy vitamins?','health and wellness','en'],['Natafuta vitamini','health and wellness','sw'],
 ['Where can I get nyama choma?','nyama choma','en'],['Where can I get bubble tea?','bubble tea','en'],
];
for(const [q,category,language] of products)test('FAQ product discovery: '+q,()=>{
 const t=turn(q);assert.equal(t.result.topic,'category');assert.equal(t.state.language,language);assert(t.result.context.length);
 if(language==='en')assert(t.result.answer.includes(category));else assert.match(t.result.answer,/Hizi ni baadhi/);
});

test('more FAQ options preserves subject and language and can be selected',()=>{
 for(const language of ['en','sw']){
  let t=turn(faq.sections[2][language==='en'?'questionEn':'questionSw']);
  const first=t.state.options;
  t=turn(language==='sw'?'nionyeshe zaidi':'show more',t.state);
  assert.equal(t.result.topic,'directory-faq');assert.equal(t.state.language,language);
  assert.equal(t.state.faqSection,'restaurants');assert.equal(t.state.faqOffset,6);
  assert(!t.state.options.some(n=>first.includes(n)));
  const chosen=t.state.options[0];assert(chosen);
  t=turn(language==='sw'?'la kwanza':'the first one',t.state);assert.equal(t.state.tenant,chosen);
 }
});
