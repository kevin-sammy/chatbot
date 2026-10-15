"""Refresh visitor knowledge only. Never modifies the mirrored site or school project."""
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin,urlsplit
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
import requests,json,re,time
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'data';OUT.mkdir(exist_ok=True)
BASE='https://galleria.co.ke/'
paths=['','stores/','mall-hours/','parking/','contact-us/','directions/','about-us/','attractions/','kids/','mall-map/','gift-vouchers/','advertising/','leasing/','courtesy-policy/','events/','deals/','whats-happening/','newsletter-signup/','store_status/opening-soon/']
old=json.loads((OUT/'tenants.json').read_text());urls={BASE+p for p in paths}|{t['url'] for t in old};fetched={};fail=[]
def load(u):
 for attempt in range(2):
  try:
   r=requests.get(u,headers={'User-Agent':'GalleriaVisitorAssistant/1.1 (public directory verification)'},timeout=25);r.raise_for_status();return u,r.text,None
  except Exception as e:
   if attempt: return u,None,str(e) or type(e).__name__
   time.sleep(.5)
with ThreadPoolExecutor(max_workers=4) as pool:
 for f in as_completed(pool.submit(load,u) for u in sorted(urls)):
  u,text,error=f.result()
  if text:fetched[u]=text
  else:fail.append({'url':u,'error':error})
  if (len(fetched)+len(fail))%20==0:print('Verified',len(fetched),'failed',len(fail),flush=True)
# Pick up tenants added to the current directory since the initial capture.
extra=set()
for u in [BASE+'stores/',BASE+'mall-hours/']:
 if u not in fetched:continue
 s=BeautifulSoup(fetched[u],'lxml')
 for a in s.select('a[href]'):
  full=urljoin(u,a['href']);q=urlsplit(full)
  if q.hostname=='galleria.co.ke' and re.fullmatch(r'/stores/[^/]+/',q.path) and not q.query and full not in fetched:extra.add(full)
if extra:
 with ThreadPoolExecutor(max_workers=4) as pool:
  for u,text,error in pool.map(load,sorted(extra)):
   if text:fetched[u]=text
   else:fail.append({'url':u,'error':error})
now=datetime.now(timezone.utc).isoformat()
def content(s):
 for t in s.select('head,script,style,header,footer,nav,.newsletter,.keep-in-touch'):t.decompose()
 h=s.find('h1');text=s.get_text('\n',strip=True)
 if h:
  name=h.get_text(' ',strip=True);pos=text.find(name);text=text[pos:]
 # Global footer blocks are sometimes divs rather than semantic footer elements.
 text=re.split(r'\n(?:Newsletter|Keep In Touch)\n',text)[0]
 return text
records=[];docs=[];changes=[]
for u,html in sorted(fetched.items()):
 s=BeautifulSoup(html,'lxml');h=s.find('h1');title=h.get_text(' ',strip=True) if h else (s.title.get_text(' ',strip=True) if s.title else u)
 text=content(BeautifulSoup(html,'lxml'))
 if re.fullmatch(r'/stores/[^/]+/',urlsplit(u).path):
  # Hours come only from tables on this tenant's own page, never the mall header.
  schedule=[]
  for table in s.find_all('table'):
   rows=[]
   for tr in table.find_all('tr'):
    cells=[c.get_text(' ',strip=True) for c in tr.find_all(['th','td'])]
    if len(cells)>=2:rows.append({'days':cells[0],'hours':cells[1]})
   if any(re.search(r'mon|tue|wed|thu|fri|sat|sun|holiday',r['days'],re.I) for r in rows):schedule=rows;break
  floor=re.search(r'Location\s*-?\s*\n([^\n]+)',s.get_text('\n',strip=True))
  cats=list(dict.fromkeys(a.get_text(' ',strip=True) for a in s.select('a[href*="/store-categories/"],a[href*="/store-types/"]')))
  phones=list(dict.fromkeys(a.get_text(' ',strip=True) for a in s.select('a[href^="tel:"]')))
  phones=[p for p in phones if re.sub(r'\D','',p) in re.sub(r'\D','',text)]
  emails=list(dict.fromkeys(a.get('href','')[7:].split('?')[0].strip(' ,;') for a in s.select('a[href^="mailto:"]')))
  emails=[e for e in emails if e!='info@galleria.co.ke']
  description='';about=next((t for t in s.find_all(['h2','h3']) if t.get_text(' ',strip=True).lower().startswith('about '+title.lower())),None)
  if about:
   paragraphs=[]
   for node in about.find_all_next(['p','h2','h3']):
    if node.name in ['h2','h3']:break
    value=node.get_text(' ',strip=True)
    if value and 'Store hours might' not in value:paragraphs.append(value)
   description=' '.join(paragraphs)[:2600]
  if not description:
   m=re.search(r'About '+re.escape(title)+r'\n(.*?)(?:\nAll\n|\nShare:|\nStore Hours|\nMore stores)',text,re.S|re.I)
   if m:description=re.sub(r'\s+',' ',m[1])[:2600]
  rec={'name':title,'url':u,'local':'/mirror'+urlsplit(u).path+'index.html','floor':floor[1].strip() if floor else None,'schedule':schedule,'hours':'; '.join(r['days']+': '+r['hours'] for r in schedule) or None,'status':'opening-soon' if s.select('a[href*="/store_status/opening-soon/"]') else 'listed','categories':', '.join(cats),'phone':', '.join(phones),'email':', '.join(emails),'description':description,'verifiedAt':now}
  if not (ROOT/'public'/rec['local'].lstrip('/')).exists():rec['local']=u
  records.append(rec)
 else:
  tables=[]
  for table in s.find_all('table'):
   tables.append([[c.get_text(' ',strip=True) for c in row.find_all(['th','td'])] for row in table.find_all('tr')])
  docs.append({'title':title,'url':u,'local':'/mirror'+urlsplit(u).path+'index.html','text':text[:35000],'tables':tables,'verifiedAt':now})
oldBy={t['url']:t for t in old}
for t in records:
 prev=oldBy.get(t['url'])
 if not prev:changes.append({'name':t['name'],'change':'newly discovered tenant'})
 elif bool(prev.get('hours'))!=bool(t['hours']):changes.append({'name':t['name'],'change':'hours now parsed from tenant schedule table' if t['hours'] else 'no current published schedule table'})
# Failed refreshes remain available, explicitly marked with their old verification status.
for t in old:
 if t['url'] not in fetched:
  t['refreshStatus']='live refresh failed; previously captured record';records.append(t)
(OUT/'tenants.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
(OUT/'knowledge.json').write_text(json.dumps({'verifiedAt':now,'documents':docs,'failures':fail,'changes':changes},ensure_ascii=False,indent=2))
(OUT/'capture.mjs').write_text('export const capturedAt = '+json.dumps(now)+';\n')
print(json.dumps({'stores':len(records),'visitorPages':len(docs),'missingHours':sum(not t.get('hours') for t in records),'failures':fail,'changes':changes},ensure_ascii=False),flush=True)
