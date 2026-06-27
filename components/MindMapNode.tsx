'use client'
import { Handle, Position } from '@xyflow/react'

interface MindMapNodeData {
  text: string
  relation?: string
  color: string
  side: 'left' | 'right'
  primary: boolean
}

export default function MindMapNode({ data }: { data: MindMapNodeData }) {
  const targetPosition = data.side === 'right' ? Position.Left : Position.Right
  const sourcePosition = data.side === 'right' ? Position.Right : Position.Left

  return (
    <div
      className={`relative w-60 rounded-2xl border bg-white px-4 py-3 shadow-sm ${
        data.primary ? 'border-2 shadow-md' : ''
      }`}
      style={{ borderColor: data.color }}
    >
      <Handle
        type="target"
        position={targetPosition}
        className="!h-2 !w-2 !border-0 !opacity-0"
        style={{ backgroundColor: data.color }}
      />
      {data.relation && (
        <p
          className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: data.color }}
        >
          {data.relation}
        </p>
      )}
      <p className="text-sm leading-snug text-gray-800">{data.text}</p>
      <Handle
        type="source"
        position={sourcePosition}
        className="!h-2 !w-2 !border-0 !opacity-0"
        style={{ backgroundColor: data.color }}
      />
    </div>
  )
}
