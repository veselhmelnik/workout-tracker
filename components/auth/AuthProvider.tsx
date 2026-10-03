import {
  exchangeGoogleToken,
  isBackendConfigured,
  refreshSession,
  revokeSession,
  setAccessToken,
} from '@/services/auth/authApi'
import {
  clearRefreshToken,
  readRefreshToken,
  writeRefreshToken,
} from '@/services/auth/authStorage'
import {
  isGoogleSignInAvailable,
  signInWithGoogle,
  signOutFromGoogle,
} from '@/services/auth/googleSignIn'
import type { AuthFailure, SetlineUser } from '@/services/auth/types'
import {
  identifyBillingUser,
  resetBillingUser,
} from '@/services/billing/revenueCat'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/**
 * Account state, deliberately separate from Pro entitlement.
 *
 * Authentication and entitlement are independent: all four combinations are
 * real — anonymous+free, anonymous+pro, authenticated+free, authenticated+pro
 * — so neither provider consults the other to decide its own state. The only
 * link is one-directional: signing in tells the billing adapter which account
 * owns the purchases.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: SetlineUser }

export type SignInOutcome =
  | { status: 'signed_in' }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string }

type AuthContextValue = {
  state: AuthState
  /** False when the build has no Google client or no backend URL. */
  isAvailable: boolean
  /** True while a sign-in or sign-out is running. */
  isBusy: boolean
  signInWithGoogle: () => Promise<SignInOutcome>
  signOut: () => Promise<void>
}

const ANONYMOUS: AuthContextValue = {
  state: { status: 'anonymous' },
  isAvailable: false,
  isBusy: false,
  signInWithGoogle: async () => ({
    status: 'failed',
    message: 'Accounts are not available.',
  }),
  signOut: async () => {},
}

const AuthContext = createContext<AuthContextValue>(ANONYMOUS)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [isBusy, setIsBusy] = useState(false)

  // Mirrors the stored refresh token so the API client can rotate without
  // another keystore read on every request.
  const refreshTokenRef = useRef<string | null>(null)

  const isAvailable = isGoogleSignInAvailable() && isBackendConfigured()

  const applySession = useCallback(
    async (user: SetlineUser, accessToken: string, refreshToken: string) => {
      setAccessToken(accessToken)
      refreshTokenRef.current = refreshToken

      await writeRefreshToken(refreshToken)

      setState({ status: 'authenticated', user })
    },
    [],
  )

  /** Only for a definitive rejection or an explicit sign-out. */
  const clearSession = useCallback(async () => {
    setAccessToken(null)
    refreshTokenRef.current = null

    await clearRefreshToken()

    setState({ status: 'anonymous' })
  }, [])

  /**
   * Startup restore. Runs in the background — nothing in the app waits on it,
   * so workouts, history and sessions are usable while it resolves and remain
   * usable if it never does.
   */
  useEffect(() => {
    let isActive = true

    const restore = async () => {
      if (!isAvailable) {
        setState({ status: 'anonymous' })

        return
      }

      const stored = await readRefreshToken()

      if (!isActive) {
        return
      }

      if (!stored) {
        setState({ status: 'anonymous' })

        return
      }

      refreshTokenRef.current = stored

      const result = await refreshSession(stored)

      if (!isActive) {
        return
      }

      if (result.ok) {
        await applySession(
          result.value.user,
          result.value.tokens.accessToken,
          result.value.tokens.refreshToken,
        )

        // Re-link billing to this account on every cold start, so entitlement
        // follows the account rather than the install.
        await identifyBillingUser(result.value.user.id)

        return
      }

      if (result.failure.kind === 'invalid') {
        // The backend says this credential is dead — revoked, expired or
        // rotated away. Safe to discard.
        await clearSession()

        return
      }

      // Network failure. The credential is kept and will be retried on the
      // next launch; the user simply shows as not signed in for now rather
      // than being silently signed out because they opened the app offline.
      setState({ status: 'anonymous' })
    }

    restore()

    return () => {
      isActive = false
    }
  }, [applySession, clearSession, isAvailable])

  const handleSignIn = useCallback(async (): Promise<SignInOutcome> => {
    if (isBusy) {
      return { status: 'cancelled' }
    }

    setIsBusy(true)

    try {
      const google = await signInWithGoogle()

      if (google.status === 'cancelled') {
        return { status: 'cancelled' }
      }

      if (google.status !== 'success') {
        return { status: 'failed', message: google.message }
      }

      const result = await exchangeGoogleToken(google.idToken)

      if (!result.ok) {
        return { status: 'failed', message: failureMessage(result.failure) }
      }

      await applySession(
        result.value.user,
        result.value.tokens.accessToken,
        result.value.tokens.refreshToken,
      )

      // Anonymous purchases made before this point transfer with the login;
      // the adapter handles it and nothing here fabricates an identity.
      await identifyBillingUser(result.value.user.id)

      return { status: 'signed_in' }
    } finally {
      setIsBusy(false)
    }
  }, [applySession, isBusy])

  const handleSignOut = useCallback(async () => {
    if (isBusy) {
      return
    }

    setIsBusy(true)

    try {
      const token = refreshTokenRef.current

      if (token) {
        // Best effort. A failure here must not strand the user signed in on
        // the device, so the local credential is cleared regardless.
        await revokeSession(token)
      }

      await signOutFromGoogle()
      await clearSession()

      // Back to an anonymous billing identity, generated by RevenueCat.
      await resetBillingUser()

      // Nothing touches SQLite: workouts, exercises, sessions and history are
      // device data and are not owned by the account.
    } finally {
      setIsBusy(false)
    }
  }, [clearSession, isBusy])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      isAvailable,
      isBusy,
      signInWithGoogle: handleSignIn,
      signOut: handleSignOut,
    }),
    [handleSignIn, handleSignOut, isAvailable, isBusy, state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

function failureMessage(failure: AuthFailure): string {
  switch (failure.kind) {
    case 'network':
      return failure.message
    case 'unavailable':
      return failure.message
    case 'invalid':
      return 'Setline could not verify that Google account.'
    case 'cancelled':
      return 'Sign-in was cancelled.'
  }
}
