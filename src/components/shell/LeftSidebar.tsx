import { useEditorStore } from '../../store/editorStore'
import { Icon } from '../icons'
import { ProjectExplorer } from '../explorer/ProjectExplorer'
import { LayersPanel } from '../explorer/LayersPanel'

export function LeftSidebar() {
  const { leftTab, setLeftTab } = useEditorStore()
  return (
    <aside className="w-[232px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
      <div className="flex border-b border-[var(--border-subtle)]">
        {([
          { id: 'explorer' as const, label: 'Explorer' },
          { id: 'layers' as const, label: 'Layers' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setLeftTab(t.id)}
            className={`flex-1 py-2 text-[11px] font-medium tracking-wide uppercase ${
              leftTab === t.id
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {leftTab === 'explorer' ? <ProjectExplorer /> : <LayersPanel />}
      </div>
    </aside>
  )
}
