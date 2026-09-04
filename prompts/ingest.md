# Wiki³ 대화형 인제스트

사용자가 **“방금 raw/에 저장한 글이 있어. 인제스트해줘.”**라고 말하면 이 workflow를 따른다. 이는 harness나 `*.SKILL.md`를 만드는 기능이 아니라, agent가 원본을 함께 이해하고 승인된 Wiki 변경을 제안하는 대화 계약이다.

## 필수 상태 순서

1. 대상 선택·raw 읽기 전용·SHA-256 before 기록
2. 핵심 주장, 엔티티(사람·도구·조직), 개념 분석 제시
3. 질문 1 하나만 묻고 답변 대기
4. 질문 2 하나만 묻고 답변 대기
5. 질문 3 하나만 묻고 답변 대기
6. 중복 검사와 Wiki 반영 preview 제시
7. 사용자의 명시적 preview 승인 후에만 Wiki 반영
8. raw SHA-256 after 재확인과 완료 보고

세 답변 전에는 `wiki/` 파일을 생성·수정하지 않는다. raw hash before/after가 다르면 Wiki를 쓰지 말고 중단한다. `raw/`는 절대 수정·이동·이름 변경·Git stage 대상이 아니며, `harnesses/`, `*.SKILL.md`, `WIKI_INDEX.md`, `ACTIVITY_LOG.md`도 만들지 않는다.

## 시작 전 읽기 범위

현재 `member-id`를 확인하고, 선택한 member 안에서만 다음을 읽는다.

- `PROFILE.md` — 승인된 상세 개인 프로필
- `CONTEXT.md` — 매 실행용 간결한 개인 맥락
- root `CLAUDE.md` — cross-agent Wiki 운영 계약
- `WIKI_SCHEMA.md` — 개인화된 정확한 tree와 mapping
- `raw/CLAUDE.md`, `wiki/CLAUDE.md` — source와 compiled Wiki 계층 규칙
- 관련 `wiki/` 페이지, `wiki/index.md`, `wiki/log.md` — 중복·연결·갱신 판단에 필요한 최소 범위

다른 member, `projects/`, output, 허용 밖 raw 원본은 읽지 않는다. `WIKI_SCHEMA.md` 또는 계층 계약이 없으면 `위키 초기화해줘`를 먼저 안내한다.

## 1. 대상 선택과 원본 분석

`raw/`의 새 파일이 하나면 그 파일만 대상으로 한다. 여러 파일이거나 대상이 불명확하면 파일명과 수정 시각만 제시하고 하나를 확인받는다.

대상 raw 파일을 읽기 전용으로 읽고 SHA-256 before를 기록한다. 먼저 다음을 사용자에게 보여 준다. 이 단계에서는 Wiki를 쓰지 않는다.

- 짧은 소스 정보(파일명, 확인 가능한 제목·URL·작성자·날짜)
- 핵심 주장과 각 주장 상태: **사실**, **소스의 주장**, **불명확**
- 의미 있는 엔티티: 사람, 도구·제품·데이터, 조직
- 핵심 개념과 기존 Wiki와의 연결 또는 충돌 후보
- 원문에 없는 내용은 보충하지 않았다는 주의

한 번 언급된 모든 이름을 엔티티로 만들지 않는다. 현재 목적이나 주장 이해에 다시 참조할 가치가 있는 항목만 제안한다.

## 2. 사용자 인터뷰 — 반드시 한 번에 하나씩

분석을 보여준 뒤 다음 순서와 문장으로 질문한다. 현재 질문의 답변을 받은 뒤에만 다음 질문으로 진행한다.

1. **왜 이 글을 캡처했나요?**
2. **이 글은 현재 하고 있는 일과 어떻게 연결되나요?**
3. **이 글로 무엇을 해보고 싶나요?**

세 답변은 각각 **사용자 해석**이다. 소스의 주장이나 객관적 사실로 바꾸지 않는다. 세 질문에 모두 답하기 전에는 preview, Wiki write, index/log update를 하지 않는다.

## 3. 중복 검사와 반영 preview

세 답변 뒤에만 관련 Wiki를 최소 범위로 검색한다.

- 같은 raw 상대 경로 또는 SHA-256을 가진 기존 소스 요약
- 같은 핵심 주장, 엔티티, 개념의 기존 페이지
- 새 소스가 보강·충돌·대체하는 기존 기록

기존 문서 업데이트를 새 문서 생성보다 우선한다. 새 소스 요약의 route는 `WIKI_SCHEMA.md`의 personalized mapping을 따른다. 명시 route가 없을 때만 path-safe slug를 사용한 `wiki/sources/<slug>.md` fallback을 **preview에 제안**한다. 자동으로 folder를 추측하거나 이미 있는 문서를 덮어쓰지 않는다.

preview에는 정확한 add/update 경로와 다음 구분을 포함한다.

- **사실**: source가 직접 뒷받침하는 확인 가능한 내용
- **소스의 주장**: 저자·발행처의 해석, 예측, 의견
- **사용자 해석**: 세 질문의 답변과 현재 일의 연결
- **AI 추론**: 추가 확인이 필요한 연결 후보·충돌·공백
- source relative path, SHA-256, source availability(`local-only`), 변경 이유
- `wiki/index.md`와 `wiki/log.md`의 정확한 갱신 계획

사용자는 digest 또는 동등한 전체 file preview를 명시적으로 승인해야 한다. 승인 전에는 파일을 쓰지 않는다.

## 4. 승인 뒤 Wiki 반영

승인 뒤에만 preview의 exact actions를 적용한다.

1. 소스 요약을 add 또는 existing source page update한다.
2. 관련 entity/concept page는 기존 페이지를 먼저 update하고, 지속적으로 다시 참조할 새 항목만 add한다.
3. `wiki/index.md`에 소스와 바뀐 페이지를 연결한다.
4. `wiki/log.md`에 날짜, source, add/update 경로, 변경 이유를 append한다.

충돌은 기존 내용을 덮어쓰지 말고 양쪽 source, 시점, 상태를 남긴다. 마지막에 raw SHA-256 after를 다시 계산한다. before와 after가 다르면 적용 결과를 신뢰하지 말고 사용자에게 알린다.

## 완료 보고

읽은 raw 파일, 생성·수정한 Wiki 경로, 사용자 답변 반영 위치, 충돌·불확실성·다음 확인 과제, raw hash before/after 동일 여부를 짧게 보고한다. raw 또는 다른 member 자료를 Git에 추가·커밋·push하지 않는다.
