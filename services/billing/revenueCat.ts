import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesPackage,
} from 'react-native-purchases'
import { selectBillingKey } from './revenueCatKeys'

/**
 * The only module in the app that imports react-native-purchases, besides the
 * entitlement provider that consumes it. Screens and components go through
 * useProFeature, never through this file or the SDK.
 *
 * Everything here answers to the entitlement identifier below. Products and
 * packages sell access; the entitlement is what grants it, so a package
 * identifier is never used to decide whether someone is Pro.
 */
const ENTITLEMENT_ID = 'setline_pro'

export type BillingAvailability =
  | { status: 'ready' }
  | { status: 'unavailable'; reason: string }

/** A purchasable plan, already reduced to what the upsell needs to draw. */
export type BillingPlan = {
  /** RevenueCat package identifier, e.g. $rc_annual. Not shown to the user. */
  id: string
  period: 'annual' | 'monthly'
  /** Store-localized, already formatted in the user's currency. */
  priceString: string
  /** Kept so the purchase call receives the exact object the SDK returned. */
  package: PurchasesPackage
}

export type PurchaseOutcome =
  | { status: 'entitled' }
  /** Charged, but the entitlement did not come back active. */
  | { status: 'not_entitled' }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string }

export type RestoreOutcome =
  | { status: 'entitled' }
  | { status: 'not_entitled' }
  | { status: 'failed'; message: string }

/**
 * Single-flight configuration. Held at module scope so a remount, Fast Refresh
 * or a second provider mount reuses the same result instead of calling
 * Purchases.configure again.
 */
let configuration: Promise<BillingAvailability> | null = null

export function initializeBilling(): Promise<BillingAvailability> {
  configuration ??= (async () => {
    const key = selectBillingKey()

    if (key.status === 'unavailable') {
      // Not an error: the app runs Free and the development override still
      // works. Logged once, quietly, so a missing key is diagnosable.
      if (__DEV__) {
        console.info(`[billing] unavailable — ${key.reason}`)
      }

      return { status: 'unavailable', reason: key.reason }
    }

    try {
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG)
      }

      // No appUserID: RevenueCat manages an anonymous App User ID. Setline has
      // no accounts, so nothing is generated or persisted here. Adding
      // Purchases.logIn(...) later needs no change to any caller.
      Purchases.configure({ apiKey: key.apiKey })

      return { status: 'ready' }
    } catch (error) {
      // Let a later attempt retry rather than caching a transient failure.
      configuration = null

      return {
        status: 'unavailable',
        reason: error instanceof Error ? error.message : String(error),
      }
    }
  })()

  return configuration
}

/** True when the customer currently holds setline_pro. */
export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
}

/**
 * Current entitlement state. RevenueCat serves its own cached CustomerInfo
 * when offline, so this is not a network dependency; the app does no receipt
 * parsing or expiry arithmetic of its own.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo()
  } catch (error) {
    logDeveloperError('getCustomerInfo', error)

    return null
  }
}

export function subscribeToCustomerInfo(
  listener: CustomerInfoUpdateListener,
): () => void {
  Purchases.addCustomerInfoUpdateListener(listener)

  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener)
  }
}

/**
 * Plans from the current offering, annual first.
 *
 * Reads offerings.current rather than the literal "default" identifier, so
 * changing the active offering in the RevenueCat dashboard needs no release.
 * Packages are identified by packageType, not by raw store product ids.
 */
export async function getCurrentPlans(): Promise<BillingPlan[]> {
  try {
    const offerings = await Purchases.getOfferings()
    const current = offerings.current

    if (!current) {
      return []
    }

    return current.availablePackages
      .map(toPlan)
      .filter((plan): plan is BillingPlan => plan !== null)
      .sort((a, b) => (a.period === 'annual' ? -1 : b.period === 'annual' ? 1 : 0))
  } catch (error) {
    logDeveloperError('getOfferings', error)

    return []
  }
}

function toPlan(entry: PurchasesPackage): BillingPlan | null {
  const period =
    entry.packageType === PACKAGE_TYPE.ANNUAL
      ? 'annual'
      : entry.packageType === PACKAGE_TYPE.MONTHLY
        ? 'monthly'
        : null

  if (!period) {
    // The offering only sells these two today; anything else is ignored
    // rather than guessed at.
    return null
  }

  return {
    id: entry.identifier,
    period,
    // Store-localized and already formatted; the app never builds a price
    // string or assumes a currency.
    priceString: entry.product.priceString,
    package: entry,
  }
}

export async function purchasePlan(
  plan: BillingPlan,
): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.package)

    // A completed purchase call is not the same as an active entitlement, so
    // access follows the entitlement, never the call returning.
    return hasProEntitlement(customerInfo)
      ? { status: 'entitled' }
      : { status: 'not_entitled' }
  } catch (error) {
    if (isUserCancelled(error)) {
      return { status: 'cancelled' }
    }

    logDeveloperError('purchasePackage', error)

    return { status: 'failed', message: friendlyMessage(error) }
  }
}

/** Only ever called from an explicit user action, never on startup. */
export async function restorePurchases(): Promise<RestoreOutcome> {
  try {
    const customerInfo = await Purchases.restorePurchases()

    return hasProEntitlement(customerInfo)
      ? { status: 'entitled' }
      : { status: 'not_entitled' }
  } catch (error) {
    logDeveloperError('restorePurchases', error)

    return { status: 'failed', message: friendlyMessage(error) }
  }
}

/**
 * Backing out of the store sheet is ordinary behaviour, not a failure: it
 * raises no alert and logs nothing.
 */
function isUserCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'userCancelled' in error &&
    (error as { userCancelled?: boolean | null }).userCancelled === true
  )
}

function friendlyMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }

  return 'Something went wrong. Please try again.'
}

/** Detail stays in development; release builds log nothing from billing. */
function logDeveloperError(operation: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[billing] ${operation} failed`, error)
  }
}
