import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './icons'

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export function Modal({
  title,
  onClose,
  children,
  width = 560,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl max-h-[85vh] flex flex-col"
        style={{ width }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[14px]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]">
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------
export interface MenuItem {
  label: string
  icon?: string
  danger?: boolean
  divider?: boolean
  onClick?: () => void
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', h)
    window.addEventListener('keydown', k)
    return () => {
      window.removeEventListener('mousedown', h)
      window.removeEventListener('keydown', k)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-[300] min-w-[180px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg shadow-2xl py-1 text-[12.5px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="h-px bg-[var(--border)] my-1" />
        ) : (
          <button
            key={i}
            onClick={() => {
              item.onClick?.()
              onClose()
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--bg)] ${
              item.danger ? 'text-[var(--error)]' : ''
            }`}
          >
            {item.icon && <Icon name={item.icon} size={13} className="opacity-70" />}
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Form primitives
// ---------------------------------------------------------------------------
export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          {label}
        </span>
        {hint && <span className="text-[10.5px] text-[var(--text-tertiary)]">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full ${props.className ?? ''}`} />
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[12.5px] font-semibold disabled:opacity-40 disabled:hover:bg-[var(--accent)]"
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] text-[12.5px] disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
      <Icon name={icon} size={20} className="text-[var(--text-tertiary)]" />
      <div className="text-[12.5px] text-[var(--text-secondary)]">{title}</div>
      {hint && <div className="text-[11px] text-[var(--text-tertiary)]">{hint}</div>}
    </div>
  )
}

export function usePrompt(): {
  prompt: (title: string, initial?: string, placeholder?: string) => Promise<string | null>
  element: ReactNode
} {
  const [state, setState] = useState<{
    title: string
    initial: string
    placeholder: string
    resolve: (v: string | null) => void
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const prompt = (title: string, initial = '', placeholder = '') =>
    new Promise<string | null>((resolve) => {
      setState({ title, initial, placeholder, resolve })
    })

  const submit = () => {
    const v = inputRef.current?.value.trim()
    state?.resolve(v || state.initial || null)
  }

  const element = state ? (
    <Modal title={state.title} onClose={() => state.resolve(null)} width={400}>
      <input
        ref={inputRef}
        autoFocus
        defaultValue={state.initial}
        placeholder={state.placeholder}
        className="w-full mb-3"
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      <div className="flex justify-end gap-2">
        <GhostButton onClick={() => state.resolve(null)}>Cancel</GhostButton>
        <PrimaryButton onClick={submit}>OK</PrimaryButton>
      </div>
    </Modal>
  ) : null

  return { prompt, element }
}
