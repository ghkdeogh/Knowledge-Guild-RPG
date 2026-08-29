import { readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const snapshotPath = join(appRoot, 'src', 'data', 'wiki-snapshot.json'); const evidencePath = join(appRoot, 'server', 'wiki-evidence.json'); const run = promisify(execFile)
const build = env => run(process.execPath, ['scripts/build-wiki-snapshot.mjs'], { cwd: appRoot, env: { ...process.env, ...env } })
await build({})
const firstSnapshot = await readFile(snapshotPath, 'utf8'); const firstEvidence = await readFile(evidencePath, 'utf8')
await build({})
if (firstSnapshot !== await readFile(snapshotPath, 'utf8') || firstEvidence !== await readFile(evidencePath, 'utf8')) throw new Error('Snapshot output is not deterministic')
const snapshot = JSON.parse(firstSnapshot); const evidence = JSON.parse(firstEvidence)
if (snapshot.version < 6 || snapshot.projectState !== 'PROJECT_UNINITIALIZED' || snapshot.projectContext || snapshot.members.length || snapshot.documents.length || evidence.documents.length || (snapshot.skills || []).length) throw new Error('Missing canonical context did not produce a clean PROJECT_UNINITIALIZED artifact')
if (JSON.stringify(snapshot.manifest) !== JSON.stringify(evidence.manifest) || snapshot.manifest.recordCount !== 0) throw new Error('Uninitialized artifact manifest is invalid')
if (/example-member/.test(`${firstSnapshot}\n${firstEvidence}`)) throw new Error('Example member leaked into production artifacts')
const builder = await readFile(join(appRoot, 'scripts', 'build-wiki-snapshot.mjs'), 'utf8'); if (!builder.includes("'private'") || !builder.includes("'secrets'")) throw new Error('Private/secrets source exclusions are missing')
await build({ VERCEL: '1', WIKI_VILLAGE_SIMULATE_SOURCE_MISSING: '1' })
if (firstSnapshot !== await readFile(snapshotPath, 'utf8') || firstEvidence !== await readFile(evidencePath, 'utf8')) throw new Error('Remote missing-source build overwrote the safe uninitialized artifact')
const staleEvidence = JSON.parse(firstEvidence); staleEvidence.manifest.contentDigest = '0'.repeat(64); await writeFile(evidencePath, `${JSON.stringify(staleEvidence, null, 2)}\n`)
try { await build({ VERCEL: '1', WIKI_VILLAGE_SIMULATE_SOURCE_MISSING: '1' }); throw new Error('Mismatched artifact was preserved') } catch (error) { if (error.message === 'Mismatched artifact was preserved') throw error } finally { await writeFile(evidencePath, firstEvidence) }
console.log('Validated deterministic PROJECT_UNINITIALIZED snapshot, empty evidence, manifest matching, and example-member exclusion.')
