import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../api/index.mjs';
const request=()=>new Request('https://chatbot.example/api/chat',{method:'POST',body:JSON.stringify({message:'What services can I get at Safaricom?'})});
test('Groq uses its own key, direct endpoint and vetted sources even when Gateway is configured',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
  assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(init.headers.Authorization,'Bearer mock-groq-key');
  const payload=JSON.parse(init.body);assert.equal(payload.model,'llama-3.3-70b-versatile');assert.deepEqual(payload.response_format,{type:'json_object'});
  assert.match(payload.messages[0].content,/SIM registration/);assert(payload.messages[0].content.length<26000);
  return Response.json({choices:[{message:{content:JSON.stringify({answer:'Safaricom can help with mobile lines and data. Which service do you need?',source_ids:['T:safaricom'],tenant:'Safaricom',topic:'tenant'})}}]});
 };
 try{const d=await(await handle(request(),{GROQ_API_KEY:'mock-groq-key',AI_GATEWAY_API_KEY:'unused-gateway-key',AI_GATEWAY_MODEL:'unused'})).json();assert.equal(d.provider,'groq');assert.equal(d.mode,'ai');assert.equal(d.aiStatus,'active');assert.equal(d.sources[0].original,'https://galleria.co.ke/stores/safaricom/');assert.doesNotMatch(JSON.stringify(d),/mock-groq-key|unused-gateway-key/);}finally{globalThis.fetch=original;}
});
test('explicit Groq without a key never attempts Gateway',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Must not call any provider');};
 try{const d=await(await handle(request(),{AI_PROVIDER:'groq',AI_GATEWAY_API_KEY:'unused',AI_GATEWAY_MODEL:'unused'})).json();assert.equal(d.aiStatus,'not-configured');assert.equal(d.provider,'groq');assert.equal(d.mode,'directory');}finally{globalThis.fetch=original;}
});
test('Groq rate limits fall back without switching to a paid provider or leaking errors',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:{message:'private-error-value'}},{status:429});};
 try{const d=await(await handle(request(),{AI_PROVIDER:'groq',GROQ_API_KEY:'mock-groq-key',AI_GATEWAY_API_KEY:'unused',AI_GATEWAY_MODEL:'unused'})).json();assert.equal(calls,1);assert.equal(d.mode,'directory');assert.equal(d.aiStatus,'unavailable');assert.match(d.answer,/voice and data/);assert.doesNotMatch(JSON.stringify(d),/mock-groq-key|private-error-value/);}finally{globalThis.fetch=original;}
});
test('Groq status reports default model and presence without returning credentials',async()=>{
 const d=await(await handle(new Request('https://chatbot.example/api/status'),{GROQ_API_KEY:'private-key'})).json();assert.equal(d.aiConfigured,true);assert.equal(d.provider,'groq');assert.equal(d.model,'llama-3.3-70b-versatile');assert.doesNotMatch(JSON.stringify(d),/private-key/);
});
