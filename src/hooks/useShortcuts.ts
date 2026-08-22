import { useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useUndoRedo } from '../store/editorStore'

function isTyping(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  if (el.isContentEditable) return true
  const tag = el.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

export function useShortcuts() {
  const {
    setCommandPalette,
    setSearch,
    setCodeView,
    setBottomTab,
    selectedOrigin,
    select,
    viewport,
    setViewport,
    editingComponentId,
    saveNow,
  } = useEditorStore()
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPalette(true)
        return
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveNow()
        return
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setCommandPalette(true)
        return
      }
      if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setSearch(true)
        return
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd' && selectedOrigin && !isTyping(e.target)) {
        e.preventDefault()
        // handled by canvas layer via duplicateNodeAt; no-op here
        return
      }
      if (e.key === 'Escape') {
        setCommandPalette(false)
        setSearch(false)
        select(null)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedOrigin && !isTyping(e.target)) {
        e.preventDefault()
        // canvas layer handles deletion; no-op here
        return
      }
      // Viewport shortcuts
      if (mod && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault()
          setViewport('desktop')
        } else if (e.key === '2') {
          e.preventDefault()
          setViewport('tablet')
        } else if (e.key === '3') {
          e.preventDefault()
          setViewport('mobile')
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault()
          setCodeView(true)
        } else if (e.key.toLowerCase() === '\\') {
          e.preventDefault()
          setBottomTab('preview')
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    setCommandPalette,
    setSearch,
    setCodeView,
    setBottomTab,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedOrigin,
    select,
    viewport,
    setViewport,
    editingComponentId,
    saveNow,
  ])
}
