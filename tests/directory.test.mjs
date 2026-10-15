import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {directoryAnswer,findTenants} from '../lib/directory.mjs';
import {chat} from '../lib/chat.mjs';
const tenants=JSON.parse(fs.readFileSync(new URL('../data/tenants.json',import.meta.url)));
test('reported parking question returns fees, never The Nut Bar',()=>{
 const r=directoryAnswer('How are the parking rates',tenants);
 assert.match(r.answer,/parking fee/i);assert.match(r.answer,/30 minutes\s*[–-]\s*2 hours: Ksh 50/i);assert.match(r.answer,/0790 856193/);assert.doesNotMatch(r.answer,/Nut Bar/);assert.equal(r.sources[0].original,'https://galleria.co.ke/parking/');
});
test('parking intent overrides previous store and opening-hours wording',()=>{
 for(const q of ['What are the parking charges?','How much is car parking for 2 hours?','Where is the parking?','What are the parking rates and hours?']){
  const r=directoryAnswer(q,tenants,'The Nut Bar');assert.equal(r.sources[0].original,'https://galleria.co.ke/parking/');assert(!r.tenant);
 }
});
test('common words cannot select a store',()=>{
 for(const q of ['How are the parking rates','What are the rates?','Where is the shop?','Tell me about the mall','the','are'])assert.deepEqual(findTenants(q,tenants),[],q);
});
test('store matching respects word boundaries',()=>assert.deepEqual(findTenants('Where is standardized testing?',[{name:'Standard',floor:'First Floor'}]),[]));
test('real tenant names and aliases still resolve',()=>{
 for(const q of ['The Nut Bar','Where is Nut Bar?'])assert.equal(findTenants(q,tenants)[0]?.name,'The Nut Bar');
 for(const q of ['Where is Art Caffe?','Artcaffé','artcafe'])assert.equal(findTenants(q,tenants)[0]?.name,'Artcaffe');
 assert.equal(directoryAnswer('What time does it close?',tenants,'Artcaffe').tenant,'Artcaffe');
});
test('API returns parking rates in directory mode with a parking source',async()=>{
 const r=await chat(new Request('https://prototype.test/api/chat',{method:'POST',body:JSON.stringify({message:'How are the parking rates',tenant:'The Nut Bar'})}),{},tenants);
 const d=await r.json();assert.equal(r.status,200);assert.equal(d.mode,'directory');assert.equal(d.tenant,null);assert.match(d.answer,/parking fee/i);assert.doesNotMatch(d.answer,/Nut Bar/);assert.equal(d.sources[0].title,'Published parking fees');
});
