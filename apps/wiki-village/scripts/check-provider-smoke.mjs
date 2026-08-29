import { analyzeProject } from '../server/project-wiki-architect.mjs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const fromFile = async () => { try { const text = await readFile(fileURLToPath(new URL('../.env', import.meta.url)), 'utf8'); return Object.fromEntries(text.split(/\r?\n/).map(line => line.match(/^\s*(OPENAI_(?:API_KEY|MODEL|REASONING_EFFORT))\s*=\s*(.*)\s*$/)).filter(Boolean).map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, '')])) } catch { return {} } }
const fileEnv = await fromFile(); const config = { apiKey: process.env.OPENAI_API_KEY || fileEnv.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || fileEnv.OPENAI_MODEL || 'gpt-5.6-terra', reasoningEffort: process.env.OPENAI_REASONING_EFFORT || fileEnv.OPENAI_REASONING_EFFORT || 'low' }

if (process.env.KNOWLEDGE_GUILD_PROVIDER_SMOKE !== '1' || !config.apiKey) {
  console.log('SKIP: set KNOWLEDGE_GUILD_PROVIDER_SMOKE=1 and OPENAI_API_KEY to run the live provider smoke test.')
  process.exit(0)
}

const result = await analyzeProject({ statement: '학습 실험의 반복 가능한 기록을 위한 Wiki를 설계합니다.' }, { providerConfig: config })
if (result.mode !== 'llm-suggestion' || result.providerStatus !== 'available') throw new Error('Provider smoke did not return an available suggestion')
console.log('Validated opt-in live provider smoke.')
