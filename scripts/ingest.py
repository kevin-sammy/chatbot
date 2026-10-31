"""Official-site ingestion using only Python's standard library.

Full pages remain in catalog.json; structured facts precede ~300–500-token
passages. Failed pages retain their previous successful records. No AI or key
is used by ingestion. Run from a reviewed branch before publishing data.
"""
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import re
import sys
import tempfile
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from urllib.robotparser import RobotFileParser

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
BASE = 'https://galleria.co.ke/'
AGENT = 'GalleriaVisitorAssistant/2.0'
NOW = dt.datetime.now(dt.timezone.utc).isoformat()
HOSTS = {'galleria.co.ke', 'www.galleria.co.ke'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
SKIP = {'script', 'style', 'nav', 'header', 'footer', 'noscript', 'svg'}
BLOCK = {'p', 'div', 'h1', 'h2', 'h3', 'h4', 'section', 'article', 'main', 'li', 'tr', 'br'}

def canonical(url):
    p = urlsplit(urljoin(BASE, url))
    if p.scheme != 'https' or p.hostname not in HOSTS or p.username or p.password:
        return None
    return urlunsplit(('https', 'galleria.co.ke', p.path or '/', '', ''))

class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not canonical(newurl):
            raise ValueError('Redirect outside official website')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

class Element:
    def __init__(self, tag='root', attrs=None):
        self.tag, self.attrs, self.children = tag, dict(attrs or []), []

    def walk(self, tag=None):
        if tag is None or self.tag == tag:
            yield self
        for child in self.children:
            if isinstance(child, Element):
                yield from child.walk(tag)

    def text(self, skip=SKIP):
        if self.tag in skip:
            return ''
        parts = [c.text(skip) if isinstance(c, Element) else c for c in self.children]
        value = ''.join(parts)
        return '\n' + value + '\n' if self.tag in BLOCK else value

class PageParser(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Element()
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, text):
        self.stack[-1].children.append(text)

def clean(value):
    return '\n'.join(re.sub(r'\s+', ' ', line).strip() for line in value.splitlines() if line.strip())

def page_type(url):
    path = urlsplit(url).path
    for name, kind in [('stores', 'store'), ('events', 'event'), ('deals', 'deal'), ('news', 'news'), ('blog', 'news')]:
        if re.fullmatch('/' + name + '/[^/]+/', path) and not path.endswith('/feed/'):
            return kind
    return 'info'

def linked_pages(root, url):
    links = set()
    for a in root.walk('a'):
        href = canonical(urljoin(url, a.attrs.get('href', '')))
        if href and page_type(href) != 'info':
            links.add(href)
    return links

def jsonld(root):
    def flatten(value):
        if isinstance(value, dict):
            yield value
            for child in value.values():
                yield from flatten(child)
        elif isinstance(value, list):
            for child in value:
                yield from flatten(child)
    for node in root.walk('script'):
        if node.attrs.get('type') == 'application/ld+json':
            try:
                yield from flatten(json.loads(node.text(skip=set())))
            except (ValueError, TypeError):
                continue

def iso_date(value):
    if not isinstance(value, str) or not re.match(r'^20\d{2}-\d{2}-\d{2}(?:T|$)', value):
        return None, None
    try:
        parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        if parsed.tzinfo:
            parsed = parsed.astimezone(dt.timezone(dt.timedelta(hours=3)))
        return parsed.date().isoformat(), parsed.strftime('%H:%M') if 'T' in value else None
    except ValueError:
        return None, None

def dated_record(root, text, title, url, kind):
    structured = next((v for v in jsonld(root) if v.get('@type') == 'Event'), {})
    start, start_time = iso_date(structured.get('startDate'))
    end, end_time = iso_date(structured.get('endDate'))
    # Only explicit dates including a year may enter the structured calendar.
    dates = []
    date_text=text.split('\nTags:')[0].split('\nShare:')[0]
    months = 'January February March April May June July August September October November December'.split()
    pattern = r'\b(\d{1,2})(?:st|nd|rd|th)?\s+(' + '|'.join(m + '|' + m[:3] for m in months) + r')\s*,?\s*(20\d{2})\b'
    reverse = r'\b(' + '|'.join(m + '|' + m[:3] for m in months) + r')\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(20\d{2})\b'
    for m in re.finditer(pattern, date_text, re.I):
        try:
            month = next(i+1 for i, name in enumerate(months) if name.lower().startswith(m[2].lower()))
            dates.append(dt.date(int(m[3]), month, int(m[1])).isoformat())
        except (ValueError, StopIteration):
            pass
    for m in re.finditer(reverse, date_text, re.I):
        try:
            month = next(i+1 for i, name in enumerate(months) if name.lower().startswith(m[1].lower()))
            dates.append(dt.date(int(m[3]), month, int(m[2])).isoformat())
        except (ValueError, StopIteration):
            pass
    if not start and dates and kind!='deal':
        start = min(dates)
    if not end and dates:
        end = max(dates)
    location = structured.get('location', {})
    venue = location.get('name') if isinstance(location, dict) else location if isinstance(location, str) else None
    date_label=None
    details=re.search(r'(?:Event Details\n)?((?:\d{1,2})\n(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\n.*?)(?:\nTags:|\nShare:|$)',text,re.S|re.I)
    if details:
        day_month=re.search(r'^(\d{1,2})\n([A-Za-z]+)\b',details[1])
        if day_month:
            date_label=day_month[1]+' '+day_month[2]
        times=list(re.finditer(r'\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b',details[1],re.I))
        def to_time(match):
            hour=int(match[1])%12+(12 if match[3].lower()=='pm' else 0)
            return f'{hour:02d}:{int(match[2] or 0):02d}'
        if times:
            start_time=start_time or to_time(times[0])
            if len(times)>1:
                end_time=end_time or to_time(times[1])
            remaining=details[1][times[-1].end():].strip()
            if remaining and len(remaining)<120:
                venue=venue or remaining
    status = 'cancelled' if 'EventCancelled' in str(structured.get('eventStatus', '')) else 'dated' if start else 'date-unconfirmed'
    price=re.search(r'\bPrice:\s*(?:KES|Kshs?\.?|KSh)\s*[\d,]+',date_text,re.I)
    return {'id':urlsplit(url).path.strip('/'), 'title':title, 'url':url, 'description':text.split('\nEvent Details')[0], 'dateLabel':date_label, 'startDate':start, 'endDate':end, 'validUntil':end if kind=='deal' else None, 'startTime':start_time, 'endTime':end_time, 'venue':venue, 'price':price[0] if price else None,'status':status, 'lastCrawled':NOW, 'stale':False}

def extract(html, url):
    root = PageParser(html).root
    title_node = next(root.walk('h1'), None) or next(root.walk('title'), None)
    title = clean(title_node.text()) if title_node else urlsplit(url).path.strip('/')
    # Prefer the full article/body area; never use og:description or card excerpts.
    main = next(root.walk('main'), None) or next(root.walk('article'), None) or next(root.walk('body'), root)
    text = clean(main.text())
    if title in text:
        text = text[text.index(title):]
    text = re.split(r'\n(?:Newsletter|Keep In Touch)\n', text)[0]
    kind = page_type(url)
    record = {'title':title,'url':url,'pageType':kind,'text':text,'lastCrawled':NOW,'stale':False}
    if kind == 'store':
        categories = list(dict.fromkeys(clean(a.text()) for a in root.walk('a') if '/store-categories/' in a.attrs.get('href','') or '/store-types/' in a.attrs.get('href','')))
        phones = list(dict.fromkeys(a.attrs['href'][4:].strip() for a in main.walk('a') if a.attrs.get('href','').startswith('tel:')))
        schedule = []
        for table in root.walk('table'):
            rows=[]
            for row in table.walk('tr'):
                cells=[clean(c.text()) for c in row.children if isinstance(c,Element) and c.tag in ['th','td']]
                if len(cells)>=2:
                    rows.append({'days':cells[0],'hours':cells[1]})
            if any(re.search(r'mon|tue|wed|thu|fri|sat|sun|holiday',r['days'],re.I) for r in rows):
                schedule=rows
                break
        floor=re.search(r'Location[ \t]*[-–:]?[ \t]*\n?[ \t]*([^\n]+)',text)
        primary=text.split('\nShare:')[0]
        phones=[p for p in phones if re.sub(r'\D','',p) in re.sub(r'\D','',primary)]
        about=re.search(r'About '+re.escape(title)+r'\n(.*?)(?:\nAll\n|\nShare:|$)',primary,re.S|re.I)
        description=clean(about[1]) if about else ''
        record['store']={'name':title,'url':url,'local':url,'floor':floor[1].strip() if floor else None,'categories':', '.join(categories),'phone':', '.join(phones),'description':description,'hours':'; '.join(r['days']+': '+r['hours'] for r in schedule) or None,'schedule':schedule,'status':'opening-soon' if any('/store_status/opening-soon/' in a.attrs.get('href','') for a in root.walk('a')) else 'listed','verifiedAt':NOW}
    if kind in ['event','deal']:
        record['dated']=dated_record(root,text,title,url,kind)
    return record, linked_pages(root,url)

def chunks(record):
    # ~375 words approximates 300–500 English tokens. Overlap retains qualifiers.
    words=record['text'].split()
    for i in range(0,len(words),260):
        part=words[i:i+330]
        if not part:
            continue
        yield {'id':hashlib.sha256((record['url']+':'+str(i)).encode()).hexdigest()[:20],'title':record['title'],'url':record['url'],'pageType':record['pageType'],'text':' '.join(part),'lastCrawled':record['lastCrawled'],'stale':record.get('stale',False),'floor':record.get('store',{}).get('floor'),'category':record.get('store',{}).get('categories'),'startDate':record.get('dated',{}).get('startDate'),'endDate':record.get('dated',{}).get('endDate')}

def load_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default

def atomic_json(path, value):
    with tempfile.NamedTemporaryFile('w',dir=path.parent,delete=False,encoding='utf-8') as f:
        json.dump(value,f,ensure_ascii=False,indent=2)
        f.write('\n')
    os.replace(f.name,path)

def merge_store(before, parsed, now):
    # Only this attempt decides whether a record is partial. Old failure flags
    # must not survive a later successful parse.
    partial=any(before.get(k) and not parsed.get(k) for k in ['floor','hours'])
    merged={**before,**{k:v for k,v in parsed.items() if v is not None and v!=''}}
    merged.pop('refreshStatus',None)
    if partial:
        merged['verifiedAt']=before.get('verifiedAt',now)
        merged['refreshStatus']='partial refresh; earlier details retained'
    return merged

def fetch_error(error):
    if isinstance(error, HTTPError):
        return 'HTTP '+str(error.code)
    if isinstance(error, URLError):
        return 'URLError: '+type(error.reason).__name__
    return type(error).__name__

def retryable(error):
    return error.startswith(('HTTP 429', 'HTTP 5', 'URLError:', 'TimeoutError', 'ConnectionError', 'OSError'))

class RefreshDeferred(RuntimeError):
    """The source is unavailable; keep the existing snapshot and its timestamp."""
    def __init__(self, attempted, fetched, failed):
        self.attempted,self.fetched,self.failed=attempted,fetched,failed
        super().__init__(f'Official website unavailable: {fetched}/{attempted} pages fetched; refresh deferred. Previous files and verification dates have not been replaced.')

def require_coverage(seen, records, failures, old, tenants):
    required=max(5,len(seen)//2)
    if len(records)>=required:
        return
    errors=[failure['error'] for failure in failures]
    transient=sum(retryable(error) or error=='crawl deadline reached' for error in errors)
    source_errors=all(retryable(error) or error in ['crawl deadline reached','HTTP 403','HTTP 404','disallowed by robots.txt'] for error in errors)
    # Only source-availability failures with a usable prior snapshot qualify.
    # Empty/malformed pages, extraction bugs and bootstrap failures remain errors.
    cached=len(old.get('documents',[]))>=5 and len(tenants)>=5
    if cached and source_errors and transient and len(records)+transient>=required:
        raise RefreshDeferred(len(seen),len(records),len(failures))
    raise RuntimeError('Refresh incomplete; previous files have not been replaced')

def crawl_pages(pending, fetch, deadline):
    pending=set(pending)
    seen=set();records={};failures={}
    def collect(batch, attempts):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            tasks={pool.submit(fetch,url,attempts):url for url in batch}
            for task in concurrent.futures.as_completed(tasks):
                url,html,error=task.result()
                if error:
                    failures[url]={'url':url,'error':error,'attemptedAt':NOW}
                else:
                    record,links=extract(html,url)
                    if len(record['text'])<40:
                        failures[url]={'url':url,'error':'empty page','attemptedAt':NOW}
                    else:
                        records[url]=record
                        failures.pop(url,None)
                        pending.update(links)
                if (len(records)+len(failures))%10==0:
                    print('Pages checked:',len(seen),'successful:',len(records),'failed:',len(failures),flush=True)
    for _ in range(3):
        batch=sorted(pending-seen)[:300-len(seen)]
        if not batch or time.monotonic()>=deadline:
            break
        seen.update(batch)
        collect(batch,2)
    # An early outage may have cleared by the end of discovery. Retry failed
    # requests then, instead of permanently counting the early failures.
    recover=[url for url,failure in failures.items() if retryable(failure['error'])]
    if recover and time.monotonic()+15<deadline:
        time.sleep(5)
        print('Retrying transient page failures:',len(recover),flush=True)
        collect(recover,1)
    print('Refresh summary:',len(seen),'attempted,',len(records),'successful,',len(failures),'failed',flush=True)
    for failure in list(failures.values())[:5]:
        print('Page failure:',failure['url'],failure['error'],flush=True)
    return seen,records,list(failures.values()),pending

def run():
    deadline=time.monotonic()+18*60
    opener=build_opener(SafeRedirect())
    robots=RobotFileParser(BASE+'robots.txt')
    try:
        with opener.open(Request(BASE+'robots.txt',headers={'User-Agent':AGENT}),timeout=20) as r:
            robots.parse(r.read(200000).decode('utf-8','replace').splitlines())
    except Exception:
        robots=None
    def fetch(url, attempts=2):
        if robots and not robots.can_fetch(AGENT,url):
            return url,None,'disallowed by robots.txt'
        for attempt in range(attempts):
            if time.monotonic()>=deadline:
                return url,None,'crawl deadline reached'
            try:
                # Each worker owns its request handlers. Shorter bounded attempts
                # leave time for a later recovery pass inside the Actions job.
                with build_opener(SafeRedirect()).open(Request(url,headers={'User-Agent':AGENT}),timeout=10) as r:
                    if not canonical(r.url) or 'text/html' not in r.headers.get('Content-Type',''):
                        raise ValueError('Invalid page source or content type')
                    raw=r.read(2000001)
                    if len(raw)>2000000:
                        raise ValueError('Page exceeds size limit')
                    return url,raw.decode('utf-8','replace'),None
            except Exception as e:
                error=fetch_error(e)
                if attempt==attempts-1 or not retryable(error):
                    return url,None,error
                time.sleep(1)
    old=load_json(DATA/'catalog.json',{'documents':[]})
    tenants=load_json(DATA/'tenants.json',[])
    seeds=['','site-map/','stores/','events/','deals/','mall-hours/','parking/','directions/','gift-vouchers/','contact-us/','kids/','attractions/','news/','advertising/','leasing/','courtesy-policy/','store_status/opening-soon/']
    pending={BASE+p for p in seeds}|{t['url'] for t in tenants if canonical(t['url'])}
    seen,records,failures,pending=crawl_pages(pending,fetch,deadline)
    require_coverage(seen,records,failures,old,tenants)
    parsed_stores=[r['store'] for r in records.values() if r['pageType']=='store']
    if parsed_stores and sum(bool(t.get('floor')) for t in parsed_stores)<len(parsed_stores)*.8:
        raise RuntimeError('Store floor extraction incomplete; previous files have not been replaced')
    for r in old.get('documents',[]):
        if r['url'] not in records:
            records[r['url']]={**r,'stale':True}
    previous={t['url']:t for t in tenants}
    for r in records.values():
        if r['pageType']=='store' and not r.get('stale'):
            parsed=r['store'];before=previous.get(r['url'],{})
            # Preserve descriptions/aliases unless a supported extractor replaces them.
            previous[r['url']]=merge_store(before,parsed,NOW)
    failed={f['url'] for f in failures}
    for url,t in previous.items():
        if url in failed:
            t['refreshStatus']='live refresh failed; previously captured record'
        elif 'partial refresh' not in t.get('refreshStatus',''):
            t.pop('refreshStatus',None)
    documents=list(records.values())
    completed=dt.datetime.now(dt.timezone.utc).isoformat()
    value={'schemaVersion':1,'lastSuccessfulCrawl':completed,'crawlStartedAt':NOW,'crawlCompletedAt':completed,'crawlSummary':{'attemptedPages':len(seen),'fetchedPages':len(seen)-len(failures),'discoveryComplete':not bool(pending-seen)},'documents':documents,'events':[r['dated']|{'stale':r.get('stale',False)} for r in documents if r['pageType']=='event'],'deals':[r['dated']|{'stale':r.get('stale',False)} for r in documents if r['pageType']=='deal'],'chunks':[c for r in documents for c in chunks(r)],'failures':failures}
    # Manual overrides live in their own file and are never modified here.
    atomic_json(DATA/'catalog.json',value)
    atomic_json(DATA/'tenants.json',sorted(previous.values(),key=lambda t:t['name'].lower()))
    print('Published',len(value['events']),'event records and',len(value['deals']),'deal records. Unknown dates stay unknown.',flush=True)

def main():
    try:
        run()
    except RefreshDeferred as error:
        print(str(error),file=sys.stderr,flush=True)
        if os.environ.get('GITHUB_ACTIONS')=='true':
            print('::warning title=Knowledge refresh deferred::The official website could not be refreshed. Serving the previous snapshot; no verification dates were advanced.',flush=True)
            summary=os.environ.get('GITHUB_STEP_SUMMARY')
            if summary:
                with open(summary,'a',encoding='utf-8') as report:
                    report.write(f'### Knowledge refresh deferred\n\nThe official website was unavailable: **{error.fetched}/{error.attempted}** pages fetched; **{error.failed}** failed.\n\nNo knowledge files were replaced, no verification dates were advanced, and publication is skipped. Existing freshness indicators remain based on the last successful snapshot. The next scheduled run will retry.\n')
        return 75
    return 0

if __name__=='__main__':
    sys.exit(main())
