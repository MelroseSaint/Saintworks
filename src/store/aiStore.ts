import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { parseAIRequest, applyPlan, type AIPlan } from '../engine/ai'
import { callLLM, type LLMConfig } from '../engine/llm'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  plan?: AIPlan
  results?: string[]
}

interface AIState {
  messages: AIMessage[]
  pendingPlan: AIPlan | null
  processing: boolean
  llmMode: boolean
  llmConfig: LLMConfig
  send: (request: string) => void
  apply: () => void
  cancel: () => void
  clear: () => void
  setLlmMode: (v: boolean) => void
  setLlmConfig: (patch: Partial<LLMConfig>) => void
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      messages: [
        {
          role: 'assistant',
          content:
            'I can inspect your project and propose structured changes. Enable LLM mode for natural language understanding, or use the built-in rules engine.',
        },
      ],
      pendingPlan: null,
      processing: false,
      llmMode: false,
      llmConfig: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      },

      setLlmMode: (v) => set({ llmMode: v }),
      setLlmConfig: (patch) => set((s) => ({ llmConfig: { ...s.llmConfig, ...patch } })),

      send: async (request) => {
        const project = useProjectStore.getState().project
        const { llmMode, llmConfig } = get()
        set((s) => ({
          messages: [...s.messages, { role: 'user', content: request }],
          processing: true,
        }))

        try {
          let plan: AIPlan
          if (llmMode && llmConfig.apiKey) {
            plan = await callLLM(llmConfig, project, request)
          } else {
            // Fall back to deterministic engine with a small delay
            await new Promise((r) => setTimeout(r, 400))
            plan = parseAIRequest(project, request)
          }

          set((s) => ({
            processing: false,
            pendingPlan: plan,
            messages: [
              ...s.messages,
              {
                role: 'assistant',
                content: plan.conflicts.length
                  ? 'Here is my proposed change plan. Note the conflicts flagged below.'
                  : 'Here is my proposed change plan. Review it before applying.',
                plan,
              },
            ],
          }))
        } catch (err) {
          set((s) => ({
            processing: false,
            messages: [
              ...s.messages,
              {
                role: 'assistant',
                content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}. Falling back to rules engine.`,
              },
            ],
          }))
          // Retry with rules engine
          const plan = parseAIRequest(project, request)
          set((s) => ({
            pendingPlan: plan,
            messages: [
              ...s.messages,
              {
                role: 'assistant',
                content: 'Here is what I can do with the built-in engine:',
                plan,
              },
            ],
          }))
        }
      },

      apply: () => {
        const plan = get().pendingPlan
        if (!plan) return
        const project = useProjectStore.getState().project
        const results = applyPlan(project, plan)
        useEditorStore.getState().log(`AI applied ${plan.ops.length} change(s)`, 'success')
        useEditorStore.getState().recordChange('AI assistant applied changes', 'component')
        set((s) => ({
          pendingPlan: null,
          messages: [...s.messages, { role: 'assistant', content: 'Applied. Here\'s what changed:', results }],
        }))
      },

      cancel: () => set({ pendingPlan: null }),
      clear: () => set({ messages: [], pendingPlan: null }),
    }),
    {
      name: 'saintworks-ai',
      partialize: (s) => ({
        llmMode: s.llmMode,
        llmConfig: s.llmConfig,
      }),
    },
  ),
)
