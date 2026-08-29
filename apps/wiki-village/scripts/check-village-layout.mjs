import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const css = await readFile(resolve(root, 'src/styles.css'), 'utf8')
const app = await readFile(resolve(root, 'src/App.jsx'), 'utf8')

if (!css.includes('html,body,#root{height:100%;margin:0;overflow:hidden}') || !css.includes('.village-map{') || !css.includes('height:100%')) throw new Error('Full-viewport village guard is missing')
if (!app.includes('MemberHome') || !app.includes('snapshot.members.map') || !app.includes('getMemberDocuments')) throw new Error('Dynamic member home rendering is missing')
if (!app.includes('HouseInterior') || !app.includes('role="dialog"') || !app.includes('Wiki 문서 서가')) throw new Error('Wiki house interior is missing')
if (!css.includes('@media(max-width:800px)') || !css.includes('.room-content{display:block')) throw new Error('Responsive house interior guard is missing')
console.log('Validated full-viewport village, dynamic member homes, and responsive Wiki interiors.')
