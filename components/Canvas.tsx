'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  type Node, type Edge,
  type Connection as RFConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useProject } from '@/hooks/useProject'
import { useDebounce } from '@/hooks/useDebounce'
import { api } from '@/lib/api'
import FragmentNode from './FragmentNode'
import ConnectionEdge from './ConnectionEdge'
import FragmentInput from './FragmentInput'
import Toolbar from './Toolbar'
import OutlinePanel from './OutlinePanel'
import PreferenceInspector from './PreferenceInspector'

const NODE_TYPES = { fragmentNode: FragmentNode }
const EDGE_TYPES = { connectionEdge: ConnectionEdge }

export default function Canvas({ projectId }: { projectId: number }) {
  const project = useProject(projectId)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [view,             setView]             = useState<'graph' | 'outline' | 'split'>('graph')
  const [showPrefs,        setShowPrefs]        = useState(false)
  const [discovering,      setDiscovering]      = useState(false)
  const [generatingOutline,setGeneratingOutline]= useState(false)
  const [projectName,      setProjectName]      = useState('')
  const [pendingEdge,      setPendingEdge]      = useState<{ source: string; target: string } | null>(null)
  const [edgeLabel,        setEdgeLabel]        = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)
  const connectedFragmentIds = new Set(
    project.connections
      .filter(connection => connection.status !== 'rejected')
      .flatMap(connection => [connection.from_id, connection.to_id])
  )
  const unconnectedFragmentIds = project.fragments
    .filter(fragment => !connectedFragmentIds.has(fragment.id))
    .map(fragment => fragment.id)

  useEffect(() => {
    project.load()
    api.listProjects().then(ps => {
      const p = ps.find(x => x.id === projectId)
      if (p) setProjectName(p.name)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const { trigger: triggerDiscover } = useDebounce(async () => {
    setDiscovering(true)
    try { await project.discoverConnections() }
    finally { setDiscovering(false) }
  }, 2500)

  // Sync nodes from fragments
  useEffect(() => {
    const pendingCount: Record<number, number> = {}
    project.connections.forEach(c => {
      if (c.status === 'pending') {
        pendingCount[c.from_id] = (pendingCount[c.from_id] || 0) + 1
        pendingCount[c.to_id]   = (pendingCount[c.to_id]   || 0) + 1
      }
    })

    setNodes(project.fragments.map(f => ({
      id:       String(f.id),
      type:     'fragmentNode',
      position: { x: f.pos_x, y: f.pos_y },
      data: {
        text:         f.text,
        url:          f.url,
        pendingCount: pendingCount[f.id] || 0,
        canDelete:    !connectedFragmentIds.has(f.id),
        onDelete:     !connectedFragmentIds.has(f.id)
          ? () => project.deleteFragment(f.id)
          : undefined,
      },
    })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.fragments, project.connections])

  // Sync edges from connections
  useEffect(() => {
    const visible = project.connections.filter(c => c.status !== 'rejected')
    setEdges(visible.map(c => ({
      id:     String(c.id),
      source: String(c.from_id),
      target: String(c.to_id),
      type:   'connectionEdge',
      data: {
        label:     c.label,
        status:    c.status,
        source:    c.source,
        onAccept:  () => project.updateConnection(c.id, { status: 'accepted', label: c.label }),
        onReject:  () => project.updateConnection(c.id, { status: 'rejected', label: c.label }),
        onRelabel: (newLabel: string) => project.updateConnection(c.id, { status: 'accepted', label: newLabel }),
      },
    })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.connections])

  const onConnect = useCallback((params: RFConnection) => {
    setEdgeLabel('')
    setPendingEdge({ source: params.source!, target: params.target! })
    setTimeout(() => labelInputRef.current?.focus(), 50)
  }, [])

  async function handleEdgeSubmit(label: string) {
    if (!pendingEdge || !label.trim()) return
    setPendingEdge(null)
    await project.addConnection(parseInt(pendingEdge.source), parseInt(pendingEdge.target), label.trim())
  }

  const onNodeDragStop = useCallback((_event: MouseEvent | TouchEvent, node: Node) => {
    project.updateFragmentPosition(parseInt(node.id), node.position.x, node.position.y).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  async function handleAddFragment(text: string, url: string | null) {
    await project.addFragment(text, url)
    triggerDiscover()
  }

  async function handleSplitText(text: string, url: string | null) {
    const fragments = await api.splitText(text)
    await project.addFragments(fragments, url)
    triggerDiscover()
    return fragments.length
  }

  async function handleDeleteUnconnected() {
    if (unconnectedFragmentIds.length === 0) return
    const confirmed = window.confirm(
      `Delete ${unconnectedFragmentIds.length} unconnected fragment${unconnectedFragmentIds.length === 1 ? '' : 's'}?`
    )
    if (confirmed) await project.deleteFragments(unconnectedFragmentIds)
  }

  async function handleDiscover() {
    setDiscovering(true)
    try { await project.discoverConnections() }
    finally { setDiscovering(false) }
  }

  async function handleGenerateOutline() {
    setGeneratingOutline(true)
    try { await project.generateOutline() }
    finally { setGeneratingOutline(false) }
  }

  const showGraph   = view === 'graph'   || view === 'split'
  const showOutline = view === 'outline' || view === 'split'

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Toolbar
        projectName={projectName}
        view={view}
        onToggleView={setView}
        onDiscover={handleDiscover}
        onDeleteUnconnected={handleDeleteUnconnected}
        onTogglePreferences={() => setShowPrefs(v => !v)}
        discovering={discovering}
        unconnectedCount={unconnectedFragmentIds.length}
      />

      <div className="flex flex-1 min-h-0">
        {showGraph && (
          <div className="flex-1 min-h-0">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              deleteKeyCode={null}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={2}
            >
              <Background color="#e2e8f0" gap={20} />
              <Controls />
              <MiniMap nodeColor="#6366f1" maskColor="rgba(0,0,0,0.05)" />
            </ReactFlow>
          </div>
        )}

        {showOutline && (
          <OutlinePanel
            outline={project.outline}
            onGenerate={handleGenerateOutline}
            onSave={project.saveOutline}
            generating={generatingOutline}
          />
        )}
      </div>

      <FragmentInput
        onAdd={handleAddFragment}
        onSplit={handleSplitText}
        discovering={discovering}
      />

      {showPrefs && <PreferenceInspector onClose={() => setShowPrefs(false)} />}

      {project.error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg shadow">
          {project.error}
        </div>
      )}

      {pendingEdge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-5 w-80">
            <p className="text-sm font-semibold text-gray-800 mb-3">Label this connection</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['evidence for','causes','contradicts','analogy for','mechanism for','leads to','related to','supports','reframes'].map(preset => (
                <button
                  key={preset}
                  onClick={() => handleEdgeSubmit(preset)}
                  className="text-xs bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-gray-600 px-2.5 py-1 rounded-full transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); handleEdgeSubmit(edgeLabel) }} className="flex gap-2">
              <input
                ref={labelInputRef}
                value={edgeLabel}
                onChange={e => setEdgeLabel(e.target.value)}
                placeholder="or type your own…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={!edgeLabel.trim()}
                className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-indigo-700"
              >
                Add
              </button>
            </form>
            <button
              onClick={() => setPendingEdge(null)}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 w-full text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
