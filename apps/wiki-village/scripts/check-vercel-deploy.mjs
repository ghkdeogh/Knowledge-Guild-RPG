import { EventEmitter } from 'node:events'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url))); const evidence = JSON.parse(await readFile(join(appRoot, 'server', 'wiki-evidence.json'), 'utf8'))
if (evidence.version < 4 || evidence.manifest.recordCount !== 0 || evidence.documents.length) throw new Error('Uninitialized server evidence artifact is invalid')
async function files(directory) { const entries = await readdir(directory, { withFileTypes: true }); return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat() }
const distFiles = await files(join(appRoot, 'dist')); if (distFiles.some(file => file.endsWith('wiki-evidence.json'))) throw new Error('Server evidence leaked into static output')
const clientText = (await Promise.all(distFiles.filter(file => file.endsWith('.js')).map(file => readFile(file, 'utf8')))).join('\n'); if (clientText.includes('knowledge-guild-member-context/v1')) throw new Error('Server-only member schema leaked into static output')
function invoke(handler, method, url, body = '') { return new Promise(resolvePromise => { const req = new EventEmitter(); req.method = method; req.url = url; req.socket = { remoteAddress: `vercel-test-${method}` }; const response = { status: 0, payload: '', writeHead(status) { this.status = status }, end(payload = '') { this.payload = String(payload); resolvePromise(this) } }; handler(req, response); queueMicrotask(() => { if (body) req.emit('data', Buffer.from(body)); req.emit('end') }) }) }
delete process.env.OPENAI_API_KEY
const { default: chat } = await import('../../../api/wiki-chat.mjs'); const chatResponse = await invoke(chat, 'POST', '/api/wiki-chat', JSON.stringify({ scope: 'project', question: '프로젝트 목표' })); const chatBody = JSON.parse(chatResponse.payload)
if (chatResponse.status !== 200 || chatBody.mode !== 'unsupported' || chatBody.citations.length) throw new Error('Vercel chat did not preserve uninitialized refusal')
const { default: onboarding } = await import('../../../api/onboarding.mjs'); const stateResponse = await invoke(onboarding, 'GET', '/api/onboarding-state'); const state = JSON.parse(stateResponse.payload)
if (stateResponse.status !== 200 || state.persistenceMode !== 'read-only-demo' || state.phase !== 'PROJECT_UNINITIALIZED') throw new Error('Vercel onboarding state is not explicitly read-only')
const saveResponse = await invoke(onboarding, 'POST', '/api/onboarding', JSON.stringify({ action: 'save-project', project: { projectName: 'x', summary: 'x', problem: 'x', audience: 'x', outcome: 'x' }, expectedDigest: 'x' })); if (saveResponse.status !== 403 || JSON.parse(saveResponse.payload).code !== 'read-only') throw new Error('Vercel onboarding accepted a persistent write')
console.log('Validated uninitialized deployment artifacts, scoped chat refusal, and explicit read-only onboarding API.')
