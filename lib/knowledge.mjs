import knowledge from '../data/knowledge.json' with {type:'json'};
import overrides from '../data/manual-overrides.json' with {type:'json'};
import tenants from '../data/tenants.json' with {type:'json'};
import {nairobiDay} from './content.mjs';
export const verifiedAt=knowledge.verifiedAt;
export function lookupAnswer(id){
 const manual=overrides.entries.filter(r=>r.topic===id&&r.approved===true&&r.verifiedAt&&typeof r.text==='string'&&r.text.trim()&&/^https:\/\/(?:www\.)?galleria\.co\.ke\//.test(r.url)&&(!r.expiresAt||r.expiresAt>=nairobiDay()));
 if(new Set(manual.map(r=>r.text)).size>1)return {answer:'The approved records conflict on that detail. Please confirm with Galleria on 020 2363063 or 0704 498463, or info@galleria.co.ke.',sources:manual.map(r=>({title:'Approved official information',url:r.url,original:r.url})),context:[],topic:id,fixedAnswer:true};
 if(manual.length){const r=manual[0];return {answer:r.text,sources:[{title:'Approved official information',url:r.url,original:r.url}],context:[],topic:id,verifiedAt:r.verifiedAt,fixedAnswer:true};}
 const item=knowledge.answers?.find(a=>a.id===id);
 if(item&&id==='store-count')return {answer:`The checked directory contains ${tenants.length} store listings, including ${tenants.filter(t=>t.status==='opening-soon').length} marked Opening Soon. A listing is not confirmation that a store is currently open.`,sources:[item.source],context:[],topic:id,fixedAnswer:true};
 return item?{answer:item.answer,sources:[item.source],context:[],topic:id,verifiedAt:knowledge.verifiedAt,fixedAnswer:['parking-rates','noticeboard-rates','flyer-rates','activation-rates'].includes(id)}:null;
}
export function faqIntent(q,topic=''){
 if(/\b(parking|park|carpark|car park)\b/.test(q)||/lost (parking )?ticket/.test(q)){
  if(/hour|open|clos/.test(q)&&!/rate|cost|price|charge|fee/.test(q))return 'parking-hours';
  if(/how many|capacity|bays|spaces|available spaces/.test(q))return 'parking-capacity';
  if(/\b(pay|payment|mpesa|m pesa)\b/.test(q))return 'parking-payment';
  if(/where|silo|entrance|locat|covered|shade/.test(q)&&!/rate|cost|price|charge|fee/.test(q))return 'parking-location';
  return 'parking-rates';
 }
 if(topic.startsWith('parking-')&&/^(what time (does it|do they) (open|close)|when (does it|do they) (open|close)|what about (the )?hours)/.test(q))return 'parking-hours';
 if(topic.startsWith('parking-')&&/^(and |what about |how about )?(the )?(rates?|fees?|charges?|cost|prices?|payment|how (do i|to) pay|is it free)[ ?]*$/.test(q))return /pay/.test(q)?'parking-payment':'parking-rates';
 if(/gift ?(voucher|card|certificate)|\bvouchers?\b|management office|office hours/.test(q))return 'gift-vouchers';
 if(/notice ?board|\ba[1-5]\b.*poster|poster.*\ba[1-5]\b/.test(q))return 'noticeboard-rates';
 if(/flyer/.test(q))return 'flyer-rates';
 if(/atrium|activation.*(rate|cost|price|fee)|(?:cost|price|rate|fee).*activation/.test(q))return 'activation-rates';
 if(/how many.*(store|shop|outlet)|number of.*(store|shop|outlet)/.test(q))return 'store-count';
 if(/advertis|activation|marketing|exhibition|promotional space/.test(q))return 'advertising';
 if(/leas(e|ing)|rent.*(space|shop|unit)|shop.*rent/.test(q))return 'leasing';
 if(/pet friendly|bring.*(pet|dog|cat)|(?:pets?|dogs?|cats?).*(allow|policy|rule)|^(pets?|dogs?)$/.test(q))return 'pets';
 if(/smok/.test(q))return 'smoking';
 if(/photograph|videograph|filming|take.*(photo|video)/.test(q))return 'photography';
 if(/security check|security screen/.test(q))return 'security';
 if(/kids|children|toddler|play ?area|playground|child.*activit/.test(q)&&!/cloth|shoe|uniform|store|shop/.test(q))return 'kids-activities';
 if(/\b(events?|concert|puppet show|live music|happening|weekend activities)\b/.test(q))return 'events';
 if(/\b(deals?|offers|discounts?|promotions?)\b/.test(q))return 'deals';
 if(/mall map|floor plan|mall layout/.test(q))return 'mall-map';
 return null;
}
export function genericIntent(q,topic='',hasTenantContext=false){
 if(/(mall|galleria).*(hour|open|clos)|(?:hour|open|clos).*(mall|galleria)/.test(q))return 'mall-hours';
 if(!hasTenantContext&&/when.*(open|clos)|opening hours|closing time|what time.*(open|clos)|^(mall )?hours$/.test(q))return 'mall-hours';
 if(topic==='mall-hours'&&/sunday|saturday|today|tomorrow|weekend|holiday/.test(q))return 'mall-hours';
 if(/\b(contact|phone|telephone|email|enquir|help ?desk)\b|customer service/.test(q)){if(!hasTenantContext||/mall|galleria|customer service/.test(q))return 'mall-contact';return null;}
 if(/\b(directions?|address|matatu|bus|rongai|kiserian|karen|uber|bolt)\b|where.*(mall|galleria)|how.*get.*(mall|galleria)/.test(q)){if(!hasTenantContext||/mall|galleria|matatu|bus|rongai|kiserian|karen|uber|bolt/.test(q))return 'directions';return null;}

 return null;
}
export function categoryQuery(q,tenants=[]){
 if(/\b(phone|mobile)\b/.test(q)&&/\b(number|contact|telephone|email)\b/.test(q))return null;
 const groups=[
 ['burgers',/\bburgers?\b/,/\bburgers?\b/i],
 ['pizza',/\bpizzas?\b/,/\bpizza\b/i],
 ['chicken',/\bchicken\b/,/\bchicken\b/i],
 ['shoe repairs',/shoes?.*repair|repair.*shoes?/,/shoe repair/i],
 ['mobile repairs',/(?:phone|mobile).*(?:repair|fix)|(?:repair|fix).*(?:phone|mobile)/,/mobile repair/i],
 ['furniture repairs',/furniture.*repair|upholster/,/furniture repair|upholstery/i],
 ['shoe cleaning',/shoes?.*(?:clean|polish|shine)|(?:clean|polish|shine).*shoes?/,/shoe shine/i],
 ['hair salons and barbers',/haircut|hair cut|salon|barber|hair ?styl/,/barber|hair & beauty|hair and beauty|salon|hair styl/i],
 ['dry cleaning',/dry ?clean|laundry|clean.*cloth/,/dryclean/i],
 ['pet supplies',/pet food|pet suppl|aquarium|fish tank/,/pet|aquarium/i],
 ['supermarkets and groceries',/supermarket|grocer/,/supermarket|hypermarket|grocer/i],
 ['pharmacies',/pharmac|chemist|medicine/,/pharmac|chemist/i],
 ['banks',/\bbanks?\b|\batm\b|withdraw.*cash/,/banking|bank\b/i],
 ['cinema',/cinema|\bmovies?\b|\bfilms?\b/,/cinema|movies/i],
 ['bookshops',/\b(bookshops?|books|stationery|textbooks)\b/,/bookstore|book ?shop|stationery|text book center/i],
 ['printing and copying',/print|photocopy|copying/,/print|photocopy|chapacopy/i],
 ['car care',/car wash|auto care|car service|car repair|car tint/,/automotive|tint|car wash|auto care|autoxpress|extreme clean/i],
 ['school uniforms',/uniform/,/uniform/i],
 ['footwear',/shoes?|sneaker|footwear/,/footwear|shoe|sneaker/i],
 ['fashion',/cloth|fashion|\bdress(?:es)?\b|apparel/,/fashion|clothing|apparel/i],
 ['phone and mobile-accessory outlets',/\bphones?\b|\bmobile\b/,/(?:^|,)\s*(?:Phones|Mobile & Accessories|Mobile Accessories|Mobile Telecom & Accessories)\s*(?:,|$)/i],
 ['electronics',/electronic|laptop|computer|appliance/,/electronic|computer|appliance|digital & it/i],
 ['furniture stores',/furniture|sofa|bed ?frame/,/(?:^|,)\s*Furniture\s*(?:,|$)|furniture & homeware|interiors/i],
 ['homeware and furniture',/furniture|homeware|home ware|home decor|kitchen|household|bed ?sheet|towels?/,/furniture|homeware|home & kitchen|interiors/i],
 ['perfumes',/perfume|fragrance/,/perfumer|fragrance/i],
 ['jewellery and accessories',/jewell?ery|accessor|watches|handbag/,/jewell?ery|accessories|watches/i],
 ['toys',/\btoys?\b/,/toy store|kids toys/i],
 ['sportswear and equipment',/sports? ?wear|sports? equipment|activewear|trainers/,/sports|activewear|trainers/i],
 ['foreign exchange',/forex|foreign exchange|exchange.*currency|change.*dollars/,/forex|foreign exchange/i],
 ['beauty',/beauty|cosmetic|makeup|make up|skincare/,/beauty|cosmetic|skincare/i],
 ['ice cream and frozen yoghurt',/\bice ?cream\b|frozen yog(?:h)?urt/,/creamery|icecream|frozen yogurt/i],
 ['restaurants and cafés',/restaurants?|\bdining\b|\beat\b|\bfood\b|\bcafes?\b|coffee|lunch|dinner|breakfast|hungry|grab.*bite|something to eat/,/\bdining\b|restaurant|coffee shop|cafe/i],
 ['bars',/\bbars?\b|cocktail/,/\bbar\b|lounge|cocktail/i]
 ];
 const matched=groups.find(([label,pattern])=>pattern.test(q)&&!(label==='phone and mobile-accessory outlets'&&/number|contact|telephone|email/.test(q)));
 if(matched)return matched;
 // Use actual directory categories as a fallback for service/product words not in the phrase list.
 const singular=w=>w.length>3&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w;
 const words=new Set(q.split(' ').map(singular));
 const generic=new Set(['shopping','shop','store','retail','service','accessory','and','for','the','with']);
 const tags=[...new Set(tenants.flatMap(t=>(t.categories||'').split(',').map(s=>s.trim()).filter(Boolean)))];
 const candidates=tags.map(tag=>({tag,terms:tag.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').map(singular).filter(w=>w.length>2&&!generic.has(w))})).filter(({terms})=>terms.length&&terms.every(w=>words.has(w))).sort((a,b)=>b.terms.length-a.terms.length);
 if(candidates.length){const tag=candidates[0].tag;return [tag,null,{test:categories=>categories.split(',').some(c=>c.trim()===tag)}];}
 const shoppingWords=new Set('where can i we you my our your us this that these those on kind kinds type types different good best suggest suggestions near want looking available offer selection find today now window do does have has go shop shops shopping stores store outlet outlets retail what which are is there here at in the a an all me show list options some visit buy get things stuff something want to could would like for mall galleria ground first second floor floors new wing outdoor nearby around looking any available recommend places place please tell of and'.split(' '));
 const broadShopping=/\b(shopping|shops?|stores?|retail|outlets?)\b/.test(q)&&q.split(' ').every(w=>shoppingWords.has(w));
 if(broadShopping||/\b(buy|get) (some )?(things|stuff|something)\b/.test(q))return ['shopping',null,/\bshopping\b|retail store/i];
 return null;
}
