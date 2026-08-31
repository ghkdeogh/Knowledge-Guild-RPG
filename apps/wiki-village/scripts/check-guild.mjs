import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import snapshot from '../src/data/wiki-snapshot.json' with { type: 'json' }
import { activityBand, activityDescription, HEAD_OFFSET, inferGuildRole, memberActivity, repositoryPathState } from '../src/guild.js'

const expect = (value, message) => { if (!value) throw new Error(message) }
const now = new Date('2026-08-29T00:00:00.000Z')
const bands = [['2026-08-22', 'crafting'], ['2026-08-21', 'wandering'], ['2026-08-15', 'wandering'], ['2026-08-14', 'resting'], ['2026-07-31', 'resting'], ['2026-07-30', 'sleeping'], [null, 'neutral']]
for (const [date, id] of bands) expect(activityBand(date, now).id === id, `Activity band failed for ${date}`)
expect(activityDescription({ lastPublicActivity: '2026-08-22' }) === '최근 공개 경로 변경일 2026-08-22', 'Public activity description overstates repository metadata')
expect(activityDescription({}) === '최근 공개 경로 변경일을 확인하지 못함 · 중립 대기', 'Unavailable activity description is not neutral')
const staleMember = { id: 'atlas', activity: activityBand('2026-07-30', now) }
const refreshedRepository = { members: { atlas: { lastDate: '2026-08-22' } } }
expect(memberActivity(staleMember, refreshedRepository).lastPublicActivity === '2026-08-22' && memberActivity(staleMember, refreshedRepository).pose === activityBand('2026-08-22').pose, 'Refreshed public member date did not replace stale snapshot activity')
expect(memberActivity(staleMember, { members: { atlas: { lastDate: 'not-a-date' } } }).lastPublicActivity === '2026-07-30', 'Invalid refreshed member date replaced safe snapshot activity')

const explorerDocs = [{ id: 'a', title: 'Data source catalog', source: 'members/a/wiki/sources/catalog.md', category: '개인 Wiki' }]
const architectDocs = [{ id: 'b', title: 'Visual design concept', source: 'members/b/wiki/design/concept.md', category: '개인 Wiki' }]
expect(inferGuildRole(explorerDocs).id === 'explorer' && inferGuildRole(architectDocs).id === 'architect' && inferGuildRole([]).id === 'archivist', 'Guild role inference/default failed')
expect(inferGuildRole(explorerDocs).evidenceId === 'a' && inferGuildRole(architectDocs).evidenceId === 'b', 'Guild role mixed cross-member evidence')

const repository = { members: { atlas: { remoteNews: true, remoteTip: 'atlas-sha', dirty: true }, lumi: { remoteNews: false, remoteTip: null, dirty: true } } }
expect(repositoryPathState('atlas', repository).id === 'remote-news' && repositoryPathState('atlas', repository).pose === 'notice', 'Remote public Wiki metadata did not control the member pose')
expect(repositoryPathState('lumi', repository).id === 'local-dirty' && repositoryPathState('lumi', repository).pose === 'crafting', 'Dirty public Wiki metadata did not control the member pose')
expect(repositoryPathState('unknown', repository).id === 'unknown', 'Unknown member was assigned repository metadata')

expect(snapshot.projectState === 'FLOW_UNINITIALIZED' && snapshot.flow?.status === 'insufficient' && snapshot.members.length === 0 && !/example-member/.test(JSON.stringify(snapshot)), 'Initial snapshot is not an example-free insufficient-flow guild')
expect(snapshot.documents.every(document => document.scope !== 'personal' || (document.memberId && document.source.startsWith(`members/${document.memberId}/wiki/`))), 'Snapshot contains an unsafe personal document')
expect((snapshot.skills || []).every(skill => !Object.hasOwn(skill, 'body') && ['project', 'member'].includes(skill.scope)), 'Snapshot exposes skill body content or an invalid scope')

const root = resolve(import.meta.dirname, '..')
const [app, css, snapshotBuilder] = await Promise.all([readFile(resolve(root, 'src/App.jsx'), 'utf8'), readFile(resolve(root, 'src/styles.css'), 'utf8'), readFile(resolve(root, 'scripts/build-wiki-snapshot.mjs'), 'utf8')])
expect(HEAD_OFFSET.x === 1 && HEAD_OFFSET.y === -37, 'Guild sprite anchor contract changed unexpectedly')
expect(app.includes('PixelAvatar') && app.includes('memberHomePosition') && app.includes('publicMemberDocuments'), 'Member avatar/home snapshot data binding is missing')
expect(app.includes('publicMemberDocuments') && app.includes('publicMemberSkills') && app.includes('memberPublicChanges') && app.includes('memberActivity(member, repository)'), 'Member detail can cross member or scope boundaries or ignore refreshed activity')
expect(app.includes('purpose: {skill.purpose}') && app.includes('allowedScope: {skill.allowedScope}') && app.includes('readiness: {skill.readiness}'), 'Skill detail exposes more or less than safe metadata')
expect(css.includes('.villager-sprite') && css.includes('.pixel-house') && css.includes('.status-bubble') && css.includes('.source-link'), 'Pixel village, status bubble, or source styling is missing')
expect(snapshotBuilder.includes("`members/${memberId}/wiki`") && !snapshotBuilder.includes("'--', `members/${memberId}`"), 'Snapshot activity log can include private member-root changes')
console.log(`Validated ${snapshot.members.length} guild residents, public activity copy, safe member detail allowlists, and no-example snapshot.`)
