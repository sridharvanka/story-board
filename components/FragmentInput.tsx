'use client'
import { useState } from 'react'

interface Props {
  onAdd: (text: string, url: string | null) => Promise<void>
  onSplit: (text: string, url: string | null) => Promise<number>
  discovering: boolean
}

export default function FragmentInput({ onAdd, onSplit, discovering }: Props) {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<'add' | 'split' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy('add')
    setNotice(null)
    try {
      await onAdd(text.trim(), url.trim() || null)
      setText('')
      setUrl('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not add the fragment')
    } finally {
      setBusy(null)
    }
  }

  async function handleSplit() {
    if (!text.trim()) return
    setBusy('split')
    setNotice(null)
    try {
      const count = await onSplit(text.trim(), url.trim() || null)
      setText('')
      setUrl('')
      setNotice(`Created ${count} fragment${count === 1 ? '' : 's'}`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not split the text')
    } finally {
      setBusy(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 bg-white border-t border-gray-200">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
          placeholder="Add one fragment, or paste a larger block to split with AI…"
          rows={3}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={busy !== null || !text.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 self-stretch"
        >
          {busy === 'add' ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={handleSplit}
          disabled={busy !== null || !text.trim()}
          className="bg-violet-50 border border-violet-200 text-violet-700 px-4 py-2 rounded-lg text-sm font-medium
                     hover:bg-violet-100 disabled:opacity-40 self-stretch whitespace-nowrap"
          title="Turn a large block of text into one-idea fragments"
        >
          {busy === 'split' ? 'Splitting…' : 'Split with AI'}
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
        {notice && (
          <span className={`text-xs ${notice.startsWith('Created') ? 'text-emerald-600' : 'text-red-600'}`}>
            {notice}
          </span>
        )}
      </div>
    </form>
  )
}
