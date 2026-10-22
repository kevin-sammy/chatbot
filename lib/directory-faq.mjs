import faq from '../data/directory-faq.json' with {type:'json'};
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export const directoryFAQSection=id=>faq.sections.find(s=>s.id===id)||null;
export function directoryFAQQuery(question){
 const q=normalize(question);
 return faq.sections.find(s=>[s.questionEn,s.questionSw].some(v=>normalize(v)===q))||null;
}
const categorySw={
 Hypermarket:'supermarket',Homeware:'vifaa vya nyumbani','Home & Kitchen':'vifaa vya nyumbani na jikoni',
 'Electronics & Appliances':'elektroniki na vifaa vya nyumbani','Furniture & Homeware':'samani na vifaa vya nyumbani',
 Accessories:'vifaa vya nyongeza',Gifts:'zawadi',Lifestyle:'bidhaa za maisha ya kila siku',Fashion:'mavazi',Kids:'watoto',
 'Coffee Shop':'kahawa',Restaurant:'mkahawa',Dining:'chakula','Cafe':'kahawa','Vegetarian':'chakula cha mboga',
 'Dining/Coffee':'chakula na kahawa','Indian Fast Food & Bar':'chakula cha Kihindi na baa','Turkish Restaurant':'mkahawa wa Kituruki',
 'Fast Food/Dining':'chakula cha haraka','Nyama Choma':'nyama choma',Burgers:'burger',Ribs:'mbavu',Wings:'mabawa ya kuku',
 Creamery:'aiskrimu','Icecream Outlet':'aiskrimu','Frozen Yogurt Specialty':'mtindi uliogandishwa','Boba Drink':'kinywaji cha boba','Teas and Cold Drinks':'chai na vinywaji baridi',
 Clothing:'mavazi',Denim:'mavazi ya denim',Menswear:'mavazi ya wanaume',Luxury:'bidhaa za kifahari',"Men's Fashion":'mavazi ya wanaume',
 'African Fashion':'mavazi ya Kiafrika','Lingerie Shop':'nguo za ndani',Footwear:'viatu','Shoe Specialty Store':'viatu',
 'Sports and Fitness':'michezo na mazoezi',Activewear:'mavazi ya mazoezi',Sneakers:'viatu vya kawaida na michezo',Sportswear:'mavazi ya michezo',
 Beauty:'urembo',Fragrance:'manukato',Cosmetics:'vipodozi',Perfumery:'manukato','Personal Care':'usafi na utunzaji binafsi',Skincare:'utunzaji wa ngozi',Hair:'nywele',
 'Executive Barbershop':'kinyozi','Hair & Beauty':'nywele na urembo',Massage:'masaji',Health:'afya','Health and Wellness':'afya na ustawi',
 Pharmacy:'duka la dawa',Wellness:'ustawi','Fresh Produce':'mazao mabichi','Healthy Food':'chakula bora','Health Food Store':'vyakula vya afya','Organic Specialty':'bidhaa za kilimo hai',Eyewear:'miwani',
 Electronics:'elektroniki',Apple:'bidhaa za Apple',Phones:'simu','Mobile Accessories':'vifaa vya simu','Mobile Repair':'ukarabati wa simu','Mobile & Accessories':'simu na vifaa vyake','Apple Mac Specialty Products':'bidhaa za Apple Mac','Digital & IT solutions':'huduma za kidijitali na TEHAMA',
 Carpets:'mazulia',Interiors:'mapambo ya ndani',Rugs:'mazulia',Furniture:'samani','Home and Living':'vifaa vya nyumbani','Office Furniture':'samani za ofisi',
 Banking:'benki','Banking Hall':'huduma za benki',Bank:'benki','Financial Services':'huduma za kifedha','Foreign exchange':'kubadilisha fedha','Forex Bureau':'kubadilisha fedha','Postal Service':'kutuma vifurushi na barua',
 Entertainment:'burudani',Cinema:'sinema',Movies:'filamu',Fun:'burudani',Bookstore:'duka la vitabu','Kids Entertainment':'burudani za watoto','Play Area for Toddlers':'eneo la kucheza watoto wadogo',
 Adventure:'shughuli za nje','Camping Solutions':'vifaa vya kambi',Hiking:'matembezi ya milimani','Bee Products':'bidhaa za ufugaji nyuki',Honey:'asali','Maasai Market':'soko la bidhaa za Kimaasai',Jewellery:'vito',
};
const floorSw=s=>String(s||'eneo halijatajwa').replace(/Ground Floor/g,'ghorofa ya chini').replace(/First Floor/g,'ghorofa ya kwanza').replace(/Second Floor/g,'ghorofa ya pili').replace(/New Wing/g,'jengo jipya').replace(/Outdoor/g,'nje');
export function directoryFAQAnswer(section,tenants,language='en',offset=0){
 const sw=['sw','sheng'].includes(language);
 // Hints select current records only: no store or operational fact is created here.
 const stores=section.storeHints.map(n=>tenants.find(t=>t.name===n)).filter(Boolean);
 const start=stores.length?Math.min(offset,Math.floor((stores.length-1)/6)*6):0;
 const choices=stores.slice(start,start+6);
 const hasMore=start+choices.length<stores.length;
 if(!choices.length)return null;
 const rows=choices.map(t=>{
  const tags=(t.categories||'').split(',').map(c=>c.trim()).filter(c=>c&&!['Shopping','Services','Kiosk'].includes(c));
  const descriptions=sw?tags.map(c=>categorySw[c]).filter(Boolean):tags;
  const status=t.status==='opening-soon'?(sw?' — inafunguliwa hivi karibuni':' — Coming soon'):t.status==='unknown'?(sw?' — hali haijathibitishwa':' — status unconfirmed'):'';
  return '• '+t.name+' — '+(sw?floorSw(t.floor):(t.floor||'floor not published'))+(descriptions.length?' — '+[...new Set(descriptions)].slice(0,2).join(', '):'')+status+(t.refreshStatus?(sw?' (taarifa ya awali; thibitisha)':' (earlier record; confirm)'):'');
 });
 const dates=choices.map(t=>Date.parse(t.verifiedAt)).filter(Number.isFinite);
 const verifiedAt=dates.length===choices.length?new Date(Math.min(...dates)).toISOString():null;
 const heading=sw?'Baadhi ya chaguo zilizoorodheshwa za '+section.labelSw+' Galleria:':'Some directory options for '+section.labelEn+' at Galleria:';
 const warning=sw?'Thibitisha bidhaa, bei na huduma maalum na duka; kuorodheshwa si uthibitisho kuwa limefunguliwa sasa.':'Confirm specific products, prices and services with the outlet; a listing is not a live opening-status check.';
 const next=(sw?'Ungependa kujua kuhusu duka gani?':'Which outlet would you like to know about?')+(hasMore?(sw?' Unaweza pia kusema “nionyeshe zaidi”.':' You can also say “show more”.'):'');
 return {answer:heading+'\n'+rows.join('\n')+'\n'+warning+' '+next,
  sources:choices.map(t=>({title:t.name,url:t.url,original:t.url})),context:choices,topic:'directory-faq',faqSection:section.id,faqOffset:start,verifiedAt,fixedAnswer:true};
}
