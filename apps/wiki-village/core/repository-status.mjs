import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const ignored = /(^|\/)(raw|output|private|secrets|\.wiki-migration-backup|\.git|node_modules)(\/|$)|(^|\/)(?:CONTEXT(?:\.private)?|CLAUDE)\.md$|\.env/i
// Repository status is a metadata view of public compiled Wiki pages only.
const memberPath = /^members\/([a-z0-9-]+)\/wiki\//
const projectPath = /^projects\/wiki\//
export const classifyWikiPath = path => {
  const safe = String(path || '').replaceAll('\\', '/')
  if (!safe || safe.includes('..') || ignored.test(safe)) return null
  const member = safe.match(memberPath)
  if (member) return { path: safe, scope: 'member', memberId: member[1] }
  return projectPath.test(safe) ? { path: safe, scope: 'project', memberId: null } : null
}
const git = async (cwd, args, timeout = 5000) => run('git', args, { cwd, timeout, windowsHide: true }).then(result => result.stdout.trim())
const paths = text => [...new Map(String(text || '').split(/\r?\n/).map(line => classifyWikiPath(line.trim())).filter(Boolean).map(item => [item.path, item])).values()]
const statusPaths = text => {
  const records = String(text || '').split('\0').filter(Boolean); const values = []
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]; const status = record.slice(0, 2); values.push(record.slice(3))
    if (/[RC]/.test(status)) values.push(records[++index] || '')
  }
  return [...new Map(values.map(classifyWikiPath).filter(Boolean).map(item => [item.path, item])).values()]
}
const count = items => ({ project: items.filter(item => item.scope === 'project').length, members: Object.fromEntries(items.filter(item => item.scope === 'member').map(item => [item.memberId, 1])) })
const commitFor = async (cwd, ref, paths) => { const values = Array.isArray(paths) ? paths : [paths]; const value = await git(cwd, ['log', '-1', '--format=%H|%cs', ref, '--', ...values]).catch(() => ''); const [commit, date] = value.split('|'); return commit ? { commit, date } : { commit: null, date: null } }
export async function repositoryStatus({ repoRoot, fetch = false } = {}) {
  const base = { mode: 'unavailable', branch: null, head: null, upstream: null, ahead: 0, behind: 0, diverged: false, fetch: { attempted: false, outcome: 'not-requested' }, dirty: [], remoteNews: [], project: { dirty: 0, remoteNews: 0 }, members: {}, message: '저장소 상태를 확인할 수 없습니다.' }
  try {
    if ((await git(repoRoot, ['rev-parse', '--is-inside-work-tree'])) !== 'true') return { ...base, mode: 'not-git', message: '이 위치는 Git 저장소가 아닙니다.' }
    const [branch, head, upstreamResult, dirtyText] = await Promise.all([git(repoRoot, ['branch', '--show-current']), git(repoRoot, ['rev-parse', 'HEAD']), git(repoRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']).catch(() => ''), git(repoRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])])
    const upstream = upstreamResult || null; let fetchOutcome = 'not-requested'
    if (fetch && upstream) { try { await git(repoRoot, ['fetch', '--prune'], 8000); fetchOutcome = 'ok' } catch { fetchOutcome = 'offline-or-failed' } }
    let ahead = 0; let behind = 0; let remoteNews = []
    if (upstream) { const [aheadBehind, mergeBase] = await Promise.all([git(repoRoot, ['rev-list', '--left-right', '--count', `${upstream}...HEAD`]).catch(() => '0 0'), git(repoRoot, ['merge-base', 'HEAD', upstream]).catch(() => '')]); const remoteText = mergeBase ? await git(repoRoot, ['diff', '--name-only', `${mergeBase}..${upstream}`]).catch(() => '') : ''; const [behindText, aheadText] = aheadBehind.split(/\s+/); behind = Number(behindText) || 0; ahead = Number(aheadText) || 0; remoteNews = paths(remoteText) }
    const dirty = statusPaths(dirtyText); const tracked = paths(await git(repoRoot, ['ls-files'])); const memberIds = [...new Set([...tracked, ...dirty, ...remoteNews].filter(item => item.memberId).map(item => item.memberId))]; const members = {}
    for (const id of memberIds) { const pathsForMember = [`members/${id}/wiki`]; const last = await commitFor(repoRoot, 'HEAD', pathsForMember); const remote = upstream ? await commitFor(repoRoot, upstream, pathsForMember) : { commit: null, date: null }; members[id] = { dirty: dirty.some(value => value.memberId === id), remoteNews: remoteNews.some(value => value.memberId === id), remoteTip: remote.commit, lastCommit: last.commit, lastDate: last.date } }
    const projectLast = await commitFor(repoRoot, 'HEAD', ['projects/wiki'])
    return { mode: 'live', branch: branch || '(detached)', head, upstream, ahead, behind, diverged: ahead > 0 && behind > 0, fetch: { attempted: Boolean(fetch && upstream), outcome: fetchOutcome }, dirty, remoteNews, project: { dirty: count(dirty).project, remoteNews: count(remoteNews).project, lastCommit: projectLast.commit, lastDate: projectLast.date }, members, message: upstream ? '공개 Wiki 경로 메타데이터만 확인했습니다.' : 'upstream이 없어 로컬 공개 Wiki 경로만 확인했습니다.' }
  } catch { return { ...base, mode: 'error', message: 'Git 상태 확인 중 오류가 발생했습니다.' } }
}
