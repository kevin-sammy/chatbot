import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {directoryAnswer} from '../lib/directory.mjs';
import {chat} from '../lib/chat.mjs';
const tenants=JSON.parse(fs.readFileSync(new URL('../data/tenants.json',import.meta.url)));
for(const q of ['where can i do shopping','Where can I shop?','What shops are there?','Show me shopping options','What stores can I visit?','Where can I buy things?']){
 test(q,()=>{const r=directoryAnswer(q,tenants);assert.equal(r.topic,'shopping');assert.match(r.answer,/Carrefour/);assert.match(r.answer,/Hotpoint/);assert.match(r.answer,/What would you like to buy/);assert(r.context.length>=4);for(const t of r.context){assert.notEqual(t.status,'opening-soon');assert(t.floor);assert(tenants.some(known=>known.url===t.url));}assert.doesNotMatch(r.answer,/could not verify/);});
}
const cases=[
 ['I am hungry',/Artcaffe/,/Nut Bar is listed/],
 ['Where can I buy clothes?',/LC Waikiki/,/could not verify/],
 ['Where can I buy electronics?',/Hotpoint/,/Juwam/],
 ['Where can I buy a phone?',/Samsung/,/Juwam/],
 ['Where can I get my shoes repaired?',/Wina Classic/,/Bata/],
 ['Where can I get my shoes cleaned?',/Digital Shoe Shine/,/Bata/],
 ['Where can I get a haircut?',/Extreme Styling Studio/,/Silken human Hair/],
 ['Where can I buy furniture?',/Ashut/,/Wina Classic/],
 ['Where can I buy perfume?',/Essenza/,/could not verify/],
 ['Where can I buy toys?',/Fun Factory/,/could not verify/],
 ['Where can I do laundry?',/Micos Drycleaners/,/could not verify/],
 ['Where can I buy books?',/Text Book Center/,/could not verify/]
];
for(const [q,expected,forbidden] of cases)test(q,()=>{const r=directoryAnswer(q,tenants);assert.equal(r.topic,'category');assert.match(r.answer,expected);assert.doesNotMatch(r.answer,forbidden);});
test('shopping question switches away from the previous restaurant',()=>{const r=directoryAnswer('where can i do shopping',tenants,'Artcaffe','tenant');assert.equal(r.topic,'shopping');assert(!r.tenant);});
test('shopping can narrow to a requested floor',()=>{const r=directoryAnswer('Where can I do shopping on the first floor?',tenants);assert.equal(r.topic,'shopping');for(const t of r.context)assert.match(t.floor,/First Floor/);});
test('unknown product receives a clarification without invented stock',()=>{const r=directoryAnswer('Where can I buy a photon torpedo?',tenants);assert.equal(r.topic,'shopping-clarification');assert.match(r.answer,/do not have verified product-stock/);assert(!r.tenant);});
test('phone contact request remains mall contact, not phone shopping',()=>assert.equal(directoryAnswer('What is the mall phone number?',tenants).topic,'mall-contact'));
test('directory category fallback handles honey without a hardcoded answer',()=>{const r=directoryAnswer('Where can I buy honey?',tenants);assert.equal(r.topic,'category');for(const t of r.context)assert.match(t.categories,/Honey/i);});
test('API returns shopping overview for the reported wording',async()=>{const r=await chat(new Request('https://prototype.test/api/chat',{method:'POST',body:JSON.stringify({message:'where can i do shopping'})}),{},tenants);const d=await r.json();assert.equal(r.status,200);assert.equal(d.mode,'directory');assert.equal(d.topic,'shopping');assert.match(d.answer,/Carrefour/);assert(d.sources.length>=4);});
