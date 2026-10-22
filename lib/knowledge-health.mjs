// A refresh timestamp alone never establishes complete, real-time parity.
export function knowledgeHealth(catalog, tenants, now = new Date()) {
 const documents = catalog.documents || [], failures = catalog.failures || [];
 const stalePages = documents.filter(d => d.stale).length;
 const retainedStores = tenants.filter(t => t.refreshStatus).length;
 const updatedAt = catalog.crawlCompletedAt || catalog.lastSuccessfulCrawl || null;
 const age = updatedAt ? now.getTime() - Date.parse(updatedAt) : NaN;
 const fresh = Number.isFinite(age) && age >= 0 && age <= 36 * 60 * 60 * 1000;
 const incomplete = failures.length > 0 || stalePages > 0 || retainedStores > 0 || catalog.crawlSummary?.discoveryComplete === false;
 return {
  status: !fresh ? 'outdated' : incomplete ? 'partial' : 'checked',
  lastRefreshStatus: incomplete ? 'partial' : 'checked',
  checkedAt: updatedAt, timezone: 'Africa/Nairobi',
  failedPages: failures.length, stalePages, retainedStores,
  storedPages: documents.length, storeCount: tenants.length,
  attemptedPages: catalog.crawlSummary?.attemptedPages ?? null,
  fetchedPages: catalog.crawlSummary?.fetchedPages ?? null,
  discoveryComplete: catalog.crawlSummary?.discoveryComplete ?? null,
  realtimeSync: false,
  explanation: 'Scheduled snapshot of discovered official pages; changes after the check may not be included. Failed pages retain older information.',
 };
}
