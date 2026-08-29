import { access, link, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import snapshot from '../src/data/wiki-snapshot.json' with { type: 'json' }

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const defaultRepoRoot = resolve(appRoot, '..', '..')
const snapshotPath = join(appRoot, 'src', 'data', 'wiki-snapshot.json')
const evidencePath = join(appRoot, 'server', 'wiki-evidence.json')
const projectSchema = 'knowledge-guild-project-context/v1'
const memberSchema = 'knowledge-guild-member-context/v1'
const memberIdPattern = /^(?!con$|prn$|aux$|nul$|com[1-9]$|lpt[1-9]$)[a-z0-9][a-z0-9-]{0,62}$/
let writeQueue = Promise.resolve()

const sha256 = value => createHash('sha256').update(value).digest('hex')
const quote = value => JSON.stringify(value)
const normalize = (value, max = 420) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
const required = (value, label, max) => {
  const normalized = normalize(value, max)
  if (!normalized) throw Object.assign(new Error(`${label} is required`), { status: 400, code: 'invalid-input' })
  return normalized
}
const asObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : null
const frontmatter = text => {
  const block = String(text || '').match(/^---\s*\n([\s\S]*?)\n---/)
  if (!block) return {}
  return Object.fromEntries(block[1].split(/\r?\n/).map(line => {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/)
    if (!match) return null
    try { return [match[1], JSON.parse(match[2])] } catch { return [match[1], match[2].replace(/^['"]|['"]$/g, '')] }
  }).filter(Boolean))
}
const section = (text, heading) => String(text || '').match(new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`, 'm'))?.[1]?.replace(/\s+/g, ' ').trim() || ''
const within = (base, candidate) => candidate === base || candidate.startsWith(`${base}${sep}`)
const stateFor = (mode, project, members) => ({
  persistenceMode: mode,
  phase: !project ? 'PROJECT_UNINITIALIZED' : members.length ? 'VILLAGE_READY' : 'MEMBER_ONBOARDING',
  project: project ? { name: project.projectName, summary: project.summary, problem: project.problem, audience: project.audience, outcome: project.outcome } : null,
  members: members.map(member => ({ id: member.memberId, displayName: member.identity, role: member.role })),
})

export function validateProject(input) {
  const value = asObject(input)
  if (!value) throw Object.assign(new Error('Invalid project input'), { status: 400, code: 'invalid-input' })
  return {
    projectName: required(value.projectName, 'projectName', 100),
    summary: required(value.summary, 'summary', 180),
    problem: required(value.problem, 'problem', 420),
    audience: required(value.audience, 'audience', 220),
    outcome: required(value.outcome, 'outcome', 420),
  }
}

export function validateMember(input) {
  const value = asObject(input)
  if (!value || !memberIdPattern.test(value.memberId || '')) throw Object.assign(new Error('Invalid member id'), { status: 400, code: 'invalid-member-id' })
  return {
    memberId: value.memberId,
    identity: required(value.identity, 'identity', 120),
    perspective: required(value.perspective, 'perspective', 420),
    role: required(value.role, 'role', 180),
    dataCollection: required(value.dataCollection, 'dataCollection', 420),
    desiredOutcome: required(value.desiredOutcome, 'desiredOutcome', 420),
  }
}

export function renderProjectContext(project) {
  return `---\nschema: ${projectSchema}\nknowledgeType: fact\nprojectName: ${quote(project.projectName)}\nsummary: ${quote(project.summary)}\n---\n\n# Project Context\n\n## Project name\n\n${project.projectName}\n\n## One-line description\n\n${project.summary}\n\n## Problem\n\n${project.problem}\n\n## Target users\n\n${project.audience}\n\n## Desired outcomes\n\n${project.outcome}\n`
}

export function renderMemberFiles(member) {
  const metadata = `schema: ${memberSchema}\nmemberId: ${member.memberId}\n`
  return {
    'CONTEXT.md': `---\n${metadata}knowledgeType: personal-opinion\n---\n\n# Member Context\n\n## Who I am\n\n${member.identity}\n\n## Personal perspective\n\n${member.perspective}\n\n## Participation role\n\n${member.role}\n`,
    'WIKI_SCHEMA.md': `---\n${metadata}knowledgeType: wiki-record\n---\n\n# Personal Wiki Schema\n\n- Canonical member id: \`${member.memberId}\`\n- Personal opinions remain personal-opinion records.\n- Put permitted records below \`wiki/\`; never add raw, output, private, or secrets.\n`,
    'wiki/index.md': `---\n${metadata}knowledgeType: personal-opinion\n---\n\n# ${member.identity}'s Wiki\n\n## Data to collect\n\n${member.dataCollection}\n\n## Desired results\n\n${member.desiredOutcome}\n\n## Personal perspective\n\n${member.perspective}\n`,
  }
}

export function previewProject(input) {
  const project = validateProject(input)
  const content = renderProjectContext(project)
  return { kind: 'project', digest: sha256(content), files: [{ path: 'projects/PROJECT_CONTEXT.md', content }] }
}

export function previewMember(input) {
  const member = validateMember(input)
  const files = renderMemberFiles(member)
  return { kind: 'member', digest: sha256(Object.entries(files).map(([path, content]) => `${path}\n${content}`).join('\n')), files: Object.entries(files).map(([path, content]) => ({ path: `members/${member.memberId}/${path}`, content })) }
}

export function parseProjectContext(text) {
  const metadata = frontmatter(text)
  if (metadata.schema !== projectSchema || metadata.knowledgeType !== 'fact') return null
  const project = {
    projectName: normalize(metadata.projectName || section(text, 'Project name'), 100),
    summary: normalize(metadata.summary || section(text, 'One-line description'), 180),
    problem: normalize(section(text, 'Problem'), 420),
    audience: normalize(section(text, 'Target users'), 220),
    outcome: normalize(section(text, 'Desired outcomes'), 420),
  }
  try { return validateProject(project) } catch { return null }
}

export function parseMemberContext(text, expectedId) {
  const metadata = frontmatter(text)
  if (metadata.schema !== memberSchema || metadata.knowledgeType !== 'personal-opinion' || metadata.memberId !== expectedId) return null
  const member = { memberId: expectedId, identity: section(text, 'Who I am'), perspective: section(text, 'Personal perspective'), role: section(text, 'Participation role'), dataCollection: 'saved in wiki/index.md', desiredOutcome: 'saved in wiki/index.md' }
  try { return validateMember(member) } catch { return null }
}

export function parseMemberFiles(contextText, schemaText, indexText, expectedId) {
  const context = parseMemberContext(contextText, expectedId)
  const schema = frontmatter(schemaText)
  const index = frontmatter(indexText)
  if (!context || schema.schema !== memberSchema || schema.memberId !== expectedId || schema.knowledgeType !== 'wiki-record' || index.schema !== memberSchema || index.memberId !== expectedId || index.knowledgeType !== 'personal-opinion') return null
  try {
    return validateMember({
      ...context,
      dataCollection: section(indexText, 'Data to collect'),
      desiredOutcome: section(indexText, 'Desired results'),
    })
  } catch { return null }
}

const exists = async path => access(path).then(() => true).catch(() => false)
const readonly = explicit => explicit === true || process.env.VERCEL === '1' || process.env.KNOWLEDGE_GUILD_READ_ONLY === '1'
const projectPath = root => join(root, 'projects', 'PROJECT_CONTEXT.md')
const memberPath = (root, memberId) => join(root, 'members', memberId)
const safePath = (root, target) => {
  const resolvedRoot = resolve(root); const resolvedTarget = resolve(target)
  if (!within(resolvedRoot, resolvedTarget)) throw Object.assign(new Error('Unsafe path'), { status: 400, code: 'unsafe-path' })
  return resolvedTarget
}
async function atomicCreate(root, target, content) {
  safePath(root, target)
  await mkdir(dirname(target), { recursive: true })
  if (await exists(target)) throw Object.assign(new Error('File already exists'), { status: 409, code: 'collision' })
  const temporary = join(dirname(target), `.${randomUUID()}.tmp`)
  try { await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' }); await link(temporary, target); await rm(temporary, { force: true }) } catch (error) { await rm(temporary, { force: true }).catch(() => {}); if (error?.code === 'EEXIST') throw Object.assign(new Error('File already exists'), { status: 409, code: 'collision' }); throw error }
}
const serialized = task => {
  const run = writeQueue.then(task, task)
  writeQueue = run.catch(() => {})
  return run
}
async function refreshSnapshot(root) {
  if (root !== defaultRepoRoot) return
  await new Promise((resolvePromise, reject) => execFile(process.execPath, ['scripts/build-wiki-snapshot.mjs'], { cwd: appRoot }, error => error ? reject(error) : resolvePromise()))
}
async function refreshWithRollback(root, rollback) {
  if (root !== defaultRepoRoot) return
  const [previousSnapshot, previousEvidence] = await Promise.all([readFile(snapshotPath, 'utf8'), readFile(evidencePath, 'utf8')])
  try { await refreshSnapshot(root) } catch (error) {
    await rollback()
    await Promise.all([writeFile(snapshotPath, previousSnapshot), writeFile(evidencePath, previousEvidence)])
    throw error
  }
}

export async function getOnboardingState({ repoRoot = defaultRepoRoot, readOnly } = {}) {
  const mode = readonly(readOnly) ? 'read-only-demo' : 'local-writable'
  if (mode === 'read-only-demo') {
    const phase = snapshot.projectState === 'VILLAGE_READY' ? 'VILLAGE_READY' : snapshot.projectState === 'PROJECT_READY' ? 'MEMBER_ONBOARDING' : 'PROJECT_UNINITIALIZED'
    return { persistenceMode: mode, phase, project: snapshot.projectContext ? { name: snapshot.projectContext.title, summary: snapshot.projectContext.expansion, problem: snapshot.projectContext.coreQuestion, audience: '', outcome: snapshot.projectContext.goal } : null, members: snapshot.members.map(member => ({ id: member.id, displayName: member.displayName, role: member.role?.label || '' })) }
  }
  let project = null
  try { project = parseProjectContext(await readFile(projectPath(repoRoot), 'utf8')) } catch {}
  if (!project) return stateFor(mode, null, [])
  const members = []
  try {
    const entries = await readdir(join(repoRoot, 'members'), { withFileTypes: true })
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || !memberIdPattern.test(entry.name)) continue
      const root = memberPath(repoRoot, entry.name)
      try {
        const member = parseMemberFiles(await readFile(join(root, 'CONTEXT.md'), 'utf8'), await readFile(join(root, 'WIKI_SCHEMA.md'), 'utf8'), await readFile(join(root, 'wiki', 'index.md'), 'utf8'), entry.name)
        if (member) members.push(member)
      } catch {}
    }
  } catch {}
  return stateFor(mode, project, members)
}

export async function saveProject(input, { repoRoot = defaultRepoRoot, readOnly, refresh = true } = {}) {
  if (readonly(readOnly)) throw Object.assign(new Error('Deployment storage is read-only'), { status: 403, code: 'read-only' })
  const project = validateProject(input)
  return serialized(async () => {
    const target = safePath(repoRoot, projectPath(repoRoot))
    await atomicCreate(repoRoot, target, renderProjectContext(project))
    const saved = parseProjectContext(await readFile(target, 'utf8'))
    if (!saved || sha256(renderProjectContext(saved)) !== sha256(renderProjectContext(project))) throw Object.assign(new Error('Write verification failed'), { status: 500, code: 'write-verification-failed' })
    if (refresh) await refreshWithRollback(repoRoot, () => rm(target, { force: true }))
    return getOnboardingState({ repoRoot, readOnly: false })
  })
}

export async function saveMember(input, { repoRoot = defaultRepoRoot, readOnly, refresh = true } = {}) {
  if (readonly(readOnly)) throw Object.assign(new Error('Deployment storage is read-only'), { status: 403, code: 'read-only' })
  const member = validateMember(input)
  return serialized(async () => {
    if (!parseProjectContext(await readFile(projectPath(repoRoot), 'utf8').catch(() => ''))) throw Object.assign(new Error('Project must be initialized first'), { status: 409, code: 'project-uninitialized' })
    const target = safePath(repoRoot, memberPath(repoRoot, member.memberId))
    if (await exists(target)) throw Object.assign(new Error('Member already exists'), { status: 409, code: 'collision' })
    const stage = safePath(repoRoot, join(repoRoot, 'members', `.${member.memberId}-${randomUUID()}`))
    const files = renderMemberFiles(member)
    try {
      await mkdir(join(stage, 'wiki'), { recursive: true })
      await Promise.all(Object.entries(files).map(([relative, content]) => writeFile(join(stage, relative), content, { encoding: 'utf8', flag: 'wx' })))
      const verified = parseMemberFiles(await readFile(join(stage, 'CONTEXT.md'), 'utf8'), await readFile(join(stage, 'WIKI_SCHEMA.md'), 'utf8'), await readFile(join(stage, 'wiki', 'index.md'), 'utf8'), member.memberId)
      if (!verified) throw Object.assign(new Error('Write verification failed'), { status: 500, code: 'write-verification-failed' })
      await rename(stage, target)
    } catch (error) { await rm(stage, { recursive: true, force: true }).catch(() => {}); throw error }
    if (refresh) await refreshWithRollback(repoRoot, () => rm(target, { recursive: true, force: true }))
    return getOnboardingState({ repoRoot, readOnly: false })
  })
}

const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }
const bodyFrom = req => new Promise((resolvePromise, reject) => {
  let body = ''; let tooLarge = false
  req.on('data', chunk => { if (!tooLarge) { body += chunk; tooLarge = body.length > 10000 } })
  req.on('end', () => { if (tooLarge) reject(Object.assign(new Error('Request too large'), { status: 413, code: 'request-too-large' })); else try { resolvePromise(JSON.parse(body || '{}')) } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400, code: 'invalid-json' })) } })
  req.on('error', reject)
})

export function onboardingMiddleware(options = {}) {
  return async (req, res, next) => {
    const pathname = String(req.url || '').split('?')[0]
    if (pathname !== '/api/onboarding' && pathname !== '/api/onboarding-state') return next()
    try {
      const address = req.socket?.remoteAddress || ''
      if (!readonly(options.readOnly) && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) throw Object.assign(new Error('Local-only persistence'), { status: 403, code: 'local-only' })
      if (req.method === 'GET' && pathname === '/api/onboarding-state') return send(res, 200, await getOnboardingState(options))
      if (req.method !== 'POST' || pathname !== '/api/onboarding') return send(res, 405, { error: '허용되지 않은 요청입니다.' })
      const body = await bodyFrom(req)
      if (body.action === 'preview-project') return send(res, 200, { preview: previewProject(body.project) })
      if (body.action === 'preview-member') return send(res, 200, { preview: previewMember(body.member) })
      if (readonly(options.readOnly)) throw Object.assign(new Error('Deployment storage is read-only'), { status: 403, code: 'read-only' })
      const preview = body.action === 'save-project' ? previewProject(body.project) : body.action === 'save-member' ? previewMember(body.member) : null
      if (!preview) return send(res, 400, { error: '알 수 없는 온보딩 작업입니다.', code: 'invalid-action' })
      if (body.expectedDigest !== preview.digest) return send(res, 400, { error: '미리보기 확인값이 일치하지 않습니다. 다시 확인하세요.', code: 'preview-mismatch' })
      const state = body.action === 'save-project' ? await saveProject(body.project, options) : await saveMember(body.member, options)
      return send(res, 200, state)
    } catch (error) {
      const messages = { 'read-only': '이 배포 화면은 읽기 전용입니다. 파일 미리보기를 내려받아 로컬에서 저장하세요.', 'local-only': '로컬 저장 API는 이 컴퓨터의 loopback 연결에서만 사용할 수 있습니다.', collision: '같은 canonical 파일 또는 member-id가 이미 있어 덮어쓰지 않았습니다.', 'invalid-member-id': 'member-id는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.', 'invalid-input': '필수 응답을 다시 확인해 주세요.', 'project-uninitialized': '프로젝트 확인을 먼저 완료해야 개인 Wiki를 만들 수 있습니다.', 'write-verification-failed': '파일 확인에 실패해 저장을 완료하지 않았습니다.' }
      return send(res, error.status || 500, { error: messages[error.code] || '온보딩 저장을 완료하지 못했습니다.', code: error.code || 'onboarding-error' })
    }
  }
}
