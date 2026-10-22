import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch, MagicMock
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'scripts'))
spec=importlib.util.spec_from_file_location('faq_refresh',Path(__file__).resolve().parent.parent/'scripts/reconcile-directory-faq.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class FAQRefreshTests(unittest.TestCase):
    def check_refresh(self,success):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            url='https://galleria.co.ke/stores/wina-classic/'
            old={'name':'Wina Classic','url':url,'floor':'First Floor','categories':'Shoe Repair','hours':'9AM-5PM','verifiedAt':'older','status':'listed'}
            page={'url':url,'title':'Wina Classic','text':'Official repair and leather care services.','pageType':'store','lastCrawled':'new','store':{**old,'floor':'Ground Floor','verifiedAt':'new'}}
            for name,value in [('tenants.json',[old]),('catalog.json',{'lastSuccessfulCrawl':'full-crawl-date','documents':[],'failures':[{'url':url}]}),('directory-faq.json',{'sections':[{'storeHints':['Wina Classic']}]})]:
                (root/name).write_text(json.dumps(value))
            fetched=(url,page,None) if success else (url,None,'TimeoutError')
            opener=MagicMock()
            opener.open.return_value.__enter__.return_value.read.return_value=b'User-agent: *\nAllow: /'
            with patch.object(module,'DATA',root),patch.object(module,'build_opener',return_value=opener),patch.object(module,'fetch_store',return_value=fetched),contextlib.redirect_stdout(io.StringIO()):
                module.run(apply=True)
            tenant=json.loads((root/'tenants.json').read_text())[0]
            catalog=json.loads((root/'catalog.json').read_text())
            review=json.loads((root/'directory-faq-review.json').read_text())
            self.assertEqual(catalog['lastSuccessfulCrawl'],'full-crawl-date')
            self.assertEqual(review['verifiedPages'],int(success))
            if success:
                self.assertEqual(tenant['floor'],'Ground Floor')
                self.assertEqual(tenant['verifiedAt'],'new')
                self.assertEqual(len(catalog['chunks']),1)
                self.assertEqual(catalog['failures'],[])
            else:
                self.assertEqual(tenant,old)
                self.assertEqual(len(review['failures']),1)
                self.assertEqual(len(catalog['failures']),1)
    def test_failed_page_retains_older_facts_and_timestamp(self):
        self.check_refresh(False)
    def test_success_updates_shared_facts_without_claiming_full_sync(self):
        self.check_refresh(True)
