# Chatbot

A conversational AI visitor assistant for a website, with source-backed store recommendations, opening hours, parking information and follow-up questions. Built with JavaScript, Node.js and direct Groq API support, with optional Vercel AI Gateway compatibility. The repository and hosting project are named **chatbot**.

The included case study uses a captured public Galleria mall website. It is an independent prototype, not the mall’s official website. Original names, logos, photos and page content belong to their respective owners. The school management system is a separate project.

## Run locally

Requires Node.js 22.13 or newer. There are no runtime npm dependencies.

```sh
cp .env.example .env.local
npm run build
npm run dev
```

Open http://localhost:3000. Fill in your key in the ignored `.env.local` file to enable AI; without a key the assistant uses checked directory answers. Never commit that file.

## Deploy on Vercel

1. Create/import the GitHub repository named `chatbot` and choose it in Vercel’s **Add New → Project** flow.
2. Set the framework to **Other**, root directory to the repository root, build command to `npm run build`, and output directory to `dist`. `vercel.json` contains these settings.
3. Add server environment variables:
   - `GROQ_API_KEY`: your Groq key, stored as a **Secret** for Production.
   - `GROQ_MODEL`: `openai/gpt-oss-20b`
   - `AI_PROVIDER`: `groq`.
4. Deploy. If you add or change variables afterward, redeploy so the new values apply.
5. Open `/api/status` to check whether both AI settings are present. Then ask a question and verify `/api/chat` returns `mode: "ai"` and `aiStatus: "active"`. Presence of settings alone does not prove a successful AI request.

The key is only read by the server and is never sent to the browser. A real key is not included in this repository. Configure Preview with a separate key only if AI is needed on preview deployments.

## Behavior and sources

- `site/pages-01.tar.gz` and `site/pages-02.tar.gz` contain linked captured pages; `site/assets.tar.gz` contains downloaded CSS, JavaScript and fonts. The build extracts these into `dist/`. `client/assistant.js` is the editable popup source and overrides the captured copy during build. The captures are packaged to keep the portfolio source easy to browse.
- Media that is not bundled redirects through an allowlist to its original public URL; those images and videos require the original host to remain available.
- `lib/chat.mjs` sends the latest question, bounded conversation history and checked evidence to the selected AI provider. Groq requests go directly to Groq, without Vercel AI Gateway credits. With `AI_PROVIDER=groq`, failures return directory answers and never switch to Gateway. Groq requests use a compact directory and bounded history to reduce free-tier token usage. The client retains history in page memory until navigation/reload.
- Missing brands receive suitable listed alternatives; unconfirmed facilities stay unconfirmed. Opening Soon listings are never presented as operating.
- Safaricom replies use the official mall listing and distinguish confirmed information from unconfirmed branch services.
- Invalid AI output or AI provider errors fall back to the checked directory. Replies distinguish AI from directory mode and link to official sources.
- Store and page knowledge is refreshed by the daily workflow described below. Curated visitor FAQs and image transcriptions need manual review. Published hours are not live opening status; prices, stock and services need store confirmation.
- Forms, bookings, WordPress administration and live backend features are not reproduced. Captured frontend content is not the original private server source.

## Checks and data refresh

```sh
npm test
npm run build
```

Use `npm run ingest` for the current refresh pipeline, then validate and review changes as described below. The older `refresh-knowledge.py` and `build-answers.py` scripts are legacy tools and are not part of the scheduled pipeline. Activity review evidence is stored separately in `data/activities.json`.

### Groq setup

Create a key at https://console.groq.com/keys on the Free plan. Save `GROQ_API_KEY` as a Production Secret in the chatbot Vercel project, with `AI_PROVIDER=groq` and optional `GROQ_MODEL=openai/gpt-oss-20b`, then redeploy. Do not put the key in client code, GitHub or chat. The free plan has organization-level token and request limits; if limited, the assistant uses its checked directory without attempting a paid provider. `/api/status` reports presence only; confirm a real `/api/chat` response has `provider: "groq"`, `mode: "ai"`, and `aiStatus: "active"`.

## Conversational retrieval upgrade

The chat API returns bounded `state` as well as bounded history. The widget keeps both only in page memory. Store choices, the pending offer, selected event/deal and language survive short replies such as “yes”, “there”, “the second one” and “on Sunday”. Explicit new topics clear the old subject. Controlled steps use checked replies even when AI is unavailable; other replies use the existing Groq configuration. No provider migration or model training is involved.

Galleria-specific claims and citations now use only the official mall website. General Safaricom retail examples are no longer treated as branch evidence. Published rates bypass generation. The assistant cannot book, pay, create tickets or transfer a visitor to an agent; **Talk to a human** displays contacts.

### Refresh and date handling

Run `npm run ingest` to fetch the official HTML site map, directory, full store/event/deal pages, visitor information and linked news. The dependency-free Python crawler limits concurrency, checks robots.txt, rejects external redirects, bounds page sizes and retains failed records with a stale flag. `data/catalog.json` holds full extracted documents, dated records and searchable passages; existing `data/tenants.json` remains the store directory. Malformed/empty refreshes fail before publication. Current store-floor coverage must pass a completeness gate.

Manual image transcriptions go in `data/manual-overrides.json`. Follow `exampleTemplate`; set `approved: true` only after checking the official source and filling `verifiedAt`. Overlapping contradictory approved entries trigger a confirmation answer. The crawler never changes this file. Existing curated visitor FAQs remain in `data/knowledge.json`; an image-only tariff change still needs a reviewed transcription.

The workflow **Verify chatbot and refresh official knowledge** runs tests on pushes and pull requests, and refreshes daily at 02:17 UTC (05:17 Nairobi), with a manual Run workflow option. The refresh job on `main` has repository-scoped `contents: write` only to commit validated data. Other jobs have read access. Actions are SHA-pinned; no personal token, AI key or Vercel secret is required. Validated commits use the existing Vercel Git integration. GitHub schedules can be delayed or disabled after repository inactivity; check Actions and deployment status, and use Run workflow after reactivation. Failed refreshes leave the previous deployed knowledge intact.

Every generation receives the Nairobi date/time. Expired and cancelled records are excluded from current recommendations. Missing years are **not inferred from image filenames or publication dates**. If a page provides only “31 Oct”, the assistant can report that published day/month but explicitly says the year is unverified and requests confirmation. This is preferable to inventing a current event. A human can supply a verified date transcription after checking the official artwork.

### Checks

- `npm test`: routing, conversation, provider boundaries, privacy and date regressions.
- `python3 -m unittest discover -s tests -p '*_test.py'`: ingestion fixtures.
- `npm run check:knowledge`: source/schema and completeness checks.
- `npm run evaluate`: 87 realistic scenarios, including multi-turn and Kiswahili cases, without AI credits.
- `CHATBOT_EVAL_URL=https://your-preview/api/chat npm run evaluate`: opt-in live evaluation; calls the configured provider and is subject to quotas/rate limits. Use a staging target rather than bulk-testing production.
- `npm run build`: captured site build with the updated widget; no automatic event/deal announcements.

### Privacy and rate limiting

Application logs contain allowlisted quality metrics, not questions, answers, history, names or contacts. Production metrics are enabled unless `CHAT_METRICS=0`; local runs can enable them with `CHAT_METRICS=1`. Hosting/AI providers may process request data according to their own terms; the widget notice is not a claim of legal compliance. Review data handling and provider retention with management before official launch. Weekly review can use saved CI evaluation results; live log retention follows the hosting plan.

The supplementary in-process guard permits 30 requests per minute per platform-supplied IP, with short-lived salted hashes. It **does not share counters across instances**. For platform-wide enforcement, configure a narrowly scoped Vercel WAF rate limit on POST `/api/chat` and POST `/api/index?action=chat`, keyed by IP, reviewing existing rules and included usage first. Start in log mode and review traffic before enforcing. The adapter also supports an existing Upstash Redis REST service through `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; it uses atomic increment/expiry, never stores raw IPs, and fails safely if the configured shared counter is unavailable. These settings are optional; no paid service is provisioned automatically.

The visitor checklist adds 20 exact customer questions and a coffee/cake follow-up flow. Assertions check canonical links, current directory floors and coming-soon status dynamically so scheduled refreshes can update real facts. Event years and adjacent-store claims still require official evidence.

### English and Kiswahili

The widget has an English/Kiswahili selector, and recognizes common Kiswahili questions automatically. The selected language stays in page memory through neutral replies, store names, “ndiyo”, “hapana” and “la pili”; visitors can explicitly switch with “In English please” or “Jibu kwa Kiswahili”. Main directory, visitor FAQ, event and deal answers have deterministic Kiswahili responses for provider outages. Store names, contact details, dates and amounts are preserved. Familiar Sheng greetings receive clear Kiswahili rather than invented slang.

`data/kiswahili.json` pairs each curated visitor translation with its exact English source. If the source changes, that translation is no longer reused; review and update the pair rather than keeping outdated facts. Live store and event translations use refreshed structured records. The language support covers common mall enquiries, not every possible dialect or phrasing.
