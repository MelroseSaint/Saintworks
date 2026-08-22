import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'
import { produce } from 'immer'
import type {
  Animation,
  Asset,
  Brand,
  BreakpointId,
  Collection,
  CollectionField,
  CollectionRecord,
  ComponentDef,
  ComponentVariant,
  ID,
  Interaction,
  Layout,
  Node,
  NodeDataBinding,
  NodeInstanceRef,
  NodeOrigin,
  Page,
  Project,
  StyleModel,
  StylePatch,
  TokenSet,
} from '../model/types'
import { createDefaultProject } from '../model/defaultProject'
import { emptyStyle, mergeStyle, mergeStylePatch, node as buildNode, pad, uid } from '../model/factories'
import {
  duplicateNodeDeep,
  findNode,
  findParent,
  findParentList,
  insertNode,
  moveNode,
  moveNodeTo,
  removeNode,
  reorderSiblings,
  replaceNode,
  updateNode,
} from '../model/tree'

export type StylePath = keyof StyleModel

export interface ProjectState {
  project: Project
}

// ---------------------------------------------------------------------------
// Origin-aware node editing helpers
// ---------------------------------------------------------------------------
function editPageNode(
  project: Project,
  nodeId: ID,
  fn: (n: Node) => void,
): Project {
  for (const pid of Object.keys(project.pages)) {
    const page = project.pages[pid]
    if (findNode(page.nodes, nodeId)) {
      const nodes = updateNode(page.nodes, nodeId, (n) => {
        const copy = structuredClone(n)
        fn(copy)
        return copy
      })
      return {
        ...project,
        pages: { ...project.pages, [pid]: { ...page, nodes } },
      }
    }
  }
  return project
}

function editLayoutNode(
  project: Project,
  nodeId: ID,
  fn: (n: Node) => void,
): Project {
  for (const lid of Object.keys(project.layouts)) {
    const layout = project.layouts[lid]
    if (findNode([layout.frame], nodeId)) {
      const frame = updateNode([layout.frame], nodeId, (n) => {
        const copy = structuredClone(n)
        fn(copy)
        return copy
      })[0]
      return {
        ...project,
        layouts: { ...project.layouts, [lid]: { ...layout, frame } },
      }
    }
  }
  return project
}

function editMasterNode(
  project: Project,
  componentId: ID,
  nodeId: ID,
  fn: (n: Node) => void,
): Project {
  const comp = project.components[componentId]
  if (!comp) return project
  const root = updateNode([comp.rootNode], nodeId, (n) => {
    const copy = structuredClone(n)
    fn(copy)
    return copy
  })[0]
  return {
    ...project,
    components: { ...project.components, [componentId]: { ...comp, rootNode: root } },
  }
}

// Find and edit an instance node across pages, layouts and component masters
function findInstanceLocation(
  project: Project,
  instanceNodeId: ID,
): { nodes: Node[]; kind: 'page' | 'layout' | 'component'; key: ID } | null {
  for (const pid of Object.keys(project.pages)) {
    if (findNode(project.pages[pid].nodes, instanceNodeId)) {
      return { nodes: project.pages[pid].nodes, kind: 'page', key: pid }
    }
  }
  for (const lid of Object.keys(project.layouts)) {
    const frame = project.layouts[lid].frame
    if (findNode([frame], instanceNodeId)) {
      return { nodes: [frame], kind: 'layout', key: lid }
    }
  }
  for (const cid of Object.keys(project.components)) {
    const root = project.components[cid].rootNode
    if (findNode([root], instanceNodeId)) {
      return { nodes: [root], kind: 'component', key: cid }
    }
  }
  return null
}

function editInstanceNode(
  project: Project,
  instanceNodeId: ID,
  fn: (n: Node) => void,
): Project {
  const loc = findInstanceLocation(project, instanceNodeId)
  if (!loc) return project
  const nextNodes = updateNode(loc.nodes, instanceNodeId, (n) => {
    const copy = structuredClone(n)
    fn(copy)
    return copy
  })
  if (loc.kind === 'page') {
    const page = project.pages[loc.key]
    return { ...project, pages: { ...project.pages, [loc.key]: { ...page, nodes: nextNodes } } }
  }
  if (loc.kind === 'layout') {
    const layout = project.layouts[loc.key]
    return { ...project, layouts: { ...project.layouts, [loc.key]: { ...layout, frame: nextNodes[0] } } }
  }
  const comp = project.components[loc.key]
  return { ...project, components: { ...project.components, [loc.key]: { ...comp, rootNode: nextNodes[0] } } }
}

// Apply a node-level edit based on its origin
function editOrigin(
  project: Project,
  origin: NodeOrigin,
  fn: (n: Node) => void,
): Project {
  if (origin.kind === 'page') return editPageNode(project, origin.nodeId, fn)
  if (origin.kind === 'layout') return editLayoutNode(project, origin.nodeId, fn)
  if (origin.kind === 'component-master') {
    return editMasterNode(project, origin.componentId, origin.nodeId, fn)
  }
  // component-instance: write into nodeOverrides of the instance node
  const { instanceNodeId, masterNodeId } = origin
  const loc = findInstanceLocation(project, instanceNodeId)
  if (!loc) return project
  const instanceNode = findNode(loc.nodes, instanceNodeId)
  if (!instanceNode?.instance) return project
  const overrides = instanceNode.instance.nodeOverrides[masterNodeId] ?? {}
  const nextOverrides = produce(overrides, (draft) => fn2(draft, fn))
  const updated: NodeInstanceRef = {
    ...instanceNode.instance,
    nodeOverrides: { ...instanceNode.instance.nodeOverrides, [masterNodeId]: nextOverrides },
  }
  return editInstanceNode(project, instanceNodeId, (n) => {
    n.instance = updated
  })
}

// fn2 runs inside an override draft: converts style/content edits on a virtual
// node into nodeOverrides entries. For simplicity the caller passes a function
// that mutates a real node; we map that onto { style, content, hidden }.
function fn2(
  draft: NonNullable<NodeInstanceRef['nodeOverrides'][string]>,
  fn: (n: Node) => void,
): NonNullable<NodeInstanceRef['nodeOverrides'][string]> {
  const virtual: Node = {
    id: '',
    type: 'container',
    name: '',
    tag: 'div',
    content: {},
    children: [],
    style: emptyStyle(),
    responsive: {},
    visibility: { hidden: false, locked: false },
    interactionIds: [],
  }
  // seed virtual from existing override
  if (draft?.style) virtual.style = structuredClone(draft.style) as StyleModel
  if (draft?.content) virtual.content = { ...draft.content }
  if (draft?.hidden !== undefined) virtual.visibility.hidden = draft.hidden
  fn(virtual)
  const out: NonNullable<NodeInstanceRef['nodeOverrides'][string]> = {}
  out.style = virtual.style
  if (Object.keys(virtual.content).length) out.content = virtual.content
  if (virtual.visibility.hidden) out.hidden = true
  return out
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export interface ProjectStore extends ProjectState {
  touch: () => void
  setProjectName: (name: string) => void

  // Pages
  addPage: (name: string, route: string) => ID
  renamePage: (id: ID, name: string) => void
  deletePage: (id: ID) => void
  duplicatePage: (id: ID) => ID
  setPageRoute: (id: ID, route: string) => void
  setPageSEO: (id: ID, seo: Page['seo']) => void
  setPageLayout: (id: ID, layoutId: ID) => void
  setPageNodes: (id: ID, nodes: Node[]) => void
  reorderPages: (from: number, to: number) => void

  // Nodes (canvas / layers)
  updateNodeAt: (origin: NodeOrigin, updater: (n: Node) => void) => void
  removeNodeAt: (origin: NodeOrigin) => void
  duplicateNodeAt: (origin: NodeOrigin) => void
  renameNodeAt: (origin: NodeOrigin, name: string) => void
  setNodeStyle: (
    origin: NodeOrigin,
    patch: StylePatch,
    bp?: BreakpointId,
  ) => void
  resetNodeStyle: (origin: NodeOrigin, section: StylePath, key: string, bp?: BreakpointId) => void
  setNodeContent: (origin: NodeOrigin, content: Partial<Node['content']>) => void
  setNodeVisibility: (origin: NodeOrigin, patch: Partial<Node['visibility']>) => void
  setNodeAnimation: (origin: NodeOrigin, animation: Animation | undefined) => void
  setNodeDataBinding: (origin: NodeOrigin, binding: NodeDataBinding | undefined) => void
  setNodeTag: (origin: NodeOrigin, tag: string) => void
  setNodeA11y: (origin: NodeOrigin, a11y: Node['a11y']) => void
  insertNodeAt: (parentOrigin: NodeOrigin | null, node: Node, index?: number) => ID
  moveNodeAt: (origin: NodeOrigin, newParentId: ID | null, index: number) => void
  moveNodeToTarget: (origin: NodeOrigin, targetId: ID, position: 'before' | 'after' | 'inside') => void
  moveNodeSibling: (origin: NodeOrigin, dir: -1 | 1) => void
  addNodeToPage: (pageId: ID, node: Node) => void
  addChildNode: (origin: NodeOrigin, node: Node) => void

  // Components
  createComponentFromNode: (origin: NodeOrigin, name: string, category: string) => ID
  addComponent: (name: string, category: string) => ID
  renameComponent: (id: ID, name: string) => void
  deleteComponent: (id: ID) => void
  duplicateComponent: (id: ID) => ID
  setComponentCategory: (id: ID, category: string) => void
  updateComponentNode: (componentId: ID, nodeId: ID, updater: (n: Node) => void) => void
  addComponentProp: (componentId: ID, prop: ComponentDef['propsSchema'][number]) => void
  addComponentVariant: (componentId: ID, name: string) => ID
  removeComponentVariant: (componentId: ID, variantId: ID) => void
  renameComponentVariant: (componentId: ID, variantId: ID, name: string) => void
  updateComponentVariant: (
    componentId: ID,
    variantId: ID,
    overrides: StylePatch,
  ) => void
  setInstanceProp: (origin: NodeOrigin, propKey: string, value: string | number | boolean) => void
  setInstanceVariant: (origin: NodeOrigin, variantId: ID) => void

  // Brand & tokens
  setBrand: (patch: Partial<Brand>) => void
  setTokens: (patch: Partial<TokenSet>) => void
  setColorToken: (key: string, value: string) => void
  addColorToken: (key: string, value: string) => void
  removeColorToken: (key: string) => void
  setSpacingToken: (key: string, value: number) => void
  setRadiusToken: (key: string, value: number) => void
  setShadowToken: (key: string, value: string) => void
  setBorderToken: (key: string, value: string) => void
  setBreakpoint: (bp: BreakpointId, value: number) => void
  setTextStyle: (id: ID, patch: Partial<TokenSet['textStyles'][string]>) => void
  setFont: (id: ID, patch: Partial<TokenSet['fonts'][string]>) => void

  // Assets
  addAsset: (asset: Asset) => void
  removeAsset: (id: ID) => void
  renameAsset: (id: ID, name: string) => void
  moveAsset: (id: ID, folder: string) => void

  // Collections & data
  addCollection: (name: string) => ID
  removeCollection: (id: ID) => void
  renameCollection: (id: ID, name: string) => void
  addField: (collectionId: ID, field: CollectionField) => void
  removeField: (collectionId: ID, key: string) => void
  addRecord: (collectionId: ID) => ID
  updateRecord: (collectionId: ID, recordId: ID, values: CollectionRecord['values']) => void
  removeRecord: (collectionId: ID, recordId: ID) => void

  // Layouts
  addLayout: (name: string) => ID
  removeLayout: (id: ID) => void
  renameLayout: (id: ID, name: string) => void

  // Interactions
  addInteraction: (interaction: Interaction) => void
  updateInteraction: (id: ID, patch: Partial<Interaction>) => void
  removeInteraction: (id: ID) => void
  attachInteraction: (origin: NodeOrigin, interactionId: ID) => void
  detachInteraction: (origin: NodeOrigin, interactionId: ID) => void

  // Navigation & settings
  setNavigation: (links: Project['navigation']) => void
  setSettings: (patch: Partial<Project['settings']>) => void
  setPublishedAt: (ts: string | null) => void
  restoreSnapshot: (snapshot: Project) => void
  resetProject: () => void
}

export const useProjectStore = create<ProjectStore>()(
  temporal(
    persist(
      (set, get) => ({
        project: createDefaultProject(),

        touch: () =>
          set((s) => ({
            project: {
              ...s.project,
              version: s.project.version + 1,
              updatedAt: new Date().toISOString(),
            },
          })),

        setProjectName: (name) =>
          set((s) => ({ project: { ...s.project, name } })),

        // ---------------------------------------------------------- Pages
        addPage: (name, route) => {
          const id = uid()
          const layoutId = Object.values(get().project.layouts)[0]?.id ?? ''
          const page: Page = {
            id,
            name,
            route,
            layoutId,
            seo: { title: name, description: '' },
            nodes: [],
          }
          set((s) => ({
            project: {
              ...s.project,
              pages: { ...s.project.pages, [id]: page },
              pageOrder: [...s.project.pageOrder, id],
            },
          }))
          return id
        },
        renamePage: (id, name) =>
          set((s) => ({
            project: {
              ...s.project,
              pages: {
                ...s.project.pages,
                [id]: { ...s.project.pages[id], name },
              },
            },
          })),
        deletePage: (id) =>
          set(
            produce((s: ProjectStore) => {
              delete s.project.pages[id]
              s.project.pageOrder = s.project.pageOrder.filter((p) => p !== id)
              if (s.project.settings.homepageId === id) s.project.settings.homepageId = null
              s.project.navigation = s.project.navigation.filter((l) => l.pageId !== id)
            }),
          ),
        duplicatePage: (id) => {
          const src = get().project.pages[id]
          const newId = uid()
          const copy: Page = structuredClone(src)
          copy.id = newId
          copy.name = `${src.name} Copy`
          copy.route = `${src.route.replace(/\/$/, '')}-copy`
          set((s) => ({
            project: {
              ...s.project,
              pages: { ...s.project.pages, [newId]: copy },
              pageOrder: [
                ...s.project.pageOrder.slice(
                  0,
                  s.project.pageOrder.indexOf(id) + 1,
                ),
                newId,
                ...s.project.pageOrder.slice(s.project.pageOrder.indexOf(id) + 1),
              ],
            },
          }))
          return newId
        },
        setPageRoute: (id, route) =>
          set((s) => ({
            project: {
              ...s.project,
              pages: { ...s.project.pages, [id]: { ...s.project.pages[id], route } },
            },
          })),
        setPageSEO: (id, seo) =>
          set((s) => ({
            project: {
              ...s.project,
              pages: { ...s.project.pages, [id]: { ...s.project.pages[id], seo } },
            },
          })),
        setPageLayout: (id, layoutId) =>
          set((s) => ({
            project: {
              ...s.project,
              pages: { ...s.project.pages, [id]: { ...s.project.pages[id], layoutId } },
            },
          })),
        setPageNodes: (id, nodes) =>
          set((s) => ({
            project: {
              ...s.project,
              pages: { ...s.project.pages, [id]: { ...s.project.pages[id], nodes } },
            },
          })),
        reorderPages: (from, to) =>
          set(
            produce((s: ProjectStore) => {
              const arr = [...s.project.pageOrder]
              const [m] = arr.splice(from, 1)
              arr.splice(to, 0, m)
              s.project.pageOrder = arr
            }),
          ),

        // --------------------------------------------------------- Nodes
        updateNodeAt: (origin, updater) =>
          set((s) => ({ project: editOrigin(s.project, origin, updater) })),
        removeNodeAt: (origin) =>
          set(
            produce((s: ProjectStore) => {
              if (origin.kind === 'page') {
                for (const pid of Object.keys(s.project.pages)) {
                  const page = s.project.pages[pid]
                  if (findNode(page.nodes, origin.nodeId)) {
                    page.nodes = removeNode(page.nodes, origin.nodeId)
                  }
                }
              } else if (origin.kind === 'component-master') {
                const comp = s.project.components[origin.componentId]
                if (comp) comp.rootNode = removeNode([comp.rootNode], origin.nodeId)[0]
              } else if (origin.kind === 'component-instance') {
                // remove an overridden node inside an instance
                const loc = findInstanceLocation(s.project, origin.instanceNodeId)
                if (loc) {
                  const instNode = findNode(loc.nodes, origin.instanceNodeId)
                  if (instNode?.instance) {
                    delete instNode.instance.nodeOverrides[origin.masterNodeId]
                  }
                }
              }
            }),
          ),
        duplicateNodeAt: (origin) =>
          set(
            produce((s: ProjectStore) => {
              const dupe = (list: Node[], id: ID) => {
                const n = findNode(list, id)
                if (!n) return
                const parent = findParent(list, id)
                const map = new Map<ID, ID>()
                const copy = duplicateNodeDeep(n, map)
                if (parent) {
                  const idx = parent.children.findIndex((c) => c.id === id)
                  parent.children.splice(idx + 1, 0, copy)
                } else {
                  const idx = list.findIndex((c) => c.id === id)
                  list.splice(idx + 1, 0, copy)
                }
              }
              if (origin.kind === 'page') {
                for (const pid of Object.keys(s.project.pages)) dupe(s.project.pages[pid].nodes, origin.nodeId)
              } else if (origin.kind === 'component-master') {
                const comp = s.project.components[origin.componentId]
                const list = [comp.rootNode]
                dupe(list, origin.nodeId)
                comp.rootNode = list[0]
              }
            }),
          ),
        renameNodeAt: (origin, name) =>
          set((s) => ({ project: editOrigin(s.project, origin, (n) => { n.name = name }) })),
        setNodeStyle: (origin, patch, bp) =>
          set(
            produce((s: ProjectStore) => {
              const apply = (n: Node) => {
                if (bp && bp !== 'desktop') {
                  const existing = n.responsive[bp] ?? {}
                  n.responsive[bp] = mergeStylePatch(existing, patch)
                } else {
                  n.style = mergeStyle(n.style, patch)
                }
              }
              editOriginInPlace(s.project, origin, apply)
            }),
          ),
        resetNodeStyle: (origin, section, key, bp) =>
          set(
            produce((s: ProjectStore) => {
              const apply = (n: Node) => {
                const target = bp && bp !== 'desktop' ? (n.responsive[bp] ?? {}) : n.style
                const sec = target[section] as Record<string, unknown>
                if (sec && key in sec) delete sec[key]
              }
              editOriginInPlace(s.project, origin, apply)
            }),
          ),
        setNodeContent: (origin, content) =>
          set((s) => ({
            project: editOrigin(s.project, origin, (n) => {
              n.content = { ...n.content, ...content }
            }),
          })),
        setNodeVisibility: (origin, patch) =>
          set((s) => ({
            project: editOrigin(s.project, origin, (n) => {
              n.visibility = { ...n.visibility, ...patch }
            }),
          })),
        setNodeAnimation: (origin, animation) =>
          set((s) => ({
            project: editOrigin(s.project, origin, (n) => {
              n.animation = animation
            }),
          })),
        setNodeDataBinding: (origin, binding) =>
          set((s) => ({
            project: editOrigin(s.project, origin, (n) => {
              n.dataBinding = binding
            }),
          })),
        setNodeTag: (origin, tag) =>
          set((s) => ({
            project: editOrigin(s.project, origin, (n) => {
              n.tag = tag
            }),
          })),
        setNodeA11y: (origin, a11y) =>
          set((s) => ({
            project: editOrigin(s.project, origin, (n) => {
              n.a11y = a11y
            }),
          })),
        insertNodeAt: (parentOrigin, newNode, index) => {
          const id = newNode.id
          set(
            produce((s: ProjectStore) => {
              if (!parentOrigin) {
                // append to active page root handled by caller via setPageNodes
                return
              }
              if (parentOrigin.kind === 'page') {
                for (const pid of Object.keys(s.project.pages)) {
                  const page = s.project.pages[pid]
                  if (findNode(page.nodes, parentOrigin.nodeId)) {
                    page.nodes = insertNode(page.nodes, parentOrigin.nodeId, newNode, index)
                  }
                }
              } else if (parentOrigin.kind === 'component-master') {
                const comp = s.project.components[parentOrigin.componentId]
                comp.rootNode = insertNode([comp.rootNode], parentOrigin.nodeId, newNode, index)[0]
              }
            }),
          )
          return id
        },
        moveNodeAt: (origin, newParentId, index) =>
          set(
            produce((s: ProjectStore) => {
              if (origin.kind === 'page') {
                for (const pid of Object.keys(s.project.pages)) {
                  const page = s.project.pages[pid]
                  if (findNode(page.nodes, origin.nodeId)) {
                    page.nodes = moveNode(page.nodes, origin.nodeId, newParentId, index)
                  }
                }
              } else if (origin.kind === 'component-master') {
                const comp = s.project.components[origin.componentId]
                comp.rootNode = moveNode([comp.rootNode], origin.nodeId, newParentId, index)[0]
              }
            }),
          ),
        addNodeToPage: (pageId, node) =>
          set(
            produce((s: ProjectStore) => {
              s.project.pages[pageId].nodes.push(node)
            }),
          ),
        addChildNode: (origin, node) =>
          set(
            produce((s: ProjectStore) => {
              if (origin.kind === 'page') {
                for (const pid of Object.keys(s.project.pages)) {
                  const page = s.project.pages[pid]
                  const n = findNode(page.nodes, origin.nodeId)
                  if (n) n.children.push(node)
                }
              } else if (origin.kind === 'component-master') {
                const comp = s.project.components[origin.componentId]
                const n = findNode([comp.rootNode], origin.nodeId)
                if (n) n.children.push(node)
              }
            }),
          ),
        moveNodeToTarget: (origin, targetId, position) =>
          set(
            produce((s: ProjectStore) => {
              if (origin.kind === 'component-instance') return
              if (origin.kind === 'page') {
                for (const pid of Object.keys(s.project.pages)) {
                  const page = s.project.pages[pid]
                  if (findNode(page.nodes, origin.nodeId)) {
                    page.nodes = moveNodeTo(page.nodes, origin.nodeId, targetId, position)
                  }
                }
              } else if (origin.kind === 'component-master') {
                const comp = s.project.components[origin.componentId]
                if (comp && findNode([comp.rootNode], origin.nodeId)) {
                  comp.rootNode = moveNodeTo([comp.rootNode], origin.nodeId, targetId, position)[0]
                }
              } else if (origin.kind === 'layout') {
                for (const lid of Object.keys(s.project.layouts)) {
                  const layout = s.project.layouts[lid]
                  if (findNode([layout.frame], origin.nodeId)) {
                    layout.frame = moveNodeTo([layout.frame], origin.nodeId, targetId, position)[0]
                  }
                }
              }
            }),
          ),
        moveNodeSibling: (origin, dir) =>
          set(
            produce((s: ProjectStore) => {
              if (origin.kind === 'component-instance') return
              const id = origin.nodeId
              const moveIn = (nodes: Node[]) => {
                const loc = findParentList(nodes, id)
                if (!loc) return
                const to = loc.index + dir
                if (to < 0 || to >= loc.list.length) return
                const [m] = loc.list.splice(loc.index, 1)
                loc.list.splice(to, 0, m)
              }
              if (origin.kind === 'page') {
                for (const pid of Object.keys(s.project.pages)) {
                  moveIn(s.project.pages[pid].nodes)
                }
              } else if (origin.kind === 'component-master') {
                const comp = s.project.components[origin.componentId]
                moveIn([comp.rootNode])
              }
            }),
          ),

        // ---------------------------------------------------- Components
        createComponentFromNode: (origin, name, category) => {
          const compId = uid()
          set(
            produce((s: ProjectStore) => {
              let source: Node | null = null
              if (origin.kind === 'page') {
                for (const pid of Object.keys(s.project.pages)) {
                  const n = findNode(s.project.pages[pid].nodes, origin.nodeId)
                  if (n) {
                    source = n
                    // replace with an instance
                    const instance: Node = {
                      ...buildNode({ type: n.type, name: n.name, tag: n.tag, content: {} }),
                      instance: {
                        componentId: compId,
                        variantId: undefined,
                        props: {},
                        nodeOverrides: {},
                      },
                    }
                    s.project.pages[pid].nodes = replaceNode(
                      s.project.pages[pid].nodes,
                      origin.nodeId,
                      instance,
                    )
                  }
                }
              }
              if (source) {
                const map = new Map<ID, ID>()
                const root = duplicateNodeDeep(source, map)
                s.project.components[compId] = {
                  id: compId,
                  name,
                  category,
                  rootNode: root,
                  propsSchema: [],
                  variants: [],
                  propBindings: {},
                }
              }
            }),
          )
          return compId
        },
        addComponent: (name, category) => {
          const id = uid()
          const root = buildNode({
            type: 'container',
            name,
            tag: 'div',
            style: {
              layout: { mode: 'flex', direction: 'vertical', gap: 'MD' },
              spacing: { padding: pad('MD') },
            },
          })
          const comp: ComponentDef = {
            id,
            name,
            category,
            rootNode: root,
            propsSchema: [],
            variants: [],
            propBindings: {},
          }
          set((s) => ({
            project: { ...s.project, components: { ...s.project.components, [id]: comp } },
          }))
          return id
        },
        renameComponent: (id, name) =>
          set((s) => ({
            project: {
              ...s.project,
              components: {
                ...s.project.components,
                [id]: { ...s.project.components[id], name },
              },
            },
          })),
        deleteComponent: (id) =>
          set(
            produce((s: ProjectStore) => {
              delete s.project.components[id]
            }),
          ),
        duplicateComponent: (id) => {
          const src = get().project.components[id]
          const newId = uid()
          const copy: ComponentDef = structuredClone(src)
          copy.id = newId
          copy.name = `${src.name} Copy`
          set((s) => ({
            project: {
              ...s.project,
              components: { ...s.project.components, [newId]: copy },
            },
          }))
          return newId
        },
        setComponentCategory: (id, category) =>
          set((s) => ({
            project: {
              ...s.project,
              components: {
                ...s.project.components,
                [id]: { ...s.project.components[id], category },
              },
            },
          })),
        updateComponentNode: (componentId, nodeId, updater) =>
          set((s) => ({
            project: editMasterNode(s.project, componentId, nodeId, updater),
          })),
        addComponentProp: (componentId, prop) =>
          set((s) => ({
            project: {
              ...s.project,
              components: {
                ...s.project.components,
                [componentId]: {
                  ...s.project.components[componentId],
                  propsSchema: [...s.project.components[componentId].propsSchema, prop],
                },
              },
            },
          })),
        addComponentVariant: (componentId, name) => {
          const id = uid()
          const variant: ComponentVariant = { id, name, styleOverrides: {} }
          set((s) => ({
            project: {
              ...s.project,
              components: {
                ...s.project.components,
                [componentId]: {
                  ...s.project.components[componentId],
                  variants: [...s.project.components[componentId].variants, variant],
                },
              },
            },
          }))
          return id
        },
        removeComponentVariant: (componentId, variantId) =>
          set((s) => ({
            project: {
              ...s.project,
              components: {
                ...s.project.components,
                [componentId]: {
                  ...s.project.components[componentId],
                  variants: s.project.components[componentId].variants.filter(
                    (v) => v.id !== variantId,
                  ),
                },
              },
            },
          })),
        renameComponentVariant: (componentId, variantId, name) =>
          set((s) => ({
            project: {
              ...s.project,
              components: {
                ...s.project.components,
                [componentId]: {
                  ...s.project.components[componentId],
                  variants: s.project.components[componentId].variants.map((v) =>
                    v.id === variantId ? { ...v, name } : v,
                  ),
                },
              },
            },
          })),
        updateComponentVariant: (componentId, variantId, overrides) =>
          set((s) => ({
            project: {
              ...s.project,
              components: {
                ...s.project.components,
                [componentId]: {
                  ...s.project.components[componentId],
                  variants: s.project.components[componentId].variants.map((v) =>
                    v.id === variantId
                      ? { ...v, styleOverrides: mergeStylePatch(v.styleOverrides, overrides) }
                      : v,
                  ),
                },
              },
            },
          })),
        setInstanceProp: (origin, propKey, value) =>
          set((s) => ({
            project: origin.kind === 'component-instance'
              ? editInstanceNode(s.project, origin.instanceNodeId, (n) => {
                  if (n.instance) n.instance.props = { ...n.instance.props, [propKey]: value }
                })
              : s.project,
          })),
        setInstanceVariant: (origin, variantId) =>
          set((s) => ({
            project: origin.kind === 'component-instance'
              ? editInstanceNode(s.project, origin.instanceNodeId, (n) => {
                  if (n.instance) n.instance.variantId = variantId
                })
              : s.project,
          })),

        // ------------------------------------------------- Brand & tokens
        setBrand: (patch) =>
          set((s) => ({
            project: { ...s.project, brand: { ...s.project.brand, ...patch } },
          })),
        setTokens: (patch) =>
          set((s) => ({
            project: { ...s.project, tokens: { ...s.project.tokens, ...patch } },
          })),
        setColorToken: (key, value) =>
          set(
            produce((s: ProjectStore) => {
              s.project.tokens.colors[key] = value
            }),
          ),
        addColorToken: (key, value) =>
          set(
            produce((s: ProjectStore) => {
              s.project.tokens.colors[key] = value
            }),
          ),
        removeColorToken: (key) =>
          set(
            produce((s: ProjectStore) => {
              delete s.project.tokens.colors[key]
            }),
          ),
        setSpacingToken: (key, value) =>
          set(
            produce((s: ProjectStore) => {
              s.project.tokens.spacing[key] = value
            }),
          ),
        setRadiusToken: (key, value) =>
          set(
            produce((s: ProjectStore) => {
              s.project.tokens.radius[key] = value
            }),
          ),
        setShadowToken: (key, value) =>
          set(
            produce((s: ProjectStore) => {
              s.project.tokens.shadows[key] = value
            }),
          ),
        setBorderToken: (key, value) =>
          set(
            produce((s: ProjectStore) => {
              s.project.tokens.borders[key] = value
            }),
          ),
        setBreakpoint: (bp, value) =>
          set(
            produce((s: ProjectStore) => {
              s.project.tokens.breakpoints[bp] = value
            }),
          ),
        setTextStyle: (id, patch) =>
          set(
            produce((s: ProjectStore) => {
              s.project.tokens.textStyles[id] = {
                ...s.project.tokens.textStyles[id],
                ...patch,
              }
            }),
          ),
        setFont: (id, patch) =>
          set(
            produce((s: ProjectStore) => {
              s.project.tokens.fonts[id] = { ...s.project.tokens.fonts[id], ...patch }
            }),
          ),

        // --------------------------------------------------------- Assets
        addAsset: (asset) =>
          set(
            produce((s: ProjectStore) => {
              s.project.assets[asset.id] = asset
            }),
          ),
        removeAsset: (id) =>
          set(
            produce((s: ProjectStore) => {
              delete s.project.assets[id]
            }),
          ),
        renameAsset: (id, name) =>
          set(
            produce((s: ProjectStore) => {
              if (s.project.assets[id]) s.project.assets[id].name = name
            }),
          ),
        moveAsset: (id, folder) =>
          set(
            produce((s: ProjectStore) => {
              if (s.project.assets[id]) s.project.assets[id].folder = folder
            }),
          ),

        // -------------------------------------------- Collections & data
        addCollection: (name) => {
          const id = uid()
          const coll: Collection = { id, name, fields: [], records: [] }
          set((s) => ({
            project: { ...s.project, collections: { ...s.project.collections, [id]: coll } },
          }))
          return id
        },
        removeCollection: (id) =>
          set(
            produce((s: ProjectStore) => {
              delete s.project.collections[id]
            }),
          ),
        renameCollection: (id, name) =>
          set((s) => ({
            project: {
              ...s.project,
              collections: {
                ...s.project.collections,
                [id]: { ...s.project.collections[id], name },
              },
            },
          })),
        addField: (collectionId, field) =>
          set(
            produce((s: ProjectStore) => {
              s.project.collections[collectionId].fields.push(field)
            }),
          ),
        removeField: (collectionId, key) =>
          set(
            produce((s: ProjectStore) => {
              const coll = s.project.collections[collectionId]
              coll.fields = coll.fields.filter((f) => f.key !== key)
              for (const r of coll.records) delete r.values[key]
            }),
          ),
        addRecord: (collectionId) => {
          const id = uid()
          set(
            produce((s: ProjectStore) => {
              const coll = s.project.collections[collectionId]
              const values: CollectionRecord['values'] = {}
              for (const f of coll.fields) values[f.key] = ''
              coll.records.push({ id, values })
            }),
          )
          return id
        },
        updateRecord: (collectionId, recordId, values) =>
          set(
            produce((s: ProjectStore) => {
              const coll = s.project.collections[collectionId]
              const rec = coll.records.find((r) => r.id === recordId)
              if (rec) rec.values = { ...rec.values, ...values }
            }),
          ),
        removeRecord: (collectionId, recordId) =>
          set(
            produce((s: ProjectStore) => {
              const coll = s.project.collections[collectionId]
              coll.records = coll.records.filter((r) => r.id !== recordId)
            }),
          ),

        // -------------------------------------------------------- Layouts
        addLayout: (name) => {
          const id = uid()
          const layout: Layout = {
            id,
            name,
            frame: buildNode({
              type: 'section',
              name,
              tag: 'div',
              style: { layout: { mode: 'flex', direction: 'vertical' } },
            }),
          }
          set((s) => ({
            project: { ...s.project, layouts: { ...s.project.layouts, [id]: layout } },
          }))
          return id
        },
        removeLayout: (id) =>
          set(
            produce((s: ProjectStore) => {
              delete s.project.layouts[id]
            }),
          ),
        renameLayout: (id, name) =>
          set((s) => ({
            project: {
              ...s.project,
              layouts: { ...s.project.layouts, [id]: { ...s.project.layouts[id], name } },
            },
          })),

        // -------------------------------------------------- Interactions
        addInteraction: (interaction) =>
          set(
            produce((s: ProjectStore) => {
              s.project.interactions[interaction.id] = interaction
            }),
          ),
        updateInteraction: (id, patch) =>
          set(
            produce((s: ProjectStore) => {
              s.project.interactions[id] = {
                ...s.project.interactions[id],
                ...patch,
              }
            }),
          ),
        removeInteraction: (id) =>
          set(
            produce((s: ProjectStore) => {
              delete s.project.interactions[id]
            }),
          ),
        attachInteraction: (origin, interactionId) =>
          set((s) => ({
            project: editOrigin(s.project, origin, (n) => {
              if (!n.interactionIds.includes(interactionId)) n.interactionIds.push(interactionId)
            }),
          })),
        detachInteraction: (origin, interactionId) =>
          set((s) => ({
            project: editOrigin(s.project, origin, (n) => {
              n.interactionIds = n.interactionIds.filter((i) => i !== interactionId)
            }),
          })),

        // ------------------------------------------- Navigation & settings
        setNavigation: (links) =>
          set((s) => ({ project: { ...s.project, navigation: links } })),
        setSettings: (patch) =>
          set((s) => ({
            project: { ...s.project, settings: { ...s.project.settings, ...patch } },
          })),
        setPublishedAt: (ts) =>
          set((s) => ({
            project: { ...s.project, settings: { ...s.project.settings, publishedAt: ts } },
          })),
        restoreSnapshot: (snapshot) =>
          set(() => ({ project: structuredClone(snapshot) })),
        resetProject: () => set(() => ({ project: createDefaultProject() })),
      }),
      {
        name: 'saintworks-project',
        version: 3,
        partialize: (s) => ({ project: s.project }),
      },
    ),
    {
      limit: 100,
      partialize: (s) => (s as ProjectStore).project,
      equality: (a, b) => a === b,
    },
  ),
)

// in-place variant of editOrigin for use inside immer producers
function editOriginInPlace(project: Project, origin: NodeOrigin, fn: (n: Node) => void) {
  if (origin.kind === 'page') {
    for (const pid of Object.keys(project.pages)) {
      const page = project.pages[pid]
      if (findNode(page.nodes, origin.nodeId)) {
        const n = findNode(page.nodes, origin.nodeId)
        if (n) fn(n)
      }
    }
  } else if (origin.kind === 'layout') {
    for (const lid of Object.keys(project.layouts)) {
      const n = findNode([project.layouts[lid].frame], origin.nodeId)
      if (n) fn(n)
    }
  } else if (origin.kind === 'component-master') {
    const comp = project.components[origin.componentId]
    const n = findNode([comp.rootNode], origin.nodeId)
    if (n) fn(n)
  } else {
    const loc = findInstanceLocation(project, origin.instanceNodeId)
    if (loc) {
      const instNode = findNode(loc.nodes, origin.instanceNodeId)
      if (instNode?.instance) {
        const ov = instNode.instance.nodeOverrides[origin.masterNodeId] ?? {}
        const draft = { style: ov.style, content: ov.content, hidden: ov.hidden }
        const virtual = {
          id: origin.masterNodeId,
          type: 'container' as const,
          name: '',
          tag: 'div',
          content: draft.content ?? {},
          children: [] as Node[],
          style: mergeStyle(emptyStyle(), draft.style),
          responsive: {} as Node['responsive'],
          visibility: { hidden: draft.hidden ?? false, locked: false },
          interactionIds: [],
        }
        fn(virtual)
        const next: NonNullable<NodeInstanceRef['nodeOverrides'][string]> = {
          style: virtual.style,
          content: Object.keys(virtual.content).length ? virtual.content : undefined,
          hidden: virtual.visibility.hidden || undefined,
        }
        instNode.instance.nodeOverrides[origin.masterNodeId] = next
      }
    }
  }
}
