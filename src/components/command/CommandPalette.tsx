import { useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore, useUndoRedo } from '../../store/editorStore'
import { Icon } from '../icons'
import { usePrompt } from '../ui'
import { uid } from '../../model/factories'

interface Command {
  id: string
  label: string
  icon: string
  hint?: string
  run: () => void
}

export function CommandPalette() {
  const store = useProjectStore()
  const {
    setCommandPalette,
    setActivePage,
    setBrandSection,
    setBottomTab,
    setDataCollection,
    setSettingsOpen,
    setPublish,
    setPreview,
    setCodeView,
    setAI,
    setEditingComponent,
  } = useEditorStore()
  const { undo, redo } = useUndoRedo()
  const { prompt, element } = usePrompt()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      {
        id: 'new-page',
        label: 'New Page',
        icon: 'doc',
        run: async () => {
          const n = await prompt('New page', 'New Page')
          if (n) {
            const id = store.addPage(n, `/${n.toLowerCase().replace(/\s+/g, '-')}`)
            setActivePage(id)
          }
          setCommandPalette(false)
        },
      },
      {
        id: 'new-component',
        label: 'New Component',
        icon: 'component',
        run: async () => {
          const n = await prompt('New component', 'My Component')
          if (n) {
            store.addComponent(n, 'Custom')
            const comps = Object.values(useProjectStore.getState().project.components)
            setEditingComponent(comps[comps.length - 1]?.id ?? null)
          }
          setCommandPalette(false)
        },
      },
      { id: 'open-brand', label: 'Open Brand', icon: 'palette', run: () => { setBrandSection('brand'); setCommandPalette(false) } },
      { id: 'open-tokens', label: 'Open Design Tokens', icon: 'grid', run: () => { setBrandSection('tokens'); setCommandPalette(false) } },
      { id: 'open-assets', label: 'Open Assets', icon: 'image', run: () => { setBottomTab('assets'); setCommandPalette(false) } },
      { id: 'open-data', label: 'Open Data Builder', icon: 'database', run: () => { setDataCollection(Object.values(useProjectStore.getState().project.collections)[0]?.id ?? null); setCommandPalette(false) } },
      { id: 'preview', label: 'Preview Site', icon: 'play', run: () => { setPreview(true); setCommandPalette(false) } },
      { id: 'publish', label: 'Publish', icon: 'rocket', run: () => { setPublish(true); setCommandPalette(false) } },
      { id: 'undo', label: 'Undo', icon: 'undo', hint: '⌘Z', run: () => { undo(); setCommandPalette(false) } },
      { id: 'redo', label: 'Redo', icon: 'redo', hint: '⌘⇧Z', run: () => { redo(); setCommandPalette(false) } },
      { id: 'code', label: 'Toggle Code View', icon: 'code', run: () => { setCodeView(true); setCommandPalette(false) } },
      { id: 'ai', label: 'Open AI Assistant', icon: 'sparkles', run: () => { setAI(true); setCommandPalette(false) } },
      { id: 'settings', label: 'Open Settings', icon: 'settings', run: () => { setSettingsOpen(true); setCommandPalette(false) } },
    ]

    // Pages as search targets
    for (const page of Object.values(useProjectStore.getState().project.pages)) {
      cmds.push({ id: `page-${page.id}`, label: `Page: ${page.name}`, icon: 'doc', run: () => { setActivePage(page.id); setCommandPalette(false) } })
    }
    for (const comp of Object.values(useProjectStore.getState().project.components)) {
      cmds.push({ id: `comp-${comp.id}`, label: `Component: ${comp.name}`, icon: 'component', run: () => { setEditingComponent(comp.id); setCommandPalette(false) } })
    }
    return cmds
  }, [store, prompt, setCommandPalette, setActivePage, setBrandSection, setBottomTab, setDataCollection, setPublish, setPreview, setCodeView, setAI, setSettingsOpen, setEditingComponent, undo, redo])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => setIndex(0), [query])

  const run = (c: Command) => c.run()

  return (
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-start justify-center pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) setCommandPalette(false) }}>
      <div className="w-[560px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-[var(--border)]">
          <Icon name="search" size={15} className="text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, filtered.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)) }
              if (e.key === 'Enter' && filtered[index]) { e.preventDefault(); run(filtered[index]) }
              if (e.key === 'Escape') setCommandPalette(false)
            }}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent border-none outline-none py-3 text-[13.5px]"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(c)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] ${i === index ? 'bg-[var(--accent)] text-white' : 'text-[var(--text)]'}`}
            >
              <Icon name={c.icon} size={14} className={i === index ? '' : 'text-[var(--text-secondary)]'} />
              <span className="flex-1">{c.label}</span>
              {c.hint && <span className={`text-[10.5px] ${i === index ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>{c.hint}</span>}
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-4 text-[var(--text-tertiary)] text-[12.5px]">No results for “{query}”.</div>}
        </div>
      </div>
      {element}
    </div>
  )
}
