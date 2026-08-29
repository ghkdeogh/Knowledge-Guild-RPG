export const answerTargetKey = target => target?.scope === 'personal' && (target.member?.id || target.memberId) ? `personal:${target.member?.id || target.memberId}` : 'project'

export const answerTargetSnapshot = target => target?.scope === 'personal' && target.member?.id
  ? { scope: 'personal', memberId: target.member.id, displayName: target.member.displayName }
  : { scope: 'project', memberId: null, displayName: '프로젝트 공통 기록' }

export function beginAnswerProjection(requestId, target) {
  return { requestId, phase: 'pending', target: answerTargetSnapshot(target), reply: null }
}

export function resolveAnswerProjection(current, requestId, target, reply) {
  const snapshot = answerTargetSnapshot(target)
  return current?.phase === 'pending' && current.requestId === requestId && answerTargetKey(current.target) === answerTargetKey(snapshot)
    ? { ...current, phase: 'answer', reply }
    : current
}

const modeLabel = {
  'llm-grounded': '실제 AI · 인용 근거 기반',
  'demo-fallback': '데모 요약 · 실제 AI 아님',
  unsupported: '답변 보류 · 근거 부족',
  error: '오류 · 답변 없음',
}

export function answerBubbleView(projection) {
  if (!projection) return null
  if (projection.phase === 'pending') return { phase: 'pending', text: '기록을 살펴보는 중…', detail: '현재 UI 요청 상태입니다.' }
  const reply = projection.reply
  if (!reply || typeof reply.answer !== 'string') return null
  const text = reply.mode === 'unsupported' ? '이 Wiki 기록에서는 답을 찾지 못했어요.' : reply.mode === 'error' ? '지금은 답변을 가져오지 못했어요.' : reply.answer
  const excerpt = text.trim()
  const truncated = excerpt.length > 120
  return {
    phase: 'answer',
    text: truncated ? `${excerpt.slice(0, 120).trimEnd()}…` : excerpt,
    truncated,
    mode: reply.mode,
    modeLabel: modeLabel[reply.mode] || '응답 상태',
    confidence: reply.confidence,
    knowledgeType: reply.knowledgeType,
  }
}

export const shouldHideRepositoryBark = projection => Boolean(projection?.phase === 'pending' || projection?.phase === 'answer')

export function isValidatedAnswerEnvelope(body, target) {
  const snapshot = answerTargetSnapshot(target)
  const allowedModes = new Set(['llm-grounded', 'demo-fallback', 'unsupported', 'error'])
  return Boolean(body && body.sourceScope === snapshot.scope && body.memberId === snapshot.memberId && typeof body.answer === 'string' && Array.isArray(body.citations) && body.citations.every(item => item && typeof item.id === 'string') && typeof body.confidence === 'string' && typeof body.knowledgeType === 'string' && typeof body.limitation === 'string' && allowedModes.has(body.mode))
}
