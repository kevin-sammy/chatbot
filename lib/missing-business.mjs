export function missingBusiness(question,q,tenants){
 let target;
 const patterns=[/^(?:is|are) there (?:a |an |any )?(.+?)(?: (?:at|in|inside) (?:the )?(?:galleria|mall).*)?\??$/i,/^(?:do you have|does galleria have|have you got) (?:a |an )?(.+?)\??$/i,/^where (?:is|can i find) (?:the |a |an )?(.+?)(?: (?:at|in) galleria)?\??$/i];
 for(const p of patterns){const m=question.trim().match(p);if(m){target=m[1].trim();break;}}
 const knownFood=/\b(mcdonalds|mc donalds|burger king|starbucks|dominos|domino s)\b/.test(q);
 if(!target&&knownFood)target=/mcdonalds|mc donalds/.test(q)?'McDonald’s':q;
 if(!target||target.length>100)return null;
 const targetWords=target.toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
 if(!targetWords||/^(it|they|that|there|here|the store|the shop|a shop|shops|stores|anything|something|open|available)$/.test(targetWords))return null;
 const dirSource={title:'Galleria store directory',url:'/mirror/stores/index.html',original:'https://galleria.co.ke/stores/'};
 if(knownFood){
  const preferred=/starbucks/.test(q)?['Artcaffe','Java House']:/domino/.test(q)?['Pizza Hut']:['RocoMamas','KFC','Pizza Hut'];
  const options=preferred.map(n=>tenants.find(t=>t.name===n&&t.status!=='opening-soon')).filter(Boolean);
  return {answer:'I don’t see '+target+' in the Galleria directory I checked. '+(options.length?'For food, you could try these listed alternatives:\n'+options.map(t=>'• '+t.name+' — '+t.floor).join('\n')+'\nWhat are you in the mood for?':'Would you like to see the restaurants listed at the mall?'),sources:[dirSource,...options.map(t=>({title:t.name,url:t.local,original:t.url}))],context:options,topic:'missing-business'};
 }
 return {answer:'I don’t see '+target+' in the Galleria directory I checked. What are you looking for—food, clothing, electronics or a particular service? I can suggest a listed alternative.',sources:[dirSource],context:[],topic:'missing-business'};
}
