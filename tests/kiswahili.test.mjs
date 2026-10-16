import test from 'node:test';
import assert from 'node:assert/strict';
import {dialogueTurn} from '../lib/dialogue.mjs';
import {interpretLanguage} from '../lib/language.mjs';
import tenants from '../data/tenants.json' with {type:'json'};
import translations from '../data/kiswahili.json' with {type:'json'};
const now=new Date('2026-10-16T15:00:00Z');
test('mixed-language dining sequence preserves the store, pending offer and Kiswahili',()=>{
 let state;for(const [q,topic,part] of [['Habari','help','Habari'],['Nataka chakula','dining-preference','Ungependa'],['burgers','category','RocoMamas'],['ndiyo','tenant','Saa za kazi'],['Na Jumapili?','tenant','Jumapili'],['Maegesho ni shilingi ngapi?','parking-rates','Park-N-Go'],['Nawezaje kulipia maegesho?','parking-payment','QR']]){const t=dialogueTurn(q,tenants,state,now);state=t.state;assert.equal(t.result.topic,topic,q);assert.equal(state.language,'sw');assert(t.result.fixedAnswer);assert(t.result.answer.includes(part),q);}
});
test('explicit language changes retain a pending store offer',()=>{
 let t=dialogueTurn('Artcaffe iko wapi?',tenants);assert.match(t.result.answer,/ghorofa/);assert.doesNotMatch(t.result.answer,/6:30/);t=dialogueTurn('In English please',tenants,t.state);assert.equal(t.state.language,'en');t=dialogueTurn('yes',tenants,t.state);assert.match(t.result.answer,/published hours/);assert.equal(t.result.tenant,'Artcaffe');
 t=dialogueTurn('Jibu kwa Kiswahili',tenants,t.state);assert.equal(t.state.language,'sw');t=dialogueTurn('On Sunday?',tenants,t.state);assert.match(t.result.answer,/Saa za kazi/);
});
test('ordinal choices and no thanks never select a random shop',()=>{
 let t=dialogueTurn('Naweza kununua simu wapi?',tenants);assert(t.state.options.length>1);const second=t.state.options[1];t=dialogueTurn('La pili',tenants,t.state);assert.equal(t.result.tenant,second);assert.match(t.result.answer,/iko kwenye/);t=dialogueTurn('hapana asante',tenants,t.state);assert.equal(t.state.pending,null);assert.equal(t.state.tenant,second);assert.match(t.result.answer,/Sawa/);
});
test('event dates and amounts are never translated into invented facts',()=>{
 const t=dialogueTurn('Kuna matukio gani wikendi hii?',tenants,undefined,now);assert.equal(t.result.topic,'events');assert.match(t.result.answer,/haujathibitishwa/);assert.doesNotMatch(t.result.answer,/18 Oct 2026/);
 const rates=dialogueTurn('Maegesho ni pesa ngapi?',tenants);assert.match(rates.result.answer,/havifuati mpangilio wa kawaida/);assert.match(rates.result.answer,/Ksh 1000/);
});
test('curated translations preserve contacts, URLs and numeric tariff values',()=>{
 const numbers=s=>(s.match(/\d[\d,.]*/g)||[]).map(n=>n.replace(/[,\.]$/,'')).sort();
 for(const id of ['parking-rates','noticeboard-rates','activation-rates'])assert.deepEqual(numbers(translations[id].translation),numbers(translations[id].source),id);
 for(const {source,translation} of Object.values(translations))for(const email of source.match(/[\w.+-]+@[\w.-]+/g)||[])assert(translation.includes(email));
});
test('lost phone and unsupported services are qualified in Kiswahili',()=>{
 const lost=dialogueTurn('Nimepoteza simu yangu',tenants);assert.equal(lost.result.topic,'human');assert.match(lost.result.answer,/Pole/);assert.match(lost.result.answer,/halikuunganishi/);
 const service=dialogueTurn('Safaricom wanatoa huduma gani?',tenants);assert.equal(service.result.tenant,'Safaricom');assert.match(service.result.answer,/Haujathibitisha/);assert.match(service.result.answer,/SIM/);
});
test('Swahili quick actions resolve deterministically',()=>{
 for(const [q,topic] of [['Mikahawa','dining-preference'],['Mko wapi?','directions'],['Saa za kazi','mall-hours'],['Ongea na mhudumu','human'],['Maduka gani yatafunguliwa hivi karibuni?','coming-soon'],['Mna vocha za zawadi?','gift-vouchers']]){const t=dialogueTurn(q,tenants);assert.equal(t.state.language,'sw',q);assert.equal(t.result.topic,topic,q);}
 assert.equal(interpretLanguage('jibu kwa Kiingereza').language,'en');
});
