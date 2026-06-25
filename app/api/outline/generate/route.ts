import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { fragments, connections } = await req.json()

    if (!fragments || fragments.length === 0) {
      return NextResponse.json({ order: [] })
    }

    const fragLines = fragments
      .map((f: { id: number; text: string }) => `  [${f.id}] "${f.text}"`)
      .join('\n')

    let connLines = ''
    if (connections && connections.length > 0) {
      const accepted = connections.filter((c: { status: string }) => c.status === 'accepted')
      if (accepted.length > 0) {
        connLines = '\n\nKnown connections:\n' + accepted
          .map((c: { from_id: number; label: string; to_id: number }) => `  [${c.from_id}] --${c.label}--> [${c.to_id}]`)
          .join('\n')
      }
    }

    const systemPrompt = `You are a narrative structure expert. Given a set of idea fragments and their logical connections, suggest the best order to present them as a coherent argument or story.

Follow this general narrative arc:
1. HOOK — the surprising or counterintuitive claim that grabs attention
2. CONTEXT — background the reader needs to follow the argument
3. MECHANISM — the core explanation of how/why
4. EVIDENCE — supporting facts, examples, analogies
5. IMPLICATION — what this means, consequences, so-what

Not every category will be present. Work with what's there.

You MUST respond with ONLY a JSON array of fragment IDs in your suggested order. No prose. No markdown.
Example: [3, 1, 5, 2, 4]`

    const userPrompt = `Suggest the best narrative order for these fragments:\n\n${fragLines}${connLines}\n\nReturn only a JSON array of fragment IDs in the order they should appear.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let raw = (message.content[0] as { text: string }).text.trim()
    if (raw.startsWith('```')) {
      raw = raw.split('```')[1]
      if (raw.startsWith('json')) raw = raw.slice(4)
    }
    raw = raw.trim()

    const order = JSON.parse(raw)
    if (!Array.isArray(order)) {
      return NextResponse.json({ order: fragments.map((f: { id: number }) => f.id) })
    }

    const fragIds = new Set(fragments.map((f: { id: number }) => f.id))
    const validOrder: number[] = order.filter((id: unknown) => typeof id === 'number' && fragIds.has(id))

    // Append any fragment that the model missed
    for (const f of fragments as { id: number }[]) {
      if (!validOrder.includes(f.id)) validOrder.push(f.id)
    }

    return NextResponse.json({ order: validOrder })
  } catch (e) {
    console.error('[api/outline/generate]', e)
    return NextResponse.json({ error: 'Outline generation failed' }, { status: 500 })
  }
}
