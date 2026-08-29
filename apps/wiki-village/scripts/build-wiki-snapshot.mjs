import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { activityBand, inferGuildRole } from '../src/guild.js'
import { parseMemberFiles, parseMemberContext, parseProjectContext } from '../server/onboarding.mjs'

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repoRoot = resolve(appRoot, '..', '..')
const membersRoot = join(repoRoot, 'members')
const output = join(appRoot, 'src', 'data', 'wiki-snapshot.json')
const evidenceOutput = join(appRoot, 'server', 'wiki-evidence.json')
const safeId = /^[a-z0-9-]+$/
const ignored = new Set(['raw', 'output', 'private', 'secrets', '.obsidian', 'node_modules'])
const knowledgeTypes = new Set(['fact', 'personal-opinion', 'hypothesis', 'wiki-record'])
const within = (base, candidate) => candidate === base || candidate.startsWith(`${base}${sep}`)
const digest = value => createHash('sha256').update(value).digest('hex')
const source = absolute => relative(repoRoot, absolute).replaceAll('\\', '/')
const field = (text, key) => text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.replace(/^['"]|['"]$/g, '')
const title = (text, fallback) => field(text, 'title') || text.match(/^#\s+(.+)$/m)?.[1] || fallback
const excerpt = text => text.replace(/^---[\s\S]*?---\s*/m, '').replace(/```[\s\S]*?```/g, '').replace(/[#>*`|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 230)
const documentId = (memberId, absolute) => `member-${memberId}-${source(absolute).replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '')}`
const personalSource = (value, memberId) => new RegExp(`^members/${memberId}/(CONTEXT\\.md|WIKI_SCHEMA\\.md|wiki/.*\\.md)$`).test(value || '') && !/\.private\.md$|\/(raw|output|private|secrets|\.obsidian|node_modules)\//.test(value || '')
const projectSource = value => value === 'projects/PROJECT_CONTEXT.md'
const frontmatter = text => text.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || ''
const knowledgeType = (text, scope) => {
  const declared = ['knowledgeType', 'knowledge_type', 'knowledge-type'].map(key => field(frontmatter(text), key)).find(value => knowledgeTypes.has(value))
  return declared || (scope === 'project' ? 'fact' : 'wiki-record')
}
const manifestFor = records => {
  const content = records.map(record => ({ id: record.id, scope: record.scope, memberId: record.memberId || null, source: record.source, title: record.title, knowledgeType: record.knowledgeType, contentDigest: record.contentDigest })).sort((a, b) => a.id.localeCompare(b.id))
  return { version: 1, recordCount: content.length, contentDigest: digest(JSON.stringify(content)) }
}
const projectState = value => value?.projectState || (value?.projectContext ? 'PROJECT_READY' : 'PROJECT_UNINITIALIZED')
const validSnapshot = value => {
  if (!value || !['PROJECT_UNINITIALIZED', 'PROJECT_READY', 'VILLAGE_READY'].includes(projectState(value)) || !Array.isArray(value.members) || !Array.isArray(value.documents)) return false
  const ids = value.documents.map(item => item.id)
  if (new Set(ids).size !== ids.length || JSON.stringify(value.manifest) !== JSON.stringify(manifestFor(value.documents))) return false
  const projectDocs = value.documents.filter(item => item.scope === 'project')
  const personalDocs = value.documents.filter(item => item.scope === 'personal')
  const validSource = value.documents.every(item => item.id && item.title && knowledgeTypes.has(item.knowledgeType) && /^[a-f0-9]{64}$/.test(item.contentDigest || '') && (item.scope === 'project' ? projectSource(item.source) : item.scope === 'personal' && safeId.test(item.memberId || '') && personalSource(item.source, item.memberId)))
  if (!validSource) return false
  if (projectState(value) === 'PROJECT_UNINITIALIZED') return !value.projectContext && !projectDocs.length && !personalDocs.length && !value.members.length
  if (projectDocs.length !== 1 || !value.projectContext || value.projectContext.source !== 'projects/PROJECT_CONTEXT.md') return false
  const personalById = new Map(personalDocs.map(item => [item.id, item]))
  const validMembers = value.members.every(member => safeId.test(member.id || '') && member.documentCount > 0 && Array.isArray(member.documentIds) && member.documentCount === member.documentIds.length && member.documentIds.every(id => personalById.get(id)?.memberId === member.id))
  return validMembers && (projectState(value) === 'PROJECT_READY' ? !value.members.length && !personalDocs.length : value.members.length > 0 && personalDocs.length > 0)
}
const validEvidence = (value, snapshot) => {
  if (!value || value.version < 4 || !Array.isArray(value.documents) || JSON.stringify(value.manifest) !== JSON.stringify(snapshot.manifest) || JSON.stringify(value.manifest) !== JSON.stringify(manifestFor(value.documents))) return false
  const sourceOkay = value.documents.every(item => item.id && typeof item.body === 'string' && item.contentDigest === digest(item.body) && knowledgeTypes.has(item.knowledgeType) && (item.scope === 'project' ? projectSource(item.source) : item.scope === 'personal' && safeId.test(item.memberId || '') && personalSource(item.source, item.memberId)))
  const snapshotIds = new Set(snapshot.documents.map(item => item.id)); const evidenceIds = new Set(value.documents.map(item => item.id))
  return sourceOkay && snapshotIds.size === evidenceIds.size && [...snapshotIds].every(id => evidenceIds.has(id))
}
async function preserveCommittedArtifacts(reason) {
  let savedSnapshot; let savedEvidence
  try { savedSnapshot = JSON.parse(await readFile(output, 'utf8')); savedEvidence = JSON.parse(await readFile(evidenceOutput, 'utf8')) } catch { throw new Error(`Wiki sources are unavailable (${reason}) and no committed snapshot artifacts are present.`) }
  if (!validSnapshot(savedSnapshot) || !validEvidence(savedEvidence, savedSnapshot)) throw new Error(`Wiki sources are unavailable (${reason}); refusing to publish invalid artifacts.`)
  console.log(`Preserved committed Wiki snapshot (${projectState(savedSnapshot)}; ${reason}).`)
}
async function load(absolute) { const resolved = await realpath(absolute); if (!within(repoRoot, resolved)) return null; return { absolute: resolved, text: await readFile(resolved, 'utf8') } }
async function walk(directory, out = []) { const root = await realpath(directory); for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) { if (entry.name.startsWith('.') || ignored.has(entry.name)) continue; const absolute = join(directory, entry.name); const stat = await lstat(absolute); if (stat.isSymbolicLink()) continue; if (stat.isDirectory()) await walk(absolute, out); if (stat.isFile() && entry.name.endsWith('.md') && !entry.name.endsWith('.private.md')) { const resolved = await realpath(absolute); if (within(root, resolved)) out.push(resolved) } } return out }
async function publicActivity(memberId) { try { const date = (await new Promise((resolvePromise, reject) => execFile('git', ['log', '-1', '--format=%cI', '--', `members/${memberId}`], { cwd: repoRoot }, (error, stdout) => error ? reject(error) : resolvePromise(String(stdout).trim())))).slice(0, 10); return activityBand(/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null) } catch { return activityBand(null) } }
async function member(memberId) {
  const root = join(membersRoot, memberId); const wiki = join(root, 'wiki')
  try {
    const context = await readFile(join(root, 'CONTEXT.md'), 'utf8')
    const schema = await readFile(join(root, 'WIKI_SCHEMA.md'), 'utf8')
    const index = await readFile(join(wiki, 'index.md'), 'utf8')
    if (!parseMemberFiles(context, schema, index, memberId)) return null
  } catch { return null }
  const files = []
  for (const file of [join(root, 'CONTEXT.md'), join(root, 'WIKI_SCHEMA.md'), join(wiki, 'index.md')]) try { files.push(await load(file)) } catch {}
  try { for (const file of await walk(wiki)) files.push(await load(file)) } catch {}
  const unique = [...new Map(files.filter(Boolean).map(file => [file.absolute, file])).values()]
  const documents = unique.map(file => ({ id: documentId(memberId, file.absolute), memberId, author: memberId, category: '개인 Wiki', scope: 'personal', source: source(file.absolute), title: title(file.text, memberId), updated: field(frontmatter(file.text), 'updated') || 'snapshot', status: 'onboarded', knowledgeType: knowledgeType(file.text, 'personal'), contentDigest: digest(file.text), excerpt: excerpt(file.text) }))
  const evidence = unique.map(file => ({ id: documentId(memberId, file.absolute), memberId, scope: 'personal', source: source(file.absolute), title: title(file.text, memberId), knowledgeType: knowledgeType(file.text, 'personal'), contentDigest: digest(file.text), body: file.text }))
  return { id: memberId, memberId, displayName: parseMemberContext(await readFile(join(root, 'CONTEXT.md'), 'utf8'), memberId).identity, documentIds: documents.map(document => document.id), documentCount: documents.length, role: inferGuildRole(documents), activity: await publicActivity(memberId), documents, evidence }
}

const remoteBuild = process.env.VERCEL === '1' || process.env.WIKI_VILLAGE_SIMULATE_SOURCE_MISSING === '1'
let sourceMissing = process.env.WIKI_VILLAGE_SIMULATE_SOURCE_MISSING === '1'
let project = null
let projectText = ''
if (!sourceMissing) try { projectText = await readFile(join(repoRoot, 'projects', 'PROJECT_CONTEXT.md'), 'utf8'); project = parseProjectContext(projectText) } catch {}
let entries = []
if (!sourceMissing && project) try { entries = (await readdir(membersRoot, { withFileTypes: true })).filter(entry => entry.isDirectory() && entry.name !== 'example-member' && safeId.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name)) } catch (error) { if (error?.code === 'ENOENT') sourceMissing = true; else throw error }
if (sourceMissing) { await preserveCommittedArtifacts('source root missing'); process.exit(0) }
const indexed = project ? (await Promise.all(entries.map(entry => member(entry.name)))).filter(Boolean) : []
const projectDocument = project ? (() => { const body = projectText; const contentDigest = digest(body); return { id: 'project-context', category: '프로젝트 공통 사실', scope: 'project', author: 'project', source: 'projects/PROJECT_CONTEXT.md', title: project.projectName, updated: 'onboarding', status: 'onboarded', knowledgeType: 'fact', contentDigest, excerpt: excerpt(body), body } })() : null
const documents = [...(projectDocument ? [((({ body, ...document }) => document)(projectDocument))] : []), ...indexed.flatMap(item => item.documents)]
const evidenceDocuments = [...(projectDocument ? [projectDocument] : []), ...indexed.flatMap(item => item.evidence)]
const manifest = manifestFor(documents)
const state = !project ? 'PROJECT_UNINITIALIZED' : indexed.length ? 'VILLAGE_READY' : 'PROJECT_READY'
const projectContext = project ? { scope: 'project', source: 'projects/PROJECT_CONTEXT.md', title: project.projectName, goal: project.outcome, coreQuestion: project.problem, expansion: project.summary, status: 'onboarded', flow: ['프로젝트 인터뷰', 'Guild hall', '근거 확인'] } : null
const snapshot = { version: 4, projectState: state, generatedAt: 'onboarding-state', boundary: 'WIKI SNAPSHOT · server-side onboarding persistence only · no browser filesystem access', decisionState: 'Official decisions are represented only by decisions/ documents.', manifest, projectContext, members: indexed.map(({ documents: memberDocuments, evidence, ...item }) => item), documents }
await mkdir(dirname(output), { recursive: true }); await mkdir(dirname(evidenceOutput), { recursive: true })
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`)
await writeFile(evidenceOutput, `${JSON.stringify({ version: 4, manifest, documents: evidenceDocuments.map(({ body, ...document }) => ({ ...document, body })) }, null, 2)}\n`)
console.log(`Wrote ${relative(appRoot, output)} for ${state} with ${snapshot.members.length} members.`)
