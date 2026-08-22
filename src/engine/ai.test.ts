import { describe, it, expect } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { parseAIRequest, applyPlan, type AIPlan } from './ai'
import { useProjectStore } from '../store/projectStore'

describe('AI engine', () => {
  const project = createDefaultProject()

  it('recognizes the cinematic hero intent', () => {
    const plan = parseAIRequest(project, 'Make the hero feel more cinematic')
    expect(plan.ops.some((o) => o.type === 'cinematic-hero')).toBe(true)
    expect(plan.conflicts).toHaveLength(0)
  })

  it('recognizes the testimonials intent', () => {
    const plan = parseAIRequest(project, 'Create a testimonials section')
    expect(plan.ops.some((o) => o.type === 'testimonials-section')).toBe(true)
  })

  it('flags off-brand colors as a conflict instead of silently changing the brand', () => {
    const plan = parseAIRequest(project, 'Make everything pink')
    expect(plan.conflicts.length).toBeGreaterThan(0)
    expect(plan.conflicts[0]).toContain('pink')
  })

  it('always produces a reviewable plan', () => {
    const plan = parseAIRequest(project, 'Simplify the mobile navigation')
    expect(plan.summary.length).toBeGreaterThan(0)
  })

  it('applies multi-op plans without clobbering earlier changes', () => {
    const before = createDefaultProject()
    const plan: AIPlan = {
      summary: ['Create a pricing page', 'Recolor primary buttons'],
      conflicts: [],
      ops: [
        { type: 'create-page', name: 'Pricing', route: '/pricing', heading: 'Pricing', body: 'Simple, honest pricing.' },
        { type: 'accent-buttons' },
      ],
    }
    applyPlan(before, plan)
    const after = useProjectStore.getState().project

    // The page created by the first op must survive the second op.
    const pricing = Object.values(after.pages).find((p) => p.route === '/pricing')
    expect(pricing).toBeTruthy()
    expect(pricing!.nodes.length).toBeGreaterThan(0)
  })
})
