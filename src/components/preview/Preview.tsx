import { Fragment, useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { effectiveStyle, expandPageWithLayout } from '../../model/resolve'
import { useAssetUrl, isAssetId } from '../../hooks/useAssetUrl'
import { Icon } from '../icons'
import type { Collection, CollectionRecord, ExpandedNode, ID } from '../../model/types'

const PRESET_ANIM: Record<string, string> = {
  fade: 'fb-fade',
  slide: 'fb-slide-up',
  scale: 'fb-scale',
  reveal: 'fb-reveal',
  blur: 'fb-blur',
  rotate: 'fb-rotate',
}

function substitute(text: string | undefined, record?: CollectionRecord): string {
  if (!text) return ''
  if (!record) return text
  return text.replace(/\{\{\s*([\w .-]+)\s*\}\}/g, (_, k) => String(record.values[k.trim()] ?? ''))
}

function PreviewImage({ src, alt, style }: { src?: string; alt?: string; style: React.CSSProperties }) {
  const url = useAssetUrl(src)
  const final = isAssetId(src) ? url ?? src : src
  return <img src={final} alt={alt} style={style} />
}

export function Preview() {
  const project = useProjectStore((s) => s.project)
  const { setPreview, viewport, setViewport } = useEditorStore()
  const [route, setRoute] = useState('/')
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [modal, setModal] = useState<string | null>(null)

  const page = useMemo(
    () => Object.values(project.pages).find((p) => p.route === route) ?? Object.values(project.pages)[0],
    [project.pages, route],
  )

  const root = useMemo(
    () => (page ? [expandPageWithLayout(page, project)] : []),
    [page, project],
  )

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setPreview])

  const runInteraction = (node: ExpandedNode, trigger: 'click' | 'hover' | 'pageLoad') => {
    for (const id of node.interactionIds) {
      const i = project.interactions[id]
      if (!i || i.trigger !== trigger) continue
      const target = i.targetId
      const value = i.params.value
      if (i.action === 'navigate' && value) setRoute(value.startsWith('/') ? value : '/' + value)
      if (i.action === 'show' && target) setHidden((h) => ({ ...h, [target]: false }))
      if (i.action === 'hide' && target) setHidden((h) => ({ ...h, [target]: true }))
      if (i.action === 'openModal' && value) setModal(value)
    }
  }

  const renderNode = (node: ExpandedNode, record?: CollectionRecord): React.ReactNode => {
    if (node.visibility.hidden) return null
    const style = effectiveStyle(node, viewport, project.tokens)
    if (node.animation) {
      const anim = node.animation
      const name = PRESET_ANIM[anim.preset] ?? 'fb-fade'
      style.animation = `${name} ${anim.duration}ms ${anim.easing} ${anim.delay}ms both`
      style.animationDelay = `${anim.delay}ms`
    }
    const common: React.HTMLAttributes<HTMLElement> = {
      style,
      onClick: (e) => {
        if (node.interactionIds.length) runInteraction(node, 'click')
        if ((node.tag === 'a') && node.content.href?.startsWith('/')) {
          e.preventDefault()
          setRoute(node.content.href)
        }
      },
      onMouseEnter: () => runInteraction(node, 'hover'),
    }
    if (node.interactionIds.some((id) => project.interactions[id]?.trigger === 'hover')) {
      // handled by onMouseEnter above
    }

    const Tag = (node.tag || 'div') as 'div'
    const text = substitute(node.content.text, record)

    if (node.dataBinding?.mode === 'repeat') {
      const coll: Collection | undefined = project.collections[node.dataBinding.collectionId]
      return (
        <Tag {...common}>
          {(coll?.records ?? []).map((rec) => (
            <Fragment key={rec.id}>{node.children.map((c) => renderNode(c, rec))}</Fragment>
          ))}
        </Tag>
      )
    }

    if (node.type === 'image') {
      return <PreviewImage src={node.content.src} alt={substitute(node.content.alt, record)} style={style} />
    }
    if (node.type === 'input') return <input {...common} placeholder={text} />
    if (node.type === 'divider') return <hr {...common} />
    if (node.type === 'video') return <video {...common} controls src={node.content.src} />

    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'a', 'button'].includes(Tag) || node.children.length === 0) {
      return <Tag {...common}>{text}</Tag>
    }
    return <Tag {...common}>{node.children.map((c) => renderNode(c, record))}</Tag>
  }

  const width = project.tokens.breakpoints[viewport]

  return (
    <div className="fixed inset-0 z-[500] bg-[#0a0e14] flex flex-col">
      <div className="flex items-center gap-3 px-4 h-12 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
        <div className="w-2 h-2 rounded-full bg-[var(--warn)]" />
        <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
        <div className="ml-2 text-[12px] text-[var(--text-secondary)] truncate">
          {project.name} — {page?.name}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {(['desktop', 'tablet', 'mobile'] as const).map((v) => (
            <button key={v} onClick={() => setViewport(v)} className={`px-2.5 py-1 rounded-md text-[11.5px] ${viewport === v ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}`}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => setPreview(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)] text-white text-[12px] font-semibold">
          <Icon name="x" size={13} />
          Exit preview
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto my-6 bg-white shadow-2xl" style={{ width, minHeight: 'calc(100% - 48px)' }}>
          {root.map((n) => renderNode(n))}
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-[#0F172A]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">{modal}</h3>
            <p className="text-sm text-[#475569] mb-4">This modal was opened by a visual interaction — no custom JavaScript required.</p>
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
