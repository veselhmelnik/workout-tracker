import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/constants/theme'
import { migrateDb } from '@/db/migrations'
import { seedBuiltInExercises, seedMuscles } from '@/db/seeds'
import {
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

/**
 * Single-flight startup: migrations, then seeds, then the onboarding flag.
 * Held at module scope so a re-mount (StrictMode, Fast Refresh) reuses the
 * same run instead of starting a second migration/seed sequence.
 */
let startupPromise: Promise<{ hasOnboarded: boolean }> | null = null

function startApp() {
  startupPromise ??= (async () => {
    await migrateDb()
    await seedMuscles()
    await seedBuiltInExercises()

    return { hasOnboarded: await getOnboardingCompleted() }
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

  useEffect(() => {
    let isActive = true

    startApp()
      .then(({ hasOnboarded }) => {
        if (isActive) {
          // Resolved before anything renders, so the tabs never flash first.
          setNeedsOnboarding(!hasOnboarded)
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
