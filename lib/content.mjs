import rawCatalog from '../data/catalog.json' with {type:'json'};
import overrides from '../data/manual-overrides.json' with {type:'json'};
export function applyStructuredOverrides(data,entries){
 const mapped={...data};
 for(const kind of ['events','deals'])mapped[kind]=(data[kind]||[]).map(record=>{
  const approved=entries.filter(e=>e.approved===true&&e.verifiedAt&&e.recordId===record.id&&e.url===record.url&&officialURL(e.url)&&e.fields&&typeof e.fields==='object');
  const fields={};let conflict=false;
  for(const entry of approved)for(const key of ['startDate','endDate','validUntil','startTime','endTime','venue','price']){
   const value=entry.fields[key];if(typeof value!=='string'||value.length>200)continue;
   if(/Date$|validUntil/.test(key)&&!/^20\d{2}-\d{2}-\d{2}$/.test(value))continue;
   if(/Time$/.test(key)&&!/^\d{2}:\d{2}$/.test(value))continue;
   if(fields[key]&&fields[key]!==value)conflict=true;
   fields[key]=value;
  }
  return {...record,...fields,conflict:record.conflict||conflict,manualVerifiedAt:approved.at(-1)?.verifiedAt};
 });
 return mapped;
}
export const officialURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&['galleria.co.ke','www.galleria.co.ke'].includes(u.hostname)&&!u.username&&!u.password;}catch{return false;}};
export const nairobiDay=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const clock=(now=new Date())=>({date:nairobiDay(now),time:new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now),timezone:'Africa/Nairobi'});
const addDays=(day,n)=>{const d=new Date(day+'T12:00:00+03:00');d.setUTCDate(d.getUTCDate()+n);return nairobiDay(d);};
const words=text=>String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{3,}/g)||[];
const stop=new Set('the and what where can with there this does are for please have galleria mall which'.split(' '));
export function requestedDates(q,now=new Date()){
 const today=nairobiDay(now),day=new Date(today+'T12:00:00+03:00').getUTCDay();
 if(/\btoday\b|\bleo\b/.test(q))return {start:today,end:today};
 if(/\btomorrow\b|\bkesho\b/.test(q))return {start:addDays(today,1),end:addDays(today,1)};
 if(/weekend|wikendi/.test(q)){const sat=addDays(today,day===0?-1:(6-day+7)%7);return {start:sat,end:addDays(sat,1)};}
 const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
 const wd=weekdays.findIndex(d=>new RegExp('\\b'+d+'\\b').test(q));
 if(wd>=0){const start=addDays(today,(wd-day+7)%7);return {start,end:start};}
 const iso=q.match(/\b(20\d{2}-\d{2}-\d{2})\b/);if(iso)return validRange(iso[1]);
 const names=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const match=q.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(20\d{2}))?\b/);
 const reverse=q.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/);
 if(match||reverse){const m=match?match[1]:reverse[2],d=match?match[2]:reverse[1],y=(match||reverse)[3]||today.slice(0,4);return validRange(`${y}-${String(names.indexOf(m.slice(0,3))+1).padStart(2,'0')}-${d.padStart(2,'0')}`);}
 return null;
}
function validRange(date){const parsed=new Date(date+'T12:00:00+03:00');return !Number.isNaN(+parsed)&&nairobiDay(parsed)===date?{start:date,end:date}:null;}
const catalog=applyStructuredOverrides(rawCatalog,overrides.entries);
export function currentRecord(r,now=new Date()){
 if(!officialURL(r.url)||r.conflict||/cancelled|canceled|expired/i.test(r.status||''))return false;
 const today=nairobiDay(now),end=r.endDate||r.validUntil||r.startDate;
 if(!end||!/^20\d{2}-\d{2}-\d{2}$/.test(end))return false;
 if(end<today)return false;
 if(end===today&&r.endTime&&/^\d{2}:\d{2}$/.test(r.endTime)&&r.endTime<clock(now).time.slice(0,5))return false;
 return true;
}
export function retrieve(question,result,now=new Date(),data=catalog){
 const query=words(question+' '+(result.tenant||'')).filter(w=>!stop.has(w));
 const activeURLs=new Set([...(data.events||[]),...(data.deals||[])].filter(r=>currentRecord(r,now)).map(r=>r.url));
 const candidates=[...(data.chunks||[]),...overrides.entries.filter(r=>r.approved===true&&r.verifiedAt&&officialURL(r.url)&&(!r.expiresAt||r.expiresAt>=nairobiDay(now))).map(r=>({...r,text:r.text||r.transcription,id:'M:'+r.id}))];
 const focusedURL=result.tenant?(result.context||[]).find(t=>t.name===result.tenant)?.url:null;
 return candidates.filter(c=>officialURL(c.url)&&(!focusedURL||c.url===focusedURL)&&(!['event','deal'].includes(c.pageType)||activeURLs.has(c.url))).map(c=>{
  const body=words(c.title+' '+c.text),set=new Set(body),title=String(c.title).toLowerCase();
  const score=query.reduce((n,w)=>n+(set.has(w)?1:0)+(title.includes(w)?2:0),0);
  return {...c,score};
 }).filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
}
export function relevantDeals(question,now=new Date(),data=catalog){
 const query=words(question).filter(w=>!stop.has(w)),today=nairobiDay(now);
 return (data.deals||[]).filter(r=>currentRecord(r,now)&&(!r.startDate||r.startDate<=today)&&query.some(w=>words(r.title+' '+r.description).includes(w))).slice(0,1);
}
export function contentAnswer(question,lastTopic='',now=new Date(),data=catalog){
 const q=question.toLowerCase().replace(/[’']/g,'');
 const event=/\bevents?\b|whats on|what is on|happening|book club|bookclub|this weekend|wikendi/.test(q)||lastTopic==='events'&&!!requestedDates(q,now);
 const deal=/\b(deals?|discounts?|promotions?|offers)\b/.test(q);
 if(!event&&!deal)return null;
 const kind=event?'events':'deals',range=requestedDates(q,now),today=nairobiDay(now);
 const source={title:'Galleria '+kind,url:'https://galleria.co.ke/'+kind+'/',original:'https://galleria.co.ke/'+kind+'/'};
 const all=(data[kind]||[]).filter(r=>!(/kids|children|childrens/.test(q))||/kids|children|family|families|little bakers/i.test(r.title+' '+r.description));
 if(/discount code|promo code|voucher code/.test(q))return {answer:'I don’t have a verified discount code for that request, and I can’t create one. Check the official Deals page for published offers and their terms.',sources:[source],context:[],topic:'deals',fixedAnswer:true,verifiedAt:data.lastSuccessfulCrawl};
 if(all.some(r=>r.conflict&&words(r.title).some(w=>!stop.has(w)&&words(q).includes(w))))return {answer:'The approved records conflict on that listing’s details. Please confirm with Galleria on 020 2363063 or 0704 498463, or info@galleria.co.ke.',sources:[source],context:[],topic:kind,fixedAnswer:true};
 if(/book ?club/.test(q)){
  const unconfirmed=all.find(r=>/book ?club/i.test(r.title)&&!r.startDate&&!/cancel/i.test(r.status||''));
  if(unconfirmed)return {answer:`The official page lists ${unconfirmed.title}${unconfirmed.dateLabel?' for '+unconfirmed.dateLabel:''}${unconfirmed.startTime?' at '+unconfirmed.startTime+(unconfirmed.endTime?'–'+unconfirmed.endTime:''):''}${unconfirmed.venue?', at '+unconfirmed.venue:''}. The year or complete date is not confirmed in the extracted information, so please confirm with Galleria on 0704 498463 before making plans.`,sources:[{title:unconfirmed.title,url:unconfirmed.url,original:unconfirmed.url}],context:[],topic:kind,fixedAnswer:true,verifiedAt:unconfirmed.lastCrawled};
 }
 let records=all.filter(r=>currentRecord(r,now));
 if(range)records=records.filter(r=>(r.startDate||today)<=range.end&&(r.endDate||r.validUntil||r.startDate)>=range.start);
 if(/book ?club/.test(q))records=records.filter(r=>/book ?club/i.test(r.title+' '+r.description));
 const checked=data.lastSuccessfulCrawl;
 if(!records.length){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const rangeLabels=[];if(range){let day=range.start;for(let i=0;i<8&&day<=range.end;i++,day=addDays(day,1))rangeLabels.push(Number(day.slice(8))+' '+months[Number(day.slice(5,7))-1]);}
  const uncertain=all.filter(r=>!r.startDate&&!/cancel/i.test(r.status||'')&&officialURL(r.url)&&(!range||rangeLabels.includes(r.dateLabel))).slice(0,4);
  if(uncertain.length)return {answer:`The official website has these ${kind} pages${range?' matching the published day and month':''}, but their complete dates or validity periods are not confirmed:\n`+uncertain.map(r=>'• '+r.title+(r.dateLabel?' — '+r.dateLabel+' (year not verified)':' — dates not confirmed')+(r.startTime?' at '+r.startTime+(r.endTime?'–'+r.endTime:''):'')+(r.venue?' — '+r.venue:'')).join('\n')+'\nPlease confirm the date with Galleria on 0704 498463 before making plans. Which listing would you like details about?',sources:uncertain.map(r=>({title:r.title,url:r.url,original:r.url})),context:[],topic:kind,verifiedAt:checked,fixedAnswer:true,contentOptions:uncertain.map(r=>({id:r.id,title:r.title,kind}))};
  return {answer:`I don’t have a confirmed current ${event?'event':'deal'}${range?' for '+range.start+(range.end!==range.start?' to '+range.end:''):''} in the information checked. This does not mean none are scheduled. You can check the official ${kind} page or ask Galleria on 0704 498463.`,sources:[source,...(/kids|children/.test(q)?[{title:'Galleria kids',url:'https://galleria.co.ke/kids/',original:'https://galleria.co.ke/kids/'}]:[])],context:[],topic:kind,verifiedAt:checked,fixedAnswer:true};
 }
 const selected=records.slice(0,4);
 const lines=selected.map(r=>'• '+r.title+' — '+(r.startDate||'start date not published')+((r.endDate||r.validUntil)&&((r.endDate||r.validUntil)!==r.startDate)?' to '+(r.endDate||r.validUntil):'')+(r.startTime?' at '+r.startTime:'; time not published')+(r.venue?' — '+r.venue:'')+(r.stale?' (last update failed; reconfirm details)':''));
 return {answer:'The official website lists these '+kind+(range?' for '+range.start+(range.end!==range.start?' to '+range.end:''):'')+':\n'+lines.join('\n')+'\nWould you like details about one of these?',sources:selected.map(r=>({title:r.title,url:r.url,original:r.url})),context:[],topic:kind,verifiedAt:checked,fixedAnswer:true,contentOptions:selected.map(r=>({id:r.id,title:r.title,kind}))};
}
export function contentDetail(id,kind,now=new Date(),data=catalog){
 const r=(data[kind]||[]).find(r=>r.id===id&&!r.conflict&&(currentRecord(r,now)||!r.startDate&&!r.endDate&&!r.validUntil&&!/cancel/i.test(r.status||'')&&officialURL(r.url)));if(!r)return null;
 const summary=(r.description||'Full details are available on the official page.').split(/(?<=[.!?])\s+/).slice(0,2).join(' ').slice(0,800);
 return {answer:r.title+'. '+summary+' '+(r.startDate?'Date: '+r.startDate+'. ':r.dateLabel?'Published day and month: '+r.dateLabel+'; the year is not confirmed. ':'The complete date or validity period is not confirmed. ')+((r.endDate||r.validUntil)?'Ends: '+(r.endDate||r.validUntil)+'. ':'')+(r.startTime?'Starts at '+r.startTime+'. ':'')+(r.endTime?'Ends at '+r.endTime+'. ':'')+(r.venue?'Venue: '+r.venue+'. ':'')+(r.price?r.price+'. ':'')+(r.stale?'The latest refresh failed; please confirm before visiting.':''),sources:[{title:r.title,url:r.url,original:r.url}],context:[],topic:kind,fixedAnswer:true,verifiedAt:r.lastCrawled,price:r.price||null};
}
