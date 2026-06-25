'use client'
import { useState } from 'react'

interface Props {
  onAdd: (text: string, url: string | null) => Promise<void>
  discovering: boolean
}

export default function FragmentInput({ onAdd, discovering }: Props) {
  const [text,   setText]   = useState('')
  const [url,    setUrl]    = useState('')
  const [adding, setAdding] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setAdding(true)
    try {
      await onAdd(text.trim(), url.trim() || null)
      setText('')
      setUrl('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 bg-white border-t border-gray-200">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
          placeholder="Add a fragment — an idea, claim, fact, or observation…"
          rows={2}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={adding || !text.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 self-stretch"
        >
          {adding ? '…' : 'Add'}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Source URL (optional)"
          className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
        {discovering && (
          <span className="text-xs text-amber-500 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Finding connections…
          </span>
        )}
      </div>
    </form>
  )
}
