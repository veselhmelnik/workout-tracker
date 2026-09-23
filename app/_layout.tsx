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

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    let isActive = true

    async function initializeApp() {
      try {
        await migrateDb()
        await seedMuscles()
        await seedBuiltInExercises()

        // Resolved before anything renders, so the tabs never flash first.
        const hasOnboarded = await getOnboardingCompleted()

        if (isActive) {
          setNeedsOnboarding(!hasOnboarded)
          setIsReady(true)
        }
      } catch (error) {
        if (isActive) {
          setError(error instanceof Error ? error : new Error(String(error)))
        }
      }
    }

    initializeApp()

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
