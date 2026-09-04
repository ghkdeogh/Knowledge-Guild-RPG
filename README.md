# Knowledge Guild RPG

개인의 자료를 `raw → wiki → output`으로 쌓는 로컬 우선 LLM Wiki입니다. CLI agent가 승인된 계획만 파일로 만들고, 웹 UI는 공개 Wiki 상태를 읽기 전용으로 보여 줍니다.

![Knowledge Guild RPG UI 예시](docs/images/knowledge-guild-village.png)

*실제 앱 UI 예시입니다. 캐릭터는 개인이나 실제 사람을 뜻하지 않습니다.*

## 3단계 시작

Node.js 18.20 이상이 필요합니다.

1. 이 저장소 root를 Codex, Claude Code, OpenCode 같은 CLI agent로 엽니다. 앱 의존성은 한 번만 설치합니다.

   ```sh
   cd apps/wiki-village
   npm ci
   ```

2. agent와 자연어로 온보딩합니다. 이름을 알려 준 뒤 정확히 세 주제의 질문에 한 번에 하나씩 답하고, `PROFILE.md + CONTEXT.md` preview를 확인·승인합니다.

3. 같은 agent에게 Wiki 초기화와 UI 실행을 요청합니다. 구조/`CLAUDE.md` preview를 확인·승인한 뒤 브라우저를 엽니다.

복사해 시작할 수 있는 짧은 대화 예시입니다.

```text
나: 온보딩 시작해줘
나: [이름과 세 질문에 차례로 답변]
나: preview를 확인했어. 승인해줘
나: 위키 초기화해줘
나: Wiki 구조와 CLAUDE preview를 확인했어. 승인해줘
나: UI 실행해줘
```

UI는 `http://localhost:5173`에서 확인합니다. agent 대신 직접 실행하려면 `apps/wiki-village`에서 `npm run dev`를 사용하세요.

## 정상 흐름

1. `온보딩 시작해줘` → 이름과 정확히 세 주제 인터뷰 → `PROFILE.md + CONTEXT.md` preview 승인
2. `위키 초기화해줘` → `PROFILE.md + CONTEXT.md`와 [`prompts/llm-wiki.md`](prompts/llm-wiki.md) 기반 구조/`CLAUDE.md` preview 승인
3. `UI 실행해줘` 또는 `npm run dev` → 읽기 전용 UI 확인

`raw/`는 불변 원본, `wiki/`는 LLM이 컴파일·연결하는 지식, `output/`은 Wiki 근거에서 만든 결과물입니다. 실제 하위 폴더는 프로필과 맥락의 근거가 있을 때만 제안됩니다. `WIKI_INDEX.md`, `ACTIVITY_LOG.md`, `harnesses/`, `*.SKILL.md`는 이 개인 초기화 흐름에서 만들지 않습니다.

## raw 인제스트

raw에 글을 저장한 뒤 agent에게 다음처럼 요청하세요.

```text
방금 raw/에 저장한 글이 있어. 인제스트해줘.
```

agent는 raw를 수정하지 않고 분석을 먼저 보여 준 뒤, 왜 캡처했는지·현재 일과의 연결·해보고 싶은 일을 한 질문씩 묻습니다. 세 답변 뒤 Wiki 반영 preview를 승인하면 source/entity/concept와 `wiki/index.md`·`wiki/log.md`를 갱신합니다. raw는 Git이나 수정 대상이 아닙니다.

## 주요 명령

아래 명령은 `apps/wiki-village`에서 실행합니다.

```sh
npm run profile-onboarding      # PROFILE + CONTEXT 승인 생성
npm run personal-wiki-init      # 개인화 Wiki preview/승인/저장
npm run dev                     # 읽기 전용 UI
npm run build                   # production build
npm run test:personal-wiki-init
npm run test:profile-onboarding
```

`profile-onboarding`과 `personal-wiki-init`은 JSONL 자동화용 headless CLI입니다. 평소에는 위의 agent 대화를 사용하세요. 전체 로컬 검증은 `npm run test:snapshot`, `npm run test:repository`, `npm run test:chat`, `npm run test:layout`과 `npm run build`로 실행할 수 있습니다.

## 생성 구조

```text
members/<member-id>/             # 로컬 전용, Git에 올라가지 않음
├─ PROFILE.md                    # 상세 프로필
├─ CONTEXT.md                    # 매 실행용 개인 맥락
├─ CLAUDE.md                     # cross-agent Wiki 운영 계약
├─ WIKI_SCHEMA.md                # 개인화된 정확한 tree와 mapping
├─ raw/CLAUDE.md                 # 불변 원본 계층 규칙
├─ wiki/
│  ├─ CLAUDE.md                  # 컴파일된 지식 계층 규칙
│  ├─ index.md
│  └─ log.md
└─ output/CLAUDE.md              # 로컬 결과물 계층 규칙
```

## 개인정보·제한

- `members/<member-id>/`의 모든 개인 파일은 로컬 전용이며 Git에 추가하지 않습니다. 저장소에는 [members/README.md](members/README.md)만 안내 파일로 남습니다.
- 다른 member, `projects/`, raw 원본은 개인 Wiki 초기화 입력으로 읽지 않습니다.
- OpenAI Responses provider는 선택 사항입니다. 사용자가 `providerApproved: true`로 명시 동의한 경우에만 PROFILE/CONTEXT를 전송합니다. 키는 `apps/wiki-village/.env`에만 두고, `.env`·API 키·`VITE_` 환경변수에는 넣거나 커밋하지 마세요.
- 기존 `CLAUDE.md`나 이전 구조가 있으면 migration preview와 별도 승인이 필요합니다. 개인 자료를 자동 삭제하거나 이동하지 않습니다.
- UI와 snapshot은 운영 계약, raw/output, 개인 프로필·맥락을 공개 지식으로 표시하지 않습니다.

## 라이선스

[Apache License 2.0](LICENSE)
