import {directoryAnswer,findTenants,normalize} from './directory.mjs';
import {contentAnswer,contentDetail} from './content.mjs';
const contact={title:'Galleria contact',url:'https://galleria.co.ke/contact-us/',original:'https://galleria.co.ke/contact-us/'};
const result=(answer,topic='help',extra={})=>({answer,sources:[],context:[],topic,fixedAnswer:true,...extra});
const empty=()=>({version:1,tenant:'',topic:'',options:[],contentOptions:[],activeContent:null,pending:null,language:'en',preferences:{}});
export function cleanState(value,tenants){
 const s=empty();if(!value||typeof value!=='object'||Array.isArray(value))return s;
 s.tenant=tenants.some(t=>t.name===value.tenant)?value.tenant:'';
 s.topic=typeof value.topic==='string'&&/^[a-z-]{1,60}$/.test(value.topic)?value.topic:'';
 s.options=Array.isArray(value.options)?value.options.filter(n=>tenants.some(t=>t.name===n)).slice(0,6):[];
 s.contentOptions=Array.isArray(value.contentOptions)?value.contentOptions.filter(r=>r&&typeof r.id==='string'&&r.id.length<180&&['events','deals'].includes(r.kind)&&typeof r.title==='string').slice(0,4).map(r=>({id:r.id,title:r.title.slice(0,200),kind:r.kind})):[];
 if(value.activeContent&&typeof value.activeContent.id==='string'&&value.activeContent.id.length<180&&['events','deals'].includes(value.activeContent.kind))s.activeContent={id:value.activeContent.id,kind:value.activeContent.kind};
 if(['burgers','pizza','coffee'].includes(value.preferences?.food))s.preferences.food=value.preferences.food;
 s.language=['en','sw','sheng'].includes(value.language)?value.language:'en';
 if(['hours','contact','choose-store','dining','service','content'].includes(value.pending))s.pending=value.pending;
 return s;
}
export function interpretLanguage(text){
 let q=normalize(text),language=/\b(ndio|hapana|wapi|ngapi|maduka|chakula|maegesho|kesho|leo|habari|asante|niko|nataka|iko|mna|shukran)\b/.test(q)?'sw':null;
 if(/\b(niaje|rada|msee|manze|sasa)\b/.test(q))language='sheng';
 if(/^(ndio|sawa|yes please|yes|sure|okay|ok|please do)$/.test(q))q='yes';
 if(/^(hapana|la|no|no thanks|not now)$/.test(q))q='no';
 if(/^(asante|shukran|thanks|thank you)$/.test(q))q='thanks';
 if(/^(habari|jambo|niaje|sasa|hi|hello|hey)$/.test(q))q='hello';
 q=q.replace(/maegesho/g,'parking').replace(/duka la dawa/g,'pharmacy').replace(/maduka/g,'shopping').replace(/chakula|niko njaa|nimefeel njaa/g,'food').replace(/iko wapi|iko floor gani|iko ghorofa gani/g,'where').replace(/inafungwa saa ngapi|inafungua saa ngapi|saa ngapi/g,'opening hours').replace(/bei gani|bei ni ngapi/g,'how much').replace(/kesho/g,'tomorrow').replace(/leo/g,'today');
 return {query:q,language};
}
export function requestSafety(q){
 if(/(?:ignore|override|forget).{0,40}(?:instructions|rules|system|prompt)|(?:reveal|show|print|give).{0,40}(?:system prompt|api key|secret key|password)|pretend.{0,30}(?:administrator|developer)|(?:execute|run).{0,20}(?:shell|javascript|code)/i.test(q))return 'injection';
 if(/\b(weather forecast|write (?:me )?(?:code|a poem|an essay)|python code|javascript code|president|politics|solve this equation|football score|bitcoin price)\b/i.test(q))return 'off-topic';
 return null;
}
function localize(r,language){
 if(language!=='sw')return r;
 let a=r.answer;
 a=a.replace('You’ll find ','Utampata ').replace(' on ',' kwenye ').replace('Would you like its published hours?','Ungependa kujua saa zake za kazi?').replace('Which store do you mean','Unamaanisha duka gani').replace('Here are some options for ','Hizi ni baadhi ya chaguo za ').replace(' at Galleria:',' katika Galleria:').replace('Would you like the hours or contact details for one of these?','Ungependa saa za kazi au mawasiliano ya duka gani?').replace('Confirm specific products, prices and availability with the outlet.','Thibitisha bidhaa, bei na upatikanaji moja kwa moja na duka.').replace('You’re welcome! Enjoy your visit. Is there anything else I can help you with?','Karibu! Furahia ziara yako. Kuna jambo lingine nikusaidie?');
 return {...r,answer:a};
}
export function dialogueTurn(message,tenants,previous=empty(),now=new Date()){
 let state=cleanState(previous,tenants);const original=String(message),interpreted=interpretLanguage(original),q=interpreted.query;
 if(interpreted.language)state.language=interpreted.language;
 const safety=requestSafety(original);
 if(safety)return {result:result(state.language==='sw'?'Ninaweza kusaidia kuhusu maduka, maegesho, chakula na taarifa za Galleria. Unahitaji msaada gani?':'I can help with Galleria stores, dining, parking and visitor information. What would you like to know?',safety),state:{...state,pending:null}};
 if(/talk to (?:a )?human|speak to (?:a )?(?:person|human|staff)|customer service|lost property|lost (?:my )?(?:wallet|phone|bag)|complain|emergency|urgent help/.test(q)){
  return {result:result('You can reach Galleria on 020 2363063 or 0704 498463, or email info@galleria.co.ke. For an urgent safety issue at the mall, contact on-site security immediately. This chat does not transfer you to a staff member or create a support ticket.','human',{sources:[contact]}),state:{...state,topic:'human',pending:null}};
 }
 if(q==='hello')return {result:result(state.language==='sw'?'Habari! Ninaweza kusaidia kupata maduka, chakula, saa za kazi au maegesho Galleria. Ungependa kujua nini?':'Hello! How can I help you plan your visit to Galleria?','help'),state:{...state,pending:null}};
 if(q==='thanks')return {result:localize(result('You’re welcome! Enjoy your visit. Is there anything else I can help you with?',state.topic||'help'),state.language),state};
 if(q==='no')return {result:result(state.language==='sw'?'Sawa. Niambie ukihitaji jambo lingine.':'No problem. Let me know if you need anything else.',state.topic||'help'),state:{...state,pending:null}};
 const explicit=findTenants(q,tenants);let resolved=q;
 if(explicit.length||/\b(parking|shopping|events|deals|restaurants)\b/.test(q))state.activeContent=null;
 if(!explicit.length&&state.activeContent&&/^(what time|what about (?:the )?time|where is it|where|what date|when does it (?:start|end)|how much|how do i book)\b/.test(q)){
  if(/how much|book/.test(q)){
   const detail=contentDetail(state.activeContent.id,state.activeContent.kind,now);
   if(/how much/.test(q)&&detail?.price)return {result:{...detail,answer:detail.price+'. This is the published price; confirm the date, availability and booking terms with the organizer before paying.'},state:{...state,pending:null}};
   return {result:result('I don’t have confirmed booking availability or prices for that event. Please check its official page or contact Galleria on 0704 498463.','events',{sources:detail?.sources||[contact]}),state:{...state,pending:null}};
  }
  const detail=contentDetail(state.activeContent.id,state.activeContent.kind,now);if(detail)return {result:detail,state:{...state,pending:null}};
 }
 const ordinal=q.match(/^(?:the )?(first|second|third|fourth|1|2|3|4)(?: one)?$/),ordinalIndex=ordinal?['first','second','third','fourth'].includes(ordinal[1])?['first','second','third','fourth'].indexOf(ordinal[1]):Number(ordinal[1])-1:-1;
 if(state.pending==='content'&&!explicit.length){
  const option=ordinalIndex>=0?state.contentOptions[ordinalIndex]:state.contentOptions.find(r=>normalize(r.title)===q||(q.length>4&&normalize(r.title).includes(q)))||((q==='yes'||/^(tell me more|details|that one)$/.test(q))&&state.contentOptions.length===1?state.contentOptions[0]:null);
  if(option){const r=contentDetail(option.id,option.kind,now);if(r)return {result:r,state:{...state,activeContent:{id:option.id,kind:option.kind},pending:null}};}
 }
 if(!explicit.length&&ordinalIndex>=0&&state.options[ordinalIndex])resolved='where is '+state.options[ordinalIndex];
 if(state.tenant&&/^(there|that one)$/.test(q))resolved='where is '+state.tenant;
 if(q==='yes'){
  if(state.pending==='hours'&&state.tenant)resolved='What are the opening hours for '+state.tenant+'?';
  else if(state.pending==='contact'&&state.tenant)resolved='What is the contact for '+state.tenant+'?';
  else return {result:result(state.options.length>1?'Which store would you like to know about: '+state.options.join(', ')+'?':'What would you like to know next?', 'clarification'),state};
 }
 if(!explicit.length&&/^(where is it|where are they|there|that one|its hours|their hours|how much|how much is it|how much does it cost|what time does it close|what about sunday|on sunday)$/.test(q)&&!state.tenant&&state.options.length>1)return {result:result('Which store do you mean: '+state.options.join(', ')+'?','clarification'),state:{...state,pending:'choose-store'}};
 if(!explicit.length&&/^(where can (?:i|we) eat|(?:i am|im) hungry|food|restaurants|dining|niko food|nataka food)$/.test(q))return {result:result(state.language==='sw'?'Ungependa chakula gani—burger, pizza au kahawa?':'What are you in the mood for—burgers, pizza or coffee?','dining-preference'),state:{...state,tenant:'',topic:'dining-preference',options:[],pending:'dining'}};
 let r=contentAnswer(resolved===q?original:resolved,state.topic,now);
 if(!r)r=directoryAnswer(resolved,tenants,state.tenant,state.topic);
 let next={...state,tenant:r.tenant||'',topic:r.topic||'',pending:null,options:(r.context||[]).map(t=>t.name).slice(0,6),contentOptions:r.contentOptions||[]};
 if(/^(burgers?|pizza|coffee)$/.test(q))next.preferences.food=q.startsWith('burger')?'burgers':q;
 if(r.contentOptions?.length)next.pending='content';
 if(r.topic==='category'||r.topic==='shopping'){
  if(r.context?.length===1){next.tenant=r.context[0].name;r.answer=r.answer.replace(/\nWould you like the hours[\s\S]*$/,'\nWould you like its published hours?');next.pending='hours';}
  else if(r.context?.length>1){next.pending='choose-store';r.answer=r.answer.replace(/\nWould you like the hours[\s\S]*$/,'\nWhich store would you like to know more about?');}
 }
 if(r.tenant&&/Would you like (?:its hours|to know its hours|its published hours)/.test(r.answer)){r.answer=r.answer.replace(/Would you like[^?]*\?/,'Would you like its published hours?');next.pending='hours';}
 if(r.tenant&&/What (?:specific service or product|do you need help with)/.test(r.answer))next.pending='service';
 // Controlled steps must keep the question and pending action consistent even
 // when AI is unavailable; the model cannot replace the next-step question.
 if(next.pending&&next.pending!=='service'||r.topic==='clarification'||q==='yes')r.fixedAnswer=true;
 return {result:localize(r,next.language),state:next};
}
export function conversationTurn(message,history,tenants,supplied={},now=new Date()){
 let state=cleanState(supplied,tenants);
 // Replay when the browser has no structured state (including older clients).
 if(!supplied||supplied.version!==1){state=empty();for(const m of history)if(m.role==='user')state=dialogueTurn(m.content,tenants,state,now).state;}
 return dialogueTurn(message,tenants,state,now);
}
