import { createWikiChat, evidenceForScope, sanitizeConversation } from '../server/wiki-chat.mjs'

let providerCalled = false
const project = await createWikiChat({ scope: 'project', question: '프로젝트 목표는 무엇인가요?' }, { responsesClient: { responses: { create: async () => { providerCalled = true; throw new Error('provider must not run') } } }, providerConfig: { apiKey: 'dummy-key' } })
if (project.mode !== 'unsupported' || project.sourceScope !== 'project' || project.citations.length || project.confidence !== 'low' || providerCalled) throw new Error('Uninitialized project produced an unsupported envelope incorrectly')
if ((await evidenceForScope('project', null, '프로젝트')).length) throw new Error('Uninitialized project has evidence')
await createWikiChat({ memberId: '../escape', question: 'x' }).then(() => { throw new Error('Traversal member accepted') }, error => { if (error.status !== 404) throw error })
await createWikiChat({ memberId: 'unknown', question: 'x' }).then(() => { throw new Error('Unknown member accepted') }, error => { if (error.status !== 404) throw error })
await createWikiChat({ scope: 'unknown', question: 'x' }).then(() => { throw new Error('Unknown scope accepted') }, error => { if (error.status !== 400) throw error })
await createWikiChat({ scope: 'project', question: 'x'.repeat(601) }).then(() => { throw new Error('Overlong question accepted') }, error => { if (error.status !== 400) throw error })
for (const invalid of [[{ role: 'system', content: 'x' }], Array.from({ length: 9 }, () => ({ role: 'user', content: 'x' }))]) { try { sanitizeConversation(invalid); throw new Error('Invalid conversation accepted') } catch (error) { if (error.message === 'Invalid conversation accepted') throw error } }
for (const reply of [project]) for (const field of ['answer', 'citations', 'confidence', 'knowledgeType', 'limitation', 'mode', 'sourceScope']) if (!(field in reply)) throw new Error(`Envelope field missing: ${field}`)
console.log('Validated uninitialized chat refusal, deterministic envelope, and member/scope request boundaries.')
