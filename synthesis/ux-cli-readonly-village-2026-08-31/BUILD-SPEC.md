---
title: 'CLI-first read-only pixel village'
type: 'feature'
created: '2026-08-31'
status: 'done'
review_loop_iteration: 0
baseline_commit: '936008a254ea2bfb3a2fc44dd4a611f3867758ad'
context:
  - 'AGENTS.md'
  - 'WIKI_RULES.md'
  - 'synthesis/ux-cli-readonly-village-2026-08-31/DESIGN.md'
  - 'synthesis/ux-cli-readonly-village-2026-08-31/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 현재 브라우저는 Architect 인터뷰·scaffold 생성·자유 질문·Mission Board·집 탐색을 한 화면에 섞어, CLI가 주 생성 경로라는 제품 경계를 흐린다. 유효한 프로젝트가 없는 checkout에서도 과거 온보딩 UI가 생성 경로처럼 보인다.

**Approach:** CLI의 headless Architect와 JSONL 명령은 그대로 유지하고, 웹은 generated safe snapshot과 수동 repository-status metadata만 읽는 픽셀 마을로 축소한다. 저장된 유효 프로젝트만 중앙 길드홀과 목표를 만들고, 각 valid member는 공개 Wiki 자료에 근거한 캐릭터·상세 패널로 표현한다.

## Boundaries & Constraints

**Always:** `wiki-architect-cli.mjs`의 `analyze`, `preview`, `save`, `status`는 작동 가능한 유일한 사용자-facing 인터뷰/생성 경로다. UI는 `wiki-snapshot.json`과 allowlisted public Git-path metadata만 읽는다. 빈 snapshot에는 프로젝트 건물·가짜 member·예제 데이터를 만들지 않고 정확한 최소 CLI `analyze` 명령을 보여 준다. 캐릭터의 pose/bubble은 snapshot의 공개 경로 날짜 또는 갱신한 public dirty/remote metadata만 표현하며 실제 사람의 활동·의도·가용성을 주장하지 않는다. selected member 출처는 `scope === personal && memberId === member.id`를 재검사하고 스킬은 metadata만 노출한다.

**Ask First:** snapshot allowlist, member 공개 범위, CLI scaffold 데이터 모델, raw/private/secrets 정책, 또는 배포 API 권한을 바꾸는 일.

**Never:** 브라우저에서 onboarding·project/member 파일 생성·Wiki 수정·질문 제출을 렌더하거나, Mission Board/Answer Scroll/Answer Bubble/집 내부 검색을 유지한다. `members/` 원문을 읽거나 example project/member를 제품 데이터로 추가하지 않는다. headless CLI/server/evidence 계약을 이 UI 리팩터링 때문에 삭제하지 않는다.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| 빈 checkout | `PROJECT_UNINITIALIZED`, projectContext 없음 | CLI 시작 카드와 `analyze` 명령만 표시, hall/member 없음 | 생성 UI나 placeholder 없음 |
| project-only | valid project, member 0 | project hall/목표와 honest empty-member copy | 가짜 character 없음 |
| ready village | valid project/member snapshot | hall, member, 선택 상세, public source preview | scope가 다른 문서는 제외 |
| status refresh | same-origin loopback response | public dirty/remote 상태가 해당 character pose/bubble 및 detail에 반영 | fetch 실패는 오류 문구와 기존 snapshot 유지 |
| unavailable activity | public last-change date 없음 | `중립 대기`와 날짜 미확인 copy | 사람 상태를 추정하지 않음 |

</frozen-after-approval>

## Code Map

- `apps/wiki-village/src/App.jsx` — onboarding/chat/mission/interior/action-menu를 제거하고 snapshot-backed empty, village, selected-member detail, source preview만 구성한다. `PixelAvatar`, `memberHomePosition`, `documentsById` 안전 lookup을 재사용한다.
- `apps/wiki-village/src/styles.css` — pixel hall/home/avatar을 보존하되 입력·Mission Board·answer/interior 스타일을 읽기 전용 header, bubble, modal, mobile layout으로 교체한다.
- `apps/wiki-village/src/guild.js` — `activityDescription`과 `repositoryPathState`를 public-path-only 상태/카피의 유일한 입력으로 재사용한다.
- `apps/wiki-village/vite.config.js` — dev UI middleware를 repository-status만 남기고 onboarding/wiki-chat UI API 진입점을 해제한다. headless server/API/CLI files는 보존한다.
- `apps/wiki-village/scripts/check-village-layout.mjs` — 기존 복잡한 UI 문자열 검사를 empty/ready/read-only/detail/responsive contract로 바꾼다.
- `apps/wiki-village/scripts/check-guild.mjs` — role/activity/repository helper와 no-example snapshot 검사는 보존하고 새 member detail allowlist/표현 문구 contract를 확인한다.
- `README.md`, `apps/wiki-village/README.md` — 웹 인터뷰/질문/Answer Scroll 설명을 CLI-first creation 및 read-only status village로 고친다.
- `scripts/build-wiki-snapshot.mjs`, `core/wiki-architect.mjs`, `server/onboarding.mjs`, `server/wiki-chat.mjs` — 안전 snapshot/CLI/headless contracts이므로 이번 UI 변경에서 수정하거나 삭제하지 않는다.

## Tasks & Acceptance

**Execution:**
- [x] `src/App.jsx`, `src/styles.css` — CLI empty state와 최소 status village/detail을 구현한다.
- [x] `vite.config.js` — 개발 웹 경로에서 onboarding/chat surface를 제거하고 repository refresh만 유지한다.
- [x] `check-village-layout.mjs`, `check-guild.mjs`, `src/village-view.js` — 새 UI/data boundary를 contract-test한다.
- [x] `README.md`, `apps/wiki-village/README.md` — CLI/UI 책임을 정확히 문서화한다.

**Acceptance Criteria:**
- Given no canonical project, when the app renders, then it shows only CLI start guidance and no hall/member.
- Given a valid project/member snapshot, when a character is selected, then the panel shows only that member's public activity, public changes, allowlisted docs, and metadata skills.
- Given a repository refresh reports remote news or dirty public paths, when the village re-renders, then only the matching character visual/copy changes and no write occurs.
- Given a browser bundle, when its source is inspected, then it contains no onboarding/chat request or free-question input route.

## Design Notes

The map remains a projection, not an execution engine: refresh changes only the visible public-path metadata state; CLI save plus later snapshot build changes the project/member world. Small screens remove decorative bubbles before hiding text in the selected detail.

## Verification

**Commands:**
- `npm run test:snapshot && npm run test:onboarding && npm run test:chat && npm run test:repository && npm run test:guild && npm run test:layout && npm run test:answer-bubbles && npm run test:release-quickstart` — expected: offline boundary and regression contracts pass.
- `npm run build` — expected: safe snapshot then production Vite bundle succeeds.
- `git diff --check` — expected: no whitespace errors.

**Manual checks:** desktop and 390px empty snapshot, then temporary valid snapshot/browser projection; inspect refresh result, member selection, source preview, focus return, and no form/chat UI.

## Suggested Review Order

**Read-only product boundary**

- Snapshot state gates the entire village before any interactive UI can render.
  [`App.jsx:104`](../../apps/wiki-village/src/App.jsx#L104)

- Browser development surface exposes only non-writing repository status refresh.
  [`vite.config.js:1`](../../apps/wiki-village/vite.config.js#L1)

**Public member projection**

- Re-check scope, member identity, and source prefix before showing member facts.
  [`village-view.js:1`](../../apps/wiki-village/src/village-view.js#L1)

- Refresh metadata changes visual copy without inferring a person’s real activity.
  [`guild.js:23`](../../apps/wiki-village/src/guild.js#L23)

- Snapshot activity reads only explicit public member paths, never the whole member directory.
  [`build-wiki-snapshot.mjs:19`](../../apps/wiki-village/scripts/build-wiki-snapshot.mjs#L19)

**Contracts and handoff**

- Fixture helpers lock empty-state and cross-member allowlist boundaries.
  [`check-village-layout.mjs:4`](../../apps/wiki-village/scripts/check-village-layout.mjs#L4)

- Root documentation makes CLI ownership and the UI’s read-only scope explicit.
  [`README.md:20`](../../README.md#L20)
