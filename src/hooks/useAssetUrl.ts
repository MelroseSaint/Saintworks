import { useEffect, useState } from 'react'
import { loadAssetBlob } from '../store/db'

const cache = new Map<string, string>()

export function useAssetUrl(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => (id ? cache.get(id) : undefined))

  useEffect(() => {
    if (!id) return
    if (cache.has(id)) {
      setUrl(cache.get(id))
      return
    }
    let revoked = false
    let objectUrl: string | undefined
    loadAssetBlob(id).then((blob) => {
      if (blob && !revoked) {
        objectUrl = URL.createObjectURL(blob)
        cache.set(id, objectUrl)
        setUrl(objectUrl)
      }
    })
    return () => {
      revoked = true
    }
  }, [id])

  return url
}

export function isAssetId(src: string | undefined): boolean {
  return !!src && !src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('#')
}
