import {cleanHistory,conversationContext,conversationalInstructions,parseConversation,resolveFocus} from './conversation.mjs';
import {capturedAt} from '../data/capture.mjs';
import {directoryAnswer} from './directory.mjs';
export function aiConfiguration(env){
 const provider=env.AI_PROVIDER||(env.GROQ_API_KEY?'groq':'gateway');
 if(provider==='groq')return {provider,key:env.GROQ_API_KEY?.trim()||'',model:env.GROQ_MODEL?.trim()||'openai/gpt-oss-20b',url:'https://api.groq.com/openai/v1/chat/completions'};
 if(provider==='gateway')return {provider,key:env.AI_GATEWAY_API_KEY?.trim()||'',model:env.AI_GATEWAY_MODEL?.trim()||'',url:'https://ai-gateway.vercel.sh/v1/chat/completions'};
 return {provider:'none',key:'',model:'',url:''};
}
function groqFacts(facts,question,history,tenant){
 const words=(question+' '+history.slice(-2).map(m=>m.content).join(' ')).toLowerCase().match(/[a-z]{4,}/g)||[];
 const score=a=>words.reduce((n,w)=>n+(a.answer.toLowerCase().includes(w)?1:0),0);
 const relevant=new Set(facts.relevantStoreDetails.map(t=>t.id));
 return {...facts,directory:facts.directory.map(t=>relevant.has(t.id)||t.name===tenant?t:{id:t.id,name:t.name,categories:t.categories,status:t.status}),visitorInformation:[...facts.visitorInformation].sort((a,b)=>score(b)-score(a)).slice(0,4)};
}
export async function chat(request,env,tenants){
 if(request.method!=='POST')return Response.json({error:'Use POST'},{status:405});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origin not allowed'},{status:403});
 if(Number(request.headers.get('content-length')||0)>24000)return Response.json({error:'Message too long'},{status:413});
 let body;try{const text=await request.text();if(text.length>24000)throw Error();body=JSON.parse(text);}catch{return Response.json({error:'Invalid request'},{status:400});}
 if(typeof body.message!=='string'||!body.message.trim()||body.message.length>1200)return Response.json({error:'Enter a question of up to 1,200 characters.'},{status:400});
 const history=cleanHistory(body.history);
 const focus=resolveFocus(history,tenants,typeof body.tenant==='string'?body.tenant.slice(0,120):'',typeof body.topic==='string'?body.topic.slice(0,80):'');
 const result=directoryAnswer(body.message,tenants,focus.tenant,focus.topic);
 const ai=aiConfiguration(env);
 let answer=result.answer,sources=result.sources,tenant=result.tenant||null,topic=result.topic||null,mode='directory',aiStatus=ai.key&&ai.model?'unavailable':'not-configured';
 const context=conversationContext(body.message,history,tenants,result);
 if(result.fixedAnswer)aiStatus='not-needed';
 if(ai.key&&ai.model&&!result.fixedAnswer){
  try{
   const response=await fetch(ai.url,{method:'POST',signal:AbortSignal.timeout(18000),headers:{'Content-Type':'application/json','Authorization':`Bearer ${ai.key}`},body:JSON.stringify({model:ai.model,temperature:0.2,max_tokens:650,...(ai.provider==='groq'?{response_format:{type:'json_object'}}:{}),messages:[{role:'system',content:conversationalInstructions+'\nVerified answer: '+result.answer+'\nCURRENT VERIFIED EVIDENCE: '+JSON.stringify(ai.provider==='groq'?groqFacts(context.facts,body.message,history,result.tenant):context.facts)},...(ai.provider==='groq'?history.slice(-4).map(m=>({...m,content:m.content.slice(0,500)})):history),{role:'user',content:body.message}]})});
   if(response.ok){const data=await response.json();const text=data.choices?.[0]?.message?.content;if(typeof text==='string'){const parsed=parseConversation(text,context,tenants,result);if(parsed){({answer,sources,tenant,topic}=parsed);mode='ai';aiStatus='active';}else aiStatus='invalid-response';}else aiStatus='invalid-response';if(aiStatus==='invalid-response')console.warn('AI provider diagnostic', {provider:ai.provider,type:'invalid-response',status:response.status});}
   else console.warn('AI provider diagnostic', {provider:ai.provider,type:'http-error',status:response.status});
  }catch(error){
   const type=error?.name==='TimeoutError'||error?.name==='AbortError'?'timeout':error instanceof SyntaxError?'invalid-json':'network-error';
   console.warn('AI provider diagnostic', {provider:ai.provider,type});
  }
 }
 return Response.json({answer,sources,tenant,mode,topic,aiStatus,provider:ai.provider,asOf:result.verifiedAt||capturedAt,timezone:'Africa/Nairobi'},{headers:{'Cache-Control':'no-store'}});
}
