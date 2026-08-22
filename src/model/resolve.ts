import type { CSSProperties } from 'react'
import type {
  BreakpointId,
  ComponentDef,
  ExpandedNode,
  ID,
  Layout,
  Node,
  NodeOrigin,
  Page,
  PropSchema,
  StyleModel,
  TokenSet,
} from './types'
import { emptyStyle, mergeStyle } from './factories'

// ---------------------------------------------------------------------------
// Length & color resolution (token key -> value, number -> px)
// ---------------------------------------------------------------------------
export function length(
  tokens: TokenSet,
  v: string | number | undefined,
): string | undefined {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v === 'number') return `${v}px`
  const s = String(v)
  if (s in tokens.spacing) return `${tokens.spacing[s]}px`
  if (s in tokens.radius) return `${tokens.radius[s]}px`
  const spacingKey = Object.keys(tokens.spacing).find(
    (k) => k.toLowerCase() === s.toLowerCase(),
  )
  if (spacingKey) return `${tokens.spacing[spacingKey]}px`
  const radiusKey = Object.keys(tokens.radius).find(
    (k) => k.toLowerCase() === s.toLowerCase(),
  )
  if (radiusKey) return `${tokens.radius[radiusKey]}px`
  return s
}

export function resolveColor(
  tokens: TokenSet,
  keyOrRaw: string | undefined,
): string | undefined {
  if (!keyOrRaw) return undefined
  return tokens.colors[keyOrRaw] ?? keyOrRaw
}

export function boxCss(
  tokens: TokenSet,
  box: StyleModel['spacing']['margin'] | StyleModel['spacing']['padding'],
): CSSProperties {
  const out: CSSProperties = {}
  if (!box) return out
  if (box.top !== undefined) out.marginTop = length(tokens, box.top)
  if (box.right !== undefined) out.marginRight = length(tokens, box.right)
  if (box.bottom !== undefined) out.marginBottom = length(tokens, box.bottom)
  if (box.left !== undefined) out.marginLeft = length(tokens, box.left)
  return out
}

// ---------------------------------------------------------------------------
// StyleModel -> CSSProperties
// ---------------------------------------------------------------------------
const ALIGN_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  'space-between': 'space-between',
  'space-around': 'space-around',
  'space-evenly': 'space-evenly',
}

export function styleToCss(tokens: TokenSet, style: StyleModel): CSSProperties {
  const css: CSSProperties = {}
  const { layout, sizing, spacing, typography, background, position } = style

  // Layout
  if (layout.hidden) {
    css.display = 'none'
    return css
  }
  if (layout.mode === 'flex') {
    css.display = 'flex'
    css.flexDirection = layout.direction === 'horizontal' ? 'row' : 'column'
    if (layout.align) css.alignItems = ALIGN_MAP[layout.align]
    if (layout.justify) css.justifyContent = ALIGN_MAP[layout.justify]
    if (layout.gap !== undefined) css.gap = length(tokens, layout.gap)
    if (layout.wrap) css.flexWrap = 'wrap'
  } else if (layout.mode === 'grid') {
    css.display = 'grid'
    if (layout.columns) {
      css.gridTemplateColumns = `repeat(${layout.columns}, minmax(0, 1fr))`
    }
    if (layout.rows) css.gridTemplateRows = `repeat(${layout.rows}, minmax(0, 1fr))`
    if (layout.align) css.alignItems = ALIGN_MAP[layout.align]
    if (layout.justify) css.justifyContent = ALIGN_MAP[layout.justify]
    if (layout.gap !== undefined) css.gap = length(tokens, layout.gap)
  } else if (layout.mode === 'absolute') {
    css.position = 'absolute'
  }

  // Sizing
  if (sizing.width !== undefined) css.width = length(tokens, sizing.width)
  if (sizing.minWidth !== undefined) css.minWidth = length(tokens, sizing.minWidth)
  if (sizing.maxWidth !== undefined) css.maxWidth = length(tokens, sizing.maxWidth)
  if (sizing.height !== undefined) css.height = length(tokens, sizing.height)
  if (sizing.minHeight !== undefined) css.minHeight = length(tokens, sizing.minHeight)
  if (sizing.maxHeight !== undefined) css.maxHeight = length(tokens, sizing.maxHeight)
  if (sizing.fit) css.objectFit = sizing.fit

  // Spacing
  if (spacing.margin) Object.assign(css, boxCss(tokens, spacing.margin))
  if (spacing.padding) {
    const p = boxCss(tokens, spacing.padding)
    css.paddingTop = p.marginTop
    css.paddingRight = p.marginRight
    css.paddingBottom = p.marginBottom
    css.paddingLeft = p.marginLeft
  }

  // Typography (token font -> text style defaults -> explicit overrides)
  const ts = typography.fontToken ? tokens.textStyles[typography.fontToken] : undefined
  if (ts) {
    const family = tokens.fonts[ts.familyId]
    if (family) css.fontFamily = family.stack
  }
  if (typography.fontSize !== undefined) {
    css.fontSize = `${typography.fontSize}px`
  } else if (ts) {
    css.fontSize = `${ts.size}px`
  }
  if (typography.fontWeight !== undefined) {
    css.fontWeight = typography.fontWeight
  } else if (ts) {
    css.fontWeight = ts.weight
  }
  if (typography.lineHeight !== undefined) {
    css.lineHeight = typography.lineHeight
  } else if (ts) {
    css.lineHeight = ts.lineHeight
  }
  const ls = typography.letterSpacing !== undefined ? typography.letterSpacing : ts?.letterSpacing
  if (ls !== undefined && ls !== 0) {
    css.letterSpacing = Math.abs(ls) < 0.5 ? `${ls}em` : `${ls}px`
  }
  if (typography.align) css.textAlign = typography.align
  const typoColor = resolveColor(
    tokens,
    typography.colorToken ?? ts?.colorToken,
  )
  if (typoColor) css.color = typoColor

  // Background
  if (background.color) css.backgroundColor = background.color
  else if (background.colorToken) {
    const c = resolveColor(tokens, background.colorToken)
    if (c) css.backgroundColor = c
  }
  if (background.radiusToken) {
    css.borderRadius = length(tokens, background.radiusToken)
  }
  if (background.shadowToken) {
    css.boxShadow = tokens.shadows[background.shadowToken]
  }
  if (background.borderToken) {
    css.border = tokens.borders[background.borderToken]
  }
  if (background.overflow) css.overflow = background.overflow

  // Position (absolute)
  if (position.top !== undefined) css.top = length(tokens, position.top)
  if (position.right !== undefined) css.right = length(tokens, position.right)
  if (position.bottom !== undefined) css.bottom = length(tokens, position.bottom)
  if (position.left !== undefined) css.left = length(tokens, position.left)

  return css
}

export function effectiveStyle(
  node: Node,
  bp: BreakpointId,
  tokens: TokenSet,
): CSSProperties {
  const overrides = node.responsive?.[bp]
  const merged = overrides ? mergeStyle(node.style, overrides) : node.style
  return styleToCss(tokens, merged)
}

// ---------------------------------------------------------------------------
// Prop application
// ---------------------------------------------------------------------------
function applyProp(node: Node, prop: PropSchema, value: string | number | boolean) {
  switch (prop.type) {
    case 'text':
      node.content.text = String(value)
      break
    case 'link':
      node.content.href = String(value)
      break
    case 'image':
      node.content.src = String(value)
      break
    case 'color':
      node.style.typography.colorToken = String(value)
      break
    case 'select':
      node.content.text = String(value)
      break
    case 'align':
      node.style.typography.align = String(value) as Node['style']['typography']['align']
      break
    case 'theme':
      node.style.background.colorToken = String(value)
      break
    case 'boolean':
      node.visibility.hidden = value === false
      break
  }
}

// ---------------------------------------------------------------------------
// Component instance expansion
// ---------------------------------------------------------------------------
function withOrigin(
  node: Node,
  makeOrigin: (n: Node) => NodeOrigin,
  components: Record<ID, ComponentDef>,
): ExpandedNode {
  const children = node.children.map((c) =>
    c.instance
      ? expandNode(c, makeOrigin(c), components)
      : withOrigin(c, makeOrigin, components),
  )
  return { ...node, origin: makeOrigin(node), children }
}

export function expandNode(
  node: Node,
  fallbackOrigin: NodeOrigin,
  components: Record<ID, ComponentDef>,
): ExpandedNode {
  if (node.instance) {
    const master = components[node.instance.componentId]
    if (!master) {
      return {
        ...structuredClone(node),
        origin: fallbackOrigin,
        children: [],
        content: { ...node.content, text: '[Missing component]' },
      }
    }
    const inst = node.instance
    const variant = master.variants.find((v) => v.id === inst.variantId)
    const root = structuredClone(master.rootNode)

    const walk = (n: Node, isRoot: boolean) => {
      if (isRoot && variant) n.style = mergeStyle(n.style, variant.styleOverrides)
      const ov = inst.nodeOverrides[n.id]
      if (ov) {
        if (ov.style) n.style = mergeStyle(n.style, ov.style)
        if (ov.content) n.content = { ...n.content, ...ov.content }
        if (ov.hidden !== undefined) n.visibility.hidden = ov.hidden
      }
      for (const [propKey, ids] of Object.entries(master.propBindings)) {
        if (ids.includes(n.id) && propKey in inst.props) {
          const prop = master.propsSchema.find((p) => p.key === propKey)
          if (prop) applyProp(n, prop, inst.props[propKey])
        }
      }
      n.children.forEach((c) => walk(c, false))
    }
    walk(root, true)

    const expanded = withOrigin(
      root,
      (n) => ({
        kind: 'component-instance',
        instanceNodeId: node.id,
        masterNodeId: n.id,
      }),
      components,
    )
    // Attach the live instance ref so the inspector can read props/variant
    return { ...expanded, instance: inst }
  }

  return withOrigin(
    node,
    (n) => {
      if (fallbackOrigin.kind === 'component-master') {
        return {
          kind: 'component-master',
          componentId: fallbackOrigin.componentId,
          nodeId: n.id,
        }
      }
      if (fallbackOrigin.kind === 'layout') {
        return { kind: 'layout', nodeId: n.id }
      }
      return { kind: 'page', nodeId: n.id }
    },
    components,
  )
}

export function expandPageNodes(
  nodes: Node[],
  components: Record<ID, ComponentDef>,
): ExpandedNode[] {
  return nodes.map((n) => expandNode(n, { kind: 'page', nodeId: n.id }, components))
}

export function expandComponentMaster(
  component: ComponentDef,
  components: Record<ID, ComponentDef>,
): ExpandedNode {
  return expandNode(
    component.rootNode,
    { kind: 'component-master', componentId: component.id, nodeId: component.rootNode.id },
    components,
  )
}

// Build the full rendered tree for a page: layout frame (header/footer chrome)
// with the page's nodes injected into the content slot.
export function expandPageWithLayout(
  page: Page,
  project: { layouts: Record<ID, Layout>; components: Record<ID, ComponentDef> },
): ExpandedNode {
  const layout = project.layouts[page.layoutId]

  // Collect ids of the page's own nodes so we can assign them a 'page' origin
  // after they are injected into the layout frame (chrome keeps 'layout').
  const pageNodeIds = new Set<ID>()
  const collect = (nodes: Node[]) => {
    for (const n of nodes) {
      pageNodeIds.add(n.id)
      collect(n.children)
    }
  }
  collect(page.nodes)

  let raw: Node
  if (!layout) {
    raw = {
      id: `page-${page.id}`,
      type: 'section',
      name: page.name,
      tag: 'div',
      content: {},
      children: structuredClone(page.nodes),
      style: emptyStyle(),
      responsive: {},
      visibility: { hidden: false, locked: false },
      interactionIds: [],
    }
  } else {
    const frame = structuredClone(layout.frame)
    const transform = (node: Node): Node[] => {
      const slot = node as Node & { isSlot?: boolean }
      if (slot.isSlot) return page.nodes.map((n) => structuredClone(n))
      const children = node.children.flatMap(transform)
      return [{ ...node, children }]
    }
    raw = transform(frame)[0]
  }

  // Walk the combined tree assigning per-node origins: page nodes -> 'page',
  // layout chrome -> 'layout', component instances -> expanded instance tree.
  const build = (n: Node): ExpandedNode => {
    if (n.instance) {
      return expandNode(n, { kind: 'page', nodeId: n.id }, project.components)
    }
    const origin: NodeOrigin = pageNodeIds.has(n.id)
      ? { kind: 'page', nodeId: n.id }
      : { kind: 'layout', nodeId: n.id }
    return { ...n, origin, children: n.children.map(build) }
  }
  return build(raw)
}
