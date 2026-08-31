---
name: Knowledge Guild Read-only Village
description: CLI-first Wiki Architect의 저장 상태를 보여 주는 따뜻한 픽셀 마을 UI.
status: final
sources:
  - ../../_bmad-output/implementation-artifacts/spec-project-wiki-architect-harness.md
  - ../../_bmad-output/implementation-artifacts/spec-evidence-traceable-guild-answer.md
updated: 2026-08-31
colors:
  forest: '#213d35'
  meadow: '#75b56f'
  paper: '#fff2cb'
  parchment: '#f7e3ae'
  wood: '#513a31'
  action: '#365f55'
  public-record: '#e0edcf'
typography:
  display:
    fontFamily: 'Gowun Batang, serif'
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.15'
  body:
    fontFamily: 'Gowun Batang, serif'
    fontSize: 15px
    lineHeight: '1.55'
  meta:
    fontFamily: 'DM Mono, monospace'
    fontSize: 10px
    letterSpacing: '0.08em'
rounded:
  sm: 0px
  md: 0px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  gutter: 16px
components:
  refresh-button:
    background: '{colors.action}'
    foreground: '{colors.paper}'
  status-bubble:
    background: '{colors.paper}'
    border: '{colors.wood}'
  source-link:
    background: '{colors.public-record}'
    border: '{colors.action}'
---

## Brand & Style

기존 픽셀 마을의 따뜻함은 유지하되, 게임 보상이나 작업 수행의 착시를 만들지 않는다. 마을은 저장된 지식과 공개 Git 경로 메타데이터를 조용히 읽는 지도이며, CLI가 실제 창작 공간이다.

## Colors

`{colors.paper}`와 `{colors.parchment}`는 읽기 패널과 상태 말풍선에만 사용한다. `{colors.action}`은 단 하나의 갱신 행동에 사용한다. 상태를 색만으로 구분하지 않으며, 빨강/초록을 사람의 활동 상태나 성공 여부로 쓰지 않는다.

## Typography

프로젝트 이름과 빈 상태는 `{typography.display}`로, 설명은 `{typography.body}`로, 경로·스킬·Git 메타데이터는 `{typography.meta}`로 구분한다. 긴 경로는 줄바꿈하며 생략하지 않는다.

## Layout & Spacing

데스크톱은 한 화면에 헤더와 마을이 보이고, 중앙 길드홀 아래에 프로젝트 목표를 둔다. 캐릭터 상세는 한 번에 하나의 모달이다. 모바일은 헤더·길드홀·캐릭터를 축소해도 갱신 버튼과 캐릭터 터치 대상을 유지하며, 작은 화면에서는 말풍선을 숨겨 겹침을 방지한다.

## Elevation & Depth

픽셀 테두리와 짧은 오프셋 그림자는 물리적 종이·간판만 구분한다. 계층을 늘리기 위한 카드 중첩은 금지한다.

## Shapes

직각 픽셀 테두리가 기본이다. 둥근 pill, 유리 질감, 매끈한 그라디언트 카드, 게임 HUD는 사용하지 않는다.

## Components

- **프로젝트 길드홀** — 저장된 유효 프로젝트가 있을 때만 중앙에 보인다. 목표 한 줄을 동반한다.
- **캐릭터와 말풍선** — `{components.status-bubble}`. 공개 Wiki 활동 날짜 또는 갱신된 공개 경로 메타데이터만 말한다.
- **상태 새로고침** — `{components.refresh-button}`. 파일 쓰기나 생성 표현 없이 공개 경로 메타데이터의 수동 확인만 뜻한다.
- **출처 링크** — `{components.source-link}`. safe snapshot에 있는 같은 member의 공개 Wiki 레코드만 미리보기로 연다.
- **CLI 빈 상태** — 프로젝트 건물이나 캐릭터를 그리지 않고 하나의 실행 가능한 `analyze` 명령만 보여 준다.

## Do's and Don'ts

| Do | Don't |
| --- | --- |
| 저장된 공개 상태에만 라벨을 붙인다 | 사람의 온라인·작업·수면 상태를 주장한다 |
| 프로젝트 목표를 한 줄로 보여 준다 | Mission Board나 입력 폼을 첫 화면에 둔다 |
| 빈 저장소에는 CLI 명령 하나를 준다 | 예제 프로젝트나 가짜 캐릭터를 그린다 |
| 포커스 링과 텍스트 상태를 제공한다 | 색·애니메이션만으로 상태를 전한다 |
