import { useEffect, useMemo, useRef, useState } from 'react'
import snapshot from './data/wiki-snapshot.json'
import { activityDescription, memberActivity, repositoryPathState } from './guild.js'
import { memberHomePosition } from './village-layout.js'
import { canRenderVillage, memberPublicChanges, publicMemberDocuments, publicMemberSkills } from './village-view.js'

const palette = ['sage', 'berry', 'ochre', 'lake', 'clay', 'plum', 'pine', 'sun']

function PixelAvatar({ member, tone, pose = 'neutral' }) {
  const role = member.role?.id || 'archivist'
  return <span className={`villager ${tone} role-${role} pose-${pose}`} aria-hidden="true">
    <span className="villager-shadow" />
    <span className="villager-sprite">
      <i className="villager-hair" /><i className="villager-face" />
      <i className="villager-body" /><i className="villager-apron" />
      <i className="villager-arm left" /><i className="villager-arm right" />
      <i className="villager-leg left" /><i className="villager-leg right" />
    </span>
  </span>
}

function VillageScenery() {
  return <>
    <div className="water north" /><div className="water south" />
    <svg className="village-paths" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true"><path d="M720 450 C520 410 390 265 245 225 M720 450 C925 390 1010 245 1110 215 M720 450 C500 500 335 605 195 670 M720 450 C940 510 1060 610 1170 670" /></svg>
    {Array.from({ length: 12 }, (_, index) => <i key={index} className={`map-tree tree-${index + 1}`} aria-hidden="true" />)}
  </>
}

function GuildHall({ project }) {
  return <section className="guild-hall" aria-label={`${project.title} 프로젝트 길드홀`}>
    <i className="hall-flag" /><i className="hall-roof" /><i className="hall-wall" /><i className="hall-door" />
    <b>WIKI³</b><p>{project.title}</p><small>{project.goal || '저장된 프로젝트 목표를 확인하지 못했습니다.'}</small>
  </section>
}

function MemberHome({ member, index, repository, onSelect }) {
  const spot = memberHomePosition(index)
  const state = repositoryPathState(member.id, repository)
  const activityRecord = memberActivity(member, repository)
  const pose = state.pose || activityRecord.pose || 'neutral'
  const activity = state.message || activityDescription(activityRecord)
  const tone = palette[index % palette.length]
  return <section className={`home-plot ${tone}`} style={{ left: `${spot.left}%`, top: `${spot.top}%` }}>
    <span className="pixel-house" aria-hidden="true"><span className="chimney" /><span className="roof" /><span className="wall" /><span className="door" /><span className="house-sign"><b>{member.displayName}</b><small>PUBLIC WIKI</small></span></span>
    <button className="member-select" data-member-id={member.id} onClick={onSelect} aria-label={`${member.displayName} 상세 보기 · ${activity}`}>
      <PixelAvatar member={member} tone={tone} pose={pose} />
      <span className="status-bubble">{activity}</span><span className="sr-only">{member.displayName} 상세 보기</span>
    </button>
  </section>
}

function SourcePreview({ document, onClose }) {
  if (!document) return null
  return <section className="source-preview" role="region" aria-labelledby="source-title">
    <header><div><small>ALLOWLISTED PUBLIC SOURCE</small><h3 id="source-title">{document.title}</h3></div><button onClick={onClose} autoFocus>닫기</button></header>
    <p>{document.excerpt || '표시할 요약이 없습니다.'}</p>
    <dl><div><dt>공개 경로</dt><dd><code>{document.source}</code></dd></div><div><dt>기록 유형</dt><dd>{document.knowledgeType}</dd></div></dl>
  </section>
}

function MemberDetail({ member, repository, onClose }) {
  const returnFocus = useRef(document.activeElement)
  const sourceReturnFocus = useRef(null)
  const dialogRef = useRef(null)
  const [source, setSource] = useState(null)
  const documents = useMemo(() => publicMemberDocuments(member, snapshot.documents), [member])
  const skills = useMemo(() => publicMemberSkills(member, snapshot.skills), [member])
  const repositoryState = repositoryPathState(member.id, repository)
  const publicChanges = memberPublicChanges(repository, member.id)
  const activity = repositoryState.message || activityDescription(memberActivity(member, repository))
  const closeSource = () => {
    setSource(null)
    window.setTimeout(() => sourceReturnFocus.current?.focus?.(), 0)
  }

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); source ? closeSource() : onClose(); return }
      if (event.key !== 'Tab') return
      const controls = [...(dialogRef.current?.querySelectorAll('button:not([disabled])') || [])]
      if (!controls.length) return
      const first = controls[0]; const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, source])
  useEffect(() => () => returnFocus.current?.focus?.(), [])

  return <div className="member-modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
    <section className="member-detail" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="member-title">
    <header><div><small>PUBLIC WIKI MEMBER</small><h2 id="member-title">{member.displayName}</h2><p>{member.role?.label || '기록관'} · {member.role?.tool || '공개 Wiki'}</p></div><button onClick={onClose} autoFocus>닫기</button></header>
    <section className="detail-section"><h3>최근 공개 활동</h3><p>{activity}</p>{!repository && <p className="detail-note">아직 새로고침하지 않았습니다.</p>}</section>
    <section className="detail-section"><h3>공개 경로 변화</h3>{repository ? <><p>{repository.message}</p><ul>{publicChanges.length ? publicChanges.map(change => <li key={`${change.path}-${change.scope}`}><code>{change.path}</code></li>) : <li>확인된 해당 member의 공개 경로 변화가 없습니다.</li>}</ul></> : <p>새로고침 전에는 저장된 공개 활동만 표시합니다.</p>}</section>
    <section className="detail-section"><h3>허용 공개 Wiki 출처</h3>{documents.length ? <div className="source-list">{documents.map(document => <button key={document.id} className="source-link" onClick={event => { sourceReturnFocus.current = event.currentTarget; setSource(document) }}>{document.title}<small>{document.source}</small></button>)}</div> : <p>표시할 허용 공개 Wiki 문서가 없습니다.</p>}</section>
    <section className="detail-section"><h3>스킬 metadata</h3>{skills.length ? <ul className="skill-list">{skills.map(skill => <li key={skill.id}><b>{skill.id}</b><span>purpose: {skill.purpose}</span><span>allowedScope: {skill.allowedScope}</span><span>readiness: {skill.readiness}</span></li>)}</ul> : <p>표시할 스킬 metadata가 없습니다.</p>}</section>
    <SourcePreview document={source} onClose={closeSource} />
    </section>
  </div>
}

function EmptyState() {
  const analyzeCommand = "'{\"statement\":\"프로젝트 목표를 여기에 설명하세요.\"}' | node scripts/wiki-architect-cli.mjs --command analyze"
  return <main className="empty-state"><section><small>CLI-FIRST WIKI ARCHITECT</small><h1>CLI에서 프로젝트를 시작하세요</h1><p>웹은 저장된 공개 Wiki snapshot만 읽습니다. 프로젝트 생성과 인터뷰는 CLI에서 진행합니다.</p><code>{analyzeCommand}</code></section></main>
}

function App() {
  const [repository, setRepository] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [refreshStatus, setRefreshStatus] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshInFlight = useRef(false)
  const selectedMember = (snapshot.members || []).find(member => member.id === selectedId) || null
  const refreshRepository = async () => {
    if (refreshInFlight.current) return
    refreshInFlight.current = true
    setIsRefreshing(true)
    setRefreshStatus('공개 Wiki 경로 상태를 확인하고 있습니다.')
    try {
      const response = await fetch('/api/repository-status', { method: 'POST' })
      if (!response.ok) throw new Error('status')
      const result = await response.json()
      setRepository(result)
      setRefreshStatus(result.message || '공개 Wiki 경로 메타데이터를 갱신했습니다.')
    } catch { setRefreshStatus('저장소 상태를 확인할 수 없습니다. 기존 snapshot 표시를 유지합니다.')
    } finally { refreshInFlight.current = false; setIsRefreshing(false) }
  }

  if (!canRenderVillage(snapshot)) return <EmptyState />
  return <main className="village-app">
    <header className="village-header"><div><small>READ-ONLY VILLAGE</small><strong>{snapshot.projectContext.title}</strong></div><button onClick={refreshRepository} disabled={isRefreshing}>{isRefreshing ? '상태 확인 중…' : '저장소 상태 새로고침'}</button></header>
    <p className="refresh-status" role="status" aria-live="polite">{refreshStatus}</p>
    <section className="village-map" aria-label="저장된 Knowledge Guild 마을"><VillageScenery /><GuildHall project={snapshot.projectContext} />
      {snapshot.projectState === 'PROJECT_READY' && <p className="member-empty">저장된 프로젝트입니다. member scaffold는 CLI에서 완성하세요.</p>}
      {snapshot.projectState === 'VILLAGE_READY' && (snapshot.members || []).map((member, index) => <MemberHome key={member.id} member={member} index={index} repository={repository} onSelect={() => setSelectedId(member.id)} />)}
    </section>
    {selectedMember && <MemberDetail member={selectedMember} repository={repository} onClose={() => setSelectedId(null)} />}
  </main>
}

export default App
