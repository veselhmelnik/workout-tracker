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
import { useAuth } from '../auth/AuthProvider'

type ProUpsellSheetProps = {
  feature: ProFeature | null
  onClose: () => void
}

export function ProUpsellSheet({ feature, onClose }: ProUpsellSheetProps) {
  const { isPro, isBillingAvailable } = useProEntitlement()
  const {
    state: authState,
    isAvailable: isAuthAvailable,
    signInWithGoogle,
  } = useAuth()

  const isAuthenticated = authState.status === 'authenticated'
  const isAuthLoading = authState.status === 'loading'
  const [plans, setPlans] = useState<BillingPlan[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const inFlightRef = useRef(false)

  const isOpen = feature !== null
  const copy = feature ? PRO_FEATURE_COPY[feature] : null
  const requireAuthentication = async (): Promise<boolean> => {
    if (authState.status === 'authenticated') {
      return true
    }

    if (!isAuthAvailable) {
      Alert.alert(
        'Sign-in unavailable',
        'Setline could not start sign-in right now. You can keep using the Free version and try again later.',
      )

      return false
    }

    const outcome = await signInWithGoogle()

    if (outcome.status === 'cancelled') {
      return false
    }

    if (outcome.status === 'failed') {
      Alert.alert('Could not sign in', outcome.message)

      return false
    }

    return false
  }
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

      setSelectedId((current) => current ?? loaded[0]?.id ?? null)
    })

    return () => {
      isActive = false
    }
  }, [isBillingAvailable, isOpen])

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
      if (authState.status !== 'authenticated') {
        await requireAuthentication()
        return
      }

      const outcome = await purchasePlan(plan, authState.user.id)

      if (outcome.status === 'cancelled') {
        return
      }

      if (outcome.status === 'entitled') {
        return
      }

      if (outcome.status === 'identity_mismatch') {
        Alert.alert(
          'Could not start Setline Pro',
          'Your account is signed in, but billing is not linked to it yet. Please try again.',
        )

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
      if (authState.status !== 'authenticated') {
        await requireAuthentication()
        return
      }

      const outcome = await restorePurchases(authState.user.id)

      if (outcome.status === 'entitled') {
        return
      }

      if (outcome.status === 'identity_mismatch') {
        Alert.alert(
          'Restore Purchases',
          'Your account is signed in, but billing is not linked to it yet. Please try again.',
        )

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
                  <Text style={styles.planPrice}>{plan.priceString}</Text>
                </Pressable>
              )
            })}
          </View>

          <View style={styles.action}>
            {!isAuthenticated && !isAuthLoading ? (
              <Text style={styles.signInNote}>
                Sign in before purchasing Setline Pro. Your subscription will be
                linked to your Setline account.
              </Text>
            ) : null}
            <Button
              busy={isWorking}
              disabled={selectedId === null || isAuthLoading}
              label={isAuthenticated ? 'Continue' : 'Sign in to Continue'}
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
    marginTop: spacing.md,
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
  signInNote: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: spacing.lg,
  },
})
