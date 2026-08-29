import { wikiChatMiddleware } from '../apps/wiki-village/server/wiki-chat.mjs'

const chat = wikiChatMiddleware({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
  reasoningEffort: process.env.OPENAI_REASONING_EFFORT || 'low',
})

export default function handler(req, res) {
  return chat(req, res, () => {
    res.writeHead(405, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'POST 요청만 허용됩니다.' }))
  })
}
