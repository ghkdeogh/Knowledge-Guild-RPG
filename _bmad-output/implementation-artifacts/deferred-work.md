- source_spec: `_bmad-output/implementation-artifacts/spec-evidence-traceable-guild-answer.md`
  summary: Provider 호출까지 HTTP disconnect/abort signal을 전파하는 서버 취소 계약을 설계한다.
  evidence: 현재 same-origin handler는 client abort를 provider 호출에 전달할 signal 계약이 없다.

## Deferred from: code review of spec-onboarding-rpg-foundation (2026-08-29)

- 여러 member를 추가하는 UI 진입점은 첫 member 생성 흐름과 권한/수정 UX를 분리해 설계한다.
- legacy member directory의 migration/repair UX는 기존 개인 기록을 추정하지 않는 별도 정책으로 다룬다.
