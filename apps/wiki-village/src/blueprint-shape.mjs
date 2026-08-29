const isObject = value => value && typeof value === 'object' && !Array.isArray(value)
const isStringArray = value => Array.isArray(value) && value.every(item => typeof item === 'string')
const isNamedItems = value => Array.isArray(value) && value.every(item => isObject(item) && typeof item.id === 'string' && typeof item.reason === 'string')
const isPageTypes = value => isNamedItems(value) && value.every(item => typeof item.label === 'string')

// Advanced JSON bypasses the server normalizer until preview. Keep the UI's
// rendering contract explicit so malformed drafts cannot break the editor.
export const isRenderableBlueprint = value => isObject(value)
  && isObject(value.brief)
  && ['projectName', 'purpose', 'target', 'outcome'].every(key => typeof value.brief[key] === 'string')
  && ['knownFacts', 'assumptions', 'unknowns'].every(key => isStringArray(value.brief[key]))
  && isPageTypes(value.pageTypes)
  && isNamedItems(value.sourceCategories)
  && isNamedItems(value.outputTypes)
  && isStringArray(value.harnesses)
  && typeof value.rationale === 'string'
