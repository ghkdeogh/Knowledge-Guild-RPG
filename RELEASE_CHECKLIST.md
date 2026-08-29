# v0.1.0 Release Checklist

출시 담당자가 실제 환경에서 확인하는 짧은 목록입니다. 이 파일의 체크는 자동 배포 권한이나 라이선스 결정을 대신하지 않습니다.

- [x] **License chosen** — Apache License 2.0 (`Apache-2.0`)을 선택했고, 루트 `LICENSE`에 전문을 포함했다.
- [ ] **Clean clone** — 새 clone에서 `cd apps/wiki-village`, `npm ci`가 성공한다.
- [ ] **Full checks** — CI와 같은 non-live tests 및 `npm run build`가 성공한다.
- [ ] **Quickstart** — `npm run quickstart`가 repository 밖 sample scaffold와 project/member query harness를 만든다.
- [ ] **Optional provider smoke** — 비용·키 사용을 승인한 경우에만 `OPENAI_API_KEY`와 `KNOWLEDGE_GUILD_PROVIDER_SMOKE=1`로 `npm run test:provider-smoke`를 실행했다.
- [ ] **Secrets scan** — `.env`, API key, raw/output/private/secrets와 개인 자료가 staged/release artifact에 없는지 확인했다.
- [ ] **Production endpoint** — 배포한다면 실제 API endpoint의 read-only/write capability와 provider 환경변수를 별도로 검증했다.
- [ ] **README and screenshot** — README의 현재 기능·한계·스크린샷이 release build와 일치한다.
- [ ] **Tag and notes** — 버전 tag와 release notes에 known limitations, migration 여부, 검증 결과를 기록했다.
