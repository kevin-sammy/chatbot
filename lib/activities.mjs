import evidence from '../data/activities.json' with {type:'json'};
const source=t=>({title:t.name,url:t.local,original:t.url});
const facilities=[
 {id:'swimming',name:'swimming pool',query:/\bswim(?:ming)?\b|\bpool\b/,tags:/(?:^|,)\s*(?:swimming|swimming pool|aquatic centre)\s*(?:,|$)/i},
 {id:'ice-skating',name:'ice-skating rink',query:/\bice[ -]skat(?:e|es|ing)?\b|\bice rink\b/,tags:/ice[ -]skat|ice rink/i},
 {id:'roller-skating',name:'roller-skating rink',query:/\broller[ -]skat(?:e|es|ing)?\b|\broller rink\b/,tags:/roller[ -]skat|roller rink/i},
 {id:'bowling',name:'bowling',query:/\bbowl(?:ing)?\b/,tags:/\bbowling\b/i},
 {id:'billiards',name:'pool tables or snooker',query:/\bpool tables?\b|\bsnooker\b|\bbilliards?\b/,tags:/billiard|snooker|pool table/i},
 {id:'gym',name:'gym or fitness centre',query:/\bgym\b|work ?out|fitness (?:centre|center)/,tags:/fitness gym|fitness centre|fitness center|\bgym\b/i},
 {id:'mini-golf',name:'mini-golf facility',query:/\bmini ?golf\b|\bminigolf\b/,tags:/mini ?golf/i},
 {id:'trampoline',name:'trampoline activity',query:/\btrampolin(?:e|es|ing)\b/,tags:/trampoline/i}
];
const official={title:'Galleria attractions',url:'/mirror/attractions/index.html',original:'https://galleria.co.ke/attractions/'};
function alternatives(tenants){
 return ['G-Fun Club','Fun Factory'].map(n=>tenants.find(t=>t.name.trim()===n&&t.status!=='opening-soon')).filter(Boolean);
}
export function activityAnswer(q,tenants,lastTopic=''){
 // Merchandise and equipment requests are handled by shopping, not facility availability.
 if(/\b(buy|purchase|sell|shop|swimwear|swimsuit|goggles|costume)\b/.test(q))return null;
 let activity=facilities.find(f=>f.query.test(q));
 if(/pool tables?|snooker|billiard/.test(q))activity=facilities.find(f=>f.id==='billiards');
 if(lastTopic==='activity-skating-clarification'&&/^(ice|roller)( skating)?$/.test(q))activity=facilities.find(f=>f.id===(q.startsWith('ice')?'ice-skating':'roller-skating'));
 const general=/things to do|what (?:can|could|should) (?:i|we) do(?: (?:here|there|at (?:the )?(?:mall|galleria)|in galleria))?(?: today)?$|what activities|what.*fun.*do|have (?:some )?fun|fun activities|entertainment options/.test(q);
 if(!activity&&!general&&/\bskat(?:e|es|ing)\b/.test(q))return {answer:'Do you mean ice skating or roller skating? I could not verify either type of rink in the official Galleria pages checked. I can also show the activities listed on the website.',sources:[official],context:[],topic:'activity-skating-clarification',verifiedAt:evidence.checkedAt};
 if(!activity&&!general)return null;
 const listed=activity?tenants.filter(t=>activity.tags.test(t.categories||'')):[];
 if(listed.length){
  const active=listed.filter(t=>t.status!=='opening-soon');const options=active.length?active:listed;
  return {answer:'Galleria’s directory lists '+activity.name+' at:\n'+options.map(t=>'• '+t.name+' — '+(t.floor||'floor not published')+(t.status==='opening-soon'?' — marked Opening Soon':'')).join('\n')+(active.length?'\nAsk about the outlet for published hours. Confirm activity prices and availability with the operator.':'\nThe website does not confirm that this activity is operating yet. Check the opening date with Galleria on 0704 498463.'),sources:options.map(source),context:options,topic:'activity-'+activity.id,verifiedAt:evidence.checkedAt};
 }
 const options=alternatives(tenants);
 let answer=activity?'I could not find a confirmed '+activity.name+' listing in Galleria’s official attractions and store pages. Please check with the mall on 0704 498463 before making plans for that activity.':'Galleria’s website lists these activities for children:';
 if(options.length)answer+=(activity?'\nFor children, the published alternatives include:':'')+'\n'+options.map(t=>'• '+t.name+' — '+t.floor).join('\n');
 const zigzag=tenants.find(t=>t.name==='Zig Zag');
 if(zigzag&&/bowling|soft play/i.test(zigzag.categories))answer+='\nZig Zag lists bowling and soft play on '+zigzag.floor+(zigzag.status==='opening-soon'?', but is marked Opening Soon.':'. Confirm current availability with the operator.');
 answer+='\nWould you like information about children’s activities, dining or events?';
 return {answer,sources:[official,...options.map(source),...(zigzag?[source(zigzag)]:[])],context:[...options,...(zigzag?[zigzag]:[])],topic:activity?'activity-'+activity.id:'activities',verifiedAt:evidence.checkedAt};
}
