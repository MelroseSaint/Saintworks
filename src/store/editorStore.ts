import { create } from 'zustand'
import { useEffect, useState } from 'react'
import type { BreakpointId, ID, NodeOrigin } from '../model/types'
import { saveVersion } from './db'

export type BottomTab =
  | 'console'
  | 'problems'
  | 'changes'
  | 'assets'
  | 'build'
  | 'preview'
  | 'timeline'
export type LeftTab = 'explorer' | 'layers'

export interface ConsoleEntry {
  id: ID
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  time: string
}

export interface ChangeEntry {
  id: ID
  summary: string
  time: string
  kind: 'content' | 'layout' | 'styling' | 'component' | 'page' | 'data' | 'brand'
}

interface EditorState {
  activePageId: ID | null
  selectedOrigin: NodeOrigin | null
  hoveredNodeId: ID | null
  viewport: BreakpointId
  leftTab: LeftTab
  inspectorSection: string
  bottomTab: BottomTab
  commandPaletteOpen: boolean
  searchOpen: boolean
  inspectionMode: boolean
  previewMode: boolean
  codeViewOpen: boolean
  aiOpen: boolean
  publishOpen: boolean
  versionOpen: boolean
  zoom: number
  editingComponentId: ID | null
  console: ConsoleEntry[]
  changes: ChangeEntry[]
  brandSection: 'brand' | 'tokens' | null
  dataCollectionId: ID | null
  cmsOpen: boolean
  settingsOpen: boolean
  dirty: boolean
  savedAt: string | null

  select: (origin: NodeOrigin | null) => void
  hover: (id: ID | null) => void
  setViewport: (v: BreakpointId) => void
  setLeftTab: (t: LeftTab) => void
  setInspectorSection: (s: string) => void
  setBottomTab: (t: BottomTab) => void
  setCommandPalette: (v: boolean) => void
  setSearch: (v: boolean) => void
  setInspection: (v: boolean) => void
  setPreview: (v: boolean) => void
  setCodeView: (v: boolean) => void
  setAI: (v: boolean) => void
  setPublish: (v: boolean) => void
  setVersionOpen: (v: boolean) => void
  setZoom: (z: number) => void
  setEditingComponent: (id: ID | null) => void
  setActivePage: (id: ID) => void
  log: (message: string, level?: ConsoleEntry['level']) => void
  clearConsole: () => void
  recordChange: (summary: string, kind: ChangeEntry['kind']) => void
  setBrandSection: (s: 'brand' | 'tokens' | null) => void
  setDataCollection: (id: ID | null) => void
  setCms: (v: boolean) => void
  setSettingsOpen: (v: boolean) => void
  markDirty: () => void
  markSaved: () => void
  saveNow: () => Promise<void>
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  activePageId: null,
  selectedOrigin: null,
  hoveredNodeId: null,
  viewport: 'desktop',
  leftTab: 'explorer',
  inspectorSection: 'Content',
  bottomTab: 'console',
  commandPaletteOpen: false,
  searchOpen: false,
  inspectionMode: false,
  previewMode: false,
  codeViewOpen: false,
  aiOpen: false,
  publishOpen: false,
  versionOpen: false,
  zoom: 1,
  editingComponentId: null,
  console: [
    {
      id: 'welcome',
      level: 'success',
      message: 'SaintWorks ready. Project loaded.',
      time: new Date().toISOString(),
    },
  ],
  changes: [],
  brandSection: null,
  dataCollectionId: null,
  cmsOpen: false,
  settingsOpen: false,
  dirty: false,
  savedAt: null,

  select: (origin) => set({ selectedOrigin: origin }),
  hover: (id) => set({ hoveredNodeId: id }),
  setViewport: (v) => set({ viewport: v }),
  setLeftTab: (t) => set({ leftTab: t }),
  setInspectorSection: (s) => set({ inspectorSection: s }),
  setBottomTab: (t) => set({ bottomTab: t }),
  setCommandPalette: (v) => set({ commandPaletteOpen: v }),
  setSearch: (v) => set({ searchOpen: v }),
  setInspection: (v) => set({ inspectionMode: v }),
  setPreview: (v) => set({ previewMode: v }),
  setCodeView: (v) => set({ codeViewOpen: v }),
  setAI: (v) => set({ aiOpen: v }),
  setPublish: (v) => set({ publishOpen: v }),
  setVersionOpen: (v) => set({ versionOpen: v }),
  setZoom: (z) => set({ zoom: z }),
  setEditingComponent: (id) => set({ editingComponentId: id }),
  setActivePage: (id) => set({ activePageId: id, editingComponentId: null, selectedOrigin: null }),
  setBrandSection: (s) => set({ brandSection: s, dataCollectionId: null, cmsOpen: false, settingsOpen: false }),
  setDataCollection: (id) => set({ dataCollectionId: id, cmsOpen: false, settingsOpen: false, brandSection: null }),
  setCms: (v) => set({ cmsOpen: v, dataCollectionId: null, settingsOpen: false, brandSection: null }),
  setSettingsOpen: (v) => set({ settingsOpen: v, dataCollectionId: null, cmsOpen: false, brandSection: null }),
  markDirty: () => set({ dirty: true }),
  markSaved: () => set({ dirty: false, savedAt: new Date().toISOString() }),
  saveNow: async () => {
    const project = useProjectStore.getState().project
    await saveVersion(project, `Manual save — ${new Date().toLocaleTimeString()}`)
    set({ dirty: false, savedAt: new Date().toISOString() })
    get().log('Saved version snapshot', 'success')
  },
  log: (message, level = 'info') =>
    set((s) => ({
      console: [
        ...s.console,
        { id: Math.random().toString(36).slice(2), level, message, time: new Date().toISOString() },
      ].slice(-200),
    })),
  clearConsole: () => set({ console: [] }),
  recordChange: (summary, kind) =>
    set((s) => ({
      changes: [
        { id: Math.random().toString(36).slice(2), summary, kind, time: new Date().toISOString() },
        ...s.changes,
      ].slice(0, 200),
    })),
}))

// Convenience: expose undo/redo through zundo's temporal store
export function useUndoRedo() {
  const temporalStore = useProjectStore.temporal
  const [snapshot, setSnapshot] = useState(() => temporalStore.getState())
  useEffect(() => temporalStore.subscribe(setSnapshot), [temporalStore])
  return {
    undo: snapshot.undo,
    redo: snapshot.redo,
    canUndo: snapshot.pastStates.length > 0,
    canRedo: snapshot.futureStates.length > 0,
  }
}

import { useProjectStore } from './projectStore'
