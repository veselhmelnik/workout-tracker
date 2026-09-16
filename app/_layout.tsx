import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/constants/theme'
import { migrateDb } from '@/db/migrations'
import { DarkTheme, Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

// Navigation containers paint their own backgrounds during transitions, so they
// get the app surfaces too; otherwise screens flash the default theme colour.
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

  useEffect(() => {
    let isActive = true

    migrateDb()
      .then(async () => {
        if (isActive) {
          setIsReady(true)
        }
      })
      .catch((migrationError: unknown) => {
        if (isActive) {
          setError(
            migrationError instanceof Error
              ? migrationError
              : new Error(String(migrationError)),
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
            <Stack.Screen name="exercise/[id]/history" />
            <Stack.Screen name="session/[id]" />
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
