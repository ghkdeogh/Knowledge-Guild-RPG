import { createHash } from 'node:crypto'

export const architectSchema = 'knowledge-guild-wiki-architect/v1'
export const blueprintSchema = 'knowledge-guild-wiki-blueprint/v1'
const harnessIds = new Set(['ingest', 'query', 'lint', 'reflect'])
const reserved = new Set(['raw', 'output', 'private', 'secrets', '.env', 'node_modules', '.obsidian'])
const safePageId = value => /^[a-z][a-z0-9-]{1,32}$/.test(value) && !reserved.has(value) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(value)
const clean = (value, max = 240) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
const slug = value => clean(value, 100).toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '').replace(/[가-힣]/g, '').replace(/-+/g, '-').slice(0, 48) || 'project-wiki'
const quote = value => JSON.stringify(value)
const digest = value => createHash('sha256').update(value).digest('hex')
const contains = (text, terms) => terms.some(term => text.toLowerCase().includes(term))
const page = (id, reason) => ({ id, label: id, route: `wiki/${id}/index.md`, reason })
const safeText = (value, label, max = 240) => {
  const result = clean(value, max)
  if (!result) throw Object.assign(new Error(`${label} is required`), { status: 400, code: 'invalid-input' })
  return result
}

export function validateIdentity(value) {
  const input = value && typeof value === 'object' ? value : null
  const memberId = clean(input?.memberId, 63)
  if (!/^(?!con$|prn$|aux$|nul$|com[1-9]$|lpt[1-9]$)[a-z0-9][a-z0-9-]{0,62}$/.test(memberId)) throw Object.assign(new Error('Invalid member id'), { status: 400, code: 'invalid-member-id' })
  return { memberId, displayName: safeText(input.displayName, 'displayName', 120), workingContext: safeText(input.workingContext, 'workingContext', 360) }
}

export function validateBrief(value) {
  const input = value && typeof value === 'object' ? value : null
  if (!input) throw Object.assign(new Error('Invalid interpreted brief'), { status: 400, code: 'invalid-input' })
  const list = (items, max = 6) => Array.isArray(items) ? items.map(item => clean(item, 180)).filter(Boolean).slice(0, max) : []
  return {
    schema: architectSchema,
    projectName: safeText(input.projectName, 'projectName', 100),
    purpose: safeText(input.purpose, 'purpose', 300),
    target: safeText(input.target, 'target', 220),
    outcome: safeText(input.outcome, 'outcome', 300),
    knownFacts: list(input.knownFacts),
    assumptions: list(input.assumptions),
    unknowns: list(input.unknowns),
    mode: input.mode === 'llm-suggestion' ? 'llm-suggestion' : 'local-draft',
  }
}

export function sanitizeBlueprint(value) {
  const input = value && typeof value === 'object' ? value : null
  if (!input) throw Object.assign(new Error('Invalid blueprint'), { status: 400, code: 'invalid-blueprint' })
  const brief = validateBrief(input.brief)
  const candidates = Array.isArray(input.pageTypes) ? input.pageTypes : []
  const seen = new Set()
  const pageTypes = candidates.map(candidate => {
    const id = clean(candidate?.id, 32).toLowerCase()
    if (!safePageId(id) || seen.has(id)) throw Object.assign(new Error('Unsafe blueprint page type'), { status: 400, code: 'unsafe-path' })
    seen.add(id)
    const route = `wiki/${id}/index.md`
    if (candidate.route && clean(candidate.route, 80) !== route) throw Object.assign(new Error('Client paths are not accepted'), { status: 400, code: 'unsafe-path' })
    return { id, label: clean(candidate.label, 70) || id, route, reason: safeText(candidate.reason, 'page reason', 180) }
  }).slice(0, 8)
  if (!pageTypes.length) throw Object.assign(new Error('Blueprint needs page types'), { status: 400, code: 'invalid-blueprint' })
  const harnesses = [...new Set((Array.isArray(input.harnesses) ? input.harnesses : []).map(item => clean(typeof item === 'string' ? item : item?.id, 24)).filter(id => harnessIds.has(id)))].slice(0, 4)
  return { schema: blueprintSchema, brief, pageTypes, harnesses, rationale: clean(input.rationale, 360) || '승인된 목적과 결과에 맞춰 선택한 Wiki 구조입니다.' }
}

function domainDefaults(text) {
  if (contains(text, ['창작', '소설', '세계관', '캐릭터', 'plot', 'story', 'creative'])) return { pages: [page('world', '세계관의 공통 규칙을 분리하기 위해'), page('character', '등장인물과 관계를 기록하기 위해'), page('plot', '플롯과 장면의 선택을 추적하기 위해'), page('reference', '참고 자료와 출처를 분리하기 위해'), page('artifact', '공개할 산출물을 정리하기 위해')], harnesses: ['ingest', 'query', 'lint'] }
  if (contains(text, ['시장', 'market', '고객', 'company', '기업', '경쟁'])) return { pages: [page('company', '대상 기업과 주체를 구분하기 위해'), page('market', '시장 변화와 조건을 추적하기 위해'), page('hypothesis', '검증 전 가정을 분리하기 위해'), page('signal', '관찰 신호를 기록하기 위해'), page('conclusion', '근거 기반 결론을 남기기 위해')], harnesses: ['ingest', 'query', 'lint'] }
  if (contains(text, ['학습', 'learning', '교육', 'study', '기술', '개발', 'code'])) return { pages: [page('technical', '핵심 개념과 구현 사실을 정리하기 위해'), page('decision', '명시적 합의와 선택 근거를 분리하기 위해'), page('recipe', '반복 가능한 절차를 만들기 위해'), page('case', '적용 사례를 비교하기 위해')], harnesses: ['ingest', 'query', 'lint'] }
  return { pages: [page('research', '조사 사실과 출처를 정리하기 위해'), page('hypothesis', '검증 전 가정을 분리하기 위해'), page('guide', '프로젝트 운영 방법을 남기기 위해'), page('log', '변화와 확인 기록을 남기기 위해')], harnesses: ['ingest', 'query', 'lint'] }
}

export function localDraft(statement, clarifications = []) {
  const source = [clean(statement, 1200), ...clarifications.map(item => clean(item, 500))].filter(Boolean).join(' ')
  if (!source) throw Object.assign(new Error('Project statement is required'), { status: 400, code: 'invalid-input' })
  const defaults = domainDefaults(source)
  const targetKnown = contains(source, ['누구', '대상', '고객', '학생', '팀', '사용자'])
  const outcomeKnown = contains(source, ['결과', '목표', '완성', '개선', '결론', '만들'])
  const purposeKnown = source.length > 35
  const unknowns = [!purposeKnown && '프로젝트가 해결하려는 핵심 목적', !targetKnown && '이 Wiki를 사용할 주요 대상', !outcomeKnown && '성공으로 볼 수 있는 결과'].filter(Boolean)
  const projectName = contains(source, ['시장', 'market']) ? '시장 탐색 Wiki' : contains(source, ['학습', 'learning', '기술', '개발']) ? '학습 설계 Wiki' : '새 프로젝트 Wiki'
  const brief = validateBrief({ projectName, purpose: purposeKnown ? '승인 전 프로젝트 의도를 구조화하고, 확인 가능한 Wiki 기록으로 발전시키는 작업입니다.' : '프로젝트 의도를 구조화할 초안입니다.', target: targetKnown ? '사용자가 설명한 프로젝트의 참여자와 독자' : '승인 전 지정할 주요 독자', outcome: outcomeKnown ? '승인된 목적에 맞는 추적 가능한 Wiki와 결과 기록' : '성공 결과를 합의한 뒤 생성할 Wiki', knownFacts: ['사용자가 자유 형식의 프로젝트 설명을 제공했습니다.'], assumptions: ['아직 원문을 source layer에 ingest하지 않으며, 이 내용은 편집 가능한 해석 초안입니다.'], unknowns, mode: 'local-draft' })
  const blueprint = sanitizeBlueprint({ brief, pageTypes: defaults.pages, harnesses: contains(source, ['회고', 'reflect', '성찰']) ? [...defaults.harnesses, 'reflect'] : defaults.harnesses, rationale: '도메인 신호에 따라 제안한 초기 구조이며, 승인 전에 자유롭게 수정할 수 있습니다.' })
  return { mode: 'local-draft', brief, blueprint, nextQuestion: unknowns[0] || null }
}

const analysisSchema = { type: 'object', additionalProperties: false, required: ['brief', 'pageTypes', 'harnesses', 'rationale'], properties: { brief: { type: 'object' }, pageTypes: { type: 'array' }, harnesses: { type: 'array' }, rationale: { type: 'string' } } }
export async function analyzeProject({ statement, clarifications = [] }, { responsesClient, providerConfig = {} } = {}) {
  const fallback = localDraft(statement, clarifications)
  if (!providerConfig.apiKey && !responsesClient) return fallback
  try {
    const OpenAI = (await import('openai')).default
    const client = responsesClient || new OpenAI({ apiKey: providerConfig.apiKey })
    const response = await client.responses.create({ model: providerConfig.model || 'gpt-5.6-terra', store: false, instructions: 'Interpret a project statement without repeating it. Return only a Korean JSON proposal. Distinguish known facts, assumptions, and unknowns. Propose project-specific page type ids as lowercase hyphenated identifiers matching ^[a-z][a-z0-9-]{1,32}$; do not use raw, output, private, secrets, .env, node_modules, .obsidian, or reserved Windows names. Routes must be wiki/<page-type>/index.md. Never provide source content or arbitrary paths.', input: 'Create an editable project Wiki blueprint from this user statement and optional clarification answers. Do not quote or reproduce either.\nStatement: ' + clean(statement, 1200) + '\nClarifications: ' + clarifications.map(item => clean(item, 500)).filter(Boolean).join(' | '), text: { format: { type: 'json_schema', name: 'project_wiki_architect', strict: true, schema: analysisSchema } } })
    const parsed = JSON.parse(response.output_text)
    const blueprint = sanitizeBlueprint({ ...parsed, brief: { ...parsed.brief, mode: 'llm-suggestion' } })
    const protectedUtterances = [statement, ...clarifications].map(item => clean(item, 1200)).filter(item => item.length >= 16)
    if (protectedUtterances.some(item => JSON.stringify(blueprint).includes(item))) throw new Error('LLM proposal copied user utterance')
    return { mode: 'llm-suggestion', brief: blueprint.brief, blueprint, nextQuestion: blueprint.brief.unknowns[0] || null }
  } catch { return fallback }
}

export function renderProjectFiles(blueprint) {
  const safe = sanitizeBlueprint(blueprint)
  const { brief } = safe
  const front = `schema: ${architectSchema}\nknowledgeType: fact\nprojectName: ${quote(brief.projectName)}\n`
  const list = items => items.length ? items.map(item => `- ${item}`).join('\n') : '- 없음'
  const files = {
    'PROJECT_CONTEXT.md': `---\n${front}---\n\n# Project Context\n\n## Purpose\n\n${brief.purpose}\n\n## Target\n\n${brief.target}\n\n## Outcome\n\n${brief.outcome}\n\n## Known facts\n\n${list(brief.knownFacts)}\n\n## Assumptions\n\n${list(brief.assumptions)}\n\n## Unknowns\n\n${list(brief.unknowns)}\n`,
    'WIKI_BLUEPRINT.md': `---\nschema: ${blueprintSchema}\nknowledgeType: wiki-record\n---\n\n# Wiki Blueprint\n\n## Rationale\n\n${safe.rationale}\n\n## Page types\n\n${safe.pageTypes.map(item => `- ${item.id}: ${item.reason}`).join('\n')}\n\n## Harnesses\n\n${safe.harnesses.length ? safe.harnesses.map(item => `- ${item}`).join('\n') : '- 없음'}\n\n## Blueprint JSON\n\n\`\`\`json\n${JSON.stringify(safe, null, 2)}\n\`\`\`\n`,
    'raw/README.md': '# Raw source layer\n\n원문 source는 명시적 ingest 승인 뒤에만 추가합니다. 이 scaffold에는 사용자 원문이 저장되지 않습니다.\n',
    'wiki/index.md': `---\nschema: ${blueprintSchema}\nknowledgeType: wiki-record\n---\n\n# ${brief.projectName} Wiki\n\n승인된 blueprint의 compiled Wiki index입니다.\n`,
    'output/README.md': '# Output layer\n\n결과물은 compiled Wiki와 분리해 둡니다. snapshot에는 포함되지 않습니다.\n',
    'WIKI_INDEX.md': '# Wiki index\n\n' + safe.pageTypes.map(item => `- [${item.label}](${item.route})`).join('\n') + '\n',
    'ACTIVITY_LOG.md': '# Activity log\n\n- Scaffold created after explicit approval.\n',
  }
  for (const item of safe.pageTypes) files[item.route] = `---\nschema: ${blueprintSchema}\nknowledgeType: ${item.id === 'hypothesis' ? 'hypothesis' : 'wiki-record'}\npageType: ${item.id}\n---\n\n# ${item.label}\n\n## Purpose\n\n${item.reason}\n\n## Records\n\n승인 뒤에 확인 가능한 Wiki 기록을 추가합니다.${item.id === 'decision' ? '\n\n이 페이지는 공식 결정이 아닙니다. 합의된 결정은 decisions/에 별도로 기록합니다.' : ''}\n`
  for (const harness of safe.harnesses) files[`wiki/harnesses/${harness}.md`] = `# ${harness} harness\n\n이 역할은 승인된 blueprint에 따라 선택되었습니다.\n`
  return files
}

export function renderMemberFiles(identity, blueprint) {
  const safeIdentity = validateIdentity(identity); const safe = sanitizeBlueprint(blueprint)
  const metadata = `schema: ${architectSchema}\nmemberId: ${safeIdentity.memberId}\nknowledgeType: personal-opinion\n`
  return {
    'CONTEXT.md': `---\n${metadata}---\n\n# Member Context\n\n## Display name\n\n${safeIdentity.displayName}\n\n## Approved working context\n\n${safeIdentity.workingContext}\n`,
    'WIKI_SCHEMA.md': `---\nschema: ${architectSchema}\nmemberId: ${safeIdentity.memberId}\nknowledgeType: wiki-record\n---\n\n# Personal Wiki Schema\n\n개인 의견은 personal-opinion으로, 공통 사실은 projects/에 분리합니다.\n`,
    'raw/README.md': '# Raw source layer\n\n명시적 ingest 승인 전에는 사용자 원문을 저장하지 않습니다.\n',
    'wiki/index.md': `---\nschema: ${architectSchema}\nmemberId: ${safeIdentity.memberId}\nknowledgeType: personal-opinion\n---\n\n# ${safeIdentity.displayName} Wiki\n\n## Working context\n\n${safeIdentity.workingContext}\n`,
    'output/README.md': '# Output layer\n\n개인 Wiki의 결과물은 compiled records와 분리합니다.\n',
    'WIKI_INDEX.md': '# Personal Wiki index\n\n' + safe.pageTypes.map(item => `- ${item.label}`).join('\n') + '\n',
    'ACTIVITY_LOG.md': '# Activity log\n\n- Personal Wiki scaffold created after explicit approval.\n',
  }
  for (const item of safe.pageTypes) files[`wiki/${item.id}/index.md`] = `---\nschema: ${blueprintSchema}\nmemberId: ${safeIdentity.memberId}\nknowledgeType: ${item.id === 'hypothesis' ? 'hypothesis' : 'wiki-record'}\npageType: ${item.id}\n---\n\n# ${item.label}\n\n## Approved working context\n\n${safeIdentity.workingContext}\n`
  for (const harness of safe.harnesses) files[`wiki/harnesses/${harness}.md`] = `# ${harness} harness\n\n이 역할은 승인된 blueprint에 따라 선택되었습니다.\n`
  return files
}

export const previewDigest = files => digest(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => `${path}\n${content}`).join('\n'))
