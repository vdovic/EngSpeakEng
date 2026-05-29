// ── POST /api/google-refresh ──────────────────────────────────────────────────
//
// Vercel serverless function.
// Proxies the OAuth2 refresh-token → access-token exchange to Google,
// appending GOOGLE_CLIENT_SECRET from server-only environment.
//
// Required server env vars:
//   GOOGLE_CLIENT_SECRET   — OAuth2 client secret (never in VITE_* / browser)
//
// Request body:  { refreshToken, clientId }
// Response body: { accessToken, refreshToken, expiresIn } (200)
//                { error: string }                        (4xx / 5xx)
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientSecret) {
    console.error('[google-refresh] GOOGLE_CLIENT_SECRET is not configured')
    return res.status(500).json({ error: 'Server configuration error: GOOGLE_CLIENT_SECRET is not set.' })
  }

  const { refreshToken, clientId } = (req.body ?? {}) as {
    refreshToken?: string
    clientId?:     string
  }

  if (!refreshToken?.trim()) return res.status(400).json({ error: '"refreshToken" is required.' })
  if (!clientId?.trim())     return res.status(400).json({ error: '"clientId" is required.' })

  try {
    const googleRes = await fetch(GOOGLE_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     clientId.trim(),
        client_secret: clientSecret,
        refresh_token: refreshToken.trim(),
        grant_type:    'refresh_token',
      }),
    })

    if (!googleRes.ok) {
      const body = await googleRes.json().catch(() => ({})) as Record<string, string>
      const msg  = body.error_description ?? body.error ?? `Google returned ${googleRes.status}`
      console.error('[google-refresh] refresh failed:', msg)
      return res.status(googleRes.status).json({ error: msg })
    }

    const data = await googleRes.json() as Record<string, unknown>

    return res.status(200).json({
      accessToken:  data.access_token,
      // Google may issue a new refresh token on rotation — fall back to existing
      refreshToken: data.refresh_token ?? null,
      expiresIn:    data.expires_in,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[google-refresh] unexpected error:', msg)
    return res.status(500).json({ error: 'Token refresh failed.', detail: msg })
  }
}
