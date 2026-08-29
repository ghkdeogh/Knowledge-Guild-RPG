---
title: 'Knowledge Guild RPG — Project Wiki Architect Harness 전환 Sprint Change Proposal'
status: approved-by-explicit-implementation-order
created: '2026-08-29'
workflow: bmad-correct-course
supersedes: 'sprint-change-proposal-2026-08-29.md'
---

# Sprint Change Proposal

## 1. Issue Summary

72c1ccb의 고정 6단계 project/member 설문과 고정 Markdown tree는 사용자의 프로젝트를 해석·설계하는 제품 목표에 맞지 않는다. 사용자의 자유 발언은 원본 입력으로만 남고, Project Wiki Architect Harness가 의도·사실·가정·unknown·pipeline·page type·routing을 구조화한 초안을 제안해야 한다. 사용자는 한 화면에서 이를 수정·승인한 뒤에만 scaffold를 생성한다.

## 2. Impact Analysis

- **UX:** `PROJECT PROLOGUE 1/6`과 장문 member interview를 하나의 자유 입력, 필요할 때만 최대 두 번의 clarification, blueprint review, 한 번의 identity 확인으로 대체한다.
- **Data model:** `PROJECT_CONTEXT.md`는 승인된 interpreted brief이며 raw user utterance가 아니다. `WIKI_BLUEPRINT.md`는 page types, routing, optional harnesses와 allowlisted scaffold paths를 기록한다. raw는 immutable source layer이며 production snapshot에서 제외된다.
- **Architecture:** server-only architect prompt와 strict schema validator를 추가한다. optional OpenAI response는 suggestion only이며 malformed/no provider는 labelled local editable draft로 떨어진다. persistence가 사용자/LLM이 제안한 임의 path를 신뢰하지 않는다.
- **Wiki operation:** common project and member spaces have raw/wiki/Output layers plus index/log. ingest/query/lint/reflect are prompt/skill scaffolds selected by the blueprint, not all required by default.
- **Existing feature:** approved scaffold의 valid project/member projection 뒤에만 evidence-grounded village remains available.

## 3. Recommended Approach

**Direct adjustment, major scope.** PRD/epic documents are absent, and the user explicitly authorized implementation. Replace the prior onboarding contract in a follow-up commit; preserve 72c1ccb history and reuse its local/read-only and atomic-write safety boundary.

## 4. Detailed Change Proposals

| Area | 72c1ccb | New proposal |
| --- | --- | --- |
| Input | required fixed fields | one free project statement, then information-gain clarification only (0–2) |
| Interpretation | copies answers into templates | labelled LLM/local interpretation into strict brief + blueprint schema |
| File tree | fixed common/member files | safe common skeleton; topic/page types/routes selected from blueprint |
| Member | five-field interview | one display-name/member-id confirmation; inferred role/context is editable in blueprint |
| Fallback | fixed questionnaire | conservative editable local draft, never presented as AI interpretation |
| Harnesses | none | optional ingest/query/lint/reflect role prompt scaffolds from approved blueprint |

## 5. Implementation Handoff

**Recipient:** bmad-build Developer workflow.

**Success criteria:** user utterance never appears verbatim in generated brief; two different domains yield different page types; invalid or forbidden path/routing is rejected; no scaffold before approval; approved temp-root scaffold atomically creates context, blueprint, selected layers and index/log; duplicate/read-only/export behavior remains truthful; all prior snapshot/chat/deploy/layout/guild checks and new contract tests pass.

## Addendum — Headless Core Is the Product

The pixel village is a projection, not the execution engine. The Architect's analysis, clarification, blueprint validation, approval/apply and operation harness selection must live in a UI-independent application layer. A JSON/JSONL-capable CLI, local API, and React client call the same commands and receive the same structured event contract (`session.started` through `session.completed`). The React reward/pose/bubble state is derived from those events; a completed CLI session is projected when the UI later reads state. Core/CLI parity and event contract take priority over UI ornament.

## Decision

The explicit rework order is the approval for this proposal. The product must not add a game engine or copy content from `C:\Users\daehohwang\llm-wiki`.
