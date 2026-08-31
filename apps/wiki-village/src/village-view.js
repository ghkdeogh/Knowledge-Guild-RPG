export const canRenderVillage = snapshot => ['PROJECT_READY', 'VILLAGE_READY'].includes(snapshot?.projectState)
  && typeof snapshot?.projectContext?.title === 'string'
  && snapshot.projectContext.title.trim().length > 0

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

export const memberPublicChanges = (repository, memberId) => [...(repository?.remoteNews || []), ...(repository?.dirty || [])]
  .filter(item => item?.scope === 'member' && item.memberId === memberId)
