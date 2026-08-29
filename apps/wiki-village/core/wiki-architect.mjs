import { getOnboardingState } from '../server/onboarding.mjs'
import { runWikiArchitect as applicationRun } from '../server/wiki-architect-application.mjs'

/** Stable headless core entrypoint for CLI, local API, and UI event projections. */
export async function runWikiArchitect(command, payload = {}, options = {}) {
  if (command === 'status') {
    const state = await getOnboardingState(options)
    return { events: [{ type: 'session.started', at: 'session', command }, { type: 'session.completed', at: 'session', phase: state.phase }], result: { state } }
  }
  return applicationRun(command === 'clarify' || command === 'init' ? 'analyze' : command === 'apply' ? 'save' : command, payload, options)
}
