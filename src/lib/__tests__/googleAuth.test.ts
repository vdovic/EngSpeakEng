/**
 * googleAuth.test.ts
 *
 * Tests for the PKCE OAuth helpers and callback detection.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  detectOAuthCallback,
  clearCallbackFromUrl,
  exchangeCodeForTokens,
} from '../googleAuth'

// ── detectOAuthCallback ───────────────────────────────────────────────────────

describe('detectOAuthCallback', () => {
  const originalLocation = window.location

  function setSearch(search: string) {
    Object.defineProperty(window, 'location', {
      value:    { ...originalLocation, search, href: `http://localhost${search}` },
      writable: true,
    })
  }

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value:    originalLocation,
      writable: true,
    })
  })

  it('returns null when URL has no OAuth params', () => {
    setSearch('')
    expect(detectOAuthCallback()).toBeNull()
  })

  it('returns null when URL has unrelated params', () => {
    setSearch('?foo=bar&baz=qux')
    expect(detectOAuthCallback()).toBeNull()
  })

  it('returns success result when code + state are present', () => {
    setSearch('?code=my-code&state=my-state')
    const result = detectOAuthCallback()
    expect(result).toEqual({ type: 'success', code: 'my-code', state: 'my-state' })
  })

  it('returns error result when error param is present', () => {
    setSearch('?error=access_denied')
    const result = detectOAuthCallback()
    expect(result).toEqual({ type: 'error', error: 'access_denied' })
  })

  it('prefers error over code when both are present', () => {
    setSearch('?code=x&state=y&error=access_denied')
    expect(detectOAuthCallback()?.type).toBe('error')
  })

  it('returns null when only code is present (no state)', () => {
    setSearch('?code=my-code')
    expect(detectOAuthCallback()).toBeNull()
  })
})

// ── clearCallbackFromUrl ───────────────────────────────────────────────────────

describe('clearCallbackFromUrl', () => {
  it('removes code, state, and error from the URL without reload', () => {
    const replaceState = vi.fn()
    Object.defineProperty(window, 'history', {
      value:    { ...window.history, replaceState },
      writable: true,
    })
    Object.defineProperty(window, 'location', {
      value: {
        href:   'http://localhost/?code=abc&state=xyz&foo=bar',
        search: '?code=abc&state=xyz&foo=bar',
      },
      writable: true,
    })

    clearCallbackFromUrl()

    expect(replaceState).toHaveBeenCalledOnce()
    const calledUrl = replaceState.mock.calls[0][2] as string
    expect(calledUrl).not.toContain('code=')
    expect(calledUrl).not.toContain('state=')
    expect(calledUrl).toContain('foo=bar')
  })
})

// ── exchangeCodeForTokens ─────────────────────────────────────────────────────

describe('exchangeCodeForTokens', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('throws if PKCE session is missing (expired or never started)', async () => {
    await expect(
      exchangeCodeForTokens('code', 'state', 'client-id'),
    ).rejects.toThrow('Session expired')
  })

  it('throws on state mismatch (CSRF protection)', async () => {
    const session = {
      verifier:    'verifier123',
      state:       'good-state',
      redirectUri: 'http://localhost:5173',
      expiresAt:   Date.now() + 60_000,
    }
    localStorage.setItem('esa_pkce', JSON.stringify(session))

    await expect(
      exchangeCodeForTokens('code', 'bad-state', 'client-id'),
    ).rejects.toThrow('state mismatch')
  })

  it('calls /api/google-token proxy with correct params on valid session', async () => {
    const session = {
      verifier:    'my-verifier',
      state:       'my-state',
      redirectUri: 'http://localhost:5173',
      expiresAt:   Date.now() + 60_000,
    }
    localStorage.setItem('esa_pkce', JSON.stringify(session))

    // Response shape from /api/google-token (camelCase — server normalises)
    const fetchMock = vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => ({
        accessToken:  'at123',
        refreshToken: 'rt456',
        expiresIn:    3600,
        email:        'user@example.com',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const tokens = await exchangeCodeForTokens('auth-code', 'my-state', 'client-id')

    expect(tokens.accessToken).toBe('at123')
    expect(tokens.refreshToken).toBe('rt456')
    expect(tokens.userEmail).toBe('user@example.com')
    expect(tokens.expiresAt).toBeGreaterThan(Date.now())

    // Must have called the server proxy, not Google directly
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/google-token')
    const body = JSON.parse(init.body as string)
    expect(body.codeVerifier).toBe('my-verifier')
    expect(body.clientId).toBe('client-id')
    expect(body.redirectUri).toBe('http://localhost:5173')

    // PKCE session cleared after successful exchange
    expect(localStorage.getItem('esa_pkce')).toBeNull()

    vi.unstubAllGlobals()
  })

  it('throws when the proxy returns an error response', async () => {
    const session = {
      verifier:    'v',
      state:       's',
      redirectUri: 'http://localhost:5173',
      expiresAt:   Date.now() + 60_000,
    }
    localStorage.setItem('esa_pkce', JSON.stringify(session))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:     false,
      status: 400,
      json:   async () => ({ error: 'invalid_grant' }),
    }))

    await expect(
      exchangeCodeForTokens('code', 's', 'client-id'),
    ).rejects.toThrow('invalid_grant')

    vi.unstubAllGlobals()
  })
})
