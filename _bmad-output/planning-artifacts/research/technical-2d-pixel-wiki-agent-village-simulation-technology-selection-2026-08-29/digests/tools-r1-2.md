# 제작·경로·접근성 조사 digest

- claim: LibreSprite는 GPLv2 오픈소스 sprite editor이며 animation/layer/pixel tool을 제공한다. Piskel은 Apache-2.0 웹 sprite editor다. Aseprite 공식 배포는 EULA이며 compiled redistribution을 허용하지 않는다.
  source: https://github.com/LibreSprite/LibreSprite ; https://github.com/piskelapp/piskel ; https://www.aseprite.org/faq/
  publisher: LibreSprite / Piskel / Igara Studio
  pub_date: 2026-08-29 accessed
  confidence: high
- claim: EasyStar.js는 MIT async A* library로 tile costs, diagonal, cancel 및 TypeScript support를 문서화한다. PathFinding.js는 다양한 algorithm을 제공하지만 legacy build/tooling 표면이 크다.
  source: https://github.com/prettymuchbryce/easystarjs ; https://github.com/qiao/PathFinding.js
  publisher: respective GitHub projects
  pub_date: 2026-08-29 accessed
  confidence: high
- claim: Canvas는 접근 가능한 DOM 대체/overlay가 필요하며 React Portal은 React tree/event model 안에서 DOM overlay를 렌더한다. 긴 Wiki 대화·citation은 DOM이 적합하다.
  source: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_usage ; https://react.dev/reference/react-dom/createPortal
  publisher: Mozilla / Meta
  pub_date: 2026-08-29 accessed
  confidence: high
- claim: XState는 MIT state-machine library지만 simple agent flow에는 reducer/discriminated union으로 충분하고, cancel/timeout/persist/parallel flow가 커질 때만 도입한다.
  source: https://github.com/statelyai/xstate ; https://stately.ai/docs/xstate
  publisher: Stately
  pub_date: 2026-08-29 accessed
  confidence: medium
