import { useMemo } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { expandComponentMaster, expandPageWithLayout } from '../model/resolve'
import type { ExpandedNode } from '../model/types'

export function useSelectedNode(): ExpandedNode | null {
  const project = useProjectStore((s) => s.project)
  const { activePageId, editingComponentId, selectedOrigin } = useEditorStore()

  const roots = useMemo<ExpandedNode[]>(() => {
    if (editingComponentId) {
      const comp = project.components[editingComponentId]
      return comp ? [expandComponentMaster(comp, project.components)] : []
    }
    const page = activePageId ? project.pages[activePageId] : null
    if (!page) return []
    return [expandPageWithLayout(page, project)]
  }, [editingComponentId, activePageId, project])

  return useMemo(() => {
    if (!selectedOrigin) return null
    const find = (nodes: ExpandedNode[]): ExpandedNode | null => {
      for (const n of nodes) {
        const match =
          (selectedOrigin.kind === 'page' && n.origin.kind === 'page' && n.id === selectedOrigin.nodeId) ||
          (selectedOrigin.kind === 'layout' && n.origin.kind === 'layout' && n.id === selectedOrigin.nodeId) ||
          (selectedOrigin.kind === 'component-master' && n.origin.kind === 'component-master' && n.id === selectedOrigin.nodeId) ||
          (selectedOrigin.kind === 'component-instance' &&
            n.origin.kind === 'component-instance' &&
            n.origin.instanceNodeId === selectedOrigin.instanceNodeId &&
            n.origin.masterNodeId === selectedOrigin.masterNodeId)
        if (match) return n
        const found = find(n.children)
        if (found) return found
      }
      return null
    }
    return find(roots)
  }, [roots, selectedOrigin])
}
