/**
 * googleAuth.ts — OAuth2 PKCE flow for Google Drive
 *
 * Pure browser implementation — no backend required.
 * Uses PKCE (Proof Key for Code Exchange) — the correct OAuth2 flow for SPAs.
 *
 * Flow:
 *   1. startOAuthFlow()     — generate verifier, redirect to Google
 *   2. detectOAuthCallback() — check URL params on return
 *   3. exchangeCodeForTokens() — POST verifier + code to Google token endpoint
 *   4. refreshAccessToken()  — use refresh_token when access_token expires
 *
 * Storage:
 *   PKCE session  → localStorage with 5-min TTL (survives iOS PWA external navigation)
 *   Auth tokens   → managed by driveSyncStore (also localStorage)
 *
 * Mobile notes:
 *   - Uses redirect flow, not popup — works on iOS Safari PWA
 *   - sessionStorage intentionally avoided (lost when iOS PWA navigates externally)
 */

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/**
 * Required scopes:
 *   openid + email    — get user's email from id_token (cosmetic, for display)
 *   drive.appdata     — access to hidden app-private folder only, not full Drive
 */
export const GOOGLE_SCOPES =
  'openid email https://www.googleapis.com/auth/drive.appdata'

const PKCE_STORAGE_KEY = 'esa_pkce'  // stores { verifier, state, expiresAt }

interface PkceSession {
  verifier:  string
  state:     string
  expiresAt: number  // unix ms
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

// ── OAuth flow ─────────────────────────────────────────────────────────────────

/**
 * Kick off the OAuth2 PKCE redirect flow.
 * Generates a code_verifier + CSRF state token, stores them in localStorage,
 * then navigates the browser to Google's authorisation page.
 *
 * The user will return to window.location.origin with ?code=...&state=...
 * which must then be handled by detectOAuthCallback() + exchangeCodeForTokens().
 */
export async function startOAuthFlow(clientId: string): Promise<void> {
  const verifier   = generateRandom(32)
  const state      = generateRandom(16)
  const challenge  = await sha256Base64Url(verifier)

  storePkceSession({ verifier, state, expiresAt: Date.now() + 5 * 60 * 1000 })

  const params = new URLSearchParams({
    client_id:             clientId,
    redirect_uri:          window.location.origin,
    response_type:         'code',
    scope:                 GOOGLE_SCOPES,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent',  // ensures refresh_token is always issued
    state,
  })

  window.location.href = `${GOOGLE_AUTH_URL}?${params}`
}

// ── Callback detection ─────────────────────────────────────────────────────────

type OAuthCallbackResult =
  | { type: 'success'; code: string; state: string }
  | { type: 'error';   error: string }

/** Check if the current URL contains an OAuth2 callback payload. */
export function detectOAuthCallback(): OAuthCallbackResult | null {
  const params = new URLSearchParams(window.location.search)
  const code   = params.get('code')
  const state  = params.get('state')
  const error  = params.get('error')

  if (error)             return { type: 'error', error }
  if (code && state)     return { type: 'success', code, state }
  return null
}

/** Remove OAuth callback params from the URL bar without a page reload. */
export function clearCallbackFromUrl(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  window.history.replaceState({}, '', url.toString())
}

// ── Token exchange ─────────────────────────────────────────────────────────────

/**
 * Exchange an auth code for tokens via PKCE.
 * Must be called with the code + state received from Google's redirect.
 * Validates the state token to prevent CSRF attacks.
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

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     clientId,
      code,
      code_verifier: session.verifier,
      grant_type:    'authorization_code',
      redirect_uri:  window.location.origin,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as Record<string, string>)
    throw new Error(
      (err as Record<string, string>).error_description ??
      `Token exchange failed (${res.status})`,
    )
  }

  const data = await res.json() as Record<string, unknown>

  // Decode id_token to get email — no verification needed (HTTPS transport + direct from Google)
  let userEmail: string | null = null
  const idToken = data.id_token as string | undefined
  if (idToken) {
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1])) as Record<string, string>
      userEmail = payload.email ?? null
    } catch { /* cosmetic — ignore */ }
  }

  return {
    accessToken:  data.access_token  as string,
    refreshToken: (data.refresh_token as string) ?? null,
    expiresAt:    Date.now() + (Number(data.expires_in) * 1000),
    userEmail,
  }
}

// ── Token refresh ──────────────────────────────────────────────────────────────

/**
 * Obtain a new access token using the stored refresh token.
 * Google occasionally issues a new refresh token — the returned value should
 * always be persisted, replacing the previous one.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId:     string,
): Promise<AuthTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     clientId,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as Record<string, string>)
    throw new Error(
      (err as Record<string, string>).error_description ??
      `Token refresh failed (${res.status})`,
    )
  }

  const data = await res.json() as Record<string, unknown>

  return {
    accessToken:  data.access_token as string,
    // Google may issue a new refresh token; preserve the old one as fallback
    refreshToken: (data.refresh_token as string) ?? refreshToken,
    expiresAt:    Date.now() + (Number(data.expires_in) * 1000),
    userEmail:    null,  // not returned on refresh — caller preserves original
  }
}
