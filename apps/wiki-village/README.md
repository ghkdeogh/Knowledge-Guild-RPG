# Knowledge Guild RPG Web

This Vite app is a read-only projection of `src/data/wiki-snapshot.json`. It never creates projects or members, reads Wiki source files, accepts questions, or writes repository data. The snapshot builder derives an observed flow from public Wiki records; that flow is not a project goal, synthesis, or official decision.

Run `npm run dev -- --host 0.0.0.0` to view the current snapshot. The only development middleware route is same-origin `POST /api/repository-status`; on an eligible local loopback request it may manually fetch public Git path metadata. It never pulls or writes files. If that request fails, the UI keeps showing the existing snapshot and announces the error.

Create a shared workspace scaffold with the JSONL CLI, not the browser:

```powershell
'{"statement":"첫 Wiki 기록: 기술 실험에서 관찰한 점을 적는다."}' | node scripts/wiki-architect-cli.mjs --command analyze
```

Use `preview-workspace` with the returned blueprint, then submit the approved digest to `save-workspace`. This is an explicit shared-workspace compatibility flow; the browser remains read-only. Personal setup starts with profile onboarding and `personal-wiki-init-cli.mjs`, not `wiki-architect-cli` personal preview/save. `npm run build` safely rebuilds the snapshot before creating the production bundle.

For profile-first onboarding, say **“온보딩 시작해줘”** or use the streaming JSONL command. It asks for a name first; a Korean display name is then followed by a separate storage-id setup question. After public-scope confirmation it asks exactly three interview questions, one at a time. This is an interactive JSONL session: keep the process running, send the next JSON object only after reading its JSONL events, and use the digest emitted after the third topic in the final two requests. It only writes approved `PROFILE.md` and provider-neutral `CONTEXT.md` in the selected member scope:

```powershell
@'
{"action":"start"}
{"action":"answer","answer":"이름"}
{"action":"privacy","approved":true}
'@ | node scripts/profile-onboarding-cli.mjs
```

Continue the same session with the three `{"action":"answer","answer":"..."}` topic replies. The third reply emits `approval.required` with `<digest>`; then send `{"action":"approve","expectedDigest":"<digest>"}` and `{"action":"save","expectedDigest":"<digest>"}`. A fresh process starts a fresh session, so do not use a one-shot pipe for the approval step. The credential-free `local-draft` interpreter is the default; when a configured external AI provider may receive interview answers and approved seed content, include `"providerApproved":true` only in the privacy confirmation after reviewing that transfer.

After the profile is saved, use the emitted `personal-wiki-init.next-step` command (or say “위키 초기화해줘”). `personal-wiki-init-cli.mjs` is a separate streaming JSONL flow that reads only that selected member's `PROFILE.md` and `CONTEXT.md`, proposes evidence-backed `raw/`, `wiki/`, and lowercase `output/` subfolders, then requires preview/digest approval before atomically creating a root and three scoped `CLAUDE.md` cross-agent operating contracts, `WIKI_SCHEMA.md`, `wiki/index.md`, and `wiki/log.md`. Fresh initialization leaves `CONTEXT.md` byte-identical. `raw/CLAUDE.md` and `output/CLAUDE.md` are local-only guidance and remain ignored with their layers; `wiki/CLAUDE.md` is operational configuration, never public knowledge. It never makes `WIKI_INDEX.md`, `ACTIVITY_LOG.md`, `harnesses/`, or `*.SKILL.md`. Use `providerApproved: true` only when the profile/context may be sent to the configured Responses provider; otherwise it stays conservative and offline. An approved migration adds only missing files, replaces only preview-declared CLAUDE/schema/index files, removes only a prior marked CONTEXT operation block when applicable, and stores originals in local ignored `.wiki-migration-backup/<digest>/`; nothing else is deleted or moved automatically.

## Village states

- `FLOW_UNINITIALIZED`: no public Wiki record; one CLI `analyze` command, no hall, characters, or example data.
- `FLOW_READY`: an observed flow from `projects/wiki/**` and/or `members/<id>/wiki/**`, plus one character per member with public documents.

The flow board displays current observed flow, frequent topics, new directions, explicit common/contrasting stances, knowledge gaps, questions, and re-checked allowlisted source summaries. It does not read `PROJECT_CONTEXT.md`, `WIKI_BLUEPRINT.md`, member `CONTEXT.md`/`WIKI_SCHEMA.md`/any `CLAUDE.md`, harnesses, raw/output/private/secrets, or `decisions/`. A refreshed member `lastDate` takes precedence over the stored snapshot date for the character's neutral date/pose projection. Source previews are snapshot summaries, not filesystem views.

`npm run snapshot` (and `npm run build`) creates the deterministic flow summary. The browser's repository-status button checks public Git path metadata only; it never rebuilds the snapshot, polls, creates cron work, or writes files.

Run `npm run test:snapshot`, `npm run test:onboarding`, `npm run test:chat`, `npm run test:repository`, `npm run test:guild`, `npm run test:layout`, `npm run test:answer-bubbles`, `npm run test:release-quickstart`, and `npm run build` before handoff. The retained headless onboarding/chat contracts are intentionally tested independently of this browser UI.
