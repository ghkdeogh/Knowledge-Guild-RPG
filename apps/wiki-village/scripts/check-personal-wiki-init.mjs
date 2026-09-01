import { access, lstat, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { advancePersonalWikiInit, savePersonalWikiInit, startPersonalWikiInit } from '../server/personal-wiki-initializer.mjs'
import { classifyWikiPath } from '../core/repository-status.mjs'
import { loadProfileProviderConfig, parseProfileProviderEnv } from '../server/profile-provider-config.mjs'

const fail = message => { throw new Error(message) }
const expect = (value, message) => { if (!value) fail(message) }
const absent = path => access(path).then(() => false).catch(() => true)
const root = await mkdtemp(join(tmpdir(), 'personal-wiki-init-'))
await mkdir(join(root, 'prompts'), { recursive: true }); await writeFile(join(root, 'prompts', 'llm-wiki.md'), '# Test LLM Wiki principles\n')
const fixture = async (id, profile, context) => { const member = join(root, 'members', id); await mkdir(member, { recursive: true }); await writeFile(join(member, 'PROFILE.md'), profile); await writeFile(join(member, 'CONTEXT.md'), context); return member }
const profile = (heading, details) => `# ${heading}\n\n## 나의 맥락 요약\n\n- ${details}\n\n## 원하는 결과물\n\n- ${details}\n`
const context = details => `# Member Context\n\n## 작업 규칙\n\n- ${details}\n`
await mkdir(join(root, 'projects'), { recursive: true }); await writeFile(join(root, 'projects', 'private-marker.md'), 'must remain unread and unchanged')
const spectator = await fixture('spectator', profile('spectator', '창작 참고 자료와 초안을 보관하고 결과물을 만든다.'), context('창작 참고 자료와 초안을 보관하고 결과물을 만든다.'))
const runFresh = async (id, text) => {
  await fixture(id, profile(`${id} profile`, text), context(text))
  const started = await startPersonalWikiInit({ memberId: id }, { repoRoot: root })
  expect(started.state.phase === 'preview', `${id}: expected evidence-backed preview`)
  const paths = started.result.preview.files.map(file => file.path)
  expect(paths.some(path => path.endsWith('/raw/CONTEXT.md')) && paths.some(path => path.endsWith('/wiki/index.md')) && paths.some(path => path.endsWith('/wiki/log.md')) && paths.some(path => path.endsWith('/output/CONTEXT.md')), `${id}: required files missing`)
  expect(!paths.some(path => /WIKI_INDEX|ACTIVITY_LOG|harnesses/.test(path)), `${id}: old scaffold leaked`)
  const approved = await advancePersonalWikiInit(started.state, { action: 'approve', expectedDigest: started.result.preview.digest }, { repoRoot: root })
  const saved = await savePersonalWikiInit(approved.state, { action: 'save', expectedDigest: started.result.preview.digest }, { repoRoot: root })
  expect(saved.state.phase === 'saved', `${id}: save failed`)
  return { paths, member: join(root, 'members', id) }
}

const research = await runFresh('researcher', '연구 논문과 데이터로 실험을 조사하고 조사 보고서를 만든다.')
const product = await runFresh('planner', '제품 기획에서 고객 피드백과 회의 메모를 분석해 제품 명세와 보고서를 만든다.')
const creative = await runFresh('writer', '창작 소설의 세계관과 인물에 대한 참고 자료와 초안을 모아 글쓰기 결과물을 만든다.')
expect(new Set([research.paths.join('|'), product.paths.join('|'), creative.paths.join('|')]).size === 3, 'three domains produced the same structure')
for (const item of [research, product, creative]) {
  expect(await lstat(join(item.member, 'raw', 'CONTEXT.md')).then(file => file.isFile()), 'raw context missing')
  expect(await lstat(join(item.member, 'wiki', 'CONTEXT.md')).then(file => file.isFile()), 'wiki context missing')
  expect(await lstat(join(item.member, 'output', 'CONTEXT.md')).then(file => file.isFile()), 'output context missing')
  expect(await absent(join(item.member, 'WIKI_INDEX.md')) && await absent(join(item.member, 'ACTIVITY_LOG.md')) && await absent(join(item.member, 'harnesses')), 'old files were written')
}
const before = await readFile(join(product.member, 'CONTEXT.md'))
expect(before.subarray(0, Buffer.byteLength(context('제품 기획에서 고객 피드백과 회의 메모를 분석해 제품 명세와 보고서를 만든다.'))).equals(Buffer.from(context('제품 기획에서 고객 피드백과 회의 메모를 분석해 제품 명세와 보고서를 만든다.'))), 'CONTEXT original bytes were not preserved as prefix')
expect((before.toString('utf8').match(/wiki-operation-rules:start/g) || []).length === 1, 'managed rules block missing or duplicated')

await mkdir(join(root, 'members', 'empty'), { recursive: true }); await writeFile(join(root, 'members', 'empty', 'PROFILE.md'), '# Empty\n'); await writeFile(join(root, 'members', 'empty', 'CONTEXT.md'), '# Context\n')
const insufficient = await startPersonalWikiInit({ memberId: 'empty' }, { repoRoot: root })
expect(insufficient.result.status === 'insufficient-context' && await absent(join(root, 'members', 'empty', 'WIKI_SCHEMA.md')), 'insufficient input wrote files')

let providerCalls = 0
const fakeProvider = { responses: { create: async () => { providerCalls += 1; return { output_text: JSON.stringify({ raw: [{ id: 'papers', label: 'Papers', purpose: 'sources', evidence: ['PROFILE:researcher profile'], links: ['concepts'] }], wiki: [{ id: 'concepts', label: 'Concepts', purpose: 'knowledge', evidence: ['PROFILE:researcher profile'], links: ['reports'] }], output: [{ id: 'reports', label: 'Reports', purpose: 'result', evidence: ['PROFILE:researcher profile'], links: [] }] }) } } } }
const noConsent = await startPersonalWikiInit({ memberId: 'researcher' }, { repoRoot: root, responsesClient: fakeProvider, providerConfig: { apiKey: 'x' } })
expect(providerCalls === 0 && noConsent.result.providerStatus === 'not-consented', 'provider ran without consent')
const consent = await startPersonalWikiInit({ memberId: 'researcher', providerApproved: true }, { repoRoot: root, responsesClient: fakeProvider, providerConfig: { apiKey: 'x' } })
expect(providerCalls === 1 && consent.result.mode === 'llm-suggestion' && consent.result.preview.plan.raw[0].links[0] === 'concepts', 'consented provider map was not used safely')
expect(noConsent.result.preview.digest !== consent.result.preview.digest, 'mode-specific preview digest was not bound to its plan')
const unsafeProvider = { responses: { create: async () => ({ output_text: JSON.stringify({ raw: [{ id: '../escape', label: 'Bad', purpose: 'bad', evidence: ['PROFILE:researcher profile'], links: ['concepts'] }], wiki: [{ id: 'concepts', label: 'Concepts', purpose: 'knowledge', evidence: ['PROFILE:researcher profile'], links: ['reports'] }], output: [{ id: 'reports', label: 'Reports', purpose: 'result', evidence: ['PROFILE:researcher profile'], links: [] }] }) }) } }
const providerFallback = await startPersonalWikiInit({ memberId: 'researcher', providerApproved: true }, { repoRoot: root, responsesClient: unsafeProvider, providerConfig: { apiKey: 'x' } })
expect(providerFallback.result.mode === 'offline-conservative' && !providerFallback.result.preview.files.some(file => file.path.includes('escape')), 'unsafe provider path was accepted')

const legacy = await fixture('legacy', profile('legacy', '연구 논문과 데이터로 실험을 조사하고 조사 보고서를 만든다.'), context('연구 논문과 데이터로 실험을 조사하고 조사 보고서를 만든다.'))
await mkdir(join(legacy, 'harnesses')); await writeFile(join(legacy, 'WIKI_INDEX.md'), 'legacy')
const migration = await startPersonalWikiInit({ memberId: 'legacy' }, { repoRoot: root })
expect(migration.result.migration.required && migration.result.migration.changes.some(change => change.path === 'WIKI_INDEX.md'), 'legacy scaffold did not become migration preview')
const migrationApproved = await advancePersonalWikiInit(migration.state, { action: 'approve', expectedDigest: migration.result.preview.digest, migrationApproved: true }, { repoRoot: root })
await savePersonalWikiInit(migrationApproved.state, { action: 'save', expectedDigest: migration.result.preview.digest }, { repoRoot: root }).then(() => fail('migration save must fail closed'), error => expect(error.code === 'migration-manual-required', 'wrong migration failure'))
expect(await access(join(legacy, 'WIKI_INDEX.md')).then(() => true), 'legacy file was deleted')

const collision = await fixture('collision', profile('collision', '연구 논문과 데이터로 실험을 조사하고 조사 보고서를 만든다.'), context('연구 논문과 데이터로 실험을 조사하고 조사 보고서를 만든다.'))
const collisionStart = await startPersonalWikiInit({ memberId: 'collision' }, { repoRoot: root }); await writeFile(join(collision, 'WIKI_SCHEMA.md'), 'racing collision')
const collisionApproved = await advancePersonalWikiInit(collisionStart.state, { action: 'approve', expectedDigest: collisionStart.result.preview.digest }, { repoRoot: root })
await savePersonalWikiInit(collisionApproved.state, { action: 'save', expectedDigest: collisionStart.result.preview.digest }, { repoRoot: root }).then(() => fail('collision must fail'), error => expect(error.code === 'collision', 'wrong collision result'))
expect(await absent(join(collision, 'raw')), 'collision left partial writes')

const stale = await fixture('stale', profile('stale', '연구 논문과 데이터로 실험을 조사하고 조사 보고서를 만든다.'), context('연구 논문과 데이터로 실험을 조사하고 조사 보고서를 만든다.'))
const staleStart = await startPersonalWikiInit({ memberId: 'stale' }, { repoRoot: root }); await writeFile(join(stale, 'PROFILE.md'), profile('stale', '다른 프로필로 바뀌었다.'))
const staleApproved = await advancePersonalWikiInit(staleStart.state, { action: 'approve', expectedDigest: staleStart.result.preview.digest }, { repoRoot: root })
await savePersonalWikiInit(staleApproved.state, { action: 'save', expectedDigest: staleStart.result.preview.digest }, { repoRoot: root }).then(() => fail('changed profile must invalidate preview'), error => expect(error.code === 'preview-mismatch', 'profile change did not invalidate preview'))
expect(await absent(join(stale, 'raw')), 'stale preview left partial writes')

const outside = join(root, 'outside'); await mkdir(outside); const linked = join(root, 'members', 'linked'); await symlink(outside, linked, 'junction').catch(() => null)
if (await access(linked).then(() => true).catch(() => false)) await startPersonalWikiInit({ memberId: 'linked' }, { repoRoot: root }).then(() => fail('symlink member accepted'), error => expect(error.code === 'unsafe-path', 'symlink did not fail closed'))
expect(classifyWikiPath('members/researcher/raw/papers/a.md') === null && classifyWikiPath('members/researcher/output/reports/a.md') === null && classifyWikiPath('members/researcher/wiki/index.md')?.memberId === 'researcher', 'public status allowlist leaked private layers')
expect(parseProfileProviderEnv('OPENAI_MODEL=x\nEVIL=y').OPENAI_MODEL === 'x' && !(await loadProfileProviderConfig({ env: {}, envPath: join(root, 'missing.env') })).apiKey, 'provider env parsing is unsafe')
expect(await readFile(join(root, 'projects', 'private-marker.md'), 'utf8') === 'must remain unread and unchanged' && await readFile(join(spectator, 'PROFILE.md'), 'utf8') === profile('spectator', '창작 참고 자료와 초안을 보관하고 결과물을 만든다.'), 'initializer changed another scope')
console.log(JSON.stringify({ ok: true, root }))
