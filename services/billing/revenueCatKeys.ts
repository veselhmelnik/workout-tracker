import { Platform } from 'react-native'

/**
 * Which RevenueCat project a build talks to.
 *
 * Test Store keys transact against RevenueCat's sandbox, never a real store,
 * so shipping one to users would silently make Pro free. This is chosen
 * explicitly per build profile rather than inferred, because the two things
 * are genuinely independent: a preview APK is a release build (`__DEV__` is
 * false) that still needs the Test Store.
 */
export type BillingMode = 'test' | 'production'

export type BillingKeySelection =
  | { status: 'ready'; mode: BillingMode; apiKey: string }
  | { status: 'unavailable'; reason: string }

/**
 * Environment variables are inlined by Metro at build time, so each one must
 * be a full static property access — `process.env[name]` returns undefined in
 * a release bundle. Each is read inside the branch that needs it, so the
 * branches a build does not take are dropped along with the keys they
 * mention.
 */
function readMode(): BillingMode | null {
  const mode = process.env.EXPO_PUBLIC_REVENUECAT_MODE

  return mode === 'test' || mode === 'production' ? mode : null
}

/**
 * Picks the key for this build, or reports why billing is unavailable.
 *
 * Unavailable is a normal state, not an error: the app is fully usable
 * without billing, and the development override still works.
 */
export function selectBillingKey(): BillingKeySelection {
  const mode = readMode()

  if (!mode) {
    return {
      status: 'unavailable',
      // Absent or misspelled. Defaulting either way would be a guess: to
      // 'test' risks sandbox billing in a store build, to 'production' hides
      // a misconfigured profile behind a plausible-looking Free state.
      reason: 'EXPO_PUBLIC_REVENUECAT_MODE must be "test" or "production"',
    }
  }

  if (mode === 'test') {
    const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY

    if (!testKey) {
      return {
        status: 'unavailable',
        reason: 'EXPO_PUBLIC_REVENUECAT_TEST_API_KEY is not set',
      }
    }

    return { status: 'ready', mode, apiKey: testKey }
  }

  // Production. The Test Store key is not read on this path at all, so it
  // cannot be reached even when it happens to be set in the environment.
  const productionKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY

  if (!productionKey) {
    return {
      status: 'unavailable',
      // Deliberately no fallback: a production build with no production key
      // stays Free rather than quietly selling against the sandbox.
      reason: 'No production RevenueCat key is configured for this platform',
    }
  }

  return { status: 'ready', mode, apiKey: productionKey }
}
