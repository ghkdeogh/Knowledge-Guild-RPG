---
title: '온보딩 RPG로 프로젝트와 길드 만들기'
type: 'feature'
created: '2026-08-29'
status: 'done'
review_loop_iteration: 1
baseline_commit: '36ab538160a8d9db05e1dc9a3348ef456afbd4ab'
context:
  - 'WIKI_RULES.md'
  - 'AGENTS.md'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-29.md'
---

<frozen-after-approval reason="explicit product-direction order">

## Intent

Knowledge Guild RPG의 첫 화면은 완성된 Wiki 마을이 아니라 deterministic 대화형 RPG 온보딩이다. canonical `projects/PROJECT_CONTEXT.md`가 schema까지 유효하지 않으면 `PROJECT_UNINITIALIZED`이며, 안내자는 최초 자유 입력을 보존하되 반드시 “여러분은 어떤 프로젝트를 진행하려고 하나요?”를 먼저 묻는다. 프로젝트 이름/한 줄 설명, 문제, 대상 사용자, 목표·결과를 순서대로 확인해 canonical Markdown을 만들고 길드홀 생성 보상을 보인다. 이후 한 사람의 stable member-id, 개인 관점, 역할, 수집 데이터, 원하는 결과를 같은 방식으로 확인해 개인 Markdown을 안전하게 만든다. 프로젝트와 한 명 이상이 유효할 때만 기존 마을과 evidence-traceable answer를 보여 준다.

## Boundaries & Constraints

**Always:** project는 `projects/PROJECT_CONTEXT.md` 하나만 canonical이며, `projects/README.md`, template, placeholder는 initialized가 아니다. project 건물은 project facts만, member character/house는 해당 member Wiki만 나타낸다. 공통 사실·개인 의견·결정은 승격하지 않는다. persistence는 server-side adapter만 사용하고 atomic write, canonical path allowlist, member-id validation, create conflict, serialized request, write verification을 제공한다. 저장 전 file preview와 confirm, 저장 범위, local-writable/read-only mode, 오류를 텍스트로 보인다. animation은 reduced-motion에서 줄인다.

**Never:** 브라우저 filesystem 접근을 흉내 내거나 Vercel에서 영구 저장을 성공으로 말하지 않는다. raw/output/private/secrets/.env를 생성·색인·노출하지 않는다. `example-member` 또는 test fixture를 production snapshot/member avatar로 사용하지 않는다. LLM이 질문 순서·schema·persistence를 결정하지 않는다. 새 game engine을 추가하지 않는다.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior |
| --- | --- | --- |
| 신규 clone | missing/invalid canonical project context | `PROJECT_UNINITIALIZED`, prologue and ordered project interview; no Mission Board/village |
| 첫 자유 입력 | any text | opening context is retained locally, then exact project question is shown |
| project confirmation | valid four fields, local writable | preview → confirm → atomic canonical context creation → guildhall reward → member interview |
| member confirmation | valid id + four personal fields | preview → confirm → `CONTEXT.md`, `WIKI_SCHEMA.md`, `wiki/index.md` under exactly that member root → character reward |
| collision/traversal | existing canonical path, duplicate id, `../`, invalid id | no overwrite or out-of-root write; clear error and unchanged data |
| deployment | Vercel/read-only | preview/export guidance only; no success claim or write attempt |
| ready state | valid project and member | village; existing scoped answer flow stays usable |

</frozen-after-approval>

## Code Map

- `apps/wiki-village/server/onboarding.mjs` — new deterministic state validator, Markdown rendering/parsing, read-only policy and atomic repository adapter; testable with an injected temporary root.
- `apps/wiki-village/vite.config.js`, `api/onboarding.mjs`, `vercel.json` — expose same-origin onboarding API locally and read-only deployment handler without secrets or browser filesystem access.
- `apps/wiki-village/scripts/build-wiki-snapshot.mjs` — recognize only schema-valid canonical project context and valid member roots; produce an empty/project-ready snapshot without placeholders.
- `apps/wiki-village/src/App.jsx`, `src/styles.css` — retain Village/answer components behind an onboarding state gate; add accessible dialogue, preview/confirm, reward transition and reduced-motion styles.
- `apps/wiki-village/scripts/check-onboarding.mjs` — new temporary-root contract tests for state progression, Markdown boundaries, duplicate/traversal/collision and read-only behavior.
- `check-wiki-snapshot.mjs`, `check-vercel-deploy.mjs`, `check-village-layout.mjs`, `check-guild.mjs` — revise expectations for no project/no member initial state and assert `example-member` is absent.
- `projects/PROJECT_CONTEXT.example.md` — preserve the previous description as noncanonical documentation; remove canonical `PROJECT_CONTEXT.md` and `members/example-member`.

## Tasks & Acceptance

- [x] Implement the server-only onboarding contract/API and local persistence adapter.
- [x] Replace seeded canonical state/example member with non-production documentation and update safe snapshot rules.
- [x] Add the project/member interview state machine, previews, confirm actions, rewards and village gate.
- [x] Add and revise contracts for all requested state, safety and deployment cases.

**Acceptance Criteria:**

- Given no valid canonical context, when the app loads, then no complete village/Mission Board is rendered and the required project question is reachable after any opening input.
- Given each confirmed local interview, when the server succeeds, then only its canonical Markdown paths exist with valid schema and a subsequent state read reports the next phase.
- Given invalid IDs, duplicate paths, collisions, partial write failure or read-only mode, when saving, then no unauthorized/partial file is created and the UI/API reports the true result.
- Given a valid project plus member, when the user enters the village, then scope-safe existing evidence answers remain available and no `example-member` appears.

## Verification

- `npm run test:onboarding`, `npm run test:snapshot`, `npm run test:chat`, `npm run test:deploy`, `npm run test:layout`, `npm run test:guild`, `npm run build`
- browser desktop and 390px: project interview, member interview, reward, village and evidence panel
- `git diff --check`

### Review Findings

- [x] [Review][Patch] private/secrets Wiki subtree exclusion [apps/wiki-village/scripts/build-wiki-snapshot.mjs:15] — traversal and source allowlist에서 private·secrets를 명시적으로 차단했다.
- [x] [Review][Patch] deployment state projection [apps/wiki-village/server/onboarding.mjs:160] — read-only handler는 source filesystem 대신 included safe snapshot의 상태를 반환한다.
- [x] [Review][Patch] heading character parsing [apps/wiki-village/server/onboarding.mjs:34] — 본문 `#`가 schema round-trip을 자르지 않도록 section 종료 조건을 heading line으로 제한했다.
- [x] [Review][Patch] local writable API boundary [apps/wiki-village/server/onboarding.mjs:229] — write-capable middleware는 loopback remote address만 허용하고 명확한 오류를 반환한다.
- [x] [Review][Patch] artifact refresh rollback [apps/wiki-village/server/onboarding.mjs:153] — refresh 실패 시 새 canonical source와 generated artifact를 이전 쌍으로 복구한다.
- [x] [Review][Patch] project-ready orphan evidence rejection [apps/wiki-village/scripts/build-wiki-snapshot.mjs:48] — member 없는 상태에서는 personal artifact를 보존하지 않는다.
- [x] [Review][Defer] 여러 member 추가 UI [apps/wiki-village/src/App.jsx] — 첫 member onboarding 완료를 이번 흐름의 종료로 두며, 추가 member 진입은 권한/수정 UX와 함께 후속으로 설계한다.
- [x] [Review][Defer] legacy member migration diagnostics [apps/wiki-village/server/onboarding.mjs] — 기존 schema 밖 directory의 복구 UX는 별도 migration 정책 없이 추정하지 않는다.

## Suggested Review Order

**상태·저장 경계**

- [onboarding.mjs:137](../../apps/wiki-village/server/onboarding.mjs#L137) — 원자적 create, refresh 실패 rollback, canonical path와 loopback-only write 경계를 확인한다.
- [build-wiki-snapshot.mjs:35](../../apps/wiki-village/scripts/build-wiki-snapshot.mjs#L35) — canonical schema에서만 `PROJECT_UNINITIALIZED`/`PROJECT_READY`/`VILLAGE_READY`를 산출하고 민감한 하위를 배제하는지 확인한다.

**온보딩 UI**

- [Onboarding.jsx:39](../../apps/wiki-village/src/Onboarding.jsx#L39) — 질문 순서, preview/confirm, read-only 안내, reward와 reload 이후 village gate를 확인한다.
- [App.jsx:246](../../apps/wiki-village/src/App.jsx#L246) — 유효한 ready state 전에는 기존 Mission Board와 answer flow가 보이지 않는지 확인한다.

**검증**

- [check-onboarding.mjs](../../apps/wiki-village/scripts/check-onboarding.mjs)와 package scripts를 실행해 temporary-root persistence, boundary, deployment contract를 재현한다.
