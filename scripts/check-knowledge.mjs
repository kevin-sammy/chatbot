import fs from 'node:fs';
import {officialURL} from '../lib/content.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)));
const tenants=JSON.parse(fs.readFileSync(new URL('../data/tenants.json',import.meta.url)));
if(tenants.length<5||new Set(tenants.map(t=>t.url)).size!==tenants.length)throw Error('Incomplete or duplicate store directory');
for(const t of tenants)if(!officialURL(t.url)||!t.name||!['listed','opening-soon','unknown'].includes(t.status))throw Error('Invalid store record');
for(const r of data.documents||[])if(!officialURL(r.url)||!r.title||!r.text||!r.lastCrawled)throw Error('Invalid document');
for(const r of [...data.events||[],...data.deals||[]]){
 if(!officialURL(r.url)||!r.id||!r.title)throw Error('Invalid dated record');
 for(const key of ['startDate','endDate','validUntil'])if(r[key]&&!/^20\d{2}-\d{2}-\d{2}$/.test(r[key]))throw Error('Invalid date');
 if(r.startDate&&r.endDate&&r.startDate>r.endDate)throw Error('Date conflict');
}
console.log(`Knowledge validation passed: ${tenants.length} stores, ${data.events?.length||0} events, ${data.deals?.length||0} deals.`);
