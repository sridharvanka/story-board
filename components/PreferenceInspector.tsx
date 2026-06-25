'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { Preference } from '@/lib/types'

export default function PreferenceInspector({ onClose }: { onClose: () => void }) {
  const [prefs,   setPrefs]   = useState<Preference[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listPreferences()
      .then(setPrefs)
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number) {
    await api.deletePreference(id)
    setPrefs(prev => prev.filter(p => p.id !== id))
  }

  async function handleEdit(id: number, corrected_label: string) {
    const updated = await api.updatePreference(id, { corrected_label })
    setPrefs(prev => prev.map(p => p.id === id ? updated : p))
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-96 bg-white shadow-xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Preferences</h2>
            <p className="text-xs text-gray-500 mt-0.5">Corrections the AI uses to calibrate its suggestions.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-gray-400 text-center mt-8">Loading…</p>
          ) : prefs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-8">
              No preferences yet. Accept, reject, or relabel AI suggestions to build your preference profile.
            </p>
          ) : (
            <ul className="space-y-3">
              {prefs.map(p => (
                <PrefItem key={p.id} pref={p} onDelete={() => handleDelete(p.id)} onEdit={val => handleEdit(p.id, val)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function PrefItem({ pref, onDelete, onEdit }: { pref: Preference; onDelete: () => void; onEdit: (val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(pref.corrected_label || '')

  return (
    <li className="border border-gray-100 rounded-lg p-3 text-xs space-y-1.5">
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1 min-w-0 mr-3">
          <p className="text-gray-600 truncate"><span className="font-medium text-gray-800">From:</span> {pref.from_text}</p>
          <p className="text-gray-600 truncate"><span className="font-medium text-gray-800">To:</span> {pref.to_text}</p>
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <span className="text-gray-400 line-through">{pref.original_label}</span>
            <span className="text-gray-300">→</span>
            {pref.corrected_label
              ? <span className="text-emerald-600 font-medium">{pref.corrected_label}</span>
              : <span className="text-red-400 italic">rejected</span>
            }
          </div>
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 shrink-0" title="Delete preference">×</button>
      </div>

      {editing ? (
        <form onSubmit={e => { e.preventDefault(); onEdit(value); setEditing(false) }} className="flex gap-1">
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button type="submit" className="text-emerald-600 font-medium">✓</button>
          <button type="button" onClick={() => setEditing(false)} className="text-gray-400">✕</button>
        </form>
      ) : (
        <button onClick={() => { setValue(pref.corrected_label || ''); setEditing(true) }} className="text-indigo-400 hover:text-indigo-600 text-xs">
          Edit label
        </button>
      )}
    </li>
  )
}
