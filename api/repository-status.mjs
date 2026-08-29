export default function handler(_req, res) {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ mode: 'unavailable', capability: 'snapshot-only', branch: null, head: null, upstream: null, ahead: 0, behind: 0, diverged: false, fetch: { attempted: false, outcome: 'deployment-disabled' }, dirty: [], remoteNews: [], project: { dirty: 0, remoteNews: 0 }, members: {}, message: '배포 화면에서는 저장소 확인을 실행하지 않습니다. 로컬 CLI 또는 localhost에서 공개 Wiki 경로를 확인하세요.' }))
}
