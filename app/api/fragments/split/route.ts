import { NextRequest, NextResponse } from 'next/server'

const MAX_INPUT_LENGTH = 20_000
const MAX_FRAGMENTS = 40

interface OpenAIResponse {
  status?: string
  incomplete_details?: { reason?: string }
  output?: Array<{
    type?: string
    content?: Array<
      | { type: 'output_text'; text: string }
      | { type: 'refusal'; refusal: string }
    >
  }>
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const input = text.trim()
    if (input.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Text must be ${MAX_INPUT_LENGTH.toLocaleString()} characters or fewer` },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI is not configured' }, { status: 503 })
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        store: false,
        reasoning: { effort: 'low' },
        max_output_tokens: 4096,
        input: [
          {
            role: 'developer',
            content: [
              'Break the user text into atomic idea fragments.',
              'Each fragment must express one meaningful, self-contained idea.',
              'Preserve the author’s meaning and wording where practical.',
              'Do not add facts, commentary, headings, or interpretation.',
              'Keep related clauses together when separating them would make either fragment unclear.',
              `Return no more than ${MAX_FRAGMENTS} fragments.`,
            ].join(' '),
          },
          { role: 'user', content: input },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'idea_fragments',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                fragments: {
                  type: 'array',
                  items: { type: 'string', minLength: 1 },
                  minItems: 1,
                  maxItems: MAX_FRAGMENTS,
                },
              },
              required: ['fragments'],
              additionalProperties: false,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      console.error('[api/fragments/split] OpenAI error', response.status)
      return NextResponse.json({ error: 'Could not split the text' }, { status: 502 })
    }

    const result = await response.json() as OpenAIResponse
    if (result.status === 'incomplete') {
      console.error('[api/fragments/split] Incomplete response', result.incomplete_details?.reason)
      return NextResponse.json({ error: 'The AI response was incomplete' }, { status: 502 })
    }

    const content = result.output
      ?.find(item => item.type === 'message')
      ?.content?.[0]

    if (!content || content.type === 'refusal') {
      return NextResponse.json({ error: 'The text could not be processed' }, { status: 422 })
    }

    const parsed = JSON.parse(content.text) as { fragments?: unknown }
    const fragments = Array.isArray(parsed.fragments)
      ? parsed.fragments
          .filter((fragment): fragment is string => typeof fragment === 'string')
          .map(fragment => fragment.trim())
          .filter(Boolean)
          .slice(0, MAX_FRAGMENTS)
      : []

    if (fragments.length === 0) {
      return NextResponse.json({ error: 'No meaningful fragments were found' }, { status: 422 })
    }

    return NextResponse.json({ fragments })
  } catch (error) {
    console.error('[api/fragments/split]', error)
    return NextResponse.json({ error: 'Could not split the text' }, { status: 500 })
  }
}
