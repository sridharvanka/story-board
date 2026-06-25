'use client'
import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'

interface ConnectionEdgeData extends Record<string, unknown> {
  label: string
  status: 'pending' | 'accepted' | 'rejected'
  source: 'ai' | 'user'
  onAccept: () => void
  onReject: () => void
  onRelabel: (label: string) => void
}

export default function ConnectionEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
}: EdgeProps<Edge>) {
  const { label, status, source, onAccept, onReject, onRelabel } = (data ?? {}) as unknown as ConnectionEdgeData
  const [editing,   setEditing]   = useState(false)
  const [editValue, setEditValue] = useState(label || '')

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const isPending  = status === 'pending'
  const isAccepted = status === 'accepted'
  const strokeColor = isPending ? '#f59e0b' : isAccepted ? '#10b981' : '#94a3b8'

  function handleRelabelSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editValue.trim()) onRelabel(editValue.trim())
    setEditing(false)
  }

  return (
    <>
      <BaseEdge path={edgePath} style={{ stroke: strokeColor, strokeWidth: 1.5 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {editing ? (
            <form onSubmit={handleRelabelSubmit} className="flex gap-1 items-center">
              <input
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="text-xs border border-gray-300 rounded px-1.5 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button type="submit" className="text-xs text-emerald-600 font-medium">✓</button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400">✕</button>
            </form>
          ) : (
            <div className={`edge-label-container ${isPending ? 'pending' : isAccepted ? 'accepted' : ''}`}>
              <span
                className="cursor-pointer hover:underline"
                onDoubleClick={() => { setEditValue(label); setEditing(true) }}
                title="Double-click to relabel"
              >
                {label}
              </span>

              {isPending && (
                <span className="ml-1.5 inline-flex gap-1">
                  <button onClick={onAccept} className="text-emerald-600 hover:text-emerald-800 font-bold text-xs" title="Accept">✓</button>
                  <button onClick={() => { setEditValue(label); setEditing(true) }} className="text-indigo-500 hover:text-indigo-700 text-xs" title="Relabel">✎</button>
                  <button onClick={onReject} className="text-red-400 hover:text-red-600 text-xs" title="Reject">✕</button>
                </span>
              )}

              {isAccepted && source === 'user' && (
                <button onClick={onReject} className="ml-1.5 text-gray-300 hover:text-red-400 text-xs" title="Remove connection">✕</button>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
