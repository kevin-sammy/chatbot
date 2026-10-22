import {offeringIntent,offeringAnswer,isDining} from './offerings.mjs';
import {directoryFAQQuery,directoryFAQAnswer,directoryFAQSection} from './directory-faq.mjs';
import {interpretLanguage,localizeAnswer} from './language.mjs';
export {interpretLanguage} from './language.mjs';
import {directoryAnswer,findTenants,normalize,hoursFor} from './directory.mjs';
import {contentAnswer,contentDetail,relevantDeals} from './content.mjs';
const contact={title:'Galleria contact',url:'https://galleria.co.ke/contact-us/',original:'https://galleria.co.ke/contact-us/'};
const result=(answer,topic='help',extra={})=>({answer,sources:[],context:[],topic,fixedAnswer:true,...extra});
const empty=()=>({version:1,tenant:'',topic:'',options:[],contentOptions:[],activeContent:null,pending:null,language:'en',preferences:{},faqSection:null,faqOffset:0});
export function cleanState(value,tenants){
 const s=empty();if(!value||typeof value!=='object'||Array.isArray(value))return s;
 s.faqSection=directoryFAQSection(value.faqSection)?.id||null;
 s.faqOffset=Number.isInteger(value.faqOffset)&&value.faqOffset>=0&&value.faqOffset<=60?value.faqOffset:0;
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
export function requestSafety(q){
 if(/puuza.{0,30}maagizo|onyesha.{0,30}(?:maagizo|ufunguo|nenosiri)/i.test(q))return 'injection';
 if(/(?:ignore|override|forget).{0,40}(?:instructions|rules|system|prompt)|(?:reveal|show|print|give).{0,40}(?:system prompt|api key|secret key|password)|pretend.{0,30}(?:administrator|developer)|(?:execute|run).{0,20}(?:shell|javascript|code)/i.test(q))return 'injection';
 if(/\b(weather forecast|write (?:me )?(?:code|a poem|an essay)|python code|javascript code|president|politics|solve this equation|football score|bitcoin price|elections?)\b/i.test(q))return 'off-topic';
 return null;
}
const localize=r=>r;
function dialogueCore(message,tenants,previous=empty(),now=new Date()){
 let state=cleanState(previous,tenants);const original=String(message),interpreted=interpretLanguage(original),q=interpreted.query;
 if(interpreted.language)state.language=interpreted.language;
 const safety=requestSafety(original)||requestSafety(q);
 if(q==='language english'||q==='language swahili')return {result:result(q==='language english'?'Sure, I’ll reply in English. What would you like to know about Galleria?':'Sawa, nitajibu kwa Kiswahili. Ungependa kujua nini kuhusu Galleria?','help'),state};
 if(safety)return {result:result(state.language==='sw'?'Ninaweza kusaidia kuhusu maduka, maegesho, chakula na taarifa za Galleria. Unahitaji msaada gani?':'I can help with Galleria stores, dining, parking and visitor information. What would you like to know?',safety),state:{...state,pending:null}};
 if(/talk to (?:a )?human|speak to (?:a )?(?:person|human|staff)|customer service|lost property|lost (?:my )?(?:wallet|phone|bag)|complain|complaint|emergency|urgent help/.test(q)){
  return {result:result((/lost (?:my )?(?:wallet|phone|bag)|lost property/.test(q)?'I’m sorry you’ve lost something. ':'')+'You can reach Galleria on 020 2363063 or 0704 498463, or email info@galleria.co.ke. For an urgent safety issue at the mall, contact on-site security immediately. This chat does not transfer you to a staff member or create a support ticket.','human',{sources:[contact]}),state:{...state,topic:'human',pending:null}};
 }
 if(q==='hello'||q==='help'||q==='what can you do')return {result:result(state.language==='sw'?'Habari! Ninaweza kusaidia kupata maduka, chakula, saa za kazi au maegesho Galleria. Ungependa kujua nini?':'Hello! I can help with stores, dining, opening hours or parking. What would you like to know?','help'),state:{...state,pending:null}};
 if(q==='thanks')return {result:localize(result('You’re welcome! Enjoy your visit. Is there anything else I can help you with?',state.topic||'help'),state.language),state};
 if(q==='no')return {result:result(state.language==='sw'?'Sawa. Niambie ukihitaji jambo lingine.':'No problem. Let me know if you need anything else.',state.topic||'help'),state:{...state,pending:null}};
 const more=state.topic==='directory-faq'&&/^(?:show (?:me )?more|more(?: options)?|other options|nionyeshe zaidi|zaidi|chaguo zaidi)$/.test(normalize(original));
 const faq=directoryFAQQuery(original)||(more?directoryFAQSection(state.faqSection):null);
 if(faq){
  const r=directoryFAQAnswer(faq,tenants,state.language,more?state.faqOffset+6:0);
  if(r)return {result:r,state:{...state,tenant:'',topic:'directory-faq',faqSection:r.faqSection,faqOffset:r.faqOffset,options:r.context.map(t=>t.name),pending:'choose-store',activeContent:null,contentOptions:[]}};
 }
 const named=findTenants(q,tenants);
 const diningContext=[state.tenant,...state.options].some(n=>tenants.some(t=>t.name===n&&/dining|restaurant|coffee/i.test(t.categories)));
 const foodQuery=/restaurant|restaurants|food|meal|dining|cafe|coffee|burger|pizza|mkahawa|mikahawa/.test(q);
 const diningThread=diningContext||['dining-preference','dining-price-comparison','dining-budget'].includes(state.topic);
 const budget=/\b(?:budget|under|below|less than|up to|only have|i have|niko na|nina|bajeti)\s*(?:of\s*)?(?:(?:ksh|kes|sh)\s*)?\d+|\b\d+\s*(?:ksh|kes|shillings?|bob)\b/.test(q);
 const priceComparison=/cheapest|cheaper|cheap|affordable|least expensive|lowest price|budget friendly|too expensive|compare.{0,15}prices|bei nafuu|price nafuu|nafuu zaidi/.test(q);
 if((priceComparison||budget)&&(foodQuery||(diningThread&&!/parking|shoes?|clothes|phones?|electronics|books|vouchers/.test(q)&&!named.some(t=>!/dining|restaurant|coffee/i.test(t.categories))))){
  if(budget)return {result:result('I can help you look for a meal within your budget, but I don’t have verified current menu prices to confirm what fits. Which restaurant would you like to contact for its menu and prices?','dining-budget'),state:{...state,topic:'dining-budget',tenant:'',activeContent:null,pending:null}};
  return {result:result('I don’t have verified current menu prices to compare, so I can’t reliably name the cheapest restaurant. I can help you find a restaurant’s contact details to check meal prices—which restaurant would you like?','dining-price-comparison',{sources:[{title:'Galleria dining directory',url:'https://galleria.co.ke/stores/',original:'https://galleria.co.ke/stores/'}]}),state:{...state,topic:'dining-price-comparison',tenant:'',activeContent:null,pending:null}};
 }
 const menuTenant=named.length===1?named[0]:!named.length?tenants.find(t=>t.name===state.tenant):null;
 const offering=offeringIntent(q);
 if(offering&&menuTenant&&menuTenant.name!=='Safaricom'&&(offering!=='menu'||isDining(menuTenant))&&!/\b(?:hours?|open|close|phone|contact|email|parking)\b/.test(q)){
  const r=offeringAnswer(menuTenant,offering,q,state.language);
  return {result:r,state:{...state,tenant:menuTenant.name,topic:'tenant',options:[menuTenant.name],activeContent:null,contentOptions:[],pending:null}};
 }
 if(offering==='menu'&&!named.length&&!state.tenant)return {result:result(state.language==='sw'?'Ungependa menyu ya mkahawa gani'+(state.options.length?': '+state.options.join(', '):'')+'?':'Which restaurant’s menu would you like'+(state.options.length?': '+state.options.join(', '):'')+'?','clarification'),state:{...state,pending:state.options.length?'choose-store':null}};
 if(menuTenant&&menuTenant.status!=='opening-soon'&&((['dining-price-comparison','dining-budget'].includes(state.topic)&&named.length===1&&[menuTenant.name,...(menuTenant.aliases||[])].some(n=>normalize(n)===q))||(/\bmenu\b/.test(q)&&/\bprices?|cost|how much\b/.test(q)))&&/dining|restaurant|coffee/i.test(menuTenant.categories)){
  const t=menuTenant;return {result:result('I can’t verify current menu prices for '+t.name+'. '+(t.phone?'You can call '+t.phone+' to ask for its menu and current meal prices.':'Please check its official listing and confirm meal prices directly with the restaurant.'),'tenant',{tenant:t.name,context:[t],sources:[{title:t.name,url:t.url,original:t.url}],verifiedAt:t.verifiedAt}),state:{...state,tenant:t.name,topic:'tenant',options:[t.name],activeContent:null,pending:null}};
 }
 if(/^(?:where are you located|where is the mall located|where are you|your location)$/.test(q)){
  const r=directoryAnswer('Where is Galleria?',tenants);return {result:{...r,fixedAnswer:true},state:{...state,tenant:'',topic:'directions',pending:null,activeContent:null}};
 }
 if(/^(?:whats|what is|which stores? (?:are|is)|what stores? (?:are|is)) (?:opening|coming) soon$/.test(q)){
  const soon=tenants.filter(t=>t.status==='opening-soon');
  const examples=['KCB Bank','Levi’s','Sports Direct'];const choices=[...soon.filter(t=>examples.includes(t.name)),...soon.filter(t=>!examples.includes(t.name))].slice(0,6);
  const sources=choices.map(t=>({title:t.name,url:t.url,original:t.url}));
  return {result:result(choices.length?'Galleria marks these stores as “Coming soon” (Opening Soon):\n'+choices.map(t=>'• '+t.name+(t.floor?' — '+t.floor:'')).join('\n')+'\nOpening dates are not confirmed. Which store would you like to know about?':'I don’t have any confirmed coming-soon listings in the current directory. Please check the official stores page.','coming-soon',{sources:sources.length?sources:[{title:'Galleria stores',url:'https://galleria.co.ke/stores/',original:'https://galleria.co.ke/stores/'}],context:choices}),state:{...state,tenant:'',topic:'coming-soon',options:choices.map(t=>t.name),pending:choices.length?'choose-store':null,activeContent:null}};
 }
 if(/\bcoffee\b/.test(q)&&/\bcakes?\b/.test(q)&&!findTenants(q,tenants).length){
  const choices=['Artcaffe','Java House'].map(n=>tenants.find(t=>t.name===n&&t.status!=='opening-soon')).filter(Boolean);
  if(choices.length){const deals=relevantDeals('coffee cake',now);return {result:result('For coffee and cake, start with these listed cafés: '+choices.map(t=>t.name+(t.floor?' — '+t.floor:'')).join('; ')+'. Confirm today’s menu and availability with the café.'+(deals.length?' '+deals.map(d=>d.title+' is published until '+(d.endDate||d.validUntil)+'.').join(' '):'')+' Which café would you like to know about?','category',{context:choices,sources:[...choices.map(t=>({title:t.name,url:t.url,original:t.url})),...deals.map(d=>({title:d.title,url:d.url,original:d.url}))]}),state:{...state,tenant:'',topic:'category',options:choices.map(t=>t.name),pending:'choose-store',activeContent:null}};}
 }
 if(/\bnuts?\b/.test(q)&&/dried fruits?/.test(q)){
  const t=tenants.find(t=>t.name==='The Nut Bar'&&t.status!=='opening-soon');if(t)return {result:result(t.name+' is listed for nuts and dried fruit'+(t.floor?' on '+t.floor:'')+'. Published hours: '+hoursFor(t,q)+'.'+(t.phone?' Call '+t.phone+' to confirm products and availability.':''),'tenant',{tenant:t.name,context:[t],sources:[{title:t.name,url:t.url,original:t.url}],verifiedAt:t.verifiedAt}),state:{...state,tenant:t.name,topic:'tenant',options:[t.name],pending:null,activeContent:null}};
 }
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
 if(!explicit.length&&ordinalIndex>=state.options.length&&ordinalIndex>=0&&state.options.length)return {result:result('I listed '+state.options.length+' option'+(state.options.length===1?'':'s')+': '+state.options.join(', ')+'. Which would you like to know about?','clarification'),state};
 if(!explicit.length&&ordinalIndex>=0&&state.options[ordinalIndex])resolved='where is '+state.options[ordinalIndex];
 if(state.tenant&&/^(there|that one)$/.test(q))resolved='where is '+state.tenant;
 if(q==='yes'){
  if(state.pending==='hours'&&state.tenant)resolved='What are the opening hours for '+state.tenant+'?';
  else if(state.pending==='contact'&&state.tenant)resolved='What is the contact for '+state.tenant+'?';
  else return {result:result(state.options.length>1?'Which store would you like to know about: '+state.options.join(', ')+'?':'What would you like to know next?', 'clarification'),state};
 }
 if(!explicit.length&&/^(where is it|where are they|there|that one|its hours|their hours|how much|how much is it|how much does it cost|what time does it close|what about sunday|on sunday)$/.test(q)&&!state.tenant&&state.options.length>1)return {result:result('Which store do you mean: '+state.options.join(', ')+'?','clarification'),state:{...state,pending:'choose-store'}};
 if(!explicit.length&&state.pending==='dining'&&/^(anything|any|any food|show (?:me )?options|options|anything is fine|chochote)$/.test(q))resolved='list restaurants';
 if(!explicit.length&&/^(where can (?:i|we) eat|(?:i am|im) hungry|food|restaurants|dining|niko food|nataka food|is there food|any food)$/.test(q))return {result:result(state.language==='sw'?'Ungependa chakula gani—burger, pizza au kahawa?':'What are you in the mood for—burgers, pizza or coffee?','dining-preference'),state:{...state,tenant:'',topic:'dining-preference',options:[],pending:'dining'}};
 let r=contentAnswer(resolved===q&&!interpreted.language?original:resolved,state.topic,now);
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
export function dialogueTurn(message,tenants,previous,now=new Date()){
 const turn=dialogueCore(message,tenants,previous,now);
 return {...turn,result:localizeAnswer(turn.result,turn.state,interpretLanguage(message).query,now)};
}
export function conversationTurn(message,history,tenants,supplied={},now=new Date()){
 let state=cleanState(supplied,tenants);
 // Replay when the browser has no structured state (including older clients).
 if(!supplied||supplied.version!==1){state=empty();for(const m of history)if(m.role==='user')state=dialogueTurn(m.content,tenants,state,now).state;}
 return dialogueTurn(message,tenants,state,now);
}
