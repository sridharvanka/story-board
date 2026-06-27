import type { Connection, Fragment } from './types'

export interface MindMapPosition {
  x: number
  y: number
}

export function createMindMapPositions(
  fragments: Fragment[],
  connections: Connection[]
): Map<number, MindMapPosition> {
  const positions = new Map<number, MindMapPosition>()
  if (fragments.length === 0) return positions

  const fragmentIds = new Set(fragments.map(fragment => fragment.id))
  const adjacency = new Map<number, Set<number>>(
    fragments.map(fragment => [fragment.id, new Set<number>()])
  )

  connections.forEach(connection => {
    if (
      connection.status === 'rejected' ||
      !fragmentIds.has(connection.from_id) ||
      !fragmentIds.has(connection.to_id)
    ) return

    adjacency.get(connection.from_id)?.add(connection.to_id)
    adjacency.get(connection.to_id)?.add(connection.from_id)
  })

  const root = fragments.reduce((best, fragment) => {
    const bestDegree = adjacency.get(best.id)?.size ?? 0
    const degree = adjacency.get(fragment.id)?.size ?? 0
    return degree > bestDegree ? fragment : best
  }, fragments[0])

  const levels = new Map<number, number>([[root.id, 0]])
  const queue = [root.id]

  while (queue.length > 0) {
    const current = queue.shift()!
    const nextLevel = (levels.get(current) ?? 0) + 1
    adjacency.get(current)?.forEach(neighbour => {
      if (levels.has(neighbour)) return
      levels.set(neighbour, nextLevel)
      queue.push(neighbour)
    })
  }

  const deepestLevel = Math.max(0, ...Array.from(levels.values()))
  fragments.forEach(fragment => {
    if (!levels.has(fragment.id)) levels.set(fragment.id, deepestLevel + 1)
  })

  const levelGroups = new Map<number, number[]>()
  fragments.forEach(fragment => {
    const level = levels.get(fragment.id) ?? 0
    const group = levelGroups.get(level) ?? []
    group.push(fragment.id)
    levelGroups.set(level, group)
  })

  positions.set(root.id, { x: 0, y: 0 })

  levelGroups.forEach((ids, level) => {
    if (level === 0) return
    const radius = Math.max(level * 300, ids.length * 105)
    const angleStep = (Math.PI * 2) / ids.length
    const angleOffset = -Math.PI / 2 + (level % 2 === 0 ? angleStep / 2 : 0)

    ids.forEach((id, index) => {
      const angle = angleOffset + index * angleStep
      positions.set(id, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      })
    })
  })

  return positions
}
