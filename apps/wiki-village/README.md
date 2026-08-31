# Knowledge Guild RPG Web

This Vite app is a read-only projection of `src/data/wiki-snapshot.json`. It never creates projects or members, reads Wiki source files, accepts questions, or writes repository data.

Run `npm run dev -- --host 0.0.0.0` to view the current snapshot. The only development middleware route is same-origin `POST /api/repository-status`; on an eligible local loopback request it may manually fetch public Git path metadata. It never pulls or writes files. If that request fails, the UI keeps showing the existing snapshot and announces the error.

Create a project with the JSONL CLI, not the browser:

```powershell
'{"statement":"기술 학습 기록을 설계하고 싶다."}' | node scripts/wiki-architect-cli.mjs --command analyze
```

Use `preview` with the returned blueprint, then submit the approved digest to `save`. `npm run build` safely rebuilds the snapshot before creating the production bundle.

## Village states

- `PROJECT_UNINITIALIZED`: one CLI `analyze` command; no hall, characters, or example data.
- `PROJECT_READY`: project hall and goal, plus a CLI reminder to complete member scaffolds.
- `VILLAGE_READY`: hall, one character per valid snapshot member, and a single selected-member detail modal.

The detail modal displays only the selected member's public activity/path metadata, allowlisted `personal` snapshot documents whose `memberId` matches and whose `source` is under `members/<member-id>/wiki/`, and skill `purpose`, `allowedScope`, and `readiness` metadata. A refreshed member `lastDate` takes precedence over the stored snapshot date for the character's neutral date/pose projection. The blocking modal traps Tab focus; closing a source preview with Escape returns focus to its source button. Source previews are snapshot summaries, not filesystem views.

Run `npm run test:snapshot`, `npm run test:onboarding`, `npm run test:chat`, `npm run test:repository`, `npm run test:guild`, `npm run test:layout`, `npm run test:answer-bubbles`, `npm run test:release-quickstart`, and `npm run build` before handoff. The retained headless onboarding/chat contracts are intentionally tested independently of this browser UI.
