import { Fragment, forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import {
  expandComponentMaster,
  expandPageWithLayout,
  effectiveStyle,
} from '../../model/resolve'
import { isAssetId, useAssetUrl } from '../../hooks/useAssetUrl'
import { Icon } from '../icons'
import { DragProvider, useCanvasDrag } from './DragManager'
import { SectionLibrary } from './SectionLibrary'
import type {
  BreakpointId,
  Collection,
  CollectionRecord,
  ExpandedNode,
  ID,
  Node,
  NodeOrigin,
} from '../../model/types'

function substitute(text: string | undefined, record?: CollectionRecord): string {
  if (!text) return ''
  if (!record) return text
  return text.replace(/\{\{\s*([\w .-]+)\s*\}\}/g, (_, key) => {
    const v = record.values[key.trim()]
    return v === undefined || v === null ? '' : String(v)
  })
}

function resolveSrc(src: string | undefined, url: string | undefined): string | undefined {
  if (!src) return undefined
  if (isAssetId(src)) return url ?? src
  return src
}

const CONTAINER_TYPES = new Set(['section', 'container', 'grid', 'card', 'form'])

// ---------------------------------------------------------------------------
// Single node renderer
// ---------------------------------------------------------------------------
const ImageEl = forwardRef<HTMLImageElement, { src?: string; alt?: string; style: React.CSSProperties } & React.HTMLAttributes<HTMLElement>>(
  function ImageEl({ src, alt, style, ...rest }, ref) {
    const url = useAssetUrl(src)
    const final = resolveSrc(src, url)
    return <img {...rest} ref={ref} src={final} alt={alt} style={style} />
  },
)

interface RenderProps {
  node: ExpandedNode
  tokens: ReturnType<typeof useProjectStore.getState>['project']['tokens']
  components: ReturnType<typeof useProjectStore.getState>['project']['components']
  collections: Record<string, Collection>
  bp: BreakpointId
  registerRef: (id: ID) => (el: HTMLElement | null) => void
  onSelect: (origin: NodeOrigin, e: React.MouseEvent) => void
  onHover: (id: ID | null) => void
  selectedId: string | null
  hoveredId: string | null
  record?: CollectionRecord
  editing: boolean
  onEditStart: (n: ExpandedNode) => void
  onEditEnd: (n: ExpandedNode, text: string) => void
  onPointerDown: (n: ExpandedNode, e: React.PointerEvent) => void
}

function NodeRenderer({
  node,
  tokens,
  components,
  collections,
  bp,
  registerRef,
  onSelect,
  onHover,
  selectedId,
  hoveredId,
  record,
  editing,
  onEditStart,
  onEditEnd,
  onPointerDown,
}: RenderProps) {
  if (node.visibility.hidden) return null

  const style = effectiveStyle(node, bp, tokens)
  const binding = node.dataBinding
  const isRepeat = binding?.mode === 'repeat'
  const collection = isRepeat && binding ? collections[binding.collectionId] : undefined
  const records = collection?.records ?? []

  const common = {
    'data-node-id': node.id,
    'data-selected': selectedId === node.id ? 'true' : undefined,
    'data-sw-id': node.id,
    'data-sw-drop': node.origin.kind === 'component-instance' ? undefined : 'true',
    'data-sw-origin-kind': node.origin.kind,
    'data-sw-can-contain': CONTAINER_TYPES.has(node.type) ? '1' : '0',
    className: `editor-node${hoveredId === node.id ? ' hovered' : ''}`,
    style,
    ref: registerRef(node.id),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(node.origin, e)
    },
    onMouseEnter: (e: React.MouseEvent) => {
      e.stopPropagation()
      onHover(node.id)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      e.stopPropagation()
      onHover(null)
    },
    onPointerDown: (e: React.PointerEvent) => onPointerDown(node, e),
  }

  const content = node.content
  const text = substitute(content.text, record)

  // Repeat container: render the template children once per record
  if (isRepeat) {
    const Tag = (node.tag || 'div') as 'div'
    return (
      <Tag {...common}>
        {records.map((rec) => (
          <Fragment key={rec.id}>
            {node.children.map((child) => (
              <NodeRenderer
                key={`${rec.id}-${child.id}`}
                node={child}
                tokens={tokens}
                components={components}
                collections={collections}
                bp={bp}
                registerRef={registerRef}
                onSelect={onSelect}
                onHover={onHover}
                selectedId={selectedId}
                hoveredId={hoveredId}
                record={rec}
                editing={false}
                onEditStart={onEditStart}
                onEditEnd={onEditEnd}
                onPointerDown={onPointerDown}
              />
            ))}
          </Fragment>
        ))}
        {records.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 13 }}>
            Empty collection — add records in Data.
          </div>
        )}
      </Tag>
    )
  }

  switch (node.type) {
    case 'text':
    case 'heading': {
      const Tag = (node.tag || 'p') as 'p'
      if (editing) {
        return (
          <Tag
            {...common}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e: React.FocusEvent<HTMLElement>) =>
              onEditEnd(node, (e.target as HTMLElement).innerText)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ;(e.target as HTMLElement).blur()
              }
              if (e.key === 'Escape') (e.target as HTMLElement).blur()
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onEditStart(node)
            }}
          >
            {text}
          </Tag>
        )
      }
      return (
        <Tag {...common} onDoubleClick={(e) => { e.stopPropagation(); onEditStart(node) }}>
          {text || '\u00A0'}
        </Tag>
      )
    }
    case 'image':
      return (
        <ImageEl
          {...common}
          src={content.src}
          alt={substitute(content.alt, record)}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onEditStart(node)
          }}
        />
      )
    case 'button':
    case 'link': {
      const Tag = 'a'
      return (
        <Tag {...common} href={substitute(content.href, record)}>
          {text}
        </Tag>
      )
    }
    case 'input':
      return <input {...common} placeholder={text} readOnly />
    case 'video': {
      const Tag = 'video'
      return <Tag {...common} controls src={resolveSrc(content.src, undefined)} />
    }
    case 'divider':
      return <hr {...common} />
    default: {
      const Tag = (node.tag || 'div') as 'div'
      return (
        <Tag {...common}>
          {node.children.map((child) => (
            <NodeRenderer
              key={child.id}
              node={child}
              tokens={tokens}
              components={components}
              collections={collections}
              bp={bp}
              registerRef={registerRef}
              onSelect={onSelect}
              onHover={onHover}
              selectedId={selectedId}
              hoveredId={hoveredId}
              record={record}
              editing={false}
              onEditStart={onEditStart}
              onEditEnd={onEditEnd}
              onPointerDown={onPointerDown}
            />
          ))}
        </Tag>
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Selection overlay
// ---------------------------------------------------------------------------
function SelectionOverlay({
  nodeId,
  elementMap,
  stageRef,
  viewport,
  selected,
  onResize,
}: {
  nodeId: ID | null
  elementMap: React.MutableRefObject<Map<string, HTMLElement>>
  stageRef: React.RefObject<HTMLDivElement>
  viewport: BreakpointId
  selected: ExpandedNode | null
  onResize: (origin: NodeOrigin, width: number, height: number) => void
}) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number; margin: number[]; padding: number[] } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      if (!nodeId) return setRect(null)
      const el = elementMap.current.get(nodeId)
      const stage = stageRef.current
      if (!el || !stage) return setRect(null)
      const r = el.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const num = (v: string) => parseFloat(v) || 0
      setRect({
        x: r.left - s.left,
        y: r.top - s.top,
        w: r.width,
        h: r.height,
        margin: [num(cs.marginTop), num(cs.marginRight), num(cs.marginBottom), num(cs.marginLeft)],
        padding: [num(cs.paddingTop), num(cs.paddingRight), num(cs.paddingBottom), num(cs.paddingLeft)],
      })
    }
    measure()
    const id = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', measure)
    }
  }, [nodeId, elementMap, stageRef, viewport, selected])

  if (!rect || !selected) return null

  const handles = [
    { id: 'nw', cursor: 'nwse-resize', style: { left: -5, top: -5 } },
    { id: 'n', cursor: 'ns-resize', style: { left: rect.w / 2 - 5, top: -5 } },
    { id: 'ne', cursor: 'nesw-resize', style: { left: rect.w - 5, top: -5 } },
    { id: 'e', cursor: 'ew-resize', style: { left: rect.w - 5, top: rect.h / 2 - 5 } },
    { id: 'se', cursor: 'nwse-resize', style: { left: rect.w - 5, top: rect.h - 5 } },
    { id: 's', cursor: 'ns-resize', style: { left: rect.w / 2 - 5, top: rect.h - 5 } },
    { id: 'sw', cursor: 'nesw-resize', style: { left: -5, top: rect.h - 5 } },
    { id: 'w', cursor: 'ew-resize', style: { left: -5, top: rect.h / 2 - 5 } },
  ]

  const startResize = (e: React.PointerEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    const el = elementMap.current.get(nodeId!)
    if (!el) return
    const startX = e.clientX
    const startY = e.clientY
    const startW = el.offsetWidth
    const startH = el.offsetHeight
    const dir = handle

    const move = (ev: PointerEvent) => {
      let dx = ev.clientX - startX
      let dy = ev.clientY - startY
      if (dir.includes('w')) dx = -dx
      if (dir.includes('n')) dy = -dy
      if (!dir.includes('e') && !dir.includes('w')) dx = 0
      if (!dir.includes('n') && !dir.includes('s')) dy = 0
      el.style.width = `${Math.max(8, startW + dx)}px`
      el.style.height = `${Math.max(8, startH + dy)}px`
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onResize(selected.origin, el.offsetWidth, el.offsetHeight)
      el.style.width = ''
      el.style.height = ''
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <>
      {/* spacing overlay: margin (orange) and padding (green) */}
      <div
        className="spacing-overlay"
        style={{
          left: rect.x - rect.margin[3],
          top: rect.y - rect.margin[0],
          width: rect.w + rect.margin[1] + rect.margin[3],
          height: rect.h + rect.margin[0] + rect.margin[2],
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,158,11,0.18)', border: '1px dashed rgba(245,158,11,0.5)' }} />
      </div>
      <div
        className="spacing-overlay"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.15)', border: '1px dashed rgba(34,197,94,0.5)' }} />
      </div>
      {/* selection box */}
      <div
        style={{
          position: 'absolute',
          left: rect.x - 2,
          top: rect.y - 2,
          width: rect.w + 4,
          height: rect.h + 4,
          border: '2px solid var(--accent)',
          pointerEvents: 'none',
        }}
      />
      {/* name chip */}
      <div
        className="node-chip"
        style={{ left: rect.x - 2, top: rect.y - 2 - 24 }}
      >
        {selected.name}
        {selected.origin.kind === 'component-instance' ? ' ◈' : ''}
      </div>
      {selected.origin.kind !== 'component-instance' &&
        handles.map((h) => (
          <div
            key={h.id}
            className="resize-handle"
            style={{ ...h.style, left: rect.x + (h.style.left as number), top: rect.y + (h.style.top as number), cursor: h.cursor }}
            onPointerDown={(e) => startResize(e, h.id)}
          />
        ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------
export function Canvas() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { startDrag } = useCanvasDrag()
  const {
    activePageId,
    editingComponentId,
    selectedOrigin,
    select,
    hover,
    hoveredNodeId,
    viewport,
    setViewport,
    zoom,
    inspectionMode,
    log,
  } = useEditorStore()

  const elementMap = useRef(new Map<string, HTMLElement>())
  const stageRef = useRef<HTMLDivElement>(null)
  const [editingNode, setEditingNode] = useState<ExpandedNode | null>(null)

  const roots = useMemo<ExpandedNode[]>(() => {
    if (editingComponentId) {
      const comp = project.components[editingComponentId]
      return comp ? [expandComponentMaster(comp, project.components)] : []
    }
    const page = activePageId ? project.pages[activePageId] : null
    if (!page) return []
    return [expandPageWithLayout(page, project)]
  }, [editingComponentId, activePageId, project])

  const selectedNode = useMemo<ExpandedNode | null>(() => {
    if (!selectedOrigin) return null
    const find = (nodes: ExpandedNode[]): ExpandedNode | null => {
      for (const n of nodes) {
        if (
          (selectedOrigin.kind === 'page' && n.origin.kind === 'page' && n.id === selectedOrigin.nodeId) ||
          (selectedOrigin.kind === 'layout' && n.origin.kind === 'layout' && n.id === selectedOrigin.nodeId) ||
          (selectedOrigin.kind === 'component-master' && n.origin.kind === 'component-master' && n.id === selectedOrigin.nodeId) ||
          (selectedOrigin.kind === 'component-instance' &&
            n.origin.kind === 'component-instance' &&
            n.origin.instanceNodeId === selectedOrigin.instanceNodeId &&
            n.origin.masterNodeId === selectedOrigin.masterNodeId)
        ) {
          return n
        }
        const found = find(n.children)
        if (found) return found
      }
      return null
    }
    return find(roots)
  }, [roots, selectedOrigin])

  const viewportWidth = project.tokens.breakpoints[viewport]
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const available = el.clientWidth - 64
      setScale(Math.min(1.1, Math.max(0.25, (available / viewportWidth) * zoom)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [viewportWidth, zoom])

  const registerRef = (id: ID) => (el: HTMLElement | null) => {
    if (el) elementMap.current.set(id, el)
    else elementMap.current.delete(id)
  }

  const onSelect = (origin: NodeOrigin, e: React.MouseEvent) => {
    select(origin)
    if (inspectionMode) {
      const n = origin
      log(`Inspect: ${JSON.stringify(n)}`)
    }
  }

  const handlePointerDown = (node: ExpandedNode, e: React.PointerEvent) => {
    if (node.origin.kind === 'component-instance') return
    // Absolute positioning drag
    const isAbsolute =
      node.style.layout.mode === 'absolute' ||
      node.style.position.top !== undefined ||
      node.style.position.left !== undefined
    if (isAbsolute && selectedOrigin && isSameOrigin(selectedOrigin, node.origin)) {
      const el = elementMap.current.get(node.id)
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const startLeft = el.offsetLeft
      const startTop = el.offsetTop
      let moved = false
      const move = (ev: PointerEvent) => {
        moved = true
        el.style.left = `${startLeft + (ev.clientX - startX)}px`
        el.style.top = `${startTop + (ev.clientY - startY)}px`
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        if (moved) {
          store.setNodeStyle(node.origin, {
            layout: { mode: 'absolute' },
            position: { left: el.offsetLeft, top: el.offsetTop },
          })
        }
        el.style.left = ''
        el.style.top = ''
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      return
    }
    // Structural drag: reorder / reparent via the DragManager.
    startDrag(node.origin, e)
  }

  const onEditEnd = (node: ExpandedNode, text: string) => {
    setEditingNode(null)
    store.setNodeContent(node.origin, { text })
    log(`Updated text of “${node.name}”`)
  }

  const onResize = (origin: NodeOrigin, width: number, height: number) => {
    store.setNodeStyle(origin, { sizing: { width: Math.round(width), height: Math.round(height) } })
  }

  // breadcrumb path
  const breadcrumb = useMemo(() => {
    if (!selectedNode) return []
    const path: ExpandedNode[] = []
    const walk = (nodes: ExpandedNode[]): boolean => {
      for (const n of nodes) {
        if (n === selectedNode) {
          path.push(n)
          return true
        }
        if (walk(n.children)) {
          path.unshift(n)
          return true
        }
      }
      return false
    }
    walk(roots)
    return path
  }, [roots, selectedNode])

  const pageName = editingComponentId
    ? project.components[editingComponentId]?.name
    : project.pages[activePageId ?? '']?.name

  return (
    <DragProvider>
    <div ref={containerRef} className="flex-1 min-w-0 flex flex-col relative">
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-1 px-3 h-8 border-b border-[var(--border)] bg-[var(--surface)] text-[11.5px] overflow-x-auto whitespace-nowrap">
        <SectionLibrary />
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <span className="text-[var(--text-secondary)] font-medium">{pageName ?? '—'}</span>
        {breadcrumb.map((n, i) => (
          <span key={i} className="flex items-center gap-1">
            <Icon name="chevronRight" size={10} className="text-[var(--text-tertiary)]" />
            <button
              onClick={() => select(n.origin)}
              className={`hover:text-[var(--text)] ${
                i === breadcrumb.length - 1 ? 'text-[var(--accent-hover)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              {n.name}
            </button>
          </span>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
          <span className="text-[10.5px]">{viewportWidth}px</span>
          <span className="text-[10.5px]">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 overflow-auto canvas-stage">
        <div className="flex justify-center py-8">
          <div
            ref={stageRef}
            className="site-canvas relative"
            style={{ width: viewportWidth, minHeight: 600, transform: `scale(${scale})` }}
          >
            {roots.map((root) => (
              <NodeRenderer
                key={root.id}
                node={root}
                tokens={project.tokens}
                components={project.components}
                collections={project.collections}
                bp={viewport}
                registerRef={registerRef}
                onSelect={onSelect}
                onHover={hover}
                selectedId={selectedNode?.id ?? null}
                hoveredId={hoveredNodeId}
                editing={editingNode?.id === root.id}
                onEditStart={(n) => setEditingNode(n)}
                onEditEnd={onEditEnd}
                onPointerDown={handlePointerDown}
              />
            ))}
            <SelectionOverlay
              nodeId={selectedNode?.id ?? null}
              elementMap={elementMap}
              stageRef={stageRef}
              viewport={viewport}
              selected={selectedNode}
              onResize={onResize}
            />
          </div>
        </div>
      </div>
    </div>
    </DragProvider>
  )
}

function isSameOrigin(a: NodeOrigin, b: NodeOrigin): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'page' && b.kind === 'page') return a.nodeId === b.nodeId
  if (a.kind === 'layout' && b.kind === 'layout') return a.nodeId === b.nodeId
  if (a.kind === 'component-master' && b.kind === 'component-master')
    return a.componentId === b.componentId && a.nodeId === b.nodeId
  if (a.kind === 'component-instance' && b.kind === 'component-instance')
    return a.instanceNodeId === b.instanceNodeId && a.masterNodeId === b.masterNodeId
  return false
}
