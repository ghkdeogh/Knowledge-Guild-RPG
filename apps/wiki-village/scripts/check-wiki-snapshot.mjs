import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildFlowSummary, isValidFlowSummary } from '../src/flow-summary.js'

const appRoot = resolve(import.meta.dirname, '..'); const snapshotPath = resolve(appRoot, 'src/data/wiki-snapshot.json'); const evidencePath = resolve(appRoot, 'server/wiki-evidence.json'); const run = async env => { const { execFile } = await import('node:child_process'); return new Promise((resolvePromise, reject) => execFile(process.execPath, ['scripts/build-wiki-snapshot.mjs'], { cwd: appRoot, env: { ...process.env, ...env } }, error => error ? reject(error) : resolvePromise())) }
const expect = (value, message) => { if (!value) throw new Error(message) }
await run({}); const firstSnapshot = await readFile(snapshotPath, 'utf8'); const firstEvidence = await readFile(evidencePath, 'utf8'); await run({}); expect(firstSnapshot === await readFile(snapshotPath, 'utf8') && firstEvidence === await readFile(evidencePath, 'utf8'), 'Snapshot output is not deterministic')
const snapshot = JSON.parse(firstSnapshot); const evidence = JSON.parse(firstEvidence)
expect(snapshot.version >= 7 && snapshot.projectState === 'FLOW_UNINITIALIZED' && snapshot.flow?.status === 'insufficient' && snapshot.members.length === 0 && snapshot.documents.length === 0 && evidence.documents.length === 0, 'Missing public Wiki records did not produce a clean insufficient flow artifact')
expect(isValidFlowSummary(snapshot.flow) && JSON.stringify(snapshot.manifest) === JSON.stringify(evidence.manifest) && snapshot.manifest.recordCount === 0, 'Uninitialized flow manifest is invalid')
const one = buildFlowSummary([{ source: 'members/atlas/wiki/notes/a.md', memberId: 'atlas', title: 'Release evidence', body: '---\ntopic: release evidence\nstance: support\nupdated: 2026-08-30\n---\n# Release evidence\n' }])
expect(one.status === 'observed' && one.memberCount === 1 && one.commonGround.length === 0 && one.differingViews.length === 0, 'One member record was represented as team agreement or disagreement')
const many = buildFlowSummary([
  { source: 'members/atlas/wiki/a.md', memberId: 'atlas', title: 'Release evidence', body: '---\ntopic: release evidence\nstance: support\nupdated: 2026-08-28\n---\n# Release evidence\n' },
  { source: 'members/lumi/wiki/b.md', memberId: 'lumi', title: 'Release evidence', body: '---\ntopic: release evidence\nstance: support\nupdated: 2026-08-29\n---\n# Release evidence\n' },
  { source: 'members/mori/wiki/c.md', memberId: 'mori', title: 'Release evidence', body: '---\ntopic: release evidence\nstance: concern\nupdated: 2026-08-30\n---\n# Release evidence\n' },
  { source: 'projects/wiki/questions.md', memberId: null, title: 'Question', body: '# Question\n- Unknown: release evidence needs a reproducible check.\n' },
  { source: 'members/atlas/CONTEXT.md', memberId: 'atlas', title: 'Private', body: '---\ntopic: secret\nstance: support\n---\n' },
])
expect(many.commonGround.length === 0 && many.differingViews.length === 1 && many.knowledgeGaps.length >= 1 && many.evidencePaths.every(path => !path.includes('CONTEXT')), 'Flow summary mixed unsafe paths or failed to separate explicit shared and contrasting stances')
expect(!isValidFlowSummary({ ...many, evidencePaths: ['members/atlas/CONTEXT.md'] }), 'Invalid private flow evidence was accepted')
expect(!isValidFlowSummary({ version: 1, status: 'observed', observedFlow: 'fabricated', frequentTopics: [], recentDirections: [], commonGround: [], differingViews: [], knowledgeGaps: [], nextResearchQuestions: [], evidencePaths: [], lastUpdatedAt: null }), 'Observed flow without evidence was accepted')
expect(!isValidFlowSummary({ ...many, differingViews: [{ topic: 'release evidence', evidencePaths: many.evidencePaths }] }), 'Malformed differing-view detail was accepted')
const builder = await readFile(resolve(appRoot, 'scripts/build-wiki-snapshot.mjs'), 'utf8'); expect(builder.includes("join(repoRoot, 'projects', 'wiki')") && builder.includes("join(membersRoot, memberId, 'wiki')") && !builder.includes('parseMemberContext') && !builder.includes('PROJECT_CONTEXT.md') && !builder.includes('WIKI_SCHEMA.md'), 'Snapshot builder reads outside public Wiki boundaries')
await run({ VERCEL: '1', WIKI_VILLAGE_SIMULATE_SOURCE_MISSING: '1' }); expect(firstSnapshot === await readFile(snapshotPath, 'utf8') && firstEvidence === await readFile(evidencePath, 'utf8'), 'Remote missing-source build overwrote the safe artifact')
const stale = JSON.parse(firstSnapshot); stale.flow.evidencePaths = ['members/atlas/CONTEXT.md']; await writeFile(snapshotPath, `${JSON.stringify(stale, null, 2)}\n`)
try { await run({ VERCEL: '1', WIKI_VILLAGE_SIMULATE_SOURCE_MISSING: '1' }); throw new Error('Invalid flow artifact was preserved') } catch (error) { if (error.message === 'Invalid flow artifact was preserved') throw error } finally { await writeFile(snapshotPath, firstSnapshot) }
console.log('Validated deterministic public-only emergent flow, insufficient state, explicit stance separation, and invalid-flow fail-closed behavior.')
