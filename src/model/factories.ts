import type {
  ID,
  Node,
  NodeType,
  StyleModel,
  StylePatch,
} from './types'

export const uid = (): ID => {
  const rand = Math.random().toString(36).slice(2, 9)
  return `${Date.now().toString(36)}${rand}`
}

export function emptyStyle(): StyleModel {
  return {
    layout: { mode: 'block' },
    sizing: {},
    spacing: {},
    typography: {},
    background: {},
    position: {},
  }
}

export interface NodeSeed {
  type: NodeType
  name: string
  tag?: string
  content?: Node['content']
  children?: NodeSeed[]
  style?: StylePatch
  hidden?: boolean
  responsive?: Node['responsive']
  dataBinding?: Node['dataBinding']
  instance?: Node['instance']
  animation?: Node['animation']
  a11y?: Node['a11y']
  interactionIds?: ID[]
}

const DEFAULT_TAGS: Record<NodeType, string> = {
  section: 'section',
  container: 'div',
  text: 'p',
  heading: 'h2',
  button: 'button',
  image: 'img',
  link: 'a',
  video: 'video',
  divider: 'hr',
  icon: 'div',
  form: 'form',
  input: 'input',
  grid: 'div',
  card: 'div',
}

export function buildNode(seed: NodeSeed): Node {
  const style = mergeStyle(emptyStyle(), seed.style)
  return {
    id: uid(),
    type: seed.type,
    name: seed.name,
    tag: seed.tag ?? DEFAULT_TAGS[seed.type],
    content: seed.content ?? {},
    children: (seed.children ?? []).map(buildNode),
    style,
    responsive: seed.responsive ?? {},
    visibility: { hidden: seed.hidden ?? false, locked: false },
    interactionIds: seed.interactionIds ?? [],
    dataBinding: seed.dataBinding,
    instance: seed.instance,
    animation: seed.animation,
    a11y: seed.a11y,
  }
}

export function node(seed: NodeSeed): Node {
  return buildNode(seed)
}

// Uniform padding/margin box from a single token or px value
export function pad(
  v: string | number,
): NonNullable<StyleModel['spacing']['padding']> {
  return { top: v, right: v, bottom: v, left: v }
}

// Drop undefined values so that "undefined === inherit" when layering overrides.
function defined(obj: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!obj) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
  return out
}

// Shallow merge of a full style model with an override patch
export function mergeStyle(
  base: StyleModel,
  patch: StylePatch | undefined,
): StyleModel {
  if (!patch) return base
  return {
    layout: { ...base.layout, ...(defined(patch.layout as Record<string, unknown>) as StyleModel['layout']) },
    sizing: { ...base.sizing, ...(defined(patch.sizing as Record<string, unknown>) as StyleModel['sizing']) },
    spacing: {
      margin: { ...base.spacing.margin, ...(defined(patch.spacing?.margin as Record<string, unknown>) as StyleModel['spacing']['margin']) },
      padding: { ...base.spacing.padding, ...(defined(patch.spacing?.padding as Record<string, unknown>) as StyleModel['spacing']['padding']) },
    },
    typography: { ...base.typography, ...(defined(patch.typography as Record<string, unknown>) as StyleModel['typography']) },
    background: { ...base.background, ...(defined(patch.background as Record<string, unknown>) as StyleModel['background']) },
    position: { ...base.position, ...(defined(patch.position as Record<string, unknown>) as StyleModel['position']) },
  }
}

// Merge two override patches together (used for accumulating variant/responsive overrides)
export function mergeStylePatch(
  a: StylePatch | undefined,
  b: StylePatch | undefined,
): StylePatch {
  if (!a) return b ?? {}
  if (!b) return a
  return {
    layout: { ...(a.layout as object), ...(b.layout as object) } as StylePatch['layout'],
    sizing: { ...(a.sizing as object), ...(b.sizing as object) },
    spacing: {
      margin: { ...(a.spacing?.margin as object), ...(b.spacing?.margin as object) },
      padding: { ...(a.spacing?.padding as object), ...(b.spacing?.padding as object) },
    },
    typography: { ...(a.typography as object), ...(b.typography as object) },
    background: { ...(a.background as object), ...(b.background as object) },
    position: { ...(a.position as object), ...(b.position as object) },
  }
}
