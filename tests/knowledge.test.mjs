import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {directoryAnswer,findTenants} from '../lib/directory.mjs';
import {chat} from '../lib/chat.mjs';
const tenants=JSON.parse(fs.readFileSync(new URL('./fixtures/tenants-baseline.json',import.meta.url)));
const cases=[
 ['How are the parking rates','parking-rates',/30 minutes\s*[–-]\s*2 hours: Ksh 50/i],
 ['How do I pay for parking with M-Pesa?','parking-payment',/QR code/],
 ['Where can I park my car?','parking-location',/shaded parking silo/],
 ['How many parking bays are there?','parking-capacity',/889/],
 ['What are the parking opening hours?','parking-hours',/do not have verified parking entry/],
 ['Where can I buy a gift voucher?','gift-vouchers',/first floor opposite Standard Chartered Bank/],
 ['What are the management office hours?','gift-vouchers',/Saturday 8:30 am – 1pm/],
 ['Can I bring my dog?','pets',/leash/],
 ['Can I take photographs inside?','photography',/permission/],
 ['What can toddlers do at the mall?','kids-activities',/food zone/],
 ['How do I get there by matatu from Rongai?','directions',/125\/126/],
 ['What time does Galleria mall close?','mall-hours',/8:00 am.*10:00 pm/],
 ['Where is Art Caffe and what time does it close?','tenant',/midnight[\s\S]*Ground Floor, First Floor/],
 ['What time does Java House close on Sunday?','tenant',/Sunday: 7:00 am - 9:00 pm/],
 ['What time does Java House close on Saturday?','tenant',/Fri - Sat: 7:00 am - 10:00 pm/],
 ['Is Cinemax open?','tenant',/Opening Soon/],
 ["Where is CJ's?",'tenant',/Opening Soon/],
 ['Is there a cinema?','category',/Cinemax.*Opening Soon/],
 ['Where is the baby changing room?','unverified',/could not verify/],
 ['Where can I buy groceries?','category',/Carrefour/],
 ['Are there banks?','category',/Bank Of Africa/],
 ['Is there a pharmacy?','category',/Pharmart/],
 ['Which restaurants are on the first floor?','category',/Artcaffe/],
 ['How much is coffee at Artcaffe?','tenant',/don’t have confirmed prices/],
 ['What is the email for Artcaffe?','tenant',/customercare@artcaffe.co.ke/],
 ['Where is Text Book Center?','tenant',/on Ground Floor/],
 ['How many stores does Galleria have?','store-count',/106.*24/],
 ['What is the A4 poster advertising price?','noticeboard-rates',/A4: Ksh 300/],
 ['How much does Atrium A activation cost?','activation-rates',/Atrium A.*46,400/],
 ['Who do I contact for advertising?','advertising',/marketing@galleria.co.ke/],
 ['How can I lease a shop?','leasing',/current space availability/],
 ['Hello','help',/parking fees/],
 ['Is there an ImaginaryDragonXYZ outlet?','missing-business',/don’t see ImaginaryDragonXYZ/]
];
for(const [q,topic,expected] of cases)test(q,()=>{const r=directoryAnswer(q,tenants);assert.equal(r.topic,topic);assert.match(r.answer,expected);for(const s of r.sources)assert.equal(new URL(s.original).hostname,'galleria.co.ke');});
test('groceries do not recommend a furniture supplier',()=>assert.doesNotMatch(directoryAnswer('Where can I buy groceries?',tenants).answer,/Ashut/));
test('bar search does not turn The Nut Bar into a cocktail bar',()=>assert.doesNotMatch(directoryAnswer('Which bars are there?',tenants).answer,/Nut Bar/));
test('listed banks exclude opening-soon banks',()=>assert.doesNotMatch(directoryAnswer('Are there banks?',tenants).answer,/KCB/));
test('first-floor filter applies to every recommendation',()=>{const r=directoryAnswer('Which restaurants are on the first floor?',tenants);for(const t of r.context)assert.match(t.floor,/First Floor/);});
test('unknown room does not match Tap Room',()=>assert.deepEqual(findTenants('Where is the baby changing room?',tenants),[]));
test('book in Text Book Center is not a booking request',()=>assert.doesNotMatch(directoryAnswer('Where is Text Book Center?',tenants).answer,/booking|prices/));
test('follow-up contact stays with the previous store',()=>{const r=directoryAnswer('What is their phone number?',tenants,'Artcaffe','tenant');assert.equal(r.tenant,'Artcaffe');assert.match(r.answer,/0727625842/);});
test('parking follow-up does not inherit a previous store or mall hours',()=>{const r=directoryAnswer('What time does it close?',tenants,'','parking-rates');assert.equal(r.topic,'parking-hours');assert.doesNotMatch(r.answer,/Nut Bar|10:00 pm/);});
test('holiday hours do not invent a holiday schedule',()=>assert.match(directoryAnswer('What are the public holiday hours for Artcaffe?',tenants).answer,/not published/));
test('API returns topic and per-answer verification date',async()=>{const r=await chat(new Request('https://prototype.test/api/chat',{method:'POST',body:JSON.stringify({message:'How are the parking rates',tenant:'The Nut Bar'})}),{},tenants);const d=await r.json();assert.equal(d.mode,'directory');assert.equal(d.topic,'parking-rates');assert.equal(d.tenant,null);assert(d.asOf);assert.doesNotMatch(d.answer,/Nut Bar/);});
test('parking tariffs keep exact wording and qualifications without an AI rewrite',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Tariffs must not be rewritten');};
 try{
  const response=await chat(new Request('https://prototype.test/api/chat',{method:'POST',body:JSON.stringify({message:'How are the parking rates',tenant:'The Nut Bar'})}),{GROQ_API_KEY:'test-key-not-real'},tenants);
  const r=await response.json();assert.equal(calls,0);assert.equal(r.mode,'directory');assert.equal(r.aiStatus,'not-needed');assert.match(r.answer,/unusual/);assert.match(r.answer,/0 – 15minutes: Ksh 50/);assert.match(r.answer,/15 – 30 minutes: Free/);assert.match(r.answer,/Park-N-Go/);assert.doesNotMatch(r.answer,/Nut Bar/);assert.equal(r.sources[0].original,'https://galleria.co.ke/parking/');
 }finally{globalThis.fetch=original;}
});
