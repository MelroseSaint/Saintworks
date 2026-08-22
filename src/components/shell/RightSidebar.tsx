import { Inspector } from '../inspector/Inspector'
import { Icon } from '../icons'

export function RightSidebar() {
  return (
    <aside className="w-[272px] shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border-subtle)] text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        <Icon name="settings" size={12} />
        Inspector
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col">
        <Inspector />
      </div>
    </aside>
  )
}
