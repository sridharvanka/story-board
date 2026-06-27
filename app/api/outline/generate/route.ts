import { NextRequest, NextResponse } from 'next/server'

interface OpenAIResponse {
  status?: string
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
    const { fragments, connections } = await req.json()

    if (!Array.isArray(fragments) || fragments.length === 0) {
      return NextResponse.json({ order: [] })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI is not configured' }, { status: 503 })
    }

    const fragLines = fragments
      .map((fragment: { id: number; text: string }) => `[${fragment.id}] ${fragment.text}`)
      .join('\n')

    const acceptedConnections = Array.isArray(connections)
      ? connections.filter((connection: { status: string }) => connection.status === 'accepted')
      : []
    const connectionLines = acceptedConnections.length > 0
      ? acceptedConnections
          .map((connection: { from_id: number; label: string; to_id: number }) =>
            `[${connection.from_id}] --${connection.label}--> [${connection.to_id}]`
          )
          .join('\n')
      : 'No accepted connections yet.'

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_OUTLINE_MODEL || 'gpt-5.4',
        store: false,
        reasoning: { effort: 'medium' },
        max_output_tokens: 4096,
        input: [
          {
            role: 'developer',
            content: `You are a narrative structure editor. Arrange every supplied fragment exactly once into a coherent story or argument.

Prefer this arc when the material supports it:
1. Hook: a surprising, vivid, or consequential idea.
2. Context: background needed to understand the subject.
3. Mechanism: how or why the central idea works.
4. Evidence: supporting facts, examples, and analogies.
5. Implication: consequences, meaning, or the so-what.

Treat accepted connections as useful structural evidence, not absolute constraints. Preserve causal and explanatory dependencies. Return every valid fragment ID exactly once and do not invent IDs.`,
          },
          {
            role: 'user',
            content: `Fragments:\n${fragLines}\n\nAccepted connections:\n${connectionLines}\n\nReturn the best narrative order.`,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'story_outline',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                order: {
                  type: 'array',
                  items: { type: 'integer' },
                  minItems: 1,
                  maxItems: fragments.length,
                },
              },
              required: ['order'],
              additionalProperties: false,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      console.error('[api/outline/generate] OpenAI error', response.status)
      return NextResponse.json({ error: 'Outline generation failed' }, { status: 502 })
    }

    const result = await response.json() as OpenAIResponse
    const content = result.output
      ?.find(item => item.type === 'message')
      ?.content?.find(item => item.type === 'output_text' || item.type === 'refusal')

    if (!content || content.type === 'refusal' || result.status === 'incomplete') {
      return NextResponse.json({ error: 'Outline generation was incomplete' }, { status: 502 })
    }

    const parsed = JSON.parse(content.text) as { order?: unknown }
    const fragmentIds = new Set<number>(
      fragments.map((fragment: { id: number }) => fragment.id)
    )
    const order = Array.isArray(parsed.order)
      ? parsed.order.filter((id): id is number => typeof id === 'number' && fragmentIds.has(id))
      : []
    const uniqueOrder = Array.from(new Set(order))

    for (const fragment of fragments as { id: number }[]) {
      if (!uniqueOrder.includes(fragment.id)) uniqueOrder.push(fragment.id)
    }

    return NextResponse.json({ order: uniqueOrder })
  } catch (error) {
    console.error('[api/outline/generate]', error)
    return NextResponse.json({ error: 'Outline generation failed' }, { status: 500 })
  }
}
