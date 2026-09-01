import { access, lstat, mkdir, readFile, realpath, rename, rm, rmdir, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join, relative, resolve, sep } from 'node:path'

const memberIdPattern = /^(?!con$|prn$|aux$|nul$|com[1-9]$|lpt[1-9]$)[a-z0-9][a-z0-9-]{0,62}$/
const idPattern = /^(?!con$|prn$|aux$|nul$|com[1-9]$|lpt[1-9]$)[a-z][a-z0-9-]{0,48}$/
const reserved = new Set(['claude', 'context', 'profile', 'wiki-schema', 'raw', 'wiki', 'output', 'private', 'secrets', 'harnesses'])
const managedStart = '<!-- wiki-operation-rules:start -->'
const managedEnd = '<!-- wiki-operation-rules:end -->'
const exists = path => access(path).then(() => true).catch(() => false)
const fail = (message, code, status = 400) => { throw Object.assign(new Error(message), { code, status }) }
const clean = (value, size = 180) => typeof value === 'string' ? value.replace(/[\u0000\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, size) : ''
const safeId = value => { const id = clean(value, 50).toLowerCase(); if (!idPattern.test(id) || reserved.has(id)) fail('안전하지 않은 폴더 ID입니다.', 'unsafe-path'); return id }
const safeMemberId = value => { const id = clean(value, 64); if (!memberIdPattern.test(id)) fail('member-id는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.', 'invalid-member-id'); return id }
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const contentDigest = value => createHash('sha256').update(value).digest('hex')
const event = (type, data = {}) => ({ type, at: 'session', ...data })
const memberRoot = (repoRoot, memberId) => {
  const root = resolve(repoRoot); const members = resolve(root, 'members'); const target = resolve(members, safeMemberId(memberId))
  if (!target.startsWith(`${members}${sep}`)) fail('선택한 member 공간 밖에는 접근할 수 없습니다.', 'unsafe-path')
  return { root, members, target }
}
async function safeExistingMember(repoRoot, memberId) {
  const paths = memberRoot(repoRoot, memberId)
  if (!(await exists(paths.target))) fail('선택한 member의 PROFILE.md가 필요합니다.', 'profile-missing', 404)
  if ((await lstat(paths.members)).isSymbolicLink() || (await lstat(paths.target)).isSymbolicLink()) fail('심볼릭 링크 member 공간은 사용할 수 없습니다.', 'unsafe-path')
  const [actualMembers, actualTarget] = await Promise.all([realpath(paths.members), realpath(paths.target)])
  if (actualTarget !== resolve(actualMembers, memberId)) fail('선택한 member 공간 밖에는 접근할 수 없습니다.', 'unsafe-path')
  return { ...paths, actualTarget }
}
async function readInputs(repoRoot, memberId) {
  const scope = await safeExistingMember(repoRoot, memberId)
  const profilePath = join(scope.target, 'PROFILE.md'); const claudePath = join(scope.target, 'CLAUDE.md'); const contextPath = join(scope.target, 'CONTEXT.md')
  if (!(await exists(profilePath)) || !(await lstat(profilePath)).isFile()) fail('PROFILE.md가 필요합니다.', 'profile-missing', 404)
  const safeFile = async path => { if (!(await exists(path))) return null; if (!(await lstat(path)).isFile()) fail('개인 context 파일은 일반 파일이어야 합니다.', 'unsafe-path'); const resolved = await realpath(path); if (!resolved.startsWith(`${scope.actualTarget}${sep}`)) fail('선택한 member 공간 밖에는 접근할 수 없습니다.', 'unsafe-path'); return readFile(path, 'utf8') }
  const principlesPath = resolve(scope.root, 'prompts', 'llm-wiki.md')
  if (!principlesPath.startsWith(`${scope.root}${sep}`)) fail('허용되지 않은 초기화 지침 경로입니다.', 'unsafe-path')
  const [profile, claude, context, principles] = await Promise.all([safeFile(profilePath), safeFile(claudePath), safeFile(contextPath), readFile(principlesPath, 'utf8')])
  if (!principles.trim()) fail('LLM Wiki 운영 원칙을 읽을 수 없습니다.', 'prompt-missing')
  if (!claude && !context) return { scope, profile, principles, inputMissing: true, profileDigest: contentDigest(profile) }
  const primary = claude || context
  if (Buffer.byteLength(profile) + Buffer.byteLength(primary) > 128000) fail('PROFILE.md와 개인 context가 안전한 초기화 한도를 초과합니다.', 'input-too-large')
  return { scope, profile, claude, context, primary, primaryKind: claude ? 'CLAUDE' : 'CONTEXT-compatibility', compatibilityBootstrap: !claude, principles, profileDigest: contentDigest(profile), primaryDigest: contentDigest(primary), legacyContextDigest: !claude && context ? contentDigest(context) : null }
}
function evidenceSections(profile, personal, personalDocument = 'CLAUDE') {
  const sections = new Map()
  for (const [document, text] of [['PROFILE', profile], [personalDocument, personal]]) {
    let ref = `${document}:document`; let body = []
    const flush = () => { if (body.length) sections.set(ref, body.join('\n')) }
    for (const line of text.split(/\r?\n/)) {
      if (/^#{1,3}\s+/.test(line)) { flush(); ref = `${document}:${line.replace(/^#+\s+/, '').slice(0, 50)}`; body = [line] } else body.push(line)
    }
    flush()
  }
  return sections
}
const terms = value => [...new Set((clean(value, 200).toLowerCase().match(/[a-z0-9]{3,}|[가-힣]{2,}/g) || []).filter(token => !['sources', 'source', 'result', 'knowledge', 'folder', '자료', '결과', '지식', '원본'].includes(token)))]
const has = (text, terms) => terms.some(term => text.toLowerCase().includes(term))
const defs = [
  { key: 'research', terms: ['research', 'study', 'paper', '논문', '연구', '조사', '실험'], raw: [['papers', '논문·보고서 원본'], ['research-notes', '조사 메모']], wiki: [['concepts', '핵심 개념과 주장'], ['questions', '검증할 질문과 공백']], output: [['reports', '조사 보고서·브리프']] },
  { key: 'product', terms: ['product', 'customer', 'feedback', 'service', '제품', '고객', '피드백', '서비스', '기획'], raw: [['feedback', '고객·사용자 피드백'], ['product-notes', '제품 관찰 메모']], wiki: [['problems', '문제와 맥락'], ['hypotheses', '검증할 가설']], output: [['specs', '제품 명세']], },
  { key: 'learning', terms: ['learn', 'course', 'education', '학습', '공부', '교육', '강의'], raw: [['course-notes', '학습 원본과 필기']], wiki: [['concepts', '학습 개념'], ['methods', '반복 가능한 방법']], output: [['study-notes', '학습 정리']], },
  { key: 'creative', terms: ['story', 'novel', 'fiction', 'creative', 'writing', '창작', '소설', '세계관', '글쓰기'], raw: [['references', '창작 참고 자료'], ['drafts', '초안 원본']], wiki: [['themes', '주제와 모티프'], ['story-elements', '인물·세계·전개']], output: [['drafts', '완성 전 결과물']], },
]
const sourceSignals = [ ['articles', ['article', '기사']], ['meetings', ['meeting', '회의']], ['data', ['dataset', 'data', '데이터']], ['images', ['image', '사진', '이미지']], ['books', ['book', '책']], ['journals', ['journal', '일지']], ['notes', ['note', '메모']] ]
const outputSignals = [ ['reports', ['report', '보고서', '브리프']], ['specs', ['spec', '명세']], ['slides', ['slide', '발표']], ['experiments', ['experiment', '실험']], ['markdown', ['markdown', '마크다운']], ['plans', ['plan', '계획']] ]
const label = id => ({ papers: '논문·보고서', 'research-notes': '조사 메모', feedback: '피드백', 'product-notes': '제품 메모', 'course-notes': '학습 메모', references: '참고 자료', drafts: '초안', articles: '기사', meetings: '회의 기록', data: '데이터', images: '이미지', books: '책', journals: '일지', notes: '메모', concepts: '개념', questions: '질문', problems: '문제', hypotheses: '가설', methods: '방법', themes: '주제', 'story-elements': '이야기 요소', reports: '보고서', specs: '명세', slides: '발표 자료', experiments: '실험 결과', markdown: 'Markdown 문서', plans: '계획' }[id] || id)
function item(id, purpose, evidence, examples = []) { return { id: safeId(id), label: clean(label(id), 60), purpose: clean(purpose, 120), evidence: evidence.slice(0, 3), examples, links: [] } }
function linkPlan(plan) {
  for (const [index, source] of plan.raw.entries()) source.links = plan.wiki.length ? [plan.wiki[index % plan.wiki.length].id] : []
  for (const [index, knowledge] of plan.wiki.entries()) knowledge.links = plan.output.length ? [plan.output[index % plan.output.length].id] : []
  return plan
}
function offlinePlan(profile, personal, personalDocument = 'CLAUDE') {
  const text = `${profile}\n${personal}`.toLowerCase(); const refs = [...evidenceSections(profile, personal, personalDocument).keys()]; const matched = defs.filter(def => has(text, def.terms));
  const raw = []; const wiki = []; const output = []
  for (const def of matched) { for (const [id, purpose] of def.raw) raw.push(item(id, purpose, refs, [`${id}-source.md`])); for (const [id, purpose] of def.wiki) wiki.push(item(id, purpose, refs, [`${id}-overview.md`])); for (const [id, purpose] of def.output) output.push(item(id, purpose, refs, [`${id}-brief.md`])) }
  for (const [id, terms] of sourceSignals) if (has(text, terms)) raw.push(item(id, `${label(id)} 형태의 원본을 불변으로 보관`, refs, [`${id}-source.md`]))
  for (const [id, terms] of outputSignals) if (has(text, terms)) output.push(item(id, `${label(id)} 결과물을 Wiki 근거에서 작성`, refs, [`${id}-draft.md`]))
  const unique = values => [...new Map(values.map(value => [value.id, value])).values()]
  const plan = { raw: unique(raw), wiki: unique(wiki), output: unique(output) }
  if (!plan.raw.length || !plan.wiki.length || !plan.output.length) return { plan: null, clarification: '수집할 원본 유형, 축적할 지식 영역, 만들 결과물 유형을 각각 한 가지씩 알려주세요.' }
  return { plan: linkPlan(plan), clarification: null }
}
const providerSchema = { type: 'object', additionalProperties: false, required: ['raw', 'wiki', 'output'], properties: Object.fromEntries(['raw', 'wiki', 'output'].map(layer => [layer, { type: 'array', minItems: 1, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['id', 'label', 'purpose', 'evidence', 'links'], properties: { id: { type: 'string' }, label: { type: 'string' }, purpose: { type: 'string' }, evidence: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['ref', 'span'], properties: { ref: { type: 'string' }, span: { type: 'string' } } }, minItems: 1, maxItems: 3 }, links: { type: 'array', items: { type: 'string' }, maxItems: 6 } } } }])) }
function validateProviderPlan(value, sections) {
  const result = {}
  for (const layer of ['raw', 'wiki', 'output']) {
    if (!Array.isArray(value?.[layer]) || !value[layer].length) fail('제공자 구조가 불완전합니다.', 'malformed-response')
    result[layer] = value[layer].map(candidate => {
      const id = safeId(candidate.id); const spans = (Array.isArray(candidate.evidence) ? candidate.evidence : []).map(item => ({ ref: clean(item?.ref, 80), span: clean(item?.span, 160) })).filter(item => item.span.length >= 4 && sections.get(item.ref)?.includes(item.span))
      const evidence = [...new Set(spans.map(item => item.ref))]
      const candidateLabel = clean(candidate.label, 60); const purpose = clean(candidate.purpose, 120)
      const labelTerms = terms(candidateLabel); const purposeTerms = terms(purpose)
      const grounded = spans.some(item => { const spanTerms = new Set([...labelTerms, ...purposeTerms].filter(term => item.span.toLowerCase().includes(term))); return labelTerms.some(term => spanTerms.has(term)) && purposeTerms.some(term => spanTerms.has(term)) && spanTerms.size >= 2 })
      const copied = [...sections.values()].some(section => (candidateLabel.length >= 20 && section.includes(candidateLabel)) || (purpose.length >= 12 && section.includes(purpose)))
      if (!candidateLabel || !purpose || !evidence.length || !grounded || copied) fail('제공자 근거가 유효하지 않습니다.', 'malformed-response')
      return { id, label: candidateLabel, purpose, evidence, examples: [`${id}-example.md`], links: (Array.isArray(candidate.links) ? candidate.links : []).map(safeId) }
    })
    if (new Set(result[layer].map(item => item.id)).size !== result[layer].length) fail('제공자 폴더 ID가 중복됩니다.', 'malformed-response')
  }
  const validTargets = { raw: new Set(result.wiki.map(item => item.id)), wiki: new Set(result.output.map(item => item.id)), output: new Set() }
  for (const layer of ['raw', 'wiki', 'output']) for (const candidate of result[layer]) if (candidate.links.some(link => !validTargets[layer].has(link))) fail('제공자 mapping link가 유효하지 않습니다.', 'malformed-response')
  return result
}
async function proposedPlan(profile, personal, personalDocument, principles, options) {
  const local = offlinePlan(profile, personal, personalDocument)
  if (!options.providerApproved) return { ...local, mode: 'offline-conservative', providerStatus: 'not-consented' }
  if (!options.providerConfig?.apiKey && !options.responsesClient) return { ...local, mode: 'offline-conservative', providerStatus: 'not-configured' }
  try {
    const client = options.responsesClient || new (await import('openai')).default({ apiKey: options.providerConfig.apiKey })
    const sections = evidenceSections(profile, personal, personalDocument); const refs = [...sections.keys()]; const response = await client.responses.create({ model: options.providerConfig?.model || 'gpt-5.6-terra', store: false, ...(options.providerConfig?.reasoningEffort ? { reasoning: { effort: options.providerConfig.reasoningEffort } } : {}), instructions: 'Return only JSON. Design a conservative personal LLM Wiki map. Use lowercase ASCII directory ids. For every folder item give a bounded exact evidence span (4-160 chars) and its section ref; the label and purpose must each use terms in that span. Do not infer unsupported folders. Evidence spans validate the response and will never be persisted.', input: `LLM Wiki operating principles:\n${principles}\n\nAllowed evidence references: ${refs.join(', ')}\nApproved PROFILE and ${personalDocument} (consent obtained):\n${profile}\n\n${personal}`, text: { format: { type: 'json_schema', name: 'personal_wiki_map', strict: true, schema: providerSchema } } })
    const plan = validateProviderPlan(JSON.parse(response.output_text || '{}'), sections); return { plan, clarification: null, mode: 'llm-suggestion', providerStatus: 'used' }
  } catch (error) { return { ...local, mode: 'offline-conservative', providerStatus: error.code === 'malformed-response' ? 'malformed-response' : 'unavailable' } }
}
function removeLegacyRules(context) { const start = context.indexOf(managedStart); const end = context.indexOf(managedEnd); if (start < 0 && end < 0) return context; if (start < 0 || end < start || context.indexOf(managedStart, start + managedStart.length) >= 0 || context.indexOf(managedEnd, end + managedEnd.length) >= 0) fail('기존 Wiki 운영 규칙 block이 하나의 완전한 marker 쌍이 아닙니다.', 'migration-required'); return `${context.slice(0, start)}${context.slice(end + managedEnd.length)}` }
function operationsBlock(plan) { return `${managedStart}\n\n## Personal LLM Wiki operations\n\n- raw/ is immutable source of truth; read raw/CLAUDE.md before ingest.\n- Ingest compiles one source into linked wiki pages, updates wiki/index.md, and appends wiki/log.md.\n- Query reads wiki/index.md first and writes a durable result only with approval.\n- Lint identifies contradictions, staleness, orphaned pages, missing links, and knowledge gaps.\n- Read the scoped CLAUDE.md before operating each layer; label facts, personal opinions, hypotheses, and AI inferences.\n- Never create harnesses/, *.SKILL.md, WIKI_INDEX.md, or ACTIVITY_LOG.md in this personal Wiki.\n\nCurrent selected areas: raw(${plan.raw.map(x => x.id).join(', ')}), wiki(${plan.wiki.map(x => x.id).join(', ')}), output(${plan.output.map(x => x.id).join(', ')}).\n\n${managedEnd}\n` }
function claudeWithRules(claude, plan) { const start = claude.indexOf(managedStart); const end = claude.indexOf(managedEnd); if (start < 0 && end < 0) return `${claude}${claude.endsWith('\n') ? '\n' : '\n\n'}${operationsBlock(plan)}`; if (start < 0 || end < start || claude.indexOf(managedStart, start + managedStart.length) >= 0 || claude.indexOf(managedEnd, end + managedEnd.length) >= 0) fail('기존 Wiki 운영 규칙 block이 하나의 완전한 marker 쌍이 아닙니다.', 'migration-required'); return `${claude.slice(0, start)}${operationsBlock(plan)}${claude.slice(end + managedEnd.length)}` }
function bootstrapClaude(context, plan) { const personal = `# Personal AI Context\n\n> Compatibility bootstrap from legacy CONTEXT.md. PROFILE.md and this CLAUDE.md are canonical going forward; the legacy CONTEXT.md remains unchanged.\n\n## 나는 누구인가\n\n- Refer to PROFILE.md and the preserved compatibility projection below.\n\n## 나의 역할들\n\n- Refer to PROFILE.md and the preserved compatibility projection below.\n\n## 나의 비전과 목표\n\n- Refer to PROFILE.md and the preserved compatibility projection below.\n\n## AI에게 기대하는 것\n\n- Refer to PROFILE.md and the preserved compatibility projection below.\n\n## 작업 규칙\n\n- Preserve scope boundaries and seek approval before writes.\n\n## Legacy compatibility projection\n\n${context}`; return `${personal}${personal.endsWith('\n') ? '\n' : '\n\n'}${operationsBlock(plan)}` }
function folderClaude(layer, entries) { const mutability = layer === 'raw' ? 'Raw sources are immutable: read only; never edit, move, or rename them.' : layer === 'wiki' ? 'The LLM maintains linked compiled knowledge with source links and clear fact/opinion/hypothesis/inference labels.' : 'Outputs cite their Wiki basis and remain local working artifacts.'; return `# ${layer}/ CLAUDE.md — Personal LLM Wiki layer contract\n\n${mutability}\n\n## Selected areas\n\n${entries.map(entry => `- \`${entry.id}/\`: ${entry.purpose}`).join('\n')}\n\nDo not ingest CLAUDE.md or .gitkeep as source content.\n` }
function renderedFiles(memberId, plan, rootClaude, compatibilityBootstrap = false) {
  const base = `members/${memberId}`; const files = {}
  files[`${base}/CLAUDE.md`] = compatibilityBootstrap ? bootstrapClaude(rootClaude, plan) : claudeWithRules(rootClaude, plan)
  files[`${base}/WIKI_SCHEMA.md`] = `# Personal LLM Wiki Schema\n\nMachine-readable companion to CLAUDE.md; avoid duplicating operating prose.\n\n## Exact tree\n\n${['raw', 'wiki', 'output'].map(layer => `- \`${layer}/\`: ${plan[layer].map(item => `\`${item.id}/\` (${item.label})`).join(', ')}`).join('\n')}\n\n## Information flow\n\n${plan.raw.map((source, index) => { const wikiId = source.links?.[0] || plan.wiki[index % plan.wiki.length].id; const wikiEntry = plan.wiki.find(item => item.id === wikiId) || plan.wiki[0]; const outputId = wikiEntry.links?.[0] || plan.output[index % plan.output.length].id; return `- \`raw/${source.id}/\` → \`wiki/${wikiId}/\` → \`output/${outputId}/\`; evidence: ${source.evidence.join(', ')}.` }).join('\n')}\n`
  for (const layer of ['raw', 'wiki', 'output']) { files[`${base}/${layer}/CLAUDE.md`] = folderClaude(layer, plan[layer]); for (const entry of plan[layer]) files[`${base}/${layer}/${entry.id}/.gitkeep`] = '' }
  files[`${base}/wiki/index.md`] = `# Wiki index\n\nThis compiled Wiki starts without ingested sources.\n\n## Knowledge areas\n\n${plan.wiki.map(item => `- [${item.label}](./${item.id}/) — ${item.purpose}`).join('\n')}\n\n## Initial tracking\n\n${plan.wiki.map(item => `- ${item.label}: planned from ${item.evidence.join(', ')}; no source ingested yet.`).join('\n')}\n`
  files[`${base}/wiki/log.md`] = `# Wiki log\n\n## [initialization] init | personalized LLM Wiki\n\n- Created evidence-backed raw → wiki → output structure.\n- No source has been ingested.\n- Future ingest/query/lint events append here.\n`
  return files
}
async function migration(repoRoot, memberId, candidateFiles = [], { rootClaude = null, legacyContext = null, compatibilityBootstrap = false } = {}) {
  const { target } = await safeExistingMember(repoRoot, memberId); const entries = await (await import('node:fs/promises')).readdir(target)
  const structural = entries.filter(name => !['PROFILE.md', 'CONTEXT.md', 'CLAUDE.md'].includes(name)); const hasManagedRules = Boolean(rootClaude && (rootClaude.includes(managedStart) || rootClaude.includes(managedEnd)))
  if (hasManagedRules) removeLegacyRules(rootClaude)
  const actions = new Map()
  const legacyUnmanaged = new Set(['WIKI_INDEX.md', 'ACTIVITY_LOG.md', 'harnesses'])
  for (const name of structural) { const item = join(target, name); const stat = await lstat(item); actions.set(name, { action: 'keep', path: name, ...(legacyUnmanaged.has(name) ? { classification: 'legacy-unmanaged' } : {}), ...(stat.isFile() ? { originalHash: contentDigest(await readFile(item)) } : {}) }) }
  if (compatibilityBootstrap) actions.set('CONTEXT.md', { action: 'keep', path: 'CONTEXT.md', classification: 'legacy-context-bootstrap', originalHash: contentDigest(legacyContext) })
  const replaceable = new Set([`members/${memberId}/CLAUDE.md`, `members/${memberId}/WIKI_SCHEMA.md`, `members/${memberId}/wiki/index.md`, `members/${memberId}/raw/CLAUDE.md`, `members/${memberId}/wiki/CLAUDE.md`, `members/${memberId}/output/CLAUDE.md`])
  for (const file of candidateFiles) {
    const relativePath = file.path.replace(`members/${memberId}/`, ''); const destination = join(target, relativePath)
    if (await exists(destination)) {
      const stat = await lstat(destination)
      if (replaceable.has(file.path) && stat.isFile()) actions.set(relativePath, { action: 'replace', path: relativePath, originalHash: contentDigest(await readFile(destination)) })
      else actions.set(relativePath, { action: 'keep', path: relativePath, ...(stat.isFile() ? { originalHash: contentDigest(await readFile(destination)) } : {}) })
    } else actions.set(relativePath, { action: 'add', path: relativePath })
  }
  return { required: compatibilityBootstrap || structural.length > 0 || hasManagedRules, kind: compatibilityBootstrap ? 'legacy-context-bootstrap' : hasManagedRules ? 'managed-rules-update' : structural.length ? 'existing-structure' : 'fresh-rules-append', actions: [...actions.values()].sort((a, b) => a.path.localeCompare(b.path)) }
}
export async function startPersonalWikiInit(input = {}, options = {}) {
  const memberId = safeMemberId(input.memberId); const inputs = await readInputs(options.repoRoot, memberId)
  if (inputs.inputMissing) return { state: { version: 1, phase: 'insufficient-context', memberId, profileDigest: inputs.profileDigest }, events: [event('session.started', { command: 'personal-wiki-init', memberId }), event('clarification.required', { question: 'canonical CLAUDE.md 또는 legacy CONTEXT.md가 필요합니다.', count: 0, maximum: 0 }), event('session.completed', { phase: 'insufficient-context' })], result: { status: 'insufficient-context', mode: 'offline-conservative', providerStatus: 'not-consented' } }
  const { profile, primary, primaryKind, compatibilityBootstrap, principles, profileDigest, primaryDigest, legacyContextDigest } = inputs; const proposed = await proposedPlan(profile, primary, primaryKind === 'CLAUDE' ? 'CLAUDE' : 'CONTEXT', principles, { ...options, providerApproved: input.providerApproved === true })
  if (!proposed.plan) { const state = { version: 1, phase: 'clarification', memberId, profile, rootClaude: primary, primaryKind, compatibilityBootstrap, profileDigest, primaryDigest, legacyContextDigest, providerApproved: input.providerApproved === true, clarificationCount: 0 }; return { state, events: [event('session.started', { command: 'personal-wiki-init', memberId }), event('provider.consent', { enabled: input.providerApproved === true }), event('clarification.required', { question: proposed.clarification, count: 1, maximum: 1 }), event('session.completed', { phase: 'insufficient-context' })], result: { status: 'insufficient-context', mode: proposed.mode, providerStatus: proposed.providerStatus } }
  }
  const candidate = renderedFiles(memberId, proposed.plan, primary, compatibilityBootstrap); const existing = await migration(options.repoRoot, memberId, Object.entries(candidate).map(([path, content]) => ({ path, content })), { rootClaude: compatibilityBootstrap ? null : primary, legacyContext: compatibilityBootstrap ? primary : null, compatibilityBootstrap }); const state = { version: 1, phase: 'preview', memberId, rootClaude: primary, primaryKind, compatibilityBootstrap, profileDigest, primaryDigest, legacyContextDigest, plan: proposed.plan, mode: proposed.mode, providerStatus: proposed.providerStatus, migration: existing }; const preview = previewPersonalWikiInit(state)
  return { state, events: [event('session.started', { command: 'personal-wiki-init', memberId }), event('provider.consent', { enabled: input.providerApproved === true }), event('map.proposed', { map: mapSummary(proposed.plan), mode: proposed.mode }), ...(existing.required ? [event('migration.required', { actions: existing.actions })] : []), event('files.planned', { files: preview.files.map(file => file.path), digest: preview.digest }), event('approval.required', { digest: preview.digest, reason: existing.required ? '기존 구조가 있어 migration 승인도 필요합니다.' : '미리보기와 digest를 확인한 뒤 명시적으로 승인해야 저장할 수 있습니다.' })], result: { preview, migration: existing, mode: proposed.mode, providerStatus: proposed.providerStatus } }
}
function mapSummary(plan) { return Object.fromEntries(['raw', 'wiki', 'output'].map(layer => [layer, plan[layer].map(item => ({ id: item.id, label: item.label, purpose: item.purpose, evidence: item.evidence, examples: item.examples, links: item.links || [], flow: layer === 'raw' ? 'immutable source' : layer === 'wiki' ? 'compiled knowledge' : 'evidence-grounded result' }))])) }
export function previewPersonalWikiInit(state) { if (!state || state.version !== 1 || state.phase !== 'preview') fail('초기화 preview 세션이 필요합니다.', 'invalid-session'); const files = renderedFiles(state.memberId, state.plan, state.rootClaude, state.compatibilityBootstrap); const keep = new Set((state.migration?.actions || []).filter(item => item.action === 'keep').map(item => `members/${state.memberId}/${item.path}`)); for (const path of keep) delete files[path]; return { kind: 'personal-wiki-init', mode: state.mode, migration: state.migration, profileDigest: state.profileDigest, primaryDigest: state.primaryDigest, primaryKind: state.primaryKind, legacyContextDigest: state.legacyContextDigest, plan: state.plan, files: Object.entries(files).map(([path, content]) => ({ path, content })), digest: digest({ files, mode: state.mode, migration: state.migration, profileDigest: state.profileDigest, primaryDigest: state.primaryDigest, primaryKind: state.primaryKind, legacyContextDigest: state.legacyContextDigest }) } }
async function atomicSave(preview, repoRoot) {
  const memberId = preview.files[0]?.path.match(/^members\/([^/]+)\//)?.[1]; const { root, target } = await safeExistingMember(repoRoot, memberId); const stage = resolve(root, `.personal-wiki-init-${randomUUID()}`); const created = []; const createdDirs = []; const replaced = []; const backupFiles = []
  const actions = new Map((preview.migration?.actions || []).map(action => [action.path, action])); const backupRoot = join(target, '.wiki-migration-backup', preview.digest)
  const ensureTargetDirectory = async path => { const missing = []; let current = path; while (current !== target && !(await exists(current))) { missing.push(current); current = dirname(current) }; if (current !== target && current !== dirname(target)) { const stat = await lstat(current); if (stat.isSymbolicLink() || !stat.isDirectory()) fail('안전하지 않은 대상 디렉터리입니다.', 'unsafe-path') }; for (const directory of missing.reverse()) { await mkdir(directory); createdDirs.push(directory) } }
  try {
    if (contentDigest(await readFile(join(target, 'PROFILE.md'), 'utf8')) !== preview.profileDigest) fail('PROFILE.md가 preview 뒤 변경되었습니다.', 'preview-mismatch')
    if (preview.primaryKind === 'CLAUDE' && (!(await exists(join(target, 'CLAUDE.md'))) || contentDigest(await readFile(join(target, 'CLAUDE.md'), 'utf8')) !== preview.primaryDigest)) fail('CLAUDE.md가 preview 뒤 변경되었습니다.', 'preview-mismatch')
    if (preview.primaryKind === 'CONTEXT-compatibility' && (!(await exists(join(target, 'CONTEXT.md'))) || contentDigest(await readFile(join(target, 'CONTEXT.md'), 'utf8')) !== preview.primaryDigest)) fail('legacy CONTEXT.md가 preview 뒤 변경되었습니다.', 'preview-mismatch')
    for (const file of preview.files) {
      const relativePath = file.path.replace(`members/${memberId}/`, ''); const destination = resolve(root, file.path); const action = actions.get(relativePath) || { action: 'add' }
      if (!destination.startsWith(`${target}${sep}`)) fail('허용되지 않은 저장 경로입니다.', 'unsafe-path')
      if (action.action === 'add' && await exists(destination)) fail('기존 파일을 덮어쓰지 않습니다.', 'collision', 409)
      if (action.action === 'replace') { if (!(await exists(destination)) || !(await lstat(destination)).isFile() || (action.originalHash && contentDigest(await readFile(destination)) !== action.originalHash)) fail('migration 원본이 preview 뒤 변경되었습니다.', 'preview-mismatch') }
    }
    for (const action of actions.values()) if (action.originalHash) { const file = join(target, action.path); if (!(await exists(file)) || contentDigest(await readFile(file)) !== action.originalHash) fail('migration 원본이 preview 뒤 변경되었습니다.', 'preview-mismatch') }
    await mkdir(stage, { recursive: true })
    for (const file of preview.files) { const staged = resolve(stage, file.path); if (!staged.startsWith(`${stage}${sep}`)) fail('허용되지 않은 저장 경로입니다.', 'unsafe-path'); await mkdir(dirname(staged), { recursive: true }); await writeFile(staged, file.content, { encoding: 'utf8', flag: 'wx' }) }
    for (const file of preview.files) {
      const relativePath = file.path.replace(`members/${memberId}/`, ''); const action = actions.get(relativePath) || { action: 'add' }; if (action.action === 'replace') continue
      const from = resolve(stage, file.path); const to = resolve(root, file.path); await ensureTargetDirectory(dirname(to)); await rename(from, to); created.push(to)
    }
    for (const file of preview.files) {
      const relativePath = file.path.replace(`members/${memberId}/`, ''); const action = actions.get(relativePath) || { action: 'add' }; if (action.action !== 'replace') continue
      const to = resolve(root, file.path); const original = await readFile(to); if (preview.migration?.required) { const backupFile = join(backupRoot, relativePath); await ensureTargetDirectory(dirname(backupFile)); await writeFile(backupFile, original, { flag: 'wx' }); backupFiles.push(backupFile) }
      const swapped = resolve(stage, `.original-${replaced.length}`); await rename(to, swapped); replaced.push({ to, swapped }); await rename(resolve(stage, file.path), to); created.push(to)
    }
  } catch (error) {
    await Promise.all(created.map(file => rm(file, { force: true })))
    for (const item of replaced.reverse()) if (await exists(item.swapped)) await rename(item.swapped, item.to).catch(() => {})
    await Promise.all(backupFiles.map(file => rm(file, { force: true })))
    for (const directory of createdDirs.reverse()) await rmdir(directory).catch(() => {})
    throw error
  } finally { await rm(stage, { recursive: true, force: true }).catch(() => {}) }
}
export async function advancePersonalWikiInit(state, input = {}, options = {}) {
  if (!state || state.version !== 1) fail('초기화 세션을 먼저 시작해 주세요.', 'invalid-session')
  if (state.phase === 'clarification') {
    if (input.action !== 'clarification' || state.clarificationCount >= 1 || !clean(input.answer, 400)) fail('한 번의 범위 있는 clarification 답변이 필요합니다.', 'insufficient-context')
    const combined = `${state.rootClaude}\n## Wiki initialization clarification\n- ${clean(input.answer, 400)}`; const proposed = offlinePlan(state.profile, combined, state.primaryKind === 'CLAUDE' ? 'CLAUDE' : 'CONTEXT')
    if (!proposed.plan) return { state: { ...state, clarificationCount: 1 }, events: [event('clarification.insufficient')], result: { status: 'insufficient-context' } }
    const candidate = renderedFiles(state.memberId, proposed.plan, state.rootClaude, state.compatibilityBootstrap); const existing = await migration(options.repoRoot, state.memberId, Object.entries(candidate).map(([path, content]) => ({ path, content })), { rootClaude: state.compatibilityBootstrap ? null : state.rootClaude, legacyContext: state.compatibilityBootstrap ? state.rootClaude : null, compatibilityBootstrap: state.compatibilityBootstrap }); const next = { version: 1, phase: 'preview', memberId: state.memberId, rootClaude: state.rootClaude, primaryKind: state.primaryKind, compatibilityBootstrap: state.compatibilityBootstrap, profileDigest: state.profileDigest, primaryDigest: state.primaryDigest, legacyContextDigest: state.legacyContextDigest, plan: proposed.plan, mode: 'offline-conservative', providerStatus: 'not-consented', migration: existing }; const preview = previewPersonalWikiInit(next)
    return { state: next, events: [event('map.proposed', { map: mapSummary(next.plan), mode: next.mode }), event('files.planned', { files: preview.files.map(file => file.path), digest: preview.digest }), event('approval.required', { digest: preview.digest })], result: { preview, migration: existing } }
  }
  if (state.phase !== 'preview') fail('이미 완료된 세션입니다.', 'session-complete')
  const preview = previewPersonalWikiInit(state)
  if (input.action === 'preview') return { state, events: [event('files.planned', { files: preview.files.map(file => file.path), digest: preview.digest }), event('approval.required', { digest: preview.digest })], result: { preview } }
  if (input.action === 'approve') { if (input.expectedDigest !== preview.digest) fail('미리보기 digest가 일치하지 않습니다.', 'preview-mismatch'); if (state.migration.required && input.migrationApproved !== true) fail('기존 구조의 migration을 별도로 승인해 주세요.', 'migration-approval-required'); return { state: { ...state, phase: 'approved', approvedDigest: preview.digest }, events: [event('approval.granted', { digest: preview.digest })] } }
  fail('저장 전에 preview digest를 승인해 주세요.', 'approval-required')
}
export async function savePersonalWikiInit(state, input = {}, options = {}) {
  if (!state || state.phase !== 'approved' || input.action !== 'save') fail('승인된 초기화 세션이 필요합니다.', 'approval-required'); if (input.expectedDigest !== state.approvedDigest) fail('승인한 digest와 저장 요청이 일치하지 않습니다.', 'preview-mismatch')
  const preview = previewPersonalWikiInit({ ...state, phase: 'preview' }); await atomicSave(preview, options.repoRoot); return { state: { ...state, phase: 'saved' }, events: [event('files.written', { files: preview.files.map(file => file.path) }), event('session.completed', { phase: 'saved' })], result: { files: preview.files.map(file => file.path) } }
}
