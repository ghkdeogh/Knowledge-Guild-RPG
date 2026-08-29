import { useEffect, useRef, useState } from 'react'

const projectSteps = [
  { key: 'opening', prompt: '환영합니다. 처음 떠오른 이야기를 남겨도 좋아요. 이어서 꼭 확인할 질문이 있습니다.', label: '처음 떠오른 이야기 (선택)' },
  { key: 'projectName', prompt: '여러분은 어떤 프로젝트를 진행하려고 하나요?', label: '프로젝트 이름', required: true },
  { key: 'summary', prompt: '한 줄로 어떤 프로젝트인지 소개해 주세요.', label: '한 줄 설명', required: true },
  { key: 'problem', prompt: '어떤 문제를 해결하려고 하나요?', label: '해결하려는 문제', required: true },
  { key: 'audience', prompt: '누구를 위한 프로젝트인가요?', label: '대상 사용자', required: true },
  { key: 'outcome', prompt: '어떤 목표나 결과를 원하나요?', label: '원하는 목표·결과', required: true },
]
const memberSteps = [
  { key: 'memberId', prompt: '당신은 누구인가요? 다시 바뀌지 않을 member-id도 정해 주세요.', label: 'member-id (영문 소문자·숫자·하이픈)', required: true },
  { key: 'identity', prompt: '화면에 표시할 당신의 이름 또는 호칭은 무엇인가요?', label: '표시 이름', required: true },
  { key: 'perspective', prompt: '이 프로젝트에 대한 개인 관점을 들려주세요.', label: '개인 관점', required: true },
  { key: 'role', prompt: '어떤 역할로 참여하나요?', label: '참여 역할', required: true },
  { key: 'dataCollection', prompt: '어떤 데이터를 수집할 계획인가요?', label: '수집할 데이터', required: true },
  { key: 'desiredOutcome', prompt: '개인적으로 어떤 결과를 원하나요?', label: '원하는 결과', required: true },
]
const initialProject = { projectName: '', summary: '', problem: '', audience: '', outcome: '' }
const initialMember = { memberId: '', identity: '', perspective: '', role: '', dataCollection: '', desiredOutcome: '' }
const request = async body => {
  const response = await fetch('/api/onboarding', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const result = await response.json()
  if (!response.ok) throw Object.assign(new Error(result.error || '요청을 완료하지 못했습니다.'), { code: result.code })
  return result
}

function Preview({ preview, mode, onBack, onConfirm, busy, error }) {
  return <section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="preview-title">
    <small>WRITE PREVIEW</small><h1 id="preview-title">생성 전 확인</h1>
    <p>서버가 고정 schema로 만들 파일입니다. 브라우저는 로컬 파일을 직접 읽거나 쓰지 않습니다.</p>
    <div className="file-preview">{preview.files.map(file => <details key={file.path}><summary>{file.path}</summary><pre>{file.content}</pre></details>)}</div>
    {mode === 'read-only-demo' ? <p className="onboarding-notice">이 배포 화면은 읽기 전용입니다. 아래 미리보기는 저장되지 않습니다. 내용을 복사해 로컬 실행에서 확인·저장하거나, 향후 GitHub 연동을 사용해야 합니다.</p> : <p className="onboarding-notice">저장 범위: 이 미리보기에 보이는 canonical 경로만 생성합니다. 기존 파일은 덮어쓰지 않습니다.</p>}
    {error && <p className="onboarding-error" role="alert">{error}</p>}
    <footer><button onClick={onBack} disabled={busy}>수정하기</button><button className="primary" onClick={onConfirm} disabled={busy || mode === 'read-only-demo'}>{busy ? '저장 확인 중…' : '확인하고 생성'}</button></footer>
  </section>
}

export default function Onboarding({ serverState, onStateChange }) {
  const [stage, setStage] = useState('interview')
  const [index, setIndex] = useState(0)
  const [project, setProject] = useState(initialProject)
  const [member, setMember] = useState(initialMember)
  const [opening, setOpening] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [rewardKind, setRewardKind] = useState(null)
  const [pendingState, setPendingState] = useState(null)
  const inputRef = useRef(null)
  const isProject = serverState.phase === 'PROJECT_UNINITIALIZED'
  const steps = isProject ? projectSteps : memberSteps
  const draft = isProject ? project : member
  const step = steps[index]

  useEffect(() => { setStage('interview'); setIndex(0); setPreview(null); setError('') }, [serverState.phase])
  useEffect(() => { inputRef.current?.focus() }, [index, stage])
  if (stage === 'reward') return <section className="onboarding-card onboarding-reward" role="dialog" aria-modal="true" aria-labelledby="reward-title"><span className="reward-sprite" aria-hidden="true">✦</span><small>CREATED</small><h1 id="reward-title">{rewardKind === 'project' ? '프로젝트 길드홀이 태어났어요!' : '당신의 Wiki 캐릭터가 태어났어요!'}</h1><p>{rewardKind === 'project' ? '이제 개인 관점과 역할을 기록해 첫 길드 캐릭터를 만들 차례입니다.' : '프로젝트 건물과 개인 Wiki가 있는 마을로 들어갑니다.'}</p><button className="primary" autoFocus onClick={() => rewardKind === 'project' ? onStateChange(pendingState) : window.location.reload()}>계속하기</button></section>
  if (preview) return <Preview preview={preview} mode={serverState.persistenceMode} onBack={() => { setPreview(null); setError('') }} busy={busy} error={error} onConfirm={async () => {
    if (serverState.persistenceMode === 'read-only-demo') return
    setBusy(true); setError('')
    try { const action = isProject ? 'save-project' : 'save-member'; const result = await request({ action, [isProject ? 'project' : 'member']: draft, expectedDigest: preview.digest }); setRewardKind(isProject ? 'project' : 'member'); setPendingState(result); setPreview(null); setStage('reward') } catch (saveError) { setError(saveError.message) } finally { setBusy(false) }
  }} />
  const value = step.key === 'opening' ? opening : draft[step.key]
  const setValue = next => {
    if (step.key === 'opening') { setOpening(next); return }
    const update = isProject ? setProject : setMember
    update(current => ({ ...current, [step.key]: next }))
  }
  const next = async event => {
    event.preventDefault(); setError('')
    if (step.required && !String(value || '').trim()) { setError('이 질문에 답한 뒤 계속해 주세요.'); return }
    if (step.key === 'opening' && value.trim() && !project.summary) setProject(current => ({ ...current, summary: value.trim().slice(0, 180) }))
    if (index < steps.length - 1) { setIndex(current => current + 1); return }
    setBusy(true)
    try { const action = isProject ? 'preview-project' : 'preview-member'; const result = await request({ action, [isProject ? 'project' : 'member']: draft }); setPreview(result.preview) } catch (previewError) { setError(previewError.message) } finally { setBusy(false) }
  }
  return <section className="onboarding-layer" aria-label="Knowledge Guild RPG 온보딩"><div className="onboarding-scene" aria-hidden="true"><i className="prologue-hall" /><i className="prologue-guide" /></div><form className="onboarding-card" onSubmit={next}><small>{isProject ? 'PROJECT PROLOGUE' : 'MEMBER CHAPTER'} · {index + 1}/{steps.length}</small><div className="onboarding-progress" aria-label={`온보딩 ${index + 1} / ${steps.length}`}><i style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div><h1>{step.prompt}</h1>{step.key === 'opening' && <p>첫 이야기는 버리지 않고 다음 답의 후보로만 활용합니다. 프로젝트의 공통 사실로 저장되지는 않습니다.</p>}<label htmlFor="onboarding-answer">{step.label}</label><textarea ref={inputRef} id="onboarding-answer" value={value} onChange={event => setValue(event.target.value)} maxLength="420" placeholder={step.required ? '여기에 답해 주세요.' : '건너뛰어도 됩니다.'} />{error && <p className="onboarding-error" role="alert">{error}</p>}<footer>{index > 0 && <button type="button" onClick={() => setIndex(current => current - 1)}>이전</button>}<button className="primary" type="submit" disabled={busy}>{index === steps.length - 1 ? '파일 미리보기' : '다음 질문'}</button></footer><p className="onboarding-mode">현재 저장 모드: <b>{serverState.persistenceMode === 'read-only-demo' ? '읽기 전용 배포' : '로컬 쓰기 가능'}</b></p></form></section>
}
