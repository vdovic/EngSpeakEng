// ── POST /api/google-token ────────────────────────────────────────────────────
//
// Vercel serverless function.
// Proxies the OAuth2 authorization-code → token exchange to Google,
// appending GOOGLE_CLIENT_SECRET from server-only environment.
//
// Why this exists:
//   Google's "Web Application" OAuth2 credentials are confidential clients.
//   The token endpoint requires client_secret even when PKCE is used.
//   Exposing client_secret in a Vite env var (VITE_*) would make it public.
//   This endpoint keeps client_secret server-side while preserving PKCE security.
//
// PKCE is still validated:
//   Google verifies that code_verifier matches the code_challenge sent during
//   authorization. An intercepted code is useless without the verifier.
//
// Required server env vars:
//   GOOGLE_CLIENT_SECRET   — OAuth2 client secret (never in VITE_* / browser)
//
// Request body:  { code, codeVerifier, redirectUri, clientId }
// Response body: { accessToken, refreshToken, expiresIn, email } (200)
//                { error: string }                                (4xx / 5xx)
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export default async function handler(req: any, res: any) {
  // ── Method guard ──────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Secret guard ──────────────────────────────────────────────────────────────
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientSecret) {
    console.error('[google-token] GOOGLE_CLIENT_SECRET is not configured')
    return res.status(500).json({ error: 'Server configuration error: GOOGLE_CLIENT_SECRET is not set.' })
  }

  // ── Input validation ──────────────────────────────────────────────────────────
  const { code, codeVerifier, redirectUri, clientId } = (req.body ?? {}) as {
    code?:         string
    codeVerifier?: string
    redirectUri?:  string
    clientId?:     string
  }

  if (!code?.trim())         return res.status(400).json({ error: '"code" is required.' })
  if (!codeVerifier?.trim()) return res.status(400).json({ error: '"codeVerifier" is required.' })
  if (!redirectUri?.trim())  return res.status(400).json({ error: '"redirectUri" is required.' })
  if (!clientId?.trim())     return res.status(400).json({ error: '"clientId" is required.' })

  // ── Token exchange ────────────────────────────────────────────────────────────
  try {
    const googleRes = await fetch(GOOGLE_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     clientId.trim(),
        client_secret: clientSecret,
        code:          code.trim(),
        code_verifier: codeVerifier.trim(),
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri.trim(),
      }),
    })

    if (!googleRes.ok) {
      const body = await googleRes.json().catch(() => ({})) as Record<string, string>
      const msg  = body.error_description ?? body.error ?? `Google returned ${googleRes.status}`
      console.error('[google-token] exchange failed:', msg)
      return res.status(googleRes.status).json({ error: msg })
    }

    const data = await googleRes.json() as Record<string, unknown>

    // Decode email from id_token on the server so the browser never sees the raw JWT
    let email: string | null = null
    const idToken = data.id_token as string | undefined
    if (idToken) {
      try {
        const payload = JSON.parse(
          Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'),
        ) as Record<string, string>
        email = payload.email ?? null
      } catch { /* cosmetic — ignore */ }
    }

    return res.status(200).json({
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn:    data.expires_in,
      email,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[google-token] unexpected error:', msg)
    return res.status(500).json({ error: 'Token exchange failed.', detail: msg })
  }
}
