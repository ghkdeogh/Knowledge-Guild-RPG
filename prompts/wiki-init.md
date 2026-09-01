# Wiki³ Personal LLM Wiki Initialization

사용자가 “위키 초기화해줘”라고 요청하면, 프로필 온보딩 뒤의 개인화 LLM Wiki 초기화 흐름을 사용한다. 이 작업은 고정 scaffold를 만드는 일이 아니라 Karpathy LLM Wiki의 `raw → wiki → output` 패턴을 개인의 승인된 맥락으로 인스턴스화하는 일이다.

## Scope and privacy

1. 현재 `member-id`를 확인하고 `WIKI_RULES.md`와 `prompts/llm-wiki.md`를 끝까지 읽는다.
2. **오직** `members/{member-id}/PROFILE.md`와 `CONTEXT.md`만 읽는다. `projects/`, 다른 member, raw 원본은 읽지 않는다.
3. PROFILE/CONTEXT 원문을 외부 제공자에 보낼 때는 사용자의 명시적 consent가 필요하다. consent가 없으면 보수적인 오프라인 제안만 만든다.
4. PROFILE/CONTEXT가 `raw` 입력 유형, `wiki` 지식 영역, `output` 결과물 유형을 각각 하나 이상 뒷받침하지 못하면 범위 있는 질문을 한 번만 하고, 그래도 부족하면 `insufficient-context`로 끝낸다. 지원되지 않는 범용 폴더를 추측해 만들지 않는다.

## Preview before any write

근거마다 PROFILE 또는 CONTEXT의 **section reference**를 붙여, 원문 문장을 불필요하게 재노출하지 않고 다음을 제안한다.

- 원본 → compiled Wiki 지식 → 결과물 매핑과 각 흐름의 이유
- lowercase, path-safe directory ID, 표시 이름, 목적, 예상 파일 예시
- 정확한 전체 파일 계획과 digest
- 근거가 부족하여 만들지 않은 영역

사용자는 digest를 명시적으로 승인해야 한다. `CONTEXT.md`에 이미 관리되는 `Wiki 운영 규칙` 블록이 있거나 이전 Wiki 구조가 있으면 keep/add/replace/remove migration diff를 먼저 제안한다. 기존 원본, wiki 페이지, `WIKI_INDEX.md`, `ACTIVITY_LOG.md`, harness를 자동 삭제·이동·덮어쓰지 않는다.

## Approved fresh structure

승인된 새 member에는 실제 근거가 있는 하위 폴더만 다음 구조로 만든다.

```text
members/{member-id}/
├─ PROFILE.md                         # unchanged
├─ CONTEXT.md                         # existing bytes preserved; managed rules block appended
├─ WIKI_SCHEMA.md                     # provider-neutral, personalized exact tree/schema
├─ raw/
│  ├─ CONTEXT.md                      # immutable source guidance
│  └─ {evidence-backed-input-type}/
├─ wiki/
│  ├─ CONTEXT.md                      # compiled knowledge guidance
│  ├─ index.md
│  ├─ log.md
│  └─ {evidence-backed-knowledge-area}/
└─ output/
   ├─ CONTEXT.md                      # result guidance
   └─ {evidence-backed-output-type}/
```

Use `.gitkeep` only to retain approved empty subfolders. `raw/`, `output/`, PROFILE/CONTEXT and scoped CONTEXT guidance remain excluded from snapshots and public indexing; only public `wiki/` pages are eligible. Do not create `WIKI_INDEX.md`, `ACTIVITY_LOG.md`, `harnesses/*.SKILL.md`, or a generic README scaffold in this flow.

## Operations in WIKI_SCHEMA.md

- Raw sources are immutable and are the source of truth.
- An ingest compiles one source into interlinked Wiki pages, updates `wiki/index.md`, and appends `wiki/log.md`.
- A query reads the index first and files a durable result only with approval.
- A lint pass looks for contradictions, staleness, orphans, missing links, and gaps.
- Facts, personal opinions, hypotheses, and AI inferences are labeled distinctly.

Saving is atomic: validate every path, reserved name, collision, and symlink boundary before writing; on failure leave no partial files. `PROFILE.md` is never modified.
