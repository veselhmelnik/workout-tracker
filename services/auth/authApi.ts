import type { AuthFailure, AuthSession, AuthTokens, SetlineUser } from './types'

/**
 * Setline backend client.
 *
 * `localhost` on an Android device is the device itself, not the development
 * machine, so this must be a LAN IP, a tunnel or a deployed backend. Absent
 * configuration means the account feature reports unavailable; local workout
 * tracking is unaffected either way.
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

/** A slow backend must not hold up the UI. */
const REQUEST_TIMEOUT_MS = 10_000

export function isBackendConfigured(): boolean {
  return Boolean(API_BASE_URL)
}

/**
 * The access token lives only in memory: it expires in minutes, and keeping
 * it out of persistent storage removes it as a theft target entirely. On a
 * cold start it is re-obtained by exchanging the stored refresh token.
 */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; failure: AuthFailure }

async function request<T>(
  path: string,
  init: RequestInit,
): Promise<ApiResult<T>> {
  if (!API_BASE_URL) {
    return {
      ok: false,
      failure: {
        kind: 'unavailable',
        message: 'Setline accounts are not configured in this build.',
      },
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: controller.signal,
    })

    // 401/403 is the backend saying the credential is no longer good. Only
    // this is treated as definitive; everything else leaves it in place.
    if (response.status === 401 || response.status === 403) {
      return { ok: false, failure: { kind: 'invalid' } }
    }

    if (!response.ok) {
      // A 5xx is the backend's problem, not the credential's.
      return {
        ok: false,
        failure: {
          kind: 'network',
          message: `Setline servers returned ${response.status}.`,
        },
      }
    }

    return { ok: true, value: (await response.json()) as T }
  } catch (error) {
    // Offline, DNS failure, timeout — indistinguishable here, and none of
    // them say anything about whether the credential is valid.
    if (__DEV__) {
      console.warn(`[auth] request to ${path} failed`, error)
    }

    return {
      ok: false,
      failure: {
        kind: 'network',
        message: 'Could not reach Setline. Check your connection.',
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

type SessionResponse = {
  user: SetlineUser
  accessToken: string
  refreshToken: string
}

function toSession(response: SessionResponse): AuthSession {
  return {
    user: response.user,
    tokens: {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    },
  }
}

/**
 * Exchanges a Google ID token for a Setline session. Only the token is sent:
 * the backend derives the user's identity from the verified claims, never
 * from anything the client asserts about who it is.
 */
export async function exchangeGoogleToken(
  idToken: string,
): Promise<ApiResult<AuthSession>> {
  const result = await request<SessionResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  })

  return result.ok ? { ok: true, value: toSession(result.value) } : result
}

/** Rotating: the returned refresh token replaces the one passed in. */
export async function refreshSession(
  refreshToken: string,
): Promise<ApiResult<AuthSession>> {
  const result = await request<SessionResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })

  return result.ok ? { ok: true, value: toSession(result.value) } : result
}

export async function revokeSession(
  refreshToken: string,
): Promise<ApiResult<{ revoked: boolean }>> {
  return request<{ revoked: boolean }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

/**
 * Authenticated request wrapper for future features — Cloud Backup will call
 * this rather than fetch.
 *
 * Attaches the in-memory access token and, on exactly one 401, refreshes and
 * retries once. The retry is not itself retried, so a persistently rejecting
 * backend cannot produce a refresh loop.
 */
export async function authenticatedRequest<T>(
  path: string,
  init: RequestInit,
  onTokens: (tokens: AuthTokens) => void,
  getRefreshToken: () => string | null,
): Promise<ApiResult<T>> {
  const attempt = () =>
    request<T>(path, {
      ...init,
      headers: {
        ...init.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    })

  const first = await attempt()

  if (first.ok || first.failure.kind !== 'invalid') {
    return first
  }

  const storedRefreshToken = getRefreshToken()

  if (!storedRefreshToken) {
    return first
  }

  const refreshed = await refreshSession(storedRefreshToken)

  if (!refreshed.ok) {
    return { ok: false, failure: refreshed.failure }
  }

  accessToken = refreshed.value.tokens.accessToken
  onTokens(refreshed.value.tokens)

  // Single retry only.
  return attempt()
}
