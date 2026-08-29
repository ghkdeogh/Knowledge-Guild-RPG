import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const css = await readFile(resolve(root, 'src/styles.css'), 'utf8')
const app = await readFile(resolve(root, 'src/App.jsx'), 'utf8')
const onboarding = await readFile(resolve(root, 'src/Onboarding.jsx'), 'utf8')

if (!css.includes('html,body,#root{height:100%;margin:0;overflow:hidden}') || !css.includes('.village-map{') || !css.includes('height:100%')) throw new Error('Full-viewport village guard is missing')
if (!app.includes('MemberHome') || !app.includes('snapshot.members.map') || !app.includes('getMemberDocuments')) throw new Error('Dynamic member home rendering is missing')
if (!app.includes('HouseInterior') || !app.includes('role="dialog"') || !app.includes('Wiki 문서 서가')) throw new Error('Wiki house interior is missing')
if (!app.includes('MissionBoard') || !app.includes('AnswerPanel') || !app.includes('Source scope') || !app.includes('ALLOWLISTED SOURCE')) throw new Error('Traceable Mission Board answer surface is missing')
if (!app.includes('Onboarding') || !app.includes("onboardingState.phase !== 'VILLAGE_READY'") || !app.includes('PROJECT_UNINITIALIZED')) throw new Error('Onboarding state gate is missing')
if (!onboarding.includes('PROJECT WIKI ARCHITECT') || !onboarding.includes('BlueprintFields') || !onboarding.includes('고급 JSON 편집기') || !onboarding.includes('identity-confirm') || onboarding.includes('PROJECT PROLOGUE')) throw new Error('Structured architect review flow is missing or fixed interview remains')
if (!onboarding.includes('events.some') || !onboarding.includes('files.written')) throw new Error('Onboarding reward is not projected from application events')
if (!app.includes("document.scope === scope") || !app.includes('documentsById.get(item.id)')) throw new Error('Client citation drawer does not re-check the safe snapshot scope')
if (!css.includes('@media(max-width:800px)') || !css.includes('.room-content{display:block')) throw new Error('Responsive house interior guard is missing')
if (!css.includes('.mission-board{') || !css.includes('.answer-panel{') || !css.includes('.source-drawer{')) throw new Error('Mission Board answer styling is missing')
if (!css.includes('.onboarding-layer{') || !css.includes('.onboarding-card{') || !css.includes('@media(prefers-reduced-motion:no-preference)')) throw new Error('Accessible reduced-motion onboarding styling is missing')
console.log('Validated full-viewport village, scoped Mission Board answers, safe source drawer, and responsive Wiki interiors.')
