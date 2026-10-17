import test from 'node:test';
import assert from 'node:assert/strict';
import tenants from '../data/tenants.json' with {type:'json'};
import {dialogueTurn} from '../lib/dialogue.mjs';
// Customer question bank: expectations describe behavior, never guessed factual values.
const cases=[
 ['en','Good morning','help'],['en','Hello there','help'],
 ['en','What time are you open until?','mall-hours'],['en','When do you shut?','mall-hours'],['en','What are your business hours?','mall-hours'],['en','Are you open today?','mall-hours'],
 ['en','How do I reach you?','directions'],['en','Send me your location','directions'],['en','Can I have your address?','directions'],
 ['en','Where can I leave my car?','parking-location'],['en','Where do I park my car?','parking-location'],['en','Is parking free?','parking-rates'],['en','How much to park?','parking-rates'],['en','What do you charge for parking?','parking-rates'],['en','Can I pay parking by mpesa?','parking-payment'],
 ['en','I need to speak to someone','human'],['en','Can I speak to a real person?','human'],
 ['en','Where can I buy shoes?','category'],['en','Where can I get a haircut?','category'],['en','Is there a supermarket?','category'],['en','Where can I withdraw cash?','category'],['en','Is there a pharmacy?','category'],
 ['en','Can I bring my dog?','pets'],['en','Can I take photos?','photography'],['en','Where are the washrooms?','unverified'],['en','Is there wifi?','unverified'],['en','Do you sell gift vouchers?','gift-vouchers'],
 ['en','How can I rent a shop?','leasing'],['en','I lost my phone','human'],['en','Is there a McDonalds?','missing-business'],['en','Where can I do shopping?','shopping'],
 ['sw','Habari za asubuhi','help'],['sw','Habari za mchana','help'],['sw','Hujambo','help'],
 ['sw','Mko wazi leo?','mall-hours'],['sw','Mko open leo?','mall-hours'],['sw','Mmefungua?','mall-hours'],
 ['sw','Nafikaje Galleria?','directions'],['sw','Nifikeje hapo?','directions'],['sw','Nitumie location','directions'],['sw','Anwani yenu ni gani?','directions'],
 ['sw','Ramani ya mall','mall-map'],['sw','Naegesha wapi?','parking-location'],['sw','Niache gari wapi?','parking-location'],
 ['sw','Parking ni pesa ngapi?','parking-rates'],['sw','Maegesho ni bure?','parking-rates'],['sw','Ada ya maegesho','parking-rates'],
 ['sw','Nalipiaje maegesho?','parking-payment'],['sw','Naweza kulipa parking na mpesa?','parking-payment'],['sw','Nimepoteza tiketi ya parking','parking-rates'],
 ['sw','Kuna sehemu ya watoto kucheza?','kids-activities'],['sw','Watoto wanaweza kucheza wapi?','kids-activities'],
 ['sw','Namba yenu ya simu','mall-contact'],['sw','Barua pepe yenu','mall-contact'],['sw','Naomba mhudumu','human'],['sw','Nina malalamiko','human'],
 ['sw','Naweza kuja na mbwa?','pets'],['sw','Naweza kupiga picha?','photography'],
 ['sw','Kuna wifi?','unverified'],['sw','Choo kiko wapi?','unverified'],['sw','Kuna njia ya kiti cha magurudumu?','unverified'],
 ['sw','Nataka kukodisha duka','leasing'],['sw','Nataka kutangaza biashara','advertising'],['sw','Mna vocha za zawadi?','gift-vouchers'],
 ['sw','Niko na njaa','dining-preference'],['sw','Tunaweza kula wapi?','dining-preference'],
 ['sw','Natafuta kinyozi','category'],['sw','Natafuta saluni','category'],['sw','Natafuta viatu','category'],['sw','Natafuta manukato','category'],['sw','Kuna duka la vyakula?','category'],['sw','Naweza kutoa pesa wapi?','category'],
 ['sw','Mna Zara?','missing-business'],['sw','Nifanye shopping wapi?','shopping'],
];
for(const [language,question,topic] of cases)test('customer: '+question,()=>{
 const t=dialogueTurn(question,tenants);assert.equal(t.state.language,language);assert.equal(t.result.topic,topic);assert(t.result.answer.trim());
 for(const s of t.result.sources||[])assert.match(s.original||s.url,/^https:\/\/(?:www\.)?galleria\.co\.ke\//);
 if(topic==='unverified')assert.match(t.result.answer,language==='sw'?/Sina maelezo yaliyothibitishwa/:/could not verify/);
 if(topic==='missing-business')assert.match(t.result.answer,language==='sw'?/Sioni Zara/i:/don’t see/i);
});
test('bilingual customer sequence changes topic then keeps the selected store',()=>{
 let t=dialogueTurn('Natafuta viatu',tenants);const selected=t.state.options[0];assert(selected);
 t=dialogueTurn('la kwanza',tenants,t.state);assert.equal(t.state.tenant,selected);assert.equal(t.state.language,'sw');
 t=dialogueTurn('namba ya simu',tenants,t.state);assert.equal(t.result.tenant,selected);assert.equal(t.state.language,'sw');
 t=dialogueTurn('nafikaje Galleria',tenants,t.state);assert.equal(t.result.topic,'directions');assert.equal(t.state.tenant,'');
 t=dialogueTurn('in English please',tenants,t.state);assert.equal(t.state.language,'en');
});
test('Swahili unlisted food brands offer only listed alternatives',()=>{
 const t=dialogueTurn('Kuna McDonalds?',tenants);assert.equal(t.state.language,'sw');assert.equal(t.result.topic,'missing-business');assert.match(t.result.answer,/Sioni/);
 for(const option of t.result.context)assert.notEqual(option.status,'opening-soon');
});
test('courtesy wording and named shop hours preserve actual store facts',()=>{
 const shop=tenants.find(t=>t.name==='Safaricom');
 const t=dialogueTurn('Tafadhali Safaricom iko wapi?',tenants);assert.equal(t.result.tenant,shop.name);assert.equal(t.state.language,'sw');
 const h=dialogueTurn('inafungwa saa ngapi jumapili',tenants,t.state);assert.equal(h.result.tenant,shop.name);assert.match(h.result.answer,/Jumapili/);
});
