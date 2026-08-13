import { buildSystemInstruction } from './psychMapPrompt.js'

const readBody = request => new Promise((resolve, reject) => {
  let body = ''
  request.on('data', chunk => {
    body += chunk
    if (body.length > 1_000_000) reject(new Error('Request is too large'))
  })
  request.on('end', () => resolve(body))
  request.on('error', reject)
})

const sendJson = (response, status, payload) => {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

export function psychMapGeminiPlugin(env) {
  const handler = async (request, response, next) => {
    if (request.url !== '/api/insight') return next()
    if (request.method !== 'POST') return sendJson(response, 405, { error: 'POST required' })

    const apiKey = env.GEMINI_API_KEY
    if (!apiKey) return sendJson(response, 503, { error: 'Gemini is not configured', code: 'GEMINI_NOT_CONFIGURED' })

    try {
      const { question, evidencePacket, professionId } = JSON.parse(await readBody(request))
      if (typeof question !== 'string' || !question.trim() || !evidencePacket?.selectedPeriod) {
        return sendJson(response, 400, { error: 'A question and evidence packet are required' })
      }

      const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
      const geminiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildSystemInstruction(professionId) }] },
          contents: [{ role: 'user', parts: [{ text: `Clinician question:\n${question.trim()}\n\nEvidence packet:\n${JSON.stringify(evidencePacket)}` }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 320 },
        }),
      })
      const payload = await geminiResponse.json()
      if (!geminiResponse.ok) throw new Error(payload?.error?.message || `Gemini request failed (${geminiResponse.status})`)
      const answer = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim()
      if (!answer) throw new Error('Gemini returned no readable answer')
      return sendJson(response, 200, { answer, provider: 'Gemini', model })
    } catch (error) {
      return sendJson(response, 502, { error: error.message || 'Gemini request failed', code: 'GEMINI_REQUEST_FAILED' })
    }
  }

  return {
    name: 'psych-map-gemini-api',
    configureServer(server) { server.middlewares.use(handler) },
    configurePreviewServer(server) { server.middlewares.use(handler) },
  }
}
