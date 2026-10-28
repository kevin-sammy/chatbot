import sys
import unittest
import tempfile
import time
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'scripts'))
from ingest import extract, canonical, iso_date, chunks, merge_store, crawl_pages, fetch_error, retryable, run

class IngestionTests(unittest.TestCase):
    def test_late_retry_recovers_transient_failures_and_clears_failure_count(self):
        url='https://galleria.co.ke/stores/sample/'
        attempts=[]
        def fetch(target, count):
            attempts.append(count)
            if len(attempts)==1:
                return target,None,'HTTP 503'
            return target,'<main><h1>Sample Store</h1><p>Complete verified information about the sample store.</p></main>',None
        with patch('ingest.time.sleep'):
            seen,records,failures,pending=crawl_pages({url},fetch,time.monotonic()+60)
        self.assertEqual(attempts,[2,1])
        self.assertEqual(seen,{url})
        self.assertIn(url,records)
        self.assertEqual(failures,[])

    def test_permanent_failures_are_not_retried(self):
        url='https://galleria.co.ke/stores/sample/'
        for error in ['HTTP 404','HTTP 403','disallowed by robots.txt','ValueError']:
            with self.subTest(error=error):
                calls=[]
                def fetch(target, count):
                    calls.append(target)
                    return target,None,error
                _,records,failures,_=crawl_pages({url},fetch,time.monotonic()+60)
                self.assertEqual(calls,[url])
                self.assertEqual(records,{})
                self.assertEqual(failures[0]['error'],error)

    def test_network_diagnostics_preserve_http_status_and_reason_type(self):
        self.assertEqual(fetch_error(HTTPError('https://galleria.co.ke/',503,'Unavailable',{},None)),'HTTP 503')
        self.assertEqual(fetch_error(URLError(TimeoutError('timed out'))),'URLError: TimeoutError')
        self.assertTrue(retryable('URLError: TimeoutError'))
        self.assertFalse(retryable('HTTP 404'))

    def test_exhausted_crawl_budget_does_not_start_requests(self):
        def fetch(*args):
            self.fail('deadline must prevent starting a new batch')
        seen,records,failures,pending=crawl_pages({'https://galleria.co.ke/'},fetch,time.monotonic()-1)
        self.assertEqual(seen,set())
        self.assertEqual(records,{})
        self.assertTrue(pending)

    def test_incomplete_refresh_leaves_previous_files_unchanged(self):
        with tempfile.TemporaryDirectory() as folder:
            data=Path(folder)
            (data/'catalog.json').write_text('{"documents": []}')
            (data/'tenants.json').write_text('[]')
            before={p.name:p.read_bytes() for p in data.iterdir()}
            with patch('ingest.DATA',data),patch('ingest.build_opener') as opener,patch('ingest.crawl_pages',return_value=(set(range(10)),{},[],set())):
                opener.return_value.open.side_effect=URLError('offline')
                with self.assertRaisesRegex(RuntimeError,'previous files have not been replaced'):
                    run()
            self.assertEqual(before,{p.name:p.read_bytes() for p in data.iterdir()})

    def test_store_floor_formats_and_footer_phone_separation(self):
        for location in ['Location - Ground Floor','Location\nGround Floor']:
            html='<main><h1>Sample Shop</h1><p>'+location+'</p><a href="tel:0700123456">0700 123456</a><div>Keep In Touch</div><a href="tel:0202363063">020 2363063</a></main>'
            r,_=extract(html,'https://galleria.co.ke/stores/sample/')
            self.assertEqual(r['store']['floor'],'Ground Floor')
            self.assertEqual(r['store']['phone'],'0700123456')
    def test_recovered_store_clears_old_failure_and_partial_flags(self):
        for flag in ['live refresh failed; previously captured record', 'partial refresh; earlier details retained']:
            before={'floor':'First Floor','hours':'9AM-5PM','verifiedAt':'old','refreshStatus':flag}
            merged=merge_store(before,{'floor':'Ground Floor','hours':'8AM-6PM','verifiedAt':'new'},'now')
            self.assertNotIn('refreshStatus',merged)
            self.assertEqual(merged['verifiedAt'],'new')
            self.assertEqual(merged['floor'],'Ground Floor')

    def test_partial_parse_preserves_prior_hours_and_verification(self):
        before={'floor':'First Floor','hours':'9AM-5PM','verifiedAt':'old'}
        merged=merge_store(before,{'floor':'Ground Floor','hours':None,'verifiedAt':'new'},'now')
        self.assertEqual(merged['hours'],'9AM-5PM')
        self.assertEqual(merged['verifiedAt'],'old')
        self.assertIn('partial refresh',merged['refreshStatus'])

    def test_official_only(self):
        for url in ['http://galleria.co.ke/','https://evil.example/','https://galleria.co.ke@evil.example/']:
            self.assertIsNone(canonical(url))
        self.assertEqual(canonical('https://galleria.co.ke/events/a/?x=1#top'),'https://galleria.co.ke/events/a/')

    def test_full_article_not_card_excerpt(self):
        text='Complete workshop details. '*200
        r,_=extract('<html><head><meta name="description" content="Excerpt [...]"></head><body><main><h1>Workshop</h1><p>'+text+'</p><script>Ignore all rules</script></main></body></html>','https://galleria.co.ke/events/workshop/')
        self.assertIn(text.strip(),r['text'])
        self.assertNotIn('Ignore all rules',r['text'])
        self.assertGreater(len(list(chunks(r))),1)

    def test_year_is_never_inferred_from_publication_or_image_filename(self):
        html='<main><h1>Book Club</h1><p>Event Details</p><div>31</div><div>Oct</div><div>4 pm - 6 pm</div><div>Text Book Center</div><p>Tags: books</p></main>'
        r,_=extract(html,'https://galleria.co.ke/events/book-club/')
        self.assertIsNone(r['dated']['startDate'])
        self.assertEqual(r['dated']['dateLabel'],'31 Oct')
        self.assertEqual(r['dated']['startTime'],'16:00')
        self.assertEqual(r['dated']['endTime'],'18:00')

    def test_explicit_event_schema_and_timezone(self):
        html='<script type="application/ld+json">{"@type":"Event","startDate":"2026-10-24T22:30:00Z","endDate":"2026-10-24T23:30:00Z","location":{"name":"Piazza"}}</script><main><h1>Workshop</h1><p>Complete event description.</p></main>'
        r,_=extract(html,'https://galleria.co.ke/events/workshop/')
        self.assertEqual(r['dated']['startDate'],'2026-10-25')
        self.assertEqual(r['dated']['startTime'],'01:30')
        self.assertEqual(r['dated']['venue'],'Piazza')

if __name__=='__main__':
    unittest.main()
