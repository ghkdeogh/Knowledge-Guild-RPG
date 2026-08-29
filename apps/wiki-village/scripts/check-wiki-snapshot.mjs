import { readdir, readFile, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import snapshot from '../src/data/wiki-snapshot.json' with { type: 'json' }

const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const snapshotPath = join(appRoot, 'src', 'data', 'wiki-snapshot.json')
const evidencePath = join(appRoot, 'server', 'wiki-evidence.json')
const run = promisify(execFile)
await run(process.execPath, ['scripts/build-wiki-snapshot.mjs'], { cwd: appRoot })
const firstSnapshot = await readFile(snapshotPath, 'utf8')
const firstEvidence = await readFile(evidencePath, 'utf8')
await run(process.execPath, ['scripts/build-wiki-snapshot.mjs'], { cwd: appRoot })
if (firstSnapshot !== await readFile(snapshotPath, 'utf8')) throw new Error('Snapshot output is not deterministic')
if (firstEvidence !== await readFile(evidencePath, 'utf8')) throw new Error('Server evidence output is not deterministic')
await run(process.execPath, ['scripts/build-wiki-snapshot.mjs'], { cwd: appRoot, env: { ...process.env, VERCEL: '1', WIKI_VILLAGE_SIMULATE_SOURCE_MISSING: '1' } })
if (firstSnapshot !== await readFile(snapshotPath, 'utf8') || firstEvidence !== await readFile(evidencePath, 'utf8')) throw new Error('Remote missing-source build overwrote committed safe artifacts')
const memberDirs = (await readdir(join(repoRoot, 'members'), { withFileTypes: true })).filter(entry => entry.isDirectory() && /^[a-z0-9-]+$/.test(entry.name)).map(entry => entry.name).sort()
const indexed = snapshot.members.map(member => member.id).sort()
if (JSON.stringify(memberDirs) !== JSON.stringify(indexed)) throw new Error(`Member mismatch: ${memberDirs} != ${indexed}`)
if (snapshot.sourceState !== 'indexed' || snapshot.projectContext?.scope !== 'project' || snapshot.projectContext?.source !== 'projects/PROJECT_CONTEXT.md' || !snapshot.projectContext.flow?.includes('Guild avatar')) throw new Error('Project context snapshot is missing or unsafe')
for (const document of snapshot.documents) {
  if (document.scope !== 'personal') continue
  if (/\.private\.md$|\/(raw|output|\.obsidian|node_modules)\//.test(document.source)) throw new Error(`Excluded path indexed: ${document.source}`)
  await stat(join(repoRoot, document.source))
}
const appSource = await readFile(join(repoRoot, 'apps/wiki-village/src/App.jsx'), 'utf8')
for (const member of snapshot.members) if (new RegExp(`['\"]${member.id}['\"]`, 'i').test(appSource)) throw new Error('Member-specific identifier remains in App.jsx')
if (!appSource.includes('snapshot.members.map') || !appSource.includes('MemberHome')) throw new Error('Member homes are not generated from the safe snapshot')
if (!appSource.includes("document?.scope === 'personal'") || !appSource.includes('document.memberId === member.id')) throw new Error('House Wiki boundary is missing')
if (!appSource.includes('HouseInterior') || !appSource.includes('filteredDocuments') || !appSource.includes('selectedDocument.source')) throw new Error('House Wiki browsing is incomplete')
console.log(`Validated ${indexed.length} members and ${snapshot.documents.length} indexed documents.`)
