import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesPackage,
} from 'react-native-purchases';
import { selectBillingKey } from './revenueCatKeys';

const ENTITLEMENT_ID = 'setline_pro'

export type BillingAvailability =
  | { status: 'ready' }
  | { status: 'unavailable'; reason: string }

export type BillingPlan = {
  id: string
  period: 'annual' | 'monthly'
  priceString: string
  package: PurchasesPackage
}

export type PurchaseOutcome =
  | { status: 'entitled' }
  | { status: 'not_entitled' }
  | { status: 'cancelled' }
  | { status: 'identity_mismatch' }
  | { status: 'failed'; message: string }

export type RestoreOutcome =
  | { status: 'entitled' }
  | { status: 'not_entitled' }
  | { status: 'identity_mismatch' }
  | { status: 'failed'; message: string }

let configuration: Promise<BillingAvailability> | null = null

export function initializeBilling(): Promise<BillingAvailability> {
  configuration ??= (async () => {
    const key = selectBillingKey()

    if (key.status === 'unavailable') {
      if (__DEV__) {
        console.info(`[billing] unavailable — ${key.reason}`)
      }

      return { status: 'unavailable', reason: key.reason }
    }

    try {
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG)
      }
      Purchases.configure({ apiKey: key.apiKey })

      return { status: 'ready' }
    } catch (error) {
      configuration = null

      return {
        status: 'unavailable',
        reason: error instanceof Error ? error.message : String(error),
      }
    }
  })()

  return configuration
}

export type IdentifyBillingOptions = {
  syncAnonymousPurchaseIfLost: boolean
}

export async function identifyBillingUser(
  appUserId: string,
  options: IdentifyBillingOptions,
): Promise<boolean | null> {
  try {
    const before = await Purchases.getCustomerInfo()
    const hadProBefore = hasProEntitlement(before)

    logIdentity('before logIn', before.originalAppUserId, hadProBefore)

    const { customerInfo, created } = await Purchases.logIn(appUserId)

    let hasPro = hasProEntitlement(customerInfo)

    logIdentity(
      `after logIn (created=${created})`,
      customerInfo.originalAppUserId,
      hasPro,
    )

    const lostProOnLogin = hadProBefore && !hasPro

    if (!options.syncAnonymousPurchaseIfLost || !lostProOnLogin) {
      return hasPro
    }

    if (__DEV__) {
      console.info('[billing] syncPurchases fallback triggered')
    }

    try {
      const synced = await Purchases.syncPurchasesForResult()

      hasPro = hasProEntitlement(synced.customerInfo)

      logIdentity(
        'after syncPurchases',
        synced.customerInfo.originalAppUserId,
        hasPro,
      )
    } catch (error) {
      logDeveloperError('syncPurchases', error)
    }

    return hasPro
  } catch (error) {
    logDeveloperError('logIn', error)

    return null
  }
}

function logIdentity(stage: string, appUserId: string, isPro: boolean): void {
  if (__DEV__) {
    console.info(
      `[billing] ${stage}: appUserId=${appUserId} setline_pro=${isPro}`,
    )
  }
}

export async function resetBillingUser(): Promise<boolean | null> {
  try {
    const customerInfo = await Purchases.logOut()

    return hasProEntitlement(customerInfo)
  } catch (error) {
    logDeveloperError('logOut', error)

    return null
  }
}

export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
}

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
    return null
  }

  return {
    id: entry.identifier,
    period,
    priceString: entry.product.priceString,
    package: entry,
  }
}

async function isBillingUserIdentifiedAs(expectedAppUserId: string): Promise<boolean> {
  try {
    const currentAppUserId = await Purchases.getAppUserID()

    const matches = currentAppUserId === expectedAppUserId

    if (__DEV__ && !matches) {
      console.info(`[billing] purchase blocked: expected=${expectedAppUserId} actual=${currentAppUserId}`,)
    }

    return matches
  } catch (error) {
    logDeveloperError('getAppUserID', error)
  }

  return false
}

export async function purchasePlan(
  plan: BillingPlan,
  authenticatedUserId: string,
): Promise<PurchaseOutcome> {
  const identified = await isBillingUserIdentifiedAs(authenticatedUserId)

  if (!identified) {
    return { status: 'identity_mismatch' }
  }

  try {
    if (__DEV__) {
      console.info(
        `[billing] purchase started as authenticated user ${authenticatedUserId}`,
      )
    }

    const { customerInfo } = await Purchases.purchasePackage(plan.package)

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

export async function restorePurchases(
  authenticatedUserId: string,
): Promise<RestoreOutcome> {
  const identified = await isBillingUserIdentifiedAs(authenticatedUserId)

  if (!identified) {
    return { status: 'identity_mismatch' }
  }

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

function logDeveloperError(operation: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[billing] ${operation} failed`, error)
  }
}
