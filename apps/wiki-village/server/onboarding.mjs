import { access, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import snapshot from '../src/data/wiki-snapshot.json' with { type: 'json' }
import { analyzeProject, architectSchema, blueprintSchema, previewDigest, renderMemberFiles as architectMemberFiles, renderProjectFiles, sanitizeBlueprint, validateBrief, validateIdentity } from './project-wiki-architect.mjs'

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const defaultRepoRoot = resolve(appRoot, '..', '..')
const snapshotPath = join(appRoot, 'src', 'data', 'wiki-snapshot.json')
const evidencePath = join(appRoot, 'server', 'wiki-evidence.json')
const memberIdPattern = /^(?!con$|prn$|aux$|nul$|com[1-9]$|lpt[1-9]$)[a-z0-9][a-z0-9-]{0,62}$/
let writeQueue = Promise.resolve()
const exists = async path => access(path).then(() => true).catch(() => false)
const within = (base, candidate) => candidate === base || candidate.startsWith(`${base}${sep}`)
const safePath = (root, target) => { const resolvedRoot = resolve(root); const resolvedTarget = resolve(target); if (!within(resolvedRoot, resolvedTarget)) throw Object.assign(new Error('Unsafe path'), { status: 400, code: 'unsafe-path' }); return resolvedTarget }
const readonly = explicit => explicit === true || process.env.VERCEL === '1' || process.env.KNOWLEDGE_GUILD_READ_ONLY === '1'
const projectRoot = root => join(root, 'projects')
const memberRoot = (root, id) => join(root, 'members', id)
const stateFor = (mode, project, members) => ({ persistenceMode: mode, phase: !project ? 'PROJECT_UNINITIALIZED' : members.length ? 'VILLAGE_READY' : 'MEMBER_ONBOARDING', project: project ? { name: project.projectName, summary: project.purpose, problem: project.purpose, audience: project.target, outcome: project.outcome } : null, members: members.map(member => ({ id: member.memberId, displayName: member.displayName, role: 'Wiki contributor' })) })
const frontmatter = text => {
  const block = String(text || '').match(/^---\s*\n([\s\S]*?)\n---/); if (!block) return {}
  return Object.fromEntries(block[1].split(/\r?\n/).map(line => { const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/); if (!match) return null; try { return [match[1], JSON.parse(match[2])] } catch { return [match[1], match[2].replace(/^['"]|['"]$/g, '')] } }).filter(Boolean))
}
const section = (text, heading) => String(text || '').match(new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`, 'm'))?.[1]?.trim() || ''
const sectionText = (text, heading) => section(text, heading).replace(/\s+/g, ' ').trim()
const sectionList = (text, heading) => section(text, heading).split(/\r?\n/).map(item => item.replace(/^\s*-\s*/, '').trim()).filter(item => item && item !== '없음')

export function parseProjectContext(text) {
  const metadata = frontmatter(text)
  if (metadata.schema !== architectSchema || metadata.knowledgeType !== 'fact') return null
  try { return validateBrief({ projectName: metadata.projectName || 'Project Wiki', purpose: sectionText(text, 'Purpose'), target: sectionText(text, 'Target'), outcome: sectionText(text, 'Outcome'), knownFacts: sectionList(text, 'Known facts'), assumptions: sectionList(text, 'Assumptions'), unknowns: sectionList(text, 'Unknowns'), mode: 'local-draft' }) } catch { return null }
}
export function parseBlueprint(text) { const metadata = frontmatter(text); if (metadata.schema !== blueprintSchema || metadata.knowledgeType !== 'wiki-record') return null; const encoded = section(text, 'Blueprint JSON').match(/^```json\s*\n([\s\S]*?)\n```$/m)?.[1]; try { return sanitizeBlueprint(JSON.parse(encoded)) } catch { return null } }
export function parseMemberContext(text, expectedId) { const metadata = frontmatter(text); if (metadata.schema !== architectSchema || metadata.knowledgeType !== 'personal-opinion' || metadata.memberId !== expectedId) return null; try { return validateIdentity({ memberId: expectedId, displayName: sectionText(text, 'Display name'), workingContext: sectionText(text, 'Approved working context') }) } catch { return null } }
export function parseMemberFiles(contextText, schemaText, indexText, expectedId) { const member = parseMemberContext(contextText, expectedId); const schema = frontmatter(schemaText); const index = frontmatter(indexText); return member && schema.schema === architectSchema && schema.memberId === expectedId && schema.knowledgeType === 'wiki-record' && index.schema === architectSchema && index.memberId === expectedId && index.knowledgeType === 'personal-opinion' ? member : null }

export function previewBlueprint(input) {
  const blueprint = sanitizeBlueprint(input?.blueprint || input); const identity = validateIdentity(input?.identity)
  const projectFiles = renderProjectFiles(blueprint); const memberFiles = architectMemberFiles(identity, blueprint)
  const files = [...Object.entries(projectFiles).map(([path, content]) => ({ path: `projects/${path}`, content })), ...Object.entries(memberFiles).map(([path, content]) => ({ path: `members/${identity.memberId}/${path}`, content }))]
  return { kind: 'blueprint', digest: previewDigest(Object.fromEntries(files.map(file => [file.path, file.content]))), files, blueprint, identity }
}
export const previewProject = previewBlueprint
export const previewMember = previewBlueprint
const serialized = task => { const run = writeQueue.then(task, task); writeQueue = run.catch(() => {}); return run }
async function refreshSnapshot(root) { if (resolve(root) !== defaultRepoRoot) return; await new Promise((resolvePromise, reject) => execFile(process.execPath, ['scripts/build-wiki-snapshot.mjs'], { cwd: appRoot }, error => error ? reject(error) : resolvePromise())) }
async function refreshWithRollback(root, rollback) { if (resolve(root) !== defaultRepoRoot) return; const [previousSnapshot, previousEvidence] = await Promise.all([readFile(snapshotPath, 'utf8'), readFile(evidencePath, 'utf8')]); try { await refreshSnapshot(root) } catch (error) { await rollback(); await Promise.all([writeFile(snapshotPath, previousSnapshot), writeFile(evidencePath, previousEvidence)]); throw error } }
async function stageFiles(root, prefix, files) { const stage = safePath(root, join(root, `.${prefix}-${randomUUID()}`)); await mkdir(stage, { recursive: true }); try { for (const [path, content] of Object.entries(files)) { const target = safePath(stage, join(stage, path)); await mkdir(dirname(target), { recursive: true }); await writeFile(target, content, { encoding: 'utf8', flag: 'wx' }) }; return stage } catch (error) { await rm(stage, { recursive: true, force: true }).catch(() => {}); throw error } }
async function copyCreated(stage, root, files, created) { for (const path of Object.keys(files).sort((left, right) => left === 'PROJECT_CONTEXT.md' ? 1 : right === 'PROJECT_CONTEXT.md' ? -1 : left.localeCompare(right))) { const target = safePath(root, join(root, path)); if (await exists(target)) throw Object.assign(new Error('File already exists'), { status: 409, code: 'collision' }); await mkdir(dirname(target), { recursive: true }); await rename(join(stage, path), target); created.push(target) } }
async function rollbackCreated(created, roots) { await Promise.all([...created].reverse().map(path => rm(path, { force: true }))); const candidates = [...new Set(created.flatMap(path => { const chain = []; let current = dirname(path); while (current && current !== dirname(current)) { chain.push(current); current = dirname(current) } return chain })).filter(path => roots.some(root => within(root, path))).sort((left, right) => right.length - left.length)]; for (const path of candidates) await rm(path, { recursive: false, force: false }).catch(() => {}) }

export async function getOnboardingState({ repoRoot = defaultRepoRoot, readOnly } = {}) {
  const mode = readonly(readOnly) ? 'read-only-demo' : 'local-writable'
  if (mode === 'read-only-demo') { const phase = snapshot.projectState === 'VILLAGE_READY' ? 'VILLAGE_READY' : snapshot.projectState === 'PROJECT_READY' ? 'MEMBER_ONBOARDING' : 'PROJECT_UNINITIALIZED'; return { persistenceMode: mode, phase, project: snapshot.projectContext ? { name: snapshot.projectContext.title, summary: snapshot.projectContext.expansion, problem: snapshot.projectContext.coreQuestion, audience: '', outcome: snapshot.projectContext.goal } : null, members: snapshot.members.map(member => ({ id: member.id, displayName: member.displayName, role: member.role?.label || '' })) } }
  let project; try { project = parseProjectContext(await readFile(join(projectRoot(repoRoot), 'PROJECT_CONTEXT.md'), 'utf8')) } catch {}; if (!project) return stateFor(mode, null, [])
  const members = []; try { for (const entry of await readdir(join(repoRoot, 'members'), { withFileTypes: true })) { if (!entry.isDirectory() || !memberIdPattern.test(entry.name)) continue; const root = memberRoot(repoRoot, entry.name); const member = parseMemberFiles(await readFile(join(root, 'CONTEXT.md'), 'utf8'), await readFile(join(root, 'WIKI_SCHEMA.md'), 'utf8'), await readFile(join(root, 'wiki', 'index.md'), 'utf8'), entry.name); if (member) members.push(member) } } catch {}
  return stateFor(mode, project, members)
}
export async function saveBlueprint(input, { repoRoot = defaultRepoRoot, readOnly, refresh = true } = {}) {
  if (readonly(readOnly)) throw Object.assign(new Error('Deployment storage is read-only'), { status: 403, code: 'read-only' })
  const preview = previewBlueprint(input)
  if (input?.expectedDigest !== preview.digest) throw Object.assign(new Error('Preview mismatch'), { status: 400, code: 'preview-mismatch' })
  return serialized(async () => {
    const projectTarget = projectRoot(repoRoot); const memberTarget = memberRoot(repoRoot, preview.identity.memberId)
    if (await exists(join(projectTarget, 'PROJECT_CONTEXT.md')) || await exists(memberTarget)) throw Object.assign(new Error('Canonical root already exists'), { status: 409, code: 'collision' })
    const projectFiles = Object.fromEntries(preview.files.filter(file => file.path.startsWith('projects/')).map(file => [file.path.slice(9), file.content])); const memberPrefix = `members/${preview.identity.memberId}/`; const memberFiles = Object.fromEntries(preview.files.filter(file => file.path.startsWith(memberPrefix)).map(file => [file.path.slice(memberPrefix.length), file.content]))
    const projectStage = await stageFiles(repoRoot, 'project-stage', projectFiles); const memberStage = await stageFiles(repoRoot, 'member-stage', memberFiles); const created = []; const rollback = () => rollbackCreated(created, [memberTarget, projectTarget]); const projectPrelude = Object.fromEntries(Object.entries(projectFiles).filter(([path]) => path !== 'PROJECT_CONTEXT.md')); const projectCommit = { 'PROJECT_CONTEXT.md': projectFiles['PROJECT_CONTEXT.md'] }
    try { await copyCreated(projectStage, projectTarget, projectPrelude, created); await copyCreated(memberStage, memberTarget, memberFiles, created); await copyCreated(projectStage, projectTarget, projectCommit, created) } catch (error) { await rollback(); throw error } finally { await Promise.all([rm(projectStage, { recursive: true, force: true }), rm(memberStage, { recursive: true, force: true })]) }
    if (refresh) await refreshWithRollback(repoRoot, rollback); return getOnboardingState({ repoRoot, readOnly: false })
  })
}
export const saveProject = saveBlueprint
export const saveMember = saveBlueprint
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }
const bodyFrom = req => new Promise((resolvePromise, reject) => { let body = ''; let tooLarge = false; req.on('data', chunk => { if (!tooLarge) { body += chunk; tooLarge = body.length > 12000 } }); req.on('end', () => { if (tooLarge) return reject(Object.assign(new Error('Request too large'), { status: 413, code: 'request-too-large' })); try { resolvePromise(JSON.parse(body || '{}')) } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400, code: 'invalid-json' })) } }); req.on('error', reject) })
export function onboardingMiddleware(options = {}) { return async (req, res, next) => { const pathname = String(req.url || '').split('?')[0]; if (pathname !== '/api/onboarding' && pathname !== '/api/onboarding-state') return next(); try { const address = req.socket?.remoteAddress || ''; if (!readonly(options.readOnly) && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) throw Object.assign(new Error('Local-only persistence'), { status: 403, code: 'local-only' }); if (req.method === 'GET' && pathname === '/api/onboarding-state') return send(res, 200, await getOnboardingState(options)); if (req.method !== 'POST') return send(res, 405, { error: '허용되지 않은 요청입니다.' }); const body = await bodyFrom(req); const { runWikiArchitect } = await import('../core/wiki-architect.mjs'); if (body.action === 'analyze') { const response = await runWikiArchitect('analyze', body, options); return send(res, 200, { ...response.result, events: response.events }) } if (body.action === 'preview-blueprint') { const response = await runWikiArchitect('preview', body, options); return send(res, 200, { ...response.result, events: response.events }) } if (readonly(options.readOnly)) throw Object.assign(new Error('Deployment storage is read-only'), { status: 403, code: 'read-only' }); if (body.action !== 'save-blueprint') return send(res, 400, { error: '알 수 없는 온보딩 작업입니다.', code: 'invalid-action' }); const response = await runWikiArchitect('save', body, options); return send(res, 200, { ...response.result, events: response.events }) } catch (error) { const messages = { 'read-only': '이 배포 화면은 읽기 전용입니다. 내보내기 미리보기는 가능하지만 이 환경에서는 저장할 수 없습니다. 로컬 실행에서 저장할 수 있습니다.', 'local-only': '로컬 저장 API는 이 컴퓨터의 loopback 연결에서만 사용할 수 있습니다.', collision: '기존 canonical project 또는 member root가 있어 덮어쓰지 않았습니다.', 'invalid-member-id': 'member-id는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.', 'invalid-input': '입력 또는 편집한 초안을 확인해 주세요.', 'invalid-blueprint': 'blueprint에 하나 이상의 안전한 page type이 필요합니다.', 'unsafe-path': '허용되지 않은 경로나 page type은 저장할 수 없습니다.', 'preview-mismatch': '미리보기 확인값이 일치하지 않습니다. 다시 확인하세요.' }; return send(res, error.status || 500, { error: messages[error.code] || '온보딩 저장을 완료하지 못했습니다.', code: error.code || 'onboarding-error', events: error.events || [] }) } } }
