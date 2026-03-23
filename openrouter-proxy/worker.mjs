const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-4.1-mini'

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      ...(init.headers ?? {}),
    },
  })
}

function corsHeaders(init = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    ...init,
  }
}

function buildPrompt(rawText) {
  return [
    'Extract structured syllabus data from the text below.',
    'Return JSON only with this shape:',
    '{"course":{"title":"","code":"","day":"","startTime":"","endTime":"","location":"","profName":"","profEmail":"","taName":"","taEmail":""},"events":[{"title":"","courseCode":"","date":"YYYY-MM-DD","time":"","priority":"low|medium|high","type":"assignment|exam"}]}',
    'Rules:',
    '- If a field is unknown, use an empty string.',
    '- Use 24-hour time like 13:30.',
    '- Use ISO dates like 2026-04-02.',
    '- Include only assignment or exam events.',
    '- Do not include markdown fences or commentary.',
    '',
    rawText,
  ].join('\n')
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 })
    }

    if (!env.OPENROUTER_API_KEY) {
      return json({ error: 'Missing OPENROUTER_API_KEY secret' }, { status: 500 })
    }

    try {
      const { rawText } = await request.json()
      if (typeof rawText !== 'string' || rawText.trim().length === 0) {
        return json({ error: 'rawText is required' }, { status: 400 })
      }

      const upstream = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.PUBLIC_APP_URL ?? 'https://carleton-bit.github.io/group-projects-backdoor-corp/',
          'X-Title': 'StudentHub Syllabus Parser',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: buildPrompt(rawText.slice(0, 120000)),
            },
          ],
        }),
      })

      if (!upstream.ok) {
        const text = await upstream.text()
        return json({ error: 'OpenRouter request failed', details: text }, { status: upstream.status })
      }

      const payload = await upstream.json()
      const content = payload?.choices?.[0]?.message?.content
      if (typeof content !== 'string') {
        return json({ error: 'OpenRouter returned no message content' }, { status: 502 })
      }

      return json(JSON.parse(content))
    } catch (error) {
      return json(
        {
          error: 'Proxy failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      )
    }
  },
}
