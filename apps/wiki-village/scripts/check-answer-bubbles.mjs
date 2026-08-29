import { answerBubbleView, answerTargetKey, beginAnswerProjection, isValidatedAnswerEnvelope, resolveAnswerProjection, shouldHideRepositoryBark } from '../src/answer-bubbles.js'

const atlas = { scope: 'personal', member: { id: 'atlas', displayName: 'Atlas' } }
const project = { scope: 'project' }
const pending = beginAnswerProjection(11, atlas)
if (pending.target.memberId !== 'atlas' || answerBubbleView(pending)?.text !== '기록을 살펴보는 중…' || !shouldHideRepositoryBark(pending)) throw new Error('Pending answer projection is not scoped or does not yield the repository bark')
const reply = { mode: 'demo-fallback', sourceScope: 'personal', memberId: 'atlas', answer: '허용된 Atlas Wiki 근거의 결정론적 요약입니다.', citations: [{ id: 'atlas-record' }], confidence: 'medium', knowledgeType: 'wiki-record', limitation: '실제 AI 응답이 아닙니다.' }
const resolved = resolveAnswerProjection(pending, 11, atlas, reply)
if (resolved?.reply !== reply || answerBubbleView(resolved)?.modeLabel !== '데모 요약 · 실제 AI 아님' || answerTargetKey(resolved.target) !== 'personal:atlas') throw new Error('Validated answer was not projected to its member bubble')
if (resolveAnswerProjection(pending, 10, atlas, reply) !== pending || resolveAnswerProjection(pending, 11, project, reply) !== pending) throw new Error('Stale or cross-target response replaced the pending answer')
const unsupported = answerBubbleView({ ...resolved, reply: { ...reply, mode: 'unsupported', answer: 'invented answer' } })
const error = answerBubbleView({ ...resolved, reply: { ...reply, mode: 'error', answer: 'invented answer' } })
if (unsupported?.text !== '이 Wiki 기록에서는 답을 찾지 못했어요.' || error?.text !== '지금은 답변을 가져오지 못했어요.') throw new Error('Unsupported or error bubble invented an answer')
if (answerTargetKey(project) !== 'project' || answerTargetKey({ scope: 'personal', memberId: 'atlas' }) !== 'personal:atlas') throw new Error('Project/member answer target isolation failed')
if (!isValidatedAnswerEnvelope(reply, atlas) || isValidatedAnswerEnvelope({ ...reply, memberId: 'lumi' }, atlas) || isValidatedAnswerEnvelope({ ...reply, citations: 'not-an-array' }, atlas)) throw new Error('Malformed or cross-member answer envelope entered the bubble path')
console.log('Validated scoped pending/answer projection, stale-response rejection, bubble modes, and repository-bark priority.')
