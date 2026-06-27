import type { Edge, Node } from '@xyflow/react'
import type { Connection, Fragment } from './types'

const ROOT_ID = 'mindmap-root'
const BRANCH_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#9333ea']

type Side = 'left' | 'right'

interface AdjacentIdea {
  id: number
  label: string
}

interface TreePosition {
  x: number
  y: number
  depth: number
  side: Side
}

export interface MindMapGraph {
  nodes: Node[]
  edges: Edge[]
}

function connectedComponents(ids: number[], adjacency: Map<number, AdjacentIdea[]>): number[][] {
  const visited = new Set<number>()
  const components: number[][] = []

  ids.forEach(id => {
    if (visited.has(id)) return
    const component: number[] = []
    const queue = [id]
    visited.add(id)

    while (queue.length > 0) {
      const current = queue.shift()!
      component.push(current)
      ;(adjacency.get(current) ?? []).forEach(neighbour => {
        if (visited.has(neighbour.id)) return
        visited.add(neighbour.id)
        queue.push(neighbour.id)
      })
    }

    components.push(component)
  })

  return components.sort((a, b) => b.length - a.length)
}

export function createMindMapGraph(
  projectName: string,
  fragments: Fragment[],
  connections: Connection[]
): MindMapGraph {
  if (fragments.length === 0) {
    return {
      nodes: [{
        id: ROOT_ID,
        type: 'mindMapRoot',
        position: { x: 0, y: -45 },
        data: { title: projectName || 'Untitled project' },
        draggable: false,
        selectable: false,
      }],
      edges: [],
    }
  }

  const fragmentById = new Map(fragments.map(fragment => [fragment.id, fragment]))
  const adjacency = new Map<number, AdjacentIdea[]>(
    fragments.map(fragment => [fragment.id, []])
  )

  connections.forEach(connection => {
    if (
      connection.status === 'rejected' ||
      !fragmentById.has(connection.from_id) ||
      !fragmentById.has(connection.to_id)
    ) return

    adjacency.get(connection.from_id)?.push({ id: connection.to_id, label: connection.label })
    adjacency.get(connection.to_id)?.push({ id: connection.from_id, label: connection.label })
  })

  const desiredBranches = Math.min(6, Math.max(1, Math.round(Math.sqrt(fragments.length))))
  const components = connectedComponents(fragments.map(fragment => fragment.id), adjacency)
  const seeds: number[] = []

  components.slice(0, desiredBranches).forEach(component => {
    const seed = component.reduce((best, id) =>
      (adjacency.get(id)?.length ?? 0) > (adjacency.get(best)?.length ?? 0) ? id : best
    , component[0])
    seeds.push(seed)
  })

  fragments
    .slice()
    .sort((a, b) => (adjacency.get(b.id)?.length ?? 0) - (adjacency.get(a.id)?.length ?? 0))
    .forEach(fragment => {
      if (seeds.length < desiredBranches && !seeds.includes(fragment.id)) seeds.push(fragment.id)
    })

  const assignedSeed = new Map<number, number>()
  const parent = new Map<number, number | null>()
  const parentLabel = new Map<number, string>()
  const queue = seeds.slice()

  seeds.forEach(seed => {
    assignedSeed.set(seed, seed)
    parent.set(seed, null)
  })

  while (queue.length > 0) {
    const current = queue.shift()!
    ;(adjacency.get(current) ?? []).forEach(neighbour => {
      if (assignedSeed.has(neighbour.id)) return
      assignedSeed.set(neighbour.id, assignedSeed.get(current)!)
      parent.set(neighbour.id, current)
      parentLabel.set(neighbour.id, neighbour.label)
      queue.push(neighbour.id)
    })
  }

  const branchSizes = new Map<number, number>(seeds.map(seed => [seed, 0]))
  assignedSeed.forEach(seed => branchSizes.set(seed, (branchSizes.get(seed) ?? 0) + 1))

  fragments.forEach(fragment => {
    if (assignedSeed.has(fragment.id)) return
    const seed = seeds.reduce((smallest, candidate) =>
      (branchSizes.get(candidate) ?? 0) < (branchSizes.get(smallest) ?? 0) ? candidate : smallest
    , seeds[0])
    assignedSeed.set(fragment.id, seed)
    parent.set(fragment.id, seed)
    parentLabel.set(fragment.id, 'Related idea')
    branchSizes.set(seed, (branchSizes.get(seed) ?? 0) + 1)
  })

  const children = new Map<number, number[]>(fragments.map(fragment => [fragment.id, []]))
  parent.forEach((parentId, id) => {
    if (parentId !== null) children.get(parentId)?.push(id)
  })

  const positions = new Map<number, TreePosition>()
  const branchSides = new Map<number, Side>()
  seeds.forEach((seed, index) => branchSides.set(seed, index % 2 === 0 ? 'right' : 'left'))

  ;(['left', 'right'] as Side[]).forEach(side => {
    let cursor = 0
    const sideIds: number[] = []

    function layoutNode(id: number, depth: number): number {
      const childIds = children.get(id) ?? []
      let y: number

      if (childIds.length === 0) {
        y = cursor
        cursor += 150
      } else {
        const childYs = childIds.map(childId => layoutNode(childId, depth + 1))
        y = childYs.reduce((sum, childY) => sum + childY, 0) / childYs.length
      }

      const x = side === 'right'
        ? 380 + depth * 300
        : -360 - depth * 300
      positions.set(id, { x, y, depth, side })
      sideIds.push(id)
      return y
    }

    seeds
      .filter(seed => branchSides.get(seed) === side)
      .forEach(seed => layoutNode(seed, 0))

    if (sideIds.length > 0) {
      const yValues = sideIds.map(id => positions.get(id)!.y)
      const offset = -(Math.min(...yValues) + Math.max(...yValues)) / 2
      sideIds.forEach(id => {
        const position = positions.get(id)!
        positions.set(id, { ...position, y: position.y + offset })
      })
    }
  })

  const nodes: Node[] = [{
    id: ROOT_ID,
    type: 'mindMapRoot',
    position: { x: 0, y: -45 },
    data: { title: projectName || 'Untitled project' },
    draggable: false,
    selectable: false,
  }]

  fragments.forEach(fragment => {
    const position = positions.get(fragment.id)
    if (!position) return
    const branchIndex = seeds.indexOf(assignedSeed.get(fragment.id)!)
    const color = BRANCH_COLORS[branchIndex % BRANCH_COLORS.length]
    nodes.push({
      id: String(fragment.id),
      type: 'mindMapNode',
      position: { x: position.x, y: position.y },
      data: {
        text: fragment.text,
        relation: parent.get(fragment.id) === null ? undefined : parentLabel.get(fragment.id),
        color,
        side: position.side,
        primary: position.depth === 0,
      },
      draggable: false,
      selectable: false,
    })
  })

  const edges: Edge[] = []
  seeds.forEach((seed, branchIndex) => {
    const side = branchSides.get(seed) ?? 'right'
    const color = BRANCH_COLORS[branchIndex % BRANCH_COLORS.length]
    edges.push({
      id: `${ROOT_ID}-${seed}`,
      source: ROOT_ID,
      sourceHandle: side,
      target: String(seed),
      type: 'smoothstep',
      selectable: false,
      style: { stroke: color, strokeWidth: 3 },
    })
  })

  parent.forEach((parentId, id) => {
    if (parentId === null) return
    const branchIndex = seeds.indexOf(assignedSeed.get(id)!)
    const color = BRANCH_COLORS[branchIndex % BRANCH_COLORS.length]
    edges.push({
      id: `mindmap-${parentId}-${id}`,
      source: String(parentId),
      target: String(id),
      type: 'smoothstep',
      selectable: false,
      style: { stroke: color, strokeWidth: 2, opacity: 0.75 },
    })
  })

  return { nodes, edges }
}
