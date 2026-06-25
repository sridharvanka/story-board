'use client'
import { Handle, Position } from '@xyflow/react'

interface FragmentNodeData {
  text: string
  url: string | null
  pendingCount: number
  onDelete: () => void
}

export default function FragmentNode({ data }: { data: FragmentNodeData }) {
  const { text, url, pendingCount, onDelete } = data

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm w-52 relative group">
      <Handle type="target" position={Position.Top}    className="!bg-gray-300 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-2 !h-2" />

      <div className="p-3">
        {pendingCount > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span className="text-xs text-amber-600">{pendingCount} pending</span>
          </div>
        )}

        <p className="text-sm text-gray-800 leading-snug">{text}</p>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline mt-1.5 block truncate"
            onClick={e => e.stopPropagation()}
          >
            {url.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>

      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-100 text-red-400 text-xs
                   items-center justify-center hidden group-hover:flex hover:bg-red-200"
        title="Delete fragment"
      >
        ×
      </button>
    </div>
  )
}
