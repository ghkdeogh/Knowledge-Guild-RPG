import { resolve } from 'node:path'
import { repositoryStatus } from '../core/repository-status.mjs'
const appRoot = resolve(import.meta.dirname, '..'); const defaultRoot = resolve(appRoot, '..', '..')
const loopback = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)
export const repositoryStatusMiddleware = ({ repoRoot = defaultRoot, readOnly = process.env.VERCEL === '1' } = {}) => async (req, res, next) => {
  if (req.method !== 'POST' || String(req.url).split('?')[0] !== '/api/repository-status') return next()
  const local = loopback(req.socket?.remoteAddress || '')
  const result = await repositoryStatus({ repoRoot, fetch: local && !readOnly })
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ...result, capability: local && !readOnly ? 'manual-local-check' : 'snapshot-only' }))
}
