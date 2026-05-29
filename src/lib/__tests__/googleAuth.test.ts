/**
 * googleAuth.test.ts
 *
 * Tests for the GIS token-client helpers.
 * window.google is mocked directly — no external script loading in tests.
 *
 * Timing note:
 *   requestGoogleAccessToken starts with `await loadGisScript()` which, even
 *   when it resolves immediately, yields to the microtask queue. We must
 *   therefore yield (`await Promise.resolve()`) before triggering the GIS
 *   callback so that initTokenClient has had a chance to run and capture it.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requestGoogleAccessToken, revokeGoogleToken } from '../googleAuth'

// ── Helpers ───────────────────────────────────────────────────────────────────

type GisCallback   = (response: Record<string, unknown>) => void
type ErrorCallback = (error: { type: string }) => void

interface MockTokenClient {
  requestAccessToken: ReturnType<typeof vi.fn>
  /** Call after `await Promise.resolve()` to let initTokenClient register. */
  triggerCallback:   (response: Record<string, unknown>) => void
  triggerError:      (type: string) => void
}

/** Install window.google mock. Returns a handle for triggering callbacks. */
function installGoogleMock(): MockTokenClient {
  let storedCallback:      GisCallback   | null = null
  let storedErrorCallback: ErrorCallback | null = null

  const handle: MockTokenClient = {
    requestAccessToken: vi.fn(),
    triggerCallback:    (res)  => storedCallback?.(res),
    triggerError:       (type) => storedErrorCallback?.({ type }),
  }

  Object.defineProperty(window, 'google', {
    value: {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn().mockImplementation((cfg: {
            callback:        GisCallback
            error_callback?: ErrorCallback
          }) => {
            storedCallback      = cfg.callback
            storedErrorCallback = cfg.error_callback ?? null
            return handle
          }),
          revoke: vi.fn(),
        },
      },
    },
    writable:     true,
    configurable: true,
  })

  return handle
}

/** Yield to the microtask queue so that initTokenClient runs after loadGisScript resolves. */
const tick = () => Promise.resolve()

// ── requestGoogleAccessToken ──────────────────────────────────────────────────

describe('requestGoogleAccessToken', () => {
  let handle: MockTokenClient

  beforeEach(() => {
    handle = installGoogleMock()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => ({ email: 'user@example.com' }),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'google', {
      value: undefined, writable: true, configurable: true,
    })
  })

  it('resolves with correct AuthTokens on success', async () => {
    const promise = requestGoogleAccessToken('client-123')
    await tick()  // let loadGisScript() resolve + initTokenClient register

    handle.triggerCallback({
      access_token: 'tok_abc',
      expires_in:   3600,
      scope:        'https://www.googleapis.com/auth/drive.appdata',
      token_type:   'Bearer',
    })

    const tokens = await promise
    expect(tokens.accessToken).toBe('tok_abc')
    expect(tokens.refreshToken).toBeNull()
    expect(tokens.userEmail).toBe('user@example.com')
    expect(tokens.expiresAt).toBeGreaterThan(Date.now())
  })

  it('passes clientId and scope to initTokenClient', async () => {
    const promise = requestGoogleAccessToken('my-client-id')
    await tick()
    handle.triggerCallback({ access_token: 'x', expires_in: 3600, scope: '', token_type: 'Bearer' })
    await promise

    const initMock = window.google!.accounts.oauth2.initTokenClient as ReturnType<typeof vi.fn>
    const cfg = initMock.mock.calls[0][0]
    expect(cfg.client_id).toBe('my-client-id')
    expect(cfg.scope).toContain('drive.appdata')
  })

  it('rejects when the GIS response contains an error field', async () => {
    const promise = requestGoogleAccessToken('client-id')
    await tick()
    handle.triggerCallback({ error: 'access_denied', error_description: 'User denied access' })

    await expect(promise).rejects.toThrow('User denied access')
  })

  it('uses error field when error_description is absent', async () => {
    const promise = requestGoogleAccessToken('client-id')
    await tick()
    handle.triggerCallback({ error: 'access_denied' })

    await expect(promise).rejects.toThrow('access_denied')
  })

  it('rejects when error_callback fires (e.g. popup closed)', async () => {
    const promise = requestGoogleAccessToken('client-id')
    await tick()
    handle.triggerError('popup_closed_by_user')

    await expect(promise).rejects.toThrow('popup_closed_by_user')
  })

  it('resolves with null email when userinfo fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const promise = requestGoogleAccessToken('client-id')
    await tick()
    handle.triggerCallback({ access_token: 'tok_xyz', expires_in: 3600, scope: '', token_type: 'Bearer' })

    const tokens = await promise
    expect(tokens.accessToken).toBe('tok_xyz')
    expect(tokens.userEmail).toBeNull()
  })

  it('calls requestAccessToken with empty prompt', async () => {
    const promise = requestGoogleAccessToken('client-id')
    await tick()
    handle.triggerCallback({ access_token: 'tok', expires_in: 3600, scope: '', token_type: 'Bearer' })
    await promise

    expect(handle.requestAccessToken).toHaveBeenCalledWith({ prompt: '' })
  })
})

// ── revokeGoogleToken ─────────────────────────────────────────────────────────

describe('revokeGoogleToken', () => {
  beforeEach(() => installGoogleMock())

  afterEach(() => {
    Object.defineProperty(window, 'google', {
      value: undefined, writable: true, configurable: true,
    })
  })

  it('calls google.accounts.oauth2.revoke with the token', () => {
    revokeGoogleToken('my-token')
    expect(
      window.google!.accounts.oauth2.revoke as ReturnType<typeof vi.fn>
    ).toHaveBeenCalledWith('my-token')
  })

  it('does not throw when window.google is unavailable', () => {
    Object.defineProperty(window, 'google', { value: undefined, writable: true, configurable: true })
    expect(() => revokeGoogleToken('tok')).not.toThrow()
  })
})
