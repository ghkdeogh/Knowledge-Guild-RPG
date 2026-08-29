import { EventEmitter } from 'node:events'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repoRoot = resolve(appRoot, '..', '..')
const evidence = JSON.parse(await readFile(join(appRoot, 'server', 'wiki-evidence.json'), 'utf8'))
if (evidence.version < 3 || !evidence.manifest?.contentDigest || !Array.isArray(evidence.documents) || !evidence.documents.length) throw new Error('Server evidence artifact is missing')
for (const document of evidence.documents) {
  if (!document.id || typeof document.body !== 'string' || !document.contentDigest || !document.knowledgeType || (document.scope === 'personal' && !document.memberId)) throw new Error('Malformed server evidence artifact')
  const allowed = document.scope === 'personal' ? /^members\/[a-z0-9-]+\/(WIKI_SCHEMA\.md|wiki\/.*\.md)$/.test(document.source) : document.scope === 'project' ? document.source === 'projects/PROJECT_CONTEXT.md' : document.scope === 'synthesis' ? document.source === 'synthesis/README.md' : document.scope === 'decision' ? document.source === 'decisions/README.md' : false
  if (!allowed || /\.private\.md$|\/(raw|output|\.obsidian|node_modules)\//.test(document.source)) throw new Error(`Forbidden server evidence source: ${document.source}`)
}
async function files(directory) { const entries = await readdir(directory, { withFileTypes: true }); return (await Promise.all(entries.map(async entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat() }
const distFiles = await files(join(appRoot, 'dist'))
if (distFiles.some(file => file.endsWith('wiki-evidence.json'))) throw new Error('Server evidence artifact leaked into static output')
const clientText = (await Promise.all(distFiles.filter(file => file.endsWith('.js')).map(file => readFile(file, 'utf8')))).join('\n')
const serverOnlySnippet = evidence.documents.map(document => document.body.slice(400, 520).trim()).find(snippet => snippet.length > 48)
if (serverOnlySnippet && clientText.includes(serverOnlySnippet)) throw new Error('Full Wiki evidence leaked into client bundle')

delete process.env.OPENAI_API_KEY
const { default: handler } = await import('../../../api/wiki-chat.mjs')
function invoke(method, body = '') { return new Promise(resolve => { const req = new EventEmitter(); req.method = method; req.url = '/api/wiki-chat'; req.socket = { remoteAddress: `vercel-test-${method}` }; const response = { status: 0, payload: '', writeHead(status) { this.status = status }, end(payload = '') { this.payload = String(payload); resolve(this) } }; handler(req, response); queueMicrotask(() => { if (body) req.emit('data', Buffer.from(body)); req.emit('end') }) }) }
const fallback = await invoke('POST', JSON.stringify({ memberId: evidence.documents[0].memberId, question: 'Wiki 근거는 무엇인가요?' }))
const result = JSON.parse(fallback.payload)
if (fallback.status !== 200 || result.mode !== 'demo-fallback' || !Array.isArray(result.citations)) throw new Error('Vercel handler no-key fallback failed')
const method = await invoke('GET')
if (method.status !== 405) throw new Error('Vercel handler method guard failed')
console.log(`Validated Vercel adapter, ${evidence.documents.length} server-only evidence documents, and static bundle separation.`)
