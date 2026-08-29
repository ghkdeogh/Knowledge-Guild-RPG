import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import snapshot from '../src/data/wiki-snapshot.json' with { type: 'json' }
import { activityBand, confirmMemberSeen, HEAD_OFFSET, inferGuildRole, repositoryPathState, selectRepositoryBark } from '../src/guild.js'

const now = new Date('2026-08-29T00:00:00.000Z')
const bands = [['2026-08-22', 'crafting'], ['2026-08-21', 'wandering'], ['2026-08-15', 'wandering'], ['2026-08-14', 'resting'], ['2026-07-31', 'resting'], ['2026-07-30', 'sleeping'], [null, 'neutral']]
for (const [date, id] of bands) if (activityBand(date, now).id !== id) throw new Error(`Activity band failed for ${date}`)
const explorerDocs = [{ id: 'a', title: 'Data source catalog', source: 'members/a/wiki/sources/catalog.md', category: '개인 Wiki' }]
const architectDocs = [{ id: 'b', title: 'Visual design concept', source: 'members/b/wiki/design/concept.md', category: '개인 Wiki' }]
if (inferGuildRole(explorerDocs).id !== 'explorer' || inferGuildRole(architectDocs).id !== 'architect' || inferGuildRole([]).id !== 'archivist') throw new Error('Guild role inference/default failed')
if (inferGuildRole(explorerDocs).evidenceId !== 'a' || inferGuildRole(architectDocs).evidenceId !== 'b') throw new Error('Guild role mixed cross-member evidence')
const repository = { members: { atlas: { remoteNews: true, remoteTip: 'atlas-sha', dirty: true }, lumi: { remoteNews: false, remoteTip: null, dirty: true } }, project: { remoteNews: 1, dirty: 0 } }
const membersForProjection = [{ id: 'atlas' }, { id: 'lumi' }]
const firstBark = selectRepositoryBark(membersForProjection, repository, {}, {}); if (firstBark?.member.id !== 'atlas' || firstBark.state.id !== 'remote-news' || repositoryPathState('atlas', repository, {}).pose !== 'notice') throw new Error('Remote public Wiki news did not win the one-bark priority')
const seen = confirmMemberSeen({}, 'atlas', repository); if (seen.atlas !== 'atlas-sha' || confirmMemberSeen(seen, 'lumi', repository) !== seen) throw new Error('Seen SHA confirmation contract failed')
const nextBark = selectRepositoryBark(membersForProjection, repository, seen, {}); if (nextBark?.member.id !== 'atlas' || nextBark.state.id !== 'local-dirty') throw new Error('Confirmed remote news did not fall through to that member’s dirty public path')
const laterBark = selectRepositoryBark(membersForProjection, repository, seen, { [nextBark.key]: true }); if (laterBark?.member.id !== 'lumi' || laterBark.state.id !== 'local-dirty') throw new Error('Dismissed member bark did not advance to the next relevant member')
if (selectRepositoryBark(membersForProjection, { members: {}, project: { remoteNews: 2, dirty: 1 } }, {}, {}) !== null) throw new Error('Project-only changes were assigned to a member bark')
if (!snapshot.members.every(member => member.role?.id && member.activity?.pose && member.role.evidenceSource.startsWith(`members/${member.id}/`))) throw new Error('Snapshot guild metadata is incomplete or crosses a member boundary')
if (snapshot.projectState !== 'PROJECT_UNINITIALIZED' || snapshot.members.length || /example-member/.test(JSON.stringify(snapshot))) throw new Error('Initial snapshot is not an example-free uninitialized guild')
const root = resolve(import.meta.dirname, '..')
const app = await readFile(resolve(root, 'src/App.jsx'), 'utf8'); const css = await readFile(resolve(root, 'src/styles.css'), 'utf8')
if (HEAD_OFFSET.x !== 1 || HEAD_OFFSET.y !== -37) throw new Error('Guild sprite anchor contract changed unexpectedly')
if (!app.includes('PixelAvatar') || !app.includes('member.displayName') || !app.includes('documentIds')) throw new Error('Member avatar/home data binding is missing')
if (!app.includes("document.memberId === member.id") || !app.includes("document?.scope === 'personal'")) throw new Error('House interior can cross member or scope boundaries')
if (!css.includes('.villager-sprite') || !css.includes('.pixel-house') || !css.includes('.interior-room') || !css.includes('.repository-bark') || !css.includes('.repository-changes')) throw new Error('House, resident, bark, or repository-change styles are missing')
console.log(`Validated ${snapshot.members.length} guild residents, deterministic roles, activity bands, homes, and Wiki boundaries.`)
