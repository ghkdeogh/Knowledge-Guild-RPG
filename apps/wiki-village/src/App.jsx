import { useEffect, useMemo, useRef, useState } from 'react'
import snapshot from './data/wiki-snapshot.json'
import { activityDescription, memberActivity, repositoryPathState } from './guild.js'
import { memberHomePosition } from './village-layout.js'
import { canRenderVillage, memberPublicChanges, publicFlowDocuments, publicMemberDocuments, publicMemberSkills } from './village-view.js'

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

function GuildHall({ flow }) {
  return <section className="guild-hall" aria-label="관찰된 프로젝트 흐름">
    <i className="hall-flag" /><i className="hall-roof" /><i className="hall-wall" /><i className="hall-door" />
    <b>WIKI³</b><p>관찰된 프로젝트 흐름</p><small>{flow.observedFlow}</small>
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

function EvidenceLinks({ paths, documents, onOpen }) {
  const byPath = new Map(documents.map(document => [document.source, document]))
  return <div className="evidence-links">{paths.map(path => {
    const document = byPath.get(path)
    return document ? <button key={path} className="source-link" onClick={() => onOpen(document)}>{document.title}<small>{path}</small></button> : null
  })}</div>
}

function FlowBoard({ flow, onClose }) {
  const returnFocus = useRef(document.activeElement)
  const dialogRef = useRef(null)
  const [source, setSource] = useState(null)
  const documents = useMemo(() => publicFlowDocuments(flow, snapshot.documents), [flow])
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); source ? setSource(null) : onClose(); return }
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
  const section = (title, values, render) => <section className="detail-section"><h3>{title}</h3>{values.length ? <div className="flow-list">{values.map((value, index) => <article key={`${title}-${index}`}><p>{render(value)}</p><EvidenceLinks paths={value.evidencePaths || []} documents={documents} onOpen={setSource} /></article>)}</div> : <p>판단할 기록이 부족합니다.</p>}</section>
  return <div className="member-modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
    <section className="member-detail flow-board" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="flow-title">
      <header><div><small>OBSERVED FLOW · NOT A DECISION</small><h2 id="flow-title">현재 관찰된 흐름</h2><p>{flow.observedFlow}</p></div><button onClick={onClose} autoFocus>닫기</button></header>
      {section('자주 등장하는 주제', flow.frequentTopics, value => `${value.topic} · ${value.occurrences}건`)}
      {section('최근 새 방향', flow.recentDirections, value => `${value.direction}${value.updatedAt ? ` · ${value.updatedAt}` : ''}`)}
      {section('공통 관점', flow.commonGround, value => `${value.topic} · 명시적 ${value.stance}`)}
      {section('의견 차이', flow.differingViews, value => `${value.topic} · ${value.positions.map(position => position.label).join(' / ')}`)}
      {section('지식 공백', flow.knowledgeGaps, value => value.question)}
      {section('다음 조사 질문', flow.nextResearchQuestions, value => value.question)}
      <section className="detail-section"><h3>공식 결정</h3><p>공식 결정은 이 요약에 포함되지 않습니다. 명시적으로 승인된 <code>decisions/</code> 기록만 공식 결정입니다.</p></section>
      <SourcePreview document={source} onClose={() => setSource(null)} />
    </section>
  </div>
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

function EmptyState({ flow }) {
  const analyzeCommand = "'{\"statement\":\"첫 Wiki 기록: 해결하고 싶은 문제와 떠오른 생각을 적습니다.\"}' | node scripts/wiki-architect-cli.mjs --command analyze"
  const insufficient = flow?.status === 'insufficient' && flow.evidencePaths?.length
  return <main className="empty-state"><section><small>CLI-FIRST PERSONAL WIKI</small><h1>{insufficient ? '공개 Wiki 기록은 있으나 흐름을 판단할 근거가 부족합니다.' : '아직 흐름을 판단할 공개 Wiki 기록이 없습니다.'}</h1><p>{insufficient ? '기록 부재나 관점 차이를 추정하지 않습니다. 추가 기록이 쌓이면 다음 snapshot에서 다시 관찰합니다.' : 'CLI에서 첫 기록 과정을 시작하세요. 기본 preview/save는 한 member의 개인 Wiki만 만듭니다. 아이디어, 조사, 문제의식, 실험 기록 어느 것이든 시작점이 될 수 있습니다.'}</p><code>{analyzeCommand}</code></section></main>
}

function App() {
  const [repository, setRepository] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [flowOpen, setFlowOpen] = useState(false)
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

  if (!canRenderVillage(snapshot)) return <EmptyState flow={snapshot.flow} />
  return <main className="village-app">
    <header className="village-header"><div><small>READ-ONLY OBSERVATION</small><strong>관찰된 프로젝트 흐름</strong><span>{snapshot.flow.observedFlow}</span><em>근거 {snapshot.flow.evidencePaths.length}건 · 마지막 기록 {snapshot.flow.lastUpdatedAt || '확인 불가'}</em></div><div className="header-actions"><button onClick={() => setFlowOpen(true)}>흐름 자세히</button><button onClick={refreshRepository} disabled={isRefreshing}>{isRefreshing ? '상태 확인 중…' : '저장소 상태 새로고침'}</button></div></header>
    <p className="refresh-status" role="status" aria-live="polite">{refreshStatus}</p>
    <section className="village-map" aria-label="저장된 Knowledge Guild 마을"><VillageScenery /><GuildHall flow={snapshot.flow} />
      {(snapshot.members || []).map((member, index) => <MemberHome key={member.id} member={member} index={index} repository={repository} onSelect={() => setSelectedId(member.id)} />)}
    </section>
    {selectedMember && <MemberDetail member={selectedMember} repository={repository} onClose={() => setSelectedId(null)} />}
    {flowOpen && <FlowBoard flow={snapshot.flow} onClose={() => setFlowOpen(false)} />}
  </main>
}

export default App
