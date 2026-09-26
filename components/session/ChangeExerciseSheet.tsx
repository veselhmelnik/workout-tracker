import { ExerciseIllustration } from '@/components/exercise/ExerciseIllustration'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { LoadingView } from '@/components/ui/StateViews'
import { colors, fontSize, fonts, radius, spacing } from '@/constants/theme'
import type { LatestExerciseResult } from '@/repositories/historyRepository'
import type { Exercise } from '@/types/entities'
import { formatHistorySets } from '@/utils/sessionFormat'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type ChangeExerciseSheetProps = {
  visible: boolean
  /** The exercise currently being performed in this slot. */
  currentExerciseName: string
  /** Selectable alternatives configured on the slot; null while loading. */
  alternatives: Exercise[] | null
  /** Latest result per exercise id, loaded for all alternatives at once. */
  previews: Map<string, LatestExerciseResult>
  isBusy: boolean
  onSelect: (exercise: Exercise) => void
  onBrowse: () => void
  onClose: () => void
}

export function ChangeExerciseSheet({
  visible,
  currentExerciseName,
  alternatives,
  previews,
  isBusy,
  onSelect,
  onBrowse,
  onClose,
}: ChangeExerciseSheetProps) {
  const hasAlternatives = alternatives !== null && alternatives.length > 0

  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <Text style={styles.title}>Change exercise</Text>
      <Text style={styles.subtitle}>
        Replaces {currentExerciseName} for this workout only.
      </Text>

      {alternatives === null ? <LoadingView /> : null}

      {/* An empty "Alternatives" heading would suggest something is missing;
          with none configured, Browse is simply the whole sheet. */}
      {hasAlternatives ? (
        <>
          <Text style={styles.sectionLabel}>ALTERNATIVES</Text>

          {alternatives.map((alternative) => {
            const preview = previews.get(alternative.id)

            return (
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                key={alternative.id}
                onPress={() => onSelect(alternative)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.pressed,
                ]}
              >
                <ExerciseIllustration sourceKey={alternative.sourceKey} />

                <View style={styles.rowBody}>
                  <Text numberOfLines={1} style={styles.rowName}>
                    {alternative.name}
                  </Text>

                  {preview ? (
                    <Text numberOfLines={1} style={styles.rowPreview}>
                      Last: {formatHistorySets(preview, alternative.type)}
                    </Text>
                  ) : (
                    <Text style={styles.rowPreviewEmpty}>
                      No previous results
                    </Text>
                  )}
                </View>

                <Text style={styles.rowChevron}>›</Text>
              </Pressable>
            )
          })}
        </>
      ) : null}

      {alternatives !== null ? (
        <>
          <Text style={styles.sectionLabel}>OTHER</Text>

          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={onBrowse}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.browseLabel}>Browse exercises</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        </>
      ) : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.headerTitle,
    fontWeight: '600',
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
    marginTop: 2,
  },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },

  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    // Unchanged from before illustrations, so a row without art keeps exactly
    // its old height; an illustrated row simply grows to fit the 54px tile.
    paddingVertical: 10,
  },

  rowBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },

  rowName: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '500',
  },

  rowPreview: {
    color: colors.textSecondary,
    fontFamily: fonts.mono,
    fontSize: 12.5,
  },

  rowPreviewEmpty: {
    color: colors.textMuted,
    fontSize: 12.5,
  },

  browseLabel: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15.5,
    fontWeight: '500',
  },

  rowChevron: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
  },

  pressed: {
    opacity: 0.6,
  },
})
