import { isValidFlowSummary, publicSource } from './flow-summary.js'


export const canRenderVillage = snapshot => snapshot?.projectState === 'FLOW_READY'
  && isValidFlowSummary(snapshot?.flow)
  && snapshot.flow.status === 'observed'

export const publicMemberDocuments = (member, documents = []) => {
  const documentsById = new Map(documents.map(document => [document.id, document]))
  return (member?.documentIds || []).map(id => documentsById.get(id))
    .filter(document => document?.scope === 'personal'
      && document.memberId === member.id
      && typeof document.source === 'string'
      && document.source.replaceAll('\\', '/').startsWith(`members/${member.id}/wiki/`))
}

export const publicMemberSkills = (member, skills = []) => skills
  .filter(skill => skill?.scope === 'member' && skill.memberId === member?.id)

export const publicFlowDocuments = (flow, documents = []) => {
  if (!isValidFlowSummary(flow)) return []
  const allowed = new Set(flow.evidencePaths)
  return documents.filter(document => allowed.has(document?.source)
    && publicSource(document.source)
    && (document.scope === 'project' || (document.scope === 'personal' && document.source.startsWith(`members/${document.memberId}/wiki/`))))
}

export const memberPublicChanges = (repository, memberId) => [...(repository?.remoteNews || []), ...(repository?.dirty || [])]
  .filter(item => item?.scope === 'member' && item.memberId === memberId)
