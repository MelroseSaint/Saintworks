import { useMemo, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { findInstanceRef } from '../../model/tree'
import { Icon } from '../icons'
import { Field } from '../ui'
import type { Animation, ExpandedNode, StyleModel, StylePatch } from '../../model/types'

const FONTS = ['heading', 'body', 'eyebrow']
const ALIGNMENTS = ['left', 'center', 'right', 'justify']
const DIRECTIONS = ['horizontal', 'vertical']
const ALIGNS = ['start', 'center', 'end', 'stretch']
const JUSTIFIES = ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly']
const PRESETS = ['fade', 'slide', 'scale', 'reveal', 'blur', 'rotate']
const EASINGS = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear']
const TRIGGERS = ['pageLoad', 'enterViewport', 'hover', 'click']
const ANIM_DIRECTIONS = ['none', 'up', 'down', 'left', 'right']

function Section({
  title,
  children,
  icon,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  icon: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] hover:text-[var(--text)]"
      >
        <Icon name="chevronRight" size={11} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        <Icon name={icon} size={12} />
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
    </div>
  )
}

function SourceDot({ override, title }: { override: boolean; title?: string }) {
  return (
    <span
      title={override ? 'Manually overridden' : 'Inherited from design token'}
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: override ? 'var(--accent-hover)' : 'var(--text-tertiary)' }}
    />
  )
}

export function StyleInspector({ node }: { node: ExpandedNode }) {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { viewport, log, recordChange } = useEditorStore()

  const origin = node.origin
  const style = node.style
  const isInstance = origin.kind === 'component-instance'

  // Instance data (looked up from the project so it works for any node inside an instance)
  const instance = isInstance ? findInstanceRef(project, origin.instanceNodeId) : null
  const masterComponent = instance ? project.components[instance.componentId] : null

  const set = (patch: StylePatch, bp?: typeof viewport) => {
    store.setNodeStyle(origin, patch, bp && bp !== 'desktop' ? bp : undefined)
    if (bp && bp !== 'desktop') recordChange(`Overrode ${node.name} on ${bp}`, 'styling')
  }

  const colorSwatches = Object.entries(project.tokens.colors)

  const ColorField = ({
    label,
    value,
    raw,
    onToken,
    onRaw,
  }: {
    label: string
    value: string | undefined
    raw?: string
    onToken: (v: string | undefined) => void
    onRaw?: (v: string) => void
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
        <SourceDot override={value !== undefined || raw !== undefined} title={label} />
      </div>
      <div className="flex flex-wrap gap-1 mb-1">
        {colorSwatches.map(([key, color]) => (
          <button
            key={key}
            title={key}
            onClick={() => onToken(key)}
            className="w-5 h-5 rounded-full border border-[var(--border)]"
            style={{ background: color, outline: value === key ? '2px solid var(--accent)' : 'none', outlineOffset: 1 }}
          />
        ))}
        <button
          onClick={() => onToken(undefined)}
          className="w-5 h-5 rounded-full border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-tertiary)]"
          title="Inherit"
        >
          <Icon name="x" size={10} />
        </button>
      </div>
      {onRaw && (
        <input
          type="color"
          value={raw && raw.startsWith('#') ? raw : '#000000'}
          onChange={(e) => onRaw(e.target.value)}
          className="w-8 h-6 p-0 border-0 bg-transparent cursor-pointer"
          title="Custom color (override)"
        />
      )}
    </div>
  )

  const spacingControls = (which: 'margin' | 'padding') => {
    const box = style.spacing[which] ?? {}
    const keys: (keyof typeof box)[] = ['top', 'right', 'bottom', 'left']
    return (
      <div className="grid grid-cols-4 gap-1">
        {keys.map((k) => (
          <select
            key={k}
            value={String(box[k] ?? '')}
            onChange={(e) => {
              const v = e.target.value
              const patch = v === '' ? { [which]: { [k]: undefined } } : { [which]: { [k]: v } }
              set(patch as StylePatch)
            }}
            className="text-[11px]"
          >
            <option value="">—</option>
            {Object.keys(project.tokens.spacing).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ))}
      </div>
    )
  }

  const num = (value: number | undefined, onChange: (v: number | undefined) => void, step = 1) => (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value ?? ''}
        placeholder="auto"
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="w-full text-[12px]"
      />
      {value !== undefined && (
        <button onClick={() => onChange(undefined)} className="text-[var(--text-tertiary)] hover:text-[var(--text)]" title="Reset">
          <Icon name="x" size={11} />
        </button>
      )}
    </div>
  )

  return (
    <div>
      {/* Instance header */}
      {isInstance && masterComponent && (
        <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--accent-light)]">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-hover)]">
            <Icon name="component" size={12} />
            {masterComponent.name}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Component instance. Edits here become local overrides.
          </p>
        </div>
      )}

      {/* Component properties */}
      {isInstance && instance && masterComponent && masterComponent.propsSchema.length > 0 && (
        <Section title="Component Properties" icon="component">
          {masterComponent.propsSchema.map((prop) => (
            <Field key={prop.key} label={prop.label}>
              {prop.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={Boolean(instance.props[prop.key] ?? prop.default)}
                  onChange={(e) => store.setInstanceProp(origin, prop.key, e.target.checked)}
                />
              ) : (
                <input
                  type="text"
                  value={String(instance.props[prop.key] ?? prop.default)}
                  onChange={(e) => store.setInstanceProp(origin, prop.key, e.target.value)}
                />
              )}
            </Field>
          ))}
        </Section>
      )}

      {/* Variants */}
      {isInstance && instance && masterComponent && masterComponent.variants.length > 0 && (
        <Section title="Variant" icon="layers">
          <div className="flex flex-wrap gap-1">
            {masterComponent.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => store.setInstanceVariant(origin, v.id)}
                className={`px-2 py-1 rounded-md text-[11.5px] border ${
                  instance.variantId === v.id
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]'
                }`}
              >
                {v.name}
              </button>
            ))}
            <button
              onClick={() => store.setInstanceVariant(origin, '')}
              className="px-2 py-1 rounded-md text-[11.5px] border border-dashed border-[var(--border)] text-[var(--text-tertiary)]"
            >
              None
            </button>
          </div>
        </Section>
      )}

      {/* Content */}
      <Section title="Content" icon="type">
        {(node.type === 'text' || node.type === 'heading' || node.type === 'button' || node.type === 'link' || node.type === 'input') && (
          <Field label="Text">
            <textarea
              rows={2}
              value={node.content.text ?? ''}
              onChange={(e) => store.setNodeContent(origin, { text: e.target.value })}
            />
          </Field>
        )}
        {(node.type === 'button' || node.type === 'link') && (
          <Field label="Link">
            <input
              type="text"
              value={node.content.href ?? ''}
              onChange={(e) => store.setNodeContent(origin, { href: e.target.value })}
              placeholder="/path or https://"
            />
          </Field>
        )}
        {node.type === 'image' && (
          <>
            <Field label="Image source">
              <input
                type="text"
                value={node.content.src ?? ''}
                onChange={(e) => store.setNodeContent(origin, { src: e.target.value })}
                placeholder="URL or asset id"
              />
            </Field>
            <Field label="Alt text">
              <input
                type="text"
                value={node.content.alt ?? ''}
                onChange={(e) => store.setNodeContent(origin, { alt: e.target.value })}
              />
            </Field>
          </>
        )}
        <Field label="Semantic tag">
          <select value={node.tag} onChange={(e) => store.setNodeTag(origin, e.target.value)}>
            {['div', 'section', 'header', 'footer', 'nav', 'main', 'article', 'aside', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'a', 'button', 'img', 'video', 'form', 'input', 'hr'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Typography */}
      {(node.type === 'text' || node.type === 'heading' || node.type === 'button' || node.type === 'link' || node.type === 'input') && (
        <Section title="Typography" icon="type">
          <Field label="Font">
            <select
              value={style.typography.fontToken ?? ''}
              onChange={(e) => set({ typography: { fontToken: e.target.value || undefined } })}
            >
              <option value="">Inherit</option>
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {project.tokens.textStyles[f]?.name ?? f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Size (px)">{num(style.typography.fontSize, (v) => set({ typography: { fontSize: v } }))}</Field>
          <Field label="Weight">{num(style.typography.fontWeight, (v) => set({ typography: { fontWeight: v } }), 100)}</Field>
          <Field label="Line height">{num(style.typography.lineHeight, (v) => set({ typography: { lineHeight: v } }), 0.1)}</Field>
          <Field label="Letter spacing">{num(style.typography.letterSpacing, (v) => set({ typography: { letterSpacing: v } }), 0.01)}</Field>
          <Field label="Alignment">
            <select value={style.typography.align ?? ''} onChange={(e) => set({ typography: { align: (e.target.value || undefined) as StyleModel['typography']['align'] } })}>
              <option value="">Inherit</option>
              {ALIGNMENTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          <ColorField
            label="Text color"
            value={style.typography.colorToken}
            onToken={(v) => set({ typography: { colorToken: v } })}
          />
        </Section>
      )}

      {/* Color / background */}
      <Section title="Color" icon="palette">
        <ColorField
          label="Background"
          value={style.background.colorToken}
          raw={style.background.color}
          onToken={(v) => set({ background: { colorToken: v } })}
          onRaw={(v) => set({ background: { color: v, colorToken: undefined } })}
        />
        <Field label="Radius">
          <select value={style.background.radiusToken ?? ''} onChange={(e) => set({ background: { radiusToken: e.target.value || undefined } })}>
            <option value="">None</option>
            {Object.keys(project.tokens.radius).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shadow">
          <select value={style.background.shadowToken ?? ''} onChange={(e) => set({ background: { shadowToken: e.target.value || undefined } })}>
            <option value="">None</option>
            {Object.keys(project.tokens.shadows).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Border">
          <select value={style.background.borderToken ?? ''} onChange={(e) => set({ background: { borderToken: e.target.value || undefined } })}>
            <option value="">None</option>
            {Object.keys(project.tokens.borders).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Spacing */}
      <Section title="Spacing" icon="box">
        <div className="text-[10.5px] text-[var(--text-secondary)] uppercase tracking-wide mb-1">Padding</div>
        {spacingControls('padding')}
        <div className="text-[10.5px] text-[var(--text-secondary)] uppercase tracking-wide mb-1 mt-2">Margin</div>
        {spacingControls('margin')}
      </Section>

      {/* Layout */}
      <Section title="Layout" icon="grid">
        <Field label="Display">
          <select value={style.layout.mode} onChange={(e) => set({ layout: { mode: e.target.value as StyleModel['layout']['mode'] } })}>
            <option value="block">Block (stack)</option>
            <option value="flex">Flex</option>
            <option value="grid">Grid</option>
            <option value="absolute">Absolute</option>
          </select>
        </Field>
        {style.layout.mode === 'flex' && (
          <>
            <Field label="Direction">
              <select value={style.layout.direction ?? 'vertical'} onChange={(e) => set({ layout: { direction: e.target.value as 'horizontal' | 'vertical' } })}>
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Alignment">
              <select value={style.layout.align ?? ''} onChange={(e) => set({ layout: { align: (e.target.value || undefined) as StyleModel['layout']['align'] } })}>
                <option value="">Default</option>
                {ALIGNS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Distribution">
              <select value={style.layout.justify ?? ''} onChange={(e) => set({ layout: { justify: (e.target.value || undefined) as StyleModel['layout']['justify'] } })}>
                <option value="">Default</option>
                {JUSTIFIES.map((a) => (
                  <option key={a} value={a}>
                    {a.replace('space-', 'space ')}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {style.layout.mode === 'grid' && (
          <Field label="Columns">{num(style.layout.columns, (v) => set({ layout: { columns: v } }))}</Field>
        )}
        <Field label="Gap">
          <select value={String(style.layout.gap ?? '')} onChange={(e) => set({ layout: { gap: e.target.value || undefined } })}>
            <option value="">None</option>
            {Object.keys(project.tokens.spacing).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="Width">{num(typeof style.sizing.width === 'number' ? style.sizing.width : undefined, (v) => set({ sizing: { width: v } }))}</Field>
          <Field label="Height">{num(typeof style.sizing.height === 'number' ? style.sizing.height : undefined, (v) => set({ sizing: { height: v } }))}</Field>
        </div>
        <Field label="Max width">{num(typeof style.sizing.maxWidth === 'number' ? style.sizing.maxWidth : undefined, (v) => set({ sizing: { maxWidth: v } }))}</Field>
      </Section>

      {/* Responsive */}
      <Section title="Responsive" icon="monitor">
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          Current viewport: <span className="font-semibold text-[var(--text)] capitalize">{viewport}</span>.
          {' '}
          {viewport === 'desktop'
            ? 'Changes apply to all sizes (global).'
            : `Changes now override the ${viewport} view only.`}
        </p>
        {Object.keys(node.responsive).length > 0 && (
          <div className="space-y-1">
            {Object.entries(node.responsive).map(([bp, overrides]) => (
              <div key={bp} className="flex items-center justify-between bg-[var(--surface-raised)] rounded-md px-2 py-1.5 text-[11.5px]">
                <span className="capitalize">{bp}</span>
                <span className="text-[var(--text-tertiary)]">{Object.keys(overrides ?? {}).length} override groups</span>
                <button
                  onClick={() => {
                    store.updateNodeAt(origin, (n) => {
                      delete n.responsive[bp as 'tablet' | 'mobile']
                    })
                    recordChange(`Cleared ${bp} overrides`, 'styling')
                  }}
                  className="text-[var(--text-tertiary)] hover:text-[var(--error)]"
                  title="Clear overrides"
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Advanced */}
      <Section title="Advanced" icon="settings" defaultOpen={false}>
        <Field label="Visibility">
          <label className="flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={!node.visibility.hidden}
              onChange={(e) => store.setNodeVisibility(origin, { hidden: !e.target.checked })}
            />
            Visible
          </label>
        </Field>

        <Field label="Accessibility — aria label">
          <input
            type="text"
            value={node.a11y?.ariaLabel ?? ''}
            onChange={(e) => store.setNodeA11y(origin, { ...node.a11y, ariaLabel: e.target.value || undefined })}
          />
        </Field>

        {/* Animation */}
        <div className="border-t border-[var(--border-subtle)] pt-2.5 mt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Animation</span>
            {node.animation && (
              <button onClick={() => store.setNodeAnimation(origin, undefined)} className="text-[var(--text-tertiary)] hover:text-[var(--error)]" title="Remove animation">
                <Icon name="trash" size={12} />
              </button>
            )}
          </div>
          <AnimationControls
            animation={node.animation}
            onChange={(a) => store.setNodeAnimation(origin, a)}
          />
        </div>
      </Section>
    </div>
  )
}

function AnimationControls({
  animation,
  onChange,
}: {
  animation: Animation | undefined
  onChange: (a: Animation) => void
}) {
  const base: Animation = animation ?? {
    id: '',
    preset: 'fade',
    duration: 600,
    delay: 0,
    easing: 'ease-out',
    trigger: 'enterViewport',
    direction: 'up',
  }
  const set = (patch: Partial<Animation>) => onChange({ ...base, ...patch, id: animation?.id ?? Math.random().toString(36).slice(2) })
  return (
    <div className="space-y-2">
      <Field label="Preset">
        <select value={base.preset} onChange={(e) => set({ preset: e.target.value as Animation['preset'] })}>
          {PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-1.5">
        <Field label="Duration (ms)">
          <input type="number" value={base.duration} onChange={(e) => set({ duration: Number(e.target.value) })} />
        </Field>
        <Field label="Delay (ms)">
          <input type="number" value={base.delay} onChange={(e) => set({ delay: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Field label="Easing">
          <select value={base.easing} onChange={(e) => set({ easing: e.target.value })}>
            {EASINGS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Direction">
          <select value={base.direction} onChange={(e) => set({ direction: e.target.value as Animation['direction'] })}>
            {ANIM_DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Trigger">
        <select value={base.trigger} onChange={(e) => set({ trigger: e.target.value as Animation['trigger'] })}>
          {TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}
