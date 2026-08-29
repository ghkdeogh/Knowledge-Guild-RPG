import { access, lstat, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createReleaseQuickstart } from './release-quickstart.mjs'
import { runWikiArchitect } from '../core/wiki-architect.mjs'

const run = promisify(execFile)
const appRoot = resolve('.')
const script = join(appRoot, 'scripts', 'release-quickstart.mjs')
const required = ['projects/PROJECT_CONTEXT.md', 'projects/WIKI_BLUEPRINT.md', 'projects/harnesses/query.SKILL.md', 'members/sample-author/CONTEXT.md', 'members/sample-author/WIKI_SCHEMA.md', 'members/sample-author/wiki/index.md', 'members/sample-author/harnesses/query.SKILL.md']
const expect = (condition, message) => { if (!condition) throw new Error(message) }
const missing = async path => lstat(path).then(() => false).catch(error => error.code === 'ENOENT')
const runCli = args => run(process.execPath, [script, ...args], { cwd: appRoot })
const readResult = async args => {
  const result = await runCli(args)
  const payload = JSON.parse(result.stdout.trim())
  expect(payload.type === 'release-quickstart.completed' && payload.phase === 'VILLAGE_READY', 'Quickstart CLI did not emit a ready completion event')
  await Promise.all(required.map(path => access(join(payload.root, path))))
  return payload
}
const parent = await mkdtemp(join(tmpdir(), 'knowledge-guild-release-check-'))
const linkParent = await mkdtemp(join(tmpdir(), 'knowledge-guild-release-link-'))
const roots = []
try {
  const temporary = await readResult(['--temp']); roots.push(temporary.root)
  const explicitTarget = join(parent, 'fresh-sample'); const explicit = await readResult(['--target', explicitTarget]); roots.push(explicit.root); expect(await realpath(explicit.root) === await realpath(explicitTarget), 'Explicit quickstart target changed unexpectedly')
  await runCli(['--target', explicitTarget]).then(() => { throw new Error('Existing target was accepted') }, error => expect(error.stderr.includes('release-target-exists'), 'Existing target failed with the wrong safety code'))
  await runCli(['--target', 'relative-target']).then(() => { throw new Error('Relative target was accepted') }, error => expect(error.stderr.includes('release-target-absolute'), 'Relative target failed with the wrong safety code'))
  await runCli(['--target', appRoot]).then(() => { throw new Error('Workspace target was accepted') }, error => expect(error.stderr.includes('release-target-workspace'), 'Workspace target failed with the wrong safety code'))
  if (process.platform === 'win32') {
  if (process.platform === 'win32') await runCli(['--target', appRoot.toUpperCase()]).then(() => { throw new Error('Case-variant workspace target was accepted') }, error => expect(error.stderr.includes('release-target-workspace'), 'Case-variant workspace target failed with the wrong safety code'))
  }
  const link = join(linkParent, 'workspace-link'); await symlink(appRoot, link, process.platform === 'win32' ? 'junction' : 'dir'); await runCli(['--target', join(link, 'escaped-sample')]).then(() => { throw new Error('Symlinked workspace target was accepted') }, error => expect(error.stderr.includes('release-target-workspace'), 'Symlinked workspace target failed with the wrong safety code'))
  const failedTarget = join(parent, 'failed-sample')
  await createReleaseQuickstart({ target: failedTarget, run: async (command, payload, options) => {
    if (command !== 'save') return runWikiArchitect(command, payload, options)
    await mkdir(join(options.repoRoot, 'projects'), { recursive: true })
    await writeFile(join(options.repoRoot, 'projects', 'partial.md'), 'partial')
    throw Object.assign(new Error('forced save failure'), { code: 'forced-save-failure' })
  } }).then(() => { throw new Error('Forced save failure was accepted') }, error => expect(error.code === 'forced-save-failure', 'Forced save failure had the wrong code'))
  expect(await missing(failedTarget), 'Failed explicit target was not cleaned up')
  console.log('Validated CLI quickstart scaffold, explicit target, platform-safe workspace and symlink boundaries, and partial-target cleanup.')
} finally {
  for (const path of [...roots, parent, linkParent]) await rm(path, { recursive: true, force: true })
}
