import { describe, it, expect } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { lintProject } from './lint'
import { buildNode } from '../model/factories'

describe('lint', () => {
  it('detects duplicate routes', () => {
    const p = createDefaultProject()
    const about = Object.values(p.pages).find((pg) => pg.route === '/about')!
    const contact = Object.values(p.pages).find((pg) => pg.route === '/contact')!
    p.pages[contact.id] = { ...contact, route: '/about' }
    const problems = lintProject(p)
    expect(problems.some((x) => x.kind === 'duplicate-route')).toBe(true)
  })

  it('detects a broken internal link', () => {
    const p = createDefaultProject()
    const home = Object.values(p.pages).find((pg) => pg.route === '/')!
    const badLink = buildNode({
      type: 'link', name: 'Broken', tag: 'a',
      content: { text: 'Broken', href: '/does-not-exist' },
    })
    p.pages[home.id] = { ...home, nodes: [...home.nodes, badLink] }
    const problems = lintProject(p)
    expect(problems.some((x) => x.kind === 'broken-link')).toBe(true)
  })

  it('detects images without alt text', () => {
    const p = createDefaultProject()
    const home = Object.values(p.pages).find((pg) => pg.route === '/')!
    const img = buildNode({ type: 'image', name: 'NoAlt', tag: 'img', content: { src: 'data:image/svg+xml,abc', alt: '' } })
    p.pages[home.id] = { ...home, nodes: [...home.nodes, img] }
    const problems = lintProject(p)
    expect(problems.some((x) => x.kind === 'accessibility' && x.message.includes('alt'))).toBe(true)
  })
})
