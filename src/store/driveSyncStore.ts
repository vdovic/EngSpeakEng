/**
 * driveSyncStore.ts — Google Drive sync state and actions
 *
 * Architecture:
 *   • Auth tokens and sync metadata are stored in localStorage directly
 *     (not via Zustand persist) so we control exactly what is written and when.
 *   • Token refresh is handled transparently in _getValidToken().
 *   • Push/pull/sync operations update both localStorage and Zustand state.
 *   • No auto-sync: every Drive operation requires explicit user action.
 *
 * OAuth2 client ID is read from import.meta.env.VITE_GOOGLE_CLIENT_ID.
 * If absent, the store is effectively a no-op and the UI shows setup instructions.
 */

import { create } from 'zustand'
import {
  type AuthTokens,
  exchangeCodeForTokens,
  refreshAccessToken,
} from '@/lib/googleAuth'
import {
  findSyncFile,
  getSyncFileMeta,
  readSyncFile,
  writeSyncFile,
  type DriveFileMeta,
} from '@/lib/driveApi'
import {
  exportVocabToJson,
  parseFullExport,
  mergeImportedVocabItems,
  mergeGamificationSnapshot,
  type FullExportParseResult,
  type MergeResult,
  type ExportExtras,
  type GamificationSnapshot,
} from '@/lib/vocabImportExport'
import type { VocabItem } from '@/types/vocabulary'

// ── localStorage keys ──────────────────────────────────────────────────────────

const AUTH_KEY = 'esa_drive_auth'   // PersistedAuth
const META_KEY = 'esa_drive_meta'   // PersistedMeta

// ── Persisted shapes ───────────────────────────────────────────────────────────

type PersistedAuth = AuthTokens  // { accessToken, refreshToken, expiresAt, userEmail }

interface PersistedMeta {
  fileId:          string | null  // cached Drive file ID
  lastSyncedAt:    string | null  // ISO — when we last successfully pushed/pulled
  cloudModifiedAt: string | null  // ISO — last known Drive file modifiedTime
}

function loadAuth(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as PersistedAuth) : null
  } catch { return null }
}

function saveAuth(auth: PersistedAuth): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
}

function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY)
}

function loadMeta(): PersistedMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw
      ? (JSON.parse(raw) as PersistedMeta)
      : { fileId: null, lastSyncedAt: null, cloudModifiedAt: null }
  } catch {
    return { fileId: null, lastSyncedAt: null, cloudModifiedAt: null }
  }
}

function saveMeta(meta: PersistedMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

function clearMeta(): void {
  localStorage.removeItem(META_KEY)
}

// ── Pending merge ──────────────────────────────────────────────────────────────

/** A computed merge preview waiting for user confirmation. */
export interface PendingMerge {
  preview:              MergeResult
  cloudPayload:         FullExportParseResult
  /** If true (Sync flow), push merged result back to Drive after local apply. */
  shouldPushAfterApply: boolean
}

// ── Store shape ────────────────────────────────────────────────────────────────

export type SyncStatus =
  | 'idle'
  | 'connecting'
  | 'checking'
  | 'pushing'
  | 'pulling'
  | 'error'

interface DriveSyncState {
  auth:            PersistedAuth | null
  fileId:          string | null
  lastSyncedAt:    string | null
  cloudModifiedAt: string | null
  status:          SyncStatus
  error:           string | null
  pendingMerge:    PendingMerge | null
  isAuthenticated: boolean
  /** True when cloudModifiedAt is set and newer than lastSyncedAt */
  hasNewerCloud:   boolean
}

interface ConfirmMergeHelpers {
  bulkImport:        (items: VocabItem[]) => Promise<void>
  applyGamification: (snap: GamificationSnapshot) => void
  addTheme:          (theme: string) => void
  currentThemes:     string[]
  localItems:        VocabItem[]
  extras:            ExportExtras
}

interface DriveSyncActions {
  /**
   * Load auth + meta from localStorage.
   * Call once on app init (in App.tsx useEffect).
   */
  hydrate(): void

  /**
   * Complete the OAuth2 PKCE callback after the Google redirect.
   * Called by App.tsx when it detects ?code=...&state=... in the URL.
   */
  completeOAuthCallback(code: string, state: string): Promise<void>

  /** Set an error message from outside (e.g. OAuth decline callback). */
  setError(msg: string): void

  /** Disconnect — wipe auth + sync metadata from memory and localStorage. */
  disconnect(): void

  /**
   * Lightweight cloud version check.
   * Fetches only the file's modifiedTime — no content transfer.
   * Updates hasNewerCloud if cloud is ahead of lastSyncedAt.
   * Safe to call when the Settings page opens.
   */
  checkCloudVersion(): Promise<void>

  /**
   * Pull — fetch cloud file, compute merge preview, expose as pendingMerge.
   * Nothing is written locally until confirmMerge() is called.
   *
   * @param shouldPushAfterApply  true for Sync flow (push merged result back to Drive)
   */
  pull(
    localItems:           VocabItem[],
    shouldPushAfterApply: boolean,
  ): Promise<void>

  /**
   * Push — serialize current local state and write to Drive.
   * Does NOT pull or merge — overwrites cloud with local data.
   * Callers should show a confirmation dialog before calling this.
   */
  push(localItems: VocabItem[], extras: ExportExtras): Promise<void>

  /**
   * Apply the pending merge to local stores, then (for Sync) push back to Drive.
   * All the stores needed for the full apply are passed as helpers.
   */
  confirmMerge(helpers: ConfirmMergeHelpers): Promise<void>

  cancelMerge(): void
  clearError(): void

  // ── Internal ──────────────────────────────────────────────────────────────────

  /** Get a valid access token, auto-refreshing if it's about to expire. */
  _getValidToken(): Promise<string>

  /** Return the cached fileId or search Drive for the sync file. */
  _ensureFileId(accessToken: string): Promise<string | null>
}

type DriveSyncStore = DriveSyncState & DriveSyncActions

// ── Client ID ──────────────────────────────────────────────────────────────────

const CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

// ── Derived helper ────────────────────────────────────────────────────────────

function deriveHasNewerCloud(
  cloudModifiedAt: string | null,
  lastSyncedAt:    string | null,
): boolean {
  return (
    cloudModifiedAt !== null &&
    lastSyncedAt    !== null &&
    cloudModifiedAt > lastSyncedAt
  )
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useDriveSyncStore = create<DriveSyncStore>((set, get) => ({
  // ── Initial state ────────────────────────────────────────────────────────────
  auth:            null,
  fileId:          null,
  lastSyncedAt:    null,
  cloudModifiedAt: null,
  status:          'idle',
  error:           null,
  pendingMerge:    null,
  isAuthenticated: false,
  hasNewerCloud:   false,

  // ── hydrate ──────────────────────────────────────────────────────────────────
  hydrate() {
    const auth = loadAuth()
    const meta = loadMeta()
    set({
      auth,
      fileId:          meta.fileId,
      lastSyncedAt:    meta.lastSyncedAt,
      cloudModifiedAt: meta.cloudModifiedAt,
      isAuthenticated: auth !== null && auth.refreshToken !== null,
      hasNewerCloud:   deriveHasNewerCloud(meta.cloudModifiedAt, meta.lastSyncedAt),
      status:          'idle',
      error:           null,
    })
  },

  // ── completeOAuthCallback ─────────────────────────────────────────────────────
  async completeOAuthCallback(code, state) {
    if (!CLIENT_ID) return
    set({ status: 'connecting', error: null })
    try {
      const tokens = await exchangeCodeForTokens(code, state, CLIENT_ID)
      saveAuth(tokens)
      set({ auth: tokens, isAuthenticated: true, status: 'idle', error: null })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection failed'
      set({ status: 'error', error: msg, isAuthenticated: false })
    }
  },

  setError(msg) {
    set({ status: 'error', error: msg })
  },

  // ── disconnect ────────────────────────────────────────────────────────────────
  disconnect() {
    clearAuth()
    clearMeta()
    set({
      auth:            null,
      fileId:          null,
      lastSyncedAt:    null,
      cloudModifiedAt: null,
      isAuthenticated: false,
      hasNewerCloud:   false,
      status:          'idle',
      error:           null,
      pendingMerge:    null,
    })
  },

  // ── checkCloudVersion ─────────────────────────────────────────────────────────
  async checkCloudVersion() {
    const { isAuthenticated, fileId, status } = get()
    if (!isAuthenticated || status !== 'idle') return

    set({ status: 'checking' })
    try {
      const accessToken = await get()._getValidToken()

      // Try cached fileId first (avoids a search round-trip)
      let meta: DriveFileMeta | null = null
      if (fileId) {
        meta = await getSyncFileMeta(accessToken, fileId).catch(() => null)
      }
      // Fall back to search if no cached ID or file was deleted
      if (!meta) {
        meta = await findSyncFile(accessToken)
        if (meta) {
          const persisted = loadMeta()
          saveMeta({ ...persisted, fileId: meta.id })
          set({ fileId: meta.id })
        }
      }

      const cloudModifiedAt = meta?.modifiedTime ?? null
      const { lastSyncedAt } = get()
      const hasNewerCloud = deriveHasNewerCloud(cloudModifiedAt, lastSyncedAt)

      const persisted = loadMeta()
      saveMeta({ ...persisted, cloudModifiedAt })
      set({ cloudModifiedAt, hasNewerCloud, status: 'idle' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not check cloud version'
      // Non-fatal: revert to idle, show error
      set({ status: 'error', error: msg })
    }
  },

  // ── pull ──────────────────────────────────────────────────────────────────────
  async pull(localItems, shouldPushAfterApply) {
    set({ status: 'pulling', error: null, pendingMerge: null })
    try {
      const accessToken = await get()._getValidToken()
      const resolvedId  = await get()._ensureFileId(accessToken)

      if (!resolvedId) {
        // No cloud file yet — nothing to pull, transition back to idle
        set({ status: 'idle' })
        return
      }

      const raw          = await readSyncFile(accessToken, resolvedId)
      const cloudPayload = parseFullExport(raw)
      const preview      = mergeImportedVocabItems(localItems, cloudPayload.items)

      set({
        status:      'idle',
        pendingMerge: { preview, cloudPayload, shouldPushAfterApply },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Pull failed'
      set({ status: 'error', error: msg })
    }
  },

  // ── push ──────────────────────────────────────────────────────────────────────
  async push(localItems, extras) {
    set({ status: 'pushing', error: null })
    try {
      const accessToken = await get()._getValidToken()
      const currentId   = get().fileId

      const payload = exportVocabToJson(localItems, extras)
      const content = JSON.stringify(payload, null, 2)
      const meta    = await writeSyncFile(accessToken, content, currentId)

      const now     = new Date().toISOString()
      const newMeta: PersistedMeta = {
        fileId:          meta.id,
        lastSyncedAt:    now,
        cloudModifiedAt: meta.modifiedTime,
      }
      saveMeta(newMeta)

      set({
        fileId:          meta.id,
        lastSyncedAt:    now,
        cloudModifiedAt: meta.modifiedTime,
        hasNewerCloud:   false,
        status:          'idle',
        error:           null,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Push failed'
      set({ status: 'error', error: msg })
    }
  },

  // ── confirmMerge ──────────────────────────────────────────────────────────────
  async confirmMerge(helpers) {
    const { pendingMerge } = get()
    if (!pendingMerge) return

    const { preview, cloudPayload, shouldPushAfterApply } = pendingMerge
    set({ pendingMerge: null, status: 'pulling' })

    try {
      // 1. Apply vocab items (union-merged, as computed in preview.merged)
      await helpers.bulkImport(preview.merged)

      // 2. Apply gamification — max-wins merge
      let mergedGamification = helpers.extras.gamification
      if (cloudPayload.gamification) {
        if (helpers.extras.gamification) {
          mergedGamification = mergeGamificationSnapshot(
            helpers.extras.gamification,
            cloudPayload.gamification,
          )
        } else {
          mergedGamification = cloudPayload.gamification
        }
        helpers.applyGamification(mergedGamification!)
      }

      // 3. Apply themes — union
      const allThemes = [...helpers.currentThemes]
      if (cloudPayload.themes) {
        for (const t of cloudPayload.themes) {
          if (!allThemes.includes(t)) {
            helpers.addTheme(t)
            allThemes.push(t)
          }
        }
      }

      set({ status: 'idle' })

      // 4. If Sync flow: push the fully-merged result back to Drive
      if (shouldPushAfterApply) {
        const mergedExtras: ExportExtras = {
          ...helpers.extras,
          gamification: mergedGamification,
          themes:       allThemes,
        }
        await get().push(preview.merged, mergedExtras)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Merge apply failed'
      set({ status: 'error', error: msg })
    }
  },

  cancelMerge() {
    set({ pendingMerge: null, status: 'idle' })
  },

  clearError() {
    set({ error: null, status: 'idle' })
  },

  // ── _getValidToken ────────────────────────────────────────────────────────────
  async _getValidToken() {
    const { auth } = get()
    if (!auth) throw new Error('Not connected to Google Drive.')
    if (!CLIENT_ID) throw new Error('Google Drive is not configured (VITE_GOOGLE_CLIENT_ID missing).')

    // Refresh early — don't wait until the last second
    const TWO_MINUTES = 2 * 60 * 1000
    if (auth.expiresAt - Date.now() > TWO_MINUTES) {
      return auth.accessToken
    }

    if (!auth.refreshToken) {
      clearAuth()
      set({ isAuthenticated: false, auth: null, error: 'Session expired — please reconnect.' })
      throw new Error('Session expired — please reconnect Google Drive.')
    }

    const refreshed = await refreshAccessToken(auth.refreshToken, CLIENT_ID)
    // Preserve userEmail (not returned by the refresh endpoint)
    const updated: PersistedAuth = { ...refreshed, userEmail: auth.userEmail ?? refreshed.userEmail }
    saveAuth(updated)
    set({ auth: updated })
    return updated.accessToken
  },

  // ── _ensureFileId ─────────────────────────────────────────────────────────────
  async _ensureFileId(accessToken) {
    const cached = get().fileId
    if (cached) return cached

    const meta = await findSyncFile(accessToken)
    if (meta) {
      const persisted = loadMeta()
      saveMeta({ ...persisted, fileId: meta.id })
      set({ fileId: meta.id })
      return meta.id
    }
    return null
  },
}))

/** Selector: is Google Drive configured in this build? */
export function isDriveConfigured(): boolean {
  return Boolean(CLIENT_ID)
}
