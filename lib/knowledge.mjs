import knowledge from '../data/knowledge.json' with {type:'json'};
export const verifiedAt=knowledge.verifiedAt;
export function lookupAnswer(id){
 const item=knowledge.answers?.find(a=>a.id===id);
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
