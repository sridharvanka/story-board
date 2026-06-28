import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp } from '@/lib/ratelimit'

const MAX_INPUT_LENGTH = 20_000
const MAX_FRAGMENTS = 60

const ATOMIC_IDEA_INSTRUCTIONS = `
You extract semantic propositions from prose. Do not split text mechanically at sentence boundaries.

An atomic idea is the smallest self-contained claim that:
- names or clearly identifies its subject;
- makes one main assertion about that subject; and
- can be understood without seeing the surrounding paragraph.

Process the complete passage before writing fragments:
1. Identify claims by meaning, not punctuation. One sentence may contain several atomic ideas. Several sentences may need context combined into one standalone idea.
2. Split compound claims when each part communicates an independently useful fact, cause, contrast, result, or interpretation.
3. Resolve pronouns and context-dependent references such as "it," "they," "this," "that," "these animals," "then," and "after that" by naming the actual subject or event.
4. Rewrite only enough to make each idea standalone. Preserve the author's meaning, attribution, uncertainty, negation, quantities, and causal direction. Never strengthen "may" into "does" or "appears" into certainty.
5. Remove structural narration such as "first," "second," "then there is," and "the answer is" unless it carries substantive meaning.
6. Do not output headings, sentence fragments, transition phrases, duplicate ideas, commentary, or facts not present in the source.
7. Preserve the original order of ideas.

Before returning an item, test it in isolation. Reject or rewrite it if a reader would ask "what does it/that refer to?" or "after what?" Each item should normally contain an explicit subject and predicate.

Examples:

Input: "Occasionally, a dead fish or whale carcass lands on the seafloor. Then, for a brief time, there is a feast. After that, the famine returns."
Output:
- "Occasionally, a large food source such as a dead fish or whale carcass reaches the seafloor."
- "A large carcass creates a brief feast for deep-sea animals."
- "Food scarcity returns after the carcass is consumed."

Input: "At ordinary temperatures, ND1 sped metabolism up and made starvation harder to withstand."
Output:
- "At ordinary temperatures, ND1 increased metabolism."
- "At ordinary temperatures, ND1 reduced starvation tolerance."

Input: "The researchers found Chlamydiae linked to fat storage. These bacteria may help the isopod bank energy."
Output:
- "Researchers linked Chlamydiae bacteria to fat storage in the isopod."
- "Chlamydiae bacteria may help the isopod store energy."
`.trim()

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
  const { allowed, remaining, retryAfterSec } = rateLimit(`split:${getIp(req)}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec), 'X-RateLimit-Remaining': '0' } }
    )
  }

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
        model: process.env.OPENAI_FRAGMENT_MODEL || 'gpt-5.4',
        store: false,
        reasoning: { effort: 'medium' },
        max_output_tokens: 8192,
        input: [
          { role: 'developer', content: ATOMIC_IDEA_INSTRUCTIONS },
          {
            role: 'user',
            content: `Extract atomic, standalone ideas from this passage:\n\n${input}`,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'atomic_ideas',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                fragments: {
                  type: 'array',
                  description: 'Atomic, standalone ideas in source order.',
                  items: {
                    type: 'string',
                    description: 'One self-contained semantic proposition with an explicit subject and one main assertion.',
                    minLength: 1,
                  },
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
      ?.content?.find(item => item.type === 'output_text' || item.type === 'refusal')

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
