# Knowledge Guild RPG

개인의 자료를 `raw → wiki → output`으로 쌓는 로컬 우선 LLM Wiki입니다. CLI가 승인된 계획만 파일로 만들고, 웹 UI는 공개 Wiki 상태를 읽기 전용으로 보여 줍니다.

## 3단계 시작

Node.js 18.20 이상이 필요합니다.

1. 설치합니다.

   ```sh
   cd apps/wiki-village
   npm ci
   ```

2. 터미널에서 프로필 온보딩을 시작합니다.

   ```sh
   npm run profile-onboarding
   ```

   실행 후 `{"action":"start"}`를 한 줄로 보내고, CLI가 출력하는 질문에 JSON 한 줄씩 응답하세요. 승인 전에는 파일을 만들지 않습니다. 승인하면 선택한 member의 상세 `PROFILE.md`와 간결한 `CONTEXT.md`가 로컬에 생성됩니다.

3. 같은 member의 개인 Wiki를 초기화한 뒤 UI를 실행합니다.

   ```sh
   npm run personal-wiki-init
   npm run dev
   ```

   초기화 CLI에 `{"action":"start","memberId":"<member-id>"}`를 보내 preview와 digest를 확인하고 승인하세요. 브라우저는 터미널에 표시된 `http://localhost:5173`에서 엽니다. UI는 읽기 전용입니다.

## 정상 흐름

1. 온보딩은 `PROFILE.md`와 `CONTEXT.md`를 만듭니다.
2. Wiki 초기화는 그 두 파일과 [`prompts/llm-wiki.md`](prompts/llm-wiki.md)를 읽어 목적에 맞는 구조를 제안합니다.
3. 승인 후 새 `CLAUDE.md` 운영 계약, `raw/`, `wiki/`, lowercase `output/`, `WIKI_SCHEMA.md`, `wiki/index.md`, `wiki/log.md`를 만듭니다.

`raw/`는 불변 원본, `wiki/`는 LLM이 컴파일·연결하는 지식, `output/`은 Wiki 근거에서 만든 결과물입니다. 실제 하위 폴더는 프로필과 맥락의 근거가 있을 때만 제안됩니다. `WIKI_INDEX.md`, `ACTIVITY_LOG.md`, `harnesses/`, `*.SKILL.md`는 이 개인 초기화 흐름에서 만들지 않습니다.

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

전체 로컬 검증은 `npm run test:snapshot`, `npm run test:repository`, `npm run test:chat`, `npm run test:layout`과 `npm run build`로 실행할 수 있습니다.

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
