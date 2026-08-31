import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { homeSpots, memberHomeIsClearOfPersistentUi, memberHomePosition } from '../src/village-layout.js'
import { canRenderVillage, memberPublicChanges, publicMemberDocuments, publicMemberSkills } from '../src/village-view.js'

const root = resolve(import.meta.dirname, '..')
const [app, css, vite] = await Promise.all([
  readFile(resolve(root, 'src/App.jsx'), 'utf8'),
  readFile(resolve(root, 'src/styles.css'), 'utf8'),
  readFile(resolve(root, 'vite.config.js'), 'utf8'),
])
const expect = (value, message) => { if (!value) throw new Error(message) }

expect(app.includes('CLI에서 프로젝트를 시작하세요') && app.includes('--command analyze'), 'Empty snapshot does not show the minimal CLI analyze command')
expect(app.includes('canRenderVillage(snapshot)'), 'Empty-state project guard is missing')
expect(app.includes('GuildHall') && app.includes("snapshot.projectState === 'PROJECT_READY'") && app.includes('member scaffold는 CLI에서 완성하세요'), 'Project-only village guard is missing')
expect(app.includes('MemberDetail') && app.includes('SourcePreview') && app.includes('스킬 metadata'), 'Read-only member detail or source preview is missing')
expect(app.includes('publicMemberDocuments') && app.includes('publicMemberSkills') && app.includes('memberPublicChanges'), 'Member detail does not use the tested public-data boundary helpers')
expect(app.includes("fetch('/api/repository-status', { method: 'POST' })") && app.includes('refreshInFlight.current') && app.includes('disabled={isRefreshing}') && app.includes('role="status" aria-live="polite"'), 'Serialized repository refresh or its status announcement is missing')
expect(app.includes("snapshot.projectState === 'VILLAGE_READY' && (snapshot.members || []).map"), 'Members render outside the valid village-ready state')
expect(app.includes('member-modal-backdrop') && app.includes('dialogRef.current?.querySelectorAll') && app.includes('closeSource()'), 'Member modal backdrop, focus trap, or source-focus restoration is missing')
for (const retired of ['Onboarding', 'MissionBoard', 'AnswerPanel', 'AnswerBubble', 'GuildAnswerScroll', 'HouseInterior', '/api/wiki-chat', '/api/onboarding-state', '<input', '<textarea']) expect(!app.includes(retired), `Retired browser surface remains: ${retired}`)
expect(!vite.includes('wiki-chat') && !vite.includes('onboarding') && vite.includes('repositoryStatusMiddleware'), 'Dev middleware exposes retired onboarding/chat routes')
expect(css.includes('.status-bubble') && css.includes('@media(max-width:520px){') && css.includes('.status-bubble{display:none}'), 'Small-screen bubble hiding contract is missing')
expect(css.includes('.member-modal-backdrop') && css.includes('.member-detail') && css.includes('.source-preview') && css.includes('@media(prefers-reduced-motion:no-preference)'), 'Read-only modal/backdrop or reduced-motion styles are missing')
for (const index of [...homeSpots.keys(), homeSpots.length, homeSpots.length + 1]) {
  const spot = memberHomePosition(index)
  expect(memberHomeIsClearOfPersistentUi(spot, 'desktop') && memberHomeIsClearOfPersistentUi(spot, 'mobile'), `Member home ${index} overlaps a persistent UI region`)
}
const member = { id: 'atlas', documentIds: ['atlas-public', 'atlas-private-path', 'lumi-public', 'project-record'] }
const documents = [{ id: 'atlas-public', scope: 'personal', memberId: 'atlas', source: 'members/atlas/wiki/index.md' }, { id: 'atlas-private-path', scope: 'personal', memberId: 'atlas', source: 'members/atlas/CONTEXT.md' }, { id: 'lumi-public', scope: 'personal', memberId: 'lumi', source: 'members/lumi/wiki/index.md' }, { id: 'project-record', scope: 'project', memberId: null, source: 'projects/wiki/index.md' }]
const skills = [{ id: 'atlas-skill', scope: 'member', memberId: 'atlas' }, { id: 'lumi-skill', scope: 'member', memberId: 'lumi' }, { id: 'project-skill', scope: 'project', memberId: null }]
const repository = { remoteNews: [{ scope: 'member', memberId: 'atlas', path: 'members/atlas/wiki/a.md' }, { scope: 'project', memberId: 'atlas', path: 'projects/wiki/unsafe.md' }], dirty: [{ scope: 'member', memberId: 'lumi', path: 'members/lumi/wiki/b.md' }] }
expect(!canRenderVillage({ projectState: 'PROJECT_UNINITIALIZED', projectContext: null }) && !canRenderVillage({ projectState: 'PROJECT_READY', projectContext: {} }) && !canRenderVillage({ projectState: 'UNKNOWN', projectContext: { title: 'Project' } }) && canRenderVillage({ projectState: 'PROJECT_READY', projectContext: { title: 'Project' } }), 'Project state projection is not honest')
expect(publicMemberDocuments(member, documents).map(document => document.id).join(',') === 'atlas-public', 'Member document allowlist crossed scope or member boundary')
expect(publicMemberSkills(member, skills).map(skill => skill.id).join(',') === 'atlas-skill', 'Member skill metadata crossed a member boundary')
expect(memberPublicChanges(repository, 'atlas').map(item => item.path).join(',') === 'members/atlas/wiki/a.md', 'Member change metadata crossed scope or member boundary')
console.log('Validated CLI empty state, read-only village/detail boundaries, repository refresh, and responsive layout.')
