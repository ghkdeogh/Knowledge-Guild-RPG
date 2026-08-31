---
title: 공개 Wiki 기반 관찰 흐름
type: feature
status: ready-for-dev
created: 2026-08-31
---

# Emergent Flow Build Spec

## Intent

공개 Wiki 기록이 쌓일수록 현재 흐름을 보여 주되, 목표·합의·공식 결정을 추정하지 않는다. 기존 JSONL Architect/저장 계약은 남기고, 첫 CLI 입력은 자유로운 첫 기록 또는 프로젝트 메모로 안내한다.

## Boundaries

snapshot builder는 `projects/wiki/**`와 `members/<id>/wiki/**`의 Markdown만 읽는다. member `CONTEXT.md`, `WIKI_SCHEMA.md`, harness, raw/output/private/secrets와 `PROJECT_CONTEXT.md`/`WIKI_BLUEPRINT.md`는 읽거나 요약에 넣지 않는다. 결정론적 fallback은 heading, frontmatter, 본문 토큰, 명시적 stance만 사용한다. malformed/stale flow는 UI에서 fail-closed한다.

## Code Map and Tasks

- `apps/wiki-village/scripts/build-wiki-snapshot.mjs` — public-only walk 및 flow summary 생성/검증 가능한 artifact를 만든다.
- `apps/wiki-village/src/village-view.js` — flow와 근거 문서의 runtime allowlist 재검사를 제공한다.
- `apps/wiki-village/src/App.jsx`, `src/styles.css` — 목표 문구를 관찰 흐름과 상세 보드로 바꾼다.
- `apps/wiki-village/scripts/check-wiki-snapshot.mjs`, `check-village-layout.mjs`, `check-guild.mjs` — 0/1/다수 기록, boundary, invalid artifact를 검증한다.
- `README.md`, `apps/wiki-village/README.md` — emergent 모델과 CLI-first/read-only 경계를 설명한다.

## Acceptance

- Given 문서가 없을 때, snapshot은 `insufficient`이며 UI에 건물·캐릭터·가짜 목표가 없다.
- Given 한 member의 문서일 때, summary는 팀 합의라고 말하지 않는다.
- Given 같은 주제에 명시적으로 같은/상반된 stance가 둘 이상의 member에 있을 때, 공통 관점과 의견 차이가 근거 경로와 분리된다.
- Given private/context/schema 또는 invalid flow가 있을 때, snapshot/UI는 이를 공개하거나 신뢰하지 않는다.
- Given 상태 확인 버튼을 누를 때, Git metadata만 바뀌고 flow snapshot은 다시 만들지 않는다.

## Verification

`npm run test:snapshot`, `npm run test:onboarding`, `npm run test:chat`, `npm run test:repository`, `npm run test:guild`, `npm run test:layout`, `npm run test:answer-bubbles`, `npm run test:release-quickstart`, `npm run build`, `git diff --check`를 실행한다. 데스크톱과 390px에서 빈 상태·유효 flow 상세·출처 allowlist를 브라우저로 확인한다.
