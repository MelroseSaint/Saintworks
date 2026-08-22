import { useEffect, useRef } from 'react'
import { useProjectStore } from './store/projectStore'
import { useEditorStore } from './store/editorStore'
import { useShortcuts } from './hooks/useShortcuts'
import { Toolbar } from './components/shell/Toolbar'
import { LeftSidebar } from './components/shell/LeftSidebar'
import { RightSidebar } from './components/shell/RightSidebar'
import { BottomPanel } from './components/panels/BottomPanel'
import { Canvas } from './components/canvas/Canvas'
import { CodeView } from './components/code/CodeView'
import { CommandPalette } from './components/command/CommandPalette'
import { SearchModal } from './components/command/SearchModal'
import { VersionHistory } from './components/modals/VersionHistory'
import { PublishModal } from './components/modals/PublishModal'
import { AIPanel } from './components/ai/AIPanel'
import { Preview } from './components/preview/Preview'
import { saveVersion } from './store/db'

export default function App() {
  useShortcuts()
  const project = useProjectStore((s) => s.project)
  const {
    activePageId,
    setActivePage,
    commandPaletteOpen,
    searchOpen,
    versionOpen,
    publishOpen,
    aiOpen,
    codeViewOpen,
    previewMode,
    markDirty,
    markSaved,
  } = useEditorStore()

  // Initialize the active page on first load
  useEffect(() => {
    const p = useProjectStore.getState().project
    const editor = useEditorStore.getState()
    if (!editor.activePageId || !p.pages[editor.activePageId]) {
      const home =
        p.settings.homepageId && p.pages[p.settings.homepageId]
          ? p.settings.homepageId
          : p.pageOrder[0]
      if (home) editor.setActivePage(home)
    }
  }, [project.id])

  // Autosave: localStorage persistence is handled by the store's persist
  // middleware. Here we mark the document dirty on every change and snapshot
  // a version to IndexedDB after a short idle window.
  const firstRenderRef = useRef(true)
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    markDirty()
    const t = setTimeout(() => {
      saveVersion(project, `Auto-save — ${new Date().toLocaleTimeString()}`)
        .then(() => markSaved())
        .catch(() => {})
    }, 8000)
    return () => clearTimeout(t)
  }, [project])

  if (previewMode) return <Preview />

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)]">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        <LeftSidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          {codeViewOpen ? <CodeView /> : <Canvas />}
        </main>
        <RightSidebar />
      </div>
      <BottomPanel />
      {commandPaletteOpen && <CommandPalette />}
      {searchOpen && <SearchModal />}
      {versionOpen && <VersionHistory />}
      {publishOpen && <PublishModal />}
      {aiOpen && <AIPanel />}
    </div>
  )
}
