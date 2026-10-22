// Summarize only categories and descriptions from the shared official record.
// These terms classify evidence; they never supply a restaurant's menu by name.
const terms=[
 [/artisanal bread|\bbread\b/i,'bread','mikate'],[/pastr(?:y|ies)/i,'pastries','vitafunwa vya kuokwa'],
 [/\bcoffee\b/i,'coffee','kahawa'],[/cocktails?/i,'cocktails','kokteli'],[/\bbreakfast\b/i,'breakfast','kifungua kinywa'],
 [/smashburgers?|\bburgers?\b/i,'burgers','burger'],[/\bribs\b/i,'ribs','mbavu'],[/\bwings\b/i,'wings','mabawa ya kuku'],
 [/\bshakes\b|milkshakes?/i,'shakes','vinywaji vya maziwa'],[/waffles?/i,'waffles','waffle'],[/\bpizza\b/i,'pizza','pizza'],
 [/ice\s*cream|creamery/i,'ice cream','aiskrimu'],[/frozen yog(?:h)?urt/i,'frozen yogurt','mtindi uliogandishwa'],
 [/boba|bubble tea/i,'boba drinks','vinywaji vya boba'],[/\btea\b|\bteas\b/i,'tea','chai'],[/nyama choma/i,'nyama choma','nyama choma'],
 [/sandwich/i,'sandwiches','sandwichi'],[/salad/i,'salads','saladi'],[/indian/i,'Indian cuisine','chakula cha Kihindi'],
 [/turkish/i,'Turkish cuisine','chakula cha Kituruki'],[/\bpasta\b/i,'pasta','pasta'],[/\bchicken\b/i,'chicken','kuku'],[/\bfries\b/i,'fries','chipsi'],[/biryan/i,'biryani','biryani'],[/curr(?:y|ies)/i,'curries','kari'],[/\bdesserts?\b/i,'desserts','vitindamlo'],[/casual dining|\brestaurant\b/i,'restaurant dining','chakula cha mkahawani'],
 [/furniture/i,'furniture','samani'],[/homeware|household/i,'homeware','vifaa vya nyumbani'],[/electronics?/i,'electronics','vifaa vya elektroniki'],
 [/hardware/i,'hardware','vifaa vya ujenzi na matengenezo'],[/grocer|hypermarket/i,'groceries','bidhaa za vyakula'],
 [/cosmetic/i,'cosmetics','vipodozi'],[/skincare/i,'skincare','bidhaa za kutunza ngozi'],[/perfume|fragrance/i,'fragrances','manukato'],
 [/\bclothing\b|menswear|fashion/i,'clothing','mavazi'],[/footwear|\bshoes\b|sneakers/i,'footwear','viatu'],
 [/eye tests?|eye examination/i,'eye tests','uchunguzi wa macho'],[/eyewear|glasses|frames/i,'eyewear','miwani'],
 [/shoe repair/i,'shoe repairs','ukarabati wa viatu'],[/upholstery|furniture repair/i,'furniture repairs and upholstery','ukarabati wa samani'],
 [/dryclean|laundry/i,'dry cleaning','usafishaji wa nguo'],[/printing|photocopy/i,'printing services','huduma za uchapishaji'],
];
const foodTerms=terms.slice(0,terms.findIndex(([,label])=>label==='furniture'));
export const isDining=t=>/dining|restaurant|coffee|cafe|creamery/i.test(t.categories||'');
export function offeringIntent(q){
 if(/\b(?:vegan|vegetarian|halal|allerg(?:y|ies|ens?)|gluten|nut free)\b/.test(q))return 'dietary';
 if(/\bmenu\b/.test(q))return 'menu';
 if(/^(?:do|does|can)\b.*\b(?:serve|sell|offer|have|get|eat|order)\b/.test(q)&&foodTerms.some(([p])=>p.test(q)))return 'item';
 if(/\bwhat (?:do|does|can|food|products|services|dishes|meals)\b.*\b(?:serve|sell|offer|order|eat|buy|have|get|available)\b|\bwhat(?:s| is) (?:on offer|available to eat)\b|^(?:what food|food options|what do they have|what do you have|what can i order)(?: there)?$/.test(q))return 'offerings';
 return null;
}
export function offeringAnswer(t,kind,q,language='en'){
 const sw=['sw','sheng'].includes(language),price=/\bprices?|cost|how much|bei|gharama\b/.test(q);
 const text=(t.description||'')+'\n'+(t.categories||'');
 const supported=terms.filter(([pattern])=>text.split(/[.!?\n]/).some(sentence=>pattern.test(sentence)&&!(/\b(?:not|no|never|unconfirmed|doesnt|doesn’t|does not|not confirmed)\b/i.test(sentence))));
 const requested=kind==='item'?foodTerms.filter(([p])=>p.test(q)):[];
 const items=supported.slice(0,isDining(t)?6:5).map(r=>r[sw?2:1]);
 const contact=sw?(t.phone?'Wasiliana na '+t.name+' kupitia '+t.phone+'.':'Angalia ukurasa rasmi wa duka au wasiliana na Galleria kupitia 0704 498463.'):(t.phone?'Contact '+t.name+' on '+t.phone+'.':'Check its official listing or contact Galleria on 0704 498463.');
 let answer;
 if(t.status==='opening-soon')answer=sw?t.name+' imeorodheshwa kuwa inafunguliwa hivi karibuni; menyu, huduma na tarehe ya kufunguliwa havijathibitishwa. '+contact:t.name+' is marked “Opening Soon”; its menu, operating services and opening date are not confirmed. '+contact;
 else if(kind==='dietary')answer=sw?'Sina uthibitisho wa mahitaji hayo ya lishe au usalama wa vizio katika '+t.name+'. Thibitisha viambato na namna chakula kinavyoandaliwa moja kwa moja na mkahawa kabla ya kuagiza. '+contact:'I don’t have verified dietary or allergen assurances for '+t.name+'. Confirm ingredients and preparation directly with the restaurant before ordering. '+contact;
 else if(kind==='item'){
  const confirmed=requested.filter(r=>supported.includes(r)).map(r=>r[sw?2:1]),unconfirmed=requested.filter(r=>!supported.includes(r)).map(r=>r[sw?2:1]);
  answer=(confirmed.length?(sw?'Taarifa ya Galleria kuhusu '+t.name+' inataja '+confirmed.join(', ')+'. ':'Galleria’s listing for '+t.name+' mentions '+confirmed.join(', ')+'. '):'')+(unconfirmed.length?(sw?'Taarifa hiyo haithibitishi '+unconfirmed.join(', ')+'. ':'The listing does not confirm '+unconfirmed.join(', ')+'. '):'')+(sw?'Thibitisha menyu na upatikanaji wa leo na mkahawa. ':'Confirm today’s menu and availability directly with the restaurant. ')+contact;
 }
 else {
  const overview=items.length?(sw?'Taarifa rasmi ya Galleria kuhusu '+t.name+' inataja '+items.join(', ')+'. ':'Galleria’s listing for '+t.name+' mentions '+items.join(', ')+'. '):(sw?'Taarifa ya Galleria haitaji bidhaa au vyakula maalum vya '+t.name+'. ':'The Galleria listing does not describe specific items for '+t.name+'. ');
  const limitation=kind==='menu'?(sw?'Sina menyu kamili ya sasa'+(price?' wala bei zilizothibitishwa':'')+'. ' : 'I don’t have its complete current menu'+(price?' or verified prices':'')+'. '):(sw?'Thibitisha bidhaa na huduma maalum unazohitaji moja kwa moja na duka. ':'Confirm particular products and services directly with the outlet. ');
  answer=overview+limitation+contact;
 }
 if(t.refreshStatus)answer+=sw?' Sasisho la taarifa hii halikukamilika; thibitisha maelezo na duka.':' This record was retained from an earlier refresh; confirm the details with the outlet.';
 return {answer,topic:'tenant',tenant:t.name,context:[t],sources:[{title:t.name,url:t.url,original:t.url}],verifiedAt:t.verifiedAt,fixedAnswer:true,localizedOffering:true};
}
