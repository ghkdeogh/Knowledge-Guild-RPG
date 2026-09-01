import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { advancePersonalWikiInit, savePersonalWikiInit, startPersonalWikiInit } from '../server/personal-wiki-initializer.mjs'
import { loadProfileProviderConfig } from '../server/profile-provider-config.mjs'

const args = process.argv.slice(2); const value = key => args.includes(key) ? args[args.indexOf(key) + 1] : null
const repoRoot = value('--repo-root') ? resolve(value('--repo-root')) : resolve('..', '..')
const providerConfig = await loadProfileProviderConfig(); const emit = value => process.stdout.write(`${JSON.stringify(value)}\n`)
let state; const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
for await (const line of input) {
  if (!line.trim()) continue
  try { const request = JSON.parse(line); const response = request.action === 'start' ? await startPersonalWikiInit(request, { repoRoot, providerConfig }) : request.action === 'save' ? await savePersonalWikiInit(state, request, { repoRoot }) : await advancePersonalWikiInit(state, request, { repoRoot, providerConfig }); state = response.state; response.events.forEach(emit); if (response.result) emit({ type: 'result', result: response.result }) } catch (error) { emit({ type: 'validation.failed', code: error.code || 'cli-error', message: error.message }) }
}
