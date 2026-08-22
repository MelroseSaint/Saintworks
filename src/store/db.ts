import Dexie, { type Table } from 'dexie'
import type { Asset, ID, Project } from '../model/types'

export interface VersionRecord {
  id: ID
  label: string
  createdAt: string
  snapshot: Project
}

export interface AssetBlobRecord {
  id: ID
  blob: Blob
}

export interface DeploymentFile {
  path: string
  content: string
  language: 'jsx' | 'css' | 'json' | 'ts'
}

export interface DeploymentRecord {
  id: ID
  publishedAt: string
  projectName: string
  fileCount: number
  errors: number
  warnings: number
  files: DeploymentFile[]
}

class StudioDB extends Dexie {
  versions!: Table<VersionRecord, ID>
  assetBlobs!: Table<AssetBlobRecord, ID>
  deployments!: Table<DeploymentRecord, ID>

  constructor() {
    super('saintworks')
    this.version(1).stores({
      versions: 'id, createdAt',
      assetBlobs: 'id',
    })
    this.version(2).stores({
      deployments: 'id, publishedAt',
    })
  }
}

export const db = new StudioDB()

export async function saveVersion(
  project: Project,
  label?: string,
): Promise<VersionRecord> {
  const record: VersionRecord = {
    id: crypto.randomUUID(),
    label: label ?? `Version ${project.version}`,
    createdAt: new Date().toISOString(),
    snapshot: structuredClone(project),
  }
  await db.versions.add(record)
  return record
}

export async function listVersions(): Promise<VersionRecord[]> {
  return db.versions.orderBy('createdAt').reverse().toArray()
}

export async function deleteVersion(id: ID) {
  await db.versions.delete(id)
}

export async function storeAssetBlob(id: ID, blob: Blob) {
  await db.assetBlobs.put({ id, blob })
}

export async function loadAssetBlob(id: ID): Promise<Blob | undefined> {
  const rec = await db.assetBlobs.get(id)
  return rec?.blob
}

export async function deleteAssetBlob(id: ID) {
  await db.assetBlobs.delete(id)
}

export async function putAsset(asset: Asset, blob: Blob) {
  await storeAssetBlob(asset.id, blob)
}

export async function saveDeployment(
  data: Omit<DeploymentRecord, 'id' | 'publishedAt'>,
): Promise<DeploymentRecord> {
  const record: DeploymentRecord = {
    id: crypto.randomUUID(),
    publishedAt: new Date().toISOString(),
    ...data,
  }
  await db.deployments.add(record)
  return record
}

export async function listDeployments(): Promise<DeploymentRecord[]> {
  return db.deployments.orderBy('publishedAt').reverse().toArray()
}

export async function deleteDeployment(id: ID) {
  await db.deployments.delete(id)
}
