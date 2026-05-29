/**
 * DriveSync.tsx — Google Drive sync UI for the Settings page
 *
 * States:
 *   not-configured   → setup instructions (VITE_GOOGLE_CLIENT_ID missing)
 *   not-connected    → Connect button
 *   connecting       → spinner
 *   connected / idle → status + Sync / Push / Pull / Disconnect
 *   pending-merge    → merge preview panel, identical look to manual import
 *   error            → red banner + dismiss
 *
 * Sync semantics:
 *   Sync now   → pull cloud → show preview → on confirm: apply + push merged back
 *   Push       → overwrite cloud with local (requires confirm)
 *   Pull       → pull cloud → show preview → on confirm: apply locally only
 *
 * This component owns no AI calls and makes no network calls on mount —
 * checkCloudVersion() runs once when the component first becomes visible
 * (after auth) and is otherwise explicit.
 */

import { useEffect, useRef, useState } from 'react'
import {
  Cloud, CloudOff, RefreshCw, Upload, Download,
  CheckCircle2, AlertTriangle, XCircle, LogOut,
  ExternalLink, Loader2, Info,
} from 'lucide-react'
import { useDriveSyncStore, isDriveConfigured } from '@/store/driveSyncStore'
import { useVocabStore }        from '@/store/vocabStore'
import { useGamificationStore } from '@/store/gamificationStore'
import { useThemesStore }       from '@/store/themesStore'
import { useOnboardingStore }   from '@/store/onboardingStore'
import { startOAuthFlow }       from '@/lib/googleAuth'
import type { ExportExtras }    from '@/lib/vocabImportExport'
import type { GamificationSnapshot } from '@/lib/vocabImportExport'

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

// ── Utility ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusRow({
  icon: Icon,
  iconCls,
  children,
}: {
  icon:    React.ElementType
  iconCls: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-slate-600">
      <Icon size={15} className={`shrink-0 ${iconCls}`} />
      <span>{children}</span>
    </div>
  )
}

function MergePreviewPanel({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: () => void
  onCancel:  () => void
  busy:      boolean
}) {
  const pendingMerge = useDriveSyncStore((s) => s.pendingMerge)
  if (!pendingMerge) return null

  const { preview, shouldPushAfterApply } = pendingMerge
  const { added, updatedExisting, skippedDuplicates, logsUnionMerged } = preview
  const nothingNew = added === 0 && updatedExisting === 0 && logsUnionMerged === 0

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-sky-800">
        <Info size={15} />
        {shouldPushAfterApply ? 'Sync preview — apply and upload' : 'Pull preview — apply locally'}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
          <p className="text-xl font-bold text-emerald-600">{added}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">New words</p>
        </div>
        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
          <p className="text-xl font-bold text-brand-600">{updatedExisting}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Updated</p>
        </div>
        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
          <p className="text-xl font-bold text-slate-400">{skippedDuplicates}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Skipped</p>
        </div>
        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
          <p className="text-xl font-bold text-violet-500">{logsUnionMerged}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Logs merged</p>
        </div>
      </div>

      {logsUnionMerged > 0 && (
        <p className="text-xs text-slate-500 leading-relaxed">
          Usage history from both devices has been combined — no evidence of real-life use is lost.
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={onConfirm}
          disabled={busy || nothingNew}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {busy ? (
            <><Loader2 size={14} className="animate-spin" /> Applying…</>
          ) : nothingNew ? (
            'Nothing to apply'
          ) : shouldPushAfterApply ? (
            <><CheckCircle2 size={14} /> Apply &amp; sync to cloud</>
          ) : (
            <><CheckCircle2 size={14} /> Apply locally</>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:border-slate-300 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Setup instructions ─────────────────────────────────────────────────────────

function SetupInstructions() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
        <div className="space-y-1">
          <p className="font-semibold">Google Drive not configured</p>
          <p className="text-amber-700">
            Set <code className="font-mono bg-amber-100 px-1 rounded text-xs">VITE_GOOGLE_CLIENT_ID</code> in{' '}
            <code className="font-mono bg-amber-100 px-1 rounded text-xs">.env.local</code> to enable sync.
          </p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-2.5">
        <p className="font-semibold text-slate-700">One-time setup (5 minutes)</p>
        <ol className="space-y-1.5 list-decimal list-inside text-slate-600">
          <li>
            Go to{' '}
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline inline-flex items-center gap-0.5"
            >
              Google Cloud Console <ExternalLink size={11} />
            </a>
          </li>
          <li>Create a project → Enable <strong>Google Drive API</strong></li>
          <li>Create OAuth credentials → <strong>Web Application</strong></li>
          <li>
            Add your app URL to <em>Authorised JavaScript origins</em>{' '}
            and <em>Authorised redirect URIs</em>
          </li>
          <li>
            Copy the <strong>Client ID</strong> → add to{' '}
            <code className="font-mono bg-slate-100 px-1 rounded text-xs">.env.local</code>:{' '}
            <code className="font-mono bg-slate-100 px-1 rounded text-xs">
              VITE_GOOGLE_CLIENT_ID=…
            </code>
          </li>
          <li>
            Copy the <strong>Client Secret</strong> → add to Vercel environment variables
            (or <code className="font-mono bg-slate-100 px-1 rounded text-xs">.env.local</code>{' '}
            for local dev) as{' '}
            <code className="font-mono bg-slate-100 px-1 rounded text-xs">
              GOOGLE_CLIENT_SECRET=…
            </code>{' '}
            — never prefix with <code className="font-mono bg-slate-100 px-1 rounded text-xs">VITE_</code>
          </li>
          <li>Restart the dev server</li>
        </ol>
        <p className="text-xs text-slate-400 pt-1">
          The client ID is safe to commit. The client secret is kept server-side only —
          token exchange is proxied through a serverless function so the secret never reaches the browser.
        </p>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DriveSync({ items }: { items: ReturnType<typeof useVocabStore.getState>['items'] }) {
  const store = useDriveSyncStore()

  // Pull all store data needed for push/merge operations
  const gamification = useGamificationStore((s) => ({
    points:               s.points,
    streakDays:           s.streakDays,
    lastChallengeDate:    s.lastChallengeDate,
    badges:               s.badges,
    challengeCompletions: s.challengeCompletions,
    pointsHistory:        s.pointsHistory,
    goalTarget:           s.goalTarget,
    goalStartDate:        s.goalStartDate,
    goalDeadline:         s.goalDeadline,
    gamesPlayed:          s.gamesPlayed,
    bestGameStreak:       s.bestGameStreak,
  })) as GamificationSnapshot

  const { themes, addTheme }        = useThemesStore()
  const { profile: obProfile, completed: obDone } = useOnboardingStore()
  const { bulkImport }              = useVocabStore()

  const extras: ExportExtras = {
    gamification,
    themes,
    preferences: {
      onboardingCompleted: obDone,
      onboardingProfile:   obProfile ?? undefined,
    },
  }

  // Track whether this is the first render after authentication
  // to trigger checkCloudVersion() once
  const hasChecked = useRef(false)
  const [showPushConfirm, setShowPushConfirm] = useState(false)
  const [ticker, setTicker] = useState(0)

  // Refresh relative timestamps every 30s
  useEffect(() => {
    const id = setInterval(() => setTicker((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Check cloud version once when we have auth and haven't checked yet
  useEffect(() => {
    if (store.isAuthenticated && !hasChecked.current && store.status === 'idle') {
      hasChecked.current = true
      store.checkCloudVersion()
    }
  }, [store.isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  void ticker  // used only to trigger re-render for relative timestamps

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleConnect() {
    if (!CLIENT_ID) return
    startOAuthFlow(CLIENT_ID).catch(() => {
      store.setError('Failed to start Google sign-in. Please try again.')
    })
  }

  async function handleSync() {
    await store.pull(items, /* shouldPushAfterApply */ true)
  }

  async function handlePull() {
    await store.pull(items, /* shouldPushAfterApply */ false)
  }

  async function handlePush() {
    setShowPushConfirm(false)
    await store.push(items, extras)
  }

  async function handleConfirmMerge() {
    await store.confirmMerge({
      bulkImport,
      applyGamification: (snap) => {
        // Zustand's static setState merges the snapshot into the store
        useGamificationStore.setState(snap)
      },
      addTheme,
      currentThemes: themes,
      localItems:    items,
      extras,
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const isBusy = store.status === 'pushing' || store.status === 'pulling' || store.status === 'connecting'

  if (!isDriveConfigured()) {
    return <SetupInstructions />
  }

  // Not yet connected
  if (!store.isAuthenticated) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 leading-relaxed">
          Connect your Google account to save a sync copy of your library in your
          Google Drive. The file is stored in a hidden app-private folder — invisible
          in your Drive UI and inaccessible to other apps.
        </p>

        <div className="flex items-center gap-3 p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-800">
          <Info size={15} className="shrink-0 text-sky-600" />
          <span>Sync is always explicit — nothing is uploaded automatically.</span>
        </div>

        {store.status === 'error' && store.error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            <XCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 min-w-0">
              <span>{store.error}</span>
              <button
                onClick={store.clearError}
                className="ml-2 text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={isBusy}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {store.status === 'connecting' ? (
            <><Loader2 size={15} className="animate-spin" /> Connecting…</>
          ) : (
            <><Cloud size={15} /> Connect Google Drive</>
          )}
        </button>
      </div>
    )
  }

  // Connected
  return (
    <div className="space-y-4">

      {/* ── Status row ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <StatusRow icon={Cloud} iconCls="text-emerald-500">
          {store.auth?.userEmail
            ? <>Connected as <strong>{store.auth.userEmail}</strong></>
            : 'Connected to Google Drive'
          }
        </StatusRow>

        <StatusRow icon={CheckCircle2} iconCls="text-slate-400">
          {store.lastSyncedAt
            ? <>Last synced: <strong>{relativeTime(store.lastSyncedAt)}</strong></>
            : 'Never synced on this device'
          }
        </StatusRow>

        {store.cloudModifiedAt && (
          <StatusRow icon={CloudOff} iconCls="text-slate-400">
            Cloud: <strong>{relativeTime(store.cloudModifiedAt)}</strong>
          </StatusRow>
        )}
      </div>

      {/* ── Newer cloud banner ── */}
      {store.hasNewerCloud && !store.pendingMerge && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-semibold">Newer version available in cloud.</span>
            {' '}Pull or Sync to bring it here.
          </div>
        </div>
      )}

      {/* ── Error banner ── */}
      {store.status === 'error' && store.error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <XCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1 min-w-0">
            <span>{store.error}</span>
            <button
              onClick={store.clearError}
              className="ml-2 text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Push overwrite confirmation ── */}
      {showPushConfirm && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-start gap-2 text-sm text-amber-800">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">Replace cloud with your current library?</p>
              <p className="text-amber-700 mt-0.5">
                This overwrites any cloud-only data. Use Sync instead to safely merge first.
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={handlePush}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Upload size={13} /> Yes, push
            </button>
            <button
              onClick={() => setShowPushConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Merge preview ── */}
      {store.pendingMerge && (
        <MergePreviewPanel
          onConfirm={handleConfirmMerge}
          onCancel={store.cancelMerge}
          busy={isBusy}
        />
      )}

      {/* ── Action buttons ── */}
      {!store.pendingMerge && (
        <div className="flex flex-wrap gap-2.5">
          {/* Sync now — pull + merge + push */}
          <button
            onClick={handleSync}
            disabled={isBusy}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            title="Pull cloud version, merge with local, push merged result back"
          >
            {store.status === 'pulling' || store.status === 'pushing' ? (
              <><Loader2 size={14} className="animate-spin" />
                {store.status === 'pulling' ? 'Pulling…' : 'Uploading…'}
              </>
            ) : store.status === 'checking' ? (
              <><Loader2 size={14} className="animate-spin" /> Checking…</>
            ) : (
              <><RefreshCw size={14} /> Sync now</>
            )}
          </button>

          {/* Pull only */}
          <button
            onClick={handlePull}
            disabled={isBusy}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-sm font-semibold border border-slate-200 rounded-xl transition-colors"
            title="Pull cloud version and merge preview (no upload)"
          >
            <Download size={14} /> Pull latest
          </button>

          {/* Push only */}
          <button
            onClick={() => setShowPushConfirm(true)}
            disabled={isBusy || showPushConfirm}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-sm font-semibold border border-slate-200 rounded-xl transition-colors"
            title="Upload your current library to Drive (overwrites cloud)"
          >
            <Upload size={14} /> Push current
          </button>

          {/* Check cloud */}
          <button
            onClick={() => store.checkCloudVersion()}
            disabled={isBusy}
            className="flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-500 text-sm font-medium border border-slate-200 rounded-xl transition-colors"
            title="Check if a newer version exists in Drive"
          >
            <Cloud size={14} />
          </button>
        </div>
      )}

      {/* ── Disconnect ── */}
      <button
        onClick={store.disconnect}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        <LogOut size={13} /> Disconnect Google Drive
      </button>

    </div>
  )
}
