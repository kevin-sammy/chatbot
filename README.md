# Chatbot

A conversational AI visitor assistant for a website, with source-backed store recommendations, opening hours, parking information and follow-up questions. Built with JavaScript, Node.js and Vercel AI Gateway. The repository and hosting project are named **chatbot**.

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
   - `AI_GATEWAY_API_KEY`: your Gateway key, stored as a **Secret** for Production.
   - `AI_GATEWAY_MODEL`: `openai/gpt-4.1-mini`.
4. Deploy. If you add or change variables afterward, redeploy so the new values apply.
5. Open `/api/status` to check whether both AI settings are present. Then ask a question and verify `/api/chat` returns `mode: "ai"` and `aiStatus: "active"`. Presence of settings alone does not prove a successful AI request.

The key is only read by the server and is never sent to the browser. A real key is not included in this repository. Configure Preview with a separate key only if AI is needed on preview deployments.

## Behavior and sources

- `site/pages-01.tar.gz` and `site/pages-02.tar.gz` contain linked captured pages; `site/assets.tar.gz` contains downloaded CSS, JavaScript and fonts. The build extracts these into `dist/`. `client/assistant.js` is the editable popup source and overrides the captured copy during build. The captures are packaged to keep the portfolio source easy to browse.
- Media that is not bundled redirects through an allowlist to its original public URL; those images and videos require the original host to remain available.
- `lib/chat.mjs` sends the latest question, bounded conversation history and checked evidence to AI Gateway. The client retains history in page memory until navigation/reload.
- Missing brands receive suitable listed alternatives; unconfirmed facilities stay unconfirmed. Opening Soon listings are never presented as operating.
- General Safaricom retail examples are qualified separately from services confirmed for the mall outlet.
- Invalid AI output or Gateway errors fall back to the checked directory. Replies distinguish AI from directory mode and link to official sources.
- Tenant and visitor facts were checked on 15 October 2026. Published hours are not live opening status. Refresh is manual; prices, stock and services need store confirmation.
- Forms, bookings, WordPress administration and live backend features are not reproduced. Captured frontend content is not the original private server source.

## Checks and data refresh

```sh
npm test
npm run build
```

For an intentional knowledge refresh, install `requirements-knowledge.txt`, then run `python scripts/refresh-knowledge.py` and `python scripts/build-answers.py`. Review changes before deploying. These scripts update the chatbot knowledge, not the captured website pages. Activity review evidence is stored separately in `data/activities.json`.
