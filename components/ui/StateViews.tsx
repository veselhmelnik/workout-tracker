import { colors, fontSize, spacing } from '@/constants/theme'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Button } from './Button'

export function LoadingView() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.textSecondary} />
    </View>
  )
}

export function ErrorView({
  error,
  onRetry,
}: {
  error: Error
  onRetry?: () => void
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.message}>{error.message}</Text>

      {onRetry ? (
        <View style={styles.action}>
          <Button label="Try again" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  )
}

export function EmptyView({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  errorTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.cardTitle,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  message: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    lineHeight: 22,
    textAlign: 'center',
  },

  action: {
    marginTop: spacing.lg,
    minWidth: 160,
  },
})
