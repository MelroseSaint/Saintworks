import { useProjectStore } from '../../store/projectStore'
import { useEditorStore, useUndoRedo } from '../../store/editorStore'
import { Icon } from '../icons'
import type { BreakpointId } from '../../model/types'

const VIEWPORTS: { id: BreakpointId; label: string; icon: string }[] = [
  { id: 'desktop', label: 'Desktop', icon: 'monitor' },
  { id: 'tablet', label: 'Tablet', icon: 'tablet' },
  { id: 'mobile', label: 'Mobile', icon: 'phone' },
]

export function Toolbar() {
  const project = useProjectStore((s) => s.project)
  const pages = project.pages
  const pageOrder = project.pageOrder
  const {
    activePageId, setActivePage, viewport, setViewport,
    setCommandPalette, setCodeView, setPublish, setBottomTab,
    codeViewOpen, setVersionOpen, setSearch, aiOpen, setAI,
    inspectionMode, setInspection, dirty, savedAt, saveNow,
  } = useEditorStore()
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  return (
    <div className="flex items-center h-10 px-3 border-b border-[var(--border)] bg-[var(--surface)] shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-3 mr-2 border-r border-[var(--border)]">
        <div className="w-5 h-5 rounded bg-[var(--accent)] flex items-center justify-center">
          <span className="text-[10px] font-bold text-white leading-none">S</span>
        </div>
        <span className="font-semibold text-[13px] tracking-tight text-[var(--text)]">SaintWorks</span>
      </div>

      {/* Page selector */}
      <select
        className="bg-transparent border-none text-[12px] py-1 px-1.5 rounded hover:bg-[var(--surface-raised)] cursor-pointer"
        value={activePageId ?? ''}
        onChange={(e) => setActivePage(e.target.value)}
      >
        {pageOrder.map((id) => (
          <option key={id} value={id}>{pages[id]?.name ?? '—'}</option>
        ))}
      </select>

      <div className="w-px h-4 bg-[var(--border)] mx-2" />

      {/* Viewport */}
      <div className="flex items-center gap-0.5">
        {VIEWPORTS.map((v) => (
          <button
            key={v.id}
            onClick={() => setViewport(v.id)}
            title={v.label}
            className={`p-1.5 rounded ${
              viewport === v.id
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <Icon name={v.icon} size={14} />
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-[var(--border)] mx-2" />

      {/* Undo/Redo */}
      <button onClick={() => undo()} disabled={!canUndo} title="Undo" className="p-1.5 rounded text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] disabled:opacity-30">
        <Icon name="undo" size={14} />
      </button>
      <button onClick={() => redo()} disabled={!canRedo} title="Redo" className="p-1.5 rounded text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] disabled:opacity-30">
        <Icon name="redo" size={14} />
      </button>

      <div className="w-px h-4 bg-[var(--border)] mx-2" />

      {/* Search + Code + Inspect */}
      <button onClick={() => setSearch(true)} title="Search" className="p-1.5 rounded text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]">
        <Icon name="search" size={14} />
      </button>
      <button onClick={() => setCodeView(!codeViewOpen)} title="Code" className={`p-1.5 rounded ${codeViewOpen ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}`}>
        <Icon name="code" size={14} />
      </button>
      <button onClick={() => setInspection(!inspectionMode)} title="Inspect elements" className={`p-1.5 rounded ${inspectionMode ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}`}>
        <Icon name="info" size={14} />
      </button>

      <div className="flex-1" />

      {/* Command palette trigger */}
      <button onClick={() => setCommandPalette(true)} className="flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] text-[11.5px] mr-2">
        <Icon name="search" size={12} />
        <span>⌘K</span>
      </button>

      {/* Actions */}
      <button onClick={() => setVersionOpen(true)} title="Versions" className="p-1.5 rounded text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]">
        <Icon name="git" size={14} />
      </button>
      <button onClick={() => setAI(!aiOpen)} title="AI Assistant" className={`p-1.5 rounded ${aiOpen ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}`}>
        <Icon name="sparkles" size={14} />
      </button>
      <button onClick={() => setBottomTab('preview')} title="Preview" className="p-1.5 rounded text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]">
        <Icon name="eye" size={14} />
      </button>

      {/* Save status */}
      {dirty ? (
        <button
          onClick={() => void saveNow()}
          title="Unsaved changes — save a version snapshot (⌘S)"
          className="flex items-center gap-1.5 px-2 py-1 ml-1 rounded text-[11.5px] text-[var(--warn)] hover:bg-[var(--warn-light)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)]" />
          Unsaved
        </button>
      ) : (
        <span
          title={savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : 'All changes saved'}
          className="flex items-center gap-1 px-2 py-1 ml-1 text-[11.5px] text-[var(--text-tertiary)]"
        >
          <Icon name="check" size={12} className="text-[var(--success)]" />
          Saved
        </span>
      )}

      <button onClick={() => setPublish(true)} className="flex items-center gap-1.5 px-3 py-1.5 ml-1 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[12px] font-medium">
        Publish
      </button>
    </div>
  )
}
