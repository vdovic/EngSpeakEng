/**
 * driveApi.ts — Google Drive REST API v3 helpers
 *
 * Thin wrappers over the Drive REST API.
 * All functions accept a valid access token.
 * Token refresh is the caller's responsibility (handled in driveSyncStore).
 *
 * File lifecycle:
 *   The sync file lives at:  appDataFolder/engspeakeng-sync.json
 *   appDataFolder is a hidden, app-private partition:
 *     - Not visible in the user's Drive UI
 *     - Not accessible by other apps (scope: drive.appdata only)
 *     - Not accidentally deletable from Google Drive
 *   File content: VocabExportPayload JSON — identical to a manual backup
 *
 * Upload strategy:
 *   Create  → POST  /upload/drive/v3/files?uploadType=multipart  (metadata + content)
 *   Update  → PATCH /upload/drive/v3/files/{id}?uploadType=media (content only)
 */

const API        = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export const SYNC_FILE_NAME = 'engspeakeng-sync.json'

export interface DriveFileMeta {
  id:           string
  name:         string
  modifiedTime: string  // ISO timestamp
  size:         string  // bytes as string
}

// ── Internal helpers ───────────────────────────────────────────────────────────

async function parseErrorBody(res: Response): Promise<never> {
  let msg = `Drive API error: ${res.status}`
  try {
    const body = await res.json() as { error?: { message?: string } }
    if (body.error?.message) msg = body.error.message
  } catch { /* ignore */ }
  throw new Error(msg)
}

// ── File operations ────────────────────────────────────────────────────────────

/**
 * Find the sync file in appDataFolder.
 * Returns null if no file has been created yet.
 */
export async function findSyncFile(
  accessToken: string,
): Promise<DriveFileMeta | null> {
  const params = new URLSearchParams({
    spaces:   'appDataFolder',
    q:        `name='${SYNC_FILE_NAME}' and trashed=false`,
    fields:   'files(id,name,modifiedTime,size)',
    pageSize: '1',
  })

  const res = await fetch(`${API}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) await parseErrorBody(res)

  const data = await res.json() as { files: DriveFileMeta[] }
  return data.files?.[0] ?? null
}

/**
 * Fetch only metadata for a known file — no content download.
 * Use this for lightweight "is cloud newer?" checks.
 */
export async function getSyncFileMeta(
  accessToken: string,
  fileId:      string,
): Promise<DriveFileMeta> {
  const params = new URLSearchParams({ fields: 'id,name,modifiedTime,size' })

  const res = await fetch(`${API}/files/${fileId}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) await parseErrorBody(res)

  return res.json() as Promise<DriveFileMeta>
}

/**
 * Download the full content of the sync file.
 * Returns the raw JSON string (VocabExportPayload).
 */
export async function readSyncFile(
  accessToken: string,
  fileId:      string,
): Promise<string> {
  const res = await fetch(`${API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) await parseErrorBody(res)
  return res.text()
}

/**
 * Create the sync file in appDataFolder.
 * Uses multipart upload to set metadata (name + parent) and content together.
 */
export async function createSyncFile(
  accessToken: string,
  content:     string,
): Promise<DriveFileMeta> {
  const metadata = JSON.stringify({ name: SYNC_FILE_NAME, parents: ['appDataFolder'] })
  const boundary = 'eseboundary' + Math.random().toString(36).slice(2)

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n')

  const res = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,modifiedTime,size`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  )
  if (!res.ok) await parseErrorBody(res)
  return res.json() as Promise<DriveFileMeta>
}

/**
 * Update an existing sync file with new content.
 * Uses simple media upload — only the file body is sent, no metadata change.
 */
export async function updateSyncFile(
  accessToken: string,
  fileId:      string,
  content:     string,
): Promise<DriveFileMeta> {
  const params = new URLSearchParams({
    uploadType: 'media',
    fields:     'id,name,modifiedTime,size',
  })

  const res = await fetch(`${UPLOAD_API}/files/${fileId}?${params}`, {
    method:  'PATCH',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: content,
  })
  if (!res.ok) await parseErrorBody(res)
  return res.json() as Promise<DriveFileMeta>
}

/**
 * Write the sync file — creates if absent, updates if present.
 * The single entry-point for all push operations.
 */
export async function writeSyncFile(
  accessToken:     string,
  content:         string,
  existingFileId?: string | null,
): Promise<DriveFileMeta> {
  return existingFileId
    ? updateSyncFile(accessToken, existingFileId, content)
    : createSyncFile(accessToken, content)
}
