import { access, link, lstat, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join, relative, resolve, sep } from 'node:path'

const memberIdPattern = /^(?!con$|prn$|aux$|nul$|com[1-9]$|lpt[1-9]$)[a-z0-9][a-z0-9-]{0,62}$/
const approvedSeedFiles = ['나의 핵심 맥락.md', 'my-core-context.md']
const maxSeedBytes = 12000
const questions = [
  { id: 'identity', topic: '나는 누구인가', question: '조금 더 깊이 당신은 누구인가요? 현재 맡은 역할, 강점, 중요하게 여기는 가치에 대해 들려주세요.' },
  { id: 'recording', topic: '기록하려는 이유', question: '왜 지금 기록을 남기고 싶나요? 현재 잘되지 않는 점과 바라는 모습을 들려주세요.' },
  { id: 'outputs', topic: '원하는 결과물', question: '어떤 결과물을 원하나요? 읽을 사람, 원하는 형식, 1년 뒤의 이상적인 상태를 들려주세요.' },
]
const seedFocuses = [
  { terms: ['연구', '탐구', '실험'], label: '연구·탐구' },
  { terms: ['제품', '기획', '서비스'], label: '제품·기획' },
  { terms: ['기록', '지식', 'wiki', '위키'], label: '기록·지식 관리' },
  { terms: ['학습', '교육', '공부'], label: '학습·교육' },
]
const fieldMaps = {
  identity: { roles: [['제품 기획', '제품 기획'], ['기획자', '기획자'], ['연구자', '연구자'], ['개발자', '개발자'], ['디자이너', '디자이너']], strengths: [['구조화', '구조화'], ['분석', '분석'], ['연결', '연결'], ['글쓰기', '글쓰기']], values: [['정직', '정직함'], ['투명', '투명성'], ['협업', '협업'], ['성장', '성장']] },
  recording: { gaps: [['흩어진', '정보가 흩어짐'], ['메모', '메모의 연결 부족'], ['근거', '판단 근거 추적의 어려움']], vision: [['연결', '연결된 기록'], ['재사용', '재사용 가능한 지식'], ['정리', '지속 가능한 정리']] },
  outputs: { audiences: [['동료', '동료'], ['팀', '팀'], ['고객', '고객'], ['나 자신', '본인']], formats: [['markdown', 'Markdown'], ['마크다운', 'Markdown'], ['보고서', '보고서'], ['문서', '문서']], oneYearState: [['1년', '1년 뒤에도 재사용 가능한 상태'], ['재사용', '재사용 가능한 상태'], ['지도', '지식 지도를 갖춘 상태']], aiExpectations: [['조사', '조사 지원'], ['분석', '분석 지원'], ['검증', '검증 지원']], workRules: [['근거', '근거를 남긴다'], ['확인', '확인 후 진행한다'], ['승인', '승인 후 저장한다']] },
}
const providerFields = {
  identity: ['roles', 'strengths', 'values'],
  recording: ['gaps', 'vision'],
  outputs: ['audiences', 'formats', 'oneYearState', 'aiExpectations', 'workRules'],
}

const exists = path => access(path).then(() => true).catch(() => false)
const clean = (value, max = 4000) => typeof value === 'string' ? value.replace(/\u0000/g, '').replace(/\r\n/g, '\n').trim().slice(0, max) : ''
const fail = (message, code, status = 400) => { throw Object.assign(new Error(message), { code, status }) }
const safeMemberId = value => {
  const memberId = clean(value, 64)
  if (!memberIdPattern.test(memberId)) fail('member-id는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.', 'invalid-member-id')
  return memberId
}
const memberPath = (repoRoot, memberId) => {
  const root = resolve(repoRoot)
  const members = resolve(root, 'members')
  const target = resolve(members, safeMemberId(memberId))
  if (!target.startsWith(`${members}${sep}`)) fail('선택한 member 공간 밖에는 접근할 수 없습니다.', 'unsafe-path')
  return target
}
const pathInMember = (memberRoot, path) => {
  const target = resolve(memberRoot, path)
  if (!target.startsWith(`${memberRoot}${sep}`)) fail('선택한 member 공간 밖에는 접근할 수 없습니다.', 'unsafe-path')
  return target
}
const ensureMembersDirectory = async (repoRoot, { create = false } = {}) => {
  const members = resolve(repoRoot, 'members')
  if (await exists(members)) {
    if ((await lstat(members)).isSymbolicLink()) fail('members 디렉터리는 저장소 밖을 가리킬 수 없습니다.', 'unsafe-path')
    return members
  }
  if (!create) return members
  await mkdir(members, { recursive: true })
  if ((await lstat(members)).isSymbolicLink()) fail('members 디렉터리는 저장소 밖을 가리킬 수 없습니다.', 'unsafe-path')
  return members
}
const ensureExistingMemberScope = async (repoRoot, memberId, options) => {
  const root = memberPath(repoRoot, memberId)
  const members = await ensureMembersDirectory(repoRoot, options)
  if (!(await exists(root))) return root
  const actualMembers = await realpath(members)
  const actualRoot = await realpath(root)
  if (actualRoot !== resolve(actualMembers, memberId)) fail('선택한 member 공간 밖에는 접근할 수 없습니다.', 'unsafe-path')
  return root
}
const digest = files => createHash('sha256').update(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => `${path}\n${content}`).join('\n')).digest('hex')
const session = (phase, data = {}) => ({ version: 1, ...data, phase })
const event = (type, data = {}) => ({ type, at: 'session', ...data })
const matches = (text, pairs = []) => [...new Set(pairs.filter(([term]) => text.toLowerCase().includes(term.toLowerCase())).map(([, label]) => label))]
const seedFocus = content => seedFocuses.find(item => item.terms.some(term => content.toLowerCase().includes(term.toLowerCase())))?.label || ''
const topicSummary = (topic, fields) => {
  const values = Object.values(fields).flatMap(value => Array.isArray(value) ? value : value ? [value] : [])
  return values.length ? `${topic}: ${values.join(', ')}` : `${topic}에 관한 공유 가능한 구조화 항목은 아직 확인되지 않았습니다.`
}
const localTopicInterpretation = (question, answer, seed) => {
  const map = fieldMaps[question.id]
  const fields = Object.fromEntries(Object.entries(map).map(([key, pairs]) => [key, matches(answer, pairs)]))
  for (const key of ['vision', 'oneYearState']) if (Array.isArray(fields[key])) fields[key] = fields[key][0] || ''
  return { mode: 'local-draft', topic: question.topic, fields, summary: topicSummary(question.topic, fields), seedFocus: seed?.focus || '' }
}
const evidenceItemSchema = { type: 'object', additionalProperties: false, required: ['value', 'evidence'], properties: { value: { type: 'string' }, evidence: { type: 'string' } } }
const topicSchema = { type: 'object', additionalProperties: false, required: ['roles', 'strengths', 'values', 'gaps', 'vision', 'audiences', 'formats', 'oneYearState', 'aiExpectations', 'workRules'], properties: Object.fromEntries(Object.values(providerFields).flat().map(key => [key, { type: 'array', items: evidenceItemSchema }])) }
const normalized = value => clean(value, 4000).replace(/\s+/g, ' ')
const evidenceBacked = (item, source) => {
  const value = clean(item?.value, 64)
  const evidence = clean(item?.evidence, 160)
  const normalizedValue = normalized(value); const normalizedEvidence = normalized(evidence)
  if (!normalizedValue || !normalizedEvidence || normalizedEvidence.length < 2 || !source.includes(normalizedEvidence)) return ''
  if (!normalizedEvidence.includes(normalizedValue) && !normalizedValue.includes(normalizedEvidence)) return ''
  if (/[\r\n.!?]/.test(value) || normalizedValue.length > 32) return ''
  if (normalizedValue === normalizedEvidence && normalizedEvidence.length > 20) return ''
  if (normalizedValue.length > 16 && source.includes(normalizedValue)) return ''
  return value
}
const sanitizedProviderTopic = (question, candidate, seed) => {
  const fields = {}
  const source = normalized([candidate?.__answer || '', seed?.content || ''].join('\n'))
  for (const key of providerFields[question.id]) fields[key] = (Array.isArray(candidate?.[key]) ? candidate[key] : []).map(item => evidenceBacked(item, source)).filter(Boolean).slice(0, 5)
  const summary = topicSummary(question.topic, fields)
  return { mode: 'llm-suggestion', topic: question.topic, fields, summary, seedFocus: seed?.focus || '' }
}

async function interpretTopic(question, answer, seed, options) {
  const fallback = localTopicInterpretation(question, answer, seed)
  try {
    if (!options?.providerAllowed) return fallback
    if (typeof options?.profileInterpreter === 'function') return sanitizedProviderTopic(question, { ...await options.profileInterpreter({ question: question.id, answer, seed: seed?.content || '' }), __answer: answer }, seed)
    if (!options?.responsesClient && !options?.providerConfig?.apiKey) return fallback
    const client = options.responsesClient || new (await import('openai')).default({ apiKey: options.providerConfig.apiKey })
    const response = await client.responses.create({ model: options.providerConfig?.model || 'gpt-5.6-terra', store: false, ...(options.providerConfig?.reasoningEffort ? { reasoning: { effort: options.providerConfig.reasoningEffort } } : {}), instructions: 'Return only strict Korean JSON. For the current topic only, provide at most five generic structured items per allowed field. Every item needs a short normalized value and exact source evidence. Evidence is validation-only and will never be saved. Do not quote full sentences, do not put evidence in value, do not infer facts, and leave unsupported fields empty.', input: `Topic: ${question.topic}\nApproved private seed (bounded; provider consent obtained): ${seed?.content || '(none)'}\nCurrent answer (provider consent obtained): ${answer}`, text: { format: { type: 'json_schema', name: 'profile_topic_summary', strict: true, schema: topicSchema } } })
    const output = typeof response.output_text === 'string' ? response.output_text : ''
    return sanitizedProviderTopic(question, { ...JSON.parse(output), __answer: answer }, seed)
  } catch { return fallback }
}

export const profileQuestions = questions.map(({ id, topic, question }) => ({ id, topic, question }))

async function loadApprovedSeed(repoRoot, memberId) {
  const root = await ensureExistingMemberScope(repoRoot, memberId)
  for (const file of approvedSeedFiles) {
    for (const candidate of [file, join('vault', file)]) {
      const target = pathInMember(root, candidate)
      if (await exists(target)) {
        const metadata = await stat(target)
        if (!metadata.isFile()) fail('허용된 seed 이름은 일반 파일이어야 합니다.', 'invalid-seed')
        if (metadata.size > maxSeedBytes) fail('승인된 seed 파일이 안전한 해석 한도를 초과합니다.', 'seed-too-large')
        const actualRoot = await realpath(root)
        const actualTarget = await realpath(target)
        if (!actualTarget.startsWith(`${actualRoot}${sep}`)) fail('승인된 seed가 선택한 member 공간을 벗어납니다.', 'unsafe-path')
        const content = await readFile(target, 'utf8')
        return { path: relative(resolve(repoRoot), target).split('\\').join('/'), digest: createHash('sha256').update(content).digest('hex'), characters: content.length, focus: seedFocus(content), content }
      }
    }
  }
  return null
}

function requireState(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) fail('온보딩 세션을 먼저 시작해 주세요.', 'invalid-session')
  return value
}
function questionEvent(index, seed, providerAllowed = false) {
  const question = questions[index]
  const tailored = seed?.focus ? ` 승인된 개인 seed의 ${seed.focus} 맥락을 고려해 답해 주세요.` : ''
  return event('question.asked', { id: question.id, topic: question.topic, mode: providerAllowed ? 'llm-suggestion' : 'local-draft', question: `${question.question}${tailored}`, count: index + 1, total: questions.length })
}

export function renderProfileFiles(state) {
  if (state.phase !== 'preview') fail('세 질문을 마친 뒤에만 미리보기를 만들 수 있습니다.', 'preview-unavailable')
  const answers = state.answers
  const identity = answers.find(answer => answer.id === 'identity')?.fields || {}
  const recording = answers.find(answer => answer.id === 'recording')?.fields || {}
  const outputs = answers.find(answer => answer.id === 'outputs')?.fields || {}
  const list = values => Array.isArray(values) ? values.map(value => `- ${value}`).join('\n') : ''
  const first = value => Array.isArray(value) ? value[0] || '' : value || ''
  const vision = first(recording.vision)
  const oneYearState = first(outputs.oneYearState)
  const seedContext = state.seed?.focus ? `- 승인된 seed에서 확인한 일반 맥락: ${state.seed.focus}` : ''
  const summaryMode = answers.some(answer => answer.mode === 'local-draft') ? 'local-draft' : 'llm-suggestion'
  const heading = `# ${state.displayName}의 프로필`
  const profile = `${heading}\n\n> 아래 내용은 원문 답변이나 seed 원문이 아닌, 승인 전 화면으로 확인한 구조화 요약입니다. 해석 모드: ${summaryMode}.\n\n## 나의 맥락 요약\n\n${[seedContext, ...answers.map(answer => `- ${answer.summary}`)].filter(Boolean).join('\n')}\n\n## 사실로 확인된 내용\n\n- 표시 이름: ${state.displayName}\n${seedContext}\n\n## 나의 관점과 선호\n\n### 나는 누구인가\n\n${list(identity.strengths)}\n${list(identity.values)}\n\n### 기록하려는 이유\n\n${list(recording.gaps)}\n${vision ? `- 바라는 모습: ${vision}` : ''}\n\n### 원하는 결과물\n\n${list(outputs.audiences)}\n${list(outputs.formats)}\n${oneYearState ? `- 1년 뒤: ${oneYearState}` : ''}\n\n## 아직 알 수 없는 내용\n\n`
  const context = `# ${state.displayName} Context\n\n> 이 문서는 승인된 PROFILE.md에서 매 실행 시 빠르게 읽기 위한 provider-neutral 요약입니다. 해석 모드: ${summaryMode}. 원문 답변과 seed 원문은 저장하지 않습니다.\n\n## 나는 누구인가\n\n${[...list(identity.strengths).split('\n'), ...list(identity.values).split('\n'), seedContext].filter(Boolean).join('\n')}\n\n## 나의 역할들\n\n${list(identity.roles)}\n\n## 나의 비전과 목표\n\n${[...list(recording.gaps).split('\n'), vision ? `- ${vision}` : '', ...list(outputs.audiences).split('\n'), ...list(outputs.formats).split('\n'), oneYearState ? `- ${oneYearState}` : ''].filter(Boolean).join('\n')}\n\n## AI에게 기대하는 것\n\n${list(outputs.aiExpectations)}\n\n## 작업 규칙\n\n${list(outputs.workRules)}\n`
  const base = `members/${state.memberId}`
  return { [`${base}/PROFILE.md`]: profile, [`${base}/CONTEXT.md`]: context }
}

export function previewProfileOnboarding(state) {
  const files = renderProfileFiles(state)
  return { kind: 'profile-onboarding', files: Object.entries(files).map(([path, content]) => ({ path, content })), digest: digest(files) }
}

export async function startProfileOnboarding({ memberId } = {}, { repoRoot } = {}) {
  await ensureMembersDirectory(repoRoot)
  const id = memberId ? safeMemberId(memberId) : ''
  if (id) memberPath(repoRoot, id)
  const state = session('name', { ...(id ? { memberId: id } : {}), answers: [] })
  return { state, events: [event('session.started', { command: 'profile-onboarding' }), event('question.asked', { id: 'display-name', question: '먼저, 어떻게 불러드리면 될까요? 이름을 알려주세요.' })] }
}

async function savePreview(preview, repoRoot) {
  const root = resolve(repoRoot)
  const memberId = preview.files[0]?.path.match(/^members\/([^/]+)\//)?.[1]
  await ensureExistingMemberScope(root, memberId, { create: true })
  const targets = preview.files.map(file => resolve(root, file.path))
  for (const target of targets) if (!target.startsWith(`${resolve(root, 'members')}${sep}`)) fail('개인 member 공간 밖에는 저장할 수 없습니다.', 'unsafe-path')
  if (await Promise.all(targets.map(exists)).then(values => values.some(Boolean))) fail('기존 PROFILE.md 또는 CONTEXT.md를 덮어쓰지 않았습니다.', 'collision', 409)
  const stage = resolve(root, `.profile-onboarding-${randomUUID()}`)
  const created = []
  try {
    await mkdir(stage, { recursive: true })
    for (const file of preview.files) {
      const staged = resolve(stage, file.path)
      if (!staged.startsWith(`${stage}${sep}`)) fail('허용되지 않은 저장 경로입니다.', 'unsafe-path')
      await mkdir(dirname(staged), { recursive: true })
      await writeFile(staged, file.content, { encoding: 'utf8', flag: 'wx' })
    }
    for (const file of preview.files) {
      const target = resolve(root, file.path)
      if (await exists(target)) fail('기존 PROFILE.md 또는 CONTEXT.md를 덮어쓰지 않았습니다.', 'collision', 409)
      await mkdir(dirname(target), { recursive: true })
      await link(resolve(stage, file.path), target)
      created.push(target)
    }
  } catch (error) {
    await Promise.all(created.map(target => rm(target, { force: true })))
    throw error
  } finally {
    await rm(stage, { recursive: true, force: true }).catch(() => {})
  }
}

export async function advanceProfileOnboarding(current, input = {}, options = {}) {
  const { repoRoot } = options
  const state = requireState(current)
  if (Array.isArray(input.answers)) fail('한 번에 하나의 답변만 받을 수 있습니다.', 'one-answer-at-a-time')
  const action = input.action
  if (state.phase === 'name') {
    if (action !== 'answer') fail('먼저 이름에 답해 주세요.', 'unexpected-action')
    if (input.private === true) fail('비공개 이름은 공유 프로필에 넣지 않습니다. 공유 가능한 이름으로 다시 답해 주세요.', 'private-answer-not-supported')
    const displayName = clean(input.answer, 120)
    if (!displayName) fail('이름을 비워 둘 수 없습니다.', 'invalid-input')
    const derivedId = state.memberId || (memberIdPattern.test(displayName) ? displayName : '')
    if (!derivedId) {
      const next = session('member-id', { ...state, displayName })
      return { state: next, events: [event('answer.received', { id: 'display-name' }), event('question.asked', { id: 'member-id', question: '저장 경로에 사용할 member-id를 알려주세요. 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.' })] }
    }
    const next = session('privacy', { ...state, displayName, memberId: derivedId })
    return { state: next, events: [event('answer.received', { id: 'display-name' }), event('privacy.warning', { message: 'PROFILE.md와 CONTEXT.md는 Git에 커밋되면 저장소 접근자가 읽을 수 있습니다. 공유해도 되는 내용만 답변해 주세요. 외부 AI 제공자에 답변과 승인된 seed 원문을 보내는 것은 기본값이 아니며 providerApproved: true를 별도로 선택할 때만 가능합니다.' }), event('privacy.confirmation.required', { question: '공개 범위를 이해했고, 공유 가능한 내용만 답변하시겠어요?' })] }
  }
  if (state.phase === 'member-id') {
    if (action !== 'answer') fail('저장용 member-id에 답해 주세요.', 'unexpected-action')
    if (input.private === true) fail('비공개 member-id는 공유 프로필에 넣지 않습니다. 공유 가능한 ID로 다시 답해 주세요.', 'private-answer-not-supported')
    const memberId = safeMemberId(input.answer)
    memberPath(repoRoot, memberId)
    const next = session('privacy', { ...state, memberId })
    return { state: next, events: [event('answer.received', { id: 'member-id' }), event('privacy.warning', { message: 'PROFILE.md와 CONTEXT.md는 Git에 커밋되면 저장소 접근자가 읽을 수 있습니다. 공유해도 되는 내용만 답변해 주세요. 외부 AI 제공자에 답변과 승인된 seed 원문을 보내는 것은 기본값이 아니며 providerApproved: true를 별도로 선택할 때만 가능합니다.' }), event('privacy.confirmation.required', { question: '공개 범위를 이해했고, 공유 가능한 내용만 답변하시겠어요?' })] }
  }
  if (state.phase === 'privacy') {
    if (action !== 'privacy' || input.approved !== true) fail('세 질문을 시작하기 전에 공개 범위를 명시적으로 확인해 주세요.', 'privacy-confirmation-required')
    const seed = await loadApprovedSeed(repoRoot, state.memberId)
    const next = session('question', { ...state, seed, providerAllowed: input.providerApproved === true, questionIndex: 0 })
    const seedEvent = seed ? event('seed.loaded', { path: seed.path, digest: seed.digest, characters: seed.characters, note: '승인된 seed는 참조했지만 원문을 새 프로필에 자동 복사하지 않습니다.' }) : event('seed.missing', { note: '허용된 seed 파일이 없어 인터뷰 답변만 사용합니다.' })
    return { state: next, events: [event('privacy.confirmed'), event('provider.consent', { enabled: input.providerApproved === true }), seedEvent, questionEvent(0, seed, input.providerApproved === true)] }
  }
  if (state.phase === 'question') {
    if (action !== 'answer') fail('현재 질문 하나에만 답해 주세요.', 'unexpected-action')
    if (input.private === true) fail('비공개 답변은 공유 프로필에 넣지 않습니다. 공유 가능한 내용으로 다시 답해 주세요.', 'private-answer-not-supported')
    const answer = clean(input.answer)
    if (!answer) fail('답변을 비워 둘 수 없습니다.', 'invalid-input')
    const question = questions[state.questionIndex]
    const interpreted = await interpretTopic(question, answer, state.seed, { ...options, providerAllowed: state.providerAllowed })
    const answers = [...state.answers, { id: question.id, ...interpreted }]
    const summaryEvent = event('answer.summarized', { id: question.id, topic: question.topic, mode: answers.at(-1).mode, summary: answers.at(-1).summary })
    if (state.questionIndex + 1 < questions.length) {
      const next = session('question', { ...state, answers, questionIndex: state.questionIndex + 1 })
      return { state: next, events: [event('answer.received', { id: question.id }), summaryEvent, questionEvent(next.questionIndex, state.seed, state.providerAllowed)] }
    }
    const safeSeed = state.seed ? { path: state.seed.path, digest: state.seed.digest, characters: state.seed.characters, focus: state.seed.focus } : null
    const next = session('preview', { ...state, answers, seed: safeSeed, questionIndex: questions.length })
    const preview = previewProfileOnboarding(next)
    return { state: next, events: [event('answer.received', { id: question.id }), summaryEvent, event('profile.synthesized', { heading: '나의 맥락 요약' }), event('files.planned', { files: preview.files.map(file => file.path), digest: preview.digest }), event('approval.required', { digest: preview.digest, reason: '미리보기와 digest를 확인한 뒤 명시적으로 승인해야 저장할 수 있습니다.' })], result: { preview } }
  }
  if (state.phase === 'preview') {
    const preview = previewProfileOnboarding(state)
    if (action === 'preview') return { state, events: [event('files.planned', { files: preview.files.map(file => file.path), digest: preview.digest }), event('approval.required', { digest: preview.digest })], result: { preview } }
    if (action !== 'approve') fail('저장 전에 미리보기 digest를 명시적으로 승인해 주세요.', 'approval-required')
    if (input.expectedDigest !== preview.digest) fail('미리보기 digest가 일치하지 않습니다.', 'preview-mismatch')
    return { state: session('approved', { ...state, approvedDigest: preview.digest }), events: [event('approval.granted', { digest: preview.digest })] }
  }
  if (state.phase === 'approved') {
    if (action !== 'save') fail('저장하려면 save action을 사용해 주세요.', 'unexpected-action')
    if (input.expectedDigest !== state.approvedDigest) fail('승인한 digest와 저장 요청이 일치하지 않습니다.', 'preview-mismatch')
    const preview = previewProfileOnboarding({ ...state, phase: 'preview' })
    await savePreview(preview, repoRoot)
    return { state: session('saved', { ...state }), events: [event('files.written', { files: preview.files.map(file => file.path) }), event('session.completed', { phase: 'saved' })], result: { files: preview.files.map(file => file.path) } }
  }
  fail('이미 저장이 완료된 세션입니다.', 'session-complete')
}
