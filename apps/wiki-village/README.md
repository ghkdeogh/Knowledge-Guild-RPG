# Knowledge Guild RPG Web

This Vite app is a read-only projection of `src/data/wiki-snapshot.json`. It never creates projects or members, reads Wiki source files, accepts questions, or writes repository data. The snapshot builder derives an observed flow from public Wiki records; that flow is not a project goal, synthesis, or official decision.

Run `npm run dev -- --host 0.0.0.0` to view the current snapshot. The only development middleware route is same-origin `POST /api/repository-status`; on an eligible local loopback request it may manually fetch public Git path metadata. It never pulls or writes files. If that request fails, the UI keeps showing the existing snapshot and announces the error.

Create a project with the JSONL CLI, not the browser:

```powershell
'{"statement":"첫 Wiki 기록: 기술 실험에서 관찰한 점을 적는다."}' | node scripts/wiki-architect-cli.mjs --command analyze
```

Use `preview` with the returned blueprint, then submit the approved digest to `save`. That default CLI flow creates only the requested member's personal Wiki; the browser remains read-only. Use `preview-workspace` and `save-workspace` only when an explicit project-and-member scaffold is needed. `npm run build` safely rebuilds the snapshot before creating the production bundle.

## Village states

- `FLOW_UNINITIALIZED`: no public Wiki record; one CLI `analyze` command, no hall, characters, or example data.
- `FLOW_READY`: an observed flow from `projects/wiki/**` and/or `members/<id>/wiki/**`, plus one character per member with public documents.

The flow board displays current observed flow, frequent topics, new directions, explicit common/contrasting stances, knowledge gaps, questions, and re-checked allowlisted source summaries. It does not read `PROJECT_CONTEXT.md`, `WIKI_BLUEPRINT.md`, member `CONTEXT.md`/`WIKI_SCHEMA.md`, harnesses, raw/output/private/secrets, or `decisions/`. A refreshed member `lastDate` takes precedence over the stored snapshot date for the character's neutral date/pose projection. Source previews are snapshot summaries, not filesystem views.

`npm run snapshot` (and `npm run build`) creates the deterministic flow summary. The browser's repository-status button checks public Git path metadata only; it never rebuilds the snapshot, polls, creates cron work, or writes files.

Run `npm run test:snapshot`, `npm run test:onboarding`, `npm run test:chat`, `npm run test:repository`, `npm run test:guild`, `npm run test:layout`, `npm run test:answer-bubbles`, `npm run test:release-quickstart`, and `npm run build` before handoff. The retained headless onboarding/chat contracts are intentionally tested independently of this browser UI.
