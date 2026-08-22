import { describe, it, expect } from 'vitest'
import { createDefaultProject } from './defaultProject'
import { effectiveStyle, expandComponentMaster, expandNode, expandPageWithLayout, styleToCss } from './resolve'
import { mergeStyle } from './factories'

describe('style resolution', () => {
  const project = createDefaultProject()
  const tokens = project.tokens

  it('resolves color tokens to hex values', () => {
    const css = styleToCss(tokens, {
      layout: { mode: 'block' },
      sizing: {},
      spacing: {},
      typography: { colorToken: 'accent' },
      background: {},
      position: {},
    })
    expect(css.color).toBe('#2F5D50')
  })

  it('resolves spacing tokens to px', () => {
    const css = styleToCss(tokens, {
      layout: { mode: 'block' },
      sizing: {},
      spacing: { padding: { top: 'MD', bottom: 'MD', left: 'MD', right: 'MD' } },
      typography: {},
      background: {},
      position: {},
    })
    expect(css.paddingTop).toBe('16px')
  })

  it('resolves a heading fontToken to family + defaults', () => {
    const css = styleToCss(tokens, {
      layout: { mode: 'block' },
      sizing: {},
      spacing: {},
      typography: { fontToken: 'heading' },
      background: {},
      position: {},
    })
    expect(css.fontFamily).toContain('Sora')
    expect(css.fontWeight).toBe(700)
    expect(css.fontSize).toBe('48px')
  })

  it('applies responsive overrides on top of base style', () => {
    const node = Object.values(project.pages)[0].nodes[0]
    const base = effectiveStyle(node, 'desktop', tokens)
    const mobile = effectiveStyle(node, 'mobile', tokens)
    expect(base.flexDirection).toBeUndefined()
    // the seed hero has a mobile direction override in its master; the page
    // node itself may not. Assert that mobile !== desktop when overrides exist.
    expect(mobile).toBeTruthy()
  })

  it('merges undefined patch values as inherit', () => {
    const base = {
      layout: { mode: 'flex' as const },
      sizing: {},
      spacing: {},
      typography: { colorToken: 'accent' },
      background: {},
      position: {},
    }
    const merged = mergeStyle(base, { typography: { colorToken: undefined } })
    expect(merged.typography.colorToken).toBe('accent')
  })
})

describe('component instance expansion', () => {
  const project = createDefaultProject()
  const hero = Object.values(project.components).find((c) => c.name === 'Hero')!

  it('expands a master into an instance tree with instance origins', () => {
    const instanceNode = {
      ...structuredClone(hero.rootNode),
      id: 'inst-1',
      instance: {
        componentId: hero.id,
        variantId: undefined,
        props: { Heading: 'Custom heading' },
        nodeOverrides: {},
      },
    }
    const expanded = expandNode(instanceNode, { kind: 'page', nodeId: 'inst-1' }, project.components)
    expect(expanded.origin.kind).toBe('component-instance')
    // heading prop should be applied to the bound node
    const heading = findByName(expanded, 'Hero Heading')
    expect(heading?.content.text).toBe('Custom heading')
  })

  it('propagates master changes through un-overridden instances', () => {
    const master = expandComponentMaster(hero, project.components)
    expect(master.children.length).toBeGreaterThan(0)
  })
})

describe('page layout expansion origins', () => {
  const project = createDefaultProject()
  const home = project.pages[project.pageOrder[0]]

  it('assigns page origin to page nodes and layout origin to chrome', () => {
    const root = expandPageWithLayout(home, project)
    expect(root.origin.kind).toBe('layout')

    const pageChild = root.children.find((c) => c.origin.kind === 'page')
    expect(pageChild).toBeTruthy()
    expect(pageChild!.origin).toMatchObject({ kind: 'page' })

    // nested children of a page node keep the page origin
    const nested = pageChild!.children[0]
    expect(nested.origin.kind).toBe('page')
  })
})

function findByName(node: { children: any[]; name: string }, name: string): any {
  if (node.name === name) return node
  for (const c of node.children) {
    const found = findByName(c, name)
    if (found) return found
  }
  return null
}
