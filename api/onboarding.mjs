import { onboardingMiddleware } from '../apps/wiki-village/server/onboarding.mjs'

const onboarding = onboardingMiddleware({ readOnly: true, providerConfig: { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-5.6-terra', reasoningEffort: process.env.OPENAI_REASONING_EFFORT || 'low' } })

export default function handler(req, res) {
  return onboarding(req, res, () => {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: '온보딩 경로를 찾지 못했습니다.' }))
  })
}
