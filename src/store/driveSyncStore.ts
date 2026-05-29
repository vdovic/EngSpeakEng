/**
 * driveSyncStore.ts — Google Drive sync state and actions
 *
 * Architecture:
 *   • Auth tokens and sync metadata stored in localStorage directly
 *     (not via Zustand persist) so we control exactly what is written and when.
 *   • Token validity is checked lazily in _getValidToken(). Expired tokens are
 *     cleared and the user is prompted to reconnect.
 *   • All Drive operations require explicit user action — no auto-sync.
 *
 * Auth model (GIS token client — no backend):
 *   • Access tokens last ~1 hour. No refresh tokens.
 *   • connect() opens Google's popup; resolves immediately if session is active.
 *   • When a token expires the store reverts to not-authenticated; the UI shows
 *     the Connect button again. One tap re-authorises without a full redirect.
 *
 * OAuth client ID read from import.meta.env.VITE_GOOGLE_CLIENT_ID.
 * If absent the store is a no-op and the UI shows setup instructions.
 */

import { create } from 'zustand'
import {
  type AuthTokens,
  requestGoogleAccessToken,
  revokeGoogleToken,
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

type PersistedAuth = AuthTokens  // { accessToken, refreshToken: null, expiresAt, userEmail }

interface PersistedMeta {
  fileId:          string | null
  lastSyncedAt:    string | null  // ISO
  cloudModifiedAt: string | null  // ISO
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
   * Discards any stored token that has already expired.
   * Call once on app init.
   */
  hydrate(): void

  /**
   * Open the Google consent popup and store the resulting access token.
   * Fast if the user has an active Google session (typically one click).
   */
  connect(): Promise<void>

  /** Set an error message from outside. */
  setError(msg: string): void

  /** Disconnect — revoke token, wipe auth + sync metadata. */
  disconnect(): void

  /**
   * Lightweight cloud version check — fetches only modifiedTime.
   * Updates hasNewerCloud if cloud is ahead of lastSyncedAt.
   */
  checkCloudVersion(): Promise<void>

  /**
   * Pull cloud file, compute merge preview, expose as pendingMerge.
   * Nothing is written locally until confirmMerge() is called.
   */
  pull(localItems: VocabItem[], shouldPushAfterApply: boolean): Promise<void>

  /**
   * Serialize local state and write to Drive.
   * Does NOT pull or merge — overwrites cloud with local data.
   */
  push(localItems: VocabItem[], extras: ExportExtras): Promise<void>

  /**
   * Apply the pending merge to local stores, then (for Sync) push back to Drive.
   */
  confirmMerge(helpers: ConfirmMergeHelpers): Promise<void>

  cancelMerge(): void
  clearError():  void

  // ── Internal ──────────────────────────────────────────────────────────────────

  /** Return valid access token or throw (clears auth + sets error on expiry). */
  _getValidToken(): Promise<string>

  /** Return cached fileId or search Drive for the sync file. */
  _ensureFileId(accessToken: string): Promise<string | null>
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

/** Returns true if the token has more than 2 minutes of life left. */
function isTokenValid(auth: PersistedAuth): boolean {
  return auth.expiresAt - Date.now() > TWO_MINUTES
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useDriveSyncStore = create<DriveSyncStore>((set, get) => ({
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
    const raw  = loadAuth()
    const meta = loadMeta()

    // Discard already-expired tokens on startup so UI shows "Connect" immediately
    const auth = raw && isTokenValid(raw) ? raw : null
    if (raw && !auth) clearAuth()

    set({
      auth,
      fileId:          meta.fileId,
      lastSyncedAt:    meta.lastSyncedAt,
      cloudModifiedAt: meta.cloudModifiedAt,
      isAuthenticated: auth !== null,
      hasNewerCloud:   deriveHasNewerCloud(meta.cloudModifiedAt, meta.lastSyncedAt),
      status:          'idle',
      error:           null,
    })
  },

  // ── connect ───────────────────────────────────────────────────────────────────
  async connect() {
    if (!CLIENT_ID) return
    set({ status: 'connecting', error: null })
    try {
      const tokens = await requestGoogleAccessToken(CLIENT_ID)
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
    const { auth } = get()
    if (auth) revokeGoogleToken(auth.accessToken)
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
      const hasNewerCloud    = deriveHasNewerCloud(cloudModifiedAt, lastSyncedAt)

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

  // ── confirmMerge ──────────────────────────────────────────────────────────────
  async confirmMerge(helpers) {
    const { pendingMerge } = get()
    if (!pendingMerge) return

    const { preview, cloudPayload, shouldPushAfterApply } = pendingMerge
    set({ pendingMerge: null, status: 'pulling' })

    try {
      await helpers.bulkImport(preview.merged)

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

    if (isTokenValid(auth)) return auth.accessToken

    // GIS tokens cannot be refreshed silently — clear and ask user to reconnect
    clearAuth()
    set({
      isAuthenticated: false,
      auth:            null,
      status:          'error',
      error:           'Google session expired — tap Connect to continue.',
    })
    throw new Error('Google session expired — tap Connect to continue.')
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
