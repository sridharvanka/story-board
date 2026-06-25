'use client'
import { useState, useEffect } from 'react'
import type { OutlineItem } from '@/lib/types'

interface Props {
  outline: OutlineItem[]
  onGenerate: () => Promise<void>
  onSave: (items: OutlineItem[]) => Promise<void>
  generating: boolean
}

export default function OutlinePanel({ outline, onGenerate, onSave, generating }: Props) {
  const [items,   setItems]   = useState<OutlineItem[]>(outline)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  // Sync when parent outline changes
  useEffect(() => {
    setItems(outline)
  }, [outline])

  function handleDragStart(idx: number) { setDragIdx(idx) }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const updated = [...items]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, moved)
    setDragIdx(idx)
    setItems(updated)
  }

  function handleDragEnd() {
    setDragIdx(null)
    const ordered = items.map((item, i) => ({ ...item, position: i }))
    onSave(ordered)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200 w-80 shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">Story Outline</h2>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3 py-1 rounded-lg disabled:opacity-50"
        >
          {generating ? 'Generating…' : '✦ Suggest order'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm text-center px-6">
            Add fragments and click "Suggest order" to generate your outline.
          </p>
        </div>
      ) : (
        <ol className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.map((item, idx) => (
            <li
              key={item.fragment_id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex gap-3 bg-white border rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing
                         ${dragIdx === idx ? 'opacity-50 border-indigo-300' : 'border-gray-200'}`}
            >
              <span className="text-xs text-gray-400 font-mono mt-0.5 shrink-0">{idx + 1}.</span>
              <div className="min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{item.text}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:underline truncate block mt-1"
                  >
                    {item.url.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
              <span className="text-gray-200 text-xs shrink-0 mt-0.5">⠿</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
