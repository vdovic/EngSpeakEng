/**
 * driveSyncStore.ts — Google Drive sync state and actions
 *
 * Architecture:
 *   • Auth tokens and sync metadata stored in localStorage directly
 *     (not via Zustand persist) so we control exactly what is written and when.
 *   • Token refresh is handled transparently in _getValidToken().
 *   • All explicit operations (pull/push/sync) are user-initiated.
 *   • silentSync() is the auto-sync path — no preview, no confirmation required.
 *     Called by App.tsx on page load and on visibilitychange.
 *
 * Auth model (PKCE + Vercel proxy):
 *   Access tokens auto-refresh via /api/google-refresh. The refresh token is
 *   persistent — the user stays connected indefinitely after the initial
 *   Connect. GOOGLE_CLIENT_SECRET is held server-side only.
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

const AUTH_KEY = 'esa_drive_auth'
const META_KEY = 'esa_drive_meta'

// ── Persisted shapes ───────────────────────────────────────────────────────────

type PersistedAuth = AuthTokens

interface PersistedMeta {
  fileId:          string | null
  lastSyncedAt:    string | null
  cloudModifiedAt: string | null
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

export interface PendingMerge {
  preview:              MergeResult
  cloudPayload:         FullExportParseResult
  shouldPushAfterApply: boolean
}

// ── Sync notification (auto-sync toast) ───────────────────────────────────────

export interface SyncNotification {
  message:   string
  id:        number  // timestamp used to match on auto-dismiss
}

// ── Helpers passed in for merge operations ─────────────────────────────────────

export interface ConfirmMergeHelpers {
  bulkImport:        (items: VocabItem[]) => Promise<void>
  applyGamification: (snap: GamificationSnapshot) => void
  addTheme:          (theme: string) => void
  currentThemes:     string[]
  localItems:        VocabItem[]
  extras:            ExportExtras
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
  auth:             PersistedAuth | null
  fileId:           string | null
  lastSyncedAt:     string | null
  cloudModifiedAt:  string | null
  status:           SyncStatus
  error:            string | null
  pendingMerge:     PendingMerge | null
  isAuthenticated:  boolean
  hasNewerCloud:    boolean
  syncNotification: SyncNotification | null
}

interface DriveSyncActions {
  hydrate(): void
  completeOAuthCallback(code: string, state: string): Promise<void>
  setError(msg: string): void
  disconnect(): void
  checkCloudVersion(): Promise<void>
  pull(localItems: VocabItem[], shouldPushAfterApply: boolean): Promise<void>
  push(localItems: VocabItem[], extras: ExportExtras): Promise<void>
  confirmMerge(helpers: ConfirmMergeHelpers): Promise<void>
  cancelMerge(): void
  clearError(): void
  clearSyncNotification(): void

  /**
   * Silent bidirectional sync — pull, merge, push with no user confirmation.
   * Called automatically on app start and on page-visible events.
   * Errors are swallowed (logged to console) so auto-sync never interrupts the user.
   *
   * Safe because mergeImportedVocabItems guarantees that protected progress fields
   * (exposureCount, review counters, sentenceProduced, usageLogs) can never
   * decrease: it always takes the MAX across both devices.
   */
  silentSync(
    localItems: VocabItem[],
    extras:     ExportExtras,
    helpers:    ConfirmMergeHelpers,
  ): Promise<void>

  _getValidToken():                           Promise<string>
  _ensureFileId(accessToken: string):         Promise<string | null>
  _applyMerge(
    preview:      MergeResult,
    cloudPayload: FullExportParseResult,
    helpers:      ConfirmMergeHelpers,
  ): Promise<{ mergedExtras: ExportExtras }>
}

type DriveSyncStore = DriveSyncState & DriveSyncActions

// ── Client ID ──────────────────────────────────────────────────────────────────

const CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const TWO_MINUTES = 2 * 60 * 1000

// ── Store ──────────────────────────────────────────────────────────────────────

export const useDriveSyncStore = create<DriveSyncStore>((set, get) => ({
  auth:             null,
  fileId:           null,
  lastSyncedAt:     null,
  cloudModifiedAt:  null,
  status:           'idle',
  error:            null,
  pendingMerge:     null,
  isAuthenticated:  false,
  hasNewerCloud:    false,
  syncNotification: null,

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

      let meta: DriveFileMeta | null = null
      if (fileId) {
        meta = await getSyncFileMeta(accessToken, fileId).catch(() => null)
      }
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
        set({ status: 'idle' })
        return
      }

      const raw          = await readSyncFile(accessToken, resolvedId)
      const cloudPayload = parseFullExport(raw)
      const preview      = mergeImportedVocabItems(localItems, cloudPayload.items)

      set({
        status:       'idle',
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

  // ── _applyMerge (shared by confirmMerge + silentSync) ─────────────────────────
  async _applyMerge(preview, cloudPayload, helpers) {
    // 1. Apply vocab items
    await helpers.bulkImport(preview.merged)

    // 2. Merge gamification — max-wins
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

    // 3. Union themes
    const allThemes = [...helpers.currentThemes]
    if (cloudPayload.themes) {
      for (const t of cloudPayload.themes) {
        if (!allThemes.includes(t)) {
          helpers.addTheme(t)
          allThemes.push(t)
        }
      }
    }

    return {
      mergedExtras: {
        ...helpers.extras,
        gamification: mergedGamification,
        themes:       allThemes,
      } as ExportExtras,
    }
  },

  // ── confirmMerge (manual sync path) ──────────────────────────────────────────
  async confirmMerge(helpers) {
    const { pendingMerge } = get()
    if (!pendingMerge) return

    const { preview, cloudPayload, shouldPushAfterApply } = pendingMerge
    set({ pendingMerge: null, status: 'pulling' })

    try {
      const { mergedExtras } = await get()._applyMerge(preview, cloudPayload, helpers)
      set({ status: 'idle' })

      if (shouldPushAfterApply) {
        await get().push(preview.merged, mergedExtras)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Merge apply failed'
      set({ status: 'error', error: msg })
    }
  },

  // ── silentSync (auto-sync path) ───────────────────────────────────────────────
  async silentSync(localItems, extras, helpers) {
    const { isAuthenticated, status, pendingMerge } = get()
    // Skip if not connected, actively busy (mid-push/pull/oauth), or reviewing manual merge.
    // Importantly: status==='error' does NOT block auto-sync — a stale error from
    // checkCloudVersion should not lock the sync loop indefinitely.
    const busy = status === 'pulling' || status === 'pushing' || status === 'connecting'
    if (!isAuthenticated || busy || pendingMerge !== null) return

    // Clear any stale error so the status badge resets after a successful auto-sync
    set({ status: 'pulling', error: null })

    try {
      const accessToken = await get()._getValidToken()
      const resolvedId  = await get()._ensureFileId(accessToken)

      if (!resolvedId) {
        // No cloud file yet — push local library to create it
        await get().push(localItems, extras)
        return
      }

      const raw          = await readSyncFile(accessToken, resolvedId)
      const cloudPayload = parseFullExport(raw)
      const preview      = mergeImportedVocabItems(localItems, cloudPayload.items)

      // Apply merge locally without showing preview panel
      set({ status: 'pulling' })
      const { mergedExtras } = await get()._applyMerge(preview, cloudPayload, helpers)

      // Push merged result back to Drive
      await get().push(preview.merged, mergedExtras)

      // Show a brief notification if cloud brought in new content
      const { added, updatedExisting } = preview
      if (added > 0 || updatedExisting > 0) {
        const message = added > 0
          ? `Synced ${added} new word${added !== 1 ? 's' : ''} from your other device`
          : `Synced updates from your other device`
        const id = Date.now()
        set({ syncNotification: { message, id } })
        setTimeout(() => {
          if (get().syncNotification?.id === id) set({ syncNotification: null })
        }, 4000)
      }
    } catch (e) {
      // Silent failure — never interrupt the user for auto-sync errors.
      // "Load failed" is iOS Safari's generic network error for a cancelled/failed fetch.
      const raw = e instanceof Error ? e.message : String(e)
      console.warn('[DriveSync] Auto-sync failed:', raw)
      set({ status: 'idle' })
    }
  },

  cancelMerge() {
    set({ pendingMerge: null, status: 'idle' })
  },

  clearError() {
    set({ error: null, status: 'idle' })
  },

  clearSyncNotification() {
    set({ syncNotification: null })
  },

  // ── _getValidToken ────────────────────────────────────────────────────────────
  async _getValidToken() {
    const { auth } = get()
    if (!auth) throw new Error('Not connected to Google Drive.')
    if (!CLIENT_ID) throw new Error('Google Drive is not configured (VITE_GOOGLE_CLIENT_ID missing).')

    // Return early if token has plenty of life left
    if (auth.expiresAt - Date.now() > TWO_MINUTES) return auth.accessToken

    // No refresh token — session is over, user must reconnect
    if (!auth.refreshToken) {
      clearAuth()
      set({ isAuthenticated: false, auth: null, error: 'Session expired — please reconnect.' })
      throw new Error('Session expired — please reconnect Google Drive.')
    }

    // Refresh silently
    const refreshed = await refreshAccessToken(auth.refreshToken, CLIENT_ID)
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
