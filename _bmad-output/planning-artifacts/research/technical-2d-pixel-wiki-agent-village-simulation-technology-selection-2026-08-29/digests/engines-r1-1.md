# 엔진·타일맵 조사 digest

- claim: Phaser는 MIT이며 공식 문서가 React/Vite 템플릿과 2D WebGL/Canvas, Tiled JSON 타일맵 사용을 제공한다.
  source: https://phaser.io/download/license ; https://docs.phaser.io/ ; https://docs.phaser.io/api-documentation/3.88.2/class/tilemaps-tilemap
  publisher: Phaser Studio
  pub_date: 2026-08-29 accessed
  confidence: high
- claim: Phaser의 Tiled parser는 orientation 지원 범위와 single-image tileset 같은 제약이 있으므로 목표 버전을 lockfile로 고정한 spike가 필요하다.
  source: https://docs.phaser.io/api-documentation/3.88.2/class/tilemaps-tilemap
  publisher: Phaser Studio
  pub_date: 2026-08-29 accessed
  confidence: high
- claim: PixiJS는 MIT, WebGL/WebGPU renderer이고 `@pixi/tilemap`은 고성능 저수준 tilemap kit이다. React binding도 공식 PixiJS 조직에서 관리된다.
  source: https://github.com/pixijs/pixijs ; https://userland.pixijs.io/tilemap/docs/ ; https://github.com/pixijs/pixi-react
  publisher: PixiJS / PixiJS Userland
  pub_date: 2026-08-29 accessed
  confidence: high
- claim: Excalibur는 BSD-2-Clause TypeScript 2D engine이나 현재 0.x이며, Kaboom 원 저장소는 archive 상태다.
  source: https://github.com/excaliburjs/excalibur ; https://github.com/replit/kaboom
  publisher: ExcaliburJS / Replit
  pub_date: 2026-08-29 accessed
  confidence: high
- claim: Tiled는 JSON map format을 지원하는 tile editor이고 Phaser가 Tiled JSON을 파싱한다. 도구 GPL과 생성한 map/art asset의 license는 분리해 관리해야 한다.
  source: https://github.com/mapeditor/tiled ; https://doc.mapeditor.org/en/stable/reference/json-map-format/
  publisher: MapEditor
  pub_date: 2026-08-29 accessed
  confidence: high
