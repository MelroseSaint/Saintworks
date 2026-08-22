import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { Icon } from '../icons'
import { Field, PrimaryButton } from '../ui'

export function BrandEditor({ section }: { section: 'brand' | 'tokens' }) {
  const project = useProjectStore((s) => s.project)
  const store = useProjectStore()
  const { log, recordChange } = useEditorStore()
  const [newColorName, setNewColorName] = useState('')
  const [newColorValue, setNewColorValue] = useState('#2F5D50')

  if (section === 'brand') {
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          <Icon name="palette" size={14} />
          Brand
        </div>
        <Field label="Brand name">
          <input value={project.brand.name} onChange={(e) => store.setBrand({ name: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <input value={project.brand.tagline} onChange={(e) => store.setBrand({ tagline: e.target.value })} />
        </Field>
        <Field label="Voice tone">
          <input value={project.brand.voice.tone} onChange={(e) => store.setBrand({ voice: { ...project.brand.voice, tone: e.target.value } })} />
        </Field>
        <Field label="Voice keywords" hint="comma separated">
          <input
            value={project.brand.voice.keywords.join(', ')}
            onChange={(e) =>
              store.setBrand({
                voice: {
                  ...project.brand.voice,
                  keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                },
              })
            }
          />
        </Field>
        <Field label="Imagery rules">
          <textarea
            rows={3}
            value={project.brand.imageryRules}
            onChange={(e) => store.setBrand({ imageryRules: e.target.value })}
          />
        </Field>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          The brand is the source of truth. Tokens, components and pages all derive from it.
        </p>
      </div>
    )
  }

  // Tokens
  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        <Icon name="grid" size={14} />
        Design Tokens
      </div>

      {/* Colors */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Colors</div>
        <div className="space-y-1.5">
          {Object.entries(project.tokens.colors).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 group">
              <input
                type="color"
                value={value.startsWith('#') ? value : '#000000'}
                onChange={(e) => {
                  store.setColorToken(key, e.target.value)
                  recordChange(`Changed color token ${key}`, 'brand')
                  log(`Updated ${key} → ${e.target.value}`, 'success')
                }}
                className="w-7 h-6 p-0 border-0 bg-transparent cursor-pointer shrink-0"
              />
              <input value={key} className="flex-1 text-[12px]" onChange={(e) => {
                const v = project.tokens.colors[key]
                store.removeColorToken(key)
                store.addColorToken(e.target.value, v)
              }} />
              <code className="text-[11px] text-[var(--text-tertiary)] w-20">{value}</code>
              <button onClick={() => store.removeColorToken(key)} className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--error)]">
                <Icon name="trash" size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-2">
          <input placeholder="name (e.g. accent)" value={newColorName} onChange={(e) => setNewColorName(e.target.value)} className="flex-1 text-[12px]" />
          <input type="color" value={newColorValue} onChange={(e) => setNewColorValue(e.target.value)} className="w-8 h-6 p-0 border-0 bg-transparent cursor-pointer" />
          <PrimaryButton
            onClick={() => {
              if (newColorName.trim()) {
                store.addColorToken(newColorName.trim().toLowerCase().replace(/\s+/g, '.'), newColorValue)
                setNewColorName('')
              }
            }}
          >
            Add
          </PrimaryButton>
        </div>
      </div>

      {/* Typography */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Typography</div>
        {Object.values(project.tokens.textStyles).map((ts) => {
          const family = project.tokens.fonts[ts.familyId]
          return (
            <div key={ts.id} className="border border-[var(--border)] rounded-md p-2 mb-1.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[12.5px]">{ts.name}</span>
                <select
                  value={ts.familyId}
                  onChange={(e) => store.setTextStyle(ts.id, { familyId: e.target.value })}
                  className="flex-1 text-[12px]"
                >
                  {Object.values(project.tokens.fonts).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[12px]">
                <label className="flex flex-col gap-0.5"><span className="text-[10px] text-[var(--text-tertiary)]">Size</span>
                  <input type="number" value={ts.size} onChange={(e) => store.setTextStyle(ts.id, { size: Number(e.target.value) })} />
                </label>
                <label className="flex flex-col gap-0.5"><span className="text-[10px] text-[var(--text-tertiary)]">Weight</span>
                  <input type="number" value={ts.weight} onChange={(e) => store.setTextStyle(ts.id, { weight: Number(e.target.value) })} />
                </label>
                <label className="flex flex-col gap-0.5"><span className="text-[10px] text-[var(--text-tertiary)]">Line</span>
                  <input type="number" step="0.1" value={ts.lineHeight} onChange={(e) => store.setTextStyle(ts.id, { lineHeight: Number(e.target.value) })} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-[12px]">
                <span className="text-[10px] text-[var(--text-tertiary)]">Color</span>
                <select value={ts.colorToken} onChange={(e) => store.setTextStyle(ts.id, { colorToken: e.target.value })} className="flex-1">
                  {Object.keys(project.tokens.colors).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )
        })}
      </div>

      {/* Spacing */}
      <TokenNumbers
        title="Spacing (px)"
        tokens={project.tokens.spacing}
        onChange={(k, v) => store.setSpacingToken(k, v)}
      />
      {/* Radius */}
      <TokenNumbers
        title="Radius (px)"
        tokens={project.tokens.radius}
        onChange={(k, v) => store.setRadiusToken(k, v)}
      />

      {/* Breakpoints */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Breakpoints</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['desktop', 'tablet', 'mobile'] as const).map((bp) => (
            <label key={bp} className="flex flex-col gap-0.5 text-[12px]">
              <span className="text-[10px] text-[var(--text-tertiary)] capitalize">{bp}</span>
              <input
                type="number"
                value={project.tokens.breakpoints[bp]}
                onChange={(e) => store.setBreakpoint(bp, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Shadows & borders */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Shadows</div>
        {Object.entries(project.tokens.shadows).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 mb-1">
            <span className="text-[11px] w-6">{k}</span>
            <input value={v} onChange={(e) => store.setShadowToken(k, e.target.value)} className="flex-1 text-[12px]" />
          </div>
        ))}
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5 mt-2">Borders</div>
        {Object.entries(project.tokens.borders).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 mb-1">
            <span className="text-[11px] w-6">{k}</span>
            <input value={v} onChange={(e) => store.setBorderToken(k, e.target.value)} className="flex-1 text-[12px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function TokenNumbers({
  title,
  tokens,
  onChange,
}: {
  title: string
  tokens: Record<string, number>
  onChange: (key: string, value: number) => void
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">{title}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {Object.entries(tokens).map(([k, v]) => (
          <label key={k} className="flex items-center gap-1 text-[12px]">
            <span className="text-[10px] text-[var(--text-tertiary)] w-7">{k}</span>
            <input type="number" value={v} onChange={(e) => onChange(k, Number(e.target.value))} className="flex-1" />
          </label>
        ))}
      </div>
    </div>
  )
}
