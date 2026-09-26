import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/constants/theme'
import { migrateDb } from '@/db/migrations'
import { seedBuiltInExercises, seedMuscles } from '@/db/seeds'
import { ProEntitlementProvider } from '@/components/pro/ProEntitlementProvider'
import {
  getDeveloperProEnabled,
  getOnboardingCompleted,
  setOnboardingCompleted,
} from '@/utils/appPreferences'
import { DarkTheme, Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.textPrimary,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.divider,
  },
}

type StartupState = {
  hasOnboarded: boolean
  isDeveloperProEnabled: boolean
}

/**
 * Single-flight startup: migrations, then seeds, then the onboarding flag and
 * the Pro entitlement. Held at module scope so a re-mount (StrictMode, Fast
 * Refresh) reuses the same run instead of starting a second migration/seed
 * sequence.
 *
 * Entitlement is resolved here, from the local preferences file, so it is
 * known before the first frame and nothing renders in the wrong tier. It adds
 * no network call and no new blocking step — the preferences file is already
 * read for onboarding.
 */
let startupPromise: Promise<StartupState> | null = null

function startApp() {
  startupPromise ??= (async () => {
    await migrateDb()
    await seedMuscles()
    await seedBuiltInExercises()

    const [hasOnboarded, isDeveloperProEnabled] = await Promise.all([
      getOnboardingCompleted(),
      getDeveloperProEnabled(),
    ])

    return { hasOnboarded, isDeveloperProEnabled }
  })().catch((startupError: unknown) => {
    // Let a later mount retry rather than caching the failure forever.
    startupPromise = null

    throw startupError
  })

  return startupPromise
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [isDeveloperProEnabled, setIsDeveloperProEnabled] = useState(false)

  useEffect(() => {
    let isActive = true

    startApp()
      .then(({ hasOnboarded, isDeveloperProEnabled: developerPro }) => {
        if (isActive) {
          // Resolved before anything renders, so the tabs never flash first
          // and no screen mounts in the wrong entitlement tier.
          setNeedsOnboarding(!hasOnboarded)
          setIsDeveloperProEnabled(developerPro)
          setIsReady(true)
        }
      })
      .catch((startupError: unknown) => {
        if (isActive) {
          setError(
            startupError instanceof Error
              ? startupError
              : new Error(String(startupError)),
          )
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  return (
    <SafeAreaProvider style={styles.root}>
      <StatusBar style="light" />

      {error ? (
        <View style={styles.gate}>
          <ErrorView error={error} />
        </View>
      ) : !isReady ? (
        <View style={styles.gate}>
          <LoadingView />
        </View>
      ) : needsOnboarding ? (
        <OnboardingFlow
          onFinish={() => {
            // Leaves onboarding even if the write fails; the helper logs it.
            setNeedsOnboarding(false)
            setOnboardingCompleted()
          }}
        />
      ) : (
        // Mounted only once startup has resolved, so its initial value is the
        // final one; onboarding has no Pro surfaces and sits outside it.
        <ProEntitlementProvider
          initialDeveloperProEnabled={isDeveloperProEnabled}
        >
          <ThemeProvider value={navigationTheme}>
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                headerShown: false,
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="workout/new" />
              <Stack.Screen name="workout/[id]" />
              <Stack.Screen name="exercise/new" />
              <Stack.Screen name="exercise/[id]/index" />
              <Stack.Screen name="exercise/[id]/edit" />
              <Stack.Screen name="exercise/[id]/history" />
              <Stack.Screen name="session/[id]" />
              <Stack.Screen name="history/[id]" />
              <Stack.Screen name="settings" />
            </Stack>
          </ThemeProvider>
        </ProEntitlementProvider>
      )}
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
  },

  gate: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
})
