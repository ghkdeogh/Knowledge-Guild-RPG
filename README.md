<div align="center">

# Knowledge Guild RPG

### **Build a living Wiki. See its work as a guild.**

CLI로 프로젝트 Wiki를 설계·승인·생성하고, 저장된 공개 상태를 따뜻한 픽셀 길드에서 읽는 로컬 우선 도구입니다.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-3C873A?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Local-first](https://img.shields.io/badge/Local--first-yes-6C8E5A)
![CLI and Pixel UI](https://img.shields.io/badge/CLI%20%2B%20Pixel%20UI-shared%20core-B66A50)

![실제 앱에서 촬영한 데모 길드 마을: 중앙 길드홀과 atlas, lumi, mori 픽셀 캐릭터](docs/images/knowledge-guild-village.png)

*실제 앱 UI로 촬영한 demo village입니다. 데모 캐릭터는 개인 기록이나 실제 사람을 뜻하지 않습니다.*

</div>

## 이 프로젝트가 무엇인가

Knowledge Guild RPG는 짧은 자유 입력을 바탕으로 Wiki 구조를 제안하고, 승인 뒤에만 로컬 Markdown 파일을 만드는 **Wiki Architect**입니다. 사용자-facing 생성 경로는 JSONL CLI이며, 픽셀 마을은 safe snapshot과 공개 Git 경로 metadata를 읽기 전용으로 보여 줍니다. 프로젝트의 방향은 미리 입력한 목표가 아니라 공개 Wiki 기록이 쌓이며 드러나는 관찰 결과입니다.

## 핵심 그림

```text
Headless Wiki Architect / Core
  ├─ 프로젝트 해석 · clarification · blueprint 검증 · 승인 적용 · 파일 계획
  ├─ 구조화 이벤트(JSONL): session.started, blueprint.proposed, files.written …
  ↓
CLI
  ├─ 터미널과 자동화가 같은 core를 호출
  ↓
React pixel UI projection
  └─ 길드홀·캐릭터·말풍선은 저장된 Wiki snapshot과 공개 경로 metadata만 표현
```

즉, **CLI에서 움직이는 Wiki 하네스를 픽셀 길드로 봅니다.** 브라우저가 Wiki 파일을 직접 읽거나 쓰는 척하지 않으며, 애니메이션이 작업 완료를 만들어 내지도 않습니다.

## 지금 할 수 있는 것

- 한 문장의 자유 입력을 해석해, 프로젝트별 Wiki blueprint와 파일 계획을 제안합니다.
- 정보가 정말 부족할 때만 clarification을 한 번에 하나씩, 최대 두 번 제안합니다.
- 승인 전에는 파일을 쓰지 않고, 승인 뒤에는 local writable mode에서 안전한 경로만 원자적으로 생성합니다.
- `raw/`(원본), 컴파일된 `wiki/`, `output/`(결과물), index/log를 분리한 구조를 만듭니다.
- 프로젝트 공통 기록 또는 한 멤버의 허용된 Wiki 기록에 질문하고, 인용·신뢰도·한계·모드를 함께 확인합니다.
- 픽셀 마을에서 공개 Wiki 근거로 생성한 현재 관찰 흐름, 근거 수, 최근 기록과 멤버별 공개 Wiki 상태를 봅니다. 상세 보드에서는 공통 관점·명시적 의견 차이·지식 공백·다음 조사 질문과 allowlisted 출처만 확인합니다.
- repository status와 길드 연출은 허용된 공개 Wiki path의 상태를 표현할 뿐, 실제 사람의 활동·의도·가용성을 뜻하지 않습니다.

## 3분 시작하기

### 1) 준비물

Node.js **18.20 이상**이 필요합니다. 이 저장소의 Vite 5 의존성은 `^18.0.0 || >=20.0.0`을 요구하며, 현재는 Node 24에서도 확인했습니다. Git도 설치되어 있으면 clone이 편합니다.

### 2) 내려받고 실행하기

```sh
git clone <YOUR-REPOSITORY-URL>
cd Knowledge-Guild-RPG/apps/wiki-village
npm ci
npm run dev -- --host 0.0.0.0
```

터미널에 나온 `http://localhost:5173`은 저장된 safe snapshot을 읽는 화면입니다. 같은 Wi-Fi의 다른 기기에서 보려면 `http://내-LAN-IP:5173`을 사용합니다. 프로젝트 해석, preview, save는 모두 CLI에서 실행합니다.

AI provider는 선택 사항입니다. 사용하려면 `apps/wiki-village/.env.example`을 참고해 같은 폴더에 `.env`를 만들고 서버 전용 키를 넣습니다. `.env`와 API 키는 커밋하지 말고 `VITE_` 접두사에도 넣지 마세요. Architect는 항상 `mode`, `providerStatus`, 안전한 diagnostic을 표시합니다. 키 없음(`not-configured`), 응답 형식 오류(`malformed-response`), 네트워크 오류(`unavailable`), 기타 provider 실패(`failed`)는 **local draft**로 분명히 구분됩니다. 비용이 드는 연결 점검은 `KNOWLEDGE_GUILD_PROVIDER_SMOKE=1`과 키를 함께 설정한 뒤에만 `npm run test:provider-smoke`로 실행합니다.

provider key 없이 scaffold 계약을 확인하려면 `apps/wiki-village`에서 `npm run quickstart`를 실행하세요. OS temp 아래에 검증용 새 scaffold를 만들고 경로를 JSON으로 출력합니다. 현재 checkout의 `projects/`와 `members/`는 건드리지 않습니다.

출력된 임시 경로는 확인이 끝난 뒤 사용자가 직접 삭제합니다.

```sh
node scripts/release-quickstart.mjs --target <new-absolute-directory-outside-this-repository>
```

`--target`은 parent가 이미 존재하는 **아직 존재하지 않는 저장소 밖 절대 경로**여야 합니다. 상대 경로, 현재 checkout 안의 경로(또는 그곳으로 향하는 symlink/junction), 이미 존재하는 경로는 fail-closed로 거부됩니다.

## Advanced: shared workspace Wiki scaffold

공유 project scaffold가 명시적으로 필요할 때만 아래 legacy/advanced CLI를 사용합니다. `analyze` 뒤에는 `preview-workspace`를 확인하고, digest를 넣은 `save-workspace`를 승인해 실행하세요. 개인 Wiki의 기본 경로는 아래 프로필 온보딩과 개인화 LLM Wiki 초기화입니다.

### 개인 프로필 온보딩

개인 작업 맥락부터 정리하려면 “온보딩 시작해줘”라고 요청하거나 `profile-onboarding-cli.mjs`를 사용합니다. 스트리밍 JSONL은 이름을 먼저 묻고, 공개 범위를 명시 확인한 뒤 `나는 누구인가 → 기록하려는 이유 → 원하는 결과물`의 세 질문만 한 번에 하나씩 진행합니다. 한국어 이름처럼 바로 쓸 수 없는 이름 뒤에는 저장용 `member-id`를 별도로 확인합니다. 각 답변 뒤 구조화 요약과 다음 질문을 출력하며, 마지막에는 `PROFILE.md`와 provider-neutral `CONTEXT.md`의 preview/digest를 냅니다. 같은 실행 세션에서 출력된 digest로 `approve`와 별도 `save`를 모두 보내야 선택한 `members/<member-id>/`에 저장됩니다. 저장 완료 이벤트의 `personal-wiki-init.next-step`이 다음 기본 경로입니다.

### 개인화 LLM Wiki 초기화

“위키 초기화해줘”라고 요청하거나 아래 스트리밍 JSONL 명령을 사용하세요. 이 초기화기는 선택한 `members/<member-id>/PROFILE.md`, `CONTEXT.md`, 그리고 `prompts/llm-wiki.md`의 원칙만 바탕으로, 근거가 있는 `raw → wiki → output` 구조를 제안합니다. `raw/`와 `output/`은 로컬 전용이고 `wiki/`의 공개 페이지들만 snapshot 대상입니다. 미리보기와 digest 승인 전에는 파일을 쓰지 않으며, 근거가 부족하면 한 번만 보충 질문을 하거나 중단합니다.

```powershell
@'
{"action":"start","memberId":"<member-id>"}
'@ | node scripts/personal-wiki-init-cli.mjs
```

preview 후 같은 세션에서 `{"action":"approve","expectedDigest":"<digest>"}`와 별도 `save`를 보냅니다. PROFILE/CONTEXT를 OpenAI Responses 제공자에 보낼 수 있는 경우에만 시작 요청에 `"providerApproved":true`를 넣으세요. 기존 scaffold나 개인 구조가 있으면 keep/add/replace migration diff를 먼저 보여 줍니다. `migrationApproved:true`로 승인하면 preview에 선언된 `WIKI_SCHEMA.md`·`wiki/index.md`·관리 규칙 블록만 recoverable backup과 함께 교체하고, 나머지는 추가만 합니다. `WIKI_INDEX.md`, `ACTIVITY_LOG.md`, harness, raw/wiki/output 사용자 내용은 삭제·이동하지 않습니다. 기존 `wiki-architect`의 personal `preview/save`는 더 이상 사용할 수 없으며 프로필 뒤 기본 초기화 경로는 personal initializer입니다.

## CLI 사용법

CLI도 화면과 같은 core를 사용합니다. 아래 명령은 `apps/wiki-village` 폴더에서 실행합니다. 모든 출력은 자동화에 쓰기 쉬운 JSONL(한 줄에 JSON 하나)입니다.

### analyze — 첫 Wiki 기록 또는 자유 메모 해석

PowerShell:

```powershell
'{"statement":"첫 Wiki 기록: 고객 피드백을 관찰하며 떠오른 메뉴 개선 가설을 적는다."}' | node scripts/wiki-architect-cli.mjs --command analyze
```

macOS/Linux 등의 일반 shell:

```sh
printf '%s\n' '{"statement":"첫 Wiki 기록: 고객 피드백을 관찰하며 떠오른 메뉴 개선 가설을 적는다."}' | node scripts/wiki-architect-cli.mjs --command analyze
```

PowerShell은 작은따옴표 안의 JSON을 그대로 전달할 수 있고, 일반 shell은 `printf`를 쓰면 줄바꿈을 명확히 보낼 수 있습니다. 결과의 `result.blueprint`를 다음 요청의 `blueprint`에 사용하세요.

### preview-workspace — 승인 전 shared workspace 계획 보기

아래는 방금 `analyze`한 실제 blueprint를 `preview.json`으로 만들고, 쓰지 않을 파일 계획을 보는 PowerShell 예시입니다. `memberId`와 표시 이름은 본인이 확인한 값으로 바꾸세요.

```powershell
$events = '{"statement":"첫 Wiki 기록: 고객 피드백을 관찰하며 떠오른 메뉴 개선 가설을 적는다."}' |
  node scripts/wiki-architect-cli.mjs --command analyze |
  ForEach-Object { $_ | ConvertFrom-Json }
$blueprint = ($events | Where-Object { $_.type -eq 'result' }).result.blueprint
$previewRequest = @{ blueprint = $blueprint; identity = @{ memberId = 'demo-author'; displayName = 'Demo Author'; workingContext = '초안 검토' } }
$previewRequest | ConvertTo-Json -Depth 12 | Set-Content .\preview.json -Encoding utf8
node scripts/wiki-architect-cli.mjs --command preview-workspace --input .\preview.json
```

`preview` 결과의 `result.preview.digest`는 다음 저장 요청에 반드시 일치해야 하는 확인값입니다. 파일을 아직 만들지 않습니다.

### save-workspace — 승인된 shared workspace 계획 적용

다음은 preview digest를 넣어 승인된 계획을 새 로컬 폴더에 적용하는 실제 PowerShell 예시입니다. `$localRoot`는 **쓰기 허용한 폴더**로 바꾸세요.

```powershell
$previewEvents = node scripts/wiki-architect-cli.mjs --command preview-workspace --input .\preview.json |
  ForEach-Object { $_ | ConvertFrom-Json }
$digest = ($previewEvents | Where-Object { $_.type -eq 'result' }).result.preview.digest
$saveRequest = $previewRequest.Clone()
$saveRequest.expectedDigest = $digest
$saveRequest | ConvertTo-Json -Depth 12 | Set-Content .\save.json -Encoding utf8
$localRoot = Join-Path $HOME 'knowledge-guild-cli-demo'
node scripts/wiki-architect-cli.mjs --command save-workspace --repo-root $localRoot --input .\save.json
```

digest가 다르거나 기존 member root와 충돌하면 저장하지 않습니다. 기본 저장은 기존 `projects/`가 있어도 project 파일을 만들거나 바꾸지 않습니다. 경로 이동(`..`), 예약된 private/secrets 경로, 허용하지 않은 경로도 거부합니다.

### Advanced: workspace scaffold — project와 member를 함께 명시적으로 만들기

공통 project scaffold가 실제로 필요할 때만 `preview-workspace`와 같은 digest로 `save-workspace`를 사용하세요. 두 명령은 project와 member 계획을 함께 보여 주며, 저장 중 오류가 나면 둘 다 롤백합니다. 기본 `preview`/`save`의 digest는 workspace 명령에 사용할 수 없습니다.

### status — 현재 scaffold 상태 확인

```powershell
'{}' | node scripts/wiki-architect-cli.mjs --command status --repo-root $localRoot
```

```sh
printf '%s\n' '{}' | node scripts/wiki-architect-cli.mjs --command status
```

## 생성되는 구조

모든 프로젝트에 똑같은 지식 분류를 강요하지 않습니다. 공통 골격만 안전하게 유지하고, blueprint가 목적에 맞는 page type과 routing을 정합니다.

```text
members/<member-id>/       # profile-first personalized initializer가 만드는 personal Wiki
  PROFILE.md · CONTEXT.md  # CONTEXT에는 관리되는 Wiki 운영 규칙 블록만 append
  WIKI_SCHEMA.md           # 실제 개인화 raw → wiki → output 구조와 운영 규칙
  raw/CONTEXT.md           # immutable source 계층의 scoped guidance
  wiki/CONTEXT.md · index.md · log.md
  output/CONTEXT.md        # 결과물 계층의 scoped guidance

projects/                  # explicit preview-workspace/save-workspace에서만 생성
  PROJECT_CONTEXT.md       # 승인된 공통 brief
  WIKI_BLUEPRINT.md        # 왜 이 구조인지, page type/routing/harness
  raw/ · wiki/ · output/ · harnesses/
  WIKI_INDEX.md · ACTIVITY_LOG.md
```

예를 들어 기술 학습은 `기술 / 판단 / 레시피 / 사례`, 시장 조사는 `기업 / 시장 / 가설 / 신호 / 결론`, 창작은 `세계관 / 캐릭터 / 플롯 / 자료 / 산출물`처럼 달라질 수 있습니다. 이는 예시일 뿐이며, 실제 page type은 프로젝트 입력과 승인한 blueprint가 결정합니다.

## 캐릭터와 길드 UI가 뜻하는 것

중앙 **프로젝트 길드홀**은 `projects/wiki/**`와 `members/{member-id}/wiki/**`의 공개 기록에서 도출한 현재 관찰 흐름만 나타냅니다. 각 **캐릭터와 집**은 오직 해당 `members/{member-id}/wiki/**`의 공개 개인 Wiki 범위만 나타냅니다. `CONTEXT.md`와 `WIKI_SCHEMA.md`는 로컬 설정이며 snapshot, evidence, citation source가 아닙니다. 개인 관점은 자동으로 공통 사실·팀 합의·공식 결정이 되지 않습니다.

관찰 흐름은 규칙 기반 fallback으로도 생성되며 공식 목표나 결정이 아닙니다. `decisions/`에 명시적으로 승인된 내용만 공식 결정입니다. 기록이 없거나 주제가 충분하지 않으면 UI는 `판단할 기록이 부족합니다`라고 표시하며, 기록 부재를 동의·반대로 해석하지 않습니다. `npm run snapshot`(또는 build)이 flow snapshot을 갱신하고, UI의 **저장소 상태 새로고침**은 공개 Git 경로 metadata만 수동 확인할 뿐 snapshot을 다시 만들지 않습니다.

캐릭터의 포즈와 말풍선은 public snapshot의 마지막 경로 변경일 또는 사용자가 갱신한 공개 Git path metadata만 읽는 중립 visual state입니다. 실제 사람의 상태, 의도, 온라인 여부, 가용성을 주장하지 않습니다.

## 보안과 데이터 경계

- 공개 snapshot·evidence·citation 대상은 `projects/wiki/**`와 `members/{member-id}/wiki/**`뿐입니다. `PROJECT_CONTEXT.md`, `WIKI_BLUEPRINT.md`, member의 `CONTEXT.md`, `WIKI_SCHEMA.md`, `raw/`, `output/`, private profile/context, secrets는 그 대상이 아닙니다.
- `.env`, API 키, project/member raw·output·private·secrets는 커밋하지 않습니다. `.gitignore`는 이 로컬 경계를 보호합니다.
- 사용자의 원문, AI 제안, 승인된 blueprint를 구분합니다. 승인 전에는 canonical 파일을 만들지 않습니다.
- CLI의 local writable mode만 실제 repository 쓰기를 수행합니다. Vercel 같은 read-only 배포는 preview/export 화면일 뿐, 저장됐다고 말하지 않습니다.
- member-id는 소문자·숫자·하이픈만 허용하며, 다른 멤버 공간이나 저장소 밖 경로로 쓰는 요청은 거부합니다.
- 웹 출처 미리보기는 safe snapshot의 같은 member `personal` 문서만 다시 검사해 표시합니다. 브라우저는 Wiki 원문을 읽거나 질문을 제출하지 않습니다.

## 테스트 명령

`apps/wiki-village`에서 실행합니다.

```sh
npm run test:snapshot
npm run test:chat
npm run test:onboarding
npm run test:deploy
npm run test:layout
npm run test:guild
npm run test:repository
npm run test:answer-bubbles
npm run test:release-quickstart
npm run build
```

`test:provider-smoke`는 key와 명시적 opt-in이 있을 때만 별도로 실행하는 live smoke입니다. 나머지 명령과 quickstart는 provider credential·remote fetch 없이 local contract를 검증합니다. `npm run build`는 production 번들을 만듭니다.

## 현재 한계와 다음 작업

- 실제 provider key를 넣은 live-provider end-to-end round trip은 아직 검증하지 않았습니다.
- `ingest / query / lint / reflect`는 blueprint가 선택할 수 있는 scaffold/hook이며, 아직 실행 엔진은 아닙니다.
- runtime snapshot 자동 갱신과 원격 변경의 자동 동기화는 아직 구현하지 않았습니다. local same-origin UI에서는 사용자가 누른 수동 저장소 확인만 `git fetch --prune`을 요청할 수 있으며, 자동 `pull`은 하지 않습니다.
- session replay와 persistence는 아직 제공하지 않습니다. CLI 이벤트는 현재 동기 응답 JSONL입니다.

## 기여 방법과 라이선스

버그나 제안은 issue 또는 변경 목적과 테스트 결과가 담긴 pull request로 알려 주세요. 개인 자료는 member 공간에만 두고, 다른 사람의 member space와 raw/private/secrets는 읽거나 추가하지 않는 규칙을 지켜 주세요.

이 프로젝트는 [Apache License 2.0](LICENSE)으로 제공됩니다. SPDX 식별자는 `Apache-2.0`이며, 전문은 루트 `LICENSE`에서 확인할 수 있습니다.
