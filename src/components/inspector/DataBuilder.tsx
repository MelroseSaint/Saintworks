import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { Icon } from '../icons'
import { Field, PrimaryButton } from '../ui'
import { flattenNodes, updateNode } from '../../model/tree'
import type { FieldType } from '../../model/types'

const FIELD_TYPES: FieldType[] = ['text', 'longtext', 'image', 'number', 'boolean', 'select']

export function DataBuilder() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { dataCollectionId, cmsOpen, setDataCollection, setCms, activePageId, setActivePage } =
    useEditorStore()
  const [newFieldName, setNewFieldName] = useState('')

  if (cmsOpen) {
    return <CmsPanel />
  }

  const coll = dataCollectionId ? project.collections[dataCollectionId] : null
  if (!coll) {
    return (
      <div className="p-3 space-y-2">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Data</div>
        {Object.values(project.collections).map((c) => (
          <button key={c.id} onClick={() => setDataCollection(c.id)} className="w-full text-left px-2.5 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--surface-raised)] flex items-center gap-2 text-[12.5px]">
            <Icon name="database" size={13} />
            <span className="flex-1">{c.name}</span>
            <span className="text-[var(--text-tertiary)] text-[11px]">{c.records.length} records</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          <Icon name="database" size={14} />
          {coll.name}
        </div>
        <button onClick={() => setDataCollection(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text)]">
          <Icon name="x" size={14} />
        </button>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Fields</div>
        {coll.fields.map((f) => (
          <div key={f.key} className="flex items-center gap-2 py-1 text-[12px] group">
            <Icon name="type" size={12} className="text-[var(--text-tertiary)]" />
            <span className="flex-1">{f.label}</span>
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase">{f.type}</span>
            <button onClick={() => store.removeField(coll.id, f.key)} className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--error)]">
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))}
        <div className="flex gap-1.5 mt-1.5">
          <input placeholder="Field name" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} className="flex-1 text-[12px]" />
          <PrimaryButton
            onClick={() => {
              const label = newFieldName.trim()
              if (!label) return
              const key = label.replace(/\s+/g, ' ')
              store.addField(coll.id, { key, label, type: 'text' })
              setNewFieldName('')
            }}
          >
            Add
          </PrimaryButton>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Records ({coll.records.length})</span>
          <button onClick={() => store.addRecord(coll.id)} className="flex items-center gap-1 text-[11.5px] text-[var(--accent-hover)] hover:text-white">
            <Icon name="plus" size={12} />
            Add record
          </button>
        </div>
        <div className="space-y-2">
          {coll.records.map((rec, i) => (
            <div key={rec.id} className="border border-[var(--border)] rounded-md p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold text-[var(--text-tertiary)] uppercase">Record {i + 1}</span>
                <button onClick={() => store.removeRecord(coll.id, rec.id)} className="text-[var(--text-tertiary)] hover:text-[var(--error)]">
                  <Icon name="trash" size={12} />
                </button>
              </div>
              {coll.fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-[10px] text-[var(--text-tertiary)]">{f.label}</span>
                  {f.type === 'longtext' ? (
                    <textarea
                      rows={2}
                      value={String(rec.values[f.key] ?? '')}
                      onChange={(e) => store.updateRecord(coll.id, rec.id, { [f.key]: e.target.value })}
                    />
                  ) : f.type === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={Boolean(rec.values[f.key])}
                      onChange={(e) => store.updateRecord(coll.id, rec.id, { [f.key]: e.target.checked })}
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(rec.values[f.key] ?? '')}
                      onChange={(e) => store.updateRecord(coll.id, rec.id, { [f.key]: e.target.value })}
                    />
                  )}
                </label>
              ))}
            </div>
          ))}
          {coll.records.length === 0 && (
            <div className="text-[11.5px] text-[var(--text-tertiary)] text-center py-3">No records yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Visual CMS — content editing separated from design
// ---------------------------------------------------------------------------
function CmsPanel() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { activePageId, setActivePage, setCms, setDataCollection } = useEditorStore()

  const page = activePageId ? project.pages[activePageId] : null

  const textNodes = page ? flattenNodes(page.nodes).filter((n) => n.type === 'text' || n.type === 'heading') : []

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        <Icon name="doc" size={14} />
        Content
      </div>
      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
        Edit content without touching layout. Design stays intact.
      </p>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Pages</div>
        <select value={activePageId ?? ''} onChange={(e) => setActivePage(e.target.value)} className="w-full">
          {project.pageOrder.map((id) => (
            <option key={id} value={id}>
              {project.pages[id]?.name}
            </option>
          ))}
        </select>
      </div>

      {page && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Page text</div>
          {textNodes.map((n) => (
            <label key={n.id} className="block">
              <span className="text-[10px] text-[var(--text-tertiary)]">{n.name}</span>
              <textarea
                rows={2}
                value={n.content.text ?? ''}
                onChange={(e) => {
                  for (const pid of Object.keys(project.pages)) {
                    if (project.pages[pid].id === page.id) {
                      store.setPageNodes(pid, updateTextNode(page.nodes, n.id, e.target.value))
                    }
                  }
                }}
              />
            </label>
          ))}
          {textNodes.length === 0 && (
            <div className="text-[11.5px] text-[var(--text-tertiary)]">This page has no text content.</div>
          )}
        </div>
      )}

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Collections</div>
        {Object.values(project.collections).map((c) => (
          <button key={c.id} onClick={() => { setCms(false); setDataCollection(c.id) }} className="w-full text-left px-2.5 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--surface-raised)] flex items-center gap-2 text-[12.5px] mb-1">
            <Icon name="database" size={13} />
            <span className="flex-1">{c.name}</span>
            <span className="text-[var(--text-tertiary)] text-[11px]">{c.records.length}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function updateTextNode(nodes: Parameters<typeof updateNode>[0], id: string, text: string) {
  return updateNode(nodes, id, (n) => ({ ...n, content: { ...n.content, text } }))
}
