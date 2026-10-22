import {customerPhrase} from './customer-phrases.mjs';
import {normalize,hoursFor} from './directory.mjs';
import translations from '../data/kiswahili.json' with {type:'json'};
import {recordForSource,requestedDates} from './content.mjs';
export function interpretLanguage(text){
 const phrase=customerPhrase(normalize(text));
 let q=phrase.query,language=phrase.language;
 if(/\b(?:in english|reply in english|answer in english|english please|jibu kwa kiingereza|kiingereza)\b/.test(q))return {query:'language english',language:'en'};
 if(/\b(?:in swahili|in kiswahili|reply in swahili|speak swahili|jibu kwa kiswahili|tumia kiswahili|ongea kiswahili|kiswahili tafadhali)\b/.test(q))return {query:'language swahili',language:'sw'};
 if(/\b(natafuta|ninahitaji|nahitaji|benki|dawa|kinyozi|saluni|manukato|ndio|ndiyo|hapana|wapi|ngapi|maduka|duka|chakula|maegesho|kesho|leo|habari|asante|niko|nataka|iko|mna|shukran|sawa|msaada|naweza|nawezaje|saa|kahawa|keki|bei|namba|simu|jumapili|jumamosi|watoto|matukio|zawadi|nguo|viatu|vitabu|nimepoteza|puuza|maagizo|onyesha|ufunguo|kuna|je|mhudumu|mikahawa|mkahawa|nafuu|bajeti|nina|menyu|chochote|jambo|kwanza|pili|tatu|nne|hapo|huko|hilo|hiyo|mnapatikana|nalipaje|huduma|vocha|samahani|nyinyi|mko|mnafungua|mnafunga|inafungua|inafungwa|ghali|pesa|inatosha|wigi|mazulia|samani|miwani|vitamini|vifurushi)\b/.test(q))language='sw';
 if(/\b(niaje|rada|msee|manze|sasa)\b/.test(q))language='sheng';
 const exact=[[/^(ndio|ndiyo|sawa|yes please|yes|sure|okay|ok|please do)( tafadhali)?$/,'yes'],[/^(hapana|la|no|no thanks|not now)( asante)?$/,'no'],[/^(asante|asante sana|shukran|thanks|thank you)$/,'thanks'],[/^(habari|habari yako|jambo|niaje|sasa|hi|hello|hey)$/,'hello'],[/^(msaada|nisaidie|nisaidie tafadhali)$/,'help'],[/^(mnafungua|mnafunga) saa ngapi$/,'what time does galleria mall open'],[/^(mko wapi|mnapatikana wapi|galleria iko wapi|mall iko wapi)$/,'where are you located'],[/^(ya kwanza|la kwanza|duka la kwanza)$/,'the first one'],[/^(ya pili|la pili|duka la pili)$/,'the second one'],[/^(ya tatu|la tatu)$/,'the third one'],[/^(ya nne|la nne)$/,'the fourth one'],[/^(hapo|huko|hilo|hiyo)$/,'there'],[/^(iko wapi|liko wapi|ipo wapi|iko ghorofa gani)$/,'where is it'],[/^(na )?jumapili$/,'on sunday'],[/^(na )?jumamosi$/,'on saturday'],[/^(mawasiliano|namba ya simu|nambari ya simu)$/,'contact phone number'],[/^(naweza|ninaweza|niweze) kuogelea$/,'can i swim']];
 for(const [pattern,value] of exact)if(pattern.test(q))return {query:value,language};
 q=q.replace(/^je /,'').replace(/^mna /,'do you have ').replace(/(?:nawezaje|ninaweza|naweza) kulipia maegesho|nalipaje maegesho/g,'how do i pay for parking').replace(/\b(?:nimepoteza|nilipoteza) simu(?: yangu)?\b/g,'lost my phone').replace(/\b(?:nimepoteza|nilipoteza) (?:pochi|mkoba)(?: wangu)?\b/g,'lost my wallet')
 .replace(/(?:nataka|naomba|nahitaji) (?:kuongea|kuzungumza) na (?:mtu|mhudumu)|ongea na mhudumu/g,'talk to a human')
 .replace(/maduka gani (?:yatafunguliwa|yanafungu(?:a|liwa)) hivi karibuni|nini kinafunguliwa hivi karibuni/g,'what is opening soon')
 .replace(/maegesho (?:yanalipwa|ninalipia) vipi|nalipia maegesho vipi|ninalipia maegesho vipi/g,'how do i pay for parking')
 .replace(/(?:saa za kazi|inafungua saa ngapi|inafungwa saa ngapi|inafungua lini|inafungwa lini|saa ngapi)/g,'opening hours')
 .replace(/(?:iko|liko|ipo|zipo) (?:wapi|floor gani|ghorofa gani)/g,'where')
 .replace(/(?:ninunue|kununua|nanunua)/g,'buy').replace(/(?:naweza|ninaweza|napata|kupata)/g,'can i get')
 .replace(/(?:kuna matukio gani|matukio gani|kuna nini|nini kinaendelea)/g,'what events').replace(/matukio/g,'events').replace(/\bkuna\b/g,'is there')
 .replace(/msimbo wa punguzo/g,'discount code').replace(/(?:punguzo|ofa)(?: gani)?/g,'deals')
 .replace(/\bnatafuta\b/g,'looking for').replace(/\b(?:ninahitaji|nahitaji)\b/g,'i need').replace(/\b(?:benki)\b/g,'bank').replace(/\b(?:kinyozi)\b/g,'barber').replace(/\b(?:saluni)\b/g,'salon').replace(/\b(?:manukato)\b/g,'perfume').replace(/\b(?:vifaa vya elektroniki)\b/g,'electronics').replace(/\b(?:vifaa vya nyumbani)\b/g,'homeware').replace(/\b(?:chakula cha asubuhi)\b/g,'breakfast').replace(/\b(?:chakula cha mchana)\b/g,'lunch').replace(/\b(?:chakula cha jioni)\b/g,'dinner')
 .replace(/duka la dawa/g,'pharmacy').replace(/\bdawa\b/g,'medicine').replace(/vocha za zawadi|vocha ya zawadi|kadi ya zawadi/g,'gift vouchers')
 .replace(/\b(?:ghali sana|ghali|nafuu zaidi)\b/g,'cheaper').replace(/\b(?:wigi|nywele bandia)\b/g,'wigs').replace(/\bmazulia\b/g,'carpets').replace(/\bsamani\b/g,'furniture').replace(/\bmiwani\b/g,'glasses').replace(/\bvitamini\b/g,'vitamins').replace(/\bvifurushi\b/g,'parcels').replace(/\bmenyu\b/g,'menu').replace(/\bmaegesho\b/g,'parking').replace(/\bbei\b/g,'price').replace(/\bgharama\b/g,'cost').replace(/\b(?:kiasi gani|shilingi ngapi|bei gani|bei ni ngapi)\b/g,'how much')
 .replace(/\bhuduma\b/g,'services').replace(/\bmaduka\b/g,'shopping').replace(/\bmikahawa\b/g,'restaurants').replace(/\bchakula\b|niko njaa|nimefeel njaa/g,'food').replace(/\bkahawa\b/g,'coffee').replace(/\bkeki\b/g,'cake').replace(/\bnguo\b/g,'clothes').replace(/\bkaranga\b/g,'nuts').replace(/matunda yaliyokaushwa/g,'dried fruit').replace(/\bviatu\b/g,'shoes').replace(/\bvitabu\b/g,'books')
 .replace(/\b(?:watoto|mtoto)\b/g,'kids').replace(/\b(?:wikendi|wikiendi)(?: hii)?\b/g,'this weekend').replace(/\bjumapili\b/g,'sunday').replace(/\bjumamosi\b/g,'saturday').replace(/\bjumatatu\b/g,'monday').replace(/\bkesho\b/g,'tomorrow').replace(/\bleo\b/g,'today')
 .replace(/\b(?:mawasiliano|nambari|namba)\b/g,'contact phone').replace(/\bsimu\b/g,'phone').replace(/\b(?:orodha ya bidhaa|bidhaa zipo|stock ipo)\b/g,'stock availability').replace(/\bkuogelea\b/g,'swimming');
 return {query:q,language};
}
const floor=s=>String(s||'eneo halijatajwa').replace(/Ground Floor/g,'ghorofa ya chini').replace(/First Floor/g,'ghorofa ya kwanza').replace(/Second Floor/g,'ghorofa ya pili').replace(/New Wing/g,'jengo jipya').replace(/Outdoor/g,'nje');
const schedule=s=>String(s).replace(/Mon(?:day)?/g,'Jumatatu').replace(/Tue(?:sday)?/g,'Jumanne').replace(/Wed(?:nesday)?/g,'Jumatano').replace(/Thu(?:rsday)?/g,'Alhamisi').replace(/Fri(?:day)?/g,'Ijumaa').replace(/Sat(?:urday)?/g,'Jumamosi').replace(/Sun(?:day)?/g,'Jumapili').replace(/Public Holidays/g,'Sikukuu').replace(/Closed/g,'Kumefungwa').replace(/midnight/g,'usiku wa manane');
const contacts='Unaweza kuwasiliana na Galleria kupitia 020 2363063 au 0704 498463, au info@galleria.co.ke.';
const categoryNames={'burgers':'burger','pizza':'pizza','restaurants and cafés':'mikahawa','fashion':'mavazi','footwear':'viatu','bookshops':'maduka ya vitabu','pharmacies':'maduka ya dawa','banks':'benki','electronics':'vifaa vya elektroniki','supermarkets and groceries':'maduka ya vyakula','hair salons and barbers':'saluni na vinyozi','perfumes':'manukato','homeware and furniture':'vifaa vya nyumbani na samani','wigs and hair extensions':'wigi na nywele za kuongeza','carpets and rugs':'mazulia','camping and hiking':'vifaa vya kambi na matembezi ya milimani','courier services':'kutuma vifurushi','eyecare and opticians':'huduma za macho na miwani','health and wellness':'afya na ustawi','nyama choma':'nyama choma','bubble tea':'chai ya boba'};
export function localizeAnswer(r,state,q,now=new Date()){
 if(!['sw','sheng'].includes(state.language))return r;
 const a=r.answer,context=r.context||[],t=context.find(t=>t.name===r.tenant),lines=context.map(t=>'• '+t.name+' — '+floor(t.floor)+(t.status==='opening-soon'?' (inafunguliwa hivi karibuni)':'')).join('\n');
 let answer;
 // A curated translation is valid only while its full English source is unchanged.
 const exact=translations[r.topic];
 if(exact&&exact.source===a)answer=exact.translation;
 else if(q==='language swahili')answer='Sawa, nitajibu kwa Kiswahili. Ungependa kujua nini kuhusu Galleria?';
 else if(q==='thanks')answer='Karibu! Kuna jambo lingine nikusaidie?';
 else if(q==='no')answer='Sawa. Niambie ukihitaji jambo lingine.';
 else if(r.topic==='directory-faq')return r;
 else if(r.topic==='help')answer='Habari! Ninaweza kukusaidia kuhusu maduka, chakula, saa za kazi au maegesho ya Galleria. Ungependa kujua nini?';
 else if(['off-topic','injection'].includes(r.topic))answer='Ninaweza kusaidia kuhusu maduka, chakula, maegesho na huduma za Galleria. Unahitaji msaada gani kuhusu Galleria?';
 else if(r.topic==='dining-preference')answer=(q==='is there food'?'Ndiyo, Galleria ina mikahawa iliyoorodheshwa. ':'')+'Ungependa chakula gani—burger, pizza au kahawa?';
 else if(r.topic==='dining-budget')answer='Ninaweza kukusaidia kutafuta chakula kulingana na bajeti yako, lakini sina bei za sasa za menyu zilizothibitishwa kusema ni chakula gani kinafaa. Ungependa mawasiliano ya mkahawa gani ili uthibitishe menyu na bei?';
 else if(r.topic==='dining-price-comparison')answer='Sina bei za sasa za menyu zilizothibitishwa za kulinganisha, hivyo siwezi kutaja kwa uhakika mkahawa wenye bei nafuu zaidi. Ninaweza kukupa mawasiliano ya mkahawa ili uthibitishe bei za chakula—ungependa mkahawa gani?';
 else if(r.topic==='unverified')answer='Sina maelezo yaliyothibitishwa kuhusu huduma hiyo kwenye taarifa rasmi nilizokagua. '+contacts;
 else if(r.topic==='human')answer=(/lost|nimepoteza/.test(q)?'Pole kwa kupoteza kitu chako. ':'')+contacts+' Kwa dharura ukiwa kwenye maduka, tafuta walinzi mara moja. Gumzo hili halikuunganishi moja kwa moja na mhudumu wala kufungua tiketi ya msaada.';
 else if(r.topic==='coming-soon')answer=lines?'Maduka haya yameorodheshwa kuwa yanafunguliwa hivi karibuni:\n'+lines+'\nTarehe za kufunguliwa hazijathibitishwa. Ungependa kujua kuhusu duka gani?':'Sina orodha iliyothibitishwa ya maduka yanayofunguliwa hivi karibuni. Angalia ukurasa rasmi wa maduka.';
 else if(r.topic==='missing-business')answer='Sioni '+(a.match(/I don’t see (.+?) in the Galleria directory/)?.[1]||'duka hilo')+' kwenye orodha ya Galleria niliyokagua. '+(lines?'Unaweza kujaribu maduka haya yaliyoorodheshwa:\n'+lines:'Unatafuta chakula, mavazi, vifaa vya elektroniki au huduma gani? Ninaweza kupendekeza duka lililoorodheshwa.');
 else if(r.topic==='category'||r.topic==='shopping'){
  const offers=(r.sources||[]).map(s=>recordForSource(s.original)).filter(r=>r&&r.url.includes('/deals/'));
  answer='Hizi ni baadhi ya chaguo za '+(categoryNames[a.match(/options for (.+?) at Galleria/)?.[1]]||'maduka haya')+' Galleria:\n'+lines+(offers.length?'\n'+offers.map(d=>d.title+' — mwisho '+(d.endDate||d.validUntil||'haujathibitishwa')).join('\n'):'')+'\nThibitisha bidhaa, bei na upatikanaji na duka. '+(state.pending==='hours'?'Ungependa kujua saa zake za kazi?':'Ungependa kujua kuhusu duka gani?');
 }
 else if(r.topic==='tenant'&&t){
  if(t.status==='opening-soon')answer=t.name+' imeorodheshwa kuwa inafunguliwa hivi karibuni'+(t.floor?', kwenye '+floor(t.floor):'')+'. Tarehe ya kufunguliwa na saa za kazi hazijathibitishwa. '+contacts;
  else if(/verify current menu prices/.test(a))answer='Sina bei za sasa za menyu zilizothibitishwa za '+t.name+'. '+(t.phone?'Piga '+t.phone+' kuomba menyu na kuthibitisha bei za chakula.':'Angalia ukurasa rasmi wa mkahawa na uthibitishe bei moja kwa moja.');
  else if(/confirmed prices|availability or booking|stock/.test(a))answer='Siwezi kuthibitisha bidhaa zilizopo, bei au nafasi za kuweka nafasi moja kwa moja. '+(t.phone?'Piga simu '+t.name+' kupitia '+t.phone+' kuthibitisha.':'Tafadhali thibitisha moja kwa moja na '+t.name+'.');
  else if(/You’ll find/.test(a))answer=t.name+' iko kwenye '+floor(t.floor)+'. Ungependa kujua saa zake za kazi?';
  else if(/published hours|Published hours/.test(a))answer=(/nuts and dried fruit/.test(a)?t.name+' iko kwenye '+floor(t.floor)+'. ':'')+'Saa za kazi zilizochapishwa za '+t.name+': '+schedule(hoursFor(t,q))+'. Hizi ni saa zilizochapishwa; si ukaguzi wa moja kwa moja kama duka limefunguliwa sasa.'+(a.includes('nuts and dried fruit')&&t.phone?' Wasiliana kupitia '+t.phone+'.':'');

  else if(/You can call|You can email|phone number|email address/.test(a))answer=(/email/.test(q)&&t.email?'Barua pepe ya '+t.name+' ni '+t.email+'.':t.phone?'Unaweza kupiga simu '+t.name+' kupitia '+t.phone+'.':'Nambari ya simu haijachapishwa kwa '+t.name+'.');
  else if(t.name==='Safaricom'&&/service|offer|provide|sell|sim|m pesa/.test(q))answer='Ukurasa wa Galleria unaeleza huduma za mawasiliano ya sauti na data za Safaricom. Haujathibitisha huduma maalum kama kubadilisha SIM au msaada wa M-Pesa katika tawi hili. '+(t.phone?'Piga '+t.phone+' kuthibitisha huduma unayohitaji.':'Thibitisha moja kwa moja na tawi.');
  else answer=t.name+' imeorodheshwa Galleria'+(t.floor?', kwenye '+floor(t.floor):'')+'. '+(state.pending==='service'?'Unahitaji bidhaa au huduma gani? ':state.pending==='hours'?'Ungependa kujua saa zake za kazi? ':'')+(t.phone?'Unaweza kuthibitisha huduma na upatikanaji kupitia '+t.phone+'.':'Angalia ukurasa rasmi wa duka kwa maelezo.');
  if(t.refreshStatus)answer+=' Sasisho la mwisho halikufaulu; taarifa hizi zinatoka kwenye nakala ya awali, hivyo thibitisha na duka.';
 }
 else if(r.topic==='events'||r.topic==='deals'){
  const records=(r.sources||[]).map(s=>recordForSource(s.original)).filter(Boolean);
  if(/discount code/.test(q))answer='Sina msimbo wa punguzo uliothibitishwa kwa ombi hilo, na siwezi kubuni mmoja. Angalia ofa na masharti kwenye ukurasa rasmi wa Deals.';
  else if(/conflict/.test(a))answer='Taarifa zilizothibitishwa zinakinzana kuhusu maelezo hayo. '+contacts;
  else if(/booking availability|booking terms/.test(a)&&/book|how much/.test(q))answer=(r.price?r.price+'. ':'')+'Sina uthibitisho wa nafasi za kuhifadhi. Thibitisha tarehe, bei na masharti na waandaaji kabla ya kulipa.';
  else if(records.length)answer='Tovuti rasmi ina taarifa hizi:\n'+records.map(d=>'• '+d.title+' — '+(d.startDate||d.dateLabel||'tarehe haijathibitishwa')+((d.endDate||d.validUntil)&&((d.endDate||d.validUntil)!==d.startDate)?'; mwisho '+(d.endDate||d.validUntil):'')+(d.startTime?'; '+d.startTime+(d.endTime?'–'+d.endTime:''):'')+(d.venue?'; '+d.venue:'')+(!d.startDate&&!d.endDate&&!d.validUntil?' (mwaka au muda kamili haujathibitishwa)':'')+(d.stale?' (sasisho halikufaulu; thibitisha na waandaaji)':'')).join('\n')+'\nThibitisha tarehe na upatikanaji kabla ya kupanga ziara.'+(state.pending==='content'?' Ungependa maelezo ya tukio au ofa gani?':'');
  else{const range=requestedDates(q,now);answer='Sina '+(r.topic==='events'?'tukio':'ofa')+' lililothibitishwa'+(range?' kwa '+range.start+(range.end!==range.start?' hadi '+range.end:''):' kwa sasa')+'. Hii haimaanishi hakuna lililopangwa. Thibitisha tarehe kwenye ukurasa rasmi uliounganishwa au wasiliana na Galleria kupitia 0704 498463.';}
 }
 else if(r.topic==='clarification')answer=/^I listed/.test(a)?'Niliorodhesha: '+state.options.join(', ')+'. Ungependa kujua kuhusu chaguo gani?':state.options.length>1?'Unamaanisha duka gani: '+state.options.join(', ')+'?':'Unamaanisha duka au huduma gani? Nitafute kwa jina ili nikupe taarifa sahihi.';
 else if(r.topic==='store-count'){const nums=a.match(/\d+/g)||[];answer='Orodha iliyokaguliwa ina maduka '+nums[0]+', yakiwemo '+nums[1]+' yanayofunguliwa hivi karibuni. Kuorodheshwa hakuthibitishi kama duka limefunguliwa sasa.';}
 else if(r.topic?.startsWith('activity-')||r.topic==='activities')answer='Sijathibitisha upatikanaji wa shughuli hiyo kwenye taarifa rasmi nilizokagua. '+(lines?'Shughuli zilizoorodheshwa kwa watoto ni:\n'+lines+'\n':'')+'Thibitisha bei, saa na upatikanaji na waendeshaji kabla ya kwenda.';
 else answer='Sina maelezo yaliyothibitishwa ya kutosha kuhusu ombi hilo. Angalia ukurasa rasmi uliounganishwa au niambie jina la duka au huduma unayotafuta. '+contacts;
 return {...r,answer,fixedAnswer:true};
}
