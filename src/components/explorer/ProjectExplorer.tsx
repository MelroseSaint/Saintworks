import { useMemo, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { Icon } from '../icons'
import { ContextMenu, usePrompt, type MenuItem } from '../ui'
import type { ID } from '../../model/types'

export function ProjectExplorer() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const {
    activePageId, setActivePage, setEditingComponent, editingComponentId,
    setBrandSection, setDataCollection, setSettingsOpen, setBottomTab,
    setLeftTab, log,
  } = useEditorStore()
  const { prompt, element } = usePrompt()
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['build', 'brand', 'data', 'pages'])
  )
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)

  const toggle = (key: string) => setExpanded((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })

  const openMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault(); e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, items })
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const c of Object.values(project.components)) set.add(c.category || 'Uncategorized')
    return [...set].sort()
  }, [project.components])

  const Section = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    const open = expanded.has(id)
    return (
      <div>
        <button
          onClick={() => toggle(id)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-[var(--surface-raised)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
        >
          <Icon name="chevronRight" size={10} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
          {label}
        </button>
        {open && <div className="pl-3 pb-1">{children}</div>}
      </div>
    )
  }

  const Item = ({ icon, label, active, onClick, onContext, muted }: {
    icon: string; label: string; active?: boolean; onClick?: () => void; onContext?: (e: React.MouseEvent) => void; muted?: boolean
  }) => (
    <div
      className={`flex items-center gap-2 px-2 py-[3px] rounded text-[12px] cursor-pointer ${
        active ? 'bg-[var(--accent-light)] text-[var(--accent)] font-medium' : muted ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
      }`}
      onClick={onClick} onContextMenu={onContext}
    >
      <Icon name={icon} size={12} className="shrink-0 opacity-60" />
      <span className="flex-1 truncate">{label}</span>
    </div>
  )

  const pageMenu = (id: ID): MenuItem[] => [
    { label: 'Duplicate', icon: 'duplicate', onClick: () => { store.duplicatePage(id); log('Duplicated page') } },
    { label: 'Rename', icon: 'type', onClick: () => { void (async () => { const n = await prompt('Rename page', project.pages[id]?.name); if (n) store.renamePage(id, n) })() } },
    { label: 'Delete', icon: 'trash', danger: true, onClick: () => store.deletePage(id) },
  ]

  const compMenu = (id: ID): MenuItem[] => [
    { label: 'Edit component', icon: 'component', onClick: () => { setEditingComponent(id); setLeftTab('layers') } },
    { label: 'Duplicate', icon: 'duplicate', onClick: () => store.duplicateComponent(id) },
    { label: 'Rename', icon: 'type', onClick: () => { void (async () => { const n = await prompt('Rename component', project.components[id]?.name); if (n) store.renameComponent(id, n) })() } },
    { label: 'Delete', icon: 'trash', danger: true, onClick: () => store.deleteComponent(id) },
  ]

  return (
    <div className="py-1 text-[12px]">
      {/* Build */}
      <Section id="build" label="Build">
        <Item icon="doc" label="Pages" onClick={() => toggle('pages')} active={false} />
        {expanded.has('pages') && project.pageOrder.map((id) => (
          <Item key={id} icon="doc" label={project.pages[id]?.name ?? '—'} active={activePageId === id && !editingComponentId}
            onClick={() => { setActivePage(id); log(`Opened page "${project.pages[id]?.name}"`) }}
            onContext={(e) => openMenu(e, pageMenu(id))} />
        ))}
        <Item icon="component" label="Components" onClick={() => toggle('components')} active={false} />
        {expanded.has('components') && categories.map((cat) => (
          <div key={cat} className="pl-3">
            <div className="text-[10px] font-medium text-[var(--text-tertiary)] py-1">{cat}</div>
            {Object.values(project.components).filter((c) => c.category === cat).map((c) => (
              <Item key={c.id} icon="box" label={c.name} active={editingComponentId === c.id}
                onClick={() => { setEditingComponent(c.id); log(`Editing "${c.name}"`) }}
                onContext={(e) => openMenu(e, compMenu(c.id))} />
            ))}
          </div>
        ))}
        <Item icon="layers" label="Layouts" onClick={() => toggle('layouts')} />
        {expanded.has('layouts') && Object.values(project.layouts).map((l) => (
          <Item key={l.id} icon="layers" label={l.name} />
        ))}
      </Section>

      {/* Brand */}
      <Section id="brand" label="Brand">
        <Item icon="palette" label="Identity" onClick={() => setBrandSection('brand')} />
        <Item icon="type" label="Colors & Typography" onClick={() => setBrandSection('tokens')} />
      </Section>

      {/* Data */}
      <Section id="data" label="Data">
        {Object.values(project.collections).map((c) => (
          <Item key={c.id} icon="database" label={c.name} onClick={() => setDataCollection(c.id)} />
        ))}
      </Section>

      {/* Project */}
      <Section id="project" label="Project">
        <Item icon="image" label="Assets" onClick={() => setBottomTab('assets')} />
        <Item icon="git" label="Versions" onClick={() => useEditorStore.getState().setVersionOpen(true)} />
        <Item icon="settings" label="Settings" onClick={() => setSettingsOpen(true)} />
      </Section>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {element}
    </div>
  )
}
