import { useMemo, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { runBuild, exportProjectZip, validateForPublish, publishProject } from '../../engine/build'
import type { GeneratedFile } from '../../engine/codegen'
import type { DeploymentRecord } from '../../store/db'
import { Modal, PrimaryButton, GhostButton } from '../ui'
import { Icon } from '../icons'
import { saveAs } from 'file-saver'

const CHECKS: { id: string; label: string }[] = [
  { id: 'links', label: 'Broken links' },
  { id: 'assets', label: 'Missing assets' },
  { id: 'a11y', label: 'Accessibility' },
  { id: 'responsive', label: 'Responsive issues' },
  { id: 'seo', label: 'SEO metadata' },
  { id: 'content', label: 'Required content' },
  { id: 'brand', label: 'Brand consistency' },
]

export function PublishModal() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { setPublish, setPreview, log } = useEditorStore()
  const [step, setStep] = useState<'validate' | 'build' | 'preview' | 'done'>('validate')
  const [exporting, setExporting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [deployment, setDeployment] = useState<DeploymentRecord | null>(null)
  const [files, setFiles] = useState<GeneratedFile[] | null>(null)

  const check = useMemo(() => validateForPublish(project), [project])
  const build = useMemo(() => runBuild(project), [project])

  const publish = async () => {
    setPublishing(true)
    setPublishError(null)
    const result = await publishProject(project)
    setPublishing(false)

    if ('error' in result) {
      setPublishError(result.error)
      return
    }

    store.setPublishedAt(result.deployment.publishedAt)
    setDeployment(result.deployment)
    setFiles(result.files)
    log(`Site published — ${result.deployment.fileCount} generated files`, 'success')
    setStep('done')
  }

  const exportZip = async () => {
    setExporting(true)
    const blob = await exportProjectZip(project)
    saveAs(blob, `${project.name.toLowerCase().replace(/\s+/g, '-')}-export.zip`)
    setExporting(false)
    log('Exported project', 'success')
  }

  return (
    <Modal title="Publish" onClose={() => setPublish(false)} width={620}>
      {/* Stepper */}
      <div className="flex items-center gap-1 mb-4 text-[11px] font-semibold uppercase tracking-wide">
        {(['validate', 'build', 'preview', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            {i > 0 && <div className="w-6 h-px bg-[var(--border)]" />}
            <button
              onClick={() => s !== 'done' && setStep(s)}
              className={`px-2.5 py-1 rounded-md ${step === s ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'}`}
            >
              {i + 1}. {s}
            </button>
          </div>
        ))}
      </div>

      {step === 'validate' && (
        <div>
          <div className={`mb-3 px-3 py-2 rounded-md font-semibold text-[13px] ${check.ok ? 'bg-[var(--success)]/15 text-[var(--success)]' : 'bg-[var(--error)]/15 text-[var(--error)]'}`}>
            {check.ok ? '✓ All checks passed' : `✗ ${check.blocking.length} blocking issue${check.blocking.length === 1 ? '' : 's'} found`}
          </div>
          <div className="space-y-1.5">
            {CHECKS.map((c) => {
              const count = check.blocking.filter((p) => p.kind.replace(/-/g, ' ').includes(c.id.replace('a11y', 'access')) || (c.id === 'links' && p.kind === 'broken-link') || (c.id === 'assets' && p.kind === 'missing-image') || (c.id === 'content' && p.kind === 'missing-content') || (c.id === 'brand' && p.kind === 'brand-consistency') || (c.id === 'seo' && p.kind === 'missing-seo') || (c.id === 'responsive' && p.kind === 'mobile-overflow') || (c.id === 'a11y' && p.kind === 'accessibility')).length
              return (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] text-[12.5px]">
                  <Icon name={count > 0 ? 'error' : 'check'} size={13} className={count > 0 ? 'text-[var(--error)]' : 'text-[var(--success)]'} />
                  <span className="flex-1">{c.label}</span>
                  {count > 0 ? <span className="text-[var(--error)] font-semibold">{count}</span> : <span className="text-[var(--success)]">OK</span>}
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <GhostButton onClick={() => setPublish(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={() => setStep('build')} disabled={!check.ok}>
              Continue to build
            </PrimaryButton>
          </div>
          {!check.ok && <p className="text-[11.5px] text-[var(--error)] mt-2">Resolve blocking issues before publishing.</p>}
        </div>
      )}

      {step === 'build' && (
        <div>
          <div className={`px-3 py-2 rounded-md font-semibold text-[13px] mb-3 ${build.status === 'error' ? 'bg-[var(--error)]/15 text-[var(--error)]' : build.status === 'warning' ? 'bg-[var(--warn)]/15 text-[var(--warn)]' : 'bg-[var(--success)]/15 text-[var(--success)]'}`}>
            {build.message}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[12.5px]">
            <div className="bg-[var(--surface-raised)] rounded-md px-3 py-2"><span className="text-[var(--text-tertiary)]">Errors</span><div className="text-lg font-bold">{build.errors}</div></div>
            <div className="bg-[var(--surface-raised)] rounded-md px-3 py-2"><span className="text-[var(--text-tertiary)]">Warnings</span><div className="text-lg font-bold">{build.warnings}</div></div>
            <div className="bg-[var(--surface-raised)] rounded-md px-3 py-2"><span className="text-[var(--text-tertiary)]">Files</span><div className="text-lg font-bold">{build.files}</div></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <GhostButton onClick={() => setStep('validate')}>Back</GhostButton>
            <GhostButton onClick={exportZip} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export project'}
            </GhostButton>
            <PrimaryButton onClick={() => setStep('preview')}>Preview</PrimaryButton>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <p className="text-[12.5px] text-[var(--text-secondary)] mb-3">
            Review the live site before publishing. Publishing runs the full build and stores a deployable artifact you can download.
          </p>
          {publishError && (
            <div className="mb-3 px-3 py-2 rounded-md border border-[var(--error)] bg-[var(--error-light)] text-[12.5px] text-[var(--error)]">
              {publishError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setStep('build')}>Back</GhostButton>
            <GhostButton onClick={() => { setPublish(false); setPreview(true) }}>Open preview</GhostButton>
            <PrimaryButton onClick={() => void publish()} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish now'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6">
          <div className="text-[var(--success)] text-4xl mb-2">✓</div>
          <div className="text-[16px] font-semibold mb-1">Published!</div>
          <p className="text-[12.5px] text-[var(--text-secondary)]">
            {deployment
              ? `${deployment.projectName} was validated, built and published at ${new Date(deployment.publishedAt).toLocaleString()}.`
              : `${project.name} was published at ${project.settings.publishedAt ? new Date(project.settings.publishedAt).toLocaleString() : '—'}.`}
          </p>
          {deployment && (
            <div className="flex items-center justify-center gap-4 mt-3 text-[12px] text-[var(--text-secondary)]">
              <span><span className="font-semibold text-[var(--text)]">{deployment.fileCount}</span> files</span>
              <span><span className="font-semibold text-[var(--text)]">{deployment.errors}</span> errors</span>
              <span><span className="font-semibold text-[var(--text)]">{deployment.warnings}</span> warnings</span>
            </div>
          )}
          {files && files.length > 0 && (
            <div className="mt-4 text-left border border-[var(--border)] rounded-md overflow-hidden">
              <div className="px-3 py-1.5 bg-[var(--surface-raised)] text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Generated artifact
              </div>
              <div className="max-h-44 overflow-y-auto px-3 py-2 font-mono text-[11px] text-[var(--text-secondary)] space-y-0.5">
                {files.map((f) => (
                  <div key={f.path} className="truncate" title={f.path}>{f.path}</div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-center gap-2 mt-4">
            <GhostButton onClick={exportZip} disabled={exporting}>{exporting ? 'Exporting…' : 'Download export'}</GhostButton>
            <PrimaryButton onClick={() => setPublish(false)}>Done</PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  )
}
