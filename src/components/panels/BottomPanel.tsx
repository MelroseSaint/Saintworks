import { useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore, type BottomTab } from '../../store/editorStore'
import { Icon } from '../icons'
import { usePrompt } from '../ui'
import { lintProject } from '../../engine/lint'
import { runBuild, type BuildResult } from '../../engine/build'
import { storeAssetBlob, deleteAssetBlob } from '../../store/db'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { TimelineEditor } from './TimelineEditor'
import { uid } from '../../model/factories'
import type { AssetKind, Problem } from '../../model/types'

const TABS: { id: BottomTab; label: string; icon: string }[] = [
  { id: 'console', label: 'Console', icon: 'code' },
  { id: 'problems', label: 'Problems', icon: 'warning' },
  { id: 'changes', label: 'Changes', icon: 'git' },
  { id: 'assets', label: 'Assets', icon: 'image' },
  { id: 'build', label: 'Build', icon: 'box' },
  { id: 'timeline', label: 'Timeline', icon: 'motion' },
  { id: 'preview', label: 'Preview', icon: 'monitor' },
]

export function BottomPanel() {
  const { bottomTab, setBottomTab } = useEditorStore()

  return (
    <div className="h-[200px] shrink-0 border-t border-[var(--border)] bg-[var(--surface)] flex flex-col">
      <div className="flex items-center border-b border-[var(--border-subtle)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setBottomTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide ${
              bottomTab === t.id
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Icon name={t.icon} size={12} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {bottomTab === 'console' && <ConsolePanel />}
        {bottomTab === 'problems' && <ProblemsPanel />}
        {bottomTab === 'changes' && <ChangesPanel />}
        {bottomTab === 'assets' && <AssetsPanel />}
        {bottomTab === 'build' && <BuildPanel />}
        {bottomTab === 'timeline' && <TimelinePanel />}
        {bottomTab === 'preview' && <PreviewPanel />}
      </div>
    </div>
  )
}

function ConsolePanel() {
  const { console: entries, clearConsole } = useEditorStore()
  return (
    <div className="font-mono text-[11.5px] p-2 space-y-0.5">
      <div className="flex justify-end mb-1">
        <button onClick={clearConsole} className="text-[var(--text-tertiary)] hover:text-[var(--text)] text-[10.5px]">
          Clear
        </button>
      </div>
      {entries.map((e) => (
        <div key={e.id} className="flex gap-2 items-baseline">
          <span className="text-[var(--text-tertiary)] shrink-0">{new Date(e.time).toLocaleTimeString()}</span>
          <span
            className={
              e.level === 'error'
                ? 'text-[var(--error)]'
                : e.level === 'warn'
                  ? 'text-[var(--warn)]'
                  : e.level === 'success'
                    ? 'text-[var(--success)]'
                    : 'text-[var(--text-secondary)]'
            }
          >
            {e.message}
          </span>
        </div>
      ))}
    </div>
  )
}

function ProblemsPanel() {
  const project = useProjectStore((s) => s.project)
  const { setActivePage, select, setEditingComponent, activePageId, log } = useEditorStore()
  const problems = useMemo(() => lintProject(project), [project])

  const go = (p: Problem) => {
    if (p.pageId) {
      setActivePage(p.pageId)
      if (p.nodeId) select({ kind: 'page', nodeId: p.nodeId })
    }
    log(`Jumped to problem: ${p.message}`, 'warn')
  }

  const sevColor = (s: Problem['severity']) =>
    s === 'error' ? 'var(--error)' : s === 'warning' ? 'var(--warn)' : 'var(--accent-hover)'

  return (
    <div className="p-2 text-[12px]">
      <div className="flex items-center gap-2 mb-1.5 text-[var(--text-secondary)]">
        <span>{problems.length} issue{problems.length === 1 ? '' : 's'}</span>
        <span className="text-[var(--error)]">{problems.filter((p) => p.severity === 'error').length} errors</span>
        <span className="text-[var(--warn)]">{problems.filter((p) => p.severity === 'warning').length} warnings</span>
      </div>
      {problems.length === 0 && <div className="text-[var(--success)] flex items-center gap-1.5"><Icon name="check" size={13} /> No issues found.</div>}
      {problems.map((p) => (
        <button key={p.id} onClick={() => go(p)} className="w-full text-left flex items-start gap-2 py-1 hover:bg-[var(--surface-raised)] rounded px-1">
          <span style={{ color: sevColor(p.severity) }} className="mt-0.5">
            <Icon name={p.severity === 'error' ? 'error' : p.severity === 'warning' ? 'warning' : 'info'} size={13} />
          </span>
          <span className="flex-1">{p.message}</span>
          {p.fixHint && <span className="text-[var(--text-tertiary)] text-[11px]">{p.fixHint}</span>}
        </button>
      ))}
    </div>
  )
}

function ChangesPanel() {
  const { changes } = useEditorStore()
  return (
    <div className="p-2 text-[12px]">
      {changes.length === 0 && <div className="text-[var(--text-tertiary)]">No changes yet. Edit the project and changes appear here.</div>}
      {changes.map((c) => (
        <div key={c.id} className="flex gap-2 items-baseline py-0.5">
          <span className="text-[var(--text-tertiary)] text-[11px] shrink-0">{new Date(c.time).toLocaleTimeString()}</span>
          <span className="text-[10px] uppercase text-[var(--accent-hover)] shrink-0 w-16">{c.kind}</span>
          <span>{c.summary}</span>
        </div>
      ))}
    </div>
  )
}

function kindFromMime(mime: string): AssetKind {
  if (mime.startsWith('image/')) return mime.includes('svg') ? 'icon' : 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('font')) return 'font'
  return 'document'
}

function AssetsPanel() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { log } = useEditorStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState('')
  const { prompt, element } = usePrompt()

  const upload = async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const id = uid()
      const asset = {
        id,
        name: file.name,
        kind: kindFromMime(file.type),
        folder: 'Images',
        mime: file.type || 'application/octet-stream',
        size: file.size,
      }
      await storeAssetBlob(id, file)
      store.addAsset(asset)
      log(`Uploaded ${file.name}`, 'success')
    }
  }

  const filtered = Object.values(project.assets).filter((a) =>
    a.name.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Icon name="search" size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter assets…" className="w-full pl-7 text-[12px]" />
        </div>
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent)] text-white text-[11.5px] font-semibold hover:bg-[var(--accent-hover)]">
          <Icon name="upload" size={13} />
          Upload
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>
      <div className="grid grid-cols-6 gap-2">
        {filtered.map((a) => (
          <AssetTile key={a.id} assetId={a.id} name={a.name} kind={a.kind} onRename={async () => { const n = await prompt('Rename asset', a.name); if (n) store.renameAsset(a.id, n) }} onDelete={() => { store.removeAsset(a.id); void deleteAssetBlob(a.id) }} />
        ))}
      </div>
      {filtered.length === 0 && <div className="text-[var(--text-tertiary)] text-[12px] text-center py-4">Drag & drop or upload assets here.</div>}
      {element}
    </div>
  )
}

function AssetTile({ assetId, name, kind, onRename, onDelete }: { assetId: string; name: string; kind: AssetKind; onRename: () => void; onDelete: () => void }) {
  const url = useAssetUrl(kind === 'image' || kind === 'icon' || kind === 'logo' ? assetId : undefined)
  return (
    <div className="group border border-[var(--border)] rounded-md overflow-hidden bg-[var(--surface-raised)]">
      <div className="h-16 bg-[var(--bg)] flex items-center justify-center overflow-hidden">
        {url ? (
          <img src={url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Icon name={kind === 'image' || kind === 'logo' ? 'image' : kind === 'video' ? 'play' : kind === 'font' ? 'type' : 'doc'} size={20} className="text-[var(--text-tertiary)]" />
        )}
      </div>
      <div className="px-1.5 py-1 flex items-center justify-between">
        <span className="text-[10.5px] truncate flex-1" title={name}>{name}</span>
        <div className="hidden group-hover:flex">
          <button onClick={onRename} className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text)]"><Icon name="type" size={11} /></button>
          <button onClick={onDelete} className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--error)]"><Icon name="trash" size={11} /></button>
        </div>
      </div>
    </div>
  )
}

function BuildPanel() {
  const project = useProjectStore((s) => s.project)
  const [result, setResult] = useState<BuildResult | null>(null)
  const { log } = useEditorStore()

  const build = () => {
    const r = runBuild(project)
    setResult(r)
    log(r.message, r.status === 'error' ? 'error' : r.status === 'warning' ? 'warn' : 'success')
  }

  useEffect(() => {
    if (!result) build()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name="box" size={14} className="text-[var(--accent-hover)]" />
          <span className="text-[13px] font-semibold">Build</span>
        </div>
        <button onClick={build} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border)] text-[11.5px] hover:bg-[var(--surface-raised)]">
          <Icon name="refresh" size={12} />
          Run build
        </button>
      </div>
      {result && (
        <div className="space-y-2">
          <div className={`px-3 py-2 rounded-md font-semibold text-[12.5px] ${
            result.status === 'success' ? 'bg-[var(--success)]/15 text-[var(--success)]' : result.status === 'warning' ? 'bg-[var(--warn)]/15 text-[var(--warn)]' : 'bg-[var(--error)]/15 text-[var(--error)]'
          }`}>
            {result.message}
          </div>
          <div className="grid grid-cols-4 gap-2 text-[11.5px]">
            <Stat label="Errors" value={result.errors} />
            <Stat label="Warnings" value={result.warnings} />
            <Stat label="Time" value={`${result.durationMs}ms`} />
            <Stat label="Files" value={result.files} />
          </div>
          {result.problems.filter((p) => p.severity === 'warning').slice(0, 5).map((p) => (
            <div key={p.id} className="text-[11.5px] text-[var(--warn)] flex items-center gap-1.5">
              <Icon name="warning" size={12} />
              {p.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[var(--surface-raised)] rounded-md px-2.5 py-1.5">
      <div className="text-[10px] uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className="text-[15px] font-semibold">{value}</div>
    </div>
  )
}

function TimelinePanel() {
  return <TimelineEditor />
}

function PreviewPanel() {
  const { setPreview, previewMode, viewport, setViewport } = useEditorStore()
  const project = useProjectStore((s) => s.project)
  const page = Object.values(project.pages)[0]

  return (
    <div className="p-3 flex items-center gap-3">
      <Icon name="monitor" size={16} className="text-[var(--accent-hover)]" />
      <div className="flex-1">
        <div className="text-[13px] font-semibold">Live preview</div>
        <div className="text-[11.5px] text-[var(--text-secondary)]">
          Renders the real site with no editor controls. {page ? `Start at “${page.name}”.` : ''}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {(['desktop', 'tablet', 'mobile'] as const).map((v) => (
          <button key={v} onClick={() => setViewport(v)} className={`px-2 py-1 rounded-md text-[11.5px] ${viewport === v ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}`}>
            {v}
          </button>
        ))}
      </div>
      <button onClick={() => setPreview(!previewMode)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)] text-white text-[12px] font-semibold hover:bg-[var(--accent-hover)]">
        <Icon name="play" size={13} />
        {previewMode ? 'Exit preview' : 'Open preview'}
      </button>
    </div>
  )
}
