import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { advanceProfileOnboarding, startProfileOnboarding } from '../server/profile-onboarding.mjs'

const args = process.argv.slice(2)
const value = key => args.includes(key) ? args[args.indexOf(key) + 1] : null
const repoRoot = value('--repo-root') ? resolve(value('--repo-root')) : resolve('..', '..')
const providerConfig = { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-5.6-terra', reasoningEffort: process.env.OPENAI_REASONING_EFFORT || 'low' }
const emit = item => process.stdout.write(`${JSON.stringify(item)}\n`)
let state
const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
for await (const line of input) {
  if (!line.trim()) continue
  try {
    const request = JSON.parse(line)
    const response = request.action === 'start' ? await startProfileOnboarding(request, { repoRoot, providerConfig }) : await advanceProfileOnboarding(state, request, { repoRoot, providerConfig })
    state = response.state
    response.events.forEach(emit)
    if (response.result) emit({ type: 'result', result: response.result })
  } catch (error) {
    emit({ type: 'validation.failed', code: error.code || 'cli-error', message: error.message })
  }
}
