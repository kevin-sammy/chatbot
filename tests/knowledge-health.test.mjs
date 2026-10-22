import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledgeHealth} from '../lib/knowledge-health.mjs';
const now = new Date('2026-10-22T15:00:00Z');
const catalog = {lastSuccessfulCrawl:'2026-10-22T07:40:00Z',documents:[{}],failures:[]};
test('recent failed refresh cannot imply complete sync',()=>{
 const health=knowledgeHealth({...catalog,failures:[{url:'https://galleria.co.ke/stores/example/'}]},[],now);
 assert.equal(health.status,'partial');assert.equal(health.failedPages,1);assert.equal(health.realtimeSync,false);
});
test('retained pages and partial store extraction are reported',()=>{
 const health=knowledgeHealth({...catalog,documents:[{stale:true}]},[{refreshStatus:'partial refresh'}],now);
 assert.equal(health.status,'partial');assert.equal(health.stalePages,1);assert.equal(health.retainedStores,1);
});
test('clean snapshots are checked, never claimed to match the site right now',()=>{
 const health=knowledgeHealth(catalog,[],now);assert.equal(health.status,'checked');assert.equal(health.realtimeSync,false);assert.equal(health.discoveryComplete,null);
});
test('missing, invalid, future and old dates are outdated',()=>{
 for(const date of [undefined,'invalid','2026-10-23T00:00:00Z','2026-10-19T00:00:00Z'])assert.equal(knowledgeHealth({...catalog,lastSuccessfulCrawl:date},[],now).status,'outdated');
});
test('capped discovery is partial even with no failed requests',()=>{
 assert.equal(knowledgeHealth({...catalog,crawlSummary:{discoveryComplete:false}},[],now).status,'partial');
});
