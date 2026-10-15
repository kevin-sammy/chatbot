from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parent.parent;data=ROOT/'data';k=json.loads((data/'knowledge.json').read_text());docs={d['url'].rstrip('/').split('/')[-1]:d for d in k['documents']};answers=[]
def clean(text):
 if 'More results...' in text:text=text.split('More results...',1)[1]
 return re.sub(r'\n{3,}','\n\n',text).strip().rstrip('×').strip()
for d in k['documents']:d['text']=clean(d['text'])
def add(id,path,answer):
 d=docs.get(path)
 if not d or not answer:return
 answers.append({'id':id,'answer':answer,'source':{'title':('Published parking fees' if id=='parking-rates' else d['title'].split(' - Galleria')[0]), 'url':d['local'],'original':d['url']},'verifiedAt':d['verifiedAt']})
def lines(path,pattern):return '\n'.join(x for x in docs.get(path,{}).get('text','').splitlines() if re.search(pattern,x,re.I))
parking=docs.get('parking',{});tables=parking.get('tables',[]);rows=next((t for t in tables if any(any('Duration' in c for c in row) for row in t)),[])
rates=[row for row in rows if len(row)>=2 and 'Duration' not in row[0] and row[0].strip()]
if rates:
 answer='The published Galleria parking fees are:\n'+'\n'.join('• '+r[0]+': '+r[1] for r in rates)
 if len(rates)>1 and '50' in rates[0][1] and 'free' in rates[1][1].lower():answer+='\nThe first two time bands are shown exactly as published and are unusual; confirm them with Park-N-Go.'
 answer+='\nParking enquiries: Park-N-Go, 0790 856193. These are published rates, not a live tariff check.'
 add('parking-rates','parking',answer)
if 'Scan the QR code' in parking.get('text',''):
 add('parking-payment','parking','For M-Pesa parking payment: scan the QR code on your parking ticket, review the bill, choose M-Pesa, confirm your phone number and complete the official payment prompt on your phone. The chatbot cannot collect payments or PINs. For help, contact Park-N-Go on 0790 856193.')
add('parking-hours','parking','I do not have verified parking entry and exit hours. The published night tariff covers 8 p.m.–6 a.m.; a tariff period does not confirm the parking gate schedule. Please confirm access hours with Park-N-Go on 0790 856193.')
add('parking-location','parking',lines('parking',r'outdoor parking|parking silo')+'\nFor parking assistance, call Park-N-Go on 0790 856193.')
hours=docs.get('mall-hours',{}).get('tables',[])
if hours:
 rows=hours[0];value='; '.join(' '.join(r) for r in rows if len(r)>1)
 add('mall-hours','mall-hours','Galleria’s published mall hours: '+value+'. Individual store hours differ. Tell me the store name if you need its hours; holiday changes should be confirmed with the store.')
for id,path in [('gift-vouchers','gift-vouchers'),('kids-activities','kids'),('leasing','leasing')]:
 text=docs.get(path,{}).get('text','')
 if id=='kids-activities':text='Galleria’s kids page describes the G-Fun Club play area, including an indoor netted area, a reading nook and art tables, suitable for children including toddlers. It is in the middle of the food zone. Confirm activity prices, age rules and dated events with Galleria before visiting.' if all(x in text.lower() for x in ['reading','food zone','toddlers']) else text.split('\nOutlets\n')[0]
 if id=='leasing':text='For retail leasing, current space availability and a quotation, contact Galleria on 0704 498463 or info@galleria.co.ke. Galleria’s leasing page describes its retail spaces and the Galleria Gardens development.'
 add(id,path,text[:1800]+('\nConfirm voucher denominations and participating stores with management.' if id=='gift-vouchers' else ''))
for id,pattern in [('pets',r'pets|leash'),('smoking',r'smoking'),('photography',r'photography|videography'),('security',r'security checks'),('vehicle-policy',r'vehicles.*risk')]:add(id,'courtesy-policy',lines('courtesy-policy',pattern))
contact=docs.get('contact-us',{}).get('text','');digits=re.sub(r'\D','',contact)
if '0704498463' in digits and 'info@galleria.co.ke' in contact:
 add('mall-contact','contact-us','Galleria enquiries: 0704 498463 or 020 2363063. Email: info@galleria.co.ke. Address: junction of Lang’ata and Magadi Roads, Karen, Nairobi.')
direction=docs.get('directions',{}).get('text','')
if '125/126' in direction and '24' in direction:
 add('directions','directions','Galleria is at the junction of Lang’ata and Magadi Roads, Karen, Nairobi. From Nairobi town, the website lists route 24 towards Karen (Lang’ata Road entrance), or routes 125/126 towards Rongai/Kiserian (Magadi Road entrance). From Karen, use route 24 towards town; from Rongai/Kiserian, use 125/126 towards town. Ask to alight at Galleria. Check current routes and fares with the operator.')
home=docs.get('galleria.co.ke',{}).get('text','')
capacity=re.search(r'(\d+)\s+parking\s+bays',home,re.I)
if capacity:add('parking-capacity','galleria.co.ke','Galleria’s website lists '+capacity[1]+' parking bays. This is published capacity, not a live count of available spaces.')
add('mall-map','mall-map','Use Galleria’s mall map to view the mall layout. For a particular shop, tell me its name and I can check its published floor. Detailed step-by-step directions inside the mall should be confirmed at the information desk.')
add('events','events','See Galleria’s official events page for dated event listings and booking details. I do not have a verified live event schedule or ticket availability, so please confirm dates with Galleria on 0704 498463.')
add('deals','deals','See Galleria’s official deals page for published offers and their terms. Expired offers are not confirmation of a current discount; check the dates and confirm availability with the store.')
advertising=docs.get('advertising',{}).get('text','');notice=next((t for t in docs.get('advertising',{}).get('tables',[]) if any(any('A5' in c for c in r) for r in t)),[])
if notice:
 rate='; '.join(': '.join(r) for r in notice if len(r)>1 and re.fullmatch(r'A[1-5]',r[0].strip()))
 add('noticeboard-rates','advertising','Published notice-board advertising prices, inclusive of VAT: '+rate+'. Confirm duration, availability and the current quote with the marketing team before booking.')
if '8,120' in advertising:add('flyer-rates','advertising','The website lists flyer distribution at KSh 8,120 per day, inclusive of VAT. Only two people may distribute flyers; aggressive selling is not allowed, and booking and payment must be confirmed first. Confirm current availability and price with the marketing team.')
activation=advertising.split('In-Mall Activation Areas',1)[-1] if 'In-Mall Activation Areas' in advertising else ''
activationRates=[]
for prefix,amount in re.findall(r'(.*?)(Kshs?\.?\s*[\d,]+)(?:\n|$)',activation,re.S|re.I):
 labels=[x.strip() for x in prefix.splitlines() if x.strip() and x.strip().lower() not in ['all costs are inclusive of vat','rate per day','(inclusive of vat)','rate per day (inclusive of vat)','standard charge']]
 if labels:activationRates.append('• '+' '.join(labels)+': '+amount.strip())
if activationRates:add('activation-rates','advertising','Published in-mall activation rates per day, inclusive of VAT:\n'+'\n'.join(activationRates)+'\nConfirm the current quote and space availability with marketing@galleria.co.ke or 0704 498463 before booking.')
if 'marketing@galleria.co.ke' in advertising:add('advertising','advertising','For advertising or in-mall activations, contact marketing@galleria.co.ke or eventsandpromotions@galleria.co.ke; phone 0704 498463. Notice-board, flyer and activation prices are published on the advertising page. Availability and the applicable rate need confirmation before booking.')
upcoming=json.loads((data/'opening-soon.json').read_text()) if (data/'opening-soon.json').exists() else {'stores':[]}
tenants=json.loads((data/'tenants.json').read_text())
for t in tenants:
 t['status']=t.get('status') or ('opening-soon' if t['url'] in upcoming['stores'] else 'listed')
 t['email']=', '.join(x.strip(' ,;') for x in t.get('email','').split(',') if x.strip(' ,;'))
 seen=set();phones=[]
 for phone in t.get('phone','').split(','):
  digits=re.sub(r'\D','',phone)
  if digits and digits not in seen:phones.append(phone.strip());seen.add(digits)
 t['phone']=', '.join(phones)
 t['aliases']=[]
 if 'artcaffe' in t['url']:t['aliases']=['Art Caffe','Artcaffé','Art Cafe']
 if t['url'].endswith('/cjs/'):t['aliases']=['CJs','CJ’s',"CJ's"]
 if t['url'].endswith('/i-store/'):t['aliases']=['iStore','i store','i.store']
 if t['url'].endswith('/text-book-center/'):t['aliases']=['Textbook Centre','Text Book Centre','Textbook Center','TBC']
add('store-count','stores','The refreshed directory contains '+str(len(tenants))+' store listings, including '+str(sum(t['status']=='opening-soon' for t in tenants))+' marked Opening Soon. A listing is not confirmation that a store is currently open.')
for a in answers:
 if a['id']=='pets':a['answer']='Galleria’s courtesy policy welcomes pets, requires them to be kept on a leash and asks owners to clean up after them.'
(data/'tenants.json').write_text(json.dumps(tenants,ensure_ascii=False,indent=2))
k['answers']=answers;(data/'knowledge.json').write_text(json.dumps(k,ensure_ascii=False,indent=2))
print('Verified FAQ answers:',len(answers),'opening-soon stores:',sum(t['status']=='opening-soon' for t in tenants))
