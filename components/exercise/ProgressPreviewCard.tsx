import { colors, spacing } from '@/constants/theme'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'

/** A trend needs at least this many sessions to mean anything. */
export const MIN_TREND_SESSIONS = 3

type ProgressPreviewCardProps = {
  sessionCount: number
}

/**
 * Pro slot for the estimated 1RM trend. Neutral by design: no Pro colour, no
 * chart. Below the session threshold it states the precondition instead of
 * showing anything that looks like data.
 */
export function ProgressPreviewCard({ sessionCount }: ProgressPreviewCardProps) {
  if (sessionCount < MIN_TREND_SESSIONS) {
    return (
      <View style={[styles.card, styles.cardPending]}>
        <TitleLine muted />
        <Text style={styles.pendingBody}>
          Needs at least three sessions before a trend means anything.
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.card, styles.cardReady]}>
      <View style={styles.readyRow}>
        <View style={styles.readyText}>
          <TitleLine />
          <Text style={styles.readyBody}>
            Built from your {sessionCount} recorded sessions
          </Text>
        </View>

        {/* Billing is not part of this build; the entry point is in place. */}
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() =>
            Alert.alert(
              'Pro is not available yet',
              'Progress trends are coming in a later update.',
            )
          }
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.unlock}>Unlock ›</Text>
        </Pressable>
      </View>
    </View>
  )
}

function TitleLine({ muted = false }: { muted?: boolean }) {
  return (
    <View style={styles.titleLine}>
      <Text style={[styles.title, muted && styles.titleMuted]}>
        Estimated 1RM trend
      </Text>
      <Text style={[styles.pill, muted && styles.pillMuted]}>PRO</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
  },

  cardReady: {
    backgroundColor: colors.strip,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
  },

  cardPending: {
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: spacing.lg,
  },

  readyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },

  readyText: {
    flex: 1,
    gap: 2,
  },

  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '600',
  },

  titleMuted: {
    color: colors.textSecondary,
  },

  pill: {
    borderColor: colors.borderStrong,
    borderRadius: 3,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },

  pillMuted: {
    borderColor: colors.border,
    color: colors.textMuted,
  },

  readyBody: {
    color: colors.textMuted,
    fontSize: 12,
  },

  pendingBody: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 19,
  },

  unlock: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.6,
  },
})

