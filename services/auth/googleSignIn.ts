import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin'

/**
 * The only module that imports the Google SDK.
 *
 * Everything above this file deals in "an ID token, or a reason there isn't
 * one", so swapping the SDK later — for example to a Credential Manager
 * implementation — touches this file alone.
 *
 * The web client ID is public (it identifies the OAuth client, it is not a
 * secret) and is also the audience the backend verifies the ID token against.
 * The two must match or every sign-in is rejected.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

export type GoogleSignInResult =
  | { status: 'success'; idToken: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string }
  | { status: 'failed'; message: string }

let isConfigured = false

/** Idempotent: configure() is cheap but should not run on every render. */
function configure(): boolean {
  if (!WEB_CLIENT_ID) {
    return false
  }

  if (!isConfigured) {
    // No offlineAccess: Setline does not call Google APIs on the user's
    // behalf, so it has no use for a server auth code or refresh grant. The
    // ID token alone proves identity, which is all the backend needs.
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID })
    isConfigured = true
  }

  return true
}

/** True when the build has a Google client configured at all. */
export function isGoogleSignInAvailable(): boolean {
  return Boolean(WEB_CLIENT_ID)
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!configure()) {
    return {
      status: 'unavailable',
      message: 'Google sign-in is not configured in this build.',
    }
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })

    const response = await GoogleSignin.signIn()

    // Backing out is ordinary behaviour, not a failure.
    if (!isSuccessResponse(response)) {
      return { status: 'cancelled' }
    }

    const idToken = response.data.idToken

    if (!idToken) {
      return {
        status: 'failed',
        message: 'Google did not return an identity token.',
      }
    }

    // Returned, never logged: this token authenticates the user to Setline.
    return { status: 'success', idToken }
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined

    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return { status: 'cancelled' }
    }

    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        status: 'unavailable',
        message: 'Google Play services are not available on this device.',
      }
    }

    if (__DEV__) {
      console.warn('[auth] google sign-in failed', error)
    }

    return {
      status: 'failed',
      message: 'Could not sign in with Google. Please try again.',
    }
  }
}

/**
 * Clears the Google session so the account chooser appears next time. Failure
 * is ignored: Setline's own session is what signing out is really about, and
 * that is cleared regardless.
 */
export async function signOutFromGoogle(): Promise<void> {
  if (!configure()) {
    return
  }

  try {
    await GoogleSignin.signOut()
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth] google sign-out failed', error)
    }
  }
}
