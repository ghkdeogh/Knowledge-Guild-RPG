# Knowledge Guild RPG

A small open-source top-down pixel guild where permitted member Wiki records become evidence-grounded avatars. Mission Board context, personal Wiki perspectives, synthesis drafts, and official decisions remain distinct.

## Run

```sh
cd apps/wiki-village
npm ci
npm run dev -- --host 0.0.0.0
```

Copy `apps/wiki-village/.env.example` to a local `.env` only when enabling the server-side OpenAI provider. Never use `VITE_*` for secrets. Without a key, the app uses an explicit evidence-grounded demo fallback.

Run `npm run snapshot` after adding permitted Wiki records, then `npm run test:snapshot && npm run test:guild && npm run test:chat && npm run build`.

No license has been selected yet. Add one before publishing a reusable release. Vercel deployment and GitHub push are separate operator actions.
