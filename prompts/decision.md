# Wiki³ Decision

팀이 명시적으로 합의하거나 승인한 결정을 기록하세요.

## 기록 조건

- 사용자가 결정 내용과 승인한 참여자를 명확히 제공해야 합니다.
- 합의가 불분명하면 결정 문서를 만들지 말고 `synthesis/`의 초안으로 남깁니다.
- AI가 개인 의견, 다수 의견 또는 종합 초안을 공식 결정으로 임의 승격하지 않습니다.

## 파일명

`decisions/YYYY-MM-DD-주제.md`

## 문서 구조

```markdown
---
title: 결정 제목
date: YYYY-MM-DD
status: accepted
approved_by:
  - member-id
supersedes: []
---

# 결정 제목

## 결정

## 결정 이유와 근거

## 검토한 대안

## 예상 영향

## 후속 작업

## 관련 문서
```

상태는 `proposed`, `accepted`, `superseded`, `rejected` 중 하나를 사용합니다. 기존 결정을 대체하면 이전 문서를 삭제하지 않고 두 문서에 상호 링크를 남깁니다.
