import { useProjectStore } from '../../store/projectStore'
import { useEditorStore } from '../../store/editorStore'
import { uid } from '../../model/factories'
import type { Project } from '../../model/types'
import { listVersions, saveVersion, deleteVersion, type VersionRecord } from '../../store/db'
import { Modal, GhostButton, PrimaryButton } from '../ui'
import { Icon } from '../icons'
import { useEffect, useRef, useState } from 'react'

interface ProjectMeta {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

const DB_NAME = 'saintworks-projects'

async function getProjectList(): Promise<ProjectMeta[]> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'meta.id' })
      }
    }
    req.onsuccess = () => {
      const tx = req.result.transaction('projects', 'readonly')
      const store = tx.objectStore('projects')
      const getAll = store.getAll()
      getAll.onsuccess = () => {
        const items = getAll.result.map((r: { meta: ProjectMeta }) => r.meta)
        resolve(items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      }
      getAll.onerror = () => reject(getAll.error)
    }
    req.onerror = () => reject(req.error)
  })
}

async function saveProjectMeta(meta: ProjectMeta) {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => {
      const tx = req.result.transaction('projects', 'readwrite')
      const store = tx.objectStore('projects')
      const get = store.get(meta.id)
      get.onsuccess = () => {
        const existing = get.result
        if (existing) {
          existing.meta = meta
          store.put(existing)
        } else {
          store.put({ meta, project: null })
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    }
  })
}

async function deleteProjectDB(id: string) {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => {
      const tx = req.result.transaction('projects', 'readwrite')
      tx.objectStore('projects').delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
  })
}

export function ProjectSwitcher({ onClose }: { onClose: () => void }) {
  const store = useProjectStore.getState()
  const project = useProjectStore((s) => s.project)
  const { log } = useEditorStore()
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    const list = await getProjectList()
    setProjects(list)
    setLoading(false)
  }

  const createProject = async () => {
    const id = uid()
    const now = new Date().toISOString()
    const meta: ProjectMeta = {
      id,
      name: 'New Project',
      createdAt: now,
      updatedAt: now,
    }
    await saveProjectMeta(meta)
    log('Created new project', 'success')
    loadProjects()
  }

  const openProject = (id: string) => {
    const p = useProjectStore.getState().project
    // For now, we store the current project in localStorage as "current"
    // Switching requires page reload with a different key
    window.location.hash = `#project=${id}`
    window.location.reload()
  }

  const deleteProject = async (id: string) => {
    await deleteProjectDB(id)
    log('Deleted project', 'info')
    loadProjects()
  }

  return (
    <Modal title="Projects" onClose={onClose} width={560}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[var(--text-secondary)]">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
          <PrimaryButton onClick={createProject}>New Project</PrimaryButton>
        </div>
        {loading && <div className="text-[12px] text-[var(--text-tertiary)] py-4 text-center">Loading…</div>}
        {!loading && projects.length === 0 && (
          <div className="text-center py-8">
            <Icon name="folder" size={24} className="text-[var(--text-tertiary)] mx-auto mb-2" />
            <div className="text-[12px] text-[var(--text-secondary)]">No projects yet. Create one to get started.</div>
          </div>
        )}
        {!loading && projects.map((p) => (
          <div key={p.id} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
            p.id === project.id ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
          }`} onClick={() => openProject(p.id)}>
            <div className="w-8 h-8 rounded bg-[var(--surface-inset)] flex items-center justify-center text-[12px] font-semibold text-[var(--text-secondary)]">
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium truncate">{p.name}</div>
              <div className="text-[10.5px] text-[var(--text-tertiary)]">
                Created {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </div>
            {p.id === project.id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)] text-white">Current</span>}
            <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id) }} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--error)]">
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
