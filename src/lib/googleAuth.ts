/**
 * googleAuth.ts — OAuth2 PKCE flow for Google Drive
 *
 * Browser-only PKCE implementation.
 * Token exchange and refresh are proxied through Vercel serverless endpoints
 * so that GOOGLE_CLIENT_SECRET never reaches the browser.
 *
 * Why a server proxy:
 *   Google's "Web Application" OAuth2 credentials are confidential clients.
 *   The token endpoint requires client_secret even when PKCE is used.
 *   /api/google-token and /api/google-refresh hold client_secret server-side.
 *   The browser still generates and owns the PKCE code_verifier — security is
 *   preserved because Google validates the verifier before issuing tokens.
 *
 * Flow:
 *   1. startOAuthFlow(clientId)   — generate verifier+state, redirect to Google
 *   2. detectOAuthCallback()      — read ?code=&state= from the redirect URL
 *   3. exchangeCodeForTokens()    — POST to /api/google-token (server adds secret)
 *   4. refreshAccessToken()       — POST to /api/google-refresh (server adds secret)
 *
 * PKCE session storage:
 *   localStorage with 5-min TTL — survives iOS PWA external-page navigation.
 *   sessionStorage is intentionally avoided (lost when iOS PWA navigates away).
 */

export const GOOGLE_SCOPES =
  'openid email https://www.googleapis.com/auth/drive.appdata'

const PKCE_STORAGE_KEY = 'esa_pkce'

interface PkceSession {
  verifier:    string
  state:       string
  redirectUri: string  // window.location.origin at flow start — passed to server
  expiresAt:   number  // unix ms
}

export interface AuthTokens {
  accessToken:  string
  refreshToken: string | null
  expiresAt:    number        // unix ms
  userEmail:    string | null
}

// ── Crypto helpers ─────────────────────────────────────────────────────────────

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function generateRandom(byteLength: number): string {
  const array = new Uint8Array(byteLength)
  crypto.getRandomValues(array)
  return base64UrlEncode(array.buffer)
}

async function sha256Base64Url(plain: string): Promise<string> {
  const data   = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

// ── PKCE session ──────────────────────────────────────────────────────────────

function storePkceSession(session: PkceSession): void {
  localStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(session))
}

function loadPkceSession(): PkceSession | null {
  try {
    const raw = localStorage.getItem(PKCE_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as PkceSession
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(PKCE_STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function clearPkceSession(): void {
  localStorage.removeItem(PKCE_STORAGE_KEY)
}

// ── OAuth redirect ─────────────────────────────────────────────────────────────

/**
 * Start the OAuth2 PKCE redirect flow.
 * Stores code_verifier, CSRF state, and redirect_uri in localStorage,
 * then navigates to Google's authorisation page.
 */
export async function startOAuthFlow(clientId: string): Promise<void> {
  const verifier     = generateRandom(32)
  const state        = generateRandom(16)
  const challenge    = await sha256Base64Url(verifier)
  const redirectUri  = window.location.origin

  storePkceSession({
    verifier,
    state,
    redirectUri,
    expiresAt: Date.now() + 5 * 60 * 1000,
  })

  const params = new URLSearchParams({
    client_id:             clientId,
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 GOOGLE_SCOPES,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent',
    state,
  })

  window.location.href =
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Callback detection ─────────────────────────────────────────────────────────

type OAuthCallbackResult =
  | { type: 'success'; code: string; state: string }
  | { type: 'error';   error: string }

/** Detect an OAuth2 callback payload in the current URL. */
export function detectOAuthCallback(): OAuthCallbackResult | null {
  const params = new URLSearchParams(window.location.search)
  const code   = params.get('code')
  const state  = params.get('state')
  const error  = params.get('error')

  if (error)          return { type: 'error', error }
  if (code && state)  return { type: 'success', code, state }
  return null
}

/** Strip OAuth params from the URL bar without a page reload. */
export function clearCallbackFromUrl(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  window.history.replaceState({}, '', url.toString())
}

// ── Token exchange (via server proxy) ─────────────────────────────────────────

/**
 * Exchange an authorization code for tokens.
 * Posts to /api/google-token — a Vercel serverless function that appends
 * GOOGLE_CLIENT_SECRET. Validates CSRF state before sending.
 */
export async function exchangeCodeForTokens(
  code:     string,
  state:    string,
  clientId: string,
): Promise<AuthTokens> {
  const session = loadPkceSession()
  if (!session) {
    throw new Error('Session expired — please try connecting again.')
  }
  if (session.state !== state) {
    clearPkceSession()
    throw new Error('Security check failed (state mismatch). Please try again.')
  }
  clearPkceSession()

  const res = await fetch('/api/google-token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      code,
      codeVerifier: session.verifier,
      redirectUri:  session.redirectUri,
      clientId,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>
    throw new Error(err.error ?? `Token exchange failed (${res.status})`)
  }

  const data = await res.json() as {
    accessToken:  string
    refreshToken: string | null
    expiresIn:    number
    email:        string | null
  }

  return {
    accessToken:  data.accessToken,
    refreshToken: data.refreshToken ?? null,
    expiresAt:    Date.now() + (data.expiresIn * 1000),
    userEmail:    data.email,
  }
}

// ── Token refresh (via server proxy) ──────────────────────────────────────────

/**
 * Obtain a fresh access token using the stored refresh token.
 * Posts to /api/google-refresh. Google may return a new refresh token on
 * rotation — always persist the returned value.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId:     string,
): Promise<AuthTokens> {
  const res = await fetch('/api/google-refresh', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken, clientId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>
    throw new Error(err.error ?? `Token refresh failed (${res.status})`)
  }

  const data = await res.json() as {
    accessToken:  string
    refreshToken: string | null
    expiresIn:    number
  }

  return {
    accessToken:  data.accessToken,
    refreshToken: data.refreshToken ?? refreshToken,
    expiresAt:    Date.now() + (data.expiresIn * 1000),
    userEmail:    null,  // not returned on refresh — caller preserves original
  }
}
