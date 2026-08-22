import type { Collection, Node, Project } from '../model/types'
import { buildNode, pad, uid } from '../model/factories'
import { flattenNodes } from '../model/tree'
import { useProjectStore } from '../store/projectStore'

export type AIOp =
  | { type: 'create-page'; name: string; route: string; heading: string; body: string }
  | { type: 'cinematic-hero' }
  | { type: 'simplify-mobile-nav' }
  | { type: 'accent-buttons' }
  | { type: 'testimonials-section' }
  | { type: 'fix-mobile-spacing' }
  | { type: 'optimize-load' }

export interface AIPlan {
  summary: string[]
  ops: AIOp[]
  conflicts: string[]
}

function findComponent(project: Project, name: string) {
  return Object.values(project.components).find((c) => c.name.toLowerCase() === name.toLowerCase())
}

export function parseAIRequest(project: Project, request: string): AIPlan {
  const q = request.toLowerCase()
  const summary: string[] = []
  const ops: AIOp[] = []
  const conflicts: string[] = []

  const palette = Object.keys(project.tokens.colors)

  // Conflict detection: a color that isn't in the brand palette
  const colorMatch = q.match(/(?:make|use|change).*?\b(red|blue|green|pink|purple|orange|yellow|teal|black|white|gold|silver)\b/)
  if (colorMatch && !palette.some((c) => c.toLowerCase().includes(colorMatch[1]))) {
    conflicts.push(
      `“${colorMatch[1]}” is not in your brand palette (${palette.join(', ')}). I won't change the brand system silently — add it as a token first or pick an existing color.`,
    )
  }

  if (/(cinematic|dramatic|premium)/.test(q) && (q.includes('hero') || !q.includes('about'))) {
    summary.push('Added a cinematic reveal animation to the Hero heading and image')
    summary.push('Deepened Hero spacing and added a soft surface background')
    ops.push({ type: 'cinematic-hero' })
  }

  if (q.includes('about page') || /create .*about/.test(q)) {
    summary.push('Created an About page using existing brand tokens (heading, body, accent CTA)')
    ops.push({
      type: 'create-page',
      name: 'About',
      route: '/about',
      heading: 'About ' + project.brand.name,
      body: `${project.brand.tagline} ${project.brand.voice.tone}. ${project.brand.imageryRules}`,
    })
  }

  if (/mobile.*(nav|navigation)|(nav|navigation).*simpler/.test(q)) {
    summary.push('Simplified mobile navigation: nav links hide on mobile, keeping the wordmark and CTA')
    ops.push({ type: 'simplify-mobile-nav' })
  }

  if (/primary buttons? .*accent|accent.*buttons?|buttons?.*accent/.test(q)) {
    summary.push('Applied the accent color to all primary buttons')
    ops.push({ type: 'accent-buttons' })
  }

  if (/testimonial/.test(q)) {
    summary.push('Created a Testimonials collection (if missing)')
    summary.push('Added a testimonial grid section bound to the collection')
    ops.push({ type: 'testimonials-section' })
  }

  if (/mobile spacing|spacing.*mobile|fix.*spacing/.test(q)) {
    summary.push('Tightened section padding on mobile')
    ops.push({ type: 'fix-mobile-spacing' })
  }

  if (/load faster|performance|slow|optimize/.test(q)) {
    summary.push('Flagged images for lazy loading')
    summary.push('Suggested deferring non-critical animations to respect reduced motion')
    ops.push({ type: 'optimize-load' })
  }

  if (ops.length === 0 && conflicts.length === 0) {
    summary.push('I inspected the project but did not recognize a safe structural change.')
    summary.push('Try: “make the hero cinematic”, “create an About page”, “simplify mobile navigation”, “add a testimonials section”, “fix mobile spacing”.')
  }

  return { summary, ops, conflicts }
}

// ---------------------------------------------------------------------------
// Apply a plan to the real structured project (not chat text). All ops mutate
// a single clone, then the result is restored atomically — so a multi-op plan
// is applied in one undoable step and later ops never clobber earlier ones.
// ---------------------------------------------------------------------------
export function applyPlan(project: Project, plan: AIPlan): string[] {
  const store = useProjectStore.getState()
  const next = structuredClone(project)
  const results: string[] = []

  const findComp = (name: string) =>
    Object.values(next.components).find((c) => c.name.toLowerCase() === name.toLowerCase())

  for (const op of plan.ops) {
    switch (op.type) {
      case 'create-page': {
        const existing = Object.values(next.pages).find((p) => p.route === op.route)
        if (existing) {
          results.push(`Page “${op.name}” already exists at ${op.route}`)
          break
        }
        const id = uid()
        const layoutId = Object.values(next.layouts)[0]?.id ?? ''
        const section = buildNode({
          type: 'section',
          name: 'Page Intro',
          tag: 'section',
          style: {
            layout: { mode: 'flex', direction: 'vertical', gap: 'MD' },
            spacing: { padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' } },
          },
          children: [
            { type: 'heading', name: 'Page Title', tag: 'h1', content: { text: op.heading }, style: { typography: { fontToken: 'heading', fontSize: 44 } } },
            { type: 'text', name: 'Page Body', tag: 'p', content: { text: op.body }, style: { typography: { fontToken: 'body', fontSize: 18 }, sizing: { maxWidth: 640 } } },
          ],
        })
        next.pages[id] = {
          id,
          name: op.name,
          route: op.route,
          layoutId,
          seo: { title: op.name, description: op.body },
          nodes: [section],
        }
        next.pageOrder = [...next.pageOrder, id]
        results.push(`Created page “${op.name}”`)
        break
      }

      case 'cinematic-hero': {
        const comp = findComp('Hero')
        if (!comp) {
          results.push('No Hero component found to animate')
          break
        }
        const setAnim = (n: Node) => {
          n.animation = {
            id: uid(), preset: 'reveal', duration: 800, delay: 100, easing: 'ease-out', trigger: 'pageLoad', direction: 'up',
          }
        }
        for (const n of flattenNodes([comp.rootNode])) {
          if (n.name.toLowerCase().includes('heading')) setAnim(n)
          if (n.type === 'image') setAnim(n)
        }
        comp.rootNode.style.spacing.padding = { top: 'XXL', bottom: 'XXL', left: 'LG', right: 'LG' }
        comp.rootNode.style.background = { ...comp.rootNode.style.background, colorToken: 'surface' }
        results.push('Made the Hero cinematic (animation + spacing + surface)')
        break
      }

      case 'simplify-mobile-nav': {
        const header = findComp('Header')
        if (!header) {
          results.push('No Header component found')
          break
        }
        for (const n of flattenNodes([header.rootNode])) {
          if (n.name === 'Nav') {
            n.responsive.mobile = { layout: { hidden: true } }
          }
        }
        results.push('Simplified mobile navigation (nav links hidden on mobile)')
        break
      }

      case 'accent-buttons': {
        let count = 0
        const setAccent = (nodes: Node[]) => {
          for (const n of flattenNodes(nodes)) {
            if (n.type === 'button' && (n.style.background.colorToken === 'primary' || n.style.typography.colorToken === 'primary')) {
              n.style.background.colorToken = 'accent'
              n.style.typography.colorToken = 'text.inverse'
              count++
            }
          }
        }
        for (const page of Object.values(next.pages)) setAccent(page.nodes)
        for (const comp of Object.values(next.components)) setAccent([comp.rootNode])
        results.push(`Updated ${count} primary button${count === 1 ? '' : 's'} to the accent color`)
        break
      }

      case 'testimonials-section': {
        let coll = Object.values(next.collections).find((c) => c.name.toLowerCase() === 'testimonials')
        if (!coll) {
          const collId = uid()
          const newColl: Collection = {
            id: collId,
            name: 'Testimonials',
            fields: [
              { key: 'Name', label: 'Name', type: 'text' },
              { key: 'Role', label: 'Role', type: 'text' },
              { key: 'Company', label: 'Company', type: 'text' },
              { key: 'Quote', label: 'Quote', type: 'longtext' },
            ],
            records: [
              { id: uid(), values: { Name: 'Alex Rivera', Role: 'CEO', Company: 'Acme', Quote: 'This is fantastic.' } },
            ],
          }
          next.collections[collId] = newColl
          coll = newColl
        }
        const card = buildNode({
          type: 'card', name: 'Testimonial Card', tag: 'div',
          style: { layout: { mode: 'flex', direction: 'vertical', gap: 'SM' }, spacing: { padding: pad('LG') }, background: { colorToken: 'surface', radiusToken: 'md', borderToken: 'default' } },
          children: [
            { type: 'text', name: 'Quote', tag: 'p', content: { text: '{{Quote}}' }, style: { typography: { fontToken: 'body', fontSize: 16 } } },
            { type: 'heading', name: 'Name', tag: 'h3', content: { text: '{{Name}}' }, style: { typography: { fontToken: 'heading', fontSize: 18 } } },
            { type: 'text', name: 'Role', tag: 'p', content: { text: '{{Role}}, {{Company}}' }, style: { typography: { fontToken: 'body', fontSize: 14 } } },
          ],
        })
        const section = buildNode({
          type: 'section', name: 'Testimonials', tag: 'section',
          style: { layout: { mode: 'flex', direction: 'vertical', gap: 'LG' }, spacing: { padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' } } },
          children: [
            { type: 'heading', name: 'Section Title', tag: 'h2', content: { text: 'What people say' }, style: { typography: { fontToken: 'heading', fontSize: 36 } } },
            buildNode({
              type: 'grid', name: 'Testimonial Grid', tag: 'div', style: { layout: { mode: 'grid', columns: 3, gap: 'LG' } },
              dataBinding: { collectionId: coll.id, mode: 'repeat' },
              children: [card],
            }),
          ],
        })
        const home = Object.values(next.pages).find((p) => p.route === '/') ?? Object.values(next.pages)[0]
        if (home) home.nodes.push(section)
        results.push('Added a testimonials section bound to the collection')
        break
      }

      case 'fix-mobile-spacing': {
        const home = Object.values(next.pages).find((p) => p.route === '/') ?? Object.values(next.pages)[0]
        if (!home) break
        let count = 0
        for (const n of home.nodes) {
          if (n.type === 'section') {
            n.responsive.mobile = { spacing: { padding: { top: 'LG', bottom: 'LG', left: 'MD', right: 'MD' } } }
            count++
          }
        }
        results.push(`Fixed mobile spacing on ${count} section${count === 1 ? '' : 's'}`)
        break
      }

      case 'optimize-load': {
        results.push('Load optimization: images should be lazy-loaded and non-critical animations deferred')
        break
      }
    }
  }

  if (results.length === 0) {
    results.push('No changes were applied.')
  }

  store.restoreSnapshot(next)
  return results
}
