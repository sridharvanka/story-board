'use client'
import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Fragment, Connection, OutlineItem } from '@/lib/types'

export function useProject(projectId: number) {
  const [fragments,   setFragments]   = useState<Fragment[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [outline,     setOutline]     = useState<OutlineItem[]>([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const [frags, conns, outl] = await Promise.all([
        api.listFragments(projectId),
        api.listConnections(projectId),
        api.getOutline(projectId),
      ])
      setFragments(frags)
      setConnections(conns)
      setOutline(outl)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const addFragment = useCallback(async (text: string, url: string | null) => {
    const count = fragments.length
    const pos_x = 100 + (count % 4) * 220
    const pos_y = 80  + Math.floor(count / 4) * 160
    const frag = await api.addFragment(projectId, { text, url, pos_x, pos_y })
    setFragments(prev => [...prev, frag])
    return frag
  }, [projectId, fragments.length])

  const addFragments = useCallback(async (texts: string[], url: string | null) => {
    const startIndex = fragments.length
    const added = await Promise.all(texts.map((text, index) => {
      const position = startIndex + index
      const pos_x = 100 + (position % 4) * 220
      const pos_y = 80 + Math.floor(position / 4) * 160
      return api.addFragment(projectId, { text, url, pos_x, pos_y })
    }))
    setFragments(prev => [...prev, ...added])
    return added
  }, [projectId, fragments.length])

  const updateFragmentPosition = useCallback(async (id: number, pos_x: number, pos_y: number) => {
    await api.updateFragment(id, { pos_x, pos_y })
    setFragments(prev => prev.map(f => f.id === id ? { ...f, pos_x, pos_y } : f))
  }, [])

  const deleteFragment = useCallback(async (id: number) => {
    await api.deleteFragment(id)
    setFragments(prev => prev.filter(f => f.id !== id))
    setConnections(prev => prev.filter(c => c.from_id !== id && c.to_id !== id))
    setOutline(prev => prev.filter(item => item.fragment_id !== id))
  }, [])

  const deleteFragments = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    await Promise.all(ids.map(id => api.deleteFragment(id)))
    setFragments(prev => prev.filter(f => !idSet.has(f.id)))
    setConnections(prev => prev.filter(c => !idSet.has(c.from_id) && !idSet.has(c.to_id)))
    setOutline(prev => prev.filter(item => !idSet.has(item.fragment_id)))
  }, [])

  const discoverConnections = useCallback(async () => {
    const result = await api.discoverConnections(projectId)
    if (result.suggestions && result.suggestions.length > 0) {
      const conns = await api.listConnections(projectId)
      setConnections(conns)
    }
    return result.suggestions || []
  }, [projectId])

  const updateConnection = useCallback(async (
    id: number,
    data: { status: Connection['status']; label: string }
  ) => {
    const updated = await api.updateConnection(id, data)
    setConnections(prev => prev.map(c => c.id === id ? updated : c))
    return updated
  }, [])

  const addConnection = useCallback(async (from_id: number, to_id: number, label: string) => {
    const conn = await api.addConnection(projectId, { from_id, to_id, label })
    setConnections(prev => [...prev, conn])
    return conn
  }, [projectId])

  const deleteConnection = useCallback(async (id: number) => {
    await api.deleteConnection(id)
    setConnections(prev => prev.filter(c => c.id !== id))
  }, [])

  const generateOutline = useCallback(async () => {
    const result = await api.generateOutline(projectId)
    setOutline(result.order || [])
    return result.order || []
  }, [projectId])

  const saveOutline = useCallback(async (orderedItems: OutlineItem[]) => {
    await api.saveOutline(projectId, orderedItems)
    setOutline(orderedItems)
  }, [projectId])

  return {
    fragments, connections, outline,
    loading, error,
    load,
    addFragment, addFragments, updateFragmentPosition, deleteFragment, deleteFragments,
    discoverConnections,
    updateConnection, addConnection, deleteConnection,
    generateOutline, saveOutline,
  }
}
