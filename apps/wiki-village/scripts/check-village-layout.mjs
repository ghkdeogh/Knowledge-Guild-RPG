import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const css = await readFile(resolve(root, 'src/styles.css'), 'utf8')
const app = await readFile(resolve(root, 'src/App.jsx'), 'utf8')

if (!css.includes('continuous world plane on desktop') || !css.includes('.world{margin:0 auto;min-width:960px;width:960px}') || !css.includes('.world-camera{background-color:#77aa69')) throw new Error('Desktop world no-gutter guard is missing')
if (!css.includes('translate(clamp(-205px,var(--camera-x),0px),clamp(-17px,var(--camera-y),0px)) scale(.62)')) throw new Error('390px camera clamp is missing')
if (!css.includes('.knowledge-village{padding-bottom:10px}') || !css.includes('.skill-dock{bottom:6px;left:auto;margin:12px 0 0;position:sticky;right:auto}')) throw new Error('Mobile continuous dock layout is missing')
if (!css.includes('.skill-dock.expanded .skill-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))') || !app.includes('dockOpen') || !app.includes('질문·스킬 열기 ↗')) throw new Error('Mobile compact Skill Dock is missing')
console.log('Validated desktop no-gutter plane and compact 390px Skill Dock guards.')
