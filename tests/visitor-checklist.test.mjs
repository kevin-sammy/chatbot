import test from 'node:test';
import assert from 'node:assert/strict';
import tenants from '../data/tenants.json' with {type:'json'};
import {dialogueTurn} from '../lib/dialogue.mjs';
import {contentAnswer,relevantDeals} from '../lib/content.mjs';
const now=new Date('2026-10-16T15:00:00Z');
const deal={id:'cake',title:'Coffee and cake offer',description:'Coffee cake',url:'https://galleria.co.ke/deals/cake/',startDate:'2026-10-01',endDate:'2026-10-31'};
test('coffee offers exclude expired, future, cancelled, conflicting and undated deals',()=>{
 const variants=[deal,{...deal,endDate:'2026-10-15'},{...deal,startDate:'2026-11-01',endDate:'2026-11-30'},{...deal,status:'cancelled'},{...deal,conflict:true},{...deal,startDate:null,endDate:null}];
 assert.deepEqual(relevantDeals('coffee cake',now,{deals:variants}),[deal]);
});
test('weekend lookup finds a Sunday day/month but never invents its year',()=>{
 const event={id:'karaoke',title:'Bella Harriet Live Karaoke',dateLabel:'18 Oct',url:'https://galleria.co.ke/events/karaoke/',startTime:'14:00',venue:'Piazza'};
 const r=contentAnswer('What is on this weekend?','',now,{events:[event]});assert.match(r.answer,/Bella Harriet/);assert.match(r.answer,/year not verified/);assert.doesNotMatch(r.answer,/18 Oct 2026/);
 const kids=contentAnswer('Anything for kids this weekend?','',now,{events:[event]});assert.doesNotMatch(kids.answer,/Bella Harriet/);assert(kids.sources.some(s=>s.original==='https://galleria.co.ke/kids/'));
});
test('coming-soon choices contain only current pending listings and preserve their status after selection',()=>{
 const list=dialogueTurn('What’s opening soon?',tenants,undefined,now);assert.equal(list.state.topic,'coming-soon');assert(list.state.options.length);
 for(const name of list.state.options)assert.equal(tenants.find(t=>t.name===name).status,'opening-soon');
 const selected=dialogueTurn('the first one',tenants,list.state,now);assert.match(selected.result.answer,/Opening Soon/);assert.match(selected.result.answer,/not confirmed/);
});
test('Kiswahili hours remain Kiswahili through the API without relying on a model',async()=>{
 const {handle}=await import('../api/index.mjs');const r=await handle(new Request('https://test.local/api/chat',{method:'POST',body:JSON.stringify({message:'Mnafungua saa ngapi?'})}),{});const d=await r.json();assert.match(d.answer,/Saa za kazi/);assert.match(d.answer,/maduka/);assert.equal(d.aiStatus,'not-needed');assert.equal(d.state.language,'sw');
});
test('unlisted Zara is a qualified absence and election predictions are out of scope',()=>{
 const r=dialogueTurn('Is Zara here?',tenants);assert.match(r.result.answer,/don’t see Zara/i);assert.equal(dialogueTurn('Who will win the election?',tenants).result.topic,'off-topic');
});

test('plural Kiswahili mall-hours question clears a previous café focus',()=>{
 let t=dialogueTurn('Where is Artcaffe?',tenants);t=dialogueTurn('Mnafungua saa ngapi?',tenants,t.state);assert.equal(t.result.topic,'mall-hours');assert.match(t.result.answer,/Saa za kazi/);assert.match(t.result.answer,/8:00 am/);assert.equal(t.state.tenant,'');
});
