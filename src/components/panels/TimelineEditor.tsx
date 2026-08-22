import { useMemo, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedNode } from '../../hooks/useSelectedNode'
import { Icon } from '../icons'
import { uid } from '../../model/factories'
import type { Animation, AnimationPreset } from '../../model/types'

const PRESETS: { id: AnimationPreset; label: string }[] = [
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
  { id: 'scale', label: 'Scale' },
  { id: 'reveal', label: 'Reveal' },
  { id: 'blur', label: 'Blur' },
  { id: 'rotate', label: 'Rotate' },
]

const EASINGS = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear']
const TRIGGERS = [
  { id: 'pageLoad', label: 'Page load' },
  { id: 'enterViewport', label: 'Scroll into view' },
  { id: 'hover', label: 'Hover' },
  { id: 'click', label: 'Click' },
]

const DURATIONS = [200, 400, 600, 800, 1000, 1500]
const TOTAL_DURATION = 2000 // ms

export function TimelineEditor() {
  const store = useProjectStore()
  const { selectedOrigin } = useEditorStore()
  const selected = useSelectedNode()
  const [scrubbing, setScrubbing] = useState(false)

  const animation = selected?.animation

  const keyframes = useMemo(() => {
    if (!animation) return []
    const pos = (ms: number) => (ms / TOTAL_DURATION) * 100
    const kfs: { id: string; percent: number; label: string; ms: number }[] = []
    kfs.push({ id: 'start', percent: 0, label: 'Start', ms: 0 })
    if (animation.trigger === 'pageLoad' || animation.trigger === 'enterViewport') {
      kfs.push({ id: 'fade-in', percent: pos(animation.delay), label: `Fade in (${animation.delay}ms)`, ms: animation.delay })
      kfs.push({ id: 'full', percent: pos(animation.delay + animation.duration), label: `Full (${animation.delay + animation.duration}ms)`, ms: animation.delay + animation.duration })
    } else {
      kfs.push({ id: 'trigger', percent: 10, label: 'Trigger', ms: 200 })
      kfs.push({ id: 'anim-start', percent: 10, label: `Start (${animation.delay}ms)`, ms: animation.delay })
      kfs.push({ id: 'anim-end', percent: 10 + (animation.duration / TOTAL_DURATION) * 90, label: `End`, ms: animation.delay + animation.duration })
    }
    return kfs
  }, [animation])

  const setAnimation = (patch: Partial<Animation>) => {
    if (!selected) return
    const base: Animation = animation ?? {
      id: uid(), preset: 'fade', duration: 600, delay: 0,
      easing: 'ease-out', trigger: 'enterViewport', direction: 'up',
    }
    store.setNodeAnimation(selected.origin, { ...base, ...patch })
  }

  if (!selected) {
    return (
      <div className="p-4 text-center text-[12px] text-[var(--text-tertiary)]">
        Select an element to edit its animation
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Animation · {selected.name}</div>
        {animation && (
          <button onClick={() => store.setNodeAnimation(selected.origin, undefined)} className="text-[11px] text-[var(--error)] hover:underline">
            Remove
          </button>
        )}
      </div>

      {!animation ? (
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => setAnimation({ preset: p.id })} className="px-2.5 py-1.5 rounded border border-[var(--border)] text-[11.5px] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Timeline visualization */}
          <div className="timeline-ruler flex items-end px-1 relative" style={{ height: 20 }}>
            {[0, 25, 50, 75, 100].map((pct) => (
              <span key={pct} className="absolute bottom-0.5 text-[9px] text-[var(--text-tertiary)]" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
                {Math.round(TOTAL_DURATION * pct / 100)}ms
              </span>
            ))}
          </div>
          <div className="relative">
            <div className="timeline-track relative" style={{ height: 48 }}>
              {keyframes.map((kf) => (
                <div key={kf.id} className="timeline-keyframe" style={{ left: `calc(${kf.percent}% - 6px)` }} title={kf.label} />
              ))}
              {/* Duration bar */}
              {animation.delay > 0 && (
                <div className="absolute top-[14px] h-[4px] bg-[var(--border-subtle)] rounded" style={{ left: `${(animation.delay / TOTAL_DURATION) * 100}%`, width: `${(animation.duration / TOTAL_DURATION) * 100}%` }} />
              )}
              {animation.delay === 0 && (
                <div className="absolute top-[14px] h-[4px] bg-[var(--accent)] rounded" style={{ left: 0, width: `${(animation.duration / TOTAL_DURATION) * 100}%` }} />
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase">Duration</span>
              <select value={animation.duration} onChange={(e) => setAnimation({ duration: Number(e.target.value) })} className="w-full text-[12px] mt-0.5">
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d}ms</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase">Delay</span>
              <input type="number" value={animation.delay} onChange={(e) => setAnimation({ delay: Number(e.target.value) })} min={0} max={5000} step={50} className="w-full text-[12px] mt-0.5" />
            </label>
            <label className="block">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase">Easing</span>
              <select value={animation.easing} onChange={(e) => setAnimation({ easing: e.target.value })} className="w-full text-[12px] mt-0.5">
                {EASINGS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase">Trigger</span>
              <select value={animation.trigger} onChange={(e) => setAnimation({ trigger: e.target.value as Animation['trigger'] })} className="w-full text-[12px] mt-0.5">
                {TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase">Direction</span>
              <select value={animation.direction} onChange={(e) => setAnimation({ direction: e.target.value as Animation['direction'] })} className="w-full text-[12px] mt-0.5">
                {['none', 'up', 'down', 'left', 'right'].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase">Preset</span>
              <select value={animation.preset} onChange={(e) => setAnimation({ preset: e.target.value as AnimationPreset })} className="w-full text-[12px] mt-0.5">
                {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          </div>
        </>
      )}
    </div>
  )
}
