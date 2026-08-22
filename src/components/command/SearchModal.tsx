import { useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { Icon } from '../icons'
import { flattenNodes } from '../../model/tree'

interface Result {
  group: string
  icon: string
  label: string
  detail?: string
  run: () => void
}

export function SearchModal() {
  const project = useProjectStore((s) => s.project)
  const { setSearch, setActivePage, select, setEditingComponent, setBrandSection, setDataCollection, setBottomTab } =
    useEditorStore()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: Result[] = []
    for (const page of Object.values(project.pages)) {
      if (page.name.toLowerCase().includes(q) || page.route.toLowerCase().includes(q)) {
        out.push({ group: 'Pages', icon: 'doc', label: page.name, detail: page.route, run: () => { setActivePage(page.id); setSearch(false) } })
      }
      for (const n of flattenNodes(page.nodes)) {
        if ((n.content.text ?? '').toLowerCase().includes(q)) {
          out.push({ group: 'Content', icon: 'type', label: n.name, detail: `${page.name} → “${(n.content.text ?? '').slice(0, 40)}”`, run: () => { setActivePage(page.id); select({ kind: 'page', nodeId: n.id }); setSearch(false) } })
        }
      }
    }
    for (const comp of Object.values(project.components)) {
      if (comp.name.toLowerCase().includes(q) || comp.category.toLowerCase().includes(q)) {
        out.push({ group: 'Components', icon: 'component', label: comp.name, detail: comp.category, run: () => { setEditingComponent(comp.id); setSearch(false) } })
      }
    }
    for (const asset of Object.values(project.assets)) {
      if (asset.name.toLowerCase().includes(q)) {
        out.push({ group: 'Assets', icon: 'image', label: asset.name, detail: asset.folder, run: () => { setBottomTab('assets'); setSearch(false) } })
      }
    }
    for (const [key, value] of Object.entries(project.tokens.colors)) {
      if (key.toLowerCase().includes(q)) {
        out.push({ group: 'Tokens', icon: 'grid', label: key, detail: value, run: () => { setBrandSection('tokens'); setSearch(false) } })
      }
    }
    for (const coll of Object.values(project.collections)) {
      if (coll.name.toLowerCase().includes(q)) {
        out.push({ group: 'Collections', icon: 'database', label: coll.name, detail: `${coll.records.length} records`, run: () => { setDataCollection(coll.id); setSearch(false) } })
      }
    }
    return out.slice(0, 50)
  }, [query, project, setActivePage, select, setEditingComponent, setBrandSection, setDataCollection, setBottomTab, setSearch])

  useEffect(() => setIndex(0), [query])

  return (
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-start justify-center pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) setSearch(false) }}>
      <div className="w-[560px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-[var(--border)]">
          <Icon name="search" size={15} className="text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)) }
              if (e.key === 'Enter' && results[index]) { e.preventDefault(); results[index].run() }
              if (e.key === 'Escape') setSearch(false)
            }}
            placeholder="Search pages, components, assets, content, tokens, collections…"
            className="flex-1 bg-transparent border-none outline-none py-3 text-[13.5px]"
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto py-1">
          {results.map((r, i) => (
            <button key={`${r.group}-${r.label}-${i}`} onMouseEnter={() => setIndex(i)} onClick={r.run} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${i === index ? 'bg-[var(--accent)] text-white' : ''}`}>
              <Icon name={r.icon} size={13} className={i === index ? '' : 'text-[var(--text-secondary)]'} />
              <span className="text-[13px]">{r.label}</span>
              {r.detail && <span className={`text-[11px] ml-auto ${i === index ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>{r.detail}</span>}
              <span className={`text-[9.5px] uppercase ${i === index ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>{r.group}</span>
            </button>
          ))}
          {query && results.length === 0 && <div className="px-3 py-4 text-[var(--text-tertiary)] text-[12.5px]">No results for “{query}”.</div>}
          {!query && <div className="px-3 py-4 text-[var(--text-tertiary)] text-[12.5px]">Type to search across the whole project.</div>}
        </div>
      </div>
    </div>
  )
}
