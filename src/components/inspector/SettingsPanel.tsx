import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { Icon } from '../icons'
import { Field, usePrompt } from '../ui'

export function SettingsPanel() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { setSettingsOpen, log, recordChange } = useEditorStore()
  const { prompt, element } = usePrompt()

  const reset = async () => {
    const ok = await prompt('Reset project?', '', 'Type RESET to confirm')
    if (ok !== 'RESET') return
    store.resetProject()
    const fresh = useProjectStore.getState().project
    const home =
      fresh.settings.homepageId && fresh.pages[fresh.settings.homepageId]
        ? fresh.settings.homepageId
        : fresh.pageOrder[0]
    if (home) useEditorStore.getState().setActivePage(home)
    recordChange('Reset project to starter', 'page')
    log('Project reset to the SaintWorks starter', 'success')
    setSettingsOpen(false)
  }

  const duplicateRoutes = Object.values(project.pages)
    .map((p) => p.route)
    .filter((r, i, arr) => arr.indexOf(r) !== i)

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          <Icon name="settings" size={14} />
          Settings
        </div>
        <button onClick={() => setSettingsOpen(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text)]">
          <Icon name="x" size={14} />
        </button>
      </div>

      <Field label="Site title">
        <input value={project.settings.siteTitle} onChange={(e) => store.setSettings({ siteTitle: e.target.value })} />
      </Field>
      <Field label="Homepage">
        <select
          value={project.settings.homepageId ?? ''}
          onChange={(e) => store.setSettings({ homepageId: e.target.value || null })}
          className="w-full"
        >
          <option value="">None</option>
          {project.pageOrder.map((id) => (
            <option key={id} value={id}>
              {project.pages[id]?.name}
            </option>
          ))}
        </select>
      </Field>

      {/* Routing */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Routes</div>
        {project.pageOrder.map((id) => {
          const page = project.pages[id]
          if (!page) return null
          const dup = duplicateRoutes.includes(page.route)
          return (
            <div key={id} className="flex items-center gap-2 mb-1">
              <span className="text-[11.5px] w-16 truncate">{page.name}</span>
              <input
                value={page.route}
                onChange={(e) => {
                  let v = e.target.value
                  if (!v.startsWith('/')) v = '/' + v
                  store.setPageRoute(id, v)
                }}
                className="flex-1 text-[12px]"
                style={{ borderColor: dup ? 'var(--error)' : undefined }}
              />
              {dup && <span className="text-[10px] text-[var(--error)]">duplicate</span>}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Navigation</span>
          <button
            onClick={() => store.setNavigation([...project.navigation, { label: 'New link', pageId: project.pageOrder[0] ?? null }])}
            className="flex items-center gap-1 text-[11.5px] text-[var(--accent-hover)] hover:text-white"
          >
            <Icon name="plus" size={12} />
            Add link
          </button>
        </div>
        {project.navigation.map((link, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <input
              value={link.label}
              onChange={(e) => {
                const nav = [...project.navigation]
                nav[i] = { ...nav[i], label: e.target.value }
                store.setNavigation(nav)
              }}
              className="w-24 text-[12px]"
            />
            <select
              value={link.pageId ?? ''}
              onChange={(e) => {
                const nav = [...project.navigation]
                nav[i] = { ...nav[i], pageId: e.target.value || null }
                store.setNavigation(nav)
              }}
              className="flex-1 text-[12px]"
            >
              <option value="">Custom URL</option>
              {project.pageOrder.map((id) => (
                <option key={id} value={id}>
                  {project.pages[id]?.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => store.setNavigation(project.navigation.filter((_, j) => j !== i))}
              className="text-[var(--text-tertiary)] hover:text-[var(--error)]"
            >
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="border-t border-[var(--border-subtle)] pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
          Danger zone
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
          Restore the original SaintWorks starter. This replaces all current pages, components, content, and tokens.
        </p>
        <button
          onClick={() => void reset()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--error)] text-[var(--error)] hover:bg-[var(--error-light)] text-[12px] font-medium"
        >
          <Icon name="refresh" size={13} />
          Reset project
        </button>
      </div>

      <p className="text-[11px] text-[var(--text-secondary)]">
        Version {project.version} · Last updated {new Date(project.updatedAt).toLocaleString()}
      </p>
      {element}
    </div>
  )
}
