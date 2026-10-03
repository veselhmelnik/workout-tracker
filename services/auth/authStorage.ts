import * as SecureStore from 'expo-secure-store'

/**
 * Refresh-token storage.
 *
 * The refresh token is a long-lived bearer credential, so it goes in the OS
 * keystore (Android Keychain / iOS Keychain) rather than AsyncStorage, SQLite
 * or the app-preferences JSON file, none of which are encrypted. The access
 * token is short-lived and deliberately stays in memory only — see authApi.
 */
const REFRESH_TOKEN_KEY = 'setline.auth.refreshToken'

export async function readRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  } catch (error) {
    // A keystore read can fail on a device whose secure hardware is in a bad
    // state. Treated as "no credential", which lands the user in anonymous
    // mode rather than crashing the app.
    if (__DEV__) {
      console.warn('[auth] could not read refresh token', error)
    }

    return null
  }
}

export async function writeRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
    // The token is only useful while the app is running, and requiring the
    // device to be unlocked keeps it out of reach of a backup extraction.
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
}

/**
 * Called when the backend definitively rejects the credential, and on sign
 * out. Never called for a network failure — see AuthFailure.
 */
export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth] could not clear refresh token', error)
    }
  }
}
