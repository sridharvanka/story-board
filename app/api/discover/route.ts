import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const VALID_LABELS = [
  'evidence for', 'contradicts', 'analogy for', 'mechanism for',
  'example of', 'extends', 'causes', 'supports', 'related to',
]

interface Pref { from_text: string; to_text: string; original_label: string; corrected_label: string | null }

function relevantPreferences(preferences: Pref[], fragments: Array<{ text: string }>) {
  const allWords = new Set<string>()
  for (const f of fragments) {
    for (const w of f.text.split(' ')) {
      if (w.length > 4) allWords.add(w.toLowerCase().replace(/[.,;:!?]/g, ''))
    }
  }
  const keywords = Array.from(allWords).slice(0, 10)
  return preferences
    .filter(p => keywords.some(kw =>
      p.from_text.toLowerCase().includes(kw) || p.to_text.toLowerCase().includes(kw)
    ))
    .slice(0, 5)
}

export async function POST(req: NextRequest) {
  try {
    const { fragments, existing_pairs, preferences } = await req.json()

    if (!fragments || fragments.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const prefs = relevantPreferences(preferences || [], fragments)

    const fragLines = fragments
      .map((f: { id: number; text: string }) => `  [${f.id}] "${f.text}"`)
      .join('\n')

    let prefExamples = ''
    if (prefs.length > 0) {
      const lines = prefs.map((p: Pref) =>
        p.corrected_label
          ? `  - From: "${p.from_text.slice(0, 80)}" → To: "${p.to_text.slice(0, 80)}"\n    AI suggested: "${p.original_label}" | User corrected to: "${p.corrected_label}"`
          : `  - From: "${p.from_text.slice(0, 80)}" → To: "${p.to_text.slice(0, 80)}"\n    AI suggested: "${p.original_label}" | User rejected this connection`
      )
      prefExamples = "\n\nUser's past corrections (use these to calibrate your suggestions):\n" + lines.join('\n')
    }

    const systemPrompt = `You are an argument structure analyst. Your job is to find LOGICAL connections between idea fragments — not surface-level topic similarity.

Valid connection types and what they mean:
- "evidence for": Fragment A is data/fact that supports the claim in Fragment B
- "contradicts": Fragment A conflicts with or undermines Fragment B
- "analogy for": Fragment A is a metaphor or parallel case that illuminates Fragment B
- "mechanism for": Fragment A explains HOW Fragment B works
- "example of": Fragment A is a concrete instance of the abstract idea in Fragment B
- "extends": Fragment A builds on or deepens Fragment B
- "causes": Fragment A is a causal antecedent of Fragment B
- "supports": Fragment A provides logical backing for Fragment B
- "related to": Fragment A and B share the same topic (use only when no stronger type fits)

IMPORTANT RULES:
- Only suggest connections where the logical relationship is clear and meaningful
- Do NOT suggest a connection just because two fragments mention the same topic
- Each connection should help the writer structure their argument
- Return at most 8 connections
- If fewer than 3 connections are genuinely meaningful, return fewer${prefExamples}

You MUST respond with ONLY a JSON array. No prose. No markdown. Example:
[{"from_id": 1, "to_id": 3, "label": "analogy for"}, {"from_id": 2, "to_id": 1, "label": "mechanism for"}]

If no meaningful connections exist, return: []`

    const userPrompt = `Find logical connections between these idea fragments:\n\n${fragLines}\n\nReturn only a JSON array of connections with from_id, to_id, and label.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let raw = (message.content[0] as { text: string }).text.trim()
    if (raw.startsWith('```')) {
      raw = raw.split('```')[1]
      if (raw.startsWith('json')) raw = raw.slice(4)
    }
    raw = raw.trim()

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return NextResponse.json({ suggestions: [] })

    const existingSet = new Set(
      (existing_pairs || []).flatMap((p: { from_id: number; to_id: number }) => [
        `${p.from_id}-${p.to_id}`,
        `${p.to_id}-${p.from_id}`,
      ])
    )

    const valid = parsed
      .filter((s: { from_id: unknown; to_id: unknown }) => {
        if (typeof s.from_id !== 'number' || typeof s.to_id !== 'number') return false
        if (s.from_id === s.to_id) return false
        if (existingSet.has(`${s.from_id}-${s.to_id}`)) return false
        return true
      })
      .map((s: { from_id: number; to_id: number; label: string }) => ({
        from_id: s.from_id,
        to_id:   s.to_id,
        label:   VALID_LABELS.includes(s.label) ? s.label : 'related to',
      }))

    return NextResponse.json({ suggestions: valid })
  } catch (e) {
    console.error('[api/discover]', e)
    return NextResponse.json({ error: 'Discovery failed', suggestions: [] }, { status: 500 })
  }
}
