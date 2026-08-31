import { access, lstat, mkdir, mkdtemp, realpath, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, parse, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { runWikiArchitect } from '../core/wiki-architect.mjs'

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repoRoot = resolve(appRoot, '..', '..')
const comparablePath = path => process.platform === 'win32' ? path.toLowerCase() : path
const within = (base, candidate) => {
  const safeBase = comparablePath(base)
  const safeCandidate = comparablePath(candidate)
  return safeCandidate === safeBase || safeCandidate.startsWith(`${safeBase}${sep}`)
}
const exists = async path => lstat(path).then(() => true).catch(error => {
  if (error.code === 'ENOENT') return false
  throw error
})
const fail = (message, code) => Object.assign(new Error(message), { code })

export async function createReleaseQuickstart({ target, temporary = false, run = runWikiArchitect } = {}) {
  if (temporary === Boolean(target)) throw fail('Choose exactly one of temporary mode or an explicit --target path.', 'release-target-required')
  let root
  let ownedRoot = false
  if (temporary) {
    root = await mkdtemp(join(tmpdir(), 'knowledge-guild-release-'))
    ownedRoot = true
    if (within(await realpath(repoRoot), await realpath(root))) { await rm(root, { recursive: true, force: true }); throw fail('The OS temporary directory is inside this repository.', 'release-target-workspace') }
  } else {
    if (!isAbsolute(target)) throw fail('The release quickstart target must be an absolute path.', 'release-target-absolute')
    root = resolve(target)
    if (root === parse(root).root) throw fail('The release quickstart target must stay outside this repository.', 'release-target-workspace')
    const parent = await realpath(dirname(root)).catch(() => { throw fail('The release quickstart target parent must already exist.', 'release-target-parent') })
    root = join(parent, basename(root))
    if (within(await realpath(repoRoot), root)) throw fail('The release quickstart target must stay outside this repository.', 'release-target-workspace')
    if (await exists(root)) throw fail('The release quickstart target must not already exist.', 'release-target-exists')
    await mkdir(root)
    ownedRoot = true
  }

  try {
    const analyzed = await run('analyze', { statement: '학습 팀이 기술 실험을 정리하고 반복 가능한 교육 결과를 만들고 싶다.' }, { repoRoot: root, providerConfig: {} })
    const identity = { memberId: 'sample-author', displayName: 'Sample Author', workingContext: '승인된 샘플 Wiki 구조를 검토합니다.' }
    if (analyzed.result.mode !== 'local-draft' || analyzed.result.providerStatus !== 'not-configured') throw fail('The release quickstart must use the credential-free local draft.', 'release-provider-configured')
    const previewed = await run('preview-workspace', { blueprint: analyzed.result.blueprint, identity }, { repoRoot: root })
    const saved = await run('save-workspace', { blueprint: analyzed.result.blueprint, identity, expectedDigest: previewed.result.preview.digest }, { repoRoot: root, refresh: false })
    const required = ['projects/PROJECT_CONTEXT.md', 'projects/WIKI_BLUEPRINT.md', 'projects/harnesses/query.SKILL.md', 'members/sample-author/CONTEXT.md', 'members/sample-author/WIKI_SCHEMA.md', 'members/sample-author/wiki/index.md', 'members/sample-author/harnesses/query.SKILL.md']
    await Promise.all(required.map(path => access(join(root, path))))
    if (saved.result.state.phase !== 'VILLAGE_READY') throw fail('The release quickstart did not create a ready village scaffold.', 'release-scaffold-invalid')
    return { root, temporary, phase: saved.result.state.phase, files: required }
  } catch (error) {
    if (ownedRoot) await rm(root, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const temporary = args.length === 1 && args[0] === '--temp'
  const target = args.length === 2 && args[0] === '--target' && args[1] && !args[1].startsWith('--') ? args[1] : null
  if (!temporary && !target) {
    process.stderr.write('Usage: node scripts/release-quickstart.mjs --temp | --target <new-absolute-directory>\n')
    process.exitCode = 1
  } else {
    try {
      const result = await createReleaseQuickstart({ target, temporary })
      process.stdout.write(`${JSON.stringify({ type: 'release-quickstart.completed', ...result })}\n`)
    } catch (error) {
      process.stderr.write(`${error.code || 'release-quickstart-failed'}: ${error.message}\n`)
      process.exitCode = 1
    }
  }
}
