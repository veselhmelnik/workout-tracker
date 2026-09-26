import {
  isProGatedFeature,
  type ProFeature,
} from '@/constants/proFeatures'
import {
  getCustomerInfo,
  hasProEntitlement,
  initializeBilling,
  subscribeToCustomerInfo,
} from '@/services/billing/revenueCat'
import { setDeveloperProEnabled } from '@/utils/appPreferences'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/** Where the current entitlement came from. */
export type ProEntitlementSource = 'development' | 'billing' | 'none'

export type ProEntitlementState = {
  isPro: boolean
  source: ProEntitlementSource
}

type ProEntitlementContextValue = ProEntitlementState & {
  /** Current value of the development override; always false in production. */
  developerProEnabled: boolean
  /** Flips the development override. A no-op in production builds. */
  setDeveloperPro: (enabled: boolean) => void
  /** False once billing has answered, or once it is known to be unavailable. */
  isBillingLoading: boolean
  /** No key, no store, or configuration failed. The app is Free and usable. */
  isBillingAvailable: boolean
}

/**
 * Free by default, so a screen rendered outside the provider — a test, a
 * detached preview — is never accidentally entitled.
 */
const FREE: ProEntitlementContextValue = {
  isPro: false,
  source: 'none',
  developerProEnabled: false,
  setDeveloperPro: () => {},
  isBillingLoading: false,
  isBillingAvailable: false,
}

const ProEntitlementContext = createContext<ProEntitlementContextValue>(FREE)

type ProEntitlementProviderProps = {
  /**
   * Resolved during startup, before anything renders, so the first frame is
   * already correct: no locked-then-unlocked flicker and no alternatives
   * briefly disappearing from the Workout Editor.
   */
  initialDeveloperProEnabled: boolean
  children: ReactNode
}

/**
 * The one place entitlement is decided.
 *
 * ── BILLING BOUNDARY ───────────────────────────────────────────────────────
 * RevenueCat reaches the app only through services/billing/revenueCat and
 * only here. No screen, component or repository imports a billing SDK, and
 * gating everywhere else still goes through useProFeature, so the rest of the
 * app is unaware billing exists.
 *
 * Startup never waits on it: billing resolves in the background and Free is
 * the state until it answers. Workouts, history and the rest of the tracker
 * are local and never depend on RevenueCat being reachable.
 * ───────────────────────────────────────────────────────────────────────────
 */
export function ProEntitlementProvider({
  initialDeveloperProEnabled,
  children,
}: ProEntitlementProviderProps) {
  const [developerProEnabled, setEnabled] = useState(
    initialDeveloperProEnabled,
  )

  // Starts false, never true: Pro is not unlocked before the entitlement is
  // actually known, so a slow or failed lookup can only ever under-grant.
  const [billingPro, setBillingPro] = useState(false)
  const [isBillingLoading, setIsBillingLoading] = useState(true)
  const [isBillingAvailable, setIsBillingAvailable] = useState(false)

  useEffect(() => {
    let isActive = true
    let unsubscribe: (() => void) | null = null

    initializeBilling()
      .then(async (availability) => {
        if (!isActive) {
          return
        }

        if (availability.status === 'unavailable') {
          setIsBillingAvailable(false)
          setIsBillingLoading(false)

          return
        }

        setIsBillingAvailable(true)

        // RevenueCat answers from its own cache when offline, so this
        // resolves without a network round trip in the common case.
        const customerInfo = await getCustomerInfo()

        if (!isActive) {
          return
        }

        setBillingPro(customerInfo ? hasProEntitlement(customerInfo) : false)
        setIsBillingLoading(false)

        // Push-based: purchases, restores, renewals and expiries all arrive
        // here. Nothing polls.
        unsubscribe = subscribeToCustomerInfo((updated) => {
          setBillingPro(hasProEntitlement(updated))
        })
      })
      .catch(() => {
        if (isActive) {
          // Free is always the safe fallback.
          setIsBillingAvailable(false)
          setIsBillingLoading(false)
        }
      })

    return () => {
      isActive = false
      unsubscribe?.()
    }
  }, [])

  const setDeveloperPro = useCallback((enabled: boolean) => {
    if (!__DEV__) {
      return
    }

    // State first so the UI reacts immediately; the write only has to outlive
    // the process, and the helper logs rather than throws if it fails.
    setEnabled(enabled)
    setDeveloperProEnabled(enabled)
  }, [])

  const value = useMemo<ProEntitlementContextValue>(() => {
    // The development override wins so the free and Pro states can be tested
    // instantly without a real purchase. It does not exist in production:
    // __DEV__ is a compile-time constant, so this branch is stripped there
    // and billing becomes the only source.
    const isDevelopmentPro = __DEV__ && developerProEnabled

    const source: ProEntitlementSource = isDevelopmentPro
      ? 'development'
      : billingPro
        ? 'billing'
        : 'none'

    return {
      isPro: isDevelopmentPro || billingPro,
      source,
      developerProEnabled,
      setDeveloperPro,
      isBillingLoading,
      isBillingAvailable,
    }
  }, [
    billingPro,
    developerProEnabled,
    isBillingAvailable,
    isBillingLoading,
    setDeveloperPro,
  ])

  return (
    <ProEntitlementContext.Provider value={value}>
      {children}
    </ProEntitlementContext.Provider>
  )
}

/** Entitlement state itself. Prefer useProFeature for gating decisions. */
export function useProEntitlement(): ProEntitlementContextValue {
  return useContext(ProEntitlementContext)
}

/**
 * hasProFeature: whether this user may use the feature right now.
 *
 * Asks the central policy first, so a feature that later becomes free unlocks
 * for everyone by editing constants/proFeatures.ts alone.
 */
export function useProFeature(feature: ProFeature): boolean {
  const { isPro } = useProEntitlement()

  return !isProGatedFeature(feature) || isPro
}
