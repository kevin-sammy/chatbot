// Phrase routing changes the question, never the verified facts used to answer it.
// Patterns receive normalized text and match complete visitor questions first.
const phrases=[
 ['en',/^(?:good morning|good afternoon|good evening|hello there|hey there)$/,'hello'],
 ['en',/^(?:what time are you open until|when do you shut|what are your business hours|are you open today)$/,'galleria mall opening hours today'],
 ['en',/^(?:how do i reach you|how can i get to the mall|send me your location|can i have your address)$/,'where are you located'],
 ['en',/^(?:where can i leave my car|where do i park my car)$/,'where is parking'],
 ['en',/^(?:is parking free|what do you charge for parking|how much to park)$/,'parking rates'],
 ['en',/^(?:can i pay parking by mpesa|can i pay for parking using m pesa)$/,'how do i pay for parking'],
 ['en',/^(?:i need to speak to someone|can i speak to a real person)$/,'talk to a human'],
 ['sw',/^(?:habari za asubuhi|habari za mchana|habari za jioni|hujambo)$/,'hello'],
 ['sw',/^(?:mall |galleria )?(?:mmefungua|mmefungua leo|mko wazi|mko wazi leo|mko open|mko open leo)$/,'galleria mall opening hours today'],
 ['sw',/^(?:nafikaje(?: galleria| hapo)?|nifikeje(?: galleria| hapo)?|nawezaje kufika(?: galleria| hapo)?|nitumie location|nipatie location|anwani yenu ni gani)$/,'where are you located'],
 ['sw',/^(?:nipate wapi ramani|ramani ya mall|ramani ya galleria)$/,'mall map'],
 ['sw',/^(?:naegesha wapi|niache gari wapi|parking iko wapi)$/,'where is parking'],
 ['sw',/^(?:parking ni ngapi|parking ni pesa ngapi|maegesho ni pesa ngapi|maegesho ni bure|parking ni bure|ada za parking|ada ya maegesho)$/,'parking rates'],
 ['sw',/^(?:nalipaje parking|nalipiaje parking|nalipiaje maegesho|naweza kulipa parking na mpesa|naweza kulipa maegesho kwa mpesa)$/,'how do i pay for parking'],
 ['sw',/^(?:nimepoteza tiketi ya parking|nimepoteza tiketi ya maegesho)$/,'lost parking ticket'],
 ['sw',/^(?:kuna sehemu ya watoto kucheza|watoto wanaweza kucheza wapi|nipeleke watoto wapi|kuna michezo ya watoto)$/,'kids activities'],
 ['sw',/^(?:kuna ofa gani|ofa za leo|punguzo za leo)$/,'deals today'],
 ['sw',/^(?:ratiba ya matukio|kuna event gani|kuna events gani)$/,'events'],
 ['sw',/^(?:namba yenu|namba yenu ya simu|simu yenu ni gani|mawasiliano yenu|nawezaje kuwapigia)$/,'galleria contact phone number'],
 ['sw',/^(?:barua pepe yenu|email yenu ni gani)$/,'galleria email address'],
 ['sw',/^(?:nataka kuongea na mtu|naomba mhudumu|nisaidie kuongea na mhudumu)$/,'talk to a human'],
 ['sw',/^(?:nina malalamiko|nataka kulalamika)$/,'complaint'],
 ['sw',/^(?:naweza kuja na mbwa|mbwa wanaruhusiwa|wanyama wanaruhusiwa)$/,'are pets allowed'],
 ['sw',/^(?:naweza kupiga picha|kupiga picha kunaruhusiwa)$/,'take photos'],
 ['sw',/^(?:kuna wifi|wifi ni bure)$/,'wifi'],
 ['sw',/^(?:choo kiko wapi|vyoo viko wapi)$/,'where are washrooms'],
 ['sw',/^(?:kuna njia ya kiti cha magurudumu|kuna huduma kwa walemavu)$/,'wheelchair accessibility'],
 ['sw',/^(?:nataka kukodisha duka|nafasi ya biashara inapatikana)$/,'leasing shop space'],
 ['sw',/^(?:nataka kutangaza biashara|nawezaje kutangaza biashara)$/,'advertising'],
 ['sw',/^(?:mna vocha za zawadi|naweza kununua vocha ya zawadi)$/,'gift vouchers'],
 ['sw',/^(?:niko na njaa|nina njaa|nataka kula|tunaweza kula wapi)$/,'food'],
 ['sw',/^(?:nifanye shopping wapi|naweza kufanya shopping wapi|ninaweza kufanya manunuzi wapi)$/,'shopping'],
 ['sw',/^(?:natafuta supermarket|kuna duka la vyakula)$/,'supermarkets and groceries'],
 ['sw',/^(?:naweza kutoa pesa wapi|kuna atm)$/,'banks atm'],
];
export function customerPhrase(q){
 const cleaned=q.replace(/^(?:please |tafadhali )/,'').replace(/ (?:please|tafadhali)$/,'');
 for(const [language,pattern,query] of phrases)if(pattern.test(cleaned))return {query,language};
 return {query:cleaned,language:null};
}
