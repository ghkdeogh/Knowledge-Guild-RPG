import { useEffect, useMemo, useState } from 'react'
import snapshot from './data/wiki-snapshot.json'

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

function PixelAvatar({ member, tone, onEnter }) {
  const role = member.role?.id || 'archivist'
  return (
    <button className={`villager ${tone} role-${role}`} onClick={onEnter} aria-label={`${member.displayName}의 집에 들어가기`}>
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

function MemberHome({ member, index, onEnter }) {
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
      <PixelAvatar member={member} tone={tone} onEnter={onEnter} />
    </section>
  )
}

function BookIcon({ tone = 0 }) {
  return <span className={`book-icon tone-${tone % 4}`} aria-hidden="true"><i /><i /><i /></span>
}

function HouseInterior({ member, onClose }) {
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

function App() {
  const [openMemberId, setOpenMemberId] = useState(null)
  const openMember = snapshot.members.find(member => member.id === openMemberId) || null

  return (
    <main className="village-app">
      <section className="village-map" aria-label="Knowledge Guild 마을">
        <VillageScenery />
        {snapshot.members.map((member, index) => (
          <MemberHome key={member.id} member={member} index={index} onEnter={() => setOpenMemberId(member.id)} />
        ))}
        <div className="map-seal" aria-hidden="true"><b>KNOWLEDGE</b><span>GUILD</span></div>
      </section>
      {openMember && <HouseInterior key={openMember.id} member={openMember} onClose={() => setOpenMemberId(null)} />}
      <p className="sr-only" aria-live="polite">{openMember ? `${openMember.displayName}의 Wiki 집 내부` : '길드 마을'}</p>
    </main>
  )
}

export default App
