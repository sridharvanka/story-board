'use client'
import { useRouter } from 'next/navigation'

type View = 'graph' | 'outline' | 'split'

interface Props {
  projectName: string
  view: View
  onToggleView: (v: View) => void
  onDiscover: () => void
  onDeleteUnconnected: () => void
  onTogglePreferences: () => void
  discovering: boolean
  unconnectedCount: number
}

export default function Toolbar({
  projectName,
  view,
  onToggleView,
  onDiscover,
  onDeleteUnconnected,
  onTogglePreferences,
  discovering,
  unconnectedCount,
}: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-700 text-sm">
          ← Projects
        </button>
        <span className="text-sm font-semibold text-gray-800">{projectName}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onDiscover}
          disabled={discovering}
          className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700
                     hover:bg-amber-100 px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          {discovering
            ? <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            : <span>✦</span>
          }
          {discovering ? 'Discovering…' : 'Find connections'}
        </button>

        <button
          onClick={onDeleteUnconnected}
          disabled={unconnectedCount === 0}
          className="text-xs border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg
                     disabled:opacity-40 disabled:hover:bg-transparent"
          title="Delete every fragment without a visible connection"
        >
          Delete unconnected{unconnectedCount > 0 ? ` (${unconnectedCount})` : ''}
        </button>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(['graph', 'outline', 'split'] as const).map(v => (
            <button
              key={v}
              onClick={() => onToggleView(v)}
              className={`px-3 py-1.5 capitalize ${view === v ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {v === 'split' ? 'Both' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={onTogglePreferences}
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5"
          title="AI preferences"
        >
          ⚙ Preferences
        </button>
      </div>
    </div>
  )
}
