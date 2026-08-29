# Knowledge Guild RPG

A small open-source top-down pixel guild where permitted member Wiki records become evidence-grounded avatars. Mission Board context, personal Wiki perspectives, synthesis drafts, and official decisions remain distinct.

## Project Wiki Architect

The headless Architect is the product core; the local API and pixel village are clients that project its persisted state and structured events. The shared flow is `core/application → JSON/JSONL CLI or local API → React pixel projection`. A browser never invents a completed session or writes Wiki files directly.

From `apps/wiki-village`, analyze one free-form statement without writing files:

```powershell
'{"statement":"시장 신호와 경쟁 기업을 분석해 투자 가설을 검증하고 싶다."}' | node apps/wiki-village/scripts/wiki-architect-cli.mjs --command analyze
```

The command emits JSONL events such as `session.started`, `blueprint.proposed`, `approval.required`, and `session.completed`, followed by a `result` record. Use `preview` to obtain a digest, then `save --repo-root <local-root>` with that digest to apply an approved blueprint. `status` reads an existing local scaffold. Ingest/query/lint are explicit future harness roles selected in the blueprint; they do not run implicitly.

`raw/`, compiled `wiki/`, and `output/` are separate layers. `raw/` is immutable after explicit ingest, and raw/output/private/secrets never enter the browser snapshot. Vercel is read-only: it can show a proposed bundle but cannot claim to persist it; local CLI/local API (or a future GitHub adapter) performs writes.

## Run

```sh
cd apps/wiki-village
npm ci
npm run dev -- --host 0.0.0.0
```

Copy `apps/wiki-village/.env.example` to a local `.env` only when enabling the server-side OpenAI provider. Never use `VITE_*` for secrets. Without a key, the app uses an explicit evidence-grounded demo fallback.

Run `npm run snapshot` after adding permitted Wiki records, then `npm run test:snapshot && npm run test:guild && npm run test:chat && npm run build`.

No license has been selected yet. Add one before publishing a reusable release. Vercel deployment and GitHub push are separate operator actions.
