# Knowledge Guild RPG Web

`npm run dev -- --host 0.0.0.0` starts the standalone React/Vite prototype and its same-origin `POST /api/wiki-chat` boundary.
`npm run build` first rebuilds `src/data/wiki-snapshot.json` by safely discovering dynamic `members/*` Wiki structures, then creates a static production bundle.

The browser never reads local Wiki files. The scene labels deterministic movement and evidence-grounded demo dialogue separately from the read-only Wiki snapshot.

## Knowledge Village

The product shell is a general **Knowledge Guild RPG**: a current project is one loaded example, not the product identity. The in-world Mission Board is explicitly **프로젝트 공통 맥락** and stays separate from personal Wiki perspectives, synthesis drafts, and official decisions. The Skill Dock has working paths for Wiki exploration, project focus, evidence verification, opt-in perspective comparison, selective meetings, and a clearly non-decision synthesis draft.

Copy `.env.example` to `.env` only on the local server-running machine and set `OPENAI_API_KEY`; optionally set `OPENAI_MODEL` (default: `gpt-5.6-terra`) and `OPENAI_REASONING_EFFORT` (default: `low`; accepted: `none`, `low`, `medium`, `high`, `xhigh`, `max`). `npm run dev -- --host 0.0.0.0` loads these non-`VITE_*` values server-side with Vite `loadEnv(..., '')`; never use a `VITE_*` variable for a key. Without a key—or if the provider fails—the API returns an explicitly labelled `demo-fallback` grounded in the local deterministic index. `vite preview` and a deployed static `dist/` have no API middleware: production requires an equivalent server endpoint with server-only environment configuration. Run `npm run test:snapshot`, `npm run test:chat`, and `npm run build` before handoff.

## Vercel deployment

Deploy from the repository root: `npx vercel --yes`. A temporary deployment can be claimed in Vercel, then configure the server-only project variables `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6-terra`, and `OPENAI_REASONING_EFFORT=low`, followed by `npx vercel --prod`. The root `vercel.json` builds this app into `apps/wiki-village/dist` and serves the same-origin `POST /api/wiki-chat` function. Only a generated server-only evidence artifact containing allowed `members/*/WIKI_SCHEMA.md` and `members/*/wiki/**/*.md` is traced into the function; raw, output, private, hidden, Obsidian, template, and clipper files are excluded. Do not mark a deployment production-ready until the deployed endpoint is verified.

Remote Vercel builds do not upload member Wiki source Markdown. When those source roots are unavailable, the snapshot step preserves only a committed snapshot/evidence pair that passes member, path, date, and ID-consistency validation; it fails rather than publishing an empty or unverified snapshot. Regenerate and commit both artifacts locally whenever allowed Wiki documents change.
