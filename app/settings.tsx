import { useAuth } from '@/components/auth/AuthProvider'
import {
  useProEntitlement,
  useProFeature,
} from '@/components/pro/ProEntitlementProvider'
import { ProUpsellSheet } from '@/components/pro/ProUpsellSheet'
import { ProBadge } from '@/components/ui/ProBadge'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { PRIVACY_POLICY_URL } from '@/constants/legal'
import {
  isFeatureImplemented,
  PRO_FEATURE_COPY,
  type ProFeature,
} from '@/constants/proFeatures'
import { colors, gutter, labelText, spacing } from '@/constants/theme'
import { restorePurchases } from '@/services/billing/revenueCat'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const DATA_FEATURES: ProFeature[] = ['backup_sync', 'export']

async function openPrivacyPolicy() {
  try {
    await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)
  } catch (error) {
    Alert.alert(
      'Could not open the Privacy Policy',
      error instanceof Error ? error.message : String(error),
    )
  }
}

type ProDataRowProps = {
  feature: ProFeature
  onLockedPress: (feature: ProFeature) => void
  onOpen?: () => void
}

function ProDataRow({ feature, onLockedPress, onOpen }: ProDataRowProps) {
  const hasAccess = useProFeature(feature)
  const copy = PRO_FEATURE_COPY[feature]

  const status = isFeatureImplemented(feature) ? null : 'Coming soon'

  const body = (
    <View style={styles.rowText}>
      <View style={styles.rowTitleLine}>
        <Text style={styles.rowTitle}>{copy.title}</Text>
        {hasAccess ? null : <ProBadge />}
      </View>

      <Text style={styles.rowDescription}>{copy.description}</Text>
      {status ? <Text style={styles.rowStatus}>{status}</Text> : null}
    </View>
  )

  if (hasAccess && !onOpen) {
    return <View style={styles.row}>{body}</View>
  }

  const isLocked = !hasAccess

  return (
    <Pressable
      accessibilityHint={
        isLocked ? 'Explains what Setline Pro adds' : undefined
      }
      accessibilityLabel={
        isLocked
          ? `${copy.title}, Setline Pro feature${status ? `. ${status}` : ''}`
          : copy.title
      }
      accessibilityRole="button"
      onPress={() => (isLocked ? onLockedPress(feature) : onOpen?.())}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )
}

function AccountSection() {
  const { state, isAvailable, isBusy, signInWithGoogle, signOut } = useAuth()

  const handleSignIn = async () => {
    const outcome = await signInWithGoogle()

    if (outcome.status === 'failed') {
      Alert.alert('Could not sign in', outcome.message)
    }
  }

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out?',
      'Your workouts, exercises and history stay on this device. Signing out only disconnects your Setline account.',
      [
        { text: 'Stay Signed In', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ],
    )
  }

  if (state.status === 'loading') {
    return (
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowDescription}>Checking your account…</Text>
        </View>

        <ActivityIndicator color={colors.textMuted} />
      </View>
    )
  }

  if (state.status === 'authenticated') {
    return (
      <>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>
              {state.user.displayName ?? state.user.email}
            </Text>
            {state.user.displayName ? (
              <Text style={styles.rowDescription}>{state.user.email}</Text>
            ) : null}
            <Text style={styles.rowStatus}>Signed in</Text>
          </View>
        </View>

        <Pressable
          accessibilityHint="Disconnects your Setline account from this device"
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          disabled={isBusy}
          onPress={confirmSignOut}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Sign Out</Text>
          </View>

          {isBusy ? <ActivityIndicator color={colors.textMuted} /> : null}
        </Pressable>
      </>
    )
  }

  return (
    <>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Not signed in</Text>
          <Text style={styles.rowDescription}>
            {isAvailable
              ? 'Sign in to enable cloud backup in a future release.'
              : 'Accounts are not available in this build.'}
          </Text>
        </View>
      </View>

      {isAvailable ? (
        <Pressable
          accessibilityHint="Signs in to Setline with your Google account"
          accessibilityLabel="Continue with Google"
          accessibilityRole="button"
          disabled={isBusy}
          onPress={handleSignIn}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Continue with Google</Text>
          </View>

          {isBusy ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <Text style={styles.chevron}>›</Text>
          )}
        </Pressable>
      ) : null}
    </>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const [upsellFeature, setUpsellFeature] = useState<ProFeature | null>(null)
  const {
    state: authState,
    isAvailable: isAuthAvailable,
    signInWithGoogle,
  } = useAuth()
  const { isPro, isBillingAvailable, developerProEnabled, setDeveloperPro } =
    useProEntitlement()

  const [isRestoring, setIsRestoring] = useState(false)

  const version = Constants.expoConfig?.version ?? null

  const handleRestore = async () => {
    if (isRestoring) {
      return
    }

    if (authState.status !== 'authenticated') {
      if (!isAuthAvailable) {
        Alert.alert(
          'Sign-in unavailable',
          'Setline could not start sign-in right now. You can keep using the Free version and try again later.',
        )

        return
      }

      const signIn = await signInWithGoogle()

      if (signIn.status === 'cancelled') {
        return
      }

      if (signIn.status === 'failed') {
        Alert.alert('Could not sign in', signIn.message)

        return
      }
      return
    }

    setIsRestoring(true)

    try {
      const outcome = await restorePurchases(authState.user.id)

      if (outcome.status === 'entitled') {
        Alert.alert('Setline Pro', 'Your purchase has been restored.')

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
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Account</Text>

        <AccountSection />

        <Text style={styles.sectionLabel}>Subscription</Text>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Setline Pro</Text>
            <Text style={styles.rowDescription}>
              {isPro ? 'Active' : 'Free'}
            </Text>
          </View>
        </View>

        {!isPro ? (
          <>
            <Pressable
              accessibilityHint="Explains what Setline Pro adds"
              accessibilityRole="button"
              onPress={() => setUpsellFeature('alternative_exercises')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Upgrade</Text>
                <Text style={styles.rowDescription}>
                  Unlock alternative exercises and future Pro features.
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>

            {isBillingAvailable ? (
              <Pressable
                accessibilityHint="Checks the store for an existing Setline Pro purchase"
                accessibilityRole="button"
                disabled={isRestoring}
                onPress={handleRestore}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Restore Purchases</Text>
                  <Text style={styles.rowDescription}>
                    Already subscribed? Restore it on this device.
                  </Text>
                </View>

                {isRestoring ? (
                  <ActivityIndicator color={colors.textMuted} />
                ) : (
                  <Text style={styles.chevron}>›</Text>
                )}
              </Pressable>
            ) : null}
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Data</Text>

        {DATA_FEATURES.map((feature) => (
          <ProDataRow
            feature={feature}
            key={feature}
            onLockedPress={setUpsellFeature}
            onOpen={
              feature === 'export' ? () => router.push('/export') : undefined
            }
          />
        ))}

        <Text style={styles.sectionLabel}>App</Text>

        <Pressable
          accessibilityHint="Opens the policy in your browser"
          accessibilityLabel="Privacy Policy. How Setline handles your data"
          accessibilityRole="button"
          onPress={openPrivacyPolicy}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Privacy Policy</Text>
            <Text style={styles.rowDescription}>
              How Setline handles your data
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.aboutRow}>
          <Text style={styles.rowTitle}>About</Text>
          <Text style={styles.rowDescription}>
            Workout logging without the noise.
          </Text>
          <Text style={styles.rowStatus}>
            Your training data is stored on this device.
          </Text>
        </View>

        {version ? (
          <View style={styles.versionRow}>
            <Text style={styles.rowDescription}>Version</Text>
            <Text style={styles.version}>{version}</Text>
          </View>
        ) : null}

        {__DEV__ ? (
          <>
            <Text style={styles.sectionLabel}>Developer</Text>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Pro access</Text>
                <Text style={styles.rowDescription}>
                  Development override for testing the free and Pro states.
                </Text>
              </View>

              <Switch
                accessibilityLabel="Developer Pro access"
                onValueChange={setDeveloperPro}
                thumbColor={colors.textPrimary}
                trackColor={{
                  false: colors.elevated,
                  true: colors.borderStrong,
                }}
                value={developerProEnabled}
              />
            </View>
          </>
        ) : null}
      </ScrollView>

      <ProUpsellSheet
        feature={upsellFeature}
        onClose={() => setUpsellFeature(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
  },

  sectionLabel: {
    ...labelText,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xl,
  },

  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: 14,
  },

  rowText: {
    flex: 1,
    gap: 3,
  },

  rowTitleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  rowTitle: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '500',
  },

  rowDescription: {
    color: colors.textMuted,
    fontSize: 12.5,
  },

  rowStatus: {
    color: colors.textSecondary,
    fontSize: 11.5,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 17,
  },

  aboutRow: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    gap: 3,
    paddingVertical: 14,
  },

  versionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },

  version: {
    color: colors.textMuted,
    fontSize: 12.5,
  },

  pressed: {
    opacity: 0.6,
  },
})
