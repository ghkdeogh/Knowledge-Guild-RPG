# Wiki³ Personal LLM Wiki Initialization

사용자가 “위키 초기화해줘”라고 요청하면, 프로필 온보딩 뒤의 개인화 LLM Wiki 초기화 흐름을 사용한다. 이 작업은 고정 scaffold를 만드는 일이 아니라 Karpathy LLM Wiki의 `raw → wiki → output` 패턴을 개인의 승인된 맥락으로 인스턴스화하는 일이다.

## 필수 결과 — 해줄 것

1. **내 목적에 맞는 폴더 구조 만들기**: `raw/`에는 내 input 유형별 불변 원본 하위 폴더, `wiki/`에는 AI가 컴파일할 지식 영역 하위 폴더, `output/`에는 내 결과물 유형별 하위 폴더를 근거에 맞춰 만든다. 사용자가 말하는 “Output”도 실제 경로는 cross-platform 안전한 lowercase `output/`으로 쓴다.
2. 기존 member root `CLAUDE.md`의 byte를 보존하고, marker로 구분된 managed Wiki 운영 규칙 block만 append 또는 승인된 migration에서 replace한다.
3. `raw/CLAUDE.md`, `wiki/CLAUDE.md`, `output/CLAUDE.md`의 scoped 운영 계약을 만든다.
4. `wiki/index.md`를 초기화한다.
5. `wiki/log.md`를 초기화한다.

근거가 세 계층의 목적별 하위 폴더를 뒷받침하지 못하면 한 번만 clarification을 요청한다. 그래도 부족하면 `insufficient-context`로 끝내며, 세 계층 자체나 위 다섯 결과를 임의로 생략하지 않는다.

## Scope and privacy

1. 현재 `member-id`를 확인하고 `WIKI_RULES.md`와 `prompts/llm-wiki.md`를 끝까지 읽는다.
2. **오직** `members/{member-id}/PROFILE.md`와 existing root `CLAUDE.md`만 primary input으로 읽는다. `projects/`, 다른 member, raw 원본은 읽지 않는다. root `CLAUDE.md`가 없고 legacy `CONTEXT.md`만 있으면 한 번의 compatibility bootstrap으로만 읽고, preview에서 그 사실을 표시한다.
3. PROFILE/CLAUDE 원문을 외부 제공자에 보낼 때는 사용자의 명시적 consent가 필요하다. consent가 없으면 보수적인 오프라인 제안만 만든다.
4. PROFILE/CLAUDE가 `raw` 입력 유형, `wiki` 지식 영역, `output` 결과물 유형을 각각 하나 이상 뒷받침하지 못하면 범위 있는 질문을 한 번만 하고, 그래도 부족하면 `insufficient-context`로 끝낸다. 지원되지 않는 범용 폴더를 추측해 만들지 않는다.

## Preview before any write

근거마다 PROFILE 또는 root CLAUDE의 **section reference**를 붙여, 원문 문장을 불필요하게 재노출하지 않고 다음을 제안한다.

- 원본 → compiled Wiki 지식 → 결과물 매핑과 각 흐름의 이유
- lowercase, path-safe directory ID, 표시 이름, 목적, 예상 파일 예시
- 정확한 전체 파일 계획과 digest
- 근거가 부족하여 만들지 않은 영역

사용자는 digest를 명시적으로 승인해야 한다. existing root CLAUDE의 Wiki marker 또는 이전 Wiki 구조가 있으면 keep/add/replace migration diff를 먼저 제안한다. 새 canonical CLAUDE에는 기존 byte를 보존하고 marker로 구분된 Wiki operations block만 append한다. 기존 marker는 별도 migration 승인 뒤에만 교체하며 원본은 `.wiki-migration-backup/<digest>/`에 복구 가능하게 보관한다. PROFILE+CONTEXT만 있는 legacy member는 root CLAUDE를 add하는 compatibility bootstrap으로 표시하고 CONTEXT는 변경하지 않는다. 기존 원본, 다른 wiki 페이지, `WIKI_INDEX.md`, `ACTIVITY_LOG.md`, harness를 자동 삭제·이동·덮어쓰지 않으며, 이 legacy 항목은 unmanaged로 표시한다.

## Approved fresh structure

승인된 새 member에는 실제 근거가 있는 하위 폴더만 다음 구조로 만든다.

```text
members/{member-id}/
├─ PROFILE.md                         # unchanged
├─ CLAUDE.md                          # pre-existing canonical personal context + managed Wiki operations
├─ WIKI_SCHEMA.md                     # provider-neutral, personalized exact tree/schema
├─ raw/
│  ├─ CLAUDE.md                       # immutable source contract (local-only)
│  └─ {evidence-backed-input-type}/
├─ wiki/
│  ├─ CLAUDE.md                       # compiled knowledge contract (not indexed)
│  ├─ index.md
│  ├─ log.md
│  └─ {evidence-backed-knowledge-area}/
└─ output/
   ├─ CLAUDE.md                       # result contract (local-only)
   └─ {evidence-backed-output-type}/
```

Use `.gitkeep` only to retain approved empty subfolders. `raw/`, `output/`, and their scoped CLAUDE contracts remain local-only and excluded from Git, snapshots, and public indexing; `wiki/CLAUDE.md` is also never public knowledge. `CLAUDE.md` is a cross-agent operational contract despite its familiar filename. Do not create `WIKI_INDEX.md`, `ACTIVITY_LOG.md`, `harnesses/`, `*.SKILL.md`, or a generic README scaffold in this flow.

## Operations in CLAUDE.md

- `WIKI_SCHEMA.md`는 정확한 tree와 mapping만 담는 machine-readable companion이다. 운영 규칙은 root/scoped `CLAUDE.md`를 따른다.
- Raw sources are immutable and are the source of truth.
- An ingest compiles one source into interlinked Wiki pages, updates `wiki/index.md`, and appends `wiki/log.md`.
- A query reads the index first and files a durable result only with approval.
- A lint pass looks for contradictions, staleness, orphans, missing links, and gaps.
- Facts, personal opinions, hypotheses, and AI inferences are labeled distinctly.

`CONTEXT.md` is not a peer canonical source: read it only for explicitly labeled legacy bootstrap and preserve it unchanged. Saving is atomic: validate every path, reserved name, collision, and symlink boundary before writing; on failure leave no partial files. `PROFILE.md` is never modified.
