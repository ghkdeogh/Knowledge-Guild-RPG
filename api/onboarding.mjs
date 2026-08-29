import { onboardingMiddleware } from '../apps/wiki-village/server/onboarding.mjs'

const onboarding = onboardingMiddleware({ readOnly: true })

export default function handler(req, res) {
  return onboarding(req, res, () => {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: '온보딩 경로를 찾지 못했습니다.' }))
  })
}
