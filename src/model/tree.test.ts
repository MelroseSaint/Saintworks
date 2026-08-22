import { describe, it, expect } from 'vitest'
import { node } from './factories'
import { moveNodeTo } from './tree'

const section = (name: string) => node({ type: 'section', name, tag: 'section' })

describe('moveNodeTo', () => {
  it('reorders a sibling before a target', () => {
    const a = section('A')
    const b = section('B')
    const c = section('C')
    const result = moveNodeTo([a, b, c], a.id, c.id, 'before')
    expect(result.map((n) => n.name)).toEqual(['B', 'A', 'C'])
  })

  it('reorders a sibling after a target', () => {
    const a = section('A')
    const b = section('B')
    const c = section('C')
    const result = moveNodeTo([a, b, c], a.id, c.id, 'after')
    expect(result.map((n) => n.name)).toEqual(['B', 'C', 'A'])
  })

  it('reparents a node into a container', () => {
    const a = section('A')
    const b = section('B')
    const box = node({ type: 'container', name: 'Box', tag: 'div', children: [b] })
    const result = moveNodeTo([a, box], a.id, box.id, 'inside')
    const movedBox = result.find((n) => n.name === 'Box')!
    expect(result.map((n) => n.name)).toEqual(['Box'])
    expect(movedBox.children.map((c) => c.name)).toEqual(['B', 'A'])
  })

  it('refuses to drop a node into its own descendant', () => {
    const grandchild = section('Grandchild')
    const child = node({ type: 'container', name: 'Child', tag: 'div', children: [grandchild] })
    const parent = node({ type: 'container', name: 'Parent', tag: 'div', children: [child] })
    const result = moveNodeTo([parent], parent.id, grandchild.id, 'inside')
    expect(result).toEqual([parent])
  })
})
