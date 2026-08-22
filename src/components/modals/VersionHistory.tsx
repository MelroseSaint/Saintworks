import { useEffect, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { listVersions, saveVersion, deleteVersion, type VersionRecord } from '../../store/db'
import { Modal, GhostButton, PrimaryButton, usePrompt } from '../ui'
import { Icon } from '../icons'

export function VersionHistory() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { setVersionOpen, log } = useEditorStore()
  const [versions, setVersions] = useState<VersionRecord[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [compareId, setCompareId] = useState<string | null>(null)
  const { prompt, element } = usePrompt()

  useEffect(() => {
    listVersions().then(setVersions)
  }, [])

  const save = async () => {
    const label = await prompt('Version label', `Version ${project.version}`)
    if (label === null) return
    await saveVersion(project, label)
    setVersions(await listVersions())
    log(`Saved version: ${label}`, 'success')
  }

  const restore = async (v: VersionRecord) => {
    const ok = await prompt(`Restore “${v.label}”? Type YES to confirm`, '')
    if (ok === 'YES') {
      store.restoreSnapshot(v.snapshot)
      log(`Restored version “${v.label}”`, 'success')
      setVersionOpen(false)
    }
  }

  const selectedVersion = versions.find((v) => v.id === selected)
  const compareVersion = versions.find((v) => v.id === compareId)

  return (
    <Modal title="Version history" onClose={() => setVersionOpen(false)} width={760}>
      <div className="flex gap-2 mb-3">
        <PrimaryButton onClick={save}>Save current version</PrimaryButton>
        <GhostButton onClick={() => { listVersions().then(setVersions) }}>Refresh</GhostButton>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">Versions</div>
          <div className="space-y-1">
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={`w-full text-left px-2.5 py-2 rounded-md border text-[12.5px] ${selected === v.id ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] hover:bg-[var(--surface-raised)]'}`}
              >
                <div className="font-semibold">{v.label}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  {new Date(v.createdAt).toLocaleString()} · {Object.keys(v.snapshot.pages).length} pages
                </div>
              </button>
            ))}
            {versions.length === 0 && <div className="text-[12px] text-[var(--text-tertiary)] py-3">No saved versions yet.</div>}
          </div>
        </div>
        <div>
          {selectedVersion ? (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">{selectedVersion.label}</div>
              <div className="space-y-1 text-[12px]">
                <SummaryRow label="Pages" value={Object.keys(selectedVersion.snapshot.pages).length} />
                <SummaryRow label="Components" value={Object.keys(selectedVersion.snapshot.components).length} />
                <SummaryRow label="Collections" value={Object.keys(selectedVersion.snapshot.collections).length} />
                <SummaryRow label="Color tokens" value={Object.keys(selectedVersion.snapshot.tokens.colors).length} />
              </div>
              <div className="flex gap-2 mt-3">
                <PrimaryButton onClick={() => restore(selectedVersion)}>Restore this version</PrimaryButton>
                <GhostButton onClick={() => setCompareId(selectedVersion.id)}>Compare</GhostButton>
                <button onClick={async () => { await deleteVersion(selectedVersion.id); setVersions(await listVersions()); setSelected(null) }} className="px-2 py-1.5 rounded-md text-[var(--error)] hover:bg-[var(--error)]/10 text-[12px]">
                  <Icon name="trash" size={13} />
                </button>
              </div>
              {compareId && compareVersion && (
                <div className="mt-3 border-t border-[var(--border)] pt-2 text-[12px]">
                  <div className="font-semibold mb-1">Comparing with “{compareVersion.label}”</div>
                  <DiffSummary a={selectedVersion} b={compareVersion} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-[12px] text-[var(--text-tertiary)] pt-4">Select a version to view, restore or compare.</div>
          )}
        </div>
      </div>
      {element}
    </Modal>
  )
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between bg-[var(--surface-raised)] rounded px-2 py-1">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function DiffSummary({ a, b }: { a: VersionRecord; b: VersionRecord }) {
  const rows: { label: string; a: number; b: number }[] = [
    { label: 'Pages', a: Object.keys(a.snapshot.pages).length, b: Object.keys(b.snapshot.pages).length },
    { label: 'Components', a: Object.keys(a.snapshot.components).length, b: Object.keys(b.snapshot.components).length },
    { label: 'Collections', a: Object.keys(a.snapshot.collections).length, b: Object.keys(b.snapshot.collections).length },
    { label: 'Color tokens', a: Object.keys(a.snapshot.tokens.colors).length, b: Object.keys(b.snapshot.tokens.colors).length },
  ]
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-[12px]">
          <span className="text-[var(--text-secondary)]">{r.label}</span>
          <span>
            <span className={r.a !== r.b ? 'text-[var(--accent-hover)] font-semibold' : ''}>{r.a}</span>
            {' → '}
            <span className={r.a !== r.b ? 'text-[var(--accent-hover)] font-semibold' : ''}>{r.b}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
