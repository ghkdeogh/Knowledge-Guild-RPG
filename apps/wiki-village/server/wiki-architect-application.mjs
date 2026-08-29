import { analyzeProject } from './project-wiki-architect.mjs'
import { previewBlueprint, saveBlueprint } from './onboarding.mjs'

const event = (type, data = {}) => ({ type, at: 'session', ...data })

/** Headless application boundary shared by the local API, CLI, and UI projections. */
export async function runWikiArchitect(command, payload = {}, options = {}) {
  const events = [event('session.started', { command })]
  try {
    if (command === 'analyze') {
      const clarifications = Array.isArray(payload.clarifications) ? payload.clarifications.slice(0, 2) : []
      const analyzed = await analyzeProject({ statement: payload.statement, clarifications }, { providerConfig: options.providerConfig, responsesClient: options.responsesClient })
      const result = clarifications.length >= 2 ? { ...analyzed, nextQuestion: null } : analyzed
      events.push(event('answer.received', { mode: result.mode, providerStatus: result.providerStatus, diagnostic: result.diagnostic }), event('blueprint.proposed', { blueprint: result.blueprint }))
      if (result.nextQuestion) events.push(event('question.asked', { question: result.nextQuestion, count: clarifications.length + 1 }))
      events.push(event('approval.required', { reason: '승인 전에는 source 또는 compiled Wiki 파일을 만들지 않습니다.' }), event('session.completed', { phase: 'review' }))
      return { events, result }
    }
    if (command === 'preview') {
      const preview = previewBlueprint(payload)
      events.push(event('files.planned', { files: preview.files.map(file => file.path), digest: preview.digest }), event('approval.required', { digest: preview.digest }), event('session.completed', { phase: 'preview' }))
      return { events, result: { preview } }
    }
    if (command === 'save') {
      const preview = previewBlueprint(payload)
      events.push(event('files.planned', { files: preview.files.map(file => file.path), digest: preview.digest }))
      if (payload.expectedDigest !== preview.digest) throw Object.assign(new Error('Preview mismatch'), { status: 400, code: 'preview-mismatch' })
      const state = await saveBlueprint(payload, options)
      events.push(event('files.written', { files: preview.files.map(file => file.path) }), event('wiki.indexed', { phase: state.phase }), event('session.completed', { phase: state.phase }))
      return { events, result: { state } }
    }
    throw Object.assign(new Error('Unknown command'), { status: 400, code: 'invalid-action' })
  } catch (error) {
    events.push(event('validation.failed', { code: error.code || 'application-error', message: error.message }), event('session.completed', { phase: 'failed' }))
    throw Object.assign(error, { events })
  }
}
