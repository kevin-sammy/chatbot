// General provider information is distinct from services confirmed for this particular outlet.
export function serviceInfo(t){
 if(t.url.endsWith('/safaricom/'))return {
  answer:'At Safaricom, you can ask about mobile lines, voice and data services, and mobile accessories. Safaricom’s general retail information also covers SIM registration/SIM swaps and M-Pesa support; the Galleria page does not confirm every service for this branch. For a specific task, call '+(t.phone||'the shop')+' before you go. What do you need help with?',
  providerSources:[{title:'Safaricom retail services — general provider information',url:'https://www.safaricom.co.ke/media-center-landing/press-releases/safaricom-retail-shop-opens-doors-at-two-rivers-mall',original:'https://www.safaricom.co.ke/media-center-landing/press-releases/safaricom-retail-shop-opens-doors-at-two-rivers-mall'}],
  scope:'General Safaricom retail examples; Galleria-specific service availability must be confirmed.'
 };
 const categories=t.categories.split(',').map(c=>c.trim()).filter(c=>!['Shopping','Services','Kiosk'].includes(c));
 const description=(t.description||'').split(/(?<=[.!?])\s/).filter(s=>!/only network|3g|wimax/i.test(s)).slice(0,2).join(' ');
 return {answer:t.name+' is listed for '+(categories.join(', ')||'the services described in its directory entry')+'. '+(description?description+' ':'')+'What specific service or product do you need? '+(t.phone?'You can confirm availability directly on '+t.phone+'.':''),providerSources:[],scope:'Published directory categories and description; no guarantee of a specific product or service.'};
}
