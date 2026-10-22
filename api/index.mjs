import {knowledgeHealth} from '../lib/knowledge-health.mjs';
import {chat,aiConfiguration} from '../lib/chat.mjs';
import tenants from '../data/tenants.json' with {type:'json'};
import media from '../data/media.json' with {type:'json'};
import catalog from '../data/catalog.json' with {type:'json'};

export async function handle(request,env=process.env){
 const url=new URL(request.url),action=url.searchParams.get('action');
 if(action==='chat'||url.pathname==='/api/chat')return chat(request,env,tenants);
 if(action==='status'||url.pathname==='/api/status'){
  if(request.method!=='GET')return new Response('Use GET',{status:405});
  const ai=aiConfiguration(env);
  return Response.json({service:'chatbot',aiConfigured:Boolean(ai.key&&ai.model),provider:ai.provider,model:ai.model||null,knowledgeUpdatedAt:catalog.lastSuccessfulCrawl,knowledgeSync:knowledgeHealth(catalog,tenants),conversationState:true,sourcePolicy:'official-mall-only',rateLimit:env.UPSTASH_REDIS_REST_URL&&env.UPSTASH_REDIS_REST_TOKEN?'shared-redis':'instance-guard; use platform WAF for shared enforcement'},{headers:{'Cache-Control':'no-store'}});
 }
 if(url.searchParams.has('asset')||url.pathname.startsWith('/assets/')){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const asset='/assets/'+(url.searchParams.get('asset')||url.pathname.slice('/assets/'.length));
  const target=Object.hasOwn(media,asset)?media[asset]:null;
  if(target){const parsed=new URL(target);if(parsed.protocol==='https:'&&['galleria.co.ke','www.galleria.co.ke','img.youtube.com','i.ytimg.com'].includes(parsed.hostname))return new Response(null,{status:307,headers:{Location:target,'Cache-Control':'public, max-age=3600'}});}
 }
 return new Response('Not found',{status:404});
}
export const GET=request=>handle(request);
export const HEAD=request=>handle(request);
export const POST=request=>handle(request);
export const PUT=request=>handle(request);
export const DELETE=request=>handle(request);
export const PATCH=request=>handle(request);
export const OPTIONS=request=>handle(request);
