import { useMemo, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-json'
import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { generateProject } from '../../engine/codegen'
import { Icon } from '../icons'

function highlight(code: string, language: string): string {
  const grammars: Record<string, Prism.Grammar> = {
    jsx: Prism.languages.jsx ?? Prism.languages.markup,
    ts: Prism.languages.typescript ?? Prism.languages.javascript,
    json: Prism.languages.json ?? Prism.languages.javascript,
    css: Prism.languages.css,
  }
  const grammar = grammars[language] ?? Prism.languages.markup
  try {
    return Prism.highlight(code, grammar, language)
  } catch {
    return code
  }
}

export function CodeView() {
  const project = useProjectStore((s) => s.project)
  const { setCodeView } = useEditorStore()
  const files = useMemo(() => generateProject(project), [project])
  const [active, setActive] = useState(files[0]?.path ?? '')

  const file = files.find((f) => f.path === active) ?? files[0]

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#0d1117]">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-[var(--border)] bg-[var(--surface)]">
        <Icon name="code" size={14} className="text-[var(--accent-hover)]" />
        <span className="text-[12px] font-semibold">Generated code</span>
        <span className="text-[10.5px] text-[var(--warn)] bg-[var(--warn)]/10 px-1.5 py-0.5 rounded">Read-only</span>
        <div className="flex-1" />
        <span className="text-[10.5px] text-[var(--text-tertiary)]">{files.length} files</span>
        <button onClick={() => setCodeView(false)} className="p-1 rounded text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]">
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-[220px] border-r border-[var(--border)] overflow-y-auto shrink-0">
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => setActive(f.path)}
              className={`w-full text-left px-2.5 py-1.5 text-[11.5px] font-mono truncate ${
                active === f.path ? 'bg-[var(--surface-raised)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              {f.path}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="code-view p-4 m-0">
            <code dangerouslySetInnerHTML={{ __html: file ? highlight(file.content, file.language) : '' }} />
          </pre>
        </div>
      </div>
    </div>
  )
}
