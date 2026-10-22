"""Refresh FAQ-linked outlets through the existing official-site extractor.

Run with --apply to update the shared records. Failed/invalid pages retain their
previous verification and facts; this never claims a complete website sync.
"""
import argparse
import concurrent.futures
import datetime as dt
import json
from urllib.request import Request, build_opener
from urllib.robotparser import RobotFileParser
from ingest import DATA, BASE, AGENT, SafeRedirect, canonical, extract, merge_store, chunks, atomic_json

def fetch_store(url, robots):
    if robots is None or not robots.can_fetch(AGENT, url):
        return url, None, 'robots unavailable or disallowed'
    try:
        with build_opener(SafeRedirect()).open(Request(url, headers={'User-Agent':AGENT}), timeout=15) as response:
            if not canonical(response.url) or 'text/html' not in response.headers.get('Content-Type',''):
                raise ValueError('invalid official HTML page')
            raw=response.read(2000001)
            if len(raw)>2000000:
                raise ValueError('page too large')
        record,_=extract(raw.decode('utf-8','replace'),url)
        store=record.get('store',{})
        if record.get('pageType')!='store' or not store.get('name') or not store.get('categories') or not store.get('floor'):
            raise ValueError('incomplete store extraction')
        return url,record,None
    except Exception as error:
        return url,None,type(error).__name__

def run(apply=False):
    tenants=json.loads((DATA/'tenants.json').read_text())
    catalog=json.loads((DATA/'catalog.json').read_text())
    sections=json.loads((DATA/'directory-faq.json').read_text())['sections']
    hints={name for section in sections for name in section['storeHints']}
    # Wina's FAQ classification conflicts with the official repair listing.
    hints.add('Wina Classic')
    targets={t['url']:t for t in tenants if t['name'] in hints and canonical(t['url'])}
    robots=RobotFileParser(BASE+'robots.txt')
    try:
        with build_opener(SafeRedirect()).open(Request(BASE+'robots.txt',headers={'User-Agent':AGENT}),timeout=15) as response:
            robots.parse(response.read(200000).decode('utf-8','replace').splitlines())
    except Exception:
        robots=None
    records={}; failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for url,record,error in pool.map(lambda u:fetch_store(u,robots),targets):
            if record:
                records[url]=record
            else:
                failures.append({'url':url,'error':error})
            if (len(records)+len(failures))%10==0:
                print('FAQ pages checked:',len(records)+len(failures),'verified:',len(records),'failed:',len(failures),flush=True)
    checked=dt.datetime.now(dt.timezone.utc).isoformat()
    previous={t['url']:t for t in tenants}
    for url,record in records.items():
        previous[url]=merge_store(previous[url],record['store'],checked)
    report={'checkedAt':checked,'scope':'FAQ-linked stores only; not a complete website sync','attemptedPages':len(targets),'verifiedPages':len(records),'failures':failures,
        'correctionPolicy':'Use refreshed official store categories and status. FAQ product lists are not inventory, authorization or branch-service evidence.',
        'comingSoon':[{'name':previous[url]['name'],'url':url} for url in records if previous[url]['status']=='opening-soon'],
        'verifiedURLs':sorted(records)}
    if apply:
        documents={r['url']:r for r in catalog['documents']}
        documents.update(records)
        catalog['documents']=list(documents.values())
        catalog['chunks']=[c for r in catalog['documents'] for c in chunks(r)]
        catalog['failures']=[f for f in catalog.get('failures',[]) if f['url'] not in records]
        # The full-crawl timestamp remains unchanged; each updated store/page has
        # its own verification time, and the partial review is recorded separately.
        catalog['lastFAQReviewAt']=checked
        atomic_json(DATA/'tenants.json',sorted(previous.values(),key=lambda t:t['name'].lower()))
        atomic_json(DATA/'catalog.json',catalog)
        atomic_json(DATA/'directory-faq-review.json',report)
    print(json.dumps(report,ensure_ascii=False),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--apply',action='store_true')
    run(parser.parse_args().apply)
