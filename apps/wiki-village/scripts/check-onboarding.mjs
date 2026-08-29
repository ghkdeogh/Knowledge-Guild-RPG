import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getOnboardingState, previewMember, previewProject, saveMember, saveProject } from '../server/onboarding.mjs'

const root = await mkdtemp(join(tmpdir(), 'knowledge-guild-onboarding-'))
const project = { projectName: '온보딩 길드', summary: '인터뷰로 태어나는 Wiki 마을 #1', problem: '시작 전에 개인 관점과 공통 사실이 섞인다.', audience: '함께 프로젝트를 시작하는 팀', outcome: '확인 가능한 project context와 개인 Wiki를 만든다.' }
const member = { memberId: 'daeho-hwang', identity: '대호', perspective: '개인 관점은 공통 사실과 분리되어야 한다.', role: '온보딩 설계', dataCollection: '인터뷰 답변과 확인된 Wiki 기록', desiredOutcome: '근거를 확인할 수 있는 마을 경험' }

try {
  await mkdir(join(root, 'projects'), { recursive: true }); await mkdir(join(root, 'members'), { recursive: true })
  if ((await getOnboardingState({ repoRoot: root })).phase !== 'PROJECT_UNINITIALIZED') throw new Error('Missing canonical project did not start uninitialized')
  await writeFile(join(root, 'projects', 'PROJECT_CONTEXT.md'), '# placeholder\n')
  if ((await getOnboardingState({ repoRoot: root })).phase !== 'PROJECT_UNINITIALIZED') throw new Error('Placeholder project context initialized the app')
  await rm(join(root, 'projects', 'PROJECT_CONTEXT.md'))
  const projectPreview = previewProject(project)
  if (projectPreview.files[0].path !== 'projects/PROJECT_CONTEXT.md' || !projectPreview.files[0].content.includes('knowledge-guild-project-context/v1')) throw new Error('Project preview schema is incomplete')
  const afterProject = await saveProject(project, { repoRoot: root, refresh: false })
  if (afterProject.phase !== 'MEMBER_ONBOARDING') throw new Error('Project save did not enter member onboarding')
  const context = await readFile(join(root, 'projects', 'PROJECT_CONTEXT.md'), 'utf8')
  if (!context.includes('knowledgeType: fact') || !context.includes(project.problem)) throw new Error('Project context schema/content is incomplete')
  await saveProject(project, { repoRoot: root, refresh: false }).then(() => { throw new Error('Canonical project overwrite accepted') }, error => { if (error.status !== 409) throw error })
  await saveMember({ ...member, memberId: '../escape' }, { repoRoot: root, refresh: false }).then(() => { throw new Error('Traversal member id accepted') }, error => { if (error.code !== 'invalid-member-id') throw error })
  const memberPreview = previewMember(member)
  if (memberPreview.files.map(file => file.path).join('|') !== 'members/daeho-hwang/CONTEXT.md|members/daeho-hwang/WIKI_SCHEMA.md|members/daeho-hwang/wiki/index.md') throw new Error('Member preview contains unexpected paths')
  const afterMember = await saveMember(member, { repoRoot: root, refresh: false })
  if (afterMember.phase !== 'VILLAGE_READY' || afterMember.members[0]?.id !== member.memberId) throw new Error('Member save did not enter village state')
  for (const file of memberPreview.files) { const content = await readFile(join(root, file.path), 'utf8'); if (!content.includes('knowledge-guild-member-context/v1')) throw new Error(`Generated member schema missing: ${file.path}`) }
  await writeFile(join(root, 'members', member.memberId, 'wiki', 'index.md'), '---\nschema: knowledge-guild-member-context/v1\nmemberId: daeho-hwang\nknowledgeType: personal-opinion\n---\n\n# Incomplete\n')
  if ((await getOnboardingState({ repoRoot: root })).phase !== 'MEMBER_ONBOARDING') throw new Error('Incomplete member files produced a valid village resident')
  await saveMember(member, { repoRoot: root, refresh: false }).then(() => { throw new Error('Duplicate member overwrite accepted') }, error => { if (error.status !== 409) throw error })
  const readonlyRoot = await mkdtemp(join(tmpdir(), 'knowledge-guild-readonly-'))
  try {
    await mkdir(join(readonlyRoot, 'projects'), { recursive: true }); await mkdir(join(readonlyRoot, 'members'), { recursive: true })
    await saveProject(project, { repoRoot: readonlyRoot, readOnly: true, refresh: false }).then(() => { throw new Error('Read-only project save accepted') }, error => { if (error.code !== 'read-only') throw error })
    if ((await getOnboardingState({ repoRoot: readonlyRoot, readOnly: true })).persistenceMode !== 'read-only-demo') throw new Error('Read-only mode was not explicit')
  } finally { await rm(readonlyRoot, { recursive: true, force: true }) }
  console.log('Validated project/member onboarding states, canonical Markdown, collision/traversal guards, and read-only persistence.')
} finally { await rm(root, { recursive: true, force: true }) }
