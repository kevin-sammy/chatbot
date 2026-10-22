import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../api/index.mjs';
import media from '../data/media.json' with {type:'json'};
const req=path=>new Request('https://chatbot.example'+path);
test('Vercel rewrite reaches chat API with a web Request',async()=>{
 const r=await handle(new Request('https://chatbot.example/api/index?action=chat',{method:'POST',headers:{origin:'https://chatbot.example'},body:JSON.stringify({message:'Is there Safaricom?'})}),{});const d=await r.json();assert.equal(r.status,200);assert.equal(d.tenant,'Safaricom');assert.equal(d.aiStatus,'not-needed');
});
test('status reports presence only and never exposes key',async()=>{
 const r=await handle(req('/api/index?action=status'),{AI_GATEWAY_API_KEY:'never-print-this-value',AI_GATEWAY_MODEL:'test/model'});const d=await r.json();assert.equal(d.aiConfigured,true);assert.equal(d.service,'chatbot');assert.doesNotMatch(JSON.stringify(d),/never-print-this-value/);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('status is not an AI success claim and handles missing configuration',async()=>{const d=await (await handle(req('/api/status'),{AI_GATEWAY_MODEL:'test/model'})).json();assert.equal(d.aiConfigured,false);});
test('media redirect preserves the original mapped image URL',async()=>{const [asset,target]=Object.entries(media).find(([,url])=>url.startsWith('https://galleria.co.ke/'));const r=await handle(req('/api/index?asset='+encodeURIComponent(asset.slice('/assets/'.length))),{});assert.equal(r.status,307);assert.equal(r.headers.get('location'),target);});
test('unmapped media cannot be used as an open redirect',async()=>{const r=await handle(req('/api/index?asset=https://evil.example/'),{});assert.equal(r.status,404);assert.equal(r.headers.get('location'),null);});
test('POST cannot be used to fetch media',async()=>{const r=await handle(new Request('https://chatbot.example/assets/missing.jpg',{method:'POST'}),{});assert.equal(r.status,405);});

test('public status distinguishes freshness from complete real-time sync',async()=>{
 const response=await handle(req('/api/status'),{}),data=await response.json();
 assert.equal(data.knowledgeSync.realtimeSync,false);
 assert(['outdated','partial','checked'].includes(data.knowledgeSync.status));
 assert.equal(typeof data.knowledgeSync.failedPages,'number');
 assert.equal(data.knowledgeSync.checkedAt,data.knowledgeUpdatedAt);
 assert.equal(data.knowledgeSync.timezone,'Africa/Nairobi');
});
