import { describe, it, expect } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { generateProject } from './codegen'

describe('codegen', () => {
  it('generates a structured, maintainable project (not one big file)', () => {
    const p = createDefaultProject()
    const files = generateProject(p)
    const paths = files.map((f) => f.path)
    expect(paths.some((x) => x === 'src/styles/tokens.css')).toBe(true)
    expect(paths.some((x) => x.startsWith('src/components/'))).toBe(true)
    expect(paths.some((x) => x.startsWith('src/pages/'))).toBe(true)
    expect(paths.some((x) => x.startsWith('src/data/'))).toBe(true)
    expect(paths.some((x) => x === 'src/routes.ts')).toBe(true)
    // components render as reusable elements, not inline duplication
    const hero = files.find((f) => f.path.includes('Hero'))!
    expect(hero.content).toContain('export default function Hero')
  })

  it('emits CSS variables for tokens', () => {
    const p = createDefaultProject()
    const css = generateProject(p).find((f) => f.path.endsWith('tokens.css'))!
    expect(css.content).toContain('--color-accent')
    expect(css.content).toContain('--space-md')
  })
})
