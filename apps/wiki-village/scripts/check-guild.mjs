import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import snapshot from '../src/data/wiki-snapshot.json' with { type: 'json' }
import { activityBand, HEAD_OFFSET, inferGuildRole } from '../src/guild.js'

const now = new Date('2026-08-29T00:00:00.000Z')
const bands = [['2026-08-22', 'crafting'], ['2026-08-21', 'wandering'], ['2026-08-15', 'wandering'], ['2026-08-14', 'resting'], ['2026-07-31', 'resting'], ['2026-07-30', 'sleeping'], [null, 'neutral']]
for (const [date, id] of bands) if (activityBand(date, now).id !== id) throw new Error(`Activity band failed for ${date}`)
const explorerDocs = [{ id: 'a', title: 'Data source catalog', source: 'members/a/wiki/sources/catalog.md', category: '개인 Wiki' }]
const architectDocs = [{ id: 'b', title: 'Visual design concept', source: 'members/b/wiki/design/concept.md', category: '개인 Wiki' }]
if (inferGuildRole(explorerDocs).id !== 'explorer' || inferGuildRole(architectDocs).id !== 'architect' || inferGuildRole([]).id !== 'archivist') throw new Error('Guild role inference/default failed')
if (inferGuildRole(explorerDocs).evidenceId !== 'a' || inferGuildRole(architectDocs).evidenceId !== 'b') throw new Error('Guild role mixed cross-member evidence')
if (!snapshot.members.every(member => member.role?.id && member.activity?.pose && member.role.evidenceSource.startsWith(`members/${member.id}/`))) throw new Error('Snapshot guild metadata is incomplete or crosses a member boundary')
const root = resolve(import.meta.dirname, '..')
const app = await readFile(resolve(root, 'src/App.jsx'), 'utf8'); const css = await readFile(resolve(root, 'src/styles.css'), 'utf8')
if (!app.includes('HEAD_OFFSET') || HEAD_OFFSET.x !== 1 || HEAD_OFFSET.y !== -37 || !app.includes('guildOpen') || !app.includes("mode: 'walk'")) throw new Error('Head anchor or sleeping wake interaction guard is missing')
for (const direction of ['facing-up', 'facing-down', 'facing-left', 'facing-right']) if (!css.includes(`.guild-avatar.${direction}`)) throw new Error(`Missing guild direction style: ${direction}`)
for (const frame of ['frame-0', 'frame-1']) if (!css.includes(`.guild-avatar.walk.${frame}`)) throw new Error(`Missing walk frame: ${frame}`)
console.log(`Validated ${snapshot.members.length} guild avatars, deterministic roles, activity bands, and sprite anchors.`)
