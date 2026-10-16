// General provider information is distinct from services confirmed for this particular outlet.
export function serviceInfo(t){
 if(t.url.endsWith('/safaricom/'))return {
  answer:'Galleria’s Safaricom listing describes voice and data communication services. It does not confirm individual tasks such as SIM registration, SIM swaps or M-Pesa support at this branch. For a specific service, call '+(t.phone||'the shop')+' before visiting. What do you need help with?',
  providerSources:[],
  scope:'Official Galleria listing only; individual branch services are unconfirmed.'
 };
 const categories=t.categories.split(',').map(c=>c.trim()).filter(c=>!['Shopping','Services','Kiosk'].includes(c));
 const description=(t.description||'').split(/(?<=[.!?])\s/).filter(s=>!/only network|3g|wimax/i.test(s)).slice(0,2).join(' ');
 return {answer:t.name+' is listed for '+(categories.join(', ')||'the services described in its directory entry')+'. '+(description?description+' ':'')+'What specific service or product do you need? '+(t.phone?'You can confirm availability directly on '+t.phone+'.':''),providerSources:[],scope:'Published directory categories and description; no guarantee of a specific product or service.'};
}
