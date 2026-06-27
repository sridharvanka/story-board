'use client'
import { Handle, Position } from '@xyflow/react'

export default function MindMapRootNode({ data }: { data: { title: string } }) {
  return (
    <div className="relative w-64 rounded-3xl border-2 border-indigo-500 bg-indigo-600 px-6 py-5 text-center text-white shadow-xl">
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-indigo-400 !opacity-0"
      />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
        Mind map
      </p>
      <p className="mt-1 text-base font-semibold leading-snug">{data.title}</p>
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-indigo-400 !opacity-0"
      />
    </div>
  )
}
