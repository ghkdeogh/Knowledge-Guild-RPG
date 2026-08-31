---
title: 공개 Wiki 기반 관찰 흐름 UX
status: ready-for-dev
updated: 2026-08-31
---

# Emergent Project Flow UX

## Foundation

프로젝트의 방향은 사전에 입력한 목표가 아니라 허용된 공개 Wiki 기록에서 관찰된다. UI는 읽기 전용이며 snapshot을 만들거나 Wiki를 고치지 않는다. `decisions/`의 명시적 승인만 공식 결정이며, flow summary와 synthesis는 이를 대체하거나 승격하지 않는다.

## Information Architecture

| Surface | 내용 | 행동 |
| --- | --- | --- |
| 기록 없음 | 판단할 공개 Wiki 기록이 없다는 문구와 첫 기록용 CLI 명령 | CLI로 이동 |
| 첫 화면 | 관찰된 흐름 한두 문장, 근거 수, 마지막 기록 시각, 수동 저장소 상태 확인, 캐릭터 선택 | 흐름 상세, 상태 확인, 캐릭터 상세 |
| 흐름 상세 | 공통 관점, 명시적 의견 차이, 지식 공백, 다음 조사 질문, 근거 링크 | 허용 snapshot 출처 요약 열기 |
| 캐릭터 상세 | 해당 member의 공개 Wiki 출처만 | 출처 요약 열기 |

## State and Copy

- 기록이 0개면 건물·캐릭터·예제 데이터를 만들지 않고 `아직 흐름을 판단할 공개 Wiki 기록이 없습니다. CLI에서 첫 기록을 남기세요.`를 보인다.
- `insufficient`은 동의·반대·목표 부재가 아니라 방향을 판단할 근거 부족이다.
- 한 member 기록은 `한 공개 관점`으로만 보며 팀 공통 관점이라고 부르지 않는다.
- 공통 관점은 둘 이상의 member가 같은 명시적 stance를 같은 주제에 남긴 경우만, 의견 차이는 같은 주제에 상반된 명시적 stance가 있는 경우만 보인다.
- 저장소 상태 새로고침은 공개 경로 Git metadata만 확인하며 snapshot이나 flow summary를 갱신하지 않는다. flow summary는 CLI 저장 뒤 `npm run snapshot`/빌드에서 새로 생성된다.

## Accessibility and Responsive Floor

- 흐름 상태·근거 수·갱신 시각은 텍스트로 제공하고, 상태 알림은 live region을 쓴다.
- 상세 보드는 Escape, 닫기, 포커스 복귀를 지원한다. 근거 링크는 snapshot의 allowlist를 다시 검사한다.
- 390px에서는 장식 말풍선을 숨길 수 있으나 흐름 요약과 상세 진입은 계속 보인다.
