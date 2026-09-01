export const publicSource = source => {
  if (typeof source !== 'string' || source.includes('\\') || source.startsWith('/') || source.includes(':')) return false
  const parts = source.split('/'); if (parts.some(part => !part || part === '.' || part === '..')) return false
  if (parts.at(-1)?.toLowerCase() === 'claude.md') return false
  return (parts[0] === 'projects' && parts[1] === 'wiki') || (parts[0] === 'members' && /^[a-z0-9-]+$/.test(parts[1] || '') && parts[2] === 'wiki')
}
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/.test(value) ? value : null
const frontField = (body, key) => String(body || '').match(new RegExp(`^${key}:\\s*(.+)$`, 'mi'))?.[1]?.trim().replace(/^['"]|['"]$/g, '') || ''
const clean = value => String(value || '').replace(/^---[\s\S]*?---\s*/m, '').replace(/```[\s\S]*?```/g, '').replace(/[`*_>#|]/g, ' ').replace(/\s+/g, ' ').trim()
const stop = new Set(['그리고', '그러나', '대한', '있는', '하는', '에서', '으로', '입니다', '기록', 'wiki', 'project', 'the', 'and', 'with', 'this', 'that', 'from', 'for'])
const tokenise = value => (String(value || '').toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]{1,31}/gu) || []).filter(token => !stop.has(token))
const topicKey = value => tokenise(value).join(' ').slice(0, 80)
const stanceFor = document => {
  const explicit = frontField(document.body, 'stance').toLocaleLowerCase()
  if (['support', 'positive', 'agree', '찬성', '지지'].includes(explicit)) return 'support'
  if (['oppose', 'negative', 'concern', 'disagree', '반대', '우려'].includes(explicit)) return 'concern'
  return null
}
const documentTopic = document => {
  const explicit = frontField(document.body, 'topic')
  const heading = String(document.body || '').match(/^#{1,3}\s+(.+)$/m)?.[1]
  const candidate = explicit || heading || document.title || ''
  const key = topicKey(candidate)
  return key ? { key, label: candidate.trim().slice(0, 100) } : null
}
const evidence = documents => [...new Set(documents.map(document => document.source).filter(publicSource))].sort((a, b) => a.localeCompare(b))
const item = (topic, documents) => ({ topic: topic.label, evidencePaths: evidence(documents), memberIds: [...new Set(documents.map(document => document.memberId).filter(Boolean))].sort((a, b) => a.localeCompare(b)) })

export function buildFlowSummary(documents = []) {
  const safe = documents.filter(document => document && publicSource(document.source) && typeof document.body === 'string')
  const records = safe.map(document => ({ ...document, topic: documentTopic(document), stance: stanceFor(document), updatedAt: validDate(frontField(document.body, 'updated')) || validDate(document.updated) }))
  const evidencePaths = evidence(records)
  if (!records.length) return { version: 1, status: 'insufficient', observedFlow: '아직 흐름을 판단할 공개 Wiki 기록이 없습니다.', frequentTopics: [], recentDirections: [], commonGround: [], differingViews: [], knowledgeGaps: [], nextResearchQuestions: [], evidencePaths: [], lastUpdatedAt: null }
  const groups = new Map()
  for (const record of records) if (record.topic) { const group = groups.get(record.topic.key) || { label: record.topic.label, records: [] }; group.records.push(record); groups.set(record.topic.key, group) }
  const ranked = [...groups.values()].sort((left, right) => right.records.length - left.records.length || left.label.localeCompare(right.label))
  const frequentTopics = ranked.slice(0, 6).map(group => ({ ...item({ label: group.label }, group.records), occurrences: group.records.length }))
  const newest = records.filter(record => record.updatedAt).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.source.localeCompare(right.source)).slice(0, 3)
  const recentDirections = newest.map(record => ({ direction: record.topic?.label || record.title || record.source, evidencePaths: [record.source], updatedAt: record.updatedAt }))
  const commonGround = ranked.flatMap(group => {
    const supported = group.records.filter(record => record.memberId && record.stance === 'support'); const concerned = group.records.filter(record => record.memberId && record.stance === 'concern')
    if (supported.length && concerned.length) return []
    return [supported, concerned].filter(recordsForStance => new Set(recordsForStance.map(record => record.memberId).filter(Boolean)).size >= 2)
      .map(recordsForStance => ({ ...item({ label: group.label }, recordsForStance), stance: recordsForStance[0].stance === 'support' ? '지지' : '우려' }))
  })
  const differingViews = ranked.flatMap(group => {
    const supported = group.records.filter(record => record.memberId && record.stance === 'support'); const concerned = group.records.filter(record => record.memberId && record.stance === 'concern')
    return new Set([...supported, ...concerned].map(record => record.memberId).filter(Boolean)).size >= 2 && supported.length && concerned.length
      ? [{ ...item({ label: group.label }, [...supported, ...concerned]), positions: [{ label: '지지', evidencePaths: evidence(supported) }, { label: '우려', evidencePaths: evidence(concerned) }] }]
      : []
  })
  const gaps = records.flatMap(record => String(record.body || '').split(/\r?\n/).filter(line => /\b(question|unknown|gap|uncertain)\b|질문|미확정|지식 공백|알 수 없음/i.test(line)).map(line => ({ question: clean(line).replace(/^[-*]\s*/, '').slice(0, 180), evidencePaths: [record.source] }))).filter(gap => gap.question)
  const uniqueGaps = [...new Map(gaps.map(gap => [gap.question, gap])).values()].slice(0, 5)
  const lead = frequentTopics[0]?.topic
  const status = lead ? 'observed' : 'insufficient'
  const observedFlow = lead ? `공개 Wiki 기록 ${records.length}건에서 ${lead}를 중심으로 기록이 이어지고 있습니다.` : '공개 Wiki 기록은 있으나 현재 흐름을 판단할 주제가 충분하지 않습니다.'
  return { version: 1, status, observedFlow, frequentTopics, recentDirections, commonGround, differingViews, knowledgeGaps: uniqueGaps, nextResearchQuestions: uniqueGaps.map(gap => ({ question: gap.question, evidencePaths: gap.evidencePaths })), evidencePaths, lastUpdatedAt: records.map(record => record.updatedAt).filter(Boolean).sort().at(-1) || null, memberCount: new Set(records.map(record => record.memberId).filter(Boolean)).size }
}

export function isValidFlowSummary(flow) {
  if (!flow || flow.version !== 1 || !['observed', 'insufficient'].includes(flow.status) || typeof flow.observedFlow !== 'string' || !Array.isArray(flow.evidencePaths) || !Array.isArray(flow.frequentTopics) || !Array.isArray(flow.recentDirections) || !Array.isArray(flow.commonGround) || !Array.isArray(flow.differingViews) || !Array.isArray(flow.knowledgeGaps) || !Array.isArray(flow.nextResearchQuestions) || !(flow.lastUpdatedAt === null || validDate(flow.lastUpdatedAt))) return false
  const top = new Set(flow.evidencePaths); const validPaths = paths => Array.isArray(paths) && paths.length > 0 && paths.every(path => publicSource(path) && top.has(path))
  return flow.evidencePaths.every(publicSource) && new Set(flow.evidencePaths).size === flow.evidencePaths.length
    && (flow.status !== 'observed' || (flow.evidencePaths.length > 0 && flow.frequentTopics.length > 0))
    && flow.frequentTopics.every(value => typeof value?.topic === 'string' && validPaths(value.evidencePaths))
    && flow.recentDirections.every(value => typeof value?.direction === 'string' && validPaths(value.evidencePaths))
    && flow.commonGround.every(value => typeof value?.topic === 'string' && validPaths(value.evidencePaths))
    && flow.differingViews.every(value => typeof value?.topic === 'string' && validPaths(value.evidencePaths) && Array.isArray(value.positions) && value.positions.length === 2 && value.positions.every(position => typeof position?.label === 'string' && validPaths(position.evidencePaths)))
    && flow.knowledgeGaps.every(value => typeof value?.question === 'string' && validPaths(value.evidencePaths))
    && flow.nextResearchQuestions.every(value => typeof value?.question === 'string' && validPaths(value.evidencePaths))
}
