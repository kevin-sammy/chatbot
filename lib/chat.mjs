import {cleanHistory,conversationContext,conversationalInstructions,parseConversation} from './conversation.mjs';
import {capturedAt} from '../data/capture.mjs';
import {directoryAnswer} from './directory.mjs';
export async function chat(request,env,tenants){
 if(request.method!=='POST')return Response.json({error:'Use POST'},{status:405});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origin not allowed'},{status:403});
 if(Number(request.headers.get('content-length')||0)>24000)return Response.json({error:'Message too long'},{status:413});
 let body;try{const text=await request.text();if(text.length>24000)throw Error();body=JSON.parse(text);}catch{return Response.json({error:'Invalid request'},{status:400});}
 if(typeof body.message!=='string'||!body.message.trim()||body.message.length>1200)return Response.json({error:'Enter a question of up to 1,200 characters.'},{status:400});
 const history=cleanHistory(body.history);
 const result=directoryAnswer(body.message,tenants,typeof body.tenant==='string'?body.tenant.slice(0,120):'',typeof body.topic==='string'?body.topic.slice(0,80):'');
 let answer=result.answer,sources=result.sources,tenant=result.tenant||null,topic=result.topic||null,mode='directory',aiStatus=env.AI_GATEWAY_API_KEY&&env.AI_GATEWAY_MODEL?'unavailable':'not-configured';
 const context=conversationContext(body.message,history,tenants,result);
 if(env.AI_GATEWAY_API_KEY&&env.AI_GATEWAY_MODEL){
  try{
   const response=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',signal:AbortSignal.timeout(18000),headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.AI_GATEWAY_API_KEY}`},body:JSON.stringify({model:env.AI_GATEWAY_MODEL,temperature:0.2,max_tokens:650,messages:[{role:'system',content:conversationalInstructions+'\nVerified answer: '+result.answer+'\nCURRENT VERIFIED EVIDENCE: '+JSON.stringify(context.facts)},...history,{role:'user',content:body.message}]})});
   if(response.ok){const data=await response.json();const text=data.choices?.[0]?.message?.content;if(typeof text==='string'){const parsed=parseConversation(text,context,tenants,result);if(parsed){({answer,sources,tenant,topic}=parsed);mode='ai';aiStatus='active';}else aiStatus='invalid-response';}else aiStatus='invalid-response';if(aiStatus==='invalid-response')console.warn('AI Gateway diagnostic', {type:'invalid-response',status:response.status});}
   else console.warn('AI Gateway diagnostic', {type:'http-error',status:response.status});
  }catch(error){
   const type=error?.name==='TimeoutError'||error?.name==='AbortError'?'timeout':error instanceof SyntaxError?'invalid-json':'network-error';
   console.warn('AI Gateway diagnostic', {type});
  }
 }
 return Response.json({answer,sources,tenant,mode,topic,aiStatus,asOf:result.verifiedAt||capturedAt,timezone:'Africa/Nairobi'},{headers:{'Cache-Control':'no-store'}});
}
