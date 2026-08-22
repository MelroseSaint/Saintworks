import { useEffect, useRef, useState } from 'react'
import { useAIStore } from '../../store/aiStore'
import { useEditorStore } from '../../store/editorStore'
import { Icon } from '../icons'

export function AIPanel() {
  const { messages, pendingPlan, processing, send, apply, cancel, clear, llmMode, setLlmMode, llmConfig, setLlmConfig } = useAIStore()
  const { setAI } = useEditorStore()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pendingPlan, processing])

  const submit = () => {
    if (!input.trim()) return
    send(input.trim())
    setInput('')
  }

  const examples = [
    'Create an About page using my existing brand.',
    'Make the hero feel more cinematic.',
    'Simplify the mobile navigation.',
    'Create a testimonials section.',
    'Fix the mobile spacing.',
  ]

  return (
    <div className="fixed right-0 top-10 bottom-[200px] w-[350px] z-[150] bg-[var(--surface)] border-l border-[var(--border)] flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
        <span className="text-[12px] font-semibold text-[var(--text)]">Assistant</span>
        <div className="flex-1" />
        <button
          onClick={() => setLlmMode(!llmMode)}
          className={`text-[10px] px-2 py-0.5 rounded border font-medium ${llmMode ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-tertiary)]'}`}
          title={llmMode ? 'LLM mode enabled' : 'Enable LLM for natural language'}
        >
          {llmMode ? 'LLM' : 'Rules'}
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)]">
          <Icon name="settings" size={13} />
        </button>
        <button onClick={() => setAI(false)} className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)]">
          <Icon name="x" size={13} />
        </button>
      </div>

      {/* LLM Settings (collapsible) */}
      {showSettings && (
        <div className="px-3 py-2 border-b border-[var(--border-subtle)] space-y-2 text-[11px]">
          <label className="block">
            <span className="text-[var(--text-tertiary)] font-medium">API Key</span>
            <input type="password" value={llmConfig.apiKey} onChange={(e) => setLlmConfig({ apiKey: e.target.value })} placeholder="sk-..." className="w-full mt-0.5" />
          </label>
          <label className="block">
            <span className="text-[var(--text-tertiary)] font-medium">Base URL</span>
            <input type="text" value={llmConfig.baseUrl} onChange={(e) => setLlmConfig({ baseUrl: e.target.value })} className="w-full mt-0.5" />
          </label>
          <label className="block">
            <span className="text-[var(--text-tertiary)] font-medium">Model</span>
            <input type="text" value={llmConfig.model} onChange={(e) => setLlmConfig({ model: e.target.value })} className="w-full mt-0.5" />
          </label>
        </div>
      )}

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border-subtle)]'
            }`}>
              {m.content}
              {m.results && (
                <ul className="mt-1.5 space-y-0.5">
                  {m.results.map((r, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-[var(--success)]">
                      <Icon name="check" size={12} className="mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {processing && (
          <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-[12px]">
            <Icon name="sparkles" size={13} className="animate-pulse" />
            {llmMode ? 'Thinking…' : 'Inspecting project…'}
          </div>
        )}

        {/* Change preview */}
        {pendingPlan && (
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="bg-[var(--surface-raised)] px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Proposed changes
            </div>
            <div className="px-3 py-2 space-y-1">
              {pendingPlan.summary.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-[var(--text)]">
                  <Icon name="plus" size={11} className="mt-0.5 text-[var(--accent)] shrink-0" />
                  {s}
                </div>
              ))}
              {pendingPlan.conflicts.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-[var(--warn)]">
                  <Icon name="warning" size={12} className="mt-0.5 shrink-0" />
                  {c}
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 px-3 py-2 border-t border-[var(--border-subtle)]">
              <button onClick={apply} className="flex-1 px-2 py-1.5 rounded bg-[var(--accent)] text-white text-[11.5px] font-medium hover:bg-[var(--accent-hover)]">
                Apply
              </button>
              <button onClick={cancel} className="px-2 py-1.5 rounded border border-[var(--border)] text-[11.5px] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Examples */}
        {messages.length <= 1 && (
          <div className="space-y-1 pt-1">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Try</div>
            {examples.map((e) => (
              <button key={e} onClick={() => setInput(e)} className="block text-left text-[12px] text-[var(--text-secondary)] hover:text-[var(--accent)]">
                "{e}"
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-[var(--border-subtle)] flex gap-1.5">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="Describe a change…"
          className="flex-1 resize-none text-[12px]"
        />
        <button onClick={submit} disabled={!input.trim() || processing} className="px-2.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[11px] font-medium">
          Send
        </button>
      </div>
    </div>
  )
}
