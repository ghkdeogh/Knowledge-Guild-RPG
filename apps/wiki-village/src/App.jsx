import { useEffect, useMemo, useRef, useState } from 'react'
import snapshot from './data/wiki-snapshot.json'
import { isCurrentRequest } from './chat-request.js'
import Onboarding from './Onboarding.jsx'
import { memberHomePosition } from './village-layout.js'
import { confirmMemberSeen, repositoryPathState, selectRepositoryBark } from './guild.js'
import { answerBubbleView, answerTargetKey, beginAnswerProjection, isValidatedAnswerEnvelope, resolveAnswerProjection, shouldHideRepositoryBark } from './answer-bubbles.js'

const palette = ['sage', 'berry', 'ochre', 'lake', 'clay', 'plum', 'pine', 'sun']

const documentsById = new Map(snapshot.documents.map(document => [document.id, document]))

const getMemberDocuments = member => (member?.documentIds || [])
  .map(id => documentsById.get(id))
  .filter(document => document?.scope === 'personal' && document.memberId === member.id)

function PixelAvatar({ member, tone, onEnter, onSelect, pose = 'neutral', querying = false }) {
  const role = member.role?.id || 'archivist'
  return (
    <button className={`villager ${tone} role-${role} pose-${pose}`} data-member-id={member.id} onClick={() => onSelect?.()} aria-label={`${member.displayName}의 공개 Wiki 경로 상태 보기${querying ? ' · 현재 UI 요청 상태: 기록을 살펴보는 중' : ''}`}>
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

function RepositoryBark({ bark, onOpen, onDismiss }) {
  if (!bark) return null
  return <aside className="repository-bark" role="status" aria-live="polite" aria-label="공개 Wiki 경로 상태"><button onClick={onOpen}>{bark.state.message}<small>공개 Wiki 경로 상태 보기</small></button><button className="bark-dismiss" onClick={onDismiss} aria-label="이 경로 상태 말풍선 닫기">×</button></aside>
}

function AnswerBubble({ view, onOpen, onDismiss, project = false }) {
  if (!view) return null
  if (view.phase === 'pending') return <aside className={`answer-bubble pending${project ? ' project-answer-bubble' : ''}`} role="status" aria-live="polite" aria-label="현재 UI 요청 상태"><span>{view.text}</span><small>{view.detail}</small></aside>
  return <aside className={`answer-bubble${project ? ' project-answer-bubble' : ''}`} role="status" aria-live="polite" aria-label="Wiki 답변 도착"><button onClick={onOpen}><span>{view.text}</span><small>{view.modeLabel} · 신뢰도 {view.confidence} · {view.knowledgeType}</small><b>전체 답변 · 근거 보기</b></button><button className="bubble-dismiss" onClick={onDismiss} aria-label="이 답변 말풍선 닫기">×</button></aside>
}

function MemberHome({ member, index, onEnter, onSelect, pose, bark, onBarkOpen, onBarkDismiss, answerBubble, onAnswerOpen, onAnswerDismiss, querying }) {
  const spot = memberHomePosition(index)
  const position = { left: `${spot.left}%`, top: `${spot.top}%` }
  const tone = palette[index % palette.length]
  const count = getMemberDocuments(member).length

  return (
    <section className={`home-plot ${tone}`} style={position} aria-label={`${member.displayName}의 Wiki 집`}>
      <button className="pixel-house" onClick={onEnter} aria-label={`${member.displayName}의 집, Wiki 문서 ${count}개`}>
        <span className="chimney" /><span className="roof" /><span className="wall" />
        <span className="window left" /><span className="window right" /><span className="door" />
        <span className="house-sign"><b>{member.displayName}</b><small>{count} WIKI</small></span>
      </button>
      <PixelAvatar member={member} tone={tone} onEnter={onEnter} onSelect={onSelect} pose={pose} querying={querying} />
      <RepositoryBark bark={bark} onOpen={onBarkOpen} onDismiss={onBarkDismiss} />
      <AnswerBubble view={answerBubble} onOpen={onAnswerOpen} onDismiss={onAnswerDismiss} />
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

function MissionBoard({ onAskProject, onRepositoryCheck, onSkills, onChanges, repository }) {
  const context = snapshot.projectContext
  const projectChanges = (repository?.project?.dirty || 0) + (repository?.project?.remoteNews || 0)
  return (
    <aside className="mission-board" aria-label="Mission Board">
      <small>MISSION BOARD</small>
      <h1>공통 맥락에서 묻기</h1>
      <p>{context.goal || '프로젝트 공통 맥락을 확인합니다.'}</p>
      <dl><div><dt>범위</dt><dd>project · projects/</dd></div><div><dt>출처</dt><dd>{context.source}</dd></div></dl>
      <button onClick={onAskProject}>프로젝트 기록에 질문</button><button onClick={onSkills}>길드홀 스킬 보기</button><button className="repository-bell" onClick={onRepositoryCheck}>저장소 새 소식 확인</button>
      {repository && <p className="repository-note" role="status">{repository.message} · {repository.branch || repository.mode} · 공통 공개 Wiki 경로 변경 {projectChanges}</p>}
      {projectChanges > 0 && <button className="project-change-action" onClick={onChanges}>공통 변화 보기 · {projectChanges}</button>}
    </aside>
  )
}

function AnswerPanel({ target, onClose, docked = false, onAnswerStart, onAnswerResult, suspendKeyboard = false }) {
  const scope = target?.scope || 'project'
  const member = target?.member || null
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState(false)
  const requestId = useRef(0)
  const requestController = useRef(null)
  const previousFocus = useRef(null)
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    previousFocus.current = document.activeElement
    return () => previousFocus.current?.focus?.()
  }, [])
  useEffect(() => {
    requestController.current?.abort()
    requestId.current += 1
    setQuestion(''); setPending(false)
  }, [scope, member?.id])
  const closePanel = () => {
    requestController.current?.abort()
    requestId.current += 1
    onCloseRef.current()
  }
  useEffect(() => {
    const onKeyDown = event => {
      if (suspendKeyboard) return
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
  }, [suspendKeyboard])
  const submit = async event => {
    event.preventDefault()
    if (!question.trim() || pending) return
    const nextRequest = requestId.current + 1
    requestId.current = nextRequest
    requestController.current?.abort()
    const controller = new AbortController()
    let timedOut = false
    const requestTimeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 12000)
    requestController.current = controller
    const projectionRequestId = onAnswerStart?.({ scope, member })
    setPending(true)
    try {
      const response = await fetch('/api/wiki-chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scope, memberId: member?.id, question }), signal: controller.signal })
      const body = await response.json()
      if (isCurrentRequest(nextRequest, requestId.current)) onAnswerResult?.(projectionRequestId, { scope, member }, response.ok && isValidatedAnswerEnvelope(body, { scope, member }) ? body : { mode: 'error', sourceScope: scope, memberId: member?.id || null, answer: '지금은 답변을 가져오지 못했어요.', citations: [], confidence: 'low', knowledgeType: 'wiki-record', limitation: typeof body?.error === 'string' ? body.error : '서버 응답의 범위 또는 계약을 확인하지 못했습니다.' })
    } catch (error) {
      if ((error.name !== 'AbortError' || timedOut) && isCurrentRequest(nextRequest, requestId.current)) onAnswerResult?.(projectionRequestId, { scope, member }, { mode: 'error', sourceScope: scope, memberId: member?.id || null, answer: '지금은 답변을 가져오지 못했어요.', citations: [], confidence: 'low', knowledgeType: 'wiki-record', limitation: timedOut ? '응답 시간이 초과되었습니다. 다시 시도하세요.' : '네트워크 연결을 확인한 뒤 다시 시도하세요.' })
    } finally { window.clearTimeout(requestTimeout); if (isCurrentRequest(nextRequest, requestId.current)) setPending(false) }
  }
  const scopeLabel = scope === 'personal' ? `${member?.displayName} 개인 Wiki` : '프로젝트 공통 기록'
  return (
    <section className={`answer-panel${docked ? ' guild-prompt-dock' : ''}`} ref={panelRef} role={docked ? 'region' : 'dialog'} aria-modal={docked ? undefined : 'true'} aria-labelledby="answer-title">
      <header><div><small>{docked ? 'GUILD PROMPT' : 'TRACEABLE ANSWER'}</small><h2 id="answer-title">{scopeLabel}</h2><p>질문 범위는 잠겨 있으며, 이 패널은 다른 기록을 보충하지 않습니다.</p></div>{!docked && <button className="exit-button" onClick={closePanel} autoFocus>닫기</button>}{docked && scope === 'personal' && <button className="exit-button" onClick={onClose}>프로젝트로</button>}</header>
      <div className="scope-lock"><b>Source scope</b><span>{scope === 'personal' ? `personal · members/${member?.id}/` : 'project · projects/'}</span></div>
      <form onSubmit={submit}><label htmlFor="guild-question">이 범위에서 확인할 질문</label><textarea id="guild-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength="600" placeholder="기록 안에서 확인할 내용을 입력하세요." /><button type="submit" disabled={pending}>{pending ? '근거 확인 중…' : '근거로 답변 받기'}</button></form>
    </section>
  )
}

const safeCitation = (item, target) => {
  const document = documentsById.get(item?.id)
  return document && document.scope === target?.scope && (target?.scope !== 'personal' || document.memberId === target.memberId) ? document : null
}

function SourceDrawer({ document, onClose }) {
  if (!document) return null
  return <aside className="source-drawer" role="region" aria-label="선택한 근거"><header><div><small>ALLOWLISTED SOURCE</small><h3>{document.title}</h3></div><button onClick={onClose} autoFocus>닫기</button></header><p>{document.excerpt}</p><dl><div><dt>Source path</dt><dd><code>{document.source}</code></dd></div><div><dt>Scope</dt><dd>{document.scope}</dd></div><div><dt>Record type</dt><dd>{document.knowledgeType}</dd></div></dl></aside>
}

function GuildAnswerScroll({ projection, onClose, onRetry }) {
  const [drawer, setDrawer] = useState(null)
  const scrollRef = useRef(null)
  const citationReturnFocus = useRef(null)
  const reply = projection?.reply
  const target = projection?.target
  const cited = (reply?.citations || []).map(item => safeCitation(item, target)).filter(Boolean)
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); return }
      if (event.key !== 'Tab') return
      const controls = [...(scrollRef.current?.querySelectorAll('button:not([disabled])') || [])]
      if (!controls.length) return
      const first = controls[0]; const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, drawer])
  if (!reply || !target) return null
  const label = target.scope === 'personal' ? `${target.displayName} 개인 Wiki` : '프로젝트 공통 기록'
  return <aside className="guild-answer-scroll" ref={scrollRef} role="dialog" aria-modal="true" aria-label={`${label} 전체 답변`}><header><div><small>GUILD ANSWER SCROLL</small><h2>{label}</h2><p>{modeCopy[reply.mode] || '응답 상태'} · {reply.sourceScope}</p></div><button className="exit-button" onClick={onClose} autoFocus>닫기</button></header><div className="answer-labels"><span>신뢰도: {reply.confidence}</span><span>기록 유형: {reply.knowledgeType}</span></div><p className="answer-text">{reply.mode === 'unsupported' ? '이 Wiki 기록에서는 답을 찾지 못했어요.' : reply.mode === 'error' ? '지금은 답변을 가져오지 못했어요.' : reply.answer}</p><p className="answer-limitation"><b>한계</b> {reply.limitation}</p>{reply.mode === 'error' && <button className="retry-answer" onClick={onRetry}>Guild Prompt에서 다시 질문하기</button>}<section className="scroll-citations"><h3>허용된 근거</h3>{cited.length ? cited.map(document => <button key={document.id} onClick={event => { citationReturnFocus.current = event.currentTarget; setDrawer(document) }}>근거 열기: {document.title}</button>) : <p>이 답변에는 표시할 허용 근거가 없습니다.</p>}</section><SourceDrawer document={drawer} onClose={() => { setDrawer(null); window.setTimeout(() => citationReturnFocus.current?.focus?.(), 0) }} /></aside>
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

const poseFor = (member, repository, seen) => repositoryPathState(member.id, repository, seen).pose || member.activity?.pose || 'neutral'
function CharacterMenu({ member, onAsk, onHome, onSkills, onChanges, onClose }) {
  useEffect(() => { const close = event => event.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [onClose])
  return <aside className="character-menu" role="dialog" aria-label={`${member.displayName}의 공개 Wiki 경로 행동`}><b>{member.displayName} · 공개 Wiki 경로 상태</b><code>members/{member.id}/wiki/</code><button onClick={onAsk}>질문하기</button><button onClick={onHome}>Wiki 집 열기</button><button onClick={onSkills}>배치 스킬 보기</button><button onClick={onChanges}>저장소 변화 보기</button></aside>
}
function SkillStation({ skills, detail, onDetail, onClose }) {
  return <aside className="skill-station" role="dialog" aria-modal="true" aria-label="배치된 Wiki 스킬"><button className="exit-button" onClick={onClose}>닫기</button><small>SKILL STATION</small><h2>배치된 harness</h2>{!skills.length && <p>아직 배치된 스킬이 없습니다. Wiki scaffold를 승인하면 이곳에 안전한 metadata만 놓입니다.</p>}{skills.map(skill => <button key={`${skill.scope}-${skill.memberId || 'project'}-${skill.id}`} className="skill-prop" onClick={() => onDetail(skill)}>{skill.scope === 'project' ? '길드홀' : skill.memberId} · {skill.id}</button>)}{detail && <article className="skill-detail"><h3>{detail.id}</h3><p>{detail.purpose}</p><code>{detail.allowedScope}</code><p>{detail.readiness}</p></article>}</aside>
}
function RepositoryChanges({ repository, scope, member, seenNews, onConfirm, onClose }) {
  useEffect(() => { const close = event => event.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [onClose])
  const memberId = member?.id || null
  const scopeLabel = scope === 'member' ? member ? `${member.displayName} · members/${member.id}/` : '선택된 member 공개 Wiki 경로' : '프로젝트 공통 · projects/'
  const includesScope = item => scope === 'member' ? item.scope === 'member' && item.memberId === memberId : item.scope === 'project'
  const dirty = (repository?.dirty || []).filter(includesScope); const remote = (repository?.remoteNews || []).filter(includesScope)
  const state = scope === 'member' && memberId ? repository?.members?.[memberId] : null
  const unseen = state?.remoteNews && state.remoteTip && seenNews[memberId] !== state.remoteTip
  const unavailable = !repository || repository.mode === 'error' || repository.mode === 'unavailable'
  return <aside className="repository-changes" role="dialog" aria-modal="true" aria-label={`${scopeLabel} 공개 Wiki 경로 변화`}><header><div><small>REPOSITORY CHANGES</small><h2>{scopeLabel}</h2><p>원문 diff 없이 허용된 공개 Wiki 경로 metadata만 표시합니다.</p></div><button className="exit-button" onClick={onClose} autoFocus>닫기</button></header>{unavailable && <p>아직 저장소 상태를 확인하지 못했습니다. Mission Board의 저장소 새 소식 확인을 사용하세요.</p>}<dl><div><dt>branch</dt><dd>{repository?.branch || repository?.mode || '확인 전'}</dd></div><div><dt>ahead / behind</dt><dd>{repository?.ahead || 0} / {repository?.behind || 0}{repository?.diverged ? ' · diverged' : ''}</dd></div><div><dt>fetch</dt><dd>{repository?.fetch?.outcome || 'not-requested'}</dd></div></dl><section><h3>로컬 작성 중</h3>{dirty.length ? <ul>{dirty.map(item => <li key={item.path}><code>{item.path}</code></li>)}</ul> : <p>표시할 로컬 공개 경로 변경이 없습니다.</p>}</section><section><h3>원격 새 기록</h3>{remote.length ? <ul>{remote.map(item => <li key={item.path}><code>{item.path}</code></li>)}</ul> : <p>표시할 원격 공개 경로 변경이 없습니다.</p>}</section>{unseen && <button className="confirm-news" onClick={onConfirm}>새 기록 확인</button>}</aside>
}

function App() {
  const [openMemberId, setOpenMemberId] = useState(null)
  const [answerTarget, setAnswerTarget] = useState({ scope: 'project' })
  const [answerProjection, setAnswerProjection] = useState(null)
  const [showAnswerScroll, setShowAnswerScroll] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [repository, setRepository] = useState(null)
  const [seenNews, setSeenNews] = useState(() => { try { const value = JSON.parse(localStorage.getItem('knowledge-guild-seen-news') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {} } catch { return {} } })
  const [dismissedBarks, setDismissedBarks] = useState({})
  const [changesScope, setChangesScope] = useState(null)
  const changesReturnFocus = useRef(null)
  const answerRequestId = useRef(0)
  const answerReturnFocus = useRef(null)
  const [showSkills, setShowSkills] = useState(false); const [skillDetail, setSkillDetail] = useState(null); const [skillScope, setSkillScope] = useState({ scope: 'project', memberId: null })
  const [onboardingState, setOnboardingState] = useState(() => ({ persistenceMode: 'local-writable', phase: snapshot.projectState === 'VILLAGE_READY' ? 'VILLAGE_READY' : snapshot.projectState === 'PROJECT_READY' ? 'MEMBER_ONBOARDING' : 'PROJECT_UNINITIALIZED' }))
  const openMember = snapshot.members.find(member => member.id === openMemberId) || null
  const selectedMember = snapshot.members.find(member => member.id === selectedMemberId) || null
  const checkRepository = async () => { try { const response = await fetch('/api/repository-status', { method: 'POST' }); const result = await response.json(); setRepository(result); setDismissedBarks({}); return result } catch { const result = { mode: 'error', message: '저장소 상태를 확인할 수 없습니다.', project: {} }; setRepository(result); return result } }
  const openChanges = (scope, memberId = null, trigger) => { changesReturnFocus.current = trigger || document.activeElement; setChangesScope({ scope, memberId }) }
  const closeChanges = () => { const currentScope = changesScope; setChangesScope(null); window.setTimeout(() => { const fallback = currentScope?.scope === 'member' ? document.querySelector(`.villager[data-member-id="${currentScope.memberId}"]`) : document.querySelector('.project-change-action'); (changesReturnFocus.current?.isConnected ? changesReturnFocus.current : fallback)?.focus?.() }, 0) }
  const confirmSeen = memberId => { const next = confirmMemberSeen(seenNews, memberId, repository); setSeenNews(next); try { localStorage.setItem('knowledge-guild-seen-news', JSON.stringify(next)) } catch {} closeChanges() }
  const bark = selectRepositoryBark(snapshot.members, repository, seenNews, dismissedBarks)
  const beginAnswer = target => { const requestId = answerRequestId.current + 1; answerRequestId.current = requestId; setShowAnswerScroll(false); setAnswerProjection(beginAnswerProjection(requestId, target)); return requestId }
  const receiveAnswer = (requestId, target, reply) => setAnswerProjection(current => resolveAnswerProjection(current, requestId, target, reply))
  const openAnswerScroll = event => { answerReturnFocus.current = event.currentTarget; setShowAnswerScroll(true) }
  const closeAnswerScroll = () => { setShowAnswerScroll(false); window.setTimeout(() => answerReturnFocus.current?.focus?.(), 0) }
  const dismissAnswer = () => { setShowAnswerScroll(false); setAnswerProjection(null) }
  const focusComposer = () => { closeAnswerScroll(); window.setTimeout(() => document.getElementById('guild-question')?.focus(), 0) }
  const bubbleView = answerBubbleView(answerProjection)
  const answerTargetId = answerProjection?.target?.memberId || null
  const setScopedAnswerTarget = target => { setAnswerTarget(target); setAnswerProjection(current => current?.phase === 'pending' && answerTargetKey(current.target) !== answerTargetKey(target) ? null : current) }

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
        <MissionBoard onAskProject={() => setScopedAnswerTarget({ scope: 'project' })} onSkills={() => { setSkillScope({ scope: 'project', memberId: null }); setSkillDetail(null); setShowSkills(true) }} onRepositoryCheck={checkRepository} onChanges={event => openChanges('project', null, event.currentTarget)} repository={repository} />
        {answerProjection?.target.scope === 'project' && <AnswerBubble project view={bubbleView} onOpen={openAnswerScroll} onDismiss={dismissAnswer} />}
        {snapshot.members.map((member, index) => (
          <MemberHome key={member.id} member={member} index={index} pose={answerProjection?.phase === 'pending' && answerTargetId === member.id ? 'querying' : poseFor(member, repository, seenNews)} querying={answerProjection?.phase === 'pending' && answerTargetId === member.id} answerBubble={answerTargetId === member.id ? bubbleView : null} onAnswerOpen={openAnswerScroll} onAnswerDismiss={dismissAnswer} bark={!shouldHideRepositoryBark(answerProjection) && bark?.member.id === member.id ? bark : null} onBarkOpen={event => openChanges('member', member.id, event.currentTarget)} onBarkDismiss={() => setDismissedBarks(value => ({ ...value, [bark.key]: true }))} onEnter={() => setOpenMemberId(member.id)} onSelect={() => setSelectedMemberId(member.id)} />
        ))}
        <div className="map-seal" aria-hidden="true"><b>KNOWLEDGE</b><span>GUILD</span></div>
      </section>
      {selectedMember && <CharacterMenu member={selectedMember} onClose={() => setSelectedMemberId(null)} onAsk={() => { setScopedAnswerTarget({ scope: 'personal', member: selectedMember }); setSelectedMemberId(null) }} onHome={() => { setOpenMemberId(selectedMember.id); setSelectedMemberId(null) }} onSkills={() => { setSkillScope({ scope: 'member', memberId: selectedMember.id }); setSkillDetail(null); setShowSkills(true); setSelectedMemberId(null) }} onChanges={event => { openChanges('member', selectedMember.id, event.currentTarget); setSelectedMemberId(null) }} />}
      {openMember && <HouseInterior key={openMember.id} member={openMember} onClose={() => setOpenMemberId(null)} onAsk={member => { setOpenMemberId(null); setScopedAnswerTarget({ scope: 'personal', member }) }} />}
      <AnswerPanel key={`${answerTarget.scope}-${answerTarget.member?.id || 'project'}`} target={answerTarget} docked suspendKeyboard={showAnswerScroll} onClose={() => setScopedAnswerTarget({ scope: 'project' })} onAnswerStart={beginAnswer} onAnswerResult={receiveAnswer} />
      {showSkills && <SkillStation skills={(snapshot.skills || []).filter(skill => skillScope.scope === 'member' ? skill.memberId === skillScope.memberId : skill.scope === 'project')} detail={skillDetail} onDetail={setSkillDetail} onClose={() => { setShowSkills(false); setSkillDetail(null) }} />}
      {changesScope && <RepositoryChanges repository={repository} scope={changesScope.scope} member={snapshot.members.find(member => member.id === changesScope.memberId)} seenNews={seenNews} onConfirm={() => confirmSeen(changesScope.memberId)} onClose={closeChanges} />}
      {showAnswerScroll && answerProjection?.phase === 'answer' && <GuildAnswerScroll projection={answerProjection} onClose={closeAnswerScroll} onRetry={focusComposer} />}
      <p className="sr-only" aria-live="polite">{openMember ? `${openMember.displayName}의 Wiki 집 내부` : '길드 마을'}</p>
    </main>
  )
}

export default App
