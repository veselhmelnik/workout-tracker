/**
 * The account identity Setline issues. Deliberately minimal: the backend is
 * the source of truth and returns only what the app displays.
 *
 * `id` is Setline's own UUID, not Google's subject. It is the stable account
 * identity used for RevenueCat and, later, cloud backup — a Google `sub` is an
 * identity-provider detail that should not leak into other systems.
 */
export type SetlineUser = {
  id: string
  email: string
  displayName: string | null
}

/** Issued by POST /auth/google and rotated by POST /auth/refresh. */
export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthSession = {
  user: SetlineUser
  tokens: AuthTokens
}

/**
 * Why a call failed, because the response determines whether the stored
 * credential is discarded.
 *
 * `invalid` means the backend definitively rejected the credential, so it is
 * cleared. `network` means we could not tell — the device is offline, the
 * backend is unreachable, a timeout — and the credential is kept. Conflating
 * the two would sign a user out every time they opened the app on a train.
 */
export type AuthFailure =
  | { kind: 'invalid' }
  | { kind: 'network'; message: string }
  | { kind: 'cancelled' }
  | { kind: 'unavailable'; message: string }
