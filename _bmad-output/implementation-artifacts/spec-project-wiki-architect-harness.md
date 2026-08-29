---
title: 'Project Wiki Architect Harness 기반 온보딩'
type: 'feature'
created: '2026-08-29'
status: 'done'
review_loop_iteration: 0
baseline_commit: '72c1ccb79c296b64f780f64e88dc15c774aa0b0b'
context:
  - 'AGENTS.md'
  - 'WIKI_RULES.md'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-29-wiki-architect.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-Knowledge-Guild-RPG-2026-08-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="explicit rework order is approval">

## Intent

**Problem:** 고정 6단계 설문과 고정 Markdown tree는 프로젝트의 목적에 맞는 Wiki를 설계하지 못하고, 사용자의 원문을 사실처럼 복사한다.

**Approach:** 자유 입력 하나를 Project Wiki Architect Harness가 strict interpreted brief와 맞춤 blueprint로 제안한다. 부족한 정보만 최대 두 번 묻고, 수정·승인 뒤에만 안전한 layered scaffold와 첫 member를 한 번에 생성한다.

## Boundaries & Constraints

**Always:** `raw/`는 immutable source layer, `wiki/`는 AI-compiled layer, `Output/`은 분리된 결과 layer다. index/log는 scaffold와 함께 생성한다. interpreted brief는 known facts·assumptions·unknowns를 분리하며 raw utterance를 저장하지 않는다. LLM 제안은 strict schema·server re-render·path allowlist를 통과해야 하고, client는 임의 files/paths를 저장시킬 수 없다. member는 display name/member-id를 한 번 확인하며 inferred profile은 user-approved working context로 기록한다. local loopback write와 Vercel read-only truthfulness, safe snapshot/evidence boundary를 유지한다.

**Ask First:** 기존 canonical project/member tree의 overwrite 또는 migration, 사용자 raw source의 실제 ingest, 새 provider/engine 도입.

**Never:** fixed questionnaire fallback, fixed domain page-type tree, raw/private/secrets/.env 저장·색인·노출, llm-wiki 콘텐츠 복사, browser filesystem access, LLM path trust, approval 전 source write, evidence answer 제거.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| 충분한 자유 입력 | 구체적 목적·대상·결과 | clarification 0회, labelled interpreted blueprint | raw text is absent from files |
| 모호한 자유 입력 | purpose/target/outcome unknown | information-gain question one at a time, maximum 2 | after limit, editable local draft |
| model unavailable/malformed | no API key or invalid structured result | `local-draft`, editable brief/blueprint | never claim AI interpretation |
| approval | valid edited analysis, identity, digest | project + member staged scaffold, index/log, refresh, reward | no file before approval |
| malicious proposal | traversal, reserved name, private/secrets/raw routing | reject proposal/path | no partial source/artifact write |
| read-only deployment | analysis/preview request | review allowed, persistence refused with exact export-unavailable guidance | no saved claim |

</frozen-after-approval>

## Code Map

- `apps/wiki-village/server/project-wiki-architect.mjs` — new testable prompt/schema, optional provider call, conservative local analyzer, domain routing, blueprint sanitization and Markdown renderers.
- `apps/wiki-village/core/wiki-architect.mjs`, `scripts/wiki-architect.mjs` — UI-independent session/application commands and JSON/JSONL CLI entrypoint that emit the canonical event stream.
- `apps/wiki-village/server/onboarding.mjs:44-255` — retain queue, atomic file helper, artifact rollback and middleware; replace fixed project/member contract with validated single blueprint preview/save.
- `apps/wiki-village/src/Onboarding.jsx:3-78` — replace step/index form with free-input, optional clarification, editable analysis/blueprint, one identity confirmation and approval preview.
- `apps/wiki-village/scripts/build-wiki-snapshot.mjs:24-100` — recognize architect schemas, permit only compiled wiki records and common blueprint/context, and continue excluding raw/output/private/secrets.
- `apps/wiki-village/vite.config.js`, `api/onboarding.mjs`, `vercel.json` — inject server-only architect provider configuration and preserve read-only handler/artifact inclusion.
- `apps/wiki-village/scripts/check-onboarding.mjs` — replace fixed interview assertions with architect, fallback, path, atomicity and blueprint-domain contracts.

## Tasks & Acceptance

**Execution:**
- [x] `server/project-wiki-architect.mjs` — add strict analysis/blueprint schema, safe deterministic fallback, optional server-only LLM adapter, path/routing sanitizer, and renderer for interpreted brief, blueprint, index/log and optional harness scaffolds.
- [x] `core/wiki-architect.mjs`, `scripts/wiki-architect.mjs` — expose the same analyze/clarify/preview/apply/status commands to local API, React projection and non-interactive JSON/JSONL CLI; emit structured execution events and add parity coverage.
- [x] `server/onboarding.mjs` — accept analyze/preview/save-blueprint actions, derive all writes server-side, atomically create project/member roots, reject collisions, preserve rollback and honest read-only/export-unavailable behavior.
- [x] `scripts/build-wiki-snapshot.mjs` — parse valid architect project/member roots and index only allowed compiled records across blueprint-selected page types.
- [x] `src/Onboarding.jsx`, `styles.css` — implement the minimal conversation-to-blueprint UI; remove 1/6 progress and long member questionnaire while preserving accessible reward and village gate.
- [x] API/config/tests — wire provider env configuration without secrets, revise deployment/snapshot contracts, and add temporary-root harness tests.
- [x] `README.md` — document headless core → CLI/local API → pixel projection, JSON event modes and representative non-writing/apply commands.

**Acceptance Criteria:**
- Given two domain-distinct statements, when drafts are created, then their page types/routing differ and neither generated brief contains the raw statement verbatim.
- Given the architect needs clarification, when a response arrives, then it asks no more than two high-information questions total and permits direct review once sufficient.
- Given an approved valid blueprint, when it saves locally, then only server-rendered allowlisted paths appear with source/wiki/Output layers, index/log and selected harness roles; then the village becomes ready.
- Given no provider, malformed LLM output, a forbidden path, a collision, or read-only mode, when processing the request, then a labelled editable draft or truthful error is returned and no unauthorized/partial write occurs.
- Given one free input, when CLI and local API process it, then they return the same validated blueprint/file plan and canonical event order; when the CLI applies it, the UI reads that persisted ready state rather than inventing completion.

## Spec Change Log

### Review Findings

- [x] [Review][Patch] LLM 원문 복사 차단 [apps/wiki-village/server/project-wiki-architect.mjs] — 입력·clarification이 제안에 그대로 나타나면 local editable draft로 fallback한다.
- [x] [Review][Patch] clarification 상한 [apps/wiki-village/server/wiki-architect-application.mjs] — 두 답변 뒤에는 추가 `question.asked`를 내보내지 않고 review로 진행한다.
- [x] [Review][Patch] 승인 blueprint allowlist [apps/wiki-village/server/onboarding.mjs, apps/wiki-village/scripts/build-wiki-snapshot.mjs] — persisted Blueprint JSON을 다시 검증하고 선택한 compiled route만 snapshot/evidence에 넣는다.
- [x] [Review][Patch] transaction visibility and rollback [apps/wiki-village/server/onboarding.mjs] — project context는 member scaffold 뒤 마지막 commit gate로 쓰며, 실패·artifact refresh 오류 시 생성 파일과 빈 하위 directory를 회수한다.
- [x] [Review][Patch] preview digest/state verification [apps/wiki-village/server/onboarding.mjs, apps/wiki-village/scripts/check-onboarding.mjs] — persistence 자체가 digest를 요구하고 save 결과가 `VILLAGE_READY`인지 확인한다.
- [x] [Review][Patch] deployment/provider parity [api/onboarding.mjs, apps/wiki-village/scripts/check-vercel-deploy.mjs] — Vercel도 server-only provider config를 받고, read-only preview 허용·save 거부를 계약 테스트한다.
- [x] [Review][Patch] evidence preservation and source consistency [apps/wiki-village/scripts/build-wiki-snapshot.mjs] — remote build는 검증된 artifact 쌍만 보존하며, loaded compiled body로 digest와 evidence를 함께 만든다.
- [x] [Review][Patch] UI reward projection [apps/wiki-village/src/Onboarding.jsx] — `files.written` event를 먼저 보상 UI로 투영하고 사용자가 마을 진입을 선택할 때 ready state를 적용한다.
- [x] [Review][Patch] schema round trip and record classes [apps/wiki-village/server/onboarding.mjs, apps/wiki-village/server/project-wiki-architect.mjs] — list whitespace를 보존하고 hypothesis/wiki-record/personal-opinion을 분리하며 decision candidate를 official decision으로 표현하지 않는다.

## Design Notes

The analyzer supplies domain-sensitive defaults (for example learning → technical/decision/recipe/case; market → company/market/hypothesis/signal/conclusion) as proposals, never the only tree. The persisted blueprint records why each page type and harness was selected. `ingest`, `query`, and `lint` are normal candidates; `reflect` is selected only when the approved project purpose needs a consented personal-learning loop.

## Verification

**Commands:**
- `npm run test:onboarding` — architect analysis, 0–2 clarification, fallback, no-write-before-approval, atomic temp-root scaffold and security cases pass.
- `npm run test:snapshot && npm run test:chat && npm run test:deploy && npm run test:layout && npm run test:guild && npm run build` — existing boundaries and production build pass.
- `git diff --check` — no whitespace errors.

**Manual checks:**
- Desktop and 390px: free input → labelled interpretation/draft → editable blueprint → identity confirmation → preview, without writing the repository.

## Suggested Review Order

**Headless contract**

- Core commands make CLI, API, and UI projections share one event contract.
  [wiki-architect.mjs:5](../../apps/wiki-village/core/wiki-architect.mjs#L5)

- The application emits analysis, approval, planning, write, and completion events.
  [wiki-architect-application.mjs:7](../../apps/wiki-village/server/wiki-architect-application.mjs#L7)

**Blueprint safety and persistence**

- Validate custom page types, raw-copy fallback, and server-rendered layered files.
  [project-wiki-architect.mjs:44](../../apps/wiki-village/server/project-wiki-architect.mjs#L44)

- Require preview digest and make canonical context the final transaction visibility gate.
  [onboarding.mjs:61](../../apps/wiki-village/server/onboarding.mjs#L61)

- Local API dynamically calls the shared core and refuses non-loopback writes.
  [onboarding.mjs:78](../../apps/wiki-village/server/onboarding.mjs#L78)

**Safe projections**

- Preserve only manifest-matched remote artifacts and authorize selected compiled routes.
  [build-wiki-snapshot.mjs:13](../../apps/wiki-village/scripts/build-wiki-snapshot.mjs#L13)

**Clients and verification**

- UI renders events as clarification, preview, and reward states rather than inventing progress.
  [Onboarding.jsx:8](../../apps/wiki-village/src/Onboarding.jsx#L8)

- JSONL CLI exposes the core in non-interactive environments.
  [wiki-architect-cli.mjs:6](../../apps/wiki-village/scripts/wiki-architect-cli.mjs#L6)

- Contract tests prove routing, fallback, write safety, and core/CLI parity.
  [check-onboarding.mjs](../../apps/wiki-village/scripts/check-onboarding.mjs)
