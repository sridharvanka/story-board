'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getDemoProjectId, clearDemoProjectId } from '@/lib/session'
import { seedDemoProject, resetDemoProject } from '@/lib/seed'
import type { Project } from '@/lib/types'

export default function ProjectList() {
  const [projects,    setProjects]    = useState<Project[]>([])
  const [name,        setName]        = useState('')
  const [creating,    setCreating]    = useState(false)
  const [seeding,     setSeeding]     = useState(false)
  const [resetting,   setResetting]   = useState(false)
  const [demoId,      setDemoId]      = useState<number | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setDemoId(getDemoProjectId())
    api.listProjects()
      .then(setProjects)
      .catch(e => setError(e.message))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const project = await api.createProject({ name: name.trim(), project_type: 'essay' })
      router.push(`/project/${project.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create project')
      setCreating(false)
    }
  }

  async function handleTryDemo() {
    setSeeding(true)
    setError(null)
    try {
      const id = await seedDemoProject()
      router.push(`/project/${id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load demo')
      setSeeding(false)
    }
  }

  async function handleResetDemo() {
    setResetting(true)
    setError(null)
    try {
      const id = await resetDemoProject(demoId)
      clearDemoProjectId()
      setDemoId(id)
      const updated = await api.listProjects()
      setProjects(updated)
      router.push(`/project/${id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reset failed')
      setResetting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this project and all its fragments?')) return
    await api.deleteProject(id)
    if (id === demoId) {
      clearDemoProjectId()
      setDemoId(null)
    }
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-20 px-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Storyboard</h1>
          <p className="text-gray-500 text-sm">
            Capture ideas. See the connections. Build your outline.
          </p>
        </div>

        {/* Create project */}
        <form onSubmit={handleCreate} className="flex gap-2 mb-10">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="New project name…"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Project list */}
        {projects.length === 0 ? (
          <EmptyState onTryDemo={handleTryDemo} seeding={seeding} />
        ) : (
          <ul className="space-y-2">
            {projects.map(p => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-indigo-300 transition-colors"
              >
                <button onClick={() => router.push(`/project/${p.id}`)} className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                    {p.id === demoId && (
                      <span className="shrink-0 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                        demo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-gray-300 hover:text-red-400 ml-4 text-lg leading-none shrink-0"
                  title="Delete project"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Reset demo — shown when projects exist */}
        {projects.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-200 flex justify-center">
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="text-xs text-gray-400 hover:text-indigo-600 disabled:opacity-40 transition-colors"
            >
              {resetting ? 'Resetting…' : '↺ Reset demo project'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function EmptyState({ onTryDemo, seeding }: { onTryDemo: () => void; seeding: boolean }) {
  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">✦</span>
      </div>
      <h2 className="text-sm font-semibold text-gray-800 mb-1">No projects yet</h2>
      <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto">
        Create one above, or load a pre-built example to see how connections and outlines work.
      </p>
      <button
        onClick={onTryDemo}
        disabled={seeding}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium
                   px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {seeding ? (
          <>
            <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Loading demo…
          </>
        ) : (
          <>✦ Try a demo project</>
        )}
      </button>
    </div>
  )
}
