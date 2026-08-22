import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedNode } from '../../hooks/useSelectedNode'
import { StyleInspector } from './StyleInspector'
import { BrandEditor } from './BrandEditor'
import { DataBuilder } from './DataBuilder'
import { SettingsPanel } from './SettingsPanel'
import { Icon } from '../icons'
import { Field, PrimaryButton } from '../ui'
import { uid } from '../../model/factories'
import type { ActionType, ExpandedNode, Interaction, TriggerType } from '../../model/types'

const TRIGGERS: TriggerType[] = ['click', 'hover', 'scroll', 'pageLoad', 'formSubmit', 'enterViewport']
const ACTIONS: ActionType[] = ['show', 'hide', 'animate', 'navigate', 'openModal', 'playMedia', 'changeState', 'submitForm']

export function Inspector() {
  const { selectedOrigin, brandSection, dataCollectionId, cmsOpen, settingsOpen, activePageId } =
    useEditorStore()
  const selectedNode = useSelectedNode()

  if (settingsOpen) return <SettingsPanel />
  if (brandSection) return <BrandEditor section={brandSection} />
  if (dataCollectionId || cmsOpen) return <DataBuilder />

  if (selectedNode) {
    return (
      <div className="flex-1 overflow-y-auto">
        <StyleInspector node={selectedNode} />
        <InteractionsSection node={selectedNode} />
      </div>
    )
  }

  return <PageSettings />
}

function PageSettings() {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { activePageId } = useEditorStore()
  const page = activePageId ? project.pages[activePageId] : null

  if (!page) {
    return (
      <div className="p-4 text-[12px] text-[var(--text-secondary)]">
        Select an element on the canvas to inspect it, or choose a section from the explorer.
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        <Icon name="doc" size={14} />
        {page.name}
      </div>
      <Field label="SEO title">
        <input value={page.seo.title} onChange={(e) => store.setPageSEO(page.id, { ...page.seo, title: e.target.value })} />
      </Field>
      <Field label="SEO description">
        <textarea rows={3} value={page.seo.description} onChange={(e) => store.setPageSEO(page.id, { ...page.seo, description: e.target.value })} />
      </Field>
      <Field label="Route">
        <input value={page.route} onChange={(e) => store.setPageRoute(page.id, e.target.value.startsWith('/') ? e.target.value : '/' + e.target.value)} />
      </Field>
      <Field label="Layout">
        <select value={page.layoutId} onChange={(e) => store.setPageLayout(page.id, e.target.value)} className="w-full">
          {Object.values(project.layouts).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}

function InteractionsSection({ node }: { node: ExpandedNode }) {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const [trigger, setTrigger] = useState<TriggerType>('click')
  const [action, setAction] = useState<ActionType>('openModal')
  const [param, setParam] = useState('')

  const interactions = node.interactionIds.map((id) => project.interactions[id]).filter(Boolean)

  const add = () => {
    const interaction: Interaction = {
      id: uid(),
      name: `On ${trigger} → ${action}`,
      trigger,
      action,
      targetId: null,
      params: { value: param },
    }
    store.addInteraction(interaction)
    store.attachInteraction(node.origin, interaction.id)
    setParam('')
  }

  return (
    <div className="border-t border-[var(--border-subtle)] px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
        <Icon name="motion" size={12} />
        Interactions
      </div>
      {interactions.map((i) => (
        <div key={i.id} className="flex items-center gap-2 bg-[var(--surface-raised)] rounded-md px-2 py-1.5 mb-1 text-[11.5px]">
          <span className="text-[var(--text-tertiary)]">When</span>
          <span className="font-semibold">{i.trigger}</span>
          <span className="text-[var(--text-tertiary)]">do</span>
          <span className="font-semibold">{i.action}</span>
          {i.params.value && <span className="text-[var(--text-tertiary)] truncate">→ {i.params.value}</span>}
          <div className="flex-1" />
          <button onClick={() => { store.detachInteraction(node.origin, i.id); store.removeInteraction(i.id) }} className="text-[var(--text-tertiary)] hover:text-[var(--error)]">
            <Icon name="trash" size={12} />
          </button>
        </div>
      ))}
      <div className="flex gap-1.5 items-end">
        <label className="flex flex-col gap-0.5 flex-1">
          <span className="text-[10px] text-[var(--text-tertiary)]">Trigger</span>
          <select value={trigger} onChange={(e) => setTrigger(e.target.value as TriggerType)} className="text-[11.5px]">
            {TRIGGERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 flex-1">
          <span className="text-[10px] text-[var(--text-tertiary)]">Action</span>
          <select value={action} onChange={(e) => setAction(e.target.value as ActionType)} className="text-[11.5px]">
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 flex-1">
          <span className="text-[10px] text-[var(--text-tertiary)]">Target / value</span>
          <input value={param} onChange={(e) => setParam(e.target.value)} placeholder="e.g. /contact" className="text-[11.5px]" />
        </label>
        <button onClick={add} className="p-1.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]" title="Add interaction">
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  )
}
