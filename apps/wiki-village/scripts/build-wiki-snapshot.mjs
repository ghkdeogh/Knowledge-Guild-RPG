import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { activityBand, inferGuildRole } from '../src/guild.js'

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repoRoot = resolve(appRoot, '..', '..'); const membersRoot = join(repoRoot, 'members')
const output = join(appRoot, 'src', 'data', 'wiki-snapshot.json'); const evidenceOutput = join(appRoot, 'server', 'wiki-evidence.json')
const safeId = /^[a-z0-9-]+$/; const ignored = new Set(['raw', 'output', '.obsidian', 'node_modules'])
const within = (base, candidate) => candidate === base || candidate.startsWith(`${base}${sep}`)
const field = (text, key) => text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.replace(/^['"]|['"]$/g, '')
const title = (text, fallback) => field(text, 'title') || text.match(/^#\s+(.+)$/m)?.[1] || fallback
const excerpt = (text) => text.replace(/^---[\s\S]*?---\s*/m, '').replace(/```[\s\S]*?```/g, '').replace(/[#>*`|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 230)
const source = (absolute) => relative(repoRoot, absolute).replaceAll('\\', '/')
const documentId = (memberId, absolute) => `member-${memberId}-${source(absolute).replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '')}`
const section = (text, heading) => text.match(new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`, 'm'))?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 520) || ''
const personalSource = value => /^members\/[a-z0-9-]+\/(WIKI_SCHEMA\.md|wiki\/.*\.md)$/.test(value || '') && !/\.private\.md$|\/(raw|output|\.obsidian|node_modules)\//.test(value || '')
const sharedSource = value => ['projects/PROJECT_CONTEXT.md', 'synthesis/README.md', 'decisions/README.md'].includes(value)
const validSnapshot = value => {
  const generatedAt = Date.parse(value?.generatedAt || '')
  if (!value || !Number.isFinite(generatedAt) || generatedAt < Date.parse('2020-01-01T00:00:00.000Z') || !Array.isArray(value.members) || !Array.isArray(value.documents) || !['indexed', 'verified-empty', undefined].includes(value.sourceState)) return false
  const personal = value.documents.filter(item => item.scope === 'personal')
  const sourcesOkay = personal.every(item => safeId.test(item.memberId || '') && personalSource(item.source) && item.id && item.title)
  if (!sourcesOkay) return false
  if (value.sourceState === 'verified-empty') return value.members.length === 0 && personal.length === 0
  const personalIds = new Set(personal.map(item => item.id))
  return value.members.length > 0 && personal.length > 0 && value.members.every(member => safeId.test(member.id || '') && member.documentCount > 0 && Array.isArray(member.documentIds) && member.documentCount === member.documentIds.length && member.documentIds.every(id => personalIds.has(id)))
}
const validEvidence = (value, snapshot) => {
  if (!value || value.version < 2 || !Array.isArray(value.documents) || !value.documents.length) return false
  const personal = value.documents.filter(item => item.scope === 'personal')
  const sourcesOkay = value.documents.every(item => item.id && typeof item.body === 'string' && (item.scope === 'personal' ? safeId.test(item.memberId || '') && personalSource(item.source) : sharedSource(item.source)))
  const snapshotIds = new Set(snapshot.documents.filter(item => item.scope === 'personal').map(item => item.id)); const evidenceIds = new Set(personal.map(item => item.id))
  return sourcesOkay && snapshotIds.size === evidenceIds.size && [...snapshotIds].every(id => evidenceIds.has(id))
}
async function preserveCommittedArtifacts(reason) { let savedSnapshot; let savedEvidence; try { savedSnapshot = JSON.parse(await readFile(output, 'utf8')); savedEvidence = JSON.parse(await readFile(evidenceOutput, 'utf8')) } catch { throw new Error(`Wiki sources are unavailable (${reason}) and no committed snapshot artifacts are present.`) } if (!validSnapshot(savedSnapshot) || !validEvidence(savedEvidence, savedSnapshot)) throw new Error(`Wiki sources are unavailable (${reason}); refusing to publish an invalid, stale, or unverified empty snapshot.`); console.log(`Preserved committed Wiki snapshot (${savedSnapshot.members.length} members; ${reason}).`) }
async function load(absolute) { const resolved = await realpath(absolute); if (!within(repoRoot, resolved)) return null; return { absolute: resolved, text: await readFile(resolved, 'utf8') } }
async function walk(directory, out = []) { const root = await realpath(directory); for (const entry of await readdir(directory, { withFileTypes: true })) { if (entry.name.startsWith('.') || ignored.has(entry.name)) continue; const absolute = join(directory, entry.name); const stat = await lstat(absolute); if (stat.isSymbolicLink()) continue; if (stat.isDirectory()) await walk(absolute, out); if (stat.isFile() && entry.name.endsWith('.md') && !entry.name.endsWith('.private.md')) { const resolved = await realpath(absolute); if (within(root, resolved)) out.push(resolved) } } return out }
async function publicActivity(memberId) { try { const date = (await new Promise((resolve, reject) => execFile('git', ['log', '-1', '--format=%cI', '--', `members/${memberId}`], { cwd: repoRoot }, (error, stdout) => error ? reject(error) : resolve(String(stdout).trim())))).slice(0, 10); return activityBand(/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null) } catch { return activityBand(null) } }
async function member(memberId) { const root = join(membersRoot, memberId); const wiki = join(root, 'wiki'); const files = []; for (const file of [join(root, 'WIKI_SCHEMA.md'), join(wiki, 'index.md')]) try { files.push(await load(file)) } catch {} try { for (const file of await walk(wiki)) files.push(await load(file)) } catch {} const unique = [...new Map(files.filter(Boolean).map(file => [file.absolute, file])).values()]; const documents = unique.map(file => ({ id: documentId(memberId, file.absolute), memberId, author: memberId, category: '개인 Wiki', scope: 'personal', source: source(file.absolute), title: title(file.text, memberId), updated: field(file.text, 'updated') || field(file.text, 'created') || 'snapshot', status: field(file.text, 'status') || 'unclassified', excerpt: excerpt(file.text) })); const evidence = unique.map(file => ({ id: documentId(memberId, file.absolute), memberId, source: source(file.absolute), title: title(file.text, memberId), body: file.text })); return { id: memberId, memberId, displayName: memberId, documentIds: documents.map(document => document.id), documentCount: documents.length, role: inferGuildRole(documents), activity: await publicActivity(memberId), documents, evidence } }
const remoteBuild = process.env.VERCEL === '1' || process.env.WIKI_VILLAGE_SIMULATE_SOURCE_MISSING === '1'
let entries = []; let memberRootMissing = process.env.WIKI_VILLAGE_SIMULATE_SOURCE_MISSING === '1'
if (!memberRootMissing) try { entries = (await readdir(membersRoot, { withFileTypes: true })).filter(entry => entry.isDirectory() && safeId.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name)) } catch (error) { if (error?.code === 'ENOENT') memberRootMissing = true; else throw error }
const indexed = memberRootMissing ? [] : await Promise.all(entries.map(entry => member(entry.name)))
if (memberRootMissing || (remoteBuild && !indexed.some(member => member.documentCount > 0))) { await preserveCommittedArtifacts(memberRootMissing ? 'members source root missing' : 'members source root has no allowed Markdown'); process.exit(0) }
const shared = [{ id: 'project-context', category: '프로젝트 공통 사실', scope: 'project', author: 'project', path: 'projects/PROJECT_CONTEXT.md' }, { id: 'synthesis-index', category: '종합 초안', scope: 'synthesis', author: 'synthesis', path: 'synthesis/README.md' }, { id: 'decision-state', category: '공식 결정', scope: 'decision', author: 'decision-keeper', path: 'decisions/README.md' }]
const sharedDocuments = []; const sharedEvidence = []; for (const item of shared) try { const file = await load(join(repoRoot, item.path)); if (file) { const document = { ...item, source: source(file.absolute), title: title(file.text, item.id), updated: field(file.text, 'updated') || 'snapshot', status: field(file.text, 'status') || (item.scope === 'decision' ? 'no-recorded-decision' : 'unclassified'), excerpt: excerpt(file.text) }; sharedDocuments.push(document); sharedEvidence.push({ id: document.id, scope: document.scope, source: document.source, title: document.title, body: file.text }) } } catch {}
const documents = [...indexed.flatMap(item => item.documents), ...sharedDocuments]
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
const latestUpdated = documents.map(item => item.updated).filter(validDate).sort().at(-1) || '1970-01-01'
const projectBody = sharedEvidence.find(item => item.id === 'project-context')?.body || ''
const projectContext = { scope: 'project', source: 'projects/PROJECT_CONTEXT.md', title: '프로젝트 공통 맥락', goal: section(projectBody, 'Goal') || section(projectBody, '프로젝트 아이디어'), coreQuestion: section(projectBody, 'Core question'), expansion: section(projectBody, 'Open extension') || section(projectBody, '미래 확장 아이디어'), status: section(projectBody, 'Current status') || section(projectBody, '현재 상태'), flow: projectBody ? ['Wiki 기록', 'Guild avatar', '근거 확인'] : [] }
const snapshot = { generatedAt: `${latestUpdated}T00:00:00.000Z`, sourceState: indexed.length ? 'indexed' : 'verified-empty', boundary: 'WIKI SNAPSHOT · server-side LLM grounding when configured · explicit deterministic demo fallback · no browser filesystem access', decisionState: 'Official decisions are represented only by decisions/ documents.', projectContext, members: indexed.map(({ documents: memberDocuments, evidence, ...item }) => item), documents }
await mkdir(dirname(output), { recursive: true }); await mkdir(dirname(evidenceOutput), { recursive: true }); await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`); await writeFile(evidenceOutput, `${JSON.stringify({ version: 2, documents: [...indexed.flatMap(item => item.evidence.map(record => ({ ...record, scope: 'personal' }))), ...sharedEvidence] }, null, 2)}\n`)
console.log(`Wrote ${relative(appRoot, output)} for ${indexed.length} members and ${snapshot.documents.length} documents.`)
