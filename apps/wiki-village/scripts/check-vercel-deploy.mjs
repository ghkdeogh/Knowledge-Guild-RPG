import { EventEmitter } from 'node:events'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localDraft } from '../server/project-wiki-architect.mjs'

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
const draft = localDraft('기술 학습 결과를 팀과 정리하려는 프로젝트입니다.'); const identity = { memberId: 'deploy-check', displayName: '배포 확인', workingContext: '읽기 전용 blueprint preview를 확인합니다.' }; const previewResponse = await invoke(onboarding, 'POST', '/api/onboarding', JSON.stringify({ action: 'preview', blueprint: draft.blueprint, identity })); const previewBody = JSON.parse(previewResponse.payload); if (previewResponse.status !== 400 || previewBody.code !== 'personal-wiki-init-required') throw new Error('Vercel onboarding still exposed legacy personal preview')
const saveResponse = await invoke(onboarding, 'POST', '/api/onboarding', JSON.stringify({ action: 'save', blueprint: draft.blueprint, identity })); if (saveResponse.status !== 400 || JSON.parse(saveResponse.payload).code !== 'invalid-action') throw new Error('Vercel onboarding exposed a persistent write action')
console.log('Validated uninitialized deployment artifacts, scoped chat refusal, and explicit read-only onboarding API.')
