import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { SECTION_TEMPLATES, type SectionTemplate } from '../../model/sections'
import { Icon } from '../icons'

export function SectionLibrary() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { activePageId, editingComponentId, select, log, recordChange } = useEditorStore()
  const [open, setOpen] = useState(false)

  const add = (t: SectionTemplate) => {
    const section = t.build()
    if (editingComponentId) {
      const comp = project.components[editingComponentId]
      if (comp) {
        store.updateComponentNode(comp.id, comp.rootNode.id, (n) => {
          n.children.push(section)
        })
        select({ kind: 'component-master', componentId: comp.id, nodeId: section.id })
      }
    } else if (activePageId) {
      store.addNodeToPage(activePageId, section)
      select({ kind: 'page', nodeId: section.id })
    }
    recordChange(`Added ${t.name} section`, 'layout')
    log(`Added ${t.name} section`)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border)] text-[11.5px] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]"
      >
        <Icon name="plus" size={12} />
        Add section
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-[90] w-[560px] max-h-[420px] overflow-y-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl p-2">
            <div className="px-1.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Sections — uses your brand tokens
            </div>
            <div className="grid grid-cols-3 gap-1">
              {SECTION_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => add(t)}
                  className="flex flex-col items-start gap-1.5 p-2.5 rounded-md text-left hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--border)]"
                >
                  <Icon name={t.icon} size={16} className="text-[var(--accent-hover)]" />
                  <span className="text-[12px] font-medium leading-none">{t.name}</span>
                  <span className="text-[10.5px] text-[var(--text-tertiary)] leading-tight">{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
