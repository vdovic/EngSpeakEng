import {
  ESE_GAME_EXPERIMENT_DB_NAME,
  ESE_GAME_EXPERIMENT_DB_VERSION,
  ESE_GAME_EXPERIMENT_LAST_OPENED_KEY,
  ESE_GAME_EXPERIMENT_STORE_NAME,
} from './constants'

export interface EseGameSandboxState {
  id: 'current'
  runCount: number
  selectedWordId: string
  notes: string
  updatedAt: string
}

const DEFAULT_STATE: EseGameSandboxState = {
  id: 'current',
  runCount: 0,
  selectedWordId: 'sandbox-align',
  notes: '',
  updatedAt: new Date(0).toISOString(),
}

function openExperimentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      ESE_GAME_EXPERIMENT_DB_NAME,
      ESE_GAME_EXPERIMENT_DB_VERSION,
    )

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(ESE_GAME_EXPERIMENT_STORE_NAME)) {
        db.createObjectStore(ESE_GAME_EXPERIMENT_STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openExperimentDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(ESE_GAME_EXPERIMENT_STORE_NAME, mode)
        const store = tx.objectStore(ESE_GAME_EXPERIMENT_STORE_NAME)
        const request = action(store)

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => db.close()
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error)
        }
      }),
  )
}

export async function loadSandboxState(): Promise<EseGameSandboxState> {
  const existing = await withStore<EseGameSandboxState | undefined>(
    'readonly',
    (store) => store.get(DEFAULT_STATE.id),
  )

  return existing ?? DEFAULT_STATE
}

export async function saveSandboxState(
  patch: Partial<Omit<EseGameSandboxState, 'id'>>,
): Promise<EseGameSandboxState> {
  const current = await loadSandboxState()
  const next: EseGameSandboxState = {
    ...current,
    ...patch,
    id: DEFAULT_STATE.id,
    updatedAt: new Date().toISOString(),
  }

  await withStore<IDBValidKey>('readwrite', (store) => store.put(next))
  return next
}

export function markSandboxOpened(): void {
  localStorage.setItem(ESE_GAME_EXPERIMENT_LAST_OPENED_KEY, new Date().toISOString())
}

export function getSandboxLastOpened(): string | null {
  return localStorage.getItem(ESE_GAME_EXPERIMENT_LAST_OPENED_KEY)
}
