import { store } from './store'
import type { Connection, OutlineItem, Fragment } from './types'

export const api = {
  // --- Projects ---
  listProjects:  () => store.listProjects(),
  createProject: (data: { name: string; project_type: string }) => store.createProject(data),
  deleteProject: (id: number) => store.deleteProject(id),

  // --- Fragments ---
  listFragments:  (pid: number) => store.listFragments(pid),
  addFragment:    (pid: number, data: { text: string; url: string | null; pos_x: number; pos_y: number }) =>
    store.addFragment(pid, data),
  updateFragment: (id: number, data: Partial<Pick<Fragment, 'text' | 'url' | 'pos_x' | 'pos_y'>>) =>
    store.updateFragment(id, data),
  deleteFragment: (id: number) => store.deleteFragment(id),

  splitText: async (text: string): Promise<string[]> => {
    const res = await fetch('/api/fragments/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const result = await res.json().catch(() => ({ error: 'Could not split the text' }))
    if (!res.ok) throw new Error(result.error || 'Could not split the text')
    return result.fragments || []
  },

  // --- Connections ---
  listConnections: (pid: number) => store.listConnections(pid),

  addConnection: (pid: number, data: { from_id: number; to_id: number; label: string }) =>
    store.addConnection(pid, { ...data, source: 'user', status: 'accepted' }),

  updateConnection: async (id: number, data: { status?: Connection['status']; label?: string }) => {
    const conn = await store.findConnection(id)
    if (!conn) throw new Error(`Connection ${id} not found`)

    // Persist preference when an AI suggestion is adjudicated
    if (conn.source === 'ai' && conn.status === 'pending') {
      const frags = await store.listFragments(conn.project_id)
      const fromFrag = frags.find(f => f.id === conn.from_id)
      const toFrag   = frags.find(f => f.id === conn.to_id)
      if (fromFrag && toFrag) {
        if (data.status === 'rejected') {
          await store.addPreference({ from_text: fromFrag.text, to_text: toFrag.text, original_label: conn.label, corrected_label: null })
        } else if (data.status === 'accepted' && data.label && data.label !== conn.label) {
          await store.addPreference({ from_text: fromFrag.text, to_text: toFrag.text, original_label: conn.label, corrected_label: data.label })
        }
      }
    }

    return store.updateConnection(id, data)
  },

  deleteConnection: (id: number) => store.deleteConnection(id),

  discoverConnections: async (pid: number) => {
    const fragments   = await store.listFragments(pid)
    if (fragments.length < 2) return { suggestions: [] as Connection[] }

    const connections  = await store.listConnections(pid)
    const preferences  = await store.listPreferences()
    const existingPairs = connections.map(c => ({ from_id: c.from_id, to_id: c.to_id }))

    const res = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fragments, existing_pairs: existingPairs, preferences }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Discovery failed' }))
      throw new Error(err.error || 'Discovery failed')
    }
    const { suggestions } = await res.json()

    // Save suggestions as pending, deduplicating in-memory
    const currentConns = await store.listConnections(pid)
    const saved: Connection[] = []
    for (const s of (suggestions || [])) {
      const isDupe = currentConns.some(
        c => (c.from_id === s.from_id && c.to_id === s.to_id) ||
             (c.from_id === s.to_id   && c.to_id === s.from_id)
      )
      if (!isDupe) {
        const conn = await store.addConnection(pid, { from_id: s.from_id, to_id: s.to_id, label: s.label, source: 'ai', status: 'pending' })
        saved.push(conn)
        currentConns.push(conn)
      }
    }
    return { suggestions: saved }
  },

  // --- Outline ---
  getOutline: (pid: number) => store.getOutline(pid),

  generateOutline: async (pid: number) => {
    const fragments   = await store.listFragments(pid)
    if (fragments.length === 0) return { order: [] as OutlineItem[] }
    const connections = await store.listConnections(pid)

    const res = await fetch('/api/outline/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fragments, connections }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Outline generation failed' }))
      throw new Error(err.error || 'Outline generation failed')
    }
    const { order: orderedIds } = await res.json()

    const fragMap = Object.fromEntries(fragments.map(f => [f.id, f]))
    const outlineItems: OutlineItem[] = (orderedIds as number[])
      .filter(id => fragMap[id])
      .map((id, i) => ({ fragment_id: id, position: i, text: fragMap[id].text, url: fragMap[id].url }))

    await store.saveOutline(pid, outlineItems)
    return { order: outlineItems }
  },

  saveOutline: (pid: number, items: OutlineItem[]) => store.saveOutline(pid, items),

  // --- Preferences ---
  listPreferences:  () => store.listPreferences(),
  updatePreference: (id: number, data: { corrected_label: string }) => store.updatePreference(id, data),
  deletePreference: (id: number) => store.deletePreference(id),
}
