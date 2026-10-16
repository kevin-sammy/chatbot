import {createHash,randomBytes} from 'node:crypto';
const buckets=new Map(),salt=randomBytes(24).toString('hex');
// This local guard is supplementary. Vercel WAF or the optional Redis adapter
// provides the shared counter across function instances.
export async function rateLimit(request,env,now=Date.now()){
 if(env.VERCEL!=='1'&&env.RATE_LIMIT_LOCAL!=='1')return {allowed:true,scope:'disabled'};
 const ip=env.VERCEL==='1'?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown':'local';
 const minute=Math.floor(now/60000),limit=30;
 if(env.UPSTASH_REDIS_REST_URL&&env.UPSTASH_REDIS_REST_TOKEN){
  const key='chat-limit:'+minute+':'+createHash('sha256').update(ip).digest('hex');
  try{
   const response=await fetch(env.UPSTASH_REDIS_REST_URL.replace(/\/$/,'')+'/pipeline',{method:'POST',signal:AbortSignal.timeout(2000),headers:{Authorization:'Bearer '+env.UPSTASH_REDIS_REST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify([['INCR',key],['EXPIRE',key,120]])});
   if(!response.ok)throw Error('counter unavailable');const values=await response.json();const count=values[0]?.result;if(!Number.isInteger(count))throw Error('invalid counter');
   return {allowed:count<=limit,scope:'shared',retryAfter:60};
  }catch{return {allowed:false,scope:'shared-unavailable',retryAfter:30};}
 }
 const key=minute+':'+createHash('sha256').update(salt+ip).digest('hex');
 for(const [k,b] of buckets)if(b.minute<minute)buckets.delete(k);
 const b=buckets.get(key)||{minute,count:0};b.count++;buckets.set(key,b);
 if(buckets.size>5000)buckets.delete(buckets.keys().next().value);
 return {allowed:b.count<=limit,scope:'instance',retryAfter:60};
}
export function qualityMetric(data,env){
 if(env.CHAT_METRICS==='0'||env.CHAT_METRICS!=='1'&&env.VERCEL!=='1')return;
 const known=new Set('help tenant tenants category shopping clarification unverified events deals human injection off-topic dining-preference missing-business parking-rates parking-payment parking-hours parking-location parking-capacity gift-vouchers kids-activities mall-hours mall-contact directions pets smoking photography security advertising leasing store-count mall-map noticeboard-rates flyer-rates activation-rates shopping-clarification activity-swimming activity-ice-skating activity-roller-skating activity-bowling activity-billiards activity-gym activity-mini-golf activity-trampoline activity-skating-clarification activities'.split(' '));
 const topic=known.has(data.topic)?data.topic:'other';
 console.info('chat-quality',JSON.stringify({topic,mode:data.mode,aiStatus:data.aiStatus,language:data.language||'en',date:new Date().toISOString().slice(0,10)}));
}
