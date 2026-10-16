import fs from 'node:fs';
import {handle} from '../api/index.mjs';
import tenants from '../data/tenants.json' with {type:'json'};
const scenarios=JSON.parse(fs.readFileSync(new URL('../tests/questions.json',import.meta.url)));
if(scenarios.length<40)throw Error('At least 40 evaluation scenarios are required');
const endpoint=process.env.CHATBOT_EVAL_URL;
let failures=0;
for(const scenario of scenarios){
 let history=[],state,failed='';
 for(const t of scenario.turns){
  const body={message:t.message,history,state};
  const request=new Request(endpoint||'https://evaluation.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const response=endpoint?await fetch(request):await handle(request,{});
  if(!response.ok){failed='HTTP '+response.status;break;}
  const r=await response.json();
  if(t.topic&&r.topic!==t.topic)failed=`topic ${r.topic}, expected ${t.topic}`;
  if(t.tenant&&r.tenant!==t.tenant)failed=`tenant ${r.tenant}, expected ${t.tenant}`;
  if(t.statusOf){const listing=tenants.find(s=>s.name===t.statusOf);if(listing?.status==='opening-soon'&&!/Opening Soon/i.test(r.answer))failed='coming-soon status omitted';}
  for(const text of t.contains||[])if(!r.answer.toLowerCase().includes(text.toLowerCase()))failed='missing expected evidence: '+text;
  for(const text of t.forbidden||[])if(r.answer.toLowerCase().includes(text.toLowerCase()))failed='unsupported claim: '+text;
  if(!r.sources.every(s=>/^https:\/\/(?:www\.)?galleria\.co\.ke\//.test(s.original)))failed='non-official citation';
  state=r.state;history=[...history,{role:'user',content:t.message},{role:'assistant',content:r.answer}].slice(-8);
  if(failed)break;
 }
 if(failed)failures++;
 console.log(`${failed?'FAIL':'PASS'} ${scenario.id}${failed?': '+failed:''}`);
}
console.log(`${scenarios.length-failures}/${scenarios.length} scenarios passed. ${endpoint?'Live endpoint was used.':'No AI credits used; deterministic and outage behavior checked.'}`);
if(failures)process.exitCode=1;
