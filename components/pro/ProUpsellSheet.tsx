import { useProEntitlement } from '@/components/pro/ProEntitlementProvider'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { PRO_FEATURE_COPY, type ProFeature } from '@/constants/proFeatures'
import { colors, radius, spacing } from '@/constants/theme'
import {
  getCurrentPlans,
  purchasePlan,
  restorePurchases,
  type BillingPlan,
} from '@/services/billing/revenueCat'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

type ProUpsellSheetProps = {
  /** The feature that was blocked; null closes the sheet. */
  feature: ProFeature | null
  onClose: () => void
}

/**
 * The one Pro explanation surface, reused by every gated entry point. It takes
 * a feature rather than free-standing copy, so each feature reads the same
 * wherever it was blocked.
 *
 * RevenueCat supplies only the plans, their localized prices and the purchase
 * result. Feature marketing stays in PRO_FEATURE_COPY, so what the sheet says
 * about a feature does not depend on how it is sold.
 */
export function ProUpsellSheet({ feature, onClose }: ProUpsellSheetProps) {
  const { isPro, isBillingAvailable } = useProEntitlement()

  const [plans, setPlans] = useState<BillingPlan[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  // Guards against a second tap landing before isWorking has re-rendered.
  const inFlightRef = useRef(false)

  const isOpen = feature !== null
  const copy = feature ? PRO_FEATURE_COPY[feature] : null

  useEffect(() => {
    if (!isOpen || !isBillingAvailable) {
      return
    }

    let isActive = true

    getCurrentPlans().then((loaded) => {
      if (!isActive) {
        return
      }

      setPlans(loaded)

      // Annual is first and pre-selected; the user can still choose monthly.
      setSelectedId((current) => current ?? loaded[0]?.id ?? null)
    })

    return () => {
      isActive = false
    }
  }, [isBillingAvailable, isOpen])

  // The purchase that unlocked the feature also closes the sheet. The blocked
  // action is not run automatically — the user taps it again deliberately.
  useEffect(() => {
    if (isOpen && isPro) {
      onClose()
    }
  }, [isOpen, isPro, onClose])

  const run = async (action: () => Promise<void>) => {
    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true
    setIsWorking(true)

    try {
      await action()
    } finally {
      inFlightRef.current = false
      setIsWorking(false)
    }
  }

  const handlePurchase = () => {
    const plan = plans?.find((entry) => entry.id === selectedId)

    if (!plan) {
      return
    }

    run(async () => {
      const outcome = await purchasePlan(plan)

      // Backing out of the store sheet is ordinary: no alert, the sheet stays
      // open and usable.
      if (outcome.status === 'cancelled') {
        return
      }

      if (outcome.status === 'entitled') {
        // The provider's listener has already flipped isPro; the effect above
        // closes the sheet.
        return
      }

      Alert.alert(
        'Could not start Setline Pro',
        outcome.status === 'not_entitled'
          ? 'Your purchase went through, but Pro is not active yet. Try Restore Purchases in a moment.'
          : outcome.message,
      )
    })
  }

  const handleRestore = () => {
    run(async () => {
      const outcome = await restorePurchases()

      if (outcome.status === 'entitled') {
        return
      }

      Alert.alert(
        'Restore Purchases',
        outcome.status === 'not_entitled'
          ? 'No active Setline Pro purchase was found.'
          : outcome.message,
      )
    })
  }

  // Three mutually exclusive states: loading, sellable plans, or unavailable.
  const canPurchase = isBillingAvailable && plans !== null && plans.length > 0
  const isUnavailable =
    !isBillingAvailable || (plans !== null && plans.length === 0)

  return (
    <BottomSheet onClose={onClose} visible={isOpen}>
      <Text style={styles.title}>Setline Pro</Text>
      <Text style={styles.tagline}>Train with more flexibility.</Text>

      {copy ? (
        <View style={styles.feature}>
          <Text style={styles.featureTitle}>{copy.title}</Text>
          <Text style={styles.featureDescription}>{copy.description}</Text>
        </View>
      ) : null}

      {/* Nothing is drawn until real plans arrive, so no placeholder price can
          ever be mistaken for an offer. */}
      {isBillingAvailable && plans === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : null}

      {canPurchase ? (
        <>
          <View style={styles.plans}>
            {plans.map((plan) => {
              const isSelected = plan.id === selectedId

              return (
                <Pressable
                  accessibilityLabel={`${planLabel(plan)}, ${plan.priceString}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  disabled={isWorking}
                  key={plan.id}
                  onPress={() => setSelectedId(plan.id)}
                  style={({ pressed }) => [
                    styles.plan,
                    isSelected && styles.planSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.planPeriod}>{planLabel(plan)}</Text>
                  {/* Store-localized; the app never formats a price itself. */}
                  <Text style={styles.planPrice}>{plan.priceString}</Text>
                </Pressable>
              )
            })}
          </View>

          <View style={styles.action}>
            <Button
              busy={isWorking}
              disabled={selectedId === null}
              label="Continue"
              onPress={handlePurchase}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isWorking}
            onPress={handleRestore}
            style={({ pressed }) => [styles.restore, pressed && styles.pressed]}
          >
            <Text style={styles.restoreLabel}>Restore Purchases</Text>
          </Pressable>
        </>
      ) : null}

      {/* No key, no store, or an offering with nothing sellable in it. The
          feature copy above still explains what Pro is. */}
      {isUnavailable ? (
        <>
          <Text style={styles.availability}>
            Purchases are currently unavailable. Everything you have already
            recorded stays on this device and stays yours.
          </Text>

          <View style={styles.action}>
            <Button label="Close" onPress={onClose} variant="secondary" />
          </View>
        </>
      ) : null}
    </BottomSheet>
  )
}

function planLabel(plan: BillingPlan): string {
  return plan.period === 'annual' ? 'Yearly' : 'Monthly'
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 16.5,
    fontWeight: '600',
  },

  tagline: {
    color: colors.textSecondary,
    fontSize: 13.5,
    marginTop: 2,
  },

  feature: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: 4,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },

  featureTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },

  featureDescription: {
    color: colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 20,
  },

  loading: {
    paddingVertical: spacing.xxl,
  },

  plans: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  plan: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },

  // Selection reads as a lifted border, keeping amber for session state.
  planSelected: {
    backgroundColor: colors.raised,
    borderColor: colors.borderStrong,
  },

  planPeriod: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },

  planPrice: {
    color: colors.textSecondary,
    fontSize: 14.5,
  },

  availability: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: spacing.lg,
  },

  action: {
    marginTop: spacing.lg,
  },

  restore: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    minHeight: 44,
  },

  restoreLabel: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.6,
  },
})
