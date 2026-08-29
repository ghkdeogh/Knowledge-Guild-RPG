import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { wikiChatMiddleware } from './server/wiki-chat.mjs'
import { onboardingMiddleware } from './server/onboarding.mjs'
import { repositoryStatusMiddleware } from './server/repository-status.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const providerConfig = { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-5.6-terra', reasoningEffort: env.OPENAI_REASONING_EFFORT || 'low' }
  return { plugins: [react(), { name: 'wiki-api', configureServer(server) { server.middlewares.use(onboardingMiddleware({ providerConfig })); server.middlewares.use(repositoryStatusMiddleware()); server.middlewares.use(wikiChatMiddleware(providerConfig)) } }] }
})
