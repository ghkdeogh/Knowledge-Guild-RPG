import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runWikiArchitect } from '../core/wiki-architect.mjs'

const args = process.argv.slice(2); const value = key => args.includes(key) ? args[args.indexOf(key) + 1] : null
const command = value('--command') || args.find(item => !item.startsWith('--') && item !== value('--repo-root')) || 'analyze'; const root = value('--repo-root') ? resolve(value('--repo-root')) : undefined
const emit = item => process.stdout.write(`${JSON.stringify(item)}\n`)
const fromStdin = async () => new Promise(resolvePromise => { let text = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', chunk => { text += chunk }); process.stdin.on('end', () => resolvePromise(text)) })
const envFile = async () => { try { const text = await readFile(fileURLToPath(new URL('../.env', import.meta.url)), 'utf8'); return Object.fromEntries(text.split(/\r?\n/).map(line => line.match(/^\s*(OPENAI_(?:API_KEY|MODEL|REASONING_EFFORT))\s*=\s*(.*)\s*$/)).filter(Boolean).map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, '')])) } catch { return {} } }
try {
  const inputFile = value('--input'); const raw = inputFile ? await readFile(inputFile, 'utf8') : await fromStdin(); const payload = JSON.parse(raw || '{}')
  const fileEnv = await envFile(); const providerConfig = { apiKey: process.env.OPENAI_API_KEY || fileEnv.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || fileEnv.OPENAI_MODEL || 'gpt-5.6-terra', reasoningEffort: process.env.OPENAI_REASONING_EFFORT || fileEnv.OPENAI_REASONING_EFFORT || 'low' }
  const response = await runWikiArchitect(command, payload, { repoRoot: root, refresh: true, providerConfig })
  response.events.forEach(emit); emit({ type: 'result', result: response.result })
} catch (error) {
  ;(error.events || [{ type: 'validation.failed', code: error.code || 'cli-error', message: error.message }]).forEach(emit)
  process.exitCode = 1
}
