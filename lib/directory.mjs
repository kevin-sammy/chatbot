import {serviceInfo} from './services.mjs';
import {missingBusiness} from './missing-business.mjs';
import {activityAnswer} from './activities.mjs';
import {lookupAnswer,faqIntent,genericIntent,categoryQuery,verifiedAt} from './knowledge.mjs';
export const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,'').replace(/art\s*caf+e?/g,'artcaffe').replace(/[^a-z0-9]+/g,' ').trim();
const commonWords = new Set('a an the and or of for at in on to is are was were it its this that do does can how what where when which who my your me please tell about shop store restaurant mall galleria hours hour open close closing opening floor location contact phone room house center centre co company ltd limited bar coffee cafe bank pharmacy health world'.split(' '));
const tokens = name => [...new Set(normalize(name).split(' ').filter(w=>w.length>2&&!commonWords.has(w)))];
const namesOf=t=>[t.name,...(t.aliases||[])];
export function findTenants(question, tenants) {
 const q=' '+normalize(question)+' ',words=new Set(normalize(question).split(' ')),frequency=new Map();
 for(const t of tenants)for(const w of tokens(t.name))frequency.set(w,(frequency.get(w)||0)+1);
 return tenants.map(t=>{
  const significant=tokens(t.name),hits=significant.filter(w=>words.has(w));
  const exact=namesOf(t).some(n=>{const name=normalize(n);return q.includes(' '+name+' ')&&name.split(' ').some(w=>!commonWords.has(w));});
  const complete=significant.length>0&&hits.length===significant.length;
  const distinctive=hits.some(w=>frequency.get(w)===1);
  return {t,score:exact?100:complete?80:distinctive?50+hits.length:0};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.t);
}
const source=t=>({title:t.name,url:t.local,original:t.url});
const dayNumber=s=>({mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6})[s.toLowerCase().slice(0,3)];
export function hoursFor(t,q){
 const schedule=t.schedule||[];
 if(!schedule.length)return t.hours?.replace(/12:00 am/gi,'midnight')||'Hours are not published in this store’s listing.';
 let day=null;
 const requested=q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/);
 if(requested)day=dayNumber(requested[1]);
 if(/\b(today|tomorrow)\b/.test(q)){
  const now=new Date();if(/tomorrow/.test(q))now.setTime(now.getTime()+86400000);
  day=dayNumber(new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'Africa/Nairobi'}).format(now));
 }
 let chosen=schedule;
 if(/holiday/.test(q))chosen=schedule.filter(r=>/holiday/i.test(r.days));
 else if(day!==null)chosen=schedule.filter(r=>{
  if(/holiday/i.test(r.days)&&!/[msftw]/i.test(r.days.split('Holiday')[0]))return false;
  const days=[...r.days.matchAll(/mon|tue|wed|thu|fri|sat|sun/gi)].map(m=>dayNumber(m[0]));
  if(/[-–]/.test(r.days)&&days.length===2)return days[0]<=days[1]?day>=days[0]&&day<=days[1]:day>=days[0]||day<=days[1];
  return days.includes(day);
 });
 return chosen.length?chosen.map(r=>r.days+': '+r.hours.replace(/12:00 am/gi,'midnight')).join('; '):'A schedule for that day is not published. Please confirm directly with the store.';
}
function tenantAnswer(t,q){
 const details=namesOf(t).reduce((value,name)=>value.replace(normalize(name),' '),q);
 const askHours=/hour|open|clos|sunday|saturday|today|tomorrow|holiday/.test(details),askFloor=/where|floor|locat|find|get to/.test(details),askContact=/contact|phone|telephone|number|email/.test(details);
 const askServices=/service|what.*\b(?:get|do|offer|provide|sell)\b|help.*(?:sim|m pesa|mpesa|line)|\bsim\b|m pesa|mpesa/.test(details);
 const presence=/is there|do you have|does galleria have|have you got/.test(q);
 let answer='',extraSources=[],scope;
 if(t.status==='opening-soon')answer=t.name+' is marked “Opening Soon” on Galleria’s website. '+(t.floor?'Its listed location is '+t.floor+'. ':'')+'The opening date and operating hours are not confirmed here; check with Galleria on 0704 498463.';
 else if(/\b(price|prices|cost|fee|fees|ticket|tickets|book|booking|reserve|reservation|vegan|halal|allergy|allergies|discount|discounts|offers|deals|stock|available|availability)\b|how much/.test(details))answer='I don’t have confirmed prices, availability or booking details for that request. '+(t.phone?'Please call '+t.name+' on '+t.phone+' to check.':'Please confirm directly with '+t.name+'.');
 else if(askServices){const info=serviceInfo(t);answer=info.answer;extraSources=info.providerSources;scope=info.scope;}
 else if(/email/.test(details))answer=t.email?'You can email '+t.name+' at '+t.email+'.':'An email address is not published for '+t.name+'. '+(t.phone?'You can call '+t.phone+'.':'');
 else if(askContact)answer=t.phone?'You can call '+t.name+' on '+t.phone+'.'+(t.email?' Email: '+t.email+'.':''):'A shop phone number is not published in this listing.';
 else if(askHours){answer=t.name+'’s published hours: '+hoursFor(t,q)+'.';if(askFloor&&t.floor)answer+=' You’ll find it on '+t.floor+'.';answer+=' These are published hours, not a live opening-status check.';}
 else if(askFloor)answer='You’ll find '+t.name+' on '+(t.floor||'a floor not specified in the listing')+'. Would you like its hours or contact details?';
 else if(presence)answer='Yes—'+t.name+' is listed at Galleria'+(t.floor?', on '+t.floor:'')+'. Would you like to know its hours or the services listed for it?';
 else{answer=t.name+' is listed at Galleria'+(t.floor?', on '+t.floor:'')+'. ';const info=serviceInfo(t);answer+=info.answer;extraSources=info.providerSources;scope=info.scope;}
 if(t.refreshStatus)answer+=' The live refresh failed for this record, so these details come from the earlier capture.';
 return {answer:answer.trim(),sources:[source(t),...extraSources],tenant:t.name,context:[t],topic:'tenant',verifiedAt:t.verifiedAt,scope};
}
export function directoryAnswer(question,tenants,lastTenant='',lastTopic=''){
 const q=normalize(question);
 if(/^(thanks|thank you|thank you so much|thanks a lot|cheers)( very much)?$/.test(q))return {answer:'You’re welcome! Enjoy your visit. Is there anything else I can help you with?',sources:[],context:[],tenant:lastTenant||null,topic:lastTopic||'help',fixedAnswer:true};
 if(/^(hi|hello|hey|good morning|good afternoon|good evening)( there)?$/.test(q))return {answer:'Hello! How can I help you plan your visit? You can ask about stores, parking fees, dining or activities.',sources:[],context:[],topic:'help',fixedAnswer:true};
 const activity=activityAnswer(q,tenants,lastTopic);if(activity)return activity;
 const matches=findTenants(question,tenants);
 const priority=faqIntent(q,lastTopic);
 if(priority&&!(matches.length&&['deals','events','kids-activities'].includes(priority))){const r=lookupAnswer(priority);if(r)return r;}
 if(matches.length){
  const exact=matches.filter(t=>namesOf(t).some(n=>(' '+q+' ').includes(' '+normalize(n)+' ')));
  if(exact.length===1)return tenantAnswer(exact[0],q);
  if(exact.length>1)return {answer:exact.slice(0,3).map(t=>tenantAnswer(t,q).answer).join('\n\n'),sources:exact.slice(0,3).map(source),context:exact.slice(0,3),topic:'tenants'};
 }
 if(/wheelchair|accessib|disabled|baby chang|breastfeed|toilet|washroom|wi fi|wifi|prayer|lost property|lost.*wallet/.test(q))return {answer:'I could not verify that specific visitor-facility detail from the official pages checked. Please contact Galleria on 0704 498463 or info@galleria.co.ke for confirmation.',sources:[{title:'Galleria contact',url:'/mirror/contact-us/index.html',original:'https://galleria.co.ke/contact-us/'}],context:[],topic:'unverified'};
 const group=categoryQuery(q,tenants);
 if(group){
  const [label,,pattern]=group;
  let found=tenants.filter(t=>pattern.test(t.categories)||(['pizza','chicken'].includes(label)&&pattern.test(t.name+' '+(t.description||'')))||(label==='bars'&&/cocktail|\bbar(?:,| and restaurant)/i.test(t.description||'')));
  const floor=q.match(/\b(ground|first|second|outdoor)\b/);
  if(floor)found=found.filter(t=>(t.floor||'').toLowerCase().includes(floor[1]));
  if(/new wing/.test(q))found=found.filter(t=>/new wing/i.test(t.floor||''));
  if(label==='fashion'){
   // Lead broad clothing queries with clothing outlets rather than accessories.
   const clothing=['LC Waikiki','Mr Price','Woolworths','Armario Collections'];
   found.sort((a,b)=>(clothing.includes(a.name)?clothing.indexOf(a.name):100)-(clothing.includes(b.name)?clothing.indexOf(b.name):100));
  }
  const listed=found.filter(t=>t.status!=='opening-soon');
  let choices=(listed.length?listed:found).slice(0,4);
  if(label==='shopping'){
   const available=listed.length?listed:found;
   const preferred=['Carrefour','LC Waikiki','Bata','Hotpoint','Text Book Center','Ashut'];
   choices=preferred.map(name=>available.find(t=>t.name===name)).filter(Boolean);
   if(!choices.length)choices=available.slice(0,6);
   if(choices.length)return {answer:'You can shop at these Galleria outlets:\n'+choices.map(t=>'• '+t.name+' — '+t.categories.split(',').filter(c=>c.trim()!=='Shopping').slice(0,2).map(c=>c.trim()).join(', ')+' — '+(t.floor||'floor unlisted')+(t.status==='opening-soon'?' (marked Opening Soon)':'')).join('\n')+'\nWhat would you like to buy—groceries, clothes, shoes, electronics, books or homeware? I can narrow down the options. Product stock and prices need confirmation with the store.',sources:choices.map(source),context:choices,topic:'shopping'};
  }
  if(choices.length)return {answer:'Here are some options for '+label+' at Galleria:\n'+choices.map(t=>'• '+t.name+' — '+(t.floor||'floor unlisted')+(t.status==='opening-soon'?' (marked Opening Soon)':'')).join('\n')+(/\batm\b/.test(q)?'\nATM-specific access and hours should be confirmed with the bank.':'')+(listed.length>choices.length?'\nI can show more options if you’d like.':'')+'\nWould you like the hours or contact details for one of these? Confirm specific products, prices and availability with the outlet.',sources:choices.map(source),context:choices,tenant:choices.length===1?choices[0].name:null,topic:'category'};
 }
 const general=genericIntent(q,lastTopic,!!lastTenant);if(general){const r=lookupAnswer(general);if(r)return r;}
 if(matches.length===1)return tenantAnswer(matches[0],q);
 if(matches.length>1)return {answer:'Which store do you mean: '+matches.map(t=>t.name).join(', ')+'?',sources:matches.map(source),context:matches,topic:'clarification'};
 const missing=missingBusiness(question,q,tenants);if(missing)return missing;
 if(lastTenant&&/hour|open|clos|floor|where|contact|email|phone|sunday|saturday|today|tomorrow|holiday|what about|get there|get to|direction|service|what.*\b(?:get|do|offer|provide|sell)\b|sim|mpesa|m pesa|price|cost|how much|book|reserv|halal|vegan|allerg|stock|available/.test(q)){
  const t=tenants.find(t=>t.name===lastTenant);if(t)return tenantAnswer(t,q);
 }
 if(/^(and )?(where is it|where are they|which floor|what floor|what time (does it|do they) (open|close)|what are (its|their) hours|how much (is it|does it cost))$/.test(q))return {answer:'Which store or activity do you mean? Tell me its name so I can check the right details for you.',sources:[],context:[],topic:'clarification',fixedAnswer:true};
 if(/\b(buy|purchase)\b/.test(q))return {answer:'I do not have verified product-stock information for that request. I can help you find shops by category—groceries, clothes, shoes, electronics, books, beauty or homeware. Which category would you like to explore?',sources:[{title:'Galleria stores',url:'/mirror/stores/index.html',original:'https://galleria.co.ke/stores/'}],context:[],topic:'shopping-clarification'};
 if(/^(hi|hello|hey|thanks|thank you|help|what can you do)$/.test(q))return {answer:'Hello! I can help with Galleria stores, floors, published opening hours, parking fees, payment, directions, kids’ activities, gift vouchers and visitor policies. What would you like to know?',sources:[],context:[],topic:'help'};
 return {answer:'Could you tell me a little more about what you need? A store name, product or activity will help me point you in the right direction. For questions the directory cannot answer, Galleria’s team is on 0704 498463.',sources:[],context:[],topic:'clarification'};
}
