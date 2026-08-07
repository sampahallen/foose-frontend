const DB_NAME = 'foose-draft-images'
const STORE_NAME = 'images'
const DB_VERSION = 1

type StoredImage = { blob: Blob; name: string; type: string }

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

// Best-effort, mirroring useLocalDraft's tolerance for unavailable/restricted storage —
// image drafts are a convenience, never something a form should block or fail on.
export async function saveDraftImages(key: string, files: File[]): Promise<void> {
  if (!files.length) return clearDraftImages(key)
  const db = await openDb()
  if (!db) return
  const stored: StoredImage[] = files.map((file) => ({ blob: file, name: file.name, type: file.type }))
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(stored, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}

export async function loadDraftImages(key: string): Promise<File[]> {
  const db = await openDb()
  if (!db) return []
  const stored = await new Promise<StoredImage[] | undefined>((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve(request.result as StoredImage[] | undefined)
    request.onerror = () => resolve(undefined)
  })
  db.close()
  if (!stored?.length) return []
  return stored.map((item) => new File([item.blob], item.name, { type: item.type }))
}

export async function clearDraftImages(key: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}
