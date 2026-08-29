---
title: '근거 추적 가능한 길드 답변 세로 슬라이스'
type: 'feature'
created: '2026-08-29'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'd7c249a1aff1aaf22a371d52957af10222d9e18d'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/WIKI_RULES.md'
  - '{project-root}/projects/PROJECT_CONTEXT.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 현재 마을은 허용된 개인 Wiki 문서를 열람할 수 있지만, Mission Board에서 공통 맥락을 확인하고 한정된 범위로 질문한 뒤 답변의 근거와 한계를 검증하는 완결 흐름이 없다. 서버도 무관한 검색 결과와 모델의 `knowledgeType`을 충분히 차단하지 못한다.

**Approach:** 따뜻한 픽셀 마을 위에 Mission Board와 한 명/한 scope 질문 패널을 추가하고, 검증된 응답 envelope와 허용 citation만 표시하는 source drawer를 연결한다. snapshot/evidence 쌍에는 동일 content manifest를 넣어 서버가 서로 다른 세대의 artifact를 사용하지 않게 한다.

## Boundaries & Constraints

**Always:** `answer`, `citations`, `confidence`, `knowledgeType`, `limitation`, `mode`, `sourceScope`를 모든 성공·fallback·unsupported 응답에서 제공한다. personal은 선택된 유효 member의 허용 문서만, project는 `projects/`만 쓴다. citation은 이번 retrieval evidence allowlist와 snapshot metadata 모두에 있는 것만 표시한다. `knowledgeType`은 citation의 record metadata에서 서버가 계산하며 모델 값을 신뢰하지 않는다. 무관하거나 빈 근거는 `unsupported`로 끝내고 추측하지 않는다. UI는 실제 AI, demo fallback, 오류, unsupported를 서로 다른 문구로 보이며 source path·scope·limitation을 한 화면에 보인다.

**Ask First:** provider, 배포 정책, 비교/종합/권한 모델, 실제 멤버 자료의 공개 범위를 바꾸는 일.

**Never:** 다른 member Wiki를 읽거나 묶지 않는다. raw/output/private/hidden/secrets를 snapshot, evidence, client, 테스트 fixture에 넣지 않는다. 활동 포즈를 사람의 실제 상태·의도·가용성 또는 GitHub 활동으로 표현하지 않는다. push/deploy하거나 대규모 마을 리디자인을 하지 않는다.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 개인 근거 답변 | 유효 member와 관련 질문 | personal badge, 짧은 답변, allowlisted citation과 record-derived knowledgeType | API 실패면 명시적 demo fallback |
| 프로젝트 근거 답변 | Mission Board의 project scope와 관련 질문 | `projects/` citation만 있는 envelope 및 source drawer | personal record를 보충하지 않음 |
| 근거 부족 | 무관한 질문 또는 zero-score retrieval | citation 없는 `unsupported`, low confidence, 한계 문구 | provider를 호출하거나 추측하지 않음 |
| 악성/부적합 모델 JSON | invented citation 또는 임의 knowledgeType | invented citation 제거; record-derived type만 반환 | citation이 없으면 unsupported |
| artifact 불일치 | snapshot/evidence manifest가 다름 | 빌드 보존/검증이 실패 | stale pair를 배포하지 않음 |

</frozen-after-approval>

## Code Map

- `apps/wiki-village/scripts/build-wiki-snapshot.mjs` -- 허용 Markdown을 safe snapshot/server evidence로 투영하는 단일 생성기; schema/version/digest pair와 record knowledge metadata를 소유한다.
- `apps/wiki-village/server/wiki-chat.mjs` -- scope retrieval, provider 경계, fallback을 소유한다; relevance threshold, envelope validator, allowlisted citation과 derived type을 강화한다.
- `apps/wiki-village/src/App.jsx` / `src/styles.css` -- 기존 dynamic member homes/house interior를 보존하며 Mission Board→질문→answer/citation drawer surface를 추가한다.
- `apps/wiki-village/scripts/check-wiki-chat.mjs` -- deterministic provider doubles로 envelope, unsupported, scope/citation/type 공격 경계를 검증한다.
- `apps/wiki-village/scripts/check-wiki-snapshot.mjs`, `check-vercel-deploy.mjs`, `check-village-layout.mjs` -- artifact manifest, server-only evidence, 정적 UI contract를 검증한다.
- `api/wiki-chat.mjs`, `vercel.json` -- same-origin server-only boundary와 safe artifact include list; 정책 변경 없이 재사용한다.

## Tasks & Acceptance

**Execution:**
- [x] `apps/wiki-village/scripts/build-wiki-snapshot.mjs`, generated safe artifacts -- versioned record metadata와 shared content digest manifest를 생성·보존 검증한다.
- [x] `apps/wiki-village/server/wiki-chat.mjs` -- 모든 경로의 envelope validator, relevance-based unsupported, citation intersection, derived knowledgeType을 구현한다.
- [x] `apps/wiki-village/src/App.jsx`, `apps/wiki-village/src/styles.css` -- scope가 잠긴 질문 및 answer/citation/source drawer를 Mission Board와 기존 마을에 통합한다.
- [x] `apps/wiki-village/scripts/check-*.mjs` -- contract, unsupported, fallback/error copy, scope/allowlist/manifest/UI 경계를 회귀 검증한다.

**Acceptance Criteria:**
- Given 방문자가 Mission Board 또는 member entry point를 열었을 때, when 질문 전후 화면을 본다면, then 대상·source scope와 답변 신뢰 근거를 색상 외 텍스트로 설명할 수 있다.
- Given personal 또는 project 질문일 때, when citation을 연다면, then 오직 해당 scope의 snapshot 문서 요약과 허용 source path만 열린다.
- Given provider 미구성/실패/오류일 때, when 답변을 받는다면, then 실제 AI 결과로 가장하지 않는 mode와 limitation을 확인할 수 있다.
- Given snapshot/evidence/response가 변조되거나 서로 불일치할 때, when build 또는 chat contract가 실행되면, then 사용 가능한 evidence가 없는 답변을 만들거나 검증을 실패한다.

## Design Notes

답변 패널은 새 “대화 기능”보다 신뢰 표면이다. `mode`, `sourceScope`, `knowledgeType`, `confidence`, `limitation`을 작은 라벨로 모으고, 인용 버튼은 snapshot에 이미 있는 title/excerpt/source만 연다. 지원되지 않는 상태에는 질문을 확장하라는 암시 대신 해당 범위에서 확인되지 않았다고 말한다.

## Verification

**Commands:**
- `npm run test:snapshot` -- snapshot/evidence schema와 client boundary가 통과한다.
- `npm run test:chat` -- envelope, unsupported, fallback, scope 및 citation/type allowlist가 통과한다.
- `npm run test:deploy` -- Vercel server-only artifact separation이 통과한다.
- `npm run test:layout && npm run test:guild && npm run build` -- responsive surface, existing village contract, production build가 통과한다.
- `git diff --check` -- whitespace 오류가 없다.

### Review Findings

- [x] [Review][Patch] 요청 취소·최신 응답 보호·12초 타임아웃 [apps/wiki-village/src/App.jsx] — `AbortController`와 ref 기반 request id로 닫기·범위 전환·지연 응답을 무효화했다.
- [x] [Review][Patch] API envelope의 target scope 검증 [apps/wiki-village/src/App.jsx] — client가 personal member와 source scope가 일치하는 완전한 envelope만 표시한다.
- [x] [Review][Patch] 중첩 dialog 및 키보드 복귀 [apps/wiki-village/src/App.jsx] — 개인 질문을 열기 전에 house dialog를 닫고, answer dialog에는 Escape, 초기 focus, focus trap, close 뒤 focus 복귀를 제공한다.
- [x] [Review][Patch] 질문 길이 fail-closed [apps/wiki-village/server/wiki-chat.mjs] — 600자를 넘는 요청을 잘라내지 않고 400으로 거절하며 회귀 검증을 추가했다.
- [x] [Review][Patch] artifact source/member binding 및 결정성 [apps/wiki-village/scripts/build-wiki-snapshot.mjs] — personal source 경로가 해당 member id와 일치해야 하며 중복 id, 본문 metadata 오인식, 비결정적 순회를 차단했다.
- [x] [Review][Defer] 서버 요청 취소 신호를 provider 호출까지 전파 [apps/wiki-village/server/wiki-chat.mjs] — 이번 slice의 same-origin handler 계약에는 abort signal이 없으므로, provider 통합/observability 작업과 함께 설계한다.

## Suggested Review Order

**근거·응답 경계**

- 허용 근거만으로 envelope를 만들고, 변조된 인용을 fail-closed 처리한다.
  [wiki-chat.mjs:43](../../apps/wiki-village/server/wiki-chat.mjs#L43)

- snapshot과 evidence의 source/member 결속 및 manifest 일치를 검증한다.
  [build-wiki-snapshot.mjs:35](../../apps/wiki-village/scripts/build-wiki-snapshot.mjs#L35)

**신뢰 UI와 상호작용**

- Mission Board가 명시적인 project scope 진입점을 제공한다.
  [App.jsx:132](../../apps/wiki-village/src/App.jsx#L132)

- answer dialog가 scope를 잠그고 취소·timeout·키보드 focus를 관리한다.
  [App.jsx:145](../../apps/wiki-village/src/App.jsx#L145)

**회귀 검증**

- unsupported, fallback, citation allowlist와 길이 경계를 결정론적으로 검증한다.
  [check-wiki-chat.mjs:1](../../apps/wiki-village/scripts/check-wiki-chat.mjs#L1)
