import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { advanceProfileOnboarding, startProfileOnboarding } from '../server/profile-onboarding.mjs'

const expect = (value, message) => { if (!value) throw new Error(message) }
const eventOf = (response, type) => response.events.find(item => item.type === type)
const root = await mkdtemp(join(tmpdir(), 'knowledge-guild-profile-onboarding-'))
const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const runCli = input => new Promise((resolvePromise, reject) => {
  const child = spawn(process.execPath, ['scripts/profile-onboarding-cli.mjs', '--repo-root', root], { cwd: appRoot, stdio: ['pipe', 'pipe', 'pipe'] })
  let stdout = ''; let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk }); child.stderr.on('data', chunk => { stderr += chunk })
  child.on('error', reject); child.on('close', code => code === 0 ? resolvePromise(stdout.trim().split('\n').filter(Boolean).map(JSON.parse)) : reject(new Error(stderr || `CLI exited ${code}`)))
  child.stdin.end(Array.isArray(input) ? input.map(line => JSON.stringify(line)).join('\n') : input)
})
const toPreview = async (memberId, displayName, answers) => {
  let flow = await startProfileOnboarding({ memberId }, { repoRoot: root }); flow = await advanceProfileOnboarding(flow.state, { action: 'answer', answer: displayName }, { repoRoot: root }); flow = await advanceProfileOnboarding(flow.state, { action: 'privacy', approved: true }, { repoRoot: root })
  for (const answer of answers) flow = await advanceProfileOnboarding(flow.state, { action: 'answer', answer }, { repoRoot: root })
  return flow
}
try {
  await mkdir(join(root, 'members', 'mina', 'vault'), { recursive: true }); await mkdir(join(root, 'members', 'other'), { recursive: true }); await mkdir(join(root, 'projects'), { recursive: true })
  await writeFile(join(root, 'members', 'mina', 'vault', '나의 핵심 맥락.md'), '# 기존 메모\n\n읽어도 되는 개인 seed입니다.'); await writeFile(join(root, 'members', 'other', '나의 핵심 맥락.md'), '다른 member seed')
  await mkdir(join(root, 'members', 'directory-seed', '나의 핵심 맥락.md'), { recursive: true }); await mkdir(join(root, 'members', 'english-seed'), { recursive: true }); await writeFile(join(root, 'members', 'english-seed', 'my-core-context.md'), 'English seed')
  await startProfileOnboarding({ memberId: '../other' }, { repoRoot: root }).then(() => { throw new Error('Traversal member id was accepted') }, error => expect(error.code === 'invalid-member-id', 'Traversal did not fail closed'))
  let flow = await startProfileOnboarding({ memberId: 'mina' }, { repoRoot: root }); expect(flow.state.phase === 'name' && eventOf(flow, 'question.asked')?.id === 'display-name', 'Onboarding did not ask for name first')
  await advanceProfileOnboarding(flow.state, { action: 'answer', answers: ['too early'] }, { repoRoot: root }).then(() => { throw new Error('Multiple answers were accepted') }, error => expect(error.code === 'one-answer-at-a-time', 'Multiple answers did not fail closed'))
  flow = await advanceProfileOnboarding(flow.state, { action: 'answer', answer: '민아' }, { repoRoot: root }); expect(flow.state.phase === 'privacy' && eventOf(flow, 'privacy.warning'), 'Privacy warning did not precede the interview')
  await advanceProfileOnboarding(flow.state, { action: 'answer', answer: '성급한 답변' }, { repoRoot: root }).then(() => { throw new Error('Answer before privacy confirmation was accepted') }, error => expect(error.code === 'privacy-confirmation-required', 'Early answer had the wrong error'))
  flow = await advanceProfileOnboarding(flow.state, { action: 'privacy', approved: true }, { repoRoot: root }); expect(flow.state.phase === 'question' && eventOf(flow, 'seed.loaded')?.path === 'members/mina/vault/나의 핵심 맥락.md' && eventOf(flow, 'question.asked')?.id === 'identity', 'Approved seed or first topic was not isolated to selected member')
  await advanceProfileOnboarding(flow.state, { action: 'answer', answer: '절대 저장하면 안 되는 비공개 정보', private: true }, { repoRoot: root }).then(() => { throw new Error('Private answer was accepted into shared profile flow') }, error => expect(error.code === 'private-answer-not-supported', 'Private answer did not stop before persistence'))
  const answers = ['제품 기획자이자 연구자로서, 구조화와 정직함을 중요하게 여깁니다.', '흩어진 메모 때문에 판단 근거를 잃어버려서, 연결된 기록을 만들고 싶습니다.', '동료가 읽을 짧은 Markdown 요약과 1년 뒤 다시 쓸 수 있는 지식 지도를 원합니다.']
  for (let index = 0; index < answers.length; index += 1) {
    flow = await advanceProfileOnboarding(flow.state, { action: 'answer', answer: answers[index] }, { repoRoot: root })
    expect(eventOf(flow, 'answer.summarized'), `Answer ${index + 1} did not receive a faithful summary`)
    if (index < 2) expect(eventOf(flow, 'question.asked')?.id === ['recording', 'outputs'][index], `Question ${index + 2} was not asked one-at-a-time`)
  }
  expect(flow.state.phase === 'preview' && eventOf(flow, 'profile.synthesized')?.heading === '나의 맥락 요약', 'Third response did not synthesize the profile')
  const preview = flow.result.preview; expect(preview.files.map(file => file.path).join(',') === 'members/mina/PROFILE.md,members/mina/CONTEXT.md' && preview.files.every(file => !file.path.startsWith('projects/')), 'Preview leaked outside the selected member scope')
  const profilePlan = preview.files.find(file => file.path.endsWith('PROFILE.md')).content; const contextPlan = preview.files.find(file => file.path.endsWith('CONTEXT.md')).content
  expect(profilePlan.includes('## 사실로 확인된 내용') && profilePlan.includes('## 나의 관점과 선호') && contextPlan.includes('## 나는 누구인가') && contextPlan.includes('## 나의 역할들') && contextPlan.includes('## 나의 비전과 목표') && contextPlan.includes('## AI에게 기대하는 것') && contextPlan.includes('## 작업 규칙'), 'PROFILE or provider-neutral CONTEXT schema is incomplete')
  await advanceProfileOnboarding(flow.state, { action: 'save', expectedDigest: preview.digest }, { repoRoot: root }).then(() => { throw new Error('Save without approval was accepted') }, error => expect(error.code === 'approval-required', 'Unapproved save had wrong error'))
  flow = await advanceProfileOnboarding(flow.state, { action: 'approve', expectedDigest: preview.digest }, { repoRoot: root }); expect(flow.state.phase === 'approved', 'Digest approval did not advance the session')
  flow = await advanceProfileOnboarding(flow.state, { action: 'save', expectedDigest: preview.digest }, { repoRoot: root }); expect(flow.state.phase === 'saved', 'Approved save did not complete')
  const persistedProfile = await readFile(join(root, 'members', 'mina', 'PROFILE.md'), 'utf8'); expect(persistedProfile.includes('나의 맥락 요약') && !persistedProfile.includes('절대 저장하면 안 되는 비공개 정보') && (await readFile(join(root, 'members', 'mina', 'CONTEXT.md'), 'utf8')).includes('provider-neutral'), 'Generated profile files are missing or leaked private input')
  expect(!(await readFile(join(root, 'projects', 'PROFILE.md'), 'utf8').then(() => true).catch(() => false)) && await readFile(join(root, 'members', 'other', '나의 핵심 맥락.md'), 'utf8') === '다른 member seed', 'Onboarding wrote projects or another member')
  const collision = await startProfileOnboarding({ memberId: 'mina' }, { repoRoot: root }); expect(collision.state.phase === 'name', 'Existing personal files blocked a safe preview-only restart')
  let collisionFlow = await advanceProfileOnboarding(collision.state, { action: 'answer', answer: '민아' }, { repoRoot: root }); collisionFlow = await advanceProfileOnboarding(collisionFlow.state, { action: 'privacy', approved: true }, { repoRoot: root })
  for (const answer of answers) collisionFlow = await advanceProfileOnboarding(collisionFlow.state, { action: 'answer', answer }, { repoRoot: root })
  collisionFlow = await advanceProfileOnboarding(collisionFlow.state, { action: 'approve', expectedDigest: collisionFlow.result.preview.digest }, { repoRoot: root })
  await advanceProfileOnboarding(collisionFlow.state, { action: 'save', expectedDigest: collisionFlow.state.approvedDigest }, { repoRoot: root }).then(() => { throw new Error('Existing PROFILE/CONTEXT collision was accepted') }, error => expect(error.code === 'collision', 'Existing profile collision had wrong error'))
  const noSeed = await startProfileOnboarding({ memberId: 'no-seed' }, { repoRoot: root }); const noSeedNamed = await advanceProfileOnboarding(noSeed.state, { action: 'answer', answer: '빈 seed' }, { repoRoot: root }); const noSeedPrivacy = await advanceProfileOnboarding(noSeedNamed.state, { action: 'privacy', approved: true }, { repoRoot: root }); expect(eventOf(noSeedPrivacy, 'seed.missing'), 'Missing seed was not reported safely')
  const english = await startProfileOnboarding({ memberId: 'english-seed' }, { repoRoot: root }); const englishNamed = await advanceProfileOnboarding(english.state, { action: 'answer', answer: '영문 seed' }, { repoRoot: root }); const englishPrivacy = await advanceProfileOnboarding(englishNamed.state, { action: 'privacy', approved: true }, { repoRoot: root }); expect(eventOf(englishPrivacy, 'seed.loaded')?.path === 'members/english-seed/my-core-context.md', 'Root-level English allowlisted seed was not loaded')
  const directory = await startProfileOnboarding({ memberId: 'directory-seed' }, { repoRoot: root }); const directoryNamed = await advanceProfileOnboarding(directory.state, { action: 'answer', answer: '디렉터리 seed' }, { repoRoot: root }); await advanceProfileOnboarding(directoryNamed.state, { action: 'privacy', approved: true }, { repoRoot: root }).then(() => { throw new Error('Seed directory was read as a file') }, error => expect(error.code === 'invalid-seed', 'Seed directory did not fail closed'))
  const partial = await toPreview('partial-collision', '부분 충돌', answers); await mkdir(join(root, 'members', 'partial-collision'), { recursive: true }); await writeFile(join(root, 'members', 'partial-collision', 'PROFILE.md'), '기존 프로필'); const partialApproved = await advanceProfileOnboarding(partial.state, { action: 'approve', expectedDigest: partial.result.preview.digest }, { repoRoot: root }); await advanceProfileOnboarding(partialApproved.state, { action: 'save', expectedDigest: partialApproved.state.approvedDigest }, { repoRoot: root }).then(() => { throw new Error('Single-file collision was accepted') }, error => expect(error.code === 'collision', 'Single-file collision had wrong error')); expect(await readFile(join(root, 'members', 'partial-collision', 'PROFILE.md'), 'utf8') === '기존 프로필' && !(await readFile(join(root, 'members', 'partial-collision', 'CONTEXT.md'), 'utf8').then(() => true).catch(() => false)), 'Single-file collision left a partial write')
  const cliFlow = await toPreview('cli-member', 'CLI 사용자', answers); const cliDigest = cliFlow.result.preview.digest
  const cliEvents = await runCli([{ action: 'start', memberId: 'cli-member' }, { action: 'answer', answer: 'CLI 사용자' }, { action: 'privacy', approved: true }, ...answers.map(answer => ({ action: 'answer', answer })), { action: 'approve', expectedDigest: cliDigest }, { action: 'save', expectedDigest: cliDigest }]); expect(cliEvents.filter(item => item.type === 'question.asked').map(item => item.id).join(',') === 'display-name,identity,recording,outputs' && cliEvents.some(item => item.type === 'files.written') && cliEvents.some(item => item.type === 'result') && await readFile(join(root, 'members', 'cli-member', 'CONTEXT.md'), 'utf8'), 'Streaming JSONL CLI did not verify preview approval and persistence')
  const cliErrors = await runCli('{not json\n{"action":"answer","answer":"too early"}\n'); expect(cliErrors.filter(item => item.type === 'validation.failed').map(item => item.code).join(',') === 'cli-error,invalid-session', 'CLI malformed JSON or command-before-start errors are not reported')
  console.log('Validated profile-first JSONL flow, exactly three interview topics, summary events, privacy/seed boundaries, preview approval, collisions, and provider-neutral context output.')
} finally { await rm(root, { recursive: true, force: true }) }
