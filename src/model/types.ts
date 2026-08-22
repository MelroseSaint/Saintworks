// ---------------------------------------------------------------------------
// SaintWorks — core data model
// Three layers, never flattened: Brand -> Design System -> Website
// ---------------------------------------------------------------------------

export type ID = string
export type BreakpointId = 'desktop' | 'tablet' | 'mobile'

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export type StylePatch = DeepPartial<StyleModel>

// ---------------------------------------------------------------------------
// Brand (layer 1 — what the company looks and sounds like)
// ---------------------------------------------------------------------------
export interface Brand {
  name: string
  tagline: string
  logoAssetId: ID | null
  voice: { tone: string; keywords: string[] }
  imageryRules: string
}

// ---------------------------------------------------------------------------
// Design system (layer 2 — how the rules are implemented)
// ---------------------------------------------------------------------------
export interface FontFamily {
  id: ID
  name: string
  stack: string // CSS font-family value
}

export interface TextStyle {
  id: ID
  name: string // e.g. Heading, Body, Eyebrow
  familyId: ID
  weight: number
  size: number // base px (desktop)
  lineHeight: number
  letterSpacing: number
  colorToken: string // key into tokens.colors
}

export interface TokenSet {
  colors: Record<string, string> // id -> hex/rgb value (keys may be dotted, e.g. "text.body")
  fonts: Record<string, FontFamily>
  textStyles: Record<string, TextStyle>
  spacing: Record<string, number> // XS/SM/MD/LG/XL -> px
  radius: Record<string, number>
  shadows: Record<string, string>
  borders: Record<string, string>
  breakpoints: { desktop: number; tablet: number; mobile: number }
  motion: Record<string, { duration: number; easing: string }>
}

// ---------------------------------------------------------------------------
// Style model — human-readable, never raw CSS jargon
// ---------------------------------------------------------------------------
export interface SpacingBox {
  top?: string | number
  right?: string | number
  bottom?: string | number
  left?: string | number
}

export type AlignValue = 'start' | 'center' | 'end' | 'stretch'
export type JustifyValue =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'

export interface StyleModel {
  layout: {
    mode: 'block' | 'flex' | 'grid' | 'absolute'
    direction?: 'horizontal' | 'vertical'
    align?: AlignValue
    justify?: JustifyValue
    gap?: string | number
    columns?: number
    rows?: number
    wrap?: boolean
    hidden?: boolean // display:none (used for per-breakpoint hiding)
  }
  sizing: {
    width?: string | number
    minWidth?: string | number
    maxWidth?: string | number
    height?: string | number
    minHeight?: string | number
    maxHeight?: string | number
    fit?: 'fill' | 'cover' | 'contain'
  }
  spacing: {
    margin?: SpacingBox
    padding?: SpacingBox
  }
  typography: {
    fontToken?: string // textStyles id
    fontSize?: number
    fontWeight?: number
    lineHeight?: number
    letterSpacing?: number
    align?: 'left' | 'center' | 'right' | 'justify'
    colorToken?: string
  }
  background: {
    colorToken?: string
    color?: string // raw value — flagged as an override
    imageAssetId?: ID
    radiusToken?: string
    shadowToken?: string
    borderToken?: string
    overflow?: 'visible' | 'hidden'
  }
  position: {
    top?: string | number
    right?: string | number
    bottom?: string | number
    left?: string | number
  }
}

// ---------------------------------------------------------------------------
// Website (layer 3 — where the rules are used)
// ---------------------------------------------------------------------------
export type NodeType =
  | 'section'
  | 'container'
  | 'text'
  | 'heading'
  | 'button'
  | 'image'
  | 'link'
  | 'video'
  | 'divider'
  | 'icon'
  | 'form'
  | 'input'
  | 'grid'
  | 'card'

export interface NodeContent {
  text?: string
  src?: string // asset id or external URL
  href?: string
  alt?: string
  action?: string // button click label (for interactions)
}

export type AnimationPreset =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'reveal'
  | 'blur'
  | 'rotate'

export interface Animation {
  id: ID
  preset: AnimationPreset
  duration: number // ms
  delay: number // ms
  easing: string
  trigger: 'pageLoad' | 'enterViewport' | 'hover' | 'click'
  direction: 'up' | 'down' | 'left' | 'right' | 'none'
}

export interface NodeDataBinding {
  collectionId: ID
  mode: 'single' | 'repeat'
  field?: string // field key bound to text content
}

export interface NodeInstanceRef {
  componentId: ID
  variantId?: ID
  props: Record<string, string | number | boolean>
  nodeOverrides: Record<
    string,
    { style?: StylePatch; content?: Partial<NodeContent>; hidden?: boolean }
  >
}

export interface Node {
  id: ID
  type: NodeType
  name: string
  tag: string // semantic tag for codegen & a11y (div/section/h1/h2/p/a/img/button/video/...)
  content: NodeContent
  children: Node[]
  style: StyleModel
  responsive: Partial<Record<BreakpointId, StylePatch>>
  visibility: { hidden: boolean; locked: boolean }
  interactionIds: ID[]
  animation?: Animation
  dataBinding?: NodeDataBinding
  instance?: NodeInstanceRef
  a11y?: { ariaLabel?: string; role?: string }
}

export interface PropSchema {
  key: string
  label: string
  type:
    | 'text'
    | 'link'
    | 'image'
    | 'color'
    | 'select'
    | 'align'
    | 'theme'
    | 'boolean'
  default: string | number | boolean
  options?: string[]
  tokenBinding?: string // e.g. "colors.primary"
}

export interface ComponentVariant {
  id: ID
  name: string
  styleOverrides: StylePatch
}

export interface ComponentDef {
  id: ID
  name: string
  category: string // e.g. "Buttons", "Sections", "Heroes"
  description?: string
  propsSchema: PropSchema[]
  variants: ComponentVariant[]
  rootNode: Node
  // prop key -> master node ids whose content/style is bound to that prop
  propBindings: Record<string, string[]>
}

export interface Layout {
  id: ID
  name: string
  // frame node tree; exactly one node carries isSlot === true
  frame: Node & { isSlot?: boolean }
}

export interface Page {
  id: ID
  name: string
  route: string
  layoutId: ID
  seo: { title: string; description: string }
  nodes: Node[]
}

export type AssetKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'font'
  | 'logo'
  | 'icon'
  | 'document'

export interface Asset {
  id: ID
  name: string
  kind: AssetKind
  folder: string // e.g. "Images", "Logos"
  mime: string
  size: number
}

export type FieldType =
  | 'text'
  | 'longtext'
  | 'image'
  | 'number'
  | 'boolean'
  | 'select'

export interface CollectionField {
  key: string
  label: string
  type: FieldType
  options?: string[]
}

export interface CollectionRecord {
  id: ID
  values: Record<string, string | number | boolean>
}

export interface Collection {
  id: ID
  name: string
  fields: CollectionField[]
  records: CollectionRecord[]
}

export type TriggerType =
  | 'click'
  | 'hover'
  | 'scroll'
  | 'pageLoad'
  | 'formSubmit'
  | 'enterViewport'

export type ActionType =
  | 'show'
  | 'hide'
  | 'animate'
  | 'navigate'
  | 'openModal'
  | 'playMedia'
  | 'changeState'
  | 'submitForm'

export interface Interaction {
  id: ID
  name: string
  trigger: TriggerType
  action: ActionType
  targetId: ID | null
  params: Record<string, string>
}

// ---------------------------------------------------------------------------
// Project — the whole document (persisted + undoable)
// ---------------------------------------------------------------------------
export interface Project {
  id: ID
  name: string
  version: number
  brand: Brand
  tokens: TokenSet
  components: Record<ID, ComponentDef>
  layouts: Record<ID, Layout>
  pages: Record<ID, Page>
  pageOrder: ID[]
  assets: Record<ID, Asset> // metadata only; blobs live in IndexedDB
  collections: Record<ID, Collection>
  interactions: Record<ID, Interaction>
  navigation: { label: string; pageId: ID | null; href?: string }[]
  settings: {
    homepageId: ID | null
    siteTitle: string
    publishedAt: string | null
  }
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Problems (lint output)
// ---------------------------------------------------------------------------
export type ProblemSeverity = 'error' | 'warning' | 'info'
export type ProblemKind =
  | 'missing-image'
  | 'broken-link'
  | 'missing-page'
  | 'duplicate-route'
  | 'invalid-component'
  | 'missing-content'
  | 'accessibility'
  | 'brand-consistency'
  | 'mobile-overflow'
  | 'missing-seo'

export interface Problem {
  id: ID
  severity: ProblemSeverity
  kind: ProblemKind
  message: string
  pageId?: ID
  nodeId?: ID
  fixHint?: string
}

// ---------------------------------------------------------------------------
// Runtime selection origin — used to know WHERE an edit should be written
// ---------------------------------------------------------------------------
export type NodeOrigin =
  | { kind: 'page'; nodeId: ID }
  | { kind: 'layout'; nodeId: ID }
  | { kind: 'component-master'; componentId: ID; nodeId: ID }
  | { kind: 'component-instance'; instanceNodeId: ID; masterNodeId: ID }

export interface ExpandedNode extends Node {
  origin: NodeOrigin
  children: ExpandedNode[]
}
