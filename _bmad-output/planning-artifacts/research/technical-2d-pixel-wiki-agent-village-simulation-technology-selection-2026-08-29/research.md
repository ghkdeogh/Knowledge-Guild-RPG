---
title: '2D 픽셀 Wiki 에이전트/마을 시뮬레이션 기술 선택'
type: technical
topic: 'React/Vite Wiki 길드용 2D 픽셀 월드·에이전트 스택'
decision: '현재 React/Vite 앱에 점진적으로 붙일 수 있고 Wiki/LLM 경계를 보존하는 기술 조합을 선택한다.'
source: native-web-research
status: complete
preset: standard
validation: normal
created: '2026-08-29'
updated: '2026-08-29'
---

# 2D 픽셀 Wiki 에이전트/마을 시뮬레이션 기술 선택

## 요약과 결정

**권장 조합(도입은 spike 통과 후): Phaser + Tiled JSON + EasyStar.js + 자체 레이어형 스프라이트 + React DOM overlay.** Phaser는 MIT이고 React/Vite를 포함한 웹 프레임워크 지원과 Tiled map 경로를 공식 문서화한다. Tiled JSON을 기본 월드 계약으로 두고, canvas는 타일·스프라이트·카메라만 소유하며 Mission Board, 질문, citations, source drawer는 React DOM에 남긴다.[1][2][3] 이는 현재 서버의 Wiki/LLM boundary와 픽셀 월드를 가장 쉽게 분리한다.

가장 큰 단서는 **Phaser 4 전환기**라는 점이다. 버전 고정 뒤 실제 타일맵/모바일/에이전트 수로 검증해야 한다. 결과가 기준을 못 채우면 renderer 중심의 **PixiJS + `@pixi/react` + `@pixi/tilemap`**이 차선이다. Pixi는 WebGL/WebGPU renderer이며 React와 tilemap 패키지가 있으나, 게임 규칙·충돌·맵 로딩을 더 직접 설계해야 한다.[4][5][6]

**현재 구현 세로 슬라이스에는 새 게임 엔진을 도입하지 않는다.** 이는 별도 승인과 spike의 성능·접근성 결과가 필요한 후속 결정이다.

## 후보 비교

점수는 현재 제품의 가중 판단(5 최고)이며, 성능 수치는 벤치마크가 아니라 공식 기능·통합 표면과 유지보수 위험의 정성 평가다.

| 후보 | 점진적 React/Vite | 픽셀·타일맵·다수 에이전트 | DOM 접근성/대화 분리 | 유지보수·라이선스 | 판단 |
| --- | ---: | ---: | ---: | ---: | --- |
| **Phaser** | 4 | 5 | 4 | 4 / MIT | **권장**: 게임 루프, camera, input, Tiled 경로가 이미 있다.[1][2][3] |
| **PixiJS + React/tilemap** | 5 | 5 | 5 | 5 / MIT | **차선**: renderer 성능·React 결합은 강점, 월드 규칙은 직접 구현.[4][5][6] |
| Excalibur.js | 3 | 3 | 4 | 3 / BSD-2 | TypeScript 2D 엔진이나 0.x와 얇은 React 통합 근거 때문에 3순위.[7] |
| KAPLAY | 3 | 3 | 3 | 3 / MIT | Kaboom 호환 후속으로 빠른 demo에는 가능하나 Tiled/대형 편집형 월드 근거가 얇다.[8] |
| Kaboom 원본 | 2 | 2 | 3 | 1 | **제외**: 원 저장소가 archive/read-only다.[9] |

### 타일맵과 제작 도구

**Tiled**를 기본 편집기로 권장한다. JSON map format과 임의 속성/다층 데이터를 갖고 Phaser가 Tiled JSON을 파싱한다.[3][10] Phaser의 Tiled 지원에는 단일 이미지 tileset 등 형식 제약이 있으므로 spike에 실제 export fixture를 넣는다.[3] Phaser의 자체 Tilemap Editor는 대안이지만, 엔진 교체 가능성을 남기려면 Tiled JSON을 canonical asset으로 유지한다.[11]

스프라이트 작업은 **LibreSprite**를 FOSS 기본 도구로, **Piskel**을 브라우저 보조로 둔다. LibreSprite는 GPLv2, Piskel은 Apache-2.0이다.[12][13] **Aseprite는 유료 개인 제작 도구로는 허용 가능하지만 오픈소스 도구 체인의 재배포 대상이 아니다.** 공식 EULA는 compiled app의 제3자 재배포를 금지하지만, 그 도구로 만든 그래픽의 상업 사용은 허용한다.[14] 아바타는 body/hair/clothes/gear/palette의 자체 제작 파츠와 anchor·direction·frame JSON 규약으로 조합한다. LPC 같은 외부 파츠는 프로토타입만 조건부 허용하며 파일별 저작자·원 라이선스·수정 여부 manifest 없이는 넣지 않는다.[15]

### 이동·대화·접근성

그리드 클릭 이동은 **EasyStar.js**가 적합하다. MIT, async A*, tile cost·diagonal·cancel·TypeScript support를 제공하며 `calculate()`에 iteration budget을 둘 수 있다.[16] 경로 결과는 agent ID와 request ID로 보관하고, 새 요청이 이전 이동을 덮어쓰지 않게 취소한다. 다수/복잡 알고리즘이 실제 필요할 때만 PathFinding.js를 재평가한다.[17]

Canvas는 정보성 Wiki UI의 접근성 surface가 아니다. MDN은 canvas fallback/DOM 접근성 고려를 요구하고, React Portal은 React tree 안에서 DOM overlay를 유지한다.[18][19] 따라서 말풍선의 짧은 장식만 world 좌표에 anchor하고, 클릭 가능한 질문·citation·source 원문 확인·키보드 포커스·모바일 sheet는 DOM으로 구현한다. overlay 빈 영역은 pointer-events를 통과시키되, dialog가 열릴 땐 world input을 차단하고 focus를 이동·복귀시킨다.[20]

초기 agent state는 TypeScript discriminated union/reducer로 `idle → pathing → talking → returning`만 모델링한다. XState는 MIT이고 상태차트/React integration을 제공하지만,[21] 취소·time-out·저장/복구·병렬 quest가 늘기 전에는 필수가 아니다.

## 최소 아키텍처

```text
React DOM: Mission Board · scope-locked chat · citations/source drawer · a11y
  ┃  command/event bridge (typed, one-way; no Wiki raw text)
  ┣━━▶ PixelWorld adapter: start/stop · camera · hit-test · render projection
  ┃       ┣━━▶ Phaser Scene: Tiled JSON · atlas · animation · input
  ┃       └━━▶ Agent store: id · tile position · route · visualState
  ┗◀━━ WORLD_EVENT: AGENT_SELECTED | PATH_FINISHED | BUBBLE_ANCHOR

Wiki/LLM server: snapshot/evidence → answer envelope → React only
```

React는 persisted domain/UI state와 server answer를 소유한다. Phaser/Pixi는 이를 매 frame renderer projection으로만 읽는다. React render마다 engine object를 재생성하지 않으며, engine은 source path나 Wiki evidence body를 받지 않는다. camera transform은 bridge가 CSS anchor 좌표만 반환해 DOM bubble을 위치시킨다.

## 1–2주 spike

**범위:** 현재 앱과 분리된 feature branch/route에서 (1) 16px Tiled JSON map, (2) atlas 기반 20·50·100 synthetic agent가 click target까지 EasyStar route를 따라 이동, (3) walking/idle/talking 3 animation과 integer pixel scale, (4) engine click→React selected-agent event 및 React 버튼→engine move event, (5) mobile viewport와 키보드의 DOM dialog focus trap을 구현한다. 실제 member Wiki, provider key, raw evidence는 쓰지 않는다.

**성공 기준:** 대표 desktop과 mid-range mobile에서 50 agents로 입력이 끊기지 않고 60fps 목표(측정값 기록), map/camera 확대에서 blur·subpixel jitter가 없고, Tiled collision/export fixture가 재현되며, keyboard-only 사용자가 agent 선택→질문 UI→닫기→world focus 복귀를 완료한다. 번들 증가, cold-start, FPS/heap, engine version, asset-license manifest를 기록한다. 100 agents나 모바일 목표를 통과하지 못하면 PixiJS spike를 같은 fixture와 측정으로 비교한다.

## 배포·라이선스 가드

- MIT/BSD/Apache library는 해당 license/copyright/NOTICE 요구를 release attribution에 반영한다.[1][4][7][13][16]
- Tiled 프로그램의 GPL과 map/art output의 저작권은 별개로 기록하고, editor binary를 앱에 묶지 않는다.[10]
- 외부 sprite/tileset은 `assets/ATTRIBUTION.md`와 machine-readable manifest에 source, author, license, modification을 둔다. CC-BY-SA는 product license 전략과 충돌할 수 있어 승인 전 도입 금지다.[15]
- Aseprite executable/compiled build를 저장소나 product distribution에 포함하지 않는다.[14]

## 최종 분류

- **지금 사용:** Tiled JSON을 engine-independent asset contract로 설계하고, LibreSprite/자체 파츠 규약·asset attribution manifest·React DOM accessibility/typed event-bridge 원칙을 spike 준비물로 채택한다. 기존 evidence-answer 세로 슬라이스는 그대로 DOM에서 완성한다.
- **spike 후 결정:** Phaser(버전 고정) + Tiled + EasyStar.js를 1순위로 측정한다. 성능 또는 Phaser 4 API 이행 위험이 기준을 넘으면 PixiJS + `@pixi/react` + `@pixi/tilemap`을 동일 fixture로 비교한다.
- **당장은 보류:** 현재 세로 슬라이스에 엔진 패키지 추가, XState, Excalibur/KAPLAY, Kaboom 원본, 외부 LPC/CC-BY-SA 에셋, Aseprite binary 재배포.

## 열린 질문·갱신 시점

- Phaser 4의 선택 버전에서 Tiled JSON, pixel-perfect 설정, React/Vite template 조합이 실제로 통과하는가?
- 목표 기기/해상도와 동시 agent 수는 아직 제품 요구로 확정되지 않았다. spike의 50/100은 결정용 fixture이지 출시 약속이 아니다.
- 모든 외부 art의 라이선스 조합은 배포 license 결정 전에 다시 검토해야 한다.

버전·릴리스·라이선스 주장은 빠르게 바뀌므로 **2026-11-29 이전**, 혹은 engine 도입 승인 직전에 refresh한다.

## 출처

| Ref | 근거 | 발행자·날짜 | 신뢰도 |
| --- | --- | --- | --- |
| [1] | [Phaser MIT license](https://phaser.io/download/license) | Phaser Studio, accessed 2026-08-29 | high |
| [2] | [Phaser overview / framework support](https://docs.phaser.io/) | Phaser Studio, accessed 2026-08-29 | high |
| [3] | [Phaser Tilemap API / Tiled support](https://docs.phaser.io/api-documentation/3.88.2/class/tilemaps-tilemap) | Phaser Studio, accessed 2026-08-29 | high |
| [4] | [PixiJS repository, MIT, releases](https://github.com/pixijs/pixijs) | PixiJS, accessed 2026-08-29 | high |
| [5] | [PixiJS React binding](https://github.com/pixijs/pixi-react) | PixiJS, accessed 2026-08-29 | high |
| [6] | [PixiJS Tilemap Kit](https://userland.pixijs.io/tilemap/docs/) | PixiJS Userland, accessed 2026-08-29 | high |
| [7] | [Excalibur repository / BSD-2-Clause](https://github.com/excaliburjs/excalibur) | ExcaliburJS, accessed 2026-08-29 | high |
| [8] | [KAPLAY repository / MIT](https://github.com/kaplayjs/kaplay) | KAPLAY, accessed 2026-08-29 | medium |
| [9] | [Kaboom archived repository](https://github.com/replit/kaboom) | Replit, accessed 2026-08-29 | high |
| [10] | [Tiled JSON Map Format](https://doc.mapeditor.org/en/stable/reference/json-map-format/) and [repository/license](https://github.com/mapeditor/tiled) | MapEditor, accessed 2026-08-29 | high |
| [11] | [Phaser Tilemap Editor](https://www.phaser.io/tools/tilemap-editor) | Phaser Studio, accessed 2026-08-29 | medium |
| [12] | [LibreSprite README / GPLv2](https://github.com/LibreSprite/LibreSprite) | LibreSprite, accessed 2026-08-29 | high |
| [13] | [Piskel README / Apache-2.0](https://github.com/piskelapp/piskel) | Piskel, accessed 2026-08-29 | high |
| [14] | [Aseprite licensing FAQ](https://www.aseprite.org/faq/) | Igara Studio, accessed 2026-08-29 | high |
| [15] | [LPC generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) and [license guide](https://lpc.opengameart.org/static/LPC-Style-Guide/build/index.html) | Liberated Pixel Cup, accessed 2026-08-29 | high |
| [16] | [EasyStar.js README / MIT](https://github.com/prettymuchbryce/easystarjs) | EasyStar.js, accessed 2026-08-29 | high |
| [17] | [PathFinding.js](https://github.com/qiao/PathFinding.js) | qiao, accessed 2026-08-29 | medium |
| [18] | [Canvas accessibility guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_usage) | Mozilla, accessed 2026-08-29 | high |
| [19] | [React `createPortal`](https://react.dev/reference/react-dom/createPortal) | Meta, accessed 2026-08-29 | high |
| [20] | [CSS pointer-events](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/pointer-events) | Mozilla, accessed 2026-08-29 | high |
| [21] | [XState repository / MIT](https://github.com/statelyai/xstate) | Stately, accessed 2026-08-29 | high |

## Staleness map

| 대상 | 재검토 기한 |
| --- | --- |
| 엔진/renderer 버전, release, React integration | 2026-11-29 또는 도입 승인 직전 |
| 라이선스/가격·EULA | asset 또는 tool 채택 직전 |
| 성능 판단 | spike가 실제 목표 기기에서 끝난 직후 |
