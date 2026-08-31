export const HEAD_OFFSET = Object.freeze({ x: 1, y: -37 })

const roles = [
  { id: 'archivist', label: '기록관', tool: '책 · 깃펜', terms: ['index', 'log', 'schema', 'record'] },
  { id: 'explorer', label: '탐색가', tool: '지도 · 돋보기', terms: ['source', 'data', 'research', 'signal', 'catalog'] },
  { id: 'architect', label: '설계사', tool: '청사진 · 자', terms: ['design', 'concept', 'architecture', 'build', 'visual'] },
  { id: 'verifier', label: '검증관', tool: '렌즈 · 체크패드', terms: ['verify', 'evidence', 'hypotheses', 'test', 'validation'] },
  { id: 'coordinator', label: '조정관', tool: '연결 카드 · 지휘봉', terms: ['compare', 'synthesis', 'meeting', 'council', 'connect'] }
]

export function inferGuildRole(documents = []) {
  const score = Object.fromEntries(roles.map(role => [role.id, 0]))
  for (const document of documents) {
    const value = `${document.title || ''} ${document.source || ''} ${document.category || ''}`.toLowerCase()
    for (const role of roles) score[role.id] += role.terms.reduce((sum, term) => sum + (value.includes(term) ? 1 : 0), 0)
  }
  const ranked = roles.slice(1).map(role => ({ role, score: score[role.id] })).sort((a, b) => b.score - a.score || a.role.id.localeCompare(b.role.id))
  const winner = ranked[0]?.score > 0 ? ranked[0].role : roles[0]
  const evidence = documents.find(document => winner.terms.some(term => `${document.title || ''} ${document.source || ''} ${document.category || ''}`.toLowerCase().includes(term))) || documents[0] || null
  return { id: winner.id, label: winner.label, tool: winner.tool, evidenceId: evidence?.id || null, evidenceTitle: evidence?.title || '인덱싱된 Wiki 문서 없음', evidenceCategory: evidence?.category || '개인 Wiki', evidenceSource: evidence?.source || '', score: winner === roles[0] ? 0 : score[winner.id] }
}

export function activityBand(lastPublicActivity, now = new Date()) {
  const timestamp = typeof lastPublicActivity === 'string' ? Date.parse(`${lastPublicActivity}T00:00:00.000Z`) : NaN
  const nowTime = now instanceof Date ? now.getTime() : Date.parse(now)
  if (!Number.isFinite(timestamp) || !Number.isFinite(nowTime)) return { id: 'neutral', pose: 'idle', label: '중립 대기', lastPublicActivity: null }
  const days = Math.max(0, Math.floor((nowTime - timestamp) / 86400000))
  if (days <= 7) return { id: 'crafting', pose: 'crafting', label: '최근 공개 경로 변경일', lastPublicActivity, days }
  if (days <= 14) return { id: 'wandering', pose: 'reading', label: '최근 공개 경로 변경일', lastPublicActivity, days }
  if (days <= 29) return { id: 'resting', pose: 'resting', label: '최근 공개 경로 변경일', lastPublicActivity, days }
  return { id: 'sleeping', pose: 'sleeping', label: '최근 공개 경로 변경일', lastPublicActivity, days }
}

export const activityDescription = activity => activity?.lastPublicActivity ? `최근 공개 경로 변경일 ${activity.lastPublicActivity}` : '최근 공개 경로 변경일을 확인하지 못함 · 중립 대기'

export const memberActivity = (member, repository) => {
  const lastDate = repository?.members?.[member?.id]?.lastDate
  return typeof lastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastDate)
    ? activityBand(lastDate)
    : member?.activity || activityBand(null)
}

export function repositoryPathState(memberId, repository, seenNews = {}) {
  const state = repository?.members?.[memberId]
  if (!state) return { id: 'unknown', pose: 'neutral', message: null, remoteTip: null }
  if (state.remoteNews && state.remoteTip && seenNews[memberId] !== state.remoteTip) return { id: 'remote-news', pose: 'notice', message: '새 공개 Wiki 기록이 도착했어요.', remoteTip: state.remoteTip }
  if (state.dirty) return { id: 'local-dirty', pose: 'crafting', message: '공개 Wiki 경로에 작성 중 변경이 있어요.', remoteTip: null }
  return { id: 'known', pose: null, message: null, remoteTip: state.remoteTip || null }
}

export function selectRepositoryBark(members = [], repository, seenNews = {}, dismissed = {}) {
  const candidates = members.map(member => ({ member, state: repositoryPathState(member.id, repository, seenNews) }))
    .filter(item => item.state.id === 'remote-news' || item.state.id === 'local-dirty')
    .sort((left, right) => (left.state.id === 'remote-news' ? 0 : 1) - (right.state.id === 'remote-news' ? 0 : 1) || left.member.id.localeCompare(right.member.id))
  const choice = candidates.find(item => !dismissed[`${item.member.id}:${item.state.id}:${item.state.remoteTip || 'dirty'}`])
  return choice ? { ...choice, key: `${choice.member.id}:${choice.state.id}:${choice.state.remoteTip || 'dirty'}` } : null
}

export function confirmMemberSeen(seenNews = {}, memberId, repository) {
  const state = repository?.members?.[memberId]
  return state?.remoteNews && state.remoteTip ? { ...seenNews, [memberId]: state.remoteTip } : seenNews
}
