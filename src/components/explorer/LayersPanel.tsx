import { useMemo, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { expandComponentMaster, expandPageNodes } from '../../model/resolve'
import { buildNode, pad, uid } from '../../model/factories'
import { Icon } from '../icons'
import { ContextMenu, usePrompt, type MenuItem } from '../ui'
import type { ExpandedNode, Node, NodeType } from '../../model/types'

const TYPE_ICONS: Record<string, string> = {
  section: 'box',
  container: 'box',
  text: 'type',
  heading: 'type',
  button: 'cursor',
  image: 'image',
  link: 'link',
  video: 'play',
  divider: 'grid',
  icon: 'component',
  form: 'doc',
  input: 'type',
  grid: 'grid',
  card: 'component',
}

function newNode(type: NodeType, name: string): Node {
  const defaults: Record<string, Partial<Node['style']> & { content?: Node['content']; tag?: string }> = {
    section: { layout: { mode: 'flex', direction: 'vertical', gap: 'MD' }, spacing: { padding: pad('LG') } },
    container: { layout: { mode: 'flex', direction: 'vertical', gap: 'SM' } },
    text: { content: { text: 'Text' }, typography: { fontToken: 'body' } },
    heading: { content: { text: 'Heading' }, typography: { fontToken: 'heading' }, tag: 'h2' },
    button: {
      content: { text: 'Button' },
      tag: 'a',
      typography: { fontToken: 'body', fontWeight: 600, fontSize: 15, align: 'center', colorToken: 'text.inverse' },
      background: { colorToken: 'accent', radiusToken: 'pill' },
      spacing: { padding: { top: 'SM', bottom: 'SM', left: 'MD', right: 'MD' } },
      sizing: { width: 'fit-content' },
    },
    image: { content: { alt: 'Image' }, tag: 'img', sizing: { width: 320, height: 200, fit: 'cover' }, background: { radiusToken: 'md' } },
    grid: { layout: { mode: 'grid', columns: 3, gap: 'MD' } },
    card: { layout: { mode: 'flex', direction: 'vertical', gap: 'SM' }, spacing: { padding: pad('LG') }, background: { colorToken: 'surface', radiusToken: 'md' } },
    form: { layout: { mode: 'flex', direction: 'vertical', gap: 'MD' } },
    input: { content: { text: 'Input' }, tag: 'input', spacing: { padding: pad('SM') }, background: { colorToken: 'surface', radiusToken: 'sm', borderToken: 'default' } },
    link: { content: { text: 'Link', href: '#' }, tag: 'a', typography: { fontToken: 'body' } },
    divider: { tag: 'hr' },
    icon: { tag: 'div' },
    video: { tag: 'video' },
  }
  const d = defaults[type] ?? {}
  return buildNode({ type, name, tag: d.tag, content: d.content, style: d as Partial<Node['style']> })
}

export function LayersPanel() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { activePageId, editingComponentId, selectedOrigin, select, log, recordChange } = useEditorStore()
  const { prompt, element } = usePrompt()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)

  const editingComponent = editingComponentId ? project.components[editingComponentId] : null

  const roots = useMemo<ExpandedNode[]>(() => {
    if (editingComponent) return [expandComponentMaster(editingComponent, project.components)]
    const page = activePageId ? project.pages[activePageId] : null
    if (!page) return []
    return expandPageNodes(page.nodes, project.components)
  }, [editingComponent, activePageId, project.components, project.pages])

  const title = editingComponent ? editingComponent.name : project.pages[activePageId ?? '']?.name ?? 'Layers'

  const isSelected = (n: ExpandedNode) => {
    if (!selectedOrigin) return false
    if (selectedOrigin.kind === 'page' && n.origin.kind === 'page') return selectedOrigin.nodeId === n.id
    if (selectedOrigin.kind === 'component-master' && n.origin.kind === 'component-master')
      return selectedOrigin.nodeId === n.id
    if (selectedOrigin.kind === 'component-instance' && n.origin.kind === 'component-instance')
      return selectedOrigin.instanceNodeId === n.origin.instanceNodeId && selectedOrigin.masterNodeId === n.origin.masterNodeId
    return false
  }

  const buildMenu = (n: ExpandedNode): MenuItem[] => {
    const items: MenuItem[] = []
    const editable = n.origin.kind !== 'component-instance'
    if (n.origin.kind === 'page' || n.origin.kind === 'component-master') {
      items.push(
        { label: 'Rename', icon: 'type', onClick: () => { void (async () => { const name = await prompt('Rename layer', n.name); if (name) store.renameNodeAt(n.origin, name) })() } },
        { label: 'Duplicate', icon: 'duplicate', onClick: () => { store.duplicateNodeAt(n.origin); recordChange(`Duplicated ${n.name}`, 'layout') } },
        { label: 'Move up', icon: 'chevronUp', onClick: () => store.moveNodeSibling(n.origin, -1) },
        { label: 'Move down', icon: 'chevronDown', onClick: () => store.moveNodeSibling(n.origin, 1) },
        { label: n.visibility.hidden ? 'Show' : 'Hide', icon: n.visibility.hidden ? 'eye' : 'eyeOff', onClick: () => store.setNodeVisibility(n.origin, { hidden: !n.visibility.hidden }) },
        { label: n.visibility.locked ? 'Unlock' : 'Lock', icon: n.visibility.locked ? 'unlock' : 'lock', onClick: () => store.setNodeVisibility(n.origin, { locked: !n.visibility.locked }) },
        { label: 'Create component…', icon: 'component', onClick: () => { void (async () => { const name = await prompt('Component name', n.name); if (name) { store.createComponentFromNode(n.origin, name, 'Custom'); log(`Created component “${name}”`, 'success') } })() } },
        { divider: true, label: '' },
        ...(n.type !== 'text' && n.type !== 'heading'
          ? [
              { label: 'Add heading', icon: 'plus', onClick: () => store.addChildNode(n.origin, newNode('heading', 'Heading')) },
              { label: 'Add text', icon: 'plus', onClick: () => store.addChildNode(n.origin, newNode('text', 'Text')) },
            ]
          : []),
        { label: 'Add container', icon: 'plus', onClick: () => store.addChildNode(n.origin, newNode('container', 'Container')) },
        { divider: true, label: '' },
        { label: 'Delete', icon: 'trash', danger: true, onClick: () => store.removeNodeAt(n.origin) },
      )
    } else {
      items.push(
        { label: 'Reset overrides', icon: 'refresh', onClick: () => store.removeNodeAt(n.origin) },
        { label: 'Select', icon: 'cursor', onClick: () => select(n.origin) },
      )
    }
    return items
  }

  const Row = ({ n, depth }: { n: ExpandedNode; depth: number }) => {
    const hasChildren = n.children.length > 0
    const open = !collapsed.has(n.id)
    const isInstance = n.origin.kind === 'component-instance'
    const selected = isSelected(n)
    return (
      <div>
        <div
          className={`flex items-center gap-1 pr-1 py-[3px] hover:bg-[var(--surface-raised)] cursor-pointer rounded text-[12.5px] group ${
            selected ? 'bg-[var(--accent)]/20' : ''
          } ${n.visibility.hidden ? 'opacity-45' : ''}`}
          style={{ paddingLeft: depth * 13 + 6 }}
          onClick={(e) => {
            e.stopPropagation()
            select(n.origin)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setMenu({ x: e.clientX, y: e.clientY, items: buildMenu(n) })
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setCollapsed((prev) => {
                const next = new Set(prev)
                if (next.has(n.id)) next.delete(n.id)
                else next.add(n.id)
                return next
              })
            }}
            className="w-3.5 shrink-0 flex justify-center text-[var(--text-tertiary)]"
          >
            {hasChildren ? (
              <Icon name="chevronRight" size={11} className={open ? 'rotate-90' : ''} />
            ) : (
              <span className="text-[9px] leading-none">•</span>
            )}
          </button>
          <Icon name={TYPE_ICONS[n.type] ?? 'box'} size={12} className="shrink-0 opacity-70" />
          <span className="flex-1 truncate">{n.name}</span>
          {isInstance && (
            <span className="text-[8.5px] font-semibold text-white bg-[var(--accent)] px-1 rounded shrink-0">◈</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              store.setNodeVisibility(n.origin, { hidden: !n.visibility.hidden })
            }}
            className={`opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text)] ${n.visibility.hidden ? 'opacity-100' : ''}`}
            title={n.visibility.hidden ? 'Show' : 'Hide'}
          >
            <Icon name={n.visibility.hidden ? 'eyeOff' : 'eye'} size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              store.setNodeVisibility(n.origin, { locked: !n.visibility.locked })
            }}
            className={`opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text)] ${n.visibility.locked ? 'opacity-100' : ''}`}
            title={n.visibility.locked ? 'Unlock' : 'Lock'}
          >
            <Icon name={n.visibility.locked ? 'lock' : 'unlock'} size={12} />
          </button>
        </div>
        {hasChildren && open && (
          <div>
            {n.children.map((c) => (
              <Row key={c.id} n={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        <span className="truncate">{title}</span>
        {!editingComponent && activePageId && (
          <button
            className="p-1 rounded hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
            title="Add section"
            onClick={() => {
              const sec = newNode('section', 'New Section')
              store.addNodeToPage(activePageId, sec)
              recordChange('Added section', 'layout')
            }}
          >
            <Icon name="plus" size={13} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {roots.map((n) => (
          <Row key={n.id} n={n} depth={0} />
        ))}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {element}
    </div>
  )
}
