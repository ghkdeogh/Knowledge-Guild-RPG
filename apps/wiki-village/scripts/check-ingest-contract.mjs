import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const fail = message => { throw new Error(message) }
const expect = (value, message) => { if (!value) fail(message) }
const appRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(appRoot, '..', '..')
const [prompt, initializer, readme] = await Promise.all([
  readFile(resolve(repoRoot, 'prompts', 'ingest.md'), 'utf8'),
  readFile(resolve(appRoot, 'server', 'personal-wiki-initializer.mjs'), 'utf8'),
  readFile(resolve(repoRoot, 'README.md'), 'utf8')
])

const ordered = values => values.every((value, index) => index === 0 || prompt.indexOf(values[index - 1]) < prompt.indexOf(value))
expect(prompt.includes('방금 raw/에 저장한 글이 있어. 인제스트해줘.'), 'Ingest trigger is missing')
expect(ordered(['대상 선택·raw 읽기 전용·SHA-256 before 기록', '핵심 주장, 엔티티(사람·도구·조직), 개념 분석 제시', '질문 1 하나만 묻고 답변 대기', '질문 2 하나만 묻고 답변 대기', '질문 3 하나만 묻고 답변 대기', '중복 검사와 Wiki 반영 preview 제시', '사용자의 명시적 preview 승인 후에만 Wiki 반영', 'raw SHA-256 after 재확인과 완료 보고']), 'Ingest state sequence is incomplete or reordered')
expect(ordered(['왜 이 글을 캡처했나요?', '이 글은 현재 하고 있는 일과 어떻게 연결되나요?', '이 글로 무엇을 해보고 싶나요?']), 'Ingest interview questions are not exact and one-at-a-time')
expect(prompt.includes('세 답변 전에는 `wiki/` 파일을 생성·수정하지 않는다.') && prompt.includes('raw hash before/after가 다르면 Wiki를 쓰지 말고 중단한다.') && prompt.includes('preview 승인 후에만 Wiki 반영'), 'No-write-before-answers or raw immutability boundary is missing')
expect(['PROFILE.md', 'CONTEXT.md', 'root `CLAUDE.md`', 'WIKI_SCHEMA.md', 'raw/CLAUDE.md', 'wiki/CLAUDE.md', 'wiki/index.md', 'wiki/log.md'].every(value => prompt.includes(value)), 'Ingest context read contract is incomplete')
expect(prompt.includes('기존 문서 업데이트를 새 문서 생성보다 우선한다.') && prompt.includes('wiki/sources/<slug>.md') && prompt.includes('같은 raw 상대 경로 또는 SHA-256'), 'Duplicate detection or safe summary fallback is missing')
expect(['**사실**', '**소스의 주장**', '**사용자 해석**', '**AI 추론**', 'wiki/index.md', 'wiki/log.md'].every(value => prompt.includes(value)), 'Provenance, index, or log contract is incomplete')
expect(prompt.includes('`harnesses/`, `*.SKILL.md`, `WIKI_INDEX.md`, `ACTIVITY_LOG.md`도 만들지 않는다.') && !prompt.includes('git push'), 'Ingest prompt permits forbidden generated artifacts or publishing')
expect(initializer.includes('When a user says "인제스트해줘", follow prompts/ingest.md') && initializer.includes('For an approved ingest, update the relevant compiled pages, wiki/index.md, and wiki/log.md together'), 'Generated root or scoped CLAUDE contract omits ingest workflow')
expect(readme.includes('방금 raw/에 저장한 글이 있어. 인제스트해줘.') && readme.includes('raw는 Git이나 수정 대상이 아닙니다.'), 'README lacks safe conversational ingest guidance')

console.log('Validated conversational ingest sequence, one-at-a-time questions, raw immutability, preview boundary, personalized routing, and CLAUDE/README contracts.')
