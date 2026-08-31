---
title: '첫 Wiki 기록을 personal-only로 분리'
type: 'bugfix'
created: '2026-08-31'
status: 'done'
review_loop_iteration: 0
baseline_commit: '71afc9179fa887225c75a980ff10522dc30dac29'
context:
  - 'AGENTS.md'
  - 'WIKI_RULES.md'
  - 'README.md'
---

<frozen-after-approval reason="사용자가 중간 승인 없이 진단부터 구현·리뷰·커밋까지 진행하도록 명시">

## Intent

**Problem:** 첫 기록의 기본 `preview`와 `save`가 개인 Wiki와 project scaffold를 하나의 트랜잭션으로 생성한다. 이는 개인 공개 기록에서 관찰 흐름이 emergent하게 생겨야 한다는 제품 경계와 충돌하며, `saveProject`/`saveMember` alias가 그 경계를 숨긴다.

**Approach:** 기본 Architect 명령을 member root만 계획·저장하는 personal-only 계약으로 바꾸고, 기존 combined scaffold는 digest가 필요한 별도 explicit workspace command로 분리한다. snapshot은 member public Wiki 하나만으로 그대로 flow를 관찰해야 한다.

## Boundaries & Constraints

**Always:** 기본 preview/save와 JSONL events의 `files.planned`/`files.written`은 `members/{member-id}/`만 반환한다. member 초기 구조는 CONTEXT, WIKI_SCHEMA, WIKI_INDEX, ACTIVITY_LOG, `wiki/`, `harnesses/` 및 contract에 필요한 최소 local layers로 한정한다. personal 저장은 기존 project root가 있어도 가능하고 member collision은 fail-closed이며 기존 파일을 바꾸지 않는다. workspace 저장은 project+member를 명시적으로 preview하고 그 mode의 digest만 승인하며 원자 rollback과 refresh artifact 복구를 유지한다. 웹 UI는 read-only 상태를 유지한다.

**Ask First:** 기존 member root overwrite/migration, 개인 기록을 `projects/` 또는 `decisions/`로 승격, 기존 사용자 생성물의 정리·이동·수정.

**Never:** 기본 save의 project fallback, alias로 의미를 숨기는 API, user raw text 자동 저장, 다른 member space 접근, project 공통 사실/official decision 자동 생성, 원본 저장소의 untracked 사용자 artifacts 변경, BMAD runtime/install 커밋.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| 첫 기록 | valid blueprint + identity, default preview/save | member-only plan and member-only persisted scaffold | mode-specific digest required |
| explicit workspace | valid blueprint + identity, `save-workspace` | project and member plans/persist together | atomic rollback on any write/refresh error |
| project already exists | valid new member identity | personal save succeeds without project writes | no project collision gate |
| member already exists | any default save for same id | no files changed | collision error |
| cross-mode approval | personal digest supplied to workspace or inverse | no files written | preview-mismatch |

</frozen-after-approval>

## Code Map

- `apps/wiki-village/server/onboarding.mjs` — current combined renderer/transaction, default aliases, state parsing, and refresh rollback; split plan/save functions and scope-specific collision/rollback roots.
- `apps/wiki-village/server/project-wiki-architect.mjs` — reuse member renderer, but avoid unnecessary initial empty source/output/page-type scaffolding where the harness contract permits.
- `apps/wiki-village/server/wiki-architect-application.mjs` — route default `preview`/`save` to personal functions and add explicit workspace commands while emitting exact plan/write paths.
- `apps/wiki-village/scripts/wiki-architect-cli.mjs` — accepts the new command names through the shared application boundary.
- `apps/wiki-village/scripts/release-quickstart.mjs` and `check-release-quickstart.mjs` — release fixture must deliberately use workspace mode.
- `apps/wiki-village/scripts/check-onboarding.mjs` — isolated temp-root contracts for modes, digest separation, collision, rollback and member-only snapshot behavior.
- `README.md`, `apps/wiki-village/README.md`, `src/App.jsx` — first-record command and copy must describe personal-only CLI flow; browser remains no-write.

## Tasks & Acceptance

**Execution:**
- [x] `server/onboarding.mjs`, `server/wiki-architect-application.mjs` — separate personal and workspace previews/saves and remove misleading aliases.
- [x] `server/project-wiki-architect.mjs` — render the minimal valid personal initial scaffold without creating project artifacts.
- [x] `scripts/check-onboarding.mjs`, `scripts/check-release-quickstart.mjs`, `scripts/release-quickstart.mjs` — cover scope, mode digest, atomicity and explicit release mode using temp fixtures only.
- [x] `README.md`, `apps/wiki-village/README.md`, `src/App.jsx` — expose an executable personal-first CLI path and document workspace scaffolding as advanced opt-in.

**Acceptance Criteria:**
- Given a valid default preview/save, when events and filesystem are inspected, then every planned/written path starts with the requested member root and no project blueprint/context/wiki exists.
- Given a workspace preview digest, when `save-workspace` runs, then both roots appear or neither root/artifact change remains after a forced failure.
- Given either mode's digest supplied to the other, when saving, then it is rejected before writing.
- Given a member-only public document, when snapshot tests run, then its observed flow works without a project scaffold.

## Verification

**Commands:**
- `npm run test:onboarding` — scope, digest, collisions, rollback and CLI/API contracts pass.
- `npm run test:release-quickstart` — explicit workspace quickstart passes in temp roots.
- `npm run test:snapshot && npm run test:chat && npm run test:deploy && npm run test:layout && npm run test:guild && npm run test:repository && npm run test:answer-bubbles && npm run build` — existing offline contracts and build pass.
- `git diff --check` — no whitespace errors.

## Suggested Review Order

**Command and persistence boundary**

- Default commands create only a member root; workspace creation is explicit and transaction-scoped.
  [`onboarding.mjs:40`](../../apps/wiki-village/server/onboarding.mjs#L40)

- Application events derive their exact paths from the selected personal or workspace plan.
  [`wiki-architect-application.mjs:19`](../../apps/wiki-village/server/wiki-architect-application.mjs#L19)

- Browser middleware deliberately exposes analysis and previews, never persistent save actions.
  [`onboarding.mjs:89`](../../apps/wiki-village/server/onboarding.mjs#L89)

**Personal record safety**

- Minimal personal scaffold keeps working context local while retaining approved routing metadata.
  [`project-wiki-architect.mjs:156`](../../apps/wiki-village/server/project-wiki-architect.mjs#L156)

**Regression coverage and documentation**

- Temp-root contracts exercise mode digests, collision, rollback, member-only flow, and read-only web actions.
  [`check-onboarding.mjs:33`](../../apps/wiki-village/scripts/check-onboarding.mjs#L33)

- Release quickstart intentionally chooses the explicit workspace mode.
  [`release-quickstart.mjs:45`](../../apps/wiki-village/scripts/release-quickstart.mjs#L45)

- First-record instructions distinguish the default personal path from the advanced workspace path.
  [`README.md:82`](../../README.md#L82)
