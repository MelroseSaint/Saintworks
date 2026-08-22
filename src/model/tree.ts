import type { ID, Node, NodeInstanceRef, Project } from './types'
import { uid } from './factories'

export function findNode(nodes: Node[], id: ID): Node | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNode(n.children, id)
    if (found) return found
  }
  return null
}

export function findParent(nodes: Node[], id: ID): Node | null {
  for (const n of nodes) {
    if (n.children.some((c) => c.id === id)) return n
    const found = findParent(n.children, id)
    if (found) return found
  }
  return null
}

export function findParentList(nodes: Node[], id: ID): { list: Node[]; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return { list: nodes, index: i }
    const found = findParentList(nodes[i].children, id)
    if (found) return found
  }
  return null
}

export function updateNode(nodes: Node[], id: ID, updater: (n: Node) => Node): Node[] {
  return nodes.map((n) => {
    if (n.id === id) return updater(n)
    if (n.children.length) {
      const children = updateNode(n.children, id, updater)
      if (children !== n.children) return { ...n, children }
    }
    return n
  })
}

export function replaceNode(nodes: Node[], id: ID, next: Node): Node[] {
  return updateNode(nodes, id, () => next)
}

export function removeNode(nodes: Node[], id: ID): Node[] {
  const filtered = nodes.filter((n) => n.id !== id)
  if (filtered.length !== nodes.length) return filtered
  return nodes.map((n) =>
    n.children.length ? { ...n, children: removeNode(n.children, id) } : n,
  )
}

export function insertNode(
  nodes: Node[],
  parentId: ID | null,
  node: Node,
  index?: number,
): Node[] {
  if (parentId === null) {
    const next = [...nodes]
    if (index === undefined) next.push(node)
    else next.splice(index, 0, node)
    return next
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      const children = [...n.children]
      if (index === undefined) children.push(node)
      else children.splice(index, 0, node)
      return { ...n, children }
    }
    if (n.children.length) {
      return { ...n, children: insertNode(n.children, parentId, node, index) }
    }
    return n
  })
}

export function moveNode(
  nodes: Node[],
  id: ID,
  newParentId: ID | null,
  newIndex: number,
): Node[] {
  const node = findNode(nodes, id)
  if (!node) return nodes
  const without = removeNode(nodes, id)
  return insertNode(without, newParentId, node, newIndex)
}

// Move a node relative to a target sibling/container (canvas drag-and-drop).
// position: 'before' | 'after' reorders among the target's siblings;
//           'inside' reparents the node into the target's children.
export function moveNodeTo(
  nodes: Node[],
  id: ID,
  targetId: ID,
  position: 'before' | 'after' | 'inside',
): Node[] {
  if (id === targetId) return nodes
  const dragged = findNode(nodes, id)
  if (!dragged) return nodes
  // Never drop a node into its own subtree.
  if (findNode(dragged.children, targetId)) return nodes

  const without = removeNode(nodes, id)

  if (position === 'inside') {
    if (!findNode(without, targetId)) return nodes
    return insertNode(without, targetId, dragged, undefined)
  }

  const loc = findParentList(without, targetId)
  if (!loc) return nodes
  const parentId = findParent(without, targetId)?.id ?? null
  const index = position === 'before' ? loc.index : loc.index + 1
  return insertNode(without, parentId, dragged, index)
}

// Reorder within the same parent list (visual layer tree)
export function reorderSiblings(
  nodes: Node[],
  parentId: ID | null,
  from: number,
  to: number,
): Node[] {
  const list = parentId === null ? nodes : findNode(nodes, parentId)?.children
  if (!list) return nodes
  const arr = [...list]
  const [moved] = arr.splice(from, 1)
  arr.splice(to, 0, moved)
  if (parentId === null) return arr
  return updateNode(nodes, parentId, (n) => ({ ...n, children: arr }))
}

export function duplicateNodeDeep(node: Node, idMap: Map<ID, ID>): Node {
  const newId = uid()
  idMap.set(node.id, newId)
  return {
    ...structuredClone(node),
    id: newId,
    children: node.children.map((c) => duplicateNodeDeep(c, idMap)),
    // remap interaction/instance references via idMap after full pass
  }
}

export function collectIds(nodes: Node[], out: ID[] = []): ID[] {
  for (const n of nodes) {
    out.push(n.id)
    collectIds(n.children, out)
  }
  return out
}

export function flattenNodes(nodes: Node[]): Node[] {
  const out: Node[] = []
  const walk = (list: Node[]) => {
    for (const n of list) {
      out.push(n)
      walk(n.children)
    }
  }
  walk(nodes)
  return out
}

// Breadcrumb path from root to a node id
export function pathToNode(nodes: Node[], id: ID): Node[] {
  for (const n of nodes) {
    if (n.id === id) return [n]
    const sub = pathToNode(n.children, id)
    if (sub.length) return [n, ...sub]
  }
  return []
}

export function clonePageNodes(nodes: Node[]): Node[] {
  return structuredClone(nodes)
}

// Find the live instance reference for an instance node across the whole project
export function findInstanceRef(
  project: Pick<Project, 'pages' | 'layouts' | 'components'>,
  instanceNodeId: ID,
): NodeInstanceRef | null {
  const search = (nodes: Node[]): NodeInstanceRef | null => {
    for (const n of flattenNodes(nodes)) {
      if (n.id === instanceNodeId && n.instance) return n.instance
    }
    return null
  }
  for (const p of Object.values(project.pages)) {
    const r = search(p.nodes)
    if (r) return r
  }
  for (const l of Object.values(project.layouts)) {
    const r = search([l.frame])
    if (r) return r
  }
  for (const c of Object.values(project.components)) {
    const r = search([c.rootNode])
    if (r) return r
  }
  return null
}
