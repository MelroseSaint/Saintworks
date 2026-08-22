import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import type { ID, NodeOrigin } from '../../model/types'

export type DropPosition = 'before' | 'after' | 'inside'

export interface DropTarget {
  id: ID
  position: DropPosition
  rect: { top: number; left: number; width: number; height: number }
}

interface DragContextValue {
  startDrag: (origin: NodeOrigin, e: React.PointerEvent) => void
  dragging: boolean
  dropTarget: DropTarget | null
}

const DragContext = createContext<DragContextValue>({
  startDrag: () => {},
  dragging: false,
  dropTarget: null,
})

export function useCanvasDrag() {
  return useContext(DragContext)
}

interface Session {
  origin: NodeOrigin
  startX: number
  startY: number
  el: HTMLElement | null
  siblingParent: HTMLElement | null
  moved: boolean
  target: DropTarget | null
  moveHandler: (e: PointerEvent) => void
  upHandler: (e: PointerEvent) => void
}

function originNodeId(origin: NodeOrigin): ID | null {
  if (origin.kind === 'component-instance') return null
  return origin.nodeId
}

function hitTest(x: number, y: number, s: Session): DropTarget | null {
  const hit = document.elementFromPoint(x, y)
  if (!hit) return null

  const deepest = (hit.closest('[data-sw-drop]') as HTMLElement | null)
  if (!deepest) return null

  // Only accept targets of the same origin kind (page <-> page, etc.).
  const kind = deepest.getAttribute('data-sw-origin-kind')
  const id = deepest.getAttribute('data-sw-id')
  if (!kind || !id || kind !== s.origin.kind) return null
  if (id === originNodeId(s.origin)) return null

  const rect = deepest.getBoundingClientRect()
  const rel = y - rect.top
  const canContain = deepest.getAttribute('data-sw-can-contain') === '1'

  // Reparent: drop into the middle band of a container.
  if (canContain && rect.height > 40 && rel > rect.height * 0.3 && rel < rect.height * 0.7) {
    return { id, position: 'inside', rect }
  }

  // Reorder: promote to a sibling of the dragged node so full-bleed sections
  // reorder against each other rather than against their inner children.
  let target = deepest
  if (s.siblingParent) {
    let cur: HTMLElement | null = deepest
    while (cur && cur !== s.siblingParent) {
      if (cur.parentElement === s.siblingParent && cur.getAttribute('data-sw-origin-kind') === s.origin.kind) {
        target = cur
        break
      }
      cur = cur.parentElement
    }
  }
  const tRect = target.getBoundingClientRect()
  const position: DropPosition = y <= tRect.top + tRect.height / 2 ? 'before' : 'after'
  return {
    id: target.getAttribute('data-sw-id') ?? id,
    position,
    rect: { top: tRect.top, left: tRect.left, width: tRect.width, height: tRect.height },
  }
}

export function DragProvider({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState(false)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const sessionRef = useRef<Session | null>(null)

  const cleanup = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    window.removeEventListener('pointermove', s.moveHandler)
    window.removeEventListener('pointerup', s.upHandler)
    if (s.el) {
      s.el.classList.remove('sw-dragging')
      s.el.style.pointerEvents = ''
    }
    sessionRef.current = null
    setDragging(false)
    setDropTarget(null)
  }, [])

  const startDrag = useCallback(
    (origin: NodeOrigin, e: React.PointerEvent) => {
      if (origin.kind === 'component-instance') return
      if (sessionRef.current) return

      const el = (e.currentTarget as HTMLElement)?.closest?.('[data-sw-id]') as HTMLElement | null
      const startX = e.clientX
      const startY = e.clientY

      const moveHandler = (ev: PointerEvent) => {
        const s = sessionRef.current
        if (!s) return
        if (!s.moved) {
          if (Math.abs(ev.clientX - s.startX) > 4 || Math.abs(ev.clientY - s.startY) > 4) {
            s.moved = true
            if (s.el) {
              s.el.classList.add('sw-dragging')
              s.el.style.pointerEvents = 'none'
            }
            setDragging(true)
          } else {
            return
          }
        }
        const target = hitTest(ev.clientX, ev.clientY, s)
        s.target = target
        setDropTarget(target)
      }

      const upHandler = () => {
        const s = sessionRef.current
        if (s && s.moved && s.target) {
          useProjectStore.getState().moveNodeToTarget(s.origin, s.target.id, s.target.position)
          useEditorStore.getState().recordChange('Reordered element on canvas', 'layout')
          useEditorStore.getState().log('Moved element on canvas')
        }
        cleanup()
      }

      sessionRef.current = {
        origin,
        startX,
        startY,
        el,
        siblingParent: el?.parentElement ?? null,
        moved: false,
        target: null,
        moveHandler,
        upHandler,
      }
      window.addEventListener('pointermove', moveHandler)
      window.addEventListener('pointerup', upHandler)
    },
    [cleanup],
  )

  return (
    <DragContext.Provider value={{ startDrag, dragging, dropTarget }}>
      {children}
      {dropTarget && <DropIndicator target={dropTarget} />}
    </DragContext.Provider>
  )
}

function DropIndicator({ target }: { target: DropTarget }) {
  if (target.position === 'inside') {
    return (
      <div
        className="pointer-events-none fixed z-[90]"
        style={{
          left: target.rect.left,
          top: target.rect.top,
          width: target.rect.width,
          height: target.rect.height,
          border: '2px solid var(--accent)',
          background: 'var(--accent-light)',
          borderRadius: 3,
        }}
      />
    )
  }
  const top =
    target.position === 'before'
      ? target.rect.top - 3
      : target.rect.top + target.rect.height + 3
  return (
    <div
      className="pointer-events-none fixed z-[90]"
      style={{
        left: target.rect.left,
        top,
        width: target.rect.width,
        height: 3,
        background: 'var(--accent)',
        borderRadius: 2,
      }}
    />
  )
}
