import { access, link, lstat, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join, relative, resolve, sep } from 'node:path'

const memberIdPattern = /^(?!con$|prn$|aux$|nul$|com[1-9]$|lpt[1-9]$)[a-z0-9][a-z0-9-]{0,62}$/
const approvedSeedFiles = ['나의 핵심 맥락.md', 'my-core-context.md']
const questions = [
  { id: 'identity', topic: '나는 누구인가', question: '조금 더 깊이 당신은 누구인가요? 현재 맡은 역할, 강점, 중요하게 여기는 가치에 대해 들려주세요.' },
  { id: 'recording', topic: '기록하려는 이유', question: '왜 지금 기록을 남기고 싶나요? 현재 잘되지 않는 점과 바라는 모습을 들려주세요.' },
  { id: 'outputs', topic: '원하는 결과물', question: '어떤 결과물을 원하나요? 읽을 사람, 원하는 형식, 1년 뒤의 이상적인 상태를 들려주세요.' },
]

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
const ensureMembersDirectory = async repoRoot => {
  const members = resolve(repoRoot, 'members')
  if (await exists(members)) {
    if ((await lstat(members)).isSymbolicLink()) fail('members 디렉터리는 저장소 밖을 가리킬 수 없습니다.', 'unsafe-path')
    return members
  }
  await mkdir(members, { recursive: true })
  if ((await lstat(members)).isSymbolicLink()) fail('members 디렉터리는 저장소 밖을 가리킬 수 없습니다.', 'unsafe-path')
  return members
}
const ensureExistingMemberScope = async (repoRoot, memberId) => {
  const root = memberPath(repoRoot, memberId)
  const members = await ensureMembersDirectory(repoRoot)
  if (!(await exists(root))) return root
  const actualMembers = await realpath(members)
  const actualRoot = await realpath(root)
  if (actualRoot !== resolve(actualMembers, memberId)) fail('선택한 member 공간 밖에는 접근할 수 없습니다.', 'unsafe-path')
  return root
}
const digest = files => createHash('sha256').update(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => `${path}\n${content}`).join('\n')).digest('hex')
const session = (phase, data = {}) => ({ version: 1, ...data, phase })
const event = (type, data = {}) => ({ type, at: 'session', ...data })
const answerSummary = (topic, answer) => ({ topic, summary: `사용자가 ${topic}에 관해 확인한 내용: ${answer.replace(/\s+/g, ' ').slice(0, 720)}` })

export const profileQuestions = questions.map(({ id, topic, question }) => ({ id, topic, question }))

async function loadApprovedSeed(repoRoot, memberId) {
  const root = await ensureExistingMemberScope(repoRoot, memberId)
  for (const file of approvedSeedFiles) {
    for (const candidate of [file, join('vault', file)]) {
      const target = pathInMember(root, candidate)
      if (await exists(target)) {
        if (!(await stat(target)).isFile()) fail('허용된 seed 이름은 일반 파일이어야 합니다.', 'invalid-seed')
        const actualRoot = await realpath(root)
        const actualTarget = await realpath(target)
        if (!actualTarget.startsWith(`${actualRoot}${sep}`)) fail('승인된 seed가 선택한 member 공간을 벗어납니다.', 'unsafe-path')
        const content = await readFile(target, 'utf8')
        return { path: relative(resolve(repoRoot), target).split('\\').join('/'), digest: createHash('sha256').update(content).digest('hex'), characters: content.length }
      }
    }
  }
  return null
}

function requireState(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) fail('온보딩 세션을 먼저 시작해 주세요.', 'invalid-session')
  return value
}
function questionEvent(index) {
  const question = questions[index]
  return event('question.asked', { id: question.id, topic: question.topic, question: question.question, count: index + 1, total: questions.length })
}

export function renderProfileFiles(state) {
  if (state.phase !== 'preview') fail('세 질문을 마친 뒤에만 미리보기를 만들 수 있습니다.', 'preview-unavailable')
  const answers = state.answers
  const heading = `# ${state.displayName}의 프로필`
  const profile = `${heading}\n\n> 아래 내용은 인터뷰 뒤 화면으로 먼저 제시한 정규화 요약이며, preview와 digest 승인이 있기 전에는 저장하지 않습니다.\n\n## 나의 맥락 요약\n\n${answers.map(answer => `- ${answer.summary}`).join('\n')}\n\n## 사실로 확인된 내용\n\n- 표시 이름: ${state.displayName}\n\n## 나의 관점과 선호\n\n${answers.map(answer => `### ${answer.topic}\n\n${answer.summary}`).join('\n\n')}\n\n## 아직 알 수 없는 내용\n\n`
  const context = `# ${state.displayName} Context\n\n> 이 문서는 승인된 PROFILE.md에서 매 실행 시 빠르게 읽기 위한 provider-neutral 요약입니다. 저장 전 사용자 승인을 받습니다.\n\n## 나는 누구인가\n\n${answers[0].summary}\n\n## 나의 역할들\n\n\n## 나의 비전과 목표\n\n${answers.slice(1).map(answer => `- ${answer.summary}`).join('\n')}\n\n## AI에게 기대하는 것\n\n\n## 작업 규칙\n\n- 사용자 승인 전에는 PROFILE.md 또는 CONTEXT.md를 저장하지 않는다.\n- 다른 member 공간과 projects/를 읽거나 쓰지 않는다.\n- 사실, 개인 관점, 알 수 없는 내용을 구분하고 빈 항목은 추정으로 채우지 않는다.\n`
  const base = `members/${state.memberId}`
  return { [`${base}/PROFILE.md`]: profile, [`${base}/CONTEXT.md`]: context }
}

export function previewProfileOnboarding(state) {
  const files = renderProfileFiles(state)
  return { kind: 'profile-onboarding', files: Object.entries(files).map(([path, content]) => ({ path, content })), digest: digest(files) }
}

export async function startProfileOnboarding({ memberId }, { repoRoot } = {}) {
  const id = safeMemberId(memberId)
  await ensureMembersDirectory(repoRoot)
  memberPath(repoRoot, id)
  const state = session('name', { memberId: id, answers: [] })
  return { state, events: [event('session.started', { command: 'profile-onboarding', memberId: id }), event('question.asked', { id: 'display-name', question: '먼저, 어떻게 불러드리면 될까요? 이름을 알려주세요.' })] }
}

async function savePreview(preview, repoRoot) {
  const root = resolve(repoRoot)
  const memberId = preview.files[0]?.path.match(/^members\/([^/]+)\//)?.[1]
  await ensureExistingMemberScope(root, memberId)
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

export async function advanceProfileOnboarding(current, input = {}, { repoRoot } = {}) {
  const state = requireState(current)
  if (Array.isArray(input.answers)) fail('한 번에 하나의 답변만 받을 수 있습니다.', 'one-answer-at-a-time')
  const action = input.action
  if (state.phase === 'name') {
    if (action !== 'answer') fail('먼저 이름에 답해 주세요.', 'unexpected-action')
    const displayName = clean(input.answer, 120)
    if (!displayName) fail('이름을 비워 둘 수 없습니다.', 'invalid-input')
    const next = session('privacy', { ...state, displayName })
    return { state: next, events: [event('answer.received', { id: 'display-name' }), event('privacy.warning', { message: 'PROFILE.md와 CONTEXT.md는 Git에 커밋되면 저장소 접근자가 읽을 수 있습니다. 공유해도 되는 내용만 답변해 주세요. 비공개 내용은 말하지 않거나 별도로 표시해 주세요.' }), event('privacy.confirmation.required', { question: '공개 범위를 이해했고, 공유 가능한 내용만 답변하시겠어요?' })] }
  }
  if (state.phase === 'privacy') {
    if (action !== 'privacy' || input.approved !== true) fail('세 질문을 시작하기 전에 공개 범위를 명시적으로 확인해 주세요.', 'privacy-confirmation-required')
    const seed = await loadApprovedSeed(repoRoot, state.memberId)
    const next = session('question', { ...state, seed, questionIndex: 0 })
    const seedEvent = seed ? event('seed.loaded', { path: seed.path, digest: seed.digest, characters: seed.characters, note: '승인된 seed는 참조했지만 원문을 새 프로필에 자동 복사하지 않습니다.' }) : event('seed.missing', { note: '허용된 seed 파일이 없어 인터뷰 답변만 사용합니다.' })
    return { state: next, events: [event('privacy.confirmed'), seedEvent, questionEvent(0)] }
  }
  if (state.phase === 'question') {
    if (action !== 'answer') fail('현재 질문 하나에만 답해 주세요.', 'unexpected-action')
    if (input.private === true) fail('비공개 답변은 공유 프로필에 넣지 않습니다. 공유 가능한 내용으로 다시 답해 주세요.', 'private-answer-not-supported')
    const answer = clean(input.answer)
    if (!answer) fail('답변을 비워 둘 수 없습니다.', 'invalid-input')
    const question = questions[state.questionIndex]
    const answers = [...state.answers, answerSummary(question.topic, answer)]
    const summaryEvent = event('answer.summarized', { id: question.id, topic: question.topic, summary: answers.at(-1).summary })
    if (state.questionIndex + 1 < questions.length) {
      const next = session('question', { ...state, answers, questionIndex: state.questionIndex + 1 })
      return { state: next, events: [event('answer.received', { id: question.id }), summaryEvent, questionEvent(next.questionIndex)] }
    }
    const next = session('preview', { ...state, answers, questionIndex: questions.length })
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
