import { useEffect, useMemo, useRef, useState } from 'react'
import snapshot from './data/wiki-snapshot.json'
import { isCurrentRequest } from './chat-request.js'
import Onboarding from './Onboarding.jsx'

const palette = ['sage', 'berry', 'ochre', 'lake', 'clay', 'plum', 'pine', 'sun']
const homeSpots = [
  { x: 17, y: 23 }, { x: 72, y: 21 }, { x: 13, y: 61 }, { x: 76, y: 59 },
  { x: 34, y: 70 }, { x: 55, y: 72 }, { x: 34, y: 15 }, { x: 57, y: 14 },
  { x: 6, y: 39 }, { x: 84, y: 39 }, { x: 23, y: 74 }, { x: 68, y: 76 },
]

const documentsById = new Map(snapshot.documents.map(document => [document.id, document]))

const getMemberDocuments = member => (member?.documentIds || [])
  .map(id => documentsById.get(id))
  .filter(document => document?.scope === 'personal' && document.memberId === member.id)

function PixelAvatar({ member, tone, onEnter, onSelect, pose = 'neutral' }) {
  const role = member.role?.id || 'archivist'
  return (
    <button className={`villager ${tone} role-${role} pose-${pose}`} onClick={onSelect || onEnter} aria-label={`${member.displayName}의 공개 Wiki 경로 상태 보기`}>
      <span className="villager-shadow" />
      <span className="villager-sprite" aria-hidden="true">
        <i className="villager-hair" /><i className="villager-face" />
        <i className="villager-body" /><i className="villager-apron" />
        <i className="villager-arm left" /><i className="villager-arm right" />
        <i className="villager-leg left" /><i className="villager-leg right" />
      </span>
    </button>
  )
}

function MemberHome({ member, index, onEnter, onSelect, pose }) {
  const spot = homeSpots[index % homeSpots.length]
  const ring = Math.floor(index / homeSpots.length)
  const position = { left: `${Math.min(88, spot.x + ring * 2)}%`, top: `${Math.min(78, spot.y + ring * 2)}%` }
  const tone = palette[index % palette.length]
  const count = getMemberDocuments(member).length

  return (
    <section className={`home-plot ${tone}`} style={position} aria-label={`${member.displayName}의 Wiki 집`}>
      <button className="pixel-house" onClick={onEnter} aria-label={`${member.displayName}의 집, Wiki 문서 ${count}개`}>
        <span className="chimney" /><span className="roof" /><span className="wall" />
        <span className="window left" /><span className="window right" /><span className="door" />
        <span className="house-sign"><b>{member.displayName}</b><small>{count} WIKI</small></span>
      </button>
      <PixelAvatar member={member} tone={tone} onEnter={onEnter} onSelect={onSelect} pose={pose} />
    </section>
  )
}

function BookIcon({ tone = 0 }) {
  return <span className={`book-icon tone-${tone % 4}`} aria-hidden="true"><i /><i /><i /></span>
}

function HouseInterior({ member, onClose, onAsk }) {
  const documents = useMemo(() => getMemberDocuments(member), [member])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(documents[0]?.id || '')
  const filteredDocuments = documents.filter(document => `${document.title} ${document.excerpt} ${document.category}`.toLowerCase().includes(query.toLowerCase()))
  const selectedDocument = documents.find(document => document.id === selectedId) || filteredDocuments[0] || null

  useEffect(() => {
    const closeOnEscape = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <section className="interior-layer" role="dialog" aria-modal="true" aria-labelledby="interior-title">
      <div className="room-sky" />
      <div className="interior-room">
        <header className="room-header">
          <div className="resident-mark" aria-hidden="true"><PixelAvatar member={member} tone="sage" onEnter={() => {}} /></div>
          <div><small>WIKI HOUSE</small><h1 id="interior-title">{member.displayName}</h1></div>
          <button className="exit-button" onClick={onClose} autoFocus><span aria-hidden="true">←</span> 마을</button>
        </header>

        <div className="room-content">
          <aside className="wiki-shelf" aria-label="Wiki 문서 서가">
            <label className="shelf-search">
              <span className="sr-only">Wiki 검색</span>
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="서가 검색…" />
              <i aria-hidden="true">⌕</i>
            </label>
            <div className="shelf-label"><span>WIKI SHELF</span><b>{filteredDocuments.length}</b></div>
            <div className="book-list">
              {filteredDocuments.map((document, index) => (
                <button key={document.id} className={selectedDocument?.id === document.id ? 'selected' : ''} onClick={() => setSelectedId(document.id)}>
                  <BookIcon tone={index} />
                  <span><b>{document.title}</b><small>{document.category}</small></span>
                </button>
              ))}
              {!filteredDocuments.length && <p className="empty-shelf">일치하는 기록이 없습니다.</p>}
            </div>
          </aside>

          <main className="reading-desk">
            <span className="window-light" aria-hidden="true" />
            {selectedDocument ? (
              <article className="wiki-page">
                <header>
                  <span>{selectedDocument.category}</span>
                  <time>{selectedDocument.updated}</time>
                </header>
                <h2>{selectedDocument.title}</h2>
                <p>{selectedDocument.excerpt}</p>
                <footer>
                  <span className="source-gem" aria-hidden="true" />
                  <div><small>SOURCE</small><code>{selectedDocument.source}</code></div>
                </footer>
                <button className="ask-record-button" onClick={() => onAsk(member)}>이 Wiki에게 질문</button>
              </article>
            ) : (
              <div className="empty-desk"><BookIcon /><h2>아직 놓인 기록이 없습니다.</h2></div>
            )}
            <div className="desk-props" aria-hidden="true"><i className="mug" /><i className="plant" /><i className="lamp-glow" /></div>
          </main>
        </div>
      </div>
    </section>
  )
}

const modeCopy = {
  'llm-grounded': '실제 AI · 인용 근거 기반',
  'demo-fallback': '데모 요약 · 실제 AI 아님',
  unsupported: '답변 보류 · 근거 부족',
  error: '오류 · 답변 없음',
}

function MissionBoard({ onAskProject, onRepositoryCheck, onSkills, repository }) {
  const context = snapshot.projectContext
  return (
    <aside className="mission-board" aria-label="Mission Board">
      <small>MISSION BOARD</small>
      <h1>공통 맥락에서 묻기</h1>
      <p>{context.goal || '프로젝트 공통 맥락을 확인합니다.'}</p>
      <dl><div><dt>범위</dt><dd>project · projects/</dd></div><div><dt>출처</dt><dd>{context.source}</dd></div></dl>
      <button onClick={onAskProject}>프로젝트 기록에 질문</button><button onClick={onSkills}>길드홀 스킬 보기</button><button className="repository-bell" onClick={onRepositoryCheck}>저장소 새 소식 확인</button>
      {repository && <p className="repository-note" role="status">{repository.message} · {repository.branch || repository.mode} · project 변경 {(repository.project?.dirty || 0) + (repository.project?.remoteNews || 0)}</p>}
    </aside>
  )
}

function AnswerPanel({ target, onClose, docked = false }) {
  const scope = target?.scope || 'project'
  const member = target?.member || null
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState(null)
  const [drawer, setDrawer] = useState(null)
  const [pending, setPending] = useState(false)
  const requestId = useRef(0)
  const requestController = useRef(null)
  const previousFocus = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    previousFocus.current = document.activeElement
    return () => previousFocus.current?.focus?.()
  }, [])
  useEffect(() => {
    requestController.current?.abort()
    requestId.current += 1
    setQuestion(''); setReply(null); setDrawer(null); setPending(false)
  }, [scope, member?.id])
  const closePanel = () => {
    requestController.current?.abort()
    requestId.current += 1
    onClose()
  }
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') { closePanel(); return }
      if (event.key !== 'Tab') return
      const controls = [...(panelRef.current?.querySelectorAll('button:not([disabled]), textarea:not([disabled])') || [])]
      if (!controls.length) return
      const first = controls[0]; const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      requestController.current?.abort()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])
  const submit = async event => {
    event.preventDefault()
    if (!question.trim() || pending) return
    const nextRequest = requestId.current + 1
    requestId.current = nextRequest
    requestController.current?.abort()
    const controller = new AbortController()
    const requestTimeout = window.setTimeout(() => controller.abort(), 12000)
    requestController.current = controller
    setPending(true); setDrawer(null)
    try {
      const response = await fetch('/api/wiki-chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scope, memberId: member?.id, question }), signal: controller.signal })
      const body = await response.json()
      const hasExpectedScope = body && body.sourceScope === scope && (scope === 'personal' ? body.memberId === member?.id : body.memberId === null)
      const hasEnvelope = body && typeof body.answer === 'string' && Array.isArray(body.citations) && typeof body.confidence === 'string' && typeof body.knowledgeType === 'string' && typeof body.limitation === 'string'
      if (isCurrentRequest(nextRequest, requestId.current)) setReply(response.ok && hasExpectedScope && hasEnvelope ? body : { mode: 'error', sourceScope: scope, answer: '요청을 처리하지 못했습니다.', citations: [], confidence: 'low', knowledgeType: 'wiki-record', limitation: body?.error || '서버 응답의 범위 또는 계약을 확인하지 못했습니다.' })
    } catch (error) {
      if (error.name !== 'AbortError' && isCurrentRequest(nextRequest, requestId.current)) setReply({ mode: 'error', sourceScope: scope, answer: '연결 오류로 답변을 받지 못했습니다.', citations: [], confidence: 'low', knowledgeType: 'wiki-record', limitation: '네트워크 연결을 확인한 뒤 다시 시도하세요.' })
    } finally { window.clearTimeout(requestTimeout); if (isCurrentRequest(nextRequest, requestId.current)) setPending(false) }
  }
  const safeCitation = item => {
    const document = documentsById.get(item.id)
    return document && document.scope === scope && (scope !== 'personal' || document.memberId === member?.id) ? document : null
  }
  const cited = (reply?.citations || []).map(safeCitation).filter(Boolean)
  const scopeLabel = scope === 'personal' ? `${member?.displayName} 개인 Wiki` : '프로젝트 공통 기록'
  return (
    <section className={`answer-panel${docked ? ' guild-prompt-dock' : ''}`} ref={panelRef} role={docked ? 'region' : 'dialog'} aria-modal={docked ? undefined : 'true'} aria-labelledby="answer-title">
      <header><div><small>{docked ? 'GUILD PROMPT' : 'TRACEABLE ANSWER'}</small><h2 id="answer-title">{scopeLabel}</h2><p>질문 범위는 잠겨 있으며, 이 패널은 다른 기록을 보충하지 않습니다.</p></div>{!docked && <button className="exit-button" onClick={closePanel} autoFocus>닫기</button>}{docked && scope === 'personal' && <button className="exit-button" onClick={onClose}>프로젝트로</button>}</header>
      <div className="scope-lock"><b>Source scope</b><span>{scope === 'personal' ? `personal · members/${member?.id}/` : 'project · projects/'}</span></div>
      <form onSubmit={submit}><label htmlFor="guild-question">이 범위에서 확인할 질문</label><textarea id="guild-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength="600" placeholder="기록 안에서 확인할 내용을 입력하세요." /><button type="submit" disabled={pending}>{pending ? '근거 확인 중…' : '근거로 답변 받기'}</button></form>
      {reply && <article className={`answer-card mode-${reply.mode}`}>
        <div className="answer-labels"><span>{modeCopy[reply.mode] || '응답 상태'}</span><span>신뢰도: {reply.confidence}</span><span>기록 유형: {reply.knowledgeType}</span></div>
        <p className="answer-text">{reply.answer}</p>
        <p className="answer-limitation"><b>한계</b> {reply.limitation}</p>
        <div className="citation-row"><b>허용된 출처</b>{cited.length ? cited.map(document => <button key={document.id} onClick={() => setDrawer(document)}>근거 열기: {document.title}</button>) : <span>이 답변에는 표시할 허용 근거가 없습니다.</span>}</div>
      </article>}
      {drawer && <aside className="source-drawer" aria-label="선택한 근거"><header><div><small>ALLOWLISTED SOURCE</small><h3>{drawer.title}</h3></div><button onClick={() => setDrawer(null)}>닫기</button></header><p>{drawer.excerpt}</p><dl><div><dt>Source path</dt><dd><code>{drawer.source}</code></dd></div><div><dt>Scope</dt><dd>{drawer.scope}</dd></div><div><dt>Record type</dt><dd>{drawer.knowledgeType}</dd></div></dl></aside>}
    </section>
  )
}

function VillageScenery() {
  return (
    <>
      <div className="water north" /><div className="water south" />
      <svg className="village-paths" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path d="M720 450 C520 410 390 265 245 225 M720 450 C925 390 1010 245 1110 215 M720 450 C500 500 335 605 195 670 M720 450 C940 510 1060 610 1170 670" />
        <path d="M720 0 L720 900" /><path d="M0 450 L1440 450" />
      </svg>
      <div className="guild-hall" aria-hidden="true"><i className="hall-flag" /><i className="hall-roof" /><i className="hall-wall" /><i className="hall-door" /><b>WIKI³</b></div>
      <div className="well" aria-hidden="true"><i /><b /></div>
      {Array.from({ length: 18 }, (_, index) => <i key={index} className={`map-tree tree-${index + 1}`} aria-hidden="true" />)}
      {Array.from({ length: 12 }, (_, index) => <i key={index} className={`wildflower flower-${index + 1}`} aria-hidden="true" />)}
    </>
  )
}

const poseFor = (member, repository, seen) => {
  const state = repository?.members?.[member.id]
  if (state?.dirty) return 'crafting'
  if (state?.remoteNews && state.remoteTip && seen?.[member.id] !== state.remoteTip) return 'notice'
  return member.activity?.pose || 'neutral'
}
function CharacterMenu({ member, onAsk, onHome, onSkills, onChanges, onClose }) {
  useEffect(() => { const close = event => event.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [onClose])
  return <aside className="character-menu" role="dialog" aria-label={`${member.displayName}의 공개 Wiki 경로 행동`}><b>{member.displayName} · 공개 Wiki 경로 상태</b><code>members/{member.id}/wiki/</code><button onClick={onAsk}>질문하기</button><button onClick={onHome}>Wiki 집 열기</button><button onClick={onSkills}>배치 스킬 보기</button><button onClick={onChanges}>저장소 변화 보기</button></aside>
}
function SkillStation({ skills, detail, onDetail, onClose }) {
  return <aside className="skill-station" role="dialog" aria-modal="true" aria-label="배치된 Wiki 스킬"><button className="exit-button" onClick={onClose}>닫기</button><small>SKILL STATION</small><h2>배치된 harness</h2>{!skills.length && <p>아직 배치된 스킬이 없습니다. Wiki scaffold를 승인하면 이곳에 안전한 metadata만 놓입니다.</p>}{skills.map(skill => <button key={`${skill.scope}-${skill.memberId || 'project'}-${skill.id}`} className="skill-prop" onClick={() => onDetail(skill)}>{skill.scope === 'project' ? '길드홀' : skill.memberId} · {skill.id}</button>)}{detail && <article className="skill-detail"><h3>{detail.id}</h3><p>{detail.purpose}</p><code>{detail.allowedScope}</code><p>{detail.readiness}</p></article>}</aside>
}

function App() {
  const [openMemberId, setOpenMemberId] = useState(null)
  const [answerTarget, setAnswerTarget] = useState({ scope: 'project' })
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [repository, setRepository] = useState(null)
  const [seenNews, setSeenNews] = useState(() => { try { const value = JSON.parse(localStorage.getItem('knowledge-guild-seen-news') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {} } catch { return {} } })
  const [showSkills, setShowSkills] = useState(false); const [skillDetail, setSkillDetail] = useState(null); const [skillScope, setSkillScope] = useState({ scope: 'project', memberId: null })
  const [onboardingState, setOnboardingState] = useState(() => ({ persistenceMode: 'local-writable', phase: snapshot.projectState === 'VILLAGE_READY' ? 'VILLAGE_READY' : snapshot.projectState === 'PROJECT_READY' ? 'MEMBER_ONBOARDING' : 'PROJECT_UNINITIALIZED' }))
  const openMember = snapshot.members.find(member => member.id === openMemberId) || null
  const selectedMember = snapshot.members.find(member => member.id === selectedMemberId) || null
  const checkRepository = async () => { try { const response = await fetch('/api/repository-status', { method: 'POST' }); const result = await response.json(); setRepository(result); return result } catch { const result = { mode: 'error', message: '저장소 상태를 확인할 수 없습니다.', project: {} }; setRepository(result); return result } }
  const markSeen = result => { const markers = Object.fromEntries(Object.entries(result?.members || {}).filter(([, value]) => value.remoteNews && value.remoteTip).map(([id, value]) => [id, value.remoteTip])); const next = { ...seenNews, ...markers }; setSeenNews(next); localStorage.setItem('knowledge-guild-seen-news', JSON.stringify(next)) }

  useEffect(() => {
    let active = true
    fetch('/api/onboarding-state').then(response => response.ok ? response.json() : null).then(state => { if (active && state?.phase) setOnboardingState(state) }).catch(() => {})
    return () => { active = false }
  }, [])

  if (onboardingState.phase !== 'VILLAGE_READY') return <main className="village-app"><Onboarding serverState={onboardingState} onStateChange={setOnboardingState} /></main>

  return (
    <main className="village-app">
      <section className="village-map" aria-label="Knowledge Guild 마을">
        <VillageScenery />
        <MissionBoard onAskProject={() => setAnswerTarget({ scope: 'project' })} onSkills={() => { setSkillScope({ scope: 'project', memberId: null }); setSkillDetail(null); setShowSkills(true) }} onRepositoryCheck={checkRepository} repository={repository} />
        {snapshot.members.map((member, index) => (
          <MemberHome key={member.id} member={member} index={index} pose={poseFor(member, repository, seenNews)} onEnter={() => setOpenMemberId(member.id)} onSelect={() => setSelectedMemberId(member.id)} />
        ))}
        <div className="map-seal" aria-hidden="true"><b>KNOWLEDGE</b><span>GUILD</span></div>
      </section>
      {selectedMember && <CharacterMenu member={selectedMember} onClose={() => setSelectedMemberId(null)} onAsk={() => { setAnswerTarget({ scope: 'personal', member: selectedMember }); setSelectedMemberId(null) }} onHome={() => { setOpenMemberId(selectedMember.id); setSelectedMemberId(null) }} onSkills={() => { setSkillScope({ scope: 'member', memberId: selectedMember.id }); setSkillDetail(null); setShowSkills(true); setSelectedMemberId(null) }} onChanges={() => { checkRepository().then(markSeen); setSelectedMemberId(null) }} />}
      {openMember && <HouseInterior key={openMember.id} member={openMember} onClose={() => setOpenMemberId(null)} onAsk={member => { setOpenMemberId(null); setAnswerTarget({ scope: 'personal', member }) }} />}
      <AnswerPanel key={`${answerTarget.scope}-${answerTarget.member?.id || 'project'}`} target={answerTarget} docked onClose={() => setAnswerTarget({ scope: 'project' })} />
      {showSkills && <SkillStation skills={(snapshot.skills || []).filter(skill => skillScope.scope === 'member' ? skill.memberId === skillScope.memberId : skill.scope === 'project')} detail={skillDetail} onDetail={setSkillDetail} onClose={() => { setShowSkills(false); setSkillDetail(null) }} />}
      <p className="sr-only" aria-live="polite">{openMember ? `${openMember.displayName}의 Wiki 집 내부` : '길드 마을'}</p>
    </main>
  )
}

export default App
