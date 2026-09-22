import { Button } from '@/components/ui/Button'
import { WorkoutIcon } from '@/components/ui/TabIcons'
import { colors, fontSize, gutter, spacing } from '@/constants/theme'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type EmptyProps = {
  onAddCustom: () => void
  onBrowseLibrary: () => void
}

export function ExercisesEmptyState({ onAddCustom, onBrowseLibrary }: EmptyProps) {
  return (
    <View style={styles.centered}>
      <View style={styles.icon}>
        <WorkoutIcon color={colors.borderStrong} />
      </View>

      <Text style={styles.title}>No custom exercises</Text>
      <Text style={styles.body}>
        The library already covers most gym movements. Add your own for
        anything it is missing.
      </Text>

      <View style={styles.actions}>
        <Button
          label="+ Add Custom Exercise"
          onPress={onAddCustom}
          variant="secondary"
        />
      </View>

      <Pressable
        accessibilityRole="button"
        hitSlop={10}
        onPress={onBrowseLibrary}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.link}>Browse the library ›</Text>
      </Pressable>
    </View>
  )
}

type NoResultsProps = {
  message: ReactNode
  primaryAction: { label: string; onPress: () => void }
  secondaryAction?: { label: string; onPress: () => void }
}

/** Names the conflict and offers exits, instead of a blank list. */
export function ExercisesNoResultsState({
  message,
  primaryAction,
  secondaryAction,
}: NoResultsProps) {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>No matches</Text>
      <Text style={styles.body}>{message}</Text>

      <View style={[styles.actions, styles.actionRow]}>
        <Button
          label={primaryAction.label}
          onPress={primaryAction.onPress}
          size="compact"
          variant="secondary"
        />

        {secondaryAction ? (
          <Button
            label={secondaryAction.label}
            onPress={secondaryAction.onPress}
            size="compact"
            variant="outline"
          />
        ) : null}
      </View>
    </View>
  )
}

export function ExercisesErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.inline}>
      <Text style={styles.errorTitle}>Could not load exercises</Text>
      <Text style={styles.inlineBody}>
        Your data is stored on this device and is safe.
      </Text>

      <View style={styles.retry}>
        <Button
          label="Retry"
          onPress={onRetry}
          size="compact"
          variant="secondary"
        />
      </View>
    </View>
  )
}

/** Inline emphasis for the no-results message. */
export function Emphasis({ children }: { children: string }) {
  return <Text style={styles.emphasis}>{children}</Text>
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 9,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: spacing.xxl,
  },

  icon: {
    marginBottom: 5,
    transform: [{ scale: 1.35 }],
  },

  title: {
    color: colors.textPrimary,
    fontSize: fontSize.headerTitle,
    fontWeight: '600',
    textAlign: 'center',
  },

  body: {
    color: colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 21,
    textAlign: 'center',
  },

  emphasis: {
    color: colors.textPrimary,
  },

  actions: {
    marginTop: 7,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 9,
  },

  link: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
    marginTop: 3,
  },

  inline: {
    gap: spacing.sm,
    paddingHorizontal: gutter,
    paddingTop: spacing.xl,
  },

  errorTitle: {
    color: colors.destructive,
    fontSize: 14.5,
    fontWeight: '600',
  },

  inlineBody: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 19,
  },

  retry: {
    alignSelf: 'flex-start',
    marginTop: 2,
    minWidth: 96,
  },

  pressed: {
    opacity: 0.6,
  },
})
