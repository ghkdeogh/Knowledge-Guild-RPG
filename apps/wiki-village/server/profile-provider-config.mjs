import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const allowed = /^(OPENAI_(?:API_KEY|MODEL|REASONING_EFFORT))$/

export function parseProfileProviderEnv(text) {
  return Object.fromEntries(String(text || '').split(/\r?\n/).map(line => line.match(/^\s*(OPENAI_(?:API_KEY|MODEL|REASONING_EFFORT))\s*=\s*(.*)\s*$/)).filter(Boolean).map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, '')]).filter(([key]) => allowed.test(key)))
}

export async function loadProfileProviderConfig({ env = process.env, envPath = fileURLToPath(new URL('../.env', import.meta.url)) } = {}) {
  let fileEnv = {}
  try { fileEnv = parseProfileProviderEnv(await readFile(envPath, 'utf8')) } catch {}
  return { apiKey: env.OPENAI_API_KEY || fileEnv.OPENAI_API_KEY, model: env.OPENAI_MODEL || fileEnv.OPENAI_MODEL || 'gpt-5.6-terra', reasoningEffort: env.OPENAI_REASONING_EFFORT || fileEnv.OPENAI_REASONING_EFFORT || 'low' }
}
