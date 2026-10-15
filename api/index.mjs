import {chat} from '../lib/chat.mjs';
import tenants from '../data/tenants.json' with {type:'json'};
import media from '../data/media.json' with {type:'json'};

export async function handle(request,env=process.env){
 const url=new URL(request.url),action=url.searchParams.get('action');
 if(action==='chat'||url.pathname==='/api/chat')return chat(request,env,tenants);
 if(action==='status'||url.pathname==='/api/status'){
  if(request.method!=='GET')return new Response('Use GET',{status:405});
  return Response.json({service:'chatbot',aiConfigured:Boolean(env.AI_GATEWAY_API_KEY&&env.AI_GATEWAY_MODEL),model:env.AI_GATEWAY_MODEL||null},{headers:{'Cache-Control':'no-store'}});
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
