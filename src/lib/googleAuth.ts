/**
 * googleAuth.ts — Google Identity Services (GIS) token client
 *
 * Browser-only. No backend, no client_secret, no redirect URI required.
 *
 * Uses Google's GIS library (https://accounts.google.com/gsi/client) to obtain
 * OAuth2 access tokens directly in the browser via a popup/overlay flow.
 *
 * Trade-off vs authorisation-code + backend:
 *   • No refresh tokens — access tokens expire in ~1 hour.
 *   • When expired, user taps "Connect" again — typically a one-click popup if
 *     their Google session is still active in the browser.
 *   • No GOOGLE_CLIENT_SECRET, no Vercel serverless functions needed.
 *
 * Google Cloud Console setup:
 *   • OAuth 2.0 credentials → Web Application
 *   • Authorised JavaScript origins: your app URL(s)
 *   • Redirect URIs: not required for the token-client flow
 *
 * Flow:
 *   1. requestGoogleAccessToken(clientId)
 *      → loads GIS script on first call (cached for the session)
 *      → opens Google's consent popup
 *      → resolves with AuthTokens on success
 *      → rejects on cancel or error
 *   2. revokeGoogleToken(accessToken)
 *      → best-effort revoke (called on Disconnect)
 */

export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.appdata'

export interface AuthTokens {
  accessToken:  string
  refreshToken: null   // GIS never provides refresh tokens
  expiresAt:    number // unix ms
  userEmail:    string | null
}

// ── GIS ambient types ─────────────────────────────────────────────────────────

interface GisTokenResponse {
  access_token:       string
  expires_in:         number
  scope:              string
  token_type:         string
  error?:             string
  error_description?: string
}

interface GisTokenClientConfig {
  client_id:       string
  scope:           string
  callback:        (response: GisTokenResponse) => void
  error_callback?: (error: { type: string }) => void
}

interface GisTokenClient {
  requestAccessToken(config?: { prompt?: string }): void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: GisTokenClientConfig): GisTokenClient
          revoke(accessToken: string, done?: () => void):  void
        }
      }
    }
  }
}

// ── GIS script loader ─────────────────────────────────────────────────────────

let _gisScriptPromise: Promise<void> | null = null

/** Load the GIS script once per page load. Returns immediately if already loaded. */
export function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (_gisScriptPromise) return _gisScriptPromise
  _gisScriptPromise = new Promise<void>((resolve, reject) => {
    const script    = document.createElement('script')
    script.src      = 'https://accounts.google.com/gsi/client'
    script.async    = true
    script.onload   = () => resolve()
    script.onerror  = () => {
      _gisScriptPromise = null
      reject(new Error('Failed to load Google Identity Services. Check your connection.'))
    }
    document.head.appendChild(script)
  })
  return _gisScriptPromise
}

// ── Token request ─────────────────────────────────────────────────────────────

/**
 * Request an OAuth2 access token via the GIS token client.
 *
 * Opens Google's consent popup (fast if the user has an active Google session).
 * Resolves with AuthTokens. Rejects if the user cancels or an error occurs.
 */
export async function requestGoogleAccessToken(
  clientId: string,
): Promise<AuthTokens> {
  await loadGisScript()

  return new Promise<AuthTokens>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:     GOOGLE_SCOPES,

      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error))
          return
        }

        // Fetch email from userinfo — cosmetic, failure is non-fatal
        let userEmail: string | null = null
        try {
          const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` },
          })
          const info = await res.json() as { email?: string }
          userEmail  = info.email ?? null
        } catch { /* ignore — email display is optional */ }

        resolve({
          accessToken:  response.access_token,
          refreshToken: null,
          expiresAt:    Date.now() + response.expires_in * 1000,
          userEmail,
        })
      },

      error_callback: (error) => {
        reject(new Error(`Google authorisation failed: ${error.type}`))
      },
    })

    // Empty prompt reuses existing consent if scopes haven't changed.
    client.requestAccessToken({ prompt: '' })
  })
}

// ── Token revocation ──────────────────────────────────────────────────────────

/**
 * Ask Google to revoke the access token. Best-effort — never throws.
 * Called on Disconnect so Drive permission is immediately dropped server-side.
 */
export function revokeGoogleToken(accessToken: string): void {
  try {
    window.google?.accounts.oauth2.revoke(accessToken)
  } catch { /* ignore */ }
}
