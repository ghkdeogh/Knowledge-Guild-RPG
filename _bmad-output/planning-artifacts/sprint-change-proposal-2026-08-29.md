---
title: 'Knowledge Guild RPG — 온보딩 RPG 전환 Sprint Change Proposal'
status: approved-by-explicit-implementation-order
created: '2026-08-29'
workflow: bmad-correct-course
---

# Sprint Change Proposal

## 1. Issue Summary

기존 세션 002는 완성된 Wiki 마을에서 근거 추적 답변을 탐색하는 흐름을 완성했다. 사용자가 확인한 실제 핵심 경험은 반대 순서다. 처음에는 대화형 인터뷰로 프로젝트와 개인 Wiki를 만들고, 생성 보상으로 길드홀·캐릭터·마을에 들어가야 한다.

## 2. Impact Analysis

- **제품 정의:** 읽기 전용 예시 마을은 초기 진입점이 아니며, `PROJECT_CONTEXT.md`의 유효성으로 상태를 판별한다.
- **데이터:** 추적된 canonical project context와 `example-member`는 새 clone을 가짜 완성 상태로 만든다. 전자는 비canonical 예제로 보존하고, 후자는 삭제하며 test fixture는 런타임 경로 밖으로 둔다.
- **Architecture:** snapshot/chat projection은 유지한다. 새 deterministic onboarding state machine과 server-only local persistence adapter가 그 앞에 추가된다. LLM은 필수가 아니다.
- **UX:** 프롤로그 → 프로젝트 인터뷰 → file preview/confirm → 길드홀 생성 → 개인 인터뷰 → file preview/confirm → 캐릭터 생성 → 마을 순서로 바뀐다.
- **Deployment:** Vercel은 read-only/demo mode이며 저장 성공을 주장하지 않는다. local writable mode에서만 atomic filesystem save를 허용한다.

## 3. Recommended Approach

**Direct adjustment (major feature, approved by the explicit implementation order).** 별도 PRD/epic 문서는 현재 없다. 따라서 본 문서를 handoff로 삼아 bmad-build로 구현한다. 기존 evidence answer contract는 삭제하지 않고 `VILLAGE_READY` 이후 UI에서만 노출한다.

## 4. Detailed Change Proposals

| Area | Previous | New |
| --- | --- | --- |
| Canonical initialization | 존재만으로 project mode | schema-marked `projects/PROJECT_CONTEXT.md`가 있어야 initialized |
| Initial UI | Mission Board + village | pixel prologue and deterministic interview |
| Persistence | read-only snapshot only | local server API writes guarded canonical Markdown atomically; deployment is read-only |
| Members | tracked `example-member` becomes an avatar | no synthetic production member; confirmed onboarding writes a real member root |
| Village access | unconditional | project and at least one valid member required |

## 5. Implementation Handoff

**Scope:** Major feature with direct implementation explicitly authorized by the user.

**Success criteria:** project/member/village state detection; ordered interviews; preview/confirmation; safe local persistence; transparent read-only mode; no `example-member`; preserved scope-safe answer feature; contract tests and desktop/390px browser verification.

## Decision

The explicit implementation order is treated as approval for this proposal. No PRD or epic files were present, so no backlog artifact could be updated.
