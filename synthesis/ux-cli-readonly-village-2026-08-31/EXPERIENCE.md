---
name: Knowledge Guild Read-only Village Experience
status: final
sources:
  - DESIGN.md
  - ../../_bmad-output/implementation-artifacts/spec-project-wiki-architect-harness.md
updated: 2026-08-31
---

# CLI-first, Read-only Village UX

## Foundation

반응형 웹 단일 화면이며 React/Vite의 기존 픽셀 UI를 사용한다. `DESIGN.md`가 시각 정체성을 소유하고, 이 문서는 행동과 정보 구조를 소유한다. 인터뷰·프로젝트/멤버 생성·Wiki 수정은 CLI만 수행한다. 웹은 safe snapshot과 `/api/repository-status` 결과만 읽는다.

## Information Architecture

| Surface | Reached from | Purpose |
| --- | --- | --- |
| CLI 빈 상태 | 유효한 프로젝트 없음 | 실행 가능한 최소 CLI `analyze` 명령을 제시 |
| 마을 | 유효한 프로젝트 snapshot | 프로젝트 목표와 저장된 member Wiki를 한눈에 투영 |
| 캐릭터 상세 | 캐릭터 선택 | 공개 최근 활동·경로 변화·allowlisted 출처·스킬 metadata 확인 |
| 출처 미리보기 | 상세의 출처 링크 | 같은 member의 공개 safe-snapshot 문서 요약과 경로 확인 |

Mission Board, onboarding, 질문 입력, Answer Scroll, 집 내부 탐색은 웹 IA에 없다.

## Voice and Tone

| Do | Don't |
| --- | --- |
| `CLI에서 프로젝트를 시작하세요` | `마을을 만들 준비가 되었어요!` |
| `최근 공개 경로 변경일` | `마지막으로 일한 시간` |
| `공개 Wiki 경로에 작성 중 변경이 있어요.` | `지금 작업 중입니다.` |
| `표시할 허용 공개 Wiki 문서가 없습니다.` | 추정된 문서 목록 |

## Component Patterns

| Component | Behavioral rule |
| --- | --- |
| 상태 새로고침 | POST로 repository-status만 요청한다. 자동 fetch/pull이나 파일 쓰기는 하지 않는다. |
| 캐릭터 | 유효 snapshot member마다 하나. 버튼 선택으로 상세를 열며, 집 자체는 생성/수정 행동이 아니다. |
| 상태 말풍선 | 갱신된 public path의 remote news/dirty 상태가 우선하고, 없으면 저장된 공개 활동 날짜 기반 라벨을 보인다. |
| 캐릭터 상세 | Escape/닫기로 닫고 선택했던 캐릭터에 포커스를 돌린다. 한 모달만 연다. |
| 출처 링크 | 문서의 scope와 memberId를 다시 검사한 목록에서만 렌더한다. 외부/비공개 경로를 만들지 않는다. |
| 스킬 | `purpose`, `allowedScope`, `readiness` metadata만 보이며 실행 버튼을 제공하지 않는다. |

## State Patterns

| State | Treatment |
| --- | --- |
| `PROJECT_UNINITIALIZED` | 프로젝트 길드홀·캐릭터 없이 CLI 빈 상태. |
| `PROJECT_READY` | 프로젝트 길드홀과 목표는 보이고, member 캐릭터 대신 CLI에서 scaffold를 완성하라는 정직한 안내를 보인다. |
| `VILLAGE_READY` | 프로젝트 길드홀, member 캐릭터, 선택 가능한 상세를 보인다. |
| 새로고침 전 | 저장된 snapshot 활동만 보이고 상세에 `아직 새로고침하지 않았습니다.`를 표시한다. |
| remote news | 해당 캐릭터가 `새 기록` 말풍선과 notice 포즈를 보인다. |
| local dirty | 해당 캐릭터가 `변경 감지` 말풍선과 crafting 포즈를 보인다. |
| repository error | 오류를 한 줄로 알리고 기존 snapshot을 유지한다. |
| 문서/스킬 없음 | 비어 있다는 사실만 표시하고 placeholder를 만들지 않는다. |

## Interaction Primitives

첫 화면의 주 행동은 `저장소 상태 새로고침`과 캐릭터 선택이다. 키보드에서 Tab은 헤더 갱신 → 캐릭터 → 상세 내부 순서를 따른다. Escape는 출처 미리보기보다 상위인 캐릭터 상세를 닫는다. hover만 필요한 기능은 없다.

## Accessibility Floor

- 모든 캐릭터는 이름과 `상세 보기`를 포함한 버튼 라벨을 갖는다.
- 상태는 말풍선의 텍스트와 상세의 텍스트로 표현하며 색·포즈만으로 전달하지 않는다.
- 갱신 결과는 `role=status`로 알린다.
- 포커스 링은 배경과 구별되어야 하고, 모달 닫기 뒤 캐릭터 버튼으로 돌아간다.
- `prefers-reduced-motion`에서는 장식 애니메이션을 실행하지 않는다.

## Responsive & Platform

| Viewport | Behavior |
| --- | --- |
| Desktop | 헤더, 중앙 길드홀, 여러 캐릭터와 말풍선을 동시에 보인다. |
| ≤800px | 길드홀·집·나무를 축소하고 상세는 거의 전체 폭으로 연다. |
| ≤520px | 말풍선을 숨기고 상세의 텍스트 상태를 유지한다. CLI 명령은 가로 스크롤 가능하다. |

## Key Flows

### Flow 1 — 빈 저장소에서 CLI 시작 (Daeho, 새 Wiki를 만들려는 중)

1. Daeho가 웹을 연다.
2. snapshot에 유효 프로젝트가 없어 CLI 빈 상태를 본다.
3. `analyze` 명령을 복사해 CLI에서 프로젝트 설명을 보낸다.
4. CLI에서 preview와 승인된 save를 완료한다.
5. 다음 빌드/열기에서 저장된 상태가 마을로 투영된다.
6. **Climax:** 웹은 생성 성공을 스스로 주장하지 않고, 실제 저장된 프로젝트와 member만 보여 준다.

### Flow 2 — 공개 경로 상태 확인 (Daeho, 저장된 Wiki의 변화를 확인하려는 중)

1. Daeho가 마을을 연다.
2. `저장소 상태 새로고침`을 누른다.
3. 응답이 public Wiki 경로의 remote news 또는 dirty metadata를 반환한다.
4. 해당 캐릭터의 포즈·말풍선이 그 결과를 반영한다.
5. 캐릭터를 선택해 최근 공개 활동, 바뀐 공개 경로, 출처, 스킬을 확인한다.
6. **Climax:** 인물에 대한 추측 없이, 저장소에서 확인된 변화가 마을 상태로 이해된다.

## Assumptions and Open Questions

- [ASSUMPTION] 현재 픽셀 팔레트와 폰트를 유지하는 것이 이번 변경의 `픽셀 마을 정체성 유지`를 충족한다.
- [ASSUMPTION] 출처를 여는 것은 브라우저 파일 탐색이 아니라 safe snapshot의 allowlisted 요약 미리보기다.
- Open question 없음: 입력 경로와 웹의 읽기 경계는 사용자 지시로 명시되었다.
