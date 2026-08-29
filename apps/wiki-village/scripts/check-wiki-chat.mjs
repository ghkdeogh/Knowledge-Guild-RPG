import snapshot from '../src/data/wiki-snapshot.json' with { type: 'json' }
import { classifyProviderError, createWikiChat, evidenceFor, evidenceForScope, sanitizeConversation } from '../server/wiki-chat.mjs'
import { isCurrentRequest } from '../src/chat-request.js'

const memberId = snapshot.members[0]?.id || ''
const fallback = await createWikiChat({ memberId, question: 'Wiki 기록의 근거는 무엇인가요?' })
if (fallback.mode !== 'demo-fallback' || !Array.isArray(fallback.citations)) throw new Error('No-key fallback contract failed')
const projectFallback = await createWikiChat({ scope: 'project', question: '현재 프로젝트의 목표는 무엇인가요?' })
if (projectFallback.sourceScope !== 'project' || projectFallback.memberId !== null || projectFallback.citations.some(item => !item.source.startsWith('projects/'))) throw new Error('Project scope mixed with personal evidence')
if (!(await evidenceForScope('project', null, '자본 이동')).length) throw new Error('Project evidence retrieval failed')
let projectInstructions = ''
const projectGrounded = await createWikiChat({ scope: 'project', question: '현재 프로젝트의 목표는 무엇인가요?' }, { responsesClient: { responses: { create: async request => { projectInstructions = request.instructions; return { output_text: JSON.stringify({ answer: '프로젝트 근거 답변', citations: ['project-context#1'], confidence: 'medium', knowledgeType: 'fact', limitation: '' }) } } } }, providerConfig: { apiKey: 'dummy-key' } })
if (projectGrounded.sourceScope !== 'project' || projectGrounded.memberId !== null || /undefined/.test(projectInstructions) || !projectInstructions.includes('project-record guide')) throw new Error('Project reply identity boundary failed')
await createWikiChat({ scope: 'unknown', question: 'x' }).then(() => { throw new Error('Invalid scope accepted') }, error => { if (error.status !== 400) throw error })
await Promise.all([createWikiChat({ memberId: '../escape', question: 'x' }).then(() => { throw new Error('Traversal accepted') }, error => { if (error.status !== 404) throw error }), createWikiChat({ memberId: 'unknown', question: 'x' }).then(() => { throw new Error('Unknown member accepted') }, error => { if (error.status !== 404) throw error })])
const evidence = await evidenceFor(memberId, 'Wiki 기록')
if (evidence.some(item => /\.private\.md$|\/(raw|output|\.obsidian)\//.test(item.source))) throw new Error('Private evidence leaked')
const fullBody = await evidenceFor(memberId, '향후 확장')
if (!fullBody.length) throw new Error('Full-body retrieval failed')
for (const invalid of [[{ role: 'system', content: 'x' }], Array.from({ length: 9 }, () => ({ role: 'user', content: 'x' }))]) { try { sanitizeConversation(invalid); throw new Error('Invalid conversation accepted') } catch (error) { if (error.message === 'Invalid conversation accepted') throw error } }
const fake = { responses: { create: async ({ model, reasoning, max_output_tokens }) => { if (model !== 'dummy-model' || reasoning?.effort !== 'low' || max_output_tokens !== 700) throw new Error('Provider configuration not injected'); return { model, usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 }, output_text: JSON.stringify({ answer: '근거 기반 답변', citations: [evidence[0]?.id, 'invented-source'], confidence: 'high', knowledgeType: 'wiki-record', limitation: '' }) } } } }
const grounded = await createWikiChat({ memberId, question: 'Wiki 기록', conversation: [{ role: 'user', content: '이전 질문' }] }, { responsesClient: fake, providerConfig: { apiKey: 'dummy-key', model: 'dummy-model', reasoningEffort: 'low' } })
if (grounded.mode !== 'llm-grounded' || grounded.citations.some(item => item.source === 'invented-source')) throw new Error('Citation allowlist failed')
if (grounded.model !== 'dummy-model' || grounded.usage?.totalTokens !== 20) throw new Error('Model or usage contract failed')
if (!grounded.citations[0] || grounded.citations[0].id !== evidence[0].documentId || grounded.citations[0].chunkId !== evidence[0].id) throw new Error('Citation document/chunk identity contract failed')
if (!isCurrentRequest(4, 4) || isCurrentRequest(4, 5)) throw new Error('Stale request guard failed')
if (classifyProviderError({ status: 401 }).category !== 'authentication-failed' || classifyProviderError({ status: 429, code: 'rate_limit_exceeded' }).category !== 'quota-or-rate-limit' || classifyProviderError({ name: 'APIConnectionError' }).category !== 'network-error') throw new Error('Provider error classifier failed')
const parseFallback = await createWikiChat({ memberId, question: 'Wiki 기록' }, { responsesClient: { responses: { create: async () => ({ status: 'completed', output_text: 'not-json' }) } }, providerConfig: { apiKey: 'dummy-key' } })
if (parseFallback.providerStatus !== 'response-parse-error') throw new Error('Response parse separation failed')
const incompleteFallback = await createWikiChat({ memberId, question: 'Wiki 기록' }, { responsesClient: { responses: { create: async () => ({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }) } }, providerConfig: { apiKey: 'dummy-key' } })
if (incompleteFallback.providerStatus !== 'response-incomplete' || incompleteFallback.providerDiagnostic?.incompleteReason !== 'max_output_tokens') throw new Error('Response incomplete separation failed')
const laterEvidence = evidence.find(item => item.documentId !== evidence[0]?.documentId) || evidence.find(item => item.id !== evidence[0]?.id)
if (laterEvidence) {
  const laterFake = { responses: { create: async () => ({ output_text: JSON.stringify({ answer: '뒤 문서 근거', citations: [laterEvidence.id], confidence: 'medium', knowledgeType: 'wiki-record', limitation: '' }) }) } }
  const later = await createWikiChat({ memberId, question: 'Wiki 기록' }, { responsesClient: laterFake, providerConfig: { apiKey: 'dummy-key' } })
  if (later.citations[0]?.id !== laterEvidence.documentId || later.citations[0]?.source !== laterEvidence.source) throw new Error('Selected chunk did not map to its exact document')
}
console.log('Validated wiki chat fallback, validation, private exclusion, full-body retrieval, and document/chunk citation identity.')
